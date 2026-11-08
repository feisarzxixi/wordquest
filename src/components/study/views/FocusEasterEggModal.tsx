'use client';

import React, { useEffect } from 'react';
import { Card } from '../../ui/Card';
import { SoundService } from '../../../lib/audio/SoundService';
import { COPYWRITING } from '../../../config/copywriting';
import { Sparkles, Award, ArrowRight } from 'lucide-react';

export interface FocusEasterEggModalProps {
  onContinue: () => void;
}

export const FocusEasterEggModal: React.FC<FocusEasterEggModalProps> = ({ onContinue }) => {
  useEffect(() => {
    SoundService.playSFX('easter_egg');
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <Card className="max-w-md w-full p-8 sm:p-10 shadow-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/80 via-white to-white flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        {/* 动态勋章 */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200 mb-6 animate-bounce">
          <Sparkles size={40} />
        </div>

        <span className="text-xs font-extrabold uppercase tracking-widest text-amber-600 bg-amber-100/80 px-3 py-1 rounded-full mb-3">
          专注力里程碑
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          {COPYWRITING.study.easterEggTitle}
        </h2>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
          {COPYWRITING.study.easterEggSubtitle}
        </p>

        {/* 称号卡 */}
        <div className="w-full py-3 px-4 rounded-xl bg-orange-50 border border-orange-200/80 mb-8 flex items-center justify-center gap-2 text-orange-800 font-extrabold text-base">
          <Award size={20} className="text-orange-600 shrink-0" />
          <span>达成荣誉称号：【专注学者 • 毅力之星】</span>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white font-extrabold text-lg shadow-lg shadow-orange-200 flex items-center justify-center gap-2 transition-all"
        >
          <span>{COPYWRITING.study.btnEasterEggContinue}</span>
          <ArrowRight size={20} />
        </button>
      </Card>
    </div>
  );
};
