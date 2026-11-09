'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Compass, BarChart3, Settings } from 'lucide-react';
import { ClientSession } from '../../lib/auth/clientSession';

const mobileNavItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/study', label: '学习', icon: Compass },
  { href: '/words', label: '我的单词', icon: BookOpen },
  { href: '/statistics', label: '学习统计', icon: BarChart3 },
  { href: '/settings', label: '设置', icon: Settings },
];

export const MobileNavBar: React.FC = () => {
  const pathname = usePathname();

  // 处于登录页面或未登录状态时，严禁展示业务底栏，彻底防止绕过鉴权
  if (pathname === '/login') {
    return null;
  }

  const isLoggedIn = ClientSession.hasLoggedInUser();
  if (!isLoggedIn) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-2 z-50">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
