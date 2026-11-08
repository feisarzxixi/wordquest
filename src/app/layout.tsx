import React from 'react';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { Home, BookOpen, Compass, BarChart3, Settings } from 'lucide-react';
import { AppSidebar } from '../components/layout/AppSidebar';

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

const mobileNavItems = [
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
        {/* iPad 横屏与桌面端导航组件 */}
        <AppSidebar />

        {/* 主视窗内容区 */}
        <main className="flex-1 min-h-screen pb-24 md:pb-8 flex flex-col overflow-y-auto">
          {children}
        </main>

        {/* 手机端：底部导航栏 */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-2 z-50">
          {mobileNavItems.map((item) => {
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
