'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getClientWordImage, isImagePreloaded, preloadImage } from '../../lib/images/clientImageCache';

interface WordImageBannerProps {
  word: string;
  image?: string | null;
  className?: string;
}

export const WordImageBanner: React.FC<WordImageBannerProps> = ({
  word,
  image,
  className = '',
}) => {
  // 1. 同步精准判定配图有效性：
  // 优先采用服务端预解析的 image；如未携带则同步从客户端已知词图映射中检索
  const resolvedSrc =
    image && typeof image === 'string' && image.trim() !== ''
      ? image.trim()
      : getClientWordImage(word);

  // 2. 无配图状态：坚决返回 null，彻底隐藏图片区域（0 高度、0 边距、不占任何空间）
  // 关键原理：从首帧开始就完全不渲染任何占位框，文本自然排布，绝不会发生“先显示框后消失导致文字上跳”
  if (!resolvedSrc) {
    return null;
  }

  // 3. 智能判定预加载命中：如果该图已被管道提前预加载，首帧直接以 100% 不透明度秒开展示，彻底消除滞后感！
  const initiallyLoaded = isImagePreloaded(resolvedSrc);
  const [isLoaded, setIsLoaded] = useState(initiallyLoaded);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isImagePreloaded(resolvedSrc)) {
      setIsLoaded(true);
    } else {
      preloadImage(resolvedSrc);
    }

    // 处理浏览器 HTTP 缓存命中但尚未触发 onLoad 事件的同步就绪状态
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [resolvedSrc]);

  // 加载异常时完全静默隐藏，避免破损图标
  if (hasError) {
    return null;
  }

  return (
    <div
      className={`w-full relative overflow-hidden rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center select-none shadow-sm ${className}`}
      style={{ aspectRatio: '2.1 / 1', maxHeight: 'clamp(130px, 20vh, 220px)' }}
    >
      <img
        ref={imgRef}
        src={resolvedSrc}
        alt={word}
        loading="eager"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover object-center ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${initiallyLoaded ? '' : 'transition-opacity duration-200'}`}
      />
    </div>
  );
};
