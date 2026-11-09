'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ClientSession } from '../../lib/auth/clientSession';

export const AuthRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // 登录页直接允许放行
    if (pathname === '/login') {
      setIsAuthorized(true);
      return;
    }

    // 检查是否存在已登录用户
    const user = ClientSession.getCurrentUser();
    if (!user) {
      setIsAuthorized(false);
      router.replace('/login');
    } else {
      setIsAuthorized(true);
    }

    const handleUserChange = (e: any) => {
      const u = e.detail;
      if (!u && pathname !== '/login') {
        setIsAuthorized(false);
        router.replace('/login');
      } else {
        setIsAuthorized(true);
      }
    };

    window.addEventListener('wq_user_changed', handleUserChange);
    return () => {
      window.removeEventListener('wq_user_changed', handleUserChange);
    };
  }, [pathname, router]);

  // 如果是在受保护页面且尚未判定完毕或未授权，展示极简安全加载屏，严禁界面穿透
  if (pathname !== '/login' && isAuthorized !== true) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse mb-4">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-bold text-slate-500">安全验证中，正在跳转登录...</p>
      </div>
    );
  }

  return <>{children}</>;
};
