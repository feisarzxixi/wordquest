'use client';

import React, { useState } from 'react';
import { QuizPayload } from '../../../lib/quiz-factory/QuestionFactory';
import { Card } from '../../ui/Card';
import { SpeakerBtn } from '../../ui/SpeakerBtn';
import { SoundService } from '../../../lib/audio/SoundService';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

export interface MatchingQuizViewProps {
  quiz: QuizPayload;
  batchIndex: number;
  taskIndexInBatch: number;
  totalInBatch: number;
  onSubmitAnswer: (isCorrect: boolean) => void;
  disabled?: boolean;
}

// 4 组独立高对比配对同色方案（蓝、绿、橙、紫），直观清晰一目了然
const PAIR_THEMES = [
  {
    border: 'border-blue-400',
    bg: 'bg-blue-50/90',
    text: 'text-blue-950',
    badge: 'bg-blue-600 text-white',
    name: '配对 1',
  },
  {
    border: 'border-emerald-400',
    bg: 'bg-emerald-50/90',
    text: 'text-emerald-950',
    badge: 'bg-emerald-600 text-white',
    name: '配对 2',
  },
  {
    border: 'border-amber-400',
    bg: 'bg-amber-50/90',
    text: 'text-amber-950',
    badge: 'bg-amber-600 text-white',
    name: '配对 3',
  },
  {
    border: 'border-purple-400',
    bg: 'bg-purple-50/90',
    text: 'text-purple-950',
    badge: 'bg-purple-600 text-white',
    name: '配对 4',
  },
];

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
  const [isCompleted, setIsCompleted] = useState(false);

  if (!matchingData) return null;

  const { shuffledWords, shuffledMeanings, pairs } = matchingData;

  const getPairTheme = (itemId: string) => {
    const pairIndex = pairs.findIndex((p) => p.id === itemId);
    if (pairIndex === -1) return PAIR_THEMES[0];
    return PAIR_THEMES[pairIndex % PAIR_THEMES.length];
  };

  const getPairBadgeNumber = (itemId: string) => {
    const pairIndex = pairs.findIndex((p) => p.id === itemId);
    return pairIndex !== -1 ? pairIndex + 1 : 1;
  };

  // 处理左侧单词点击
  const handleWordClick = (wordId: string) => {
    if (disabled || isCompleted || matchedIds.has(wordId) || wrongAttempt) return;

    if (selectedMeaningId) {
      checkMatch(wordId, selectedMeaningId);
    } else {
      setSelectedWordId(wordId);
    }
  };

  // 处理右侧释义点击
  const handleMeaningClick = (meaningId: string) => {
    if (disabled || isCompleted || matchedIds.has(meaningId) || wrongAttempt) return;

    if (selectedWordId) {
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

      // 全部配对成功：原地保留正确答案，展示完成状态与继续按钮，绝不突然跳出单张单词卡！
      if (nextMatched.size === matchingData.pairs.length) {
        SoundService.playSFX('complete');
        setIsCompleted(true);
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
      <div className="flex items-center gap-2 mb-3 sm:mb-4 text-xs font-semibold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
        <span>第 {batchIndex + 1} 组测试</span>
        <span>•</span>
        <span>{taskIndexInBatch + 1} / {totalInBatch}</span>
      </div>

      <Card className="w-full p-4 sm:p-8 shadow-xl border-slate-100 flex flex-col items-center">
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

        <p className="text-xs sm:text-base font-bold text-slate-700 mb-3 sm:mb-5 text-center">
          {quiz.subPrompt || '点击左侧英文单词/短语，再点击右侧对应中文进行配对'}
        </p>

        {/* 左右对齐的 4 对 4 网格卡片（配对成功使用专属同色标记） */}
        <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-6">
          {/* 左侧：4 个英文单词/短语 */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <h4 className="text-[11px] sm:text-xs font-black text-indigo-600 uppercase tracking-wider text-center pb-1 border-b border-indigo-100">
              英文单词 / 短语
            </h4>
            {shuffledWords.map((item) => {
              const isMatched = matchedIds.has(item.id);
              const isSelected = selectedWordId === item.id;
              const isWrong = wrongAttempt?.wordId === item.id;
              const theme = getPairTheme(item.id);
              const badgeNum = getPairBadgeNumber(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => handleWordClick(item.id)}
                  className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer select-none active:scale-98 min-h-[56px] sm:min-h-[64px] ${
                    isMatched
                      ? `${theme.border} ${theme.bg} ${theme.text} shadow-sm opacity-95 pointer-events-none ring-1 sm:ring-2`
                      : isWrong
                      ? 'border-rose-400 bg-rose-50 text-rose-700 animate-shake shadow-md'
                      : isSelected
                      ? 'border-indigo-600 bg-indigo-50/90 text-indigo-900 shadow-md ring-2 sm:ring-4 ring-indigo-100'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex-1 pr-1 overflow-hidden">
                    <span className="font-extrabold text-xs sm:text-base leading-tight break-words block">
                      {item.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <SpeakerBtn text={item.text} size="sm" className="scale-85 sm:scale-100 origin-right" />
                    {isMatched && (
                      <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${theme.badge} flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0`}>
                        {badgeNum}
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
              const theme = getPairTheme(item.id);
              const badgeNum = getPairBadgeNumber(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => handleMeaningClick(item.id)}
                  className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer select-none active:scale-98 min-h-[56px] sm:min-h-[64px] ${
                    isMatched
                      ? `${theme.border} ${theme.bg} ${theme.text} shadow-sm opacity-95 pointer-events-none ring-1 sm:ring-2`
                      : isWrong
                      ? 'border-rose-400 bg-rose-50 text-rose-700 animate-shake shadow-md'
                      : isSelected
                      ? 'border-purple-600 bg-purple-50/90 text-purple-900 shadow-md ring-2 sm:ring-4 ring-purple-100'
                      : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50 text-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex-1 pr-1 overflow-hidden">
                    <span className="font-bold text-xs sm:text-base leading-tight break-words block">
                      {item.text}
                    </span>
                  </div>

                  {isMatched && (
                    <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${theme.badge} flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 ml-1`}>
                      {badgeNum}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 原地保留正确答案提示与下一步按钮 */}
        {isCompleted && (
          <div className="w-full mt-5 sm:mt-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm sm:text-base font-extrabold text-emerald-900">全部配对成功！太棒了！</p>
                <p className="text-xs font-semibold text-emerald-700">正确答案与专属同色标记已在上方完整保留</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSubmitAnswer(!hasMadeMistake)}
              className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>继续下一题</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
