'use client';

import React from 'react';
import { QuizPayload } from '../../../lib/quiz-factory/QuestionFactory';
import { Card } from '../../ui/Card';
import { LetterInput } from '../../ui/LetterInput';
import { SpeakerBtn } from '../../ui/SpeakerBtn';

export interface SpellingQuizViewProps {
  quiz: QuizPayload;
  batchIndex: number;
  taskIndexInBatch: number;
  totalInBatch: number;
  onSubmitAnswer: (inputWord: string) => void;
  disabled?: boolean;
}

export const SpellingQuizView: React.FC<SpellingQuizViewProps> = ({
  quiz,
  batchIndex,
  taskIndexInBatch,
  totalInBatch,
  onSubmitAnswer,
  disabled = false,
}) => {
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
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 mb-4">
          拼写填空题
        </span>

        {/* 词义提示 */}
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 text-center">
          {quiz.prompt}
        </h2>

        {/* 例句中文翻译提示（如果有） */}
        {quiz.subPrompt && (
          <p className="text-slate-500 text-sm sm:text-base mb-6 text-center italic">
            提示：{quiz.subPrompt}
          </p>
        )}

        {/* 辅助发音 */}
        <div className="mb-4">
          <SpeakerBtn text={quiz.word.word} size="sm" />
        </div>

        {/* 比例挖空字母输入组件 */}
        {quiz.spellingData && (
          <LetterInput
            slots={quiz.spellingData.slots}
            onSubmit={onSubmitAnswer}
            disabled={disabled}
          />
        )}
      </Card>
    </div>
  );
};
