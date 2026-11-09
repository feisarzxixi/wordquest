'use client';

/**
 * 客户端单词配图内存高速缓存
 * 在应用加载时快速静默预载可用配图清单，确保卡片渲染第 0 帧即可同步判定有无配图，
 * 绝不依赖延迟的 404 网络探测，实现【无图彻底隐藏 + 零页面跳跃抖动】
 */

let globalImageMap: Record<string, string> = {};
let isFetched = false;
let fetchPromise: Promise<Record<string, string>> | null = null;

export function setClientWordImages(map: Record<string, string>) {
  globalImageMap = map;
  isFetched = true;
}

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
