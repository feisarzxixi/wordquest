'use client';

import React, { useState, useEffect } from 'react';
import { QuizPayload } from '../../../lib/quiz-factory/QuestionFactory';
import { Card } from '../../ui/Card';
import { SpeakerBtn } from '../../ui/SpeakerBtn';
import { RotateCcw, Check } from 'lucide-react';

export interface PhraseBlocksQuizViewProps {
  quiz: QuizPayload;
  batchIndex: number;
  taskIndexInBatch: number;
  totalInBatch: number;
  onSubmitAnswer: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export const PhraseBlocksQuizView: React.FC<PhraseBlocksQuizViewProps> = ({
  quiz,
  batchIndex,
  taskIndexInBatch,
  totalInBatch,
  onSubmitAnswer,
  disabled = false,
}) => {
  const phraseData = quiz.phraseBlocksData;
  const totalTokens = phraseData?.correctTokens.length || 0;

  // 已经放入槽位的单词
  const [placedChips, setPlacedChips] = useState<string[]>([]);
  // 备选池中还剩余的卡片（带 index 避免重复词冲突）
  const [availableChips, setAvailableChips] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    if (phraseData) {
      setPlacedChips([]);
      setAvailableChips(
        phraseData.shuffledChips.map((text, idx) => ({
          id: `${text}-${idx}`,
          text,
        }))
      );
    }
  }, [quiz]);

  const handlePickChip = (chip: { id: string; text: string }) => {
    if (disabled) return;
    setPlacedChips([...placedChips, chip.text]);
    setAvailableChips(availableChips.filter((c) => c.id !== chip.id));
  };

  const handleRemovePlaced = (index: number) => {
    if (disabled) return;
    const removedText = placedChips[index];
    const newPlaced = placedChips.filter((_, idx) => idx !== index);
    setPlacedChips(newPlaced);
    setAvailableChips([...availableChips, { id: `${removedText}-${Date.now()}`, text: removedText }]);
  };

  const handleReset = () => {
    if (disabled || !phraseData) return;
    setPlacedChips([]);
    setAvailableChips(
      phraseData.shuffledChips.map((text, idx) => ({
        id: `${text}-${idx}`,
        text,
      }))
    );
  };

  const handleSubmit = () => {
    if (!phraseData || placedChips.length !== totalTokens) return;
    const userPhrase = placedChips.join(' ').trim().toLowerCase();
    const correctPhrase = phraseData.correctTokens.join(' ').trim().toLowerCase();
    onSubmitAnswer(userPhrase === correctPhrase);
  };

  const isFull = placedChips.length === totalTokens;

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
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 mb-4">
          短语语块积木拼装
        </span>

        {/* 释义提示 */}
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 text-center">
          {quiz.prompt}
        </h2>

        {quiz.subPrompt && (
          <p className="text-slate-500 text-sm sm:text-base mb-6 text-center italic">
            {quiz.subPrompt}
          </p>
        )}

        <div className="mb-4">
          <SpeakerBtn text={quiz.word.word} size="sm" />
        </div>

        {/* 顶部已拼装槽位容器 */}
        <div className="w-full min-h-[72px] p-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex flex-wrap items-center justify-center gap-2 mb-8 transition-all">
          {placedChips.length === 0 ? (
            <span className="text-sm font-medium text-indigo-400 select-none">
              轻点下方语块，按顺序填入此处
            </span>
          ) : (
            placedChips.map((text, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRemovePlaced(idx)}
                title="点击移出"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-lg sm:text-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>{text}</span>
              </button>
            ))
          )}
        </div>

        {/* 下方待选语块卡片池 */}
        <div className="w-full flex flex-wrap items-center justify-center gap-3 mb-8 min-h-[60px]">
          {availableChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={disabled}
              onClick={() => handlePickChip(chip)}
              className="px-5 py-3 rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-800 font-bold text-lg sm:text-xl shadow-sm active:scale-95 transition-all"
            >
              {chip.text}
            </button>
          ))}
        </div>

        {/* 操作区 */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={placedChips.length === 0 || disabled}
            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="重置语块"
          >
            <RotateCcw size={20} />
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFull || disabled}
            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-lg shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2"
          >
            <span>提交短语</span>
            <Check size={20} />
          </button>
        </div>
      </Card>
    </div>
  );
};
