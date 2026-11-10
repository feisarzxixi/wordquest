'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BookOpen, Compass, BarChart3, Settings, Users, ChevronRight, Shield, LogIn, FlaskConical } from 'lucide-react';
import { ClientSession, UserSession } from '../../lib/auth/clientSession';
import { ProfileSwitcherModal } from './ProfileSwitcherModal';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/study', label: '学习', icon: Compass },
  { href: '/words', label: '我的单词', icon: BookOpen },
  { href: '/statistics', label: '学习统计', icon: BarChart3 },
  { href: '/settings', label: '设置', icon: Settings },
];

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const syncUser = () => {
      const user = ClientSession.getCurrentUser();
      setCurrentUser(user);
    };

    syncUser();

    const handleCustomChange = (e: any) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      } else {
        syncUser();
      }
    };

    window.addEventListener('wq_user_changed', handleCustomChange);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('wq_user_changed', handleCustomChange);
      window.removeEventListener('storage', syncUser);
    };
  }, [pathname]);

  const handleUserCardClick = () => {
    if (!currentUser) {
      router.push('/login');
    } else {
      setIsSwitcherOpen(true);
    }
  };

  return (
    <>
      {/* iPad 横屏与桌面端：左侧极简导航栏 */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-100 p-6 shrink-0 h-screen sticky top-0 justify-between select-none">
        <div className="flex flex-col gap-8">
          {/* Logo 与主标题 */}
          <Link href={currentUser ? '/' : '/login'} className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Compass size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">WordQuest</h1>
              <p className="text-xs font-semibold text-indigo-600 tracking-wider">英语词汇学习</p>
            </div>
          </Link>

          {/* 登录页隐藏业务导航；未登录时也不展示功能菜单，防止越权 */}
          {isLoginPage ? (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-slate-600 text-xs leading-relaxed">
              <p className="font-bold text-indigo-900 mb-1">欢迎来到 WordQuest</p>
              <p>请在右侧输入学生账号密码，开启纯正外教原声与自适应艾宾浩斯复习。</p>
            </div>
          ) : (
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={currentUser ? item.href : '/login'}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold transition-all active:scale-98 ${
                      isActive
                        ? 'bg-indigo-50/80 text-indigo-600 font-bold'
                        : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* 底部学生信息卡与快捷切号入口 */}
        {!isLoginPage && (
          <div className="flex flex-col gap-2">
            <Link
              href="/lab"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                pathname === '/lab'
                  ? 'bg-amber-100/80 text-amber-900 border-amber-300 shadow-sm'
                  : 'bg-amber-50/60 text-amber-800 border-amber-200/80 hover:bg-amber-100/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <FlaskConical size={16} className="text-amber-600" />
                <span>2.0 题型实验室</span>
              </div>
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900">
                Lab
              </span>
            </Link>

            <div
              onClick={handleUserCardClick}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-100 hover:border-indigo-100 flex items-center justify-between cursor-pointer transition-all group active:scale-98"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 rounded-xl ${currentUser ? 'bg-gradient-to-tr from-indigo-600 to-purple-600' : 'bg-slate-200 text-slate-500'} text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0`}>
                  {currentUser ? (currentUser.realName ? currentUser.realName.slice(0, 1) : currentUser.username.slice(0, 1)) : <LogIn size={18} />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                    {currentUser?.realName || currentUser?.username || '未登录'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {currentUser ? '点击快速换号' : '点击前往登录'}
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0">
                <ChevronRight size={16} />
              </div>
            </div>

            {/* 仅在当前登录为管理员时展示后台快捷入口 */}
            {currentUser?.role === 'admin' && (
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg text-indigo-600 bg-indigo-50/60 hover:bg-indigo-100 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Shield size={13} />
                  <span>进入管理员控制台</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-500">/admin</span>
              </Link>
            )}
          </div>
        )}
      </aside>

      {/* 手机/iPad竖屏顶栏快捷换号条 */}
      {!isLoginPage && (
        <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <Link href={currentUser ? '/' : '/login'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              W
            </div>
            <span className="font-black text-slate-900 tracking-tight text-base">WordQuest</span>
          </Link>

          <button
            onClick={handleUserCardClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-700 text-xs font-bold transition-colors"
          >
            {currentUser ? <Users size={14} className="text-indigo-600" /> : <LogIn size={14} className="text-indigo-600" />}
            <span>{currentUser?.realName || currentUser?.username || '点击登录'}</span>
          </button>
        </div>
      )}

      {/* 换号弹窗 */}
      <ProfileSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        onProfileChanged={(u) => setCurrentUser(u)}
      />
    </>
  );
};
