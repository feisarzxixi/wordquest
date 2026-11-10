'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ClientSession } from '../../lib/auth/clientSession';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const DataSyncManager: React.FC = () => {
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  const performSync = async () => {
    if (typeof window === 'undefined' || isSyncingRef.current) return;
    const currentUser = ClientSession.getCurrentUser();
    if (!currentUser || !currentUser.id) return;

    isSyncingRef.current = true;

    try {
      // 1. 扫描本地所有可能的备份快照
      const backupPlans: any[] = [];
      let clientData: any = null;

      try {
        const rawStudentData = localStorage.getItem(`wq_student_data_${currentUser.id}`);
        if (rawStudentData) {
          clientData = JSON.parse(rawStudentData);
        }
      } catch (e) {
        console.warn('Parse clientData failed:', e);
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (key.startsWith('wq_backup_plan_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const plan = JSON.parse(raw);
              if (plan && plan.date && Array.isArray(plan.batches)) {
                backupPlans.push(plan);
              }
            }
          } catch (e) {}
        }
      }

      // 2. 发起自愈同步
      const authHeaders = ClientSession.getAuthHeaders();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          clientData,
          backupPlans,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        // 更新本地持久化快照
        localStorage.setItem(`wq_student_data_${currentUser.id}`, JSON.stringify(json.data));

        if (json.restoredCount > 0) {
          setRestoredNotice(`已为您自动找回历史学习的 ${json.restoredCount} 个词汇与学习进度！🎉`);
          setTimeout(() => setRestoredNotice(null), 6000);
        }

        // 通知全站页面刷新
        window.dispatchEvent(new CustomEvent('wq_data_synced', { detail: json.data }));
      }
    } catch (err) {
      console.warn('Sync student data failed:', err);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    // 首次加载立即执行智能自愈恢复
    performSync();

    // 监听学习页或其他页面的同步需求
    const handleSyncRequest = () => performSync();
    window.addEventListener('wq_sync_needed', handleSyncRequest);
    window.addEventListener('wq_user_changed', handleSyncRequest);

    return () => {
      window.removeEventListener('wq_sync_needed', handleSyncRequest);
      window.removeEventListener('wq_user_changed', handleSyncRequest);
    };
  }, []);

  if (!restoredNotice) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-600/30 text-xs sm:text-sm font-bold border border-emerald-400">
        <Sparkles size={16} className="text-amber-300 shrink-0 animate-spin" />
        <span>{restoredNotice}</span>
      </div>
    </div>
  );
};
