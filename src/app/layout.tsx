import React from 'react';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { Home, BookOpen, Compass, BarChart3, Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'WordQuest - 英语单词探索与学习系统',
  description: '专为中学生打造的极简、高效无 AI 英语单词学习 Web 应用',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/study', label: '学习', icon: Compass },
  { href: '/words', label: '我的单词', icon: BookOpen },
  { href: '/statistics', label: '学习统计', icon: BarChart3 },
  { href: '/settings', label: '设置', icon: Settings },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full bg-slate-50">
      <body className="h-full flex flex-col md:flex-row text-slate-900 antialiased overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900 font-sans">
        {/* iPad 横屏与桌面端：左侧极简导航栏 */}
        <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-100 p-6 shrink-0 h-screen sticky top-0 justify-between select-none">
          <div className="flex flex-col gap-8">
            {/* Logo 与主标题 */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Compass size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  WordQuest
                </h1>
                <p className="text-xs font-semibold text-indigo-600 tracking-wider">
                  英语词汇学习
                </p>
              </div>
            </Link>

            {/* 导航菜单项 */}
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 active:scale-98 transition-all"
                  >
                    <Icon size={20} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 底部学生信息卡 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              学
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">中学生词汇探索</p>
              <p className="text-xs text-slate-400">WordQuest V1.0</p>
            </div>
          </div>
        </aside>

        {/* 主视窗内容区 */}
        <main className="flex-1 min-h-screen pb-24 md:pb-8 flex flex-col overflow-y-auto">
          {children}
        </main>

        {/* 手机端：底部导航栏 */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-2 z-50">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center w-14 h-full text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium mt-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </body>
    </html>
  );
}
