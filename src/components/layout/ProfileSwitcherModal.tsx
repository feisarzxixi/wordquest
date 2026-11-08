'use client';

import React, { useEffect, useState } from 'react';
import { ClientSession, UserSession } from '../../lib/auth/clientSession';
import { Users, Check, Plus, LogOut, Trash2, Shield, X } from 'lucide-react';
import Link from 'next/link';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileChanged?: (newUser: UserSession) => void;
}

export const ProfileSwitcherModal: React.FC<ProfileSwitcherModalProps> = ({
  isOpen,
  onClose,
  onProfileChanged,
}) => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [profiles, setProfiles] = useState<UserSession[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCurrentUser(ClientSession.getCurrentUser());
      setProfiles(ClientSession.getSavedProfiles());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwitch = (p: UserSession) => {
    ClientSession.setCurrentUser(p);
    setCurrentUser(p);
    if (onProfileChanged) {
      onProfileChanged(p);
    }
    onClose();
    // 刷新页面确保所有接口重新基于新学生身份拉取
    window.location.reload();
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定从本台设备移除该学生账号记录？(不会删除云端学习数据)')) {
      ClientSession.removeSavedProfile(id);
      setProfiles(ClientSession.getSavedProfiles());
      setCurrentUser(ClientSession.getCurrentUser());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">切换学习账号</h2>
              <p className="text-xs text-slate-400">已在本机登录的学生档案 (点击免密秒切)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profiles Grid */}
        <div className="p-6 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {profiles.map((p) => {
            const isActive = currentUser?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSwitch(p)}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-transform ${
                      isActive
                        ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200 scale-105'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.realName.slice(0, 1) || '学'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{p.realName}</span>
                      {isActive && (
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-full">
                          当前使用中
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">账号: {p.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isActive ? (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check size={18} strokeWidth={3} />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleRemove(e, p.id)}
                      title="从本设备移除"
                      className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add / Login New Account */}
          <Link
            href="/login"
            onClick={onClose}
            className="p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-indigo-600 font-bold text-sm flex items-center justify-center gap-2 transition-all group"
          >
            <Plus size={18} className="group-hover:scale-110 transition-transform" />
            <span>登录 / 添加新账号</span>
          </Link>
        </div>

        {/* Footer Link */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {currentUser?.role === 'admin' ? (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Shield size={14} />
              <span>进入管理员后台</span>
            </Link>
          ) : (
            <span className="text-[11px] text-slate-400">WordQuest 账号管理</span>
          )}
          <Link
            href="/login"
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 font-medium"
          >
            <LogOut size={13} />
            <span>退出当前账号</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
