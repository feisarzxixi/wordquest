'use client';

import React, { useEffect } from 'react';
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

  // 切题时主动释放焦点，防止移动端保留上一题的残留外框
  useEffect(() => {
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
  }, [quiz.taskId]);

  const handleOptionClick = (optionId: string, isCorrect: boolean) => {
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    onSelectOption(optionId, isCorrect);
  };

  const isSentenceType = quiz.quizType === 'SENTENCE_FILL';
  const isGrammarType =
    quiz.quizType === 'PART_OF_SPEECH' ||
    quiz.quizType === 'FORM_TRANSFORMATION' ||
    quiz.quizType === 'GRAMMAR_USAGE';

  const getQuizBadge = () => {
    switch (quiz.quizType) {
      case 'PART_OF_SPEECH':
        return { label: '词性辨析题', style: 'bg-indigo-50 text-indigo-600 border border-indigo-200' };
      case 'FORM_TRANSFORMATION':
        return { label: '时态词形题', style: 'bg-purple-50 text-purple-600 border border-purple-200' };
      case 'GRAMMAR_USAGE':
        return { label: '语法应用题', style: 'bg-amber-50 text-amber-700 border border-amber-200' };
      case 'PREPOSITION_FILL':
        return { label: '介词搭配题', style: 'bg-blue-50 text-blue-600 border border-blue-200' };
      case 'SENTENCE_FILL':
        return { label: '句子理解题', style: 'bg-slate-100 text-slate-600 border border-slate-200' };
      default:
        return { label: '词义选择题', style: 'bg-slate-100 text-slate-600 border border-slate-200' };
    }
  };

  const badge = getQuizBadge();

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center select-none">
      {/* 组块进度提示 */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4 text-xs font-semibold tracking-wider uppercase text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
        <span>第 {batchIndex + 1} 组测试</span>
        <span>•</span>
        <span>{taskIndexInBatch + 1} / {totalInBatch}</span>
      </div>

      <Card className="w-full p-5 sm:p-8 md:p-10 shadow-xl border-slate-100 flex flex-col items-center">
        {/* 题型标签 */}
        <span className={`text-xs font-bold px-3 py-1 rounded-full mb-3 sm:mb-4 ${badge.style}`}>
          {badge.label}
        </span>

        {/* 题干主词/句子 */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-2 text-center w-full px-2">
          <h2
            className={`${
              isSentenceType || isGrammarType
                ? 'text-lg sm:text-2xl font-bold leading-relaxed'
                : 'text-3xl sm:text-5xl font-extrabold'
            } text-slate-900 tracking-tight`}
          >
            {quiz.prompt}
          </h2>
          {quiz.quizType === 'MEANING_CHOICE' && (
            <SpeakerBtn text={quiz.prompt} size="md" />
          )}
        </div>

        {/* 次要提示（音标或例句翻译） */}
        {quiz.subPrompt && (
          <p className="text-slate-500 text-xs sm:text-base mb-4 sm:mb-6 text-center font-medium px-2">
            {quiz.subPrompt}
          </p>
        )}

        {/* 4 个选项卡片：彻底去除移动端点击后遗留的 focus 边框 */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 mt-2">
          {quiz.options?.map((opt, idx) => (
            <button
              key={`${quiz.taskId}-opt-${opt.id}-${idx}`}
              type="button"
              disabled={disabled}
              onClick={() => handleOptionClick(opt.id, opt.isCorrect)}
              className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl border-2 border-slate-200/90 bg-white hover:bg-indigo-50/40 hover:border-indigo-300 active:bg-indigo-100 active:border-indigo-500 active:scale-[0.98] transition-all text-left outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-indigo-400 select-none group cursor-pointer shadow-sm"
            >
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs sm:text-sm font-black text-slate-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors shrink-0">
                {letters[idx] || (idx + 1)}
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-indigo-950 leading-snug break-words">
                {opt.text}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
