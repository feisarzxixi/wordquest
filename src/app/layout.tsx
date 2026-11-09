import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileNavBar } from '../components/layout/MobileNavBar';
import { AuthRouteGuard } from '../components/auth/AuthRouteGuard';

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

        {/* 全局路由安全拦截守卫与主视窗内容区 */}
        <main className="flex-1 min-h-screen pb-24 md:pb-8 flex flex-col overflow-y-auto">
          <AuthRouteGuard>{children}</AuthRouteGuard>
        </main>

        {/* 手机端：自适应安全底部导航栏（登录页自动隐藏） */}
        <MobileNavBar />
      </body>
    </html>
  );
}
