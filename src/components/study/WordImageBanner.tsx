'use client';

import React, { useState } from 'react';
import { getClientWordImage } from '../../lib/images/clientImageCache';

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

  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 加载异常时完全静默隐藏，避免破损图标
  if (hasError) {
    return null;
  }

  return (
    <div
      className={`w-full relative overflow-hidden rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center select-none shadow-sm transition-opacity duration-300 ${className}`}
      style={{ aspectRatio: '2 / 1', maxHeight: '220px' }}
    >
      <img
        src={resolvedSrc}
        alt={word}
        loading="eager"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover object-center transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
