'use client';

import React, { useState } from 'react';

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
  const [loadError, setLoadError] = useState(false);
  const [formatIndex, setFormatIndex] = useState(0);

  // 格式轮替尝试顺序：指定的 image -> .jpg -> .png -> .webp -> .jpeg
  const cleanWord = word.trim().toLowerCase();
  const formatList = image
    ? [image, `/words/${cleanWord}.jpg`, `/words/${cleanWord}.png`, `/words/${cleanWord}.webp`]
    : [`/words/${cleanWord}.jpg`, `/words/${cleanWord}.png`, `/words/${cleanWord}.webp`, `/words/${cleanWord}.jpeg`];

  const currentSrc = formatList[formatIndex];

  const handleImgError = () => {
    if (formatIndex < formatList.length - 1) {
      setFormatIndex((prev) => prev + 1);
    } else {
      // 所有扩展名均未找到图片，完全隐藏配图区域，实现优雅无图自适应
      setLoadError(true);
    }
  };

  if (loadError || !currentSrc) {
    return null;
  }

  return (
    <div
      className={`w-full relative overflow-hidden bg-slate-50 border-b border-slate-100 flex items-center justify-center transition-all duration-300 ${className}`}
      style={{ aspectRatio: '2 / 1', maxHeight: '280px' }}
    >
      <img
        src={currentSrc}
        alt={word}
        loading="lazy"
        onError={handleImgError}
        className="w-full h-full object-cover object-center select-none"
      />
    </div>
  );
};
