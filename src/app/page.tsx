'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { COPYWRITING } from '../config/copywriting';
import { ClientSession } from '../lib/auth/clientSession';
import { Flame, Award, BookOpen, Calendar, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<{
    settings: any;
    plan: any;
    stats: any;
    hasWords: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 未登录过的设备首次访问自动拦截跳转到登录页
    if (typeof window !== 'undefined' && !ClientSession.hasLoggedInUser()) {
      window.location.href = '/login';
      return;
    }
    fetchData();

    const handleSynced = () => {
      fetchData();
    };
    window.addEventListener('wq_data_synced', handleSynced);
    return () => {
      window.removeEventListener('wq_data_synced', handleSynced);
    };
  }, []);

  const fetchData = async () => {
    try {
      const authHeaders = ClientSession.getAuthHeaders();
      const [settingsRes, planRes, statsRes] = await Promise.all([
        fetch('/api/settings', { headers: authHeaders }).then((r) => r.json()),
        fetch('/api/plan', { headers: authHeaders }).then((r) => r.json()),
        fetch('/api/stats', { headers: authHeaders }).then((r) => r.json()),
      ]);

      setData({
        settings: settingsRes.data,
        plan: planRes.data,
        stats: statsRes.data,
        hasWords: (statsRes.data?.totalVocabulary || 0) > 0,
      });
    } catch (err) {
      console.error('Fetch home data failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">正在准备今日词汇计划...</span>
        </div>
      </div>
    );
  }

  const { settings, plan, stats, hasWords } = data || {};

  const now = new Date();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const formattedDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekDays[now.getDay()]}`;

  let totalTasks = 0;
  let answeredTasks = 0;
  if (plan?.batches) {
    plan.batches.forEach((b: any) => {
      b.testTasks.forEach((t: any) => {
        totalTasks++;
        if (t.isAnswered) answeredTasks++;
      });
    });
  }

  const isCompleted = plan?.isCompleted || (totalTasks > 0 && answeredTasks === totalTasks);
  const isStarted = answeredTasks > 0 && !isCompleted;

  let buttonState: 'start' | 'continue' | 'completed_practice' | 'empty' = 'start';
  if (!hasWords) {
    buttonState = 'empty';
  } else if (isCompleted) {
    buttonState = 'completed_practice';
  } else if (isStarted) {
    buttonState = 'continue';
  } else {
    buttonState = 'start';
  }

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 flex flex-col justify-center">
      {/* 头部学生与日期 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            你好，{settings?.studentName || '同学'}
          </h2>
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mt-1">
            <Calendar size={16} />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* 核心激励指标：连续天数 & 当前积分 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-50 border border-orange-100/80 shadow-sm">
            <Flame className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="leading-tight">
              <span className="text-lg font-black text-slate-900">{settings?.streakDays || 0}</span>
              <span className="text-xs text-orange-800/80 ml-1 font-medium">{COPYWRITING.home.streakLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-100/80 shadow-sm">
            <Award className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="leading-tight">
              <span className="text-lg font-black text-indigo-700">{settings?.totalPoints || 0}</span>
              <span className="text-xs text-indigo-800/80 ml-1 font-medium">{COPYWRITING.home.pointsLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 核心学习卡片容器 */}
      <Card className="w-full p-8 sm:p-12 shadow-xl border-slate-100 flex flex-col items-center text-center relative overflow-hidden bg-white">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

        <div className="w-full max-w-lg flex flex-col items-center">
          {/* 进度展示 */}
          <div className="w-full mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-slate-600">
                {COPYWRITING.home.todayProgressLabel}
              </span>
              <span className="text-sm font-extrabold text-indigo-600">
                {answeredTasks} / {totalTasks} 题
              </span>
            </div>
            <ProgressBar current={answeredTasks} total={totalTasks} />
          </div>

          {/* 今日目标简况 */}
          <div className="grid grid-cols-2 gap-4 w-full mb-10">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
              <BookOpen className="w-5 h-5 text-indigo-600 mb-1" />
              <span className="text-xl sm:text-2xl font-black text-slate-800">
                {plan?.targetNewWordCount || 0} 词
              </span>
              <span className="text-xs text-slate-400 mt-0.5">{COPYWRITING.home.newWordsTargetLabel}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
              <CheckCircle2 className="w-5 h-5 text-purple-600 mb-1" />
              <span className="text-xl sm:text-2xl font-black text-slate-800">
                {plan?.totalWordCount || 0} 词
              </span>
              <span className="text-xs text-slate-400 mt-0.5">今日总排程(含复习)</span>
            </div>
          </div>

          {/* 唯一主要学习按钮 */}
          {buttonState === 'empty' && (
            <Link
              href="/settings"
              className="w-full py-4 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xl shadow-lg shadow-amber-200 flex items-center justify-center gap-2 transition-all"
            >
              <span>{COPYWRITING.home.btnImportFirst}</span>
              <ArrowRight size={22} />
            </Link>
          )}

          {buttonState === 'start' && (
            <Link
              href="/study"
              className="w-full py-4 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-extrabold text-xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
            >
              <span>{COPYWRITING.home.btnStart}</span>
              <ArrowRight size={22} />
            </Link>
          )}

          {buttonState === 'continue' && (
            <Link
              href="/study"
              className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 active:scale-98 text-white font-extrabold text-xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
            >
              <span>{COPYWRITING.home.btnContinue}</span>
              <ArrowRight size={22} />
            </Link>
          )}

          {buttonState === 'completed_practice' && (
            <Link
              href="/study?mode=practice"
              className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 hover:opacity-95 active:scale-98 text-white font-extrabold text-xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles size={22} />
              <span>{COPYWRITING.home.btnCompleted}</span>
              <ArrowRight size={22} />
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
