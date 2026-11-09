'use client';

/**
 * 客户端单词配图内存高速缓存与智能前置预加载器 (Word Image Cache & Smart Preloader)
 * 1. 静默预载可用配图清单：卡片渲染第 0 帧即可同步判定有无配图，无图彻底隐藏，零跳动；
 * 2. 管道式前置预加载 (Pipelined Preloading)：
 *    - 学习批次就绪时：提前并行预加载当前组与下一组单词的高清配图；
 *    - 题目测试期间（孩子思考读题的 3~5 秒内）：自动在后台预加载该题对应的反馈图片；
 *    - 答对跳转或翻到新卡片瞬间：图片直接从浏览器内存/强缓存中 0 延迟秒开，彻底告别显示滞后！
 */

let globalImageMap: Record<string, string> = {};
let isFetched = false;
let fetchPromise: Promise<Record<string, string>> | null = null;

// 记录已发起或已完成预加载的 URL 集合，避免重复网络请求
const preloadedUrls = new Set<string>();

export function setClientWordImages(map: Record<string, string>) {
  globalImageMap = map;
  isFetched = true;
}

/**
 * 同步检索单词是否有已知配图
 */
export function getClientWordImage(word: string): string | null {
  if (!word || typeof word !== 'string') return null;
  const clean = word.trim().toLowerCase();
  return (
    globalImageMap[clean] ||
    globalImageMap[clean.replace(/\s+/g, '_')] ||
    globalImageMap[clean.replace(/_/g, ' ')] ||
    null
  );
}

/**
 * 判断指定图片 URL 是否已经预加载过
 */
export function isImagePreloaded(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) return false;
  return preloadedUrls.has(url.trim());
}

/**
 * 单图静默预加载：利用浏览器后台 Image 管道拉取并置入 HTTP 内存缓存
 */
export function preloadImage(url: string | null | undefined): Promise<void> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return Promise.resolve();
  }
  const cleanUrl = url.trim();
  if (preloadedUrls.has(cleanUrl)) {
    return Promise.resolve();
  }
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  preloadedUrls.add(cleanUrl);

  return new Promise((resolve) => {
    const img = new window.Image();
    img.decoding = 'async';
    img.src = cleanUrl;
    img.onload = () => resolve();
    img.onerror = () => resolve(); // 静默处理，不阻塞主流程
  });
}

/**
 * 批量智能预加载单词配图
 * 支持传入包含 word / image 的对象数组，或纯单词字符串数组
 */
export function preloadWordImages(
  items: Array<{ word: string; image?: string | null } | string | null | undefined>
): void {
  if (!items || !Array.isArray(items) || typeof window === 'undefined') return;

  for (const item of items) {
    if (!item) continue;
    let url: string | null = null;
    if (typeof item === 'string') {
      url = getClientWordImage(item);
    } else {
      url = item.image || getClientWordImage(item.word);
    }

    if (url) {
      preloadImage(url);
    }
  }
}

/**
 * 初始化客户端配图字典
 */
export async function initClientImageCache(): Promise<Record<string, string>> {
  if (isFetched) return globalImageMap;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/words/images')
    .then((r) => r.json())
    .then((res) => {
      if (res.success && res.data) {
        globalImageMap = res.data;
        isFetched = true;
      }
      return globalImageMap;
    })
    .catch(() => {
      return globalImageMap;
    });

  return fetchPromise;
}
