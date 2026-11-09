'use client';

import React, { useState } from 'react';
import { QuizPayload } from '../../../lib/quiz-factory/QuestionFactory';
import { Card } from '../../ui/Card';
import { SpeakerBtn } from '../../ui/SpeakerBtn';
import { SoundService } from '../../../lib/audio/SoundService';
import { Check, Sparkles } from 'lucide-react';

export interface MatchingQuizViewProps {
  quiz: QuizPayload;
  batchIndex: number;
  taskIndexInBatch: number;
  totalInBatch: number;
  onSubmitAnswer: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export const MatchingQuizView: React.FC<MatchingQuizViewProps> = ({
  quiz,
  batchIndex,
  taskIndexInBatch,
  totalInBatch,
  onSubmitAnswer,
  disabled = false,
}) => {
  const matchingData = quiz.matchingData;
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [selectedMeaningId, setSelectedMeaningId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [wrongAttempt, setWrongAttempt] = useState<{ wordId: string; meaningId: string } | null>(null);
  const [hasMadeMistake, setHasMadeMistake] = useState(false);

  if (!matchingData) return null;

  const { shuffledWords, shuffledMeanings } = matchingData;

  // 处理左侧单词点击
  const handleWordClick = (wordId: string) => {
    if (disabled || matchedIds.has(wordId) || wrongAttempt) return;

    if (selectedMeaningId) {
      // 已经选了右侧中文，尝试配对
      checkMatch(wordId, selectedMeaningId);
    } else {
      setSelectedWordId(wordId);
    }
  };

  // 处理右侧释义点击
  const handleMeaningClick = (meaningId: string) => {
    if (disabled || matchedIds.has(meaningId) || wrongAttempt) return;

    if (selectedWordId) {
      // 已经选了左侧英文，尝试配对
      checkMatch(selectedWordId, meaningId);
    } else {
      setSelectedMeaningId(meaningId);
    }
  };

  // 判定配对逻辑
  const checkMatch = (wordId: string, meaningId: string) => {
    if (wordId === meaningId) {
      // 配对成功！
      SoundService.playSFX('correct');
      const nextMatched = new Set(matchedIds);
      nextMatched.add(wordId);
      setMatchedIds(nextMatched);
      setSelectedWordId(null);
      setSelectedMeaningId(null);

      // 全部 4 对匹配成功，通关提交
      if (nextMatched.size === matchingData.pairs.length) {
        setTimeout(() => {
          onSubmitAnswer(!hasMadeMistake);
        }, 800);
      }
    } else {
      // 配对错误！
      SoundService.playSFX('wrong');
      setHasMadeMistake(true);
      setWrongAttempt({ wordId, meaningId });
      setTimeout(() => {
        setWrongAttempt(null);
        setSelectedWordId(null);
        setSelectedMeaningId(null);
      }, 700);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center select-none">
      {/* 组块进度提示 */}
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
        <span>第 {batchIndex + 1} 组测试</span>
        <span>•</span>
        <span>{taskIndexInBatch + 1} / {totalInBatch}</span>
      </div>

      <Card className="w-full p-3.5 sm:p-8 shadow-xl border-slate-100 flex flex-col items-center">
        {/* 题型标签 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center gap-1 shadow-sm">
            <Sparkles size={12} />
            <span>连线配对题</span>
          </span>
          <span className="text-xs font-bold text-slate-500">
            已完成 {matchedIds.size} / {matchingData.pairs.length} 对
          </span>
        </div>

        <p className="text-xs sm:text-base font-bold text-slate-700 mb-4 sm:mb-6 text-center">
          {quiz.subPrompt || '点击左侧英文单词/短语，再点击右侧对应中文进行配对'}
        </p>

        {/* 左右对齐的 4 对 4 网格卡片（自适应手机与 iPad 宽窄屏幕） */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-6">
          {/* 左侧：4 个英文单词/短语 */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <h4 className="text-[11px] sm:text-xs font-black text-indigo-600 uppercase tracking-wider text-center pb-1 border-b border-indigo-100">
              英文单词 / 短语
            </h4>
            {shuffledWords.map((item) => {
              const isMatched = matchedIds.has(item.id);
              const isSelected = selectedWordId === item.id;
              const isWrong = wrongAttempt?.wordId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleWordClick(item.id)}
                  className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer select-none active:scale-98 min-h-[56px] sm:min-h-[64px] ${
                    isMatched
                      ? 'border-emerald-400 bg-emerald-50/80 text-emerald-800 shadow-sm opacity-90 pointer-events-none'
                      : isWrong
                      ? 'border-rose-400 bg-rose-50 text-rose-700 animate-shake shadow-md'
                      : isSelected
                      ? 'border-indigo-600 bg-indigo-50/90 text-indigo-900 shadow-md ring-2 sm:ring-4 ring-indigo-100'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex-1 pr-1 overflow-hidden">
                    <span className="font-extrabold text-xs sm:text-base leading-tight break-words text-slate-900 block">
                      {item.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <SpeakerBtn text={item.text} size="sm" className="scale-85 sm:scale-100 origin-right" />
                    {isMatched && (
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右侧：4 个中文翻译 */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <h4 className="text-[11px] sm:text-xs font-black text-purple-600 uppercase tracking-wider text-center pb-1 border-b border-purple-100">
              中文释义
            </h4>
            {shuffledMeanings.map((item) => {
              const isMatched = matchedIds.has(item.id);
              const isSelected = selectedMeaningId === item.id;
              const isWrong = wrongAttempt?.meaningId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleMeaningClick(item.id)}
                  className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer select-none active:scale-98 min-h-[56px] sm:min-h-[64px] ${
                    isMatched
                      ? 'border-emerald-400 bg-emerald-50/80 text-emerald-800 shadow-sm opacity-90 pointer-events-none'
                      : isWrong
                      ? 'border-rose-400 bg-rose-50 text-rose-700 animate-shake shadow-md'
                      : isSelected
                      ? 'border-purple-600 bg-purple-50/90 text-purple-900 shadow-md ring-2 sm:ring-4 ring-purple-100'
                      : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50 text-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex-1 pr-1 overflow-hidden">
                    <span className="font-bold text-xs sm:text-base text-slate-800 leading-tight break-words block">
                      {item.text}
                    </span>
                  </div>

                  {isMatched && (
                    <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
};
