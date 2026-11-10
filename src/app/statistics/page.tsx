'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { COPYWRITING } from '../../config/copywriting';
import { ClientSession } from '../../lib/auth/clientSession';
import {
  Flame,
  Award,
  CheckCircle,
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Timer,
  Calendar,
} from 'lucide-react';

export default function StatisticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    const handleSynced = () => {
      fetchStats();
    };
    window.addEventListener('wq_data_synced', handleSynced);
    return () => {
      window.removeEventListener('wq_data_synced', handleSynced);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', {
        headers: ClientSession.getAuthHeaders(),
      }).then((r) => r.json());
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

  // 近 7 天学习时间数据
  const recent7Days = stats?.recent7DaysTime || [];
  const maxMinutes = Math.max(...recent7Days.map((d: any) => d.minutes), 30);
  const total7DaysMinutes = recent7Days.reduce((acc: number, cur: any) => acc + (cur.minutes || 0), 0);
  const avgDailyMinutes = Math.round((total7DaysMinutes / 7) * 10) / 10;

  // 近 7 天每日学习单词数数据
  const recent7DaysWords = stats?.recent7DaysWordCounts || [];
  const maxWords = Math.max(...recent7DaysWords.map((d: any) => d.count), 20);
  const total7DaysWords = recent7DaysWords.reduce((acc: number, cur: any) => acc + (cur.count || 0), 0);
  const avgDailyWords = Math.round(total7DaysWords / 7);

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-10 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {COPYWRITING.statistics.title}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          真实记录每一天的学习时长与词汇成长，见证从量变到质变的飞跃
        </p>
      </div>

      {/* 6 大核心数据指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 今日学习时长 (突出高亮) */}
        <Card className="p-5 flex items-center gap-4 border-indigo-200 bg-gradient-to-tr from-indigo-50/70 to-purple-50/50 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
            <Timer size={24} />
          </div>
          <div>
            <p className="text-xs text-indigo-700 font-bold">今日专注学习时长</p>
            <h3 className="text-2xl font-black text-slate-900">
              {stats?.todayStudyMinutes || 0} <span className="text-sm font-bold text-indigo-600">分钟</span>
            </h3>
          </div>
        </Card>

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
      </div>

      {/* 图表一：近 7 天每日学习单词量柱状统计图 */}
      <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">近 7 天每日学习词汇量 (个)</h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span>
              近7天累计: <strong className="text-emerald-600 font-bold">{total7DaysWords}</strong> 词
            </span>
            <span>
              日均: <strong className="text-indigo-600 font-bold">{avgDailyWords}</strong> 词
            </span>
          </div>
        </div>

        {/* 柱状图 */}
        <div className="flex items-end justify-between gap-3 h-52 pt-6 px-2 sm:px-6">
          {recent7DaysWords.map((item: any, idx: number) => {
            const heightPercent = Math.max(8, Math.round((item.count / maxWords) * 100));
            const isToday = idx === recent7DaysWords.length - 1;

            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-xs font-bold text-slate-700 transition-transform group-hover:scale-110">
                  {item.count > 0 ? `${item.count}词` : '0'}
                </span>

                <div className="w-full max-w-[44px] bg-slate-100 rounded-2xl overflow-hidden flex flex-col justify-end h-32 p-1">
                  <div
                    className={`w-full rounded-xl transition-all duration-500 shadow-sm ${
                      isToday
                        ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400'
                        : item.count > 0
                        ? 'bg-gradient-to-t from-emerald-400 to-teal-300 group-hover:from-emerald-500 group-hover:to-teal-400'
                        : 'bg-slate-200'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                <div className="flex flex-col items-center mt-1">
                  <span className={`text-xs font-bold ${isToday ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {item.weekday}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 图表二：近 7 天每日学习时间柱状统计图 */}
      <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">近 7 天每日专注学习时间 (分钟)</h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span>
              近7天累计: <strong className="text-indigo-600 font-bold">{total7DaysMinutes}</strong> 分钟
            </span>
            <span>
              日均: <strong className="text-emerald-600 font-bold">{avgDailyMinutes}</strong> 分钟
            </span>
          </div>
        </div>

        {/* 柱状图 */}
        <div className="flex items-end justify-between gap-3 h-52 pt-6 px-2 sm:px-6">
          {recent7Days.map((item: any, idx: number) => {
            const heightPercent = Math.max(8, Math.round((item.minutes / maxMinutes) * 100));
            const isToday = idx === recent7Days.length - 1;

            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-xs font-bold text-slate-700 transition-transform group-hover:scale-110">
                  {item.minutes > 0 ? `${item.minutes}m` : '0'}
                </span>

                <div className="w-full max-w-[44px] bg-slate-100 rounded-2xl overflow-hidden flex flex-col justify-end h-32 p-1">
                  <div
                    className={`w-full rounded-xl transition-all duration-500 shadow-sm ${
                      isToday
                        ? 'bg-gradient-to-t from-indigo-600 via-indigo-500 to-purple-500'
                        : item.minutes > 0
                        ? 'bg-gradient-to-t from-indigo-400 to-indigo-300 group-hover:from-indigo-500 group-hover:to-indigo-400'
                        : 'bg-slate-200'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                <div className="flex flex-col items-center mt-1">
                  <span className={`text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-slate-600'}`}>
                    {item.weekday}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
