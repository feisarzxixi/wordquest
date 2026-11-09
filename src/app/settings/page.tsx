'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DIFFICULTY_CONFIGS, DifficultyTier } from '../../config/gamification';
import { COPYWRITING } from '../../config/copywriting';
import { SoundService } from '../../lib/audio/SoundService';
import { ClientSession, UserSession } from '../../lib/auth/clientSession';
import { ProfileSwitcherModal } from '../../components/layout/ProfileSwitcherModal';
import {
  User,
  Volume2,
  Users,
  LogOut,
  Check,
  Sparkles,
  Flame,
  Award,
  Globe2,
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [studentName, setStudentName] = useState('');
  const [speechRate, setSpeechRate] = useState(0.85);
  const [accent, setAccent] = useState<'uk' | 'us'>('uk');
  const [difficulty, setDifficulty] = useState<DifficultyTier>('regular');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [detectedVoice, setDetectedVoice] = useState<string>('母语外教高清原声 (剑桥/牛津标准音)');

  useEffect(() => {
    const user = ClientSession.getCurrentUser();
    setCurrentUser(user);
    fetchSettings(user.id);
  }, []);

  const fetchSettings = async (studentId: string) => {
    try {
      const res = await fetch(`/api/settings?studentId=${studentId}`).then((r) => r.json());
      if (res.success && res.data) {
        setSettings(res.data);
        setStudentName(res.data.studentName || '');
        setSpeechRate(res.data.speechRate || 0.85);
        setDifficulty(res.data.difficulty || 'regular');
        if (res.data.accent) {
          setAccent(res.data.accent);
          SoundService.setAccent(res.data.accent);
        }
      }
    } catch (err) {
      console.error('Fetch settings failed:', err);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const user = ClientSession.getCurrentUser();
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-student-id': user.id,
        },
        body: JSON.stringify({
          studentName,
          speechRate,
          accent,
          difficulty,
        }),
      }).then((r) => r.json());

      if (res.success) {
        SoundService.setAccent(accent);
        const updatedUser = { ...user, realName: studentName };
        ClientSession.setCurrentUser(updatedUser);
        setCurrentUser(updatedUser);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save settings failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {COPYWRITING.settings.title}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          定制你的专属学习节奏、英美发音习惯与账号切换
        </p>
      </div>

      {/* 1. 个人档案与打卡状态 */}
      <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User className="text-indigo-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">{COPYWRITING.settings.studentProfile}</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">账号: {currentUser?.username}</span>
        </div>

        {/* 积分与打卡徽章卡 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">连续打卡</p>
              <p className="text-base font-black text-slate-800">
                {settings?.streakDays ?? 0} 天
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <Award size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">累计积分</p>
              <p className="text-base font-black text-indigo-600">
                {settings?.totalPoints ?? 0} 分
              </p>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">当前身份</p>
              <p className="text-base font-black text-purple-700">正式学员</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {COPYWRITING.settings.studentName}
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* 发音口音偏好 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Globe2 size={16} className="text-indigo-600" />
              <span>标准听力发音口音</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccent('uk')}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all ${
                  accent === 'uk'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🇬🇧 纯正英音 (Cambridge)
              </button>
              <button
                type="button"
                onClick={() => setAccent('us')}
                className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all ${
                  accent === 'us'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🇺🇸 纯正美音 (General US)
              </button>
            </div>
          </div>
        </div>

        {/* 语速微调与试听 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
            <span>发音语速 ({speechRate}x)</span>
            <button
              type="button"
              onClick={() => SoundService.speak('challenge', speechRate)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              试听单词发音效果
            </button>
          </label>
          <input
            type="range"
            min="0.6"
            max="1.2"
            step="0.05"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            当前音频引擎: <span className="font-semibold text-emerald-600">录音棚级母语外教原声流 (自动支持 iPad 高清播放)</span>
          </p>
        </div>

        {/* 学习档位 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">
            {COPYWRITING.settings.difficultyTitle}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['novice', 'regular', 'master'] as DifficultyTier[]).map((tierKey) => {
              const cfg = DIFFICULTY_CONFIGS[tierKey];
              const isSelected = difficulty === tierKey;
              return (
                <button
                  key={tierKey}
                  type="button"
                  onClick={() => setDifficulty(tierKey)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-slate-900 text-base">{cfg.label}</span>
                    <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                      +{cfg.dailyBonusPoints}分
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{cfg.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
              <Check size={16} /> 保存成功！
            </span>
          )}
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? '正在保存...' : '保存偏好设置'}
          </Button>
        </div>
      </Card>

      {/* 2. 设备多账号管理 (免密一键切换) */}
      <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="text-indigo-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">本机已登录账号与切换</h2>
          </div>
          <span className="text-xs text-slate-400">专为 iPad 多学生共用优化</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-lg">
              {currentUser?.realName.slice(0, 1) || '学'}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                当前学生: {currentUser?.realName}
              </p>
              <p className="text-xs text-slate-400 font-mono">账号: {currentUser?.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsSwitcherOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-100"
            >
              🔄 切换其他学习账号
            </button>

            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors flex items-center gap-1"
            >
              <LogOut size={14} />
              <span>登出</span>
            </Link>
          </div>
        </div>
      </Card>

      <ProfileSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        onProfileChanged={(u) => {
          setCurrentUser(u);
          fetchSettings(u.id);
        }}
      />
    </div>
  );
}
