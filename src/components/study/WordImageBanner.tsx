'use client';

import React, { useState } from 'react';
import { Compass } from 'lucide-react';

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
  const [loadSuccess, setLoadSuccess] = useState(false);
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
      setLoadError(true);
    }
  };

  const handleImgLoad = () => {
    setLoadSuccess(true);
  };

  return (
    <div
      className={`w-full relative overflow-hidden rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center transition-all duration-200 select-none shadow-sm ${className}`}
      style={{ aspectRatio: '2.2 / 1', maxHeight: '220px' }}
    >
      {/* 1. 真实图片加载与渲染：加载成功时平滑淡入 */}
      {!loadError && currentSrc && (
        <img
          src={currentSrc}
          alt={word}
          loading="eager"
          onLoad={handleImgLoad}
          onError={handleImgError}
          className={`w-full h-full object-cover object-center transition-opacity duration-300 ${
            loadSuccess ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* 2. 占位背景（当图片未就绪或该词暂无图片时常驻展示：保留固定高度，彻底杜绝闪烁和文字跳动） */}
      {(!loadSuccess || loadError) && (
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/70 via-slate-50 to-purple-50/50 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-indigo-500 mb-2">
            <Compass size={24} className="opacity-80" />
          </div>
          <span className="text-xs font-bold text-slate-400 tracking-wider font-mono">
            WordQuest · 词汇探索
          </span>
        </div>
      )}
    </div>
  );
};
