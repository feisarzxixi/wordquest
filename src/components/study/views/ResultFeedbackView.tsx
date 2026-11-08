'use client';

import React, { useEffect, useState } from 'react';
import { BaseWord } from '../../../lib/algorithms/planEngine';
import { Card } from '../../ui/Card';
import { SpeakerBtn } from '../../ui/SpeakerBtn';
import { SoundService } from '../../../lib/audio/SoundService';
import { RESULT_AUTO_ADVANCE_MS } from '../../../config/learningRules';
import { COPYWRITING } from '../../../config/copywriting';
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
  const [progress, setProgress] = useState(100);

  // 播放音效与按键监听
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

  // 方案 A 答对时：3.0 秒平滑倒计时推进，答错时彻底停止倒计时
  useEffect(() => {
    if (!isCorrect) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / RESULT_AUTO_ADVANCE_MS) * 100);
      setProgress(remaining);

      if (elapsed >= RESULT_AUTO_ADVANCE_MS) {
        clearInterval(interval);
        onNext();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isCorrect, onNext]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center select-none">
      <Card
        className={`w-full p-8 sm:p-12 shadow-xl border-2 transition-all ${
          isCorrect
            ? 'bg-gradient-to-b from-emerald-50/70 to-white border-emerald-300'
            : 'bg-gradient-to-b from-rose-50/70 to-white border-rose-300'
        }`}
      >
        {/* 对错头部状态与得分 */}
        <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {isCorrect ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
            )}
            <span
              className={`text-2xl font-extrabold ${
                isCorrect ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isCorrect ? COPYWRITING.study.resultCorrect : COPYWRITING.study.resultWrong}
            </span>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              isCorrect && isFirstTry
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isCorrect && isFirstTry ? '+1 积分' : '+0 积分'}
          </div>
        </div>

        {/* 核心单词与释义解析 */}
        <div className="flex flex-col items-center text-center my-4">
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

          <div className="w-full py-3 px-6 bg-slate-50 rounded-xl mb-6 border border-slate-100">
            <p className="text-2xl font-bold text-slate-800">{word.meaning}</p>
          </div>

          {/* 完整例句与翻译复盘 */}
          {word.example && (
            <div className="w-full text-left bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm mb-6">
              <p className="text-slate-800 text-base font-semibold leading-relaxed">
                {word.example}
              </p>
              {word.translation && (
                <p className="text-slate-500 text-sm mt-1.5">{word.translation}</p>
              )}
            </div>
          )}
        </div>

        {/* 方案 A 底部操作分流：仅通过按钮推进，不响应点击任意位置 */}
        {isCorrect ? (
          <div className="w-full flex flex-col items-center mt-2">
            {/* 3秒倒计时进度条 */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
              <div
                className="bg-emerald-500 h-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* 明确的下一题按钮 */}
            <button
              type="button"
              onClick={onNext}
              className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-lg shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
            >
              <span>{isLastTask ? '完成今日学习' : '下一题'}</span>
              <ArrowRight size={20} />
            </button>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              3秒后自动推进，亦可点击按钮或按回车进入下一题
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center pt-2">
            <button
              type="button"
              onClick={onNext}
              className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <span>{isLastTask ? '完成今日学习' : COPYWRITING.study.btnNext}</span>
              <ArrowRight size={20} />
            </button>
            <p className="text-xs text-slate-400 mt-2">
              不急，仔细看完例句，点击按钮或按回车进入下一题
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
