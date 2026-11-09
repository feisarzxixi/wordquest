'use client';

import React, { useEffect } from 'react';
import { BaseWord } from '../../../lib/algorithms/planEngine';
import { Card } from '../../ui/Card';
import { SpeakerBtn } from '../../ui/SpeakerBtn';
import { SoundService } from '../../../lib/audio/SoundService';
import { COPYWRITING } from '../../../config/copywriting';
import { WordImageBanner } from '../WordImageBanner';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export interface ResultFeedbackViewProps {
  isCorrect: boolean;
  word: BaseWord;
  isFirstTry: boolean;
  isLastTask: boolean;
  onNext: () => void;
}

export const ResultFeedbackView: React.FC<ResultFeedbackViewProps> = ({
  isCorrect,
  word,
  isFirstTry,
  isLastTask,
  onNext,
}) => {
  // 播放正误音效，支持回车或空格键切题
  useEffect(() => {
    SoundService.playSFX(isCorrect ? 'correct' : 'wrong');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCorrect, onNext]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center select-none">
      <Card
        className={`w-full p-6 sm:p-10 shadow-xl border-2 transition-all overflow-hidden ${
          isCorrect
            ? 'bg-gradient-to-b from-emerald-50/70 to-white border-emerald-300'
            : 'bg-gradient-to-b from-rose-50/70 to-white border-rose-300'
        }`}
      >
        {/* 对错头部状态与得分 */}
        <div className="flex items-center justify-between w-full mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {isCorrect ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-7 h-7 text-rose-600 shrink-0" />
            )}
            <span
              className={`text-xl sm:text-2xl font-extrabold ${
                isCorrect ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isCorrect ? COPYWRITING.study.resultCorrect : COPYWRITING.study.resultWrong}
            </span>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isCorrect && isFirstTry
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isCorrect && isFirstTry ? '+1 积分' : '+0 积分'}
          </div>
        </div>

        {/* 单词配图（800*400，自适应折叠） */}
        <WordImageBanner
          word={word.word}
          image={word.image}
          className="rounded-2xl mb-5 shadow-sm"
        />

        {/* 核心单词与释义解析 */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {word.word}
            </h1>
            <SpeakerBtn text={word.word} size="md" autoPlayOnMount />
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-mono text-base mb-4">
            {word.phonetic && <span>{word.phonetic}</span>}
            {word.pos && (
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {word.pos}
              </span>
            )}
          </div>

          <div className="w-full py-3 px-6 bg-slate-50 rounded-2xl mb-5 border border-slate-100">
            <p className="text-2xl font-extrabold text-slate-800">{word.meaning}</p>
          </div>

          {/* 完整例句与翻译复盘 */}
          {word.example && (
            <div className="w-full text-left bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm mb-5">
              <p className="text-slate-800 text-base font-semibold leading-relaxed">
                {word.example}
              </p>
              {word.translation && (
                <p className="text-slate-500 text-sm mt-1.5 font-medium">{word.translation}</p>
              )}
            </div>
          )}
        </div>

        {/* 底部操作区：完全由孩子主动点击推进，绝不自动跳过 */}
        <div className="w-full flex flex-col items-center mt-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onNext}
            className={`w-full sm:w-auto min-w-[240px] px-10 py-3.5 rounded-2xl active:scale-95 text-white font-extrabold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
              isCorrect
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            <span>{isLastTask ? '完成今日学习 ➔' : '下一题 ➔'}</span>
            <ArrowRight size={20} />
          </button>
          <p className="text-xs text-slate-400 mt-2.5 font-medium">
            不急，仔细看完例句并可复听发音，点击按钮或按回车进入下一题
          </p>
        </div>
      </Card>
    </div>
  );
};
