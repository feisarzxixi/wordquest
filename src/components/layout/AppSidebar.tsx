'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Compass, BarChart3, Settings, Users, ChevronRight, Shield } from 'lucide-react';
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
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(ClientSession.getCurrentUser());
  }, []);

  return (
    <>
      {/* iPad 横屏与桌面端：左侧极简导航栏 */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-100 p-6 shrink-0 h-screen sticky top-0 justify-between select-none">
        <div className="flex flex-col gap-8">
          {/* Logo 与主标题 */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Compass size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">WordQuest</h1>
              <p className="text-xs font-semibold text-indigo-600 tracking-wider">英语词汇学习</p>
            </div>
          </Link>

          {/* 导航菜单项 */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
        </div>

        {/* 底部学生信息卡与快捷切号入口 */}
        <div className="flex flex-col gap-2">
          <div
            onClick={() => setIsSwitcherOpen(true)}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-100 hover:border-indigo-100 flex items-center justify-between cursor-pointer transition-all group active:scale-98"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {currentUser?.realName.slice(0, 1) || '学'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                  {currentUser?.realName || '张同学'}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">点击快速换号</p>
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
      </aside>

      {/* 手机/iPad竖屏顶栏快捷换号条 */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
          <span className="font-black text-slate-900 tracking-tight text-base">WordQuest</span>
        </Link>

        <button
          onClick={() => setIsSwitcherOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-700 text-xs font-bold transition-colors"
        >
          <Users size={14} className="text-indigo-600" />
          <span>{currentUser?.realName || '切换账号'}</span>
        </button>
      </div>

      {/* 弹窗 */}
      <ProfileSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        onProfileChanged={(u) => setCurrentUser(u)}
      />
    </>
  );
};
