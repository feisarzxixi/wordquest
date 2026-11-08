'use client';

import React, { useEffect } from 'react';
import { BaseWord } from '../../../lib/algorithms/planEngine';
import { Card } from '../../ui/Card';
import { SpeakerBtn } from '../../ui/SpeakerBtn';
import { SoundService } from '../../../lib/audio/SoundService';
import { COPYWRITING } from '../../../config/copywriting';
import { Award, CheckCircle, Flame, Clock, BookOpen, ArrowRight } from 'lucide-react';

export interface DailySummaryViewProps {
  bonusPoints: number;
  totalPointsEarned: number;
  newStreak: number;
  totalTasks: number;
  correctTasks: number;
  wrongWords: BaseWord[];
  durationMinutes: number;
  onBackHome: () => void;
}

export const DailySummaryView: React.FC<DailySummaryViewProps> = ({
  bonusPoints,
  totalPointsEarned,
  newStreak,
  totalTasks,
  correctTasks,
  wrongWords,
  durationMinutes,
  onBackHome,
}) => {
  useEffect(() => {
    SoundService.playSFX('complete');
  }, []);

  const accuracy = totalTasks > 0 ? Math.round((correctTasks / totalTasks) * 100) : 100;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center py-6 px-4">
      {/* 头部荣誉卡片 */}
      <Card className="w-full text-center p-8 sm:p-12 shadow-xl bg-gradient-to-b from-indigo-50/50 via-white to-white border-indigo-100 mb-6">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
          <Award size={44} />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
          {COPYWRITING.study.summaryTitle}
        </h1>
        <p className="text-slate-500 text-base max-w-md mx-auto mb-8">
          {COPYWRITING.study.summarySubtitle}
        </p>

        {/* 核心成就数据指标 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center">
            <Flame className="w-6 h-6 text-orange-500 mb-1" />
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {newStreak}
            </span>
            <span className="text-xs text-slate-500 mt-0.5">连续打卡(天)</span>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col items-center">
            <Award className="w-6 h-6 text-indigo-600 mb-1" />
            <span className="text-2xl sm:text-3xl font-black text-indigo-600">
              +{totalPointsEarned}
            </span>
            <span className="text-xs text-indigo-700/70 mt-0.5">今日获得积分</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center">
            <CheckCircle className="w-6 h-6 text-emerald-500 mb-1" />
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {accuracy}%
            </span>
            <span className="text-xs text-slate-500 mt-0.5">测试正确率</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center">
            <Clock className="w-6 h-6 text-purple-500 mb-1" />
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {Math.max(1, durationMinutes)}
            </span>
            <span className="text-xs text-slate-500 mt-0.5">专注时长(分)</span>
          </div>
        </div>
      </Card>

      {/* 当堂错题复盘模块 */}
      <Card className="w-full p-6 sm:p-8 shadow-md border-slate-100 mb-8">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">
            {COPYWRITING.study.summaryWrongListTitle}
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 ml-auto">
            {wrongWords.length} 词
          </span>
        </div>

        {wrongWords.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-slate-600 font-medium">
              {COPYWRITING.study.summaryWrongListEmpty}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wrongWords.map((word) => (
              <div
                key={word.id}
                className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{word.word}</span>
                    <span className="text-xs text-slate-400 font-mono">{word.phonetic}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{word.meaning}</p>
                </div>
                <SpeakerBtn text={word.word} size="sm" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 返回首页操作按钮 */}
      <button
        type="button"
        onClick={onBackHome}
        className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all"
      >
        <span>{COPYWRITING.study.btnBackHome}</span>
        <ArrowRight size={22} />
      </button>
    </div>
  );
};
