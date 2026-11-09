'use client';

import React from 'react';
import { QuizPayload } from '../../../lib/quiz-factory/QuestionFactory';
import { Card } from '../../ui/Card';
import { SpeakerBtn } from '../../ui/SpeakerBtn';

export interface AudioQuizViewProps {
  quiz: QuizPayload;
  batchIndex: number;
  taskIndexInBatch: number;
  totalInBatch: number;
  onSelectOption: (optionId: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export const AudioQuizView: React.FC<AudioQuizViewProps> = ({
  quiz,
  batchIndex,
  taskIndexInBatch,
  totalInBatch,
  onSelectOption,
  disabled = false,
}) => {
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* 组块进度提示 */}
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold tracking-wider uppercase text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
        <span>第 {batchIndex + 1} 组测试</span>
        <span>•</span>
        <span>{taskIndexInBatch + 1} / {totalInBatch}</span>
      </div>

      <Card className="w-full p-8 sm:p-10 shadow-lg border-slate-100 flex flex-col items-center">
        {/* 题型标签 */}
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-50 text-purple-600 mb-6">
          听音辨词题
        </span>

        {/* 大号发音喇叭（中央核心） */}
        <div className="flex flex-col items-center gap-3 my-4">
          <SpeakerBtn key={`audio-quiz-${quiz.word.word}`} text={quiz.word.word} size="lg" autoPlayOnMount />
          <span className="text-sm font-medium text-slate-400">
            点击喇叭可重复播放发音
          </span>
        </div>

        {/* 提示文案 */}
        <p className="text-slate-600 text-lg sm:text-xl font-bold mb-8 text-center mt-2">
          {quiz.prompt}
        </p>

        {/* 4 个英文单词选项 */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
          {quiz.options?.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectOption(opt.id, opt.isCorrect)}
              className="flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 border-slate-100 bg-slate-50/50 hover:bg-purple-50/50 hover:border-purple-300 active:scale-[0.98] transition-all text-left group"
            >
              <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-colors shrink-0">
                {letters[idx] || (idx + 1)}
              </span>
              <span className="text-lg font-bold text-slate-800 group-hover:text-purple-900 tracking-wide">
                {opt.text}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
