'use client';

import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { SoundService } from '../../lib/audio/SoundService';

export interface SpeakerBtnProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  autoPlayOnMount?: boolean;
}

export const SpeakerBtn: React.FC<SpeakerBtnProps> = ({
  text,
  size = 'md',
  className = '',
  autoPlayOnMount = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  React.useEffect(() => {
    if (autoPlayOnMount && text) {
      handlePlay();
    }
  }, [text, autoPlayOnMount]);

  const handlePlay = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    SoundService.unlockAudioContext();
    setIsPlaying(true);
    await SoundService.speak(text);
    setIsPlaying(false);
  };

  const sizeStyles = {
    sm: 'p-1.5 text-slate-400 hover:text-indigo-600',
    md: 'p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-full',
    lg: 'p-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-full shadow-sm',
  };

  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 28,
  };

  return (
    <button
      type="button"
      onClick={handlePlay}
      title="朗读发音"
      className={`inline-flex items-center justify-center transition-transform active:scale-90 ${sizeStyles[size]} ${
        isPlaying ? 'ring-2 ring-indigo-400 ring-offset-1 animate-pulse' : ''
      } ${className}`}
    >
      <Volume2 size={iconSizes[size]} />
    </button>
  );
};
