'use client';

/**
 * 客户端单词发音离线缓存与智能预加载引擎 (Client Audio Cache & Smart Preloader)
 * 
 * 核心特性：
 * 1. 0 延迟秒开：提前将单词外教真人发音缓存至内存 ObjectURL / 浏览器强缓存，进入新单词瞬间发音即响即听；
 * 2. 强离线与弱网韧性：利用 IndexedDB 持久化保存音频二进制 Blob，一次下载，终身离线可用（地铁/飞机/地下室均可流畅朗读）；
 * 3. 绝不重音重读：提供可靠单例与精准时序控制，杜绝网络超时重试引发的“不同音色重读两遍”问题；
 * 4. 双通道冗余拉取：优先走本地 /api/audio 代理获取 Blob 强缓存，失败时自动平滑回退至有道官方 CDN 直链。
 */

interface CachedAudioRecord {
  key: string;
  blob: Blob;
  updatedAt: number;
}

const DB_NAME = 'wordquest_audio_v1';
const STORE_NAME = 'audio_blobs';

// 内存中的 ObjectURL 缓存（key: "uk:challenge" -> "blob:http://..."）
const inMemoryBlobUrls = new Map<string, string>();

// 内存中已预载的 Audio 元素池（加速即时播放）
const inMemoryAudios = new Map<string, HTMLAudioElement>();

// 正在预加载中的 key 集合，防止并发重复请求
const pendingPreloads = new Set<string>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

/**
 * 初始化或获取 IndexedDB 实例
 */
function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('Audio IndexedDB open failed, fallback to memory cache');
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * 构造统一缓存 Key
 */
export function buildAudioKey(word: string, accent: 'uk' | 'us' = 'uk'): string {
  return `${accent}:${word.trim().toLowerCase()}`;
}

/**
 * 同步检查内存中是否已有可用 Blob URL（0ms 秒开）
 */
export function getMemoryAudioUrl(word: string, accent: 'uk' | 'us' = 'uk'): string | null {
  const key = buildAudioKey(word, accent);
  return inMemoryBlobUrls.get(key) || null;
}

/**
 * 从 IndexedDB 中读取已缓存的音频 Blob
 */
async function getBlobFromIDB(key: string): Promise<Blob | null> {
  const db = await getIDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const record = req.result as CachedAudioRecord | undefined;
        resolve(record ? record.blob : null);
      };

      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * 保存音频 Blob 至 IndexedDB
 */
async function saveBlobToIDB(key: string, blob: Blob): Promise<void> {
  const db = await getIDB();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      key,
      blob,
      updatedAt: Date.now(),
    });
  } catch (e) {
    // 忽略写入失败（例如空间受限）
  }
}

/**
 * 构建有道外教原声直链
 */
export function getDirectYoudaoAudioUrl(word: string, accent: 'uk' | 'us' = 'uk'): string {
  const clean = encodeURIComponent(word.trim());
  const typeParam = accent === 'uk' ? '1' : '2';
  return `https://dict.youdao.com/dictvoice?audio=${clean}&type=${typeParam}`;
}

/**
 * 构建本地 API 代理 URL
 */
export function getProxyAudioUrl(word: string, accent: 'uk' | 'us' = 'uk'): string {
  const clean = encodeURIComponent(word.trim());
  const typeParam = accent === 'uk' ? '1' : '2';
  return `/api/audio?word=${clean}&type=${typeParam}`;
}

/**
 * 获取指定单词的发音 URL（优先返回已缓存的 Blob URL，否则返回直链并触发静默拉取）
 */
export async function resolveAudioUrl(word: string, accent: 'uk' | 'us' = 'uk'): Promise<string> {
  const cleanWord = word.trim();
  if (!cleanWord) return '';

  const key = buildAudioKey(cleanWord, accent);

  // 1. 内存中已存在 Blob URL，直接 0ms 返回
  const memUrl = inMemoryBlobUrls.get(key);
  if (memUrl) {
    return memUrl;
  }

  // 2. 检查 IndexedDB
  try {
    const blob = await getBlobFromIDB(key);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      inMemoryBlobUrls.set(key, blobUrl);
      return blobUrl;
    }
  } catch (e) {
    // 继续后备流程
  }

  // 3. 异步触发单词后台缓存预载
  preloadSingleAudio(cleanWord, accent);

  // 4. 返回直链保证即刻发音
  return getDirectYoudaoAudioUrl(cleanWord, accent);
}

/**
 * 单词静默后台预加载
 */
export async function preloadSingleAudio(word: string, accent: 'uk' | 'us' = 'uk'): Promise<void> {
  if (typeof window === 'undefined') return;
  const clean = word.trim();
  if (!clean) return;

  const key = buildAudioKey(clean, accent);
  if (inMemoryBlobUrls.has(key) || pendingPreloads.has(key)) {
    return;
  }

  pendingPreloads.add(key);

  try {
    // 优先从 IndexedDB 检查
    const idbBlob = await getBlobFromIDB(key);
    if (idbBlob) {
      const blobUrl = URL.createObjectURL(idbBlob);
      inMemoryBlobUrls.set(key, blobUrl);
      pendingPreloads.delete(key);
      return;
    }

    // 尝试通过 /api/audio 代理拉取二进制 Blob
    const proxyUrl = getProxyAudioUrl(clean, accent);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(proxyUrl, {
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timer);

    if (res && res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 500) {
        const blobUrl = URL.createObjectURL(blob);
        inMemoryBlobUrls.set(key, blobUrl);
        await saveBlobToIDB(key, blob);
        pendingPreloads.delete(key);
        return;
      }
    }

    // 后备通道：直接利用 HTMLAudioElement 触发浏览器 HTTP 管道缓存
    const directUrl = getDirectYoudaoAudioUrl(clean, accent);
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = directUrl;
    audio.load();
    inMemoryAudios.set(key, audio);
  } catch (err) {
    // 静默降级
  } finally {
    pendingPreloads.delete(key);
  }
}

/**
 * 批量并行预加载单词发音
 * @param items 单词列表或带有 word 属性的对象列表
 * @param accent 英音 'uk' 或美音 'us'
 */
export function preloadWordAudio(
  items: Array<{ word: string } | string | null | undefined>,
  accent: 'uk' | 'us' = 'uk'
): void {
  if (typeof window === 'undefined' || !items || !Array.isArray(items)) return;

  // 提取有效单词
  const words: string[] = [];
  for (const item of items) {
    if (!item) continue;
    const w = typeof item === 'string' ? item : item.word;
    if (w && typeof w === 'string' && w.trim()) {
      words.push(w.trim());
    }
  }

  if (words.length === 0) return;

  // 控制并发预载，每次并发 3 个，避免网络拥塞
  const concurrency = 3;
  let index = 0;

  function runNext() {
    if (index >= words.length) return;
    const currentWord = words[index++];
    preloadSingleAudio(currentWord, accent).finally(() => {
      runNext();
    });
  }

  for (let i = 0; i < Math.min(concurrency, words.length); i++) {
    runNext();
  }
}
