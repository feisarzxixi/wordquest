'use client';

import React from 'react';
import { QuizPayload } from '../../../lib/quiz-factory/QuestionFactory';
import { Card } from '../../ui/Card';
import { SpeakerBtn } from '../../ui/SpeakerBtn';

export interface ChoiceQuizViewProps {
  quiz: QuizPayload;
  batchIndex: number;
  taskIndexInBatch: number;
  totalInBatch: number;
  onSelectOption: (optionId: string, isCorrect: boolean) => void;
  disabled?: boolean;
}

export const ChoiceQuizView: React.FC<ChoiceQuizViewProps> = ({
  quiz,
  batchIndex,
  taskIndexInBatch,
  totalInBatch,
  onSelectOption,
  disabled = false,
}) => {
  const letters = ['A', 'B', 'C', 'D'];

  const isSentenceType = quiz.quizType === 'SENTENCE_FILL';

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
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 mb-4">
          {isSentenceType ? '句子理解题' : '词义选择题'}
        </span>

        {/* 题干主词/句子 */}
        <div className="flex items-center justify-center gap-3 mb-2 text-center">
          <h2
            className={`${
              isSentenceType ? 'text-2xl sm:text-3xl font-bold leading-relaxed' : 'text-4xl sm:text-5xl font-extrabold'
            } text-slate-900 tracking-tight`}
          >
            {quiz.prompt}
          </h2>
          <SpeakerBtn
            text={isSentenceType ? quiz.prompt.replace(/_{2,}/g, 'blank') : quiz.prompt}
            size="md"
          />
        </div>

        {/* 次要提示（音标或例句翻译） */}
        {quiz.subPrompt && (
          <p className="text-slate-500 text-base sm:text-lg mb-8 text-center font-medium">
            {quiz.subPrompt}
          </p>
        )}

        {/* 4 个选项卡片 */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
          {quiz.options?.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectOption(opt.id, opt.isCorrect)}
              className="flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 border-slate-100 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-300 active:scale-[0.98] transition-all text-left group"
            >
              <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors shrink-0">
                {letters[idx] || (idx + 1)}
              </span>
              <span className="text-base sm:text-lg font-semibold text-slate-800 group-hover:text-indigo-900">
                {opt.text}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
