'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ClientSession } from '../../lib/auth/clientSession';
import { Compass, User, KeyRound, AlertCircle, CheckCircle2, ArrowRight, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // 统一登录字段 (支持普通学生账号与 ADMIN/admin 管理员账号)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 学生注册字段
  const [regUsername, setRegUsername] = useState('');
  const [regRealName, setRegRealName] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingNotice, setPendingNotice] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  // 统一登录逻辑 (自动识别学生或管理员)
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setPendingNotice('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }).then((r) => r.json());

      if (res.success) {
        ClientSession.setCurrentUser(res.data);
        if (res.data.role === 'admin') {
          sessionStorage.setItem('wq_admin_auth', 'true');
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      } else {
        if (res.status === 'pending') {
          setPendingNotice(res.error);
        } else {
          setErrorMsg(res.error || '登录失败，请检查账号密码');
        }
      }
    } catch (err: any) {
      setErrorMsg('网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 学生自主注册逻辑
  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRegSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          realName: regRealName,
          password: regPassword,
        }),
      }).then((r) => r.json());

      if (res.success) {
        setRegSuccessMsg(res.message);
        setRegUsername('');
        setRegRealName('');
        setRegPassword('');
      } else {
        setErrorMsg(res.error || '注册失败，请重试');
      }
    } catch (err: any) {
      setErrorMsg('网络异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 max-w-md w-full mx-auto">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200 mb-3">
          <Compass size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">WordQuest</h1>
        <p className="text-xs font-semibold text-indigo-600 tracking-wider mt-0.5">
          初中英语词汇学习平台
        </p>
      </div>

      {/* 极简双选项卡 (已移除独立管理员入口，统一登录) */}
      <div className="w-full flex rounded-2xl bg-slate-100 p-1.5 mb-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => {
            setTab('login');
            setErrorMsg('');
            setPendingNotice('');
          }}
          className={`flex-1 py-2.5 rounded-xl transition-all ${
            tab === 'login'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          账号登录
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('register');
            setErrorMsg('');
            setPendingNotice('');
          }}
          className={`flex-1 py-2.5 rounded-xl transition-all ${
            tab === 'register'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          新学生注册
        </button>
      </div>

      <Card className="w-full p-6 sm:p-8 border-slate-100 shadow-xl shadow-slate-100 flex flex-col gap-5">
        {/* 错误提示 */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 审核中通知 */}
        {pendingNotice && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <AlertCircle size={18} className="shrink-0 text-amber-600" />
              <span>账号待审核中</span>
            </div>
            <p>{pendingNotice}</p>
            <p className="text-[11px] text-amber-600 mt-1">
              管理员邮箱 (feisarz@gmail.com) 已收到邮件通知，请耐心等待管理员在后台开通。
            </p>
          </div>
        )}

        {/* 注册成功通知 */}
        {regSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <span>注册申请已提交！</span>
            </div>
            <p>{regSuccessMsg}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold mt-1 bg-emerald-100/60 p-2 rounded-lg">
              <Mail size={14} className="shrink-0" />
              <span>已自动向管理员邮箱 (feisarz@gmail.com) 发送审批提醒</span>
            </div>
            <button
              onClick={() => {
                setTab('login');
                setRegSuccessMsg('');
              }}
              className="mt-2 text-indigo-600 font-bold hover:underline self-start flex items-center gap-1"
            >
              <span>前往登录页</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* 1. 统一登录表单 (支持学生及 ADMIN / admin) */}
        {tab === 'login' && !pendingNotice && (
          <form onSubmit={handleUnifiedLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">登录账号</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="请输入您的账号"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">登录密码</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="请输入您的密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2 py-3 text-sm">
              {loading ? '正在验证...' : '登 录'}
            </Button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
              <span>新同学尚未开通？</span>
              <button
                type="button"
                onClick={() => setTab('register')}
                className="text-indigo-600 font-bold hover:underline"
              >
                提交注册申请
              </button>
            </div>
          </form>
        )}

        {/* 2. 学生注册表单 */}
        {tab === 'register' && !regSuccessMsg && (
          <form onSubmit={handleStudentRegister} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">真实姓名</label>
              <input
                type="text"
                required
                placeholder="例如: 张小明"
                value={regRealName}
                onChange={(e) => setRegRealName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">登录账号 (英文/拼音)</label>
              <input
                type="text"
                required
                placeholder="例如: zhangxiaoming"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">设置密码 (至少 4 位)</label>
              <input
                type="password"
                required
                placeholder="输入容易记住的密码"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600"
              />
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed flex items-center gap-2">
              <Mail size={16} className="text-indigo-600 shrink-0" />
              <span>提交后系统将自动发送邮件至管理员邮箱 (feisarz@gmail.com) 审核。</span>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-3 text-sm">
              {loading ? '提交中...' : '提交注册申请'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
