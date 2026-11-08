'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { COPYWRITING } from '../../config/copywriting';
import { Flame, Award, CheckCircle, BookOpen, Clock, Target, TrendingUp } from 'lucide-react';

export default function StatisticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats').then((r) => r.json());
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Fetch stats failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  // 模拟近 7 天学习数据分布（展示平滑趋势）
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '今天'];
  const trendData = [12, 15, 10, 18, 14, 20, stats?.learnedCount || 15];
  const maxVal = Math.max(...trendData, 25);

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-10 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {COPYWRITING.statistics.title}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          真实记录每一天点滴积累，见证从量变到质变的飞跃
        </p>
      </div>

      {/* 6 大核心数据指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 flex items-center gap-4 border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">{COPYWRITING.statistics.learnedCount}</p>
            <h3 className="text-2xl font-black text-slate-900">{stats?.learnedCount || 0} 词</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">{COPYWRITING.statistics.masteredCount}</p>
            <h3 className="text-2xl font-black text-slate-900">{stats?.masteredCount || 0} 词</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Target size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">{COPYWRITING.statistics.accuracyRate}</p>
            <h3 className="text-2xl font-black text-slate-900">{stats?.accuracyRate || 0}%</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">连续学习打卡</p>
            <h3 className="text-2xl font-black text-slate-900">{stats?.streakDays || 0} 天</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">累计总积分</p>
            <h3 className="text-2xl font-black text-slate-900">{stats?.totalPoints || 0} 分</h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold">{COPYWRITING.statistics.totalAttempts}</p>
            <h3 className="text-2xl font-black text-slate-900">{stats?.totalAttempts || 0} 次</h3>
          </div>
        </Card>
      </div>

      {/* 近 7 天学习趋势柱状图 */}
      <Card className="p-6 sm:p-8 border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">{COPYWRITING.statistics.chartTitle}</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">每天学习词量趋势</span>
        </div>

        <div className="flex items-end justify-between gap-3 h-48 pt-6 px-2">
          {days.map((day, idx) => {
            const val = trendData[idx];
            const heightPercent = Math.round((val / maxVal) * 100);

            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-xs font-bold text-slate-600">{val}</span>
                <div className="w-full max-w-[42px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-32">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-500 ${
                      idx === 6
                        ? 'bg-gradient-to-t from-indigo-600 to-purple-600'
                        : 'bg-indigo-300 hover:bg-indigo-400'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 mt-1">{day}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
