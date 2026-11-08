'use client';

import React from 'react';
import { BaseWord } from '../../../lib/algorithms/planEngine';
import { Card } from '../../ui/Card';
import { SpeakerBtn } from '../../ui/SpeakerBtn';
import { COPYWRITING } from '../../../config/copywriting';

export interface WordCardViewProps {
  word: BaseWord;
  batchIndex: number;
  wordIndexInBatch: number;
  totalInBatch: number;
  onKnown: () => void;
  onUnknown: () => void;
}

export const WordCardView: React.FC<WordCardViewProps> = ({
  word,
  batchIndex,
  wordIndexInBatch,
  totalInBatch,
  onKnown,
  onUnknown,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* 组块进度提示 */}
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
        <span>第 {batchIndex + 1} 组识记</span>
        <span>•</span>
        <span>{wordIndexInBatch + 1} / {totalInBatch}</span>
      </div>

      <Card className="w-full flex flex-col items-center text-center p-8 sm:p-12 shadow-lg border-indigo-50">
        {/* 英文主词与发音 */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            {word.word}
          </h1>
          <SpeakerBtn text={word.word} size="lg" autoPlayOnMount />
        </div>

        {/* 音标与词性 */}
        <div className="flex items-center gap-2 text-slate-500 font-mono text-lg mb-6">
          {word.phonetic && <span>{word.phonetic}</span>}
          {word.pos && (
            <span className="text-sm font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {word.pos}
            </span>
          )}
        </div>

        {/* 中文释义 */}
        <div className="w-full py-4 px-6 bg-slate-50 rounded-xl mb-6 border border-slate-100">
          <p className="text-2xl sm:text-3xl font-bold text-slate-800">
            {word.meaning}
          </p>
        </div>

        {/* 英文例句与翻译 */}
        {word.example && (
          <div className="w-full text-left bg-indigo-50/40 rounded-xl p-4 sm:p-5 border border-indigo-100/60 mb-8">
            <div className="flex items-start justify-between gap-2">
              <p className="text-slate-800 text-base sm:text-lg font-medium leading-relaxed">
                {word.example}
              </p>
              <SpeakerBtn text={word.example} size="sm" className="shrink-0 mt-0.5" />
            </div>
            {word.translation && (
              <p className="text-slate-500 text-sm sm:text-base mt-2">
                {word.translation}
              </p>
            )}
          </div>
        )}

        {/* 底部双按钮：我不认识 / 我认识 */}
        <div className="w-full grid grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={onUnknown}
            className="py-4 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-lg transition-all"
          >
            {COPYWRITING.study.cardUnknown}
          </button>
          <button
            type="button"
            onClick={onKnown}
            className="py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-lg shadow-md shadow-indigo-100 transition-all"
          >
            {COPYWRITING.study.cardKnown}
          </button>
        </div>
      </Card>
    </div>
  );
};
