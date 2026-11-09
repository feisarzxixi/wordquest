'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { parseCSV, parseExcelBuffer, guessFieldMapping, buildImportPreview, ImportAnalysisResult } from '../../lib/importer/FileDecoder';
import { ClientSession } from '../../lib/auth/clientSession';
import {
  Shield,
  Users,
  BarChart3,
  BookOpen,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  KeyRound,
  RotateCcw,
  Upload,
  Download,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminInputPass, setAdminInputPass] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'students' | 'analytics' | 'vocab'>('students');

  // 数据状态
  const [users, setUsers] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 新增学生弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStuName, setNewStuName] = useState('');
  const [newStuUsername, setNewStuUsername] = useState('');
  const [newStuPass, setNewStuPass] = useState('123');

  // 修改密码弹窗
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // 词库导入状态
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysisResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // 检查管理员鉴权 (支持直接登录与 Session 维持)
  useEffect(() => {
    const auth = sessionStorage.getItem('wq_admin_auth');
    const user = ClientSession.getCurrentUser();
    if (auth === 'true' || user?.role === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('wq_admin_auth', 'true');
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminInputPass.trim().toLowerCase() === 'admin') {
      sessionStorage.setItem('wq_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      fetchAdminData();
    } else {
      setAuthError('管理员密码错误 (初始密码为 admin)');
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users').then((r) => r.json()),
        fetch('/api/admin/stats').then((r) => r.json()),
      ]);

      if (usersRes.success) setUsers(usersRes.data || []);
      if (statsRes.success) setStatsData(statsRes.data || null);
    } catch (err) {
      console.error('Fetch admin data failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // 操作学生账号
  const handleUserAction = async (action: string, payload: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      }).then((r) => r.json());

      if (res.success) {
        alert(res.message || '操作成功！');
        fetchAdminData();
      } else {
        alert(res.error || '操作失败');
      }
    } catch (err) {
      alert('请求发生错误');
    }
  };

  // Excel / CSV 文件解析
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportSuccessMsg('');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        let headers: string[] = [];
        let rows: any[] = [];

        if (isExcel) {
          const buffer = evt.target?.result as ArrayBuffer;
          const parsed = parseExcelBuffer(buffer);
          headers = parsed.headers;
          rows = parsed.rows;
        } else {
          const text = evt.target?.result as string;
          const parsed = parseCSV(text);
          headers = parsed.headers;
          rows = parsed.rows;
        }

        if (rows.length === 0) {
          alert('文件为空或无法解析有效行！');
          return;
        }

        const existingWordsRes = await fetch('/api/words?all=true').then((r) => r.json());
        const existingWordSet = new Set<string>(
          (existingWordsRes.data || []).map((w: any) => w.word.toLowerCase())
        );

        const mapping = guessFieldMapping(headers);
        const analysis = buildImportPreview(rows, mapping, existingWordSet);
        setImportAnalysis(analysis);
      } catch (err) {
        alert('文件解析失败，请检查文件格式');
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'utf-8');
    }
  };

  // 确认导入词库入库
  const handleConfirmImport = async () => {
    if (!importAnalysis) return;
    setIsImporting(true);

    try {
      const rowsToImport =
        importMode === 'replace'
          ? importAnalysis.previewRows
          : importAnalysis.previewRows.filter((r) => !r.isDuplicate);

      const payloadWords = rowsToImport.map((r) => ({
        word: r.word,
        phonetic: r.phonetic,
        meaning: r.meaning,
        pos: r.pos,
        example: r.example,
        translation: r.translation,
        image: r.image || undefined,
      }));

      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' },
        body: JSON.stringify({ words: payloadWords, mode: importMode }),
      }).then((r) => r.json());

      if (res.success) {
        if (importMode === 'replace') {
          setImportSuccessMsg(
            `词库已完全覆盖重排！当前词库共 ${res.data.total} 个词汇，已重置学习排期，全员将严格按 Excel 表格顺序从前到后开始学习！`
          );
        } else {
          setImportSuccessMsg(
            `成功增量导入 ${res.data.added} 个新词！(自动跳过 ${res.data.skipped} 个已有重复词)`
          );
        }
        setImportAnalysis(null);
        fetchAdminData();
      } else {
        alert(res.error || '导入入库失败');
      }
    } catch (err) {
      alert('导入入库失败');
    } finally {
      setIsImporting(false);
    }
  };

  // 1. 如果尚未认证，展示管理员密码门禁
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-8 flex flex-col gap-5 border-slate-100 shadow-xl shadow-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">WordQuest 管理后台</h1>
              <p className="text-xs text-slate-400">请输入管理员密码验证身份</p>
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminVerify} className="flex flex-col gap-4">
            <input
              type="password"
              autoFocus
              placeholder="管理员密码 (默认: admin)"
              value={adminInputPass}
              onChange={(e) => setAdminInputPass(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600"
            />
            <Button type="submit" className="w-full py-3">
              进入管理控制台
            </Button>
          </form>

          <Link
            href="/"
            className="text-center text-xs text-slate-400 hover:text-indigo-600 font-medium"
          >
            ← 返回学生端学习首页
          </Link>
        </Card>
      </div>
    );
  }

  const pendingStudents = users.filter((u) => u.status === 'pending');
  const approvedStudents = users.filter((u) => u.role === 'student' && u.status === 'approved');

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10 flex flex-col gap-8">
      {/* 顶部标题与控制台导航 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Shield size={20} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">管理员控制中心</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            学生账号审核、全员学情监控、词库批量导入与数据安全维护
          </p>
        </div>

        {/* 顶部选项卡 */}
        <div className="flex rounded-2xl bg-slate-100 p-1.5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'students'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users size={16} />
            <span>学生管理</span>
            {pendingStudents.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black">
                {pendingStudents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'analytics'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={16} />
            <span>学情大盘</span>
          </button>

          <button
            onClick={() => setActiveTab('vocab')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'vocab'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen size={16} />
            <span>词库中心</span>
          </button>
        </div>
      </div>

      {/* 待审核学生提示横幅 */}
      {pendingStudents.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Clock size={20} />
            </div>
            <div>
              <p className="font-bold text-amber-950 text-sm">
                当前有 {pendingStudents.length} 位新学生等待注册审批
              </p>
              <p className="text-xs text-amber-700">同意通过后，学生即可在 iPad 上正常登录背词</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('students')}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shadow-sm"
          >
            立即前往审批 →
          </button>
        </div>
      )}

      {/* TAB 1: 学生管理与审核 */}
      {activeTab === 'students' && (
        <div className="flex flex-col gap-6">
          {/* 1.1 待审核列表 */}
          {pendingStudents.length > 0 && (
            <Card className="p-6 border-amber-200 bg-amber-50/30 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <UserCheck className="text-amber-600" size={18} />
                  <h3 className="font-bold text-amber-950 text-sm">
                    待审批学生注册申请 ({pendingStudents.length})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingStudents.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{p.realName}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        账号: {p.username} · 申请于 {p.createdAt.slice(0, 10)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUserAction('approve', { userId: p.id })}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Check size={14} />
                        <span>同意开通</span>
                      </button>
                      <button
                        onClick={() => handleUserAction('reject', { userId: p.id })}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold transition-all"
                      >
                        驳回
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 1.2 正式学生花名册 */}
          <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">学生花名册 ({approvedStudents.length})</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  可管理密码、单独重置学习进度，或直接新建学生账号
                </p>
              </div>

              <Button
                onClick={() => setShowAddModal(true)}
                className="py-2.5 px-4 text-xs flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span>直接新增学生</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedStudents.map((s) => (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {s.realName.slice(0, 1) || '学'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base">{s.realName}</h4>
                        <p className="text-xs text-slate-400 font-mono">账号: {s.username}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      正常
                    </span>
                  </div>

                  {/* 简要数据卡 */}
                  <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-50 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">打卡</p>
                      <p className="text-xs font-black text-slate-800">
                        🔥 {s.stats?.streakDays ?? 0}天
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">积分</p>
                      <p className="text-xs font-black text-indigo-600">
                        🏆 {s.stats?.totalPoints ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">掌握</p>
                      <p className="text-xs font-black text-emerald-600">
                        {s.stats?.masteredCount ?? 0}词
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">今日学时</p>
                      <p className="text-xs font-black text-blue-600">
                        ⏱️ {s.stats?.todayStudyMinutes ?? 0}m
                      </p>
                    </div>
                  </div>

                  {/* 管理按钮组 */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingUserId(s.id);
                          setNewPasswordVal('');
                        }}
                        className="text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1"
                      >
                        <KeyRound size={13} />
                        <span>改密</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`确定要重置学生【${s.realName}】的学习进度和艾宾浩斯复习记忆吗？此操作无法撤销。`)) {
                            handleUserAction('resetProgress', { userId: s.id });
                          }
                        }}
                        className="text-slate-500 hover:text-amber-600 font-semibold flex items-center gap-1"
                      >
                        <RotateCcw size={13} />
                        <span>清空进度</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`确定要彻底删除学生【${s.realName}】账号及其所有数据吗？`)) {
                          handleUserAction('delete', { userId: s.id });
                        }
                      }}
                      className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                      title="删除账号"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: 全员学情监控大盘 */}
      {activeTab === 'analytics' && statsData && (
        <div className="flex flex-col gap-6">
          {/* 五大核心大盘指标 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-4 border-slate-100 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400">词库总规模</span>
              <span className="text-xl font-black text-slate-900">
                {statsData.overview.totalWords} <span className="text-[10px] font-normal text-slate-400">词</span>
              </span>
            </Card>

            <Card className="p-4 border-slate-100 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400">注册学生</span>
              <span className="text-xl font-black text-indigo-600">
                {statsData.overview.totalStudents} <span className="text-[10px] font-normal text-slate-400">人</span>
              </span>
            </Card>

            <Card className="p-4 border-slate-100 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400">今日打卡</span>
              <span className="text-xl font-black text-emerald-600">
                {statsData.overview.activeToday} <span className="text-[10px] font-normal text-slate-400">人</span>
              </span>
            </Card>

            <Card className="p-4 border-indigo-100 bg-indigo-50/40 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-indigo-700">今日全员学时</span>
              <span className="text-xl font-black text-indigo-900">
                {statsData.overview.totalStudyMinutesToday ?? 0} <span className="text-[10px] font-normal text-indigo-500">分钟</span>
              </span>
            </Card>

            <Card className="p-4 border-slate-100 flex flex-col gap-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-slate-400">待审批申请</span>
              <span className="text-xl font-black text-amber-600">
                {statsData.overview.pendingCount} <span className="text-[10px] font-normal text-slate-400">条</span>
              </span>
            </Card>
          </div>

          {/* 各学生学情透视列表 */}
          <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-4">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">学生专属学情成长监控</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                实时追踪每位学生的背词生熟度、做题正确率与错题集
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {statsData.students.map((stu: any) => (
                <div
                  key={stu.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">
                      {stu.realName.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-base">{stu.realName}</span>
                        {stu.todayCompleted ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            今日已打卡
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            今日未完成
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">账号: {stu.username}</p>
                    </div>
                  </div>

                  {/* 熟练度漏斗条 */}
                  <div className="flex-1 w-full flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">
                        掌握: <strong className="text-emerald-600">{stu.masteredCount}</strong> 词 · 学习中:{' '}
                        <strong className="text-amber-600">{stu.learningCount}</strong> 词
                      </span>
                      <span className="text-indigo-600">答题正确率: {stu.accuracyRate}%</span>
                    </div>

                    {/* 双色进度条 */}
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${stu.learnedCount > 0 ? (stu.masteredCount / stu.learnedCount) * 100 : 0}%`,
                        }}
                        className="h-full bg-emerald-500 transition-all duration-500"
                        title="已掌握"
                      />
                      <div
                        style={{
                          width: `${stu.learnedCount > 0 ? (stu.learningCount / stu.learnedCount) * 100 : 0}%`,
                        }}
                        className="h-full bg-amber-400 transition-all duration-500"
                        title="学习中"
                      />
                    </div>
                  </div>

                  {/* 近 7 天学习时间分布 (迷你柱状图) */}
                  <div className="flex flex-col gap-1.5 min-w-[190px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold flex items-center gap-1">
                        <Clock size={13} className="text-indigo-600" />
                        <span>近7天每日时长</span>
                      </span>
                      <span className="font-extrabold text-blue-600">
                        今日: {stu.todayStudyMinutes || 0}m
                      </span>
                    </div>

                    <div className="flex items-end gap-1.5 h-12 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                      {(stu.recent7DaysTime || []).map((d: any, i: number) => {
                        const isToday = i === (stu.recent7DaysTime || []).length - 1;
                        const h = Math.min(100, Math.max(12, Math.round(((d.minutes || 0) / 30) * 100)));
                        return (
                          <div
                            key={d.date}
                            className="flex-1 flex flex-col items-center justify-end h-full group"
                            title={`${d.weekday} (${d.label}): ${d.minutes}分钟`}
                          >
                            <div
                              className={`w-full rounded-md transition-all ${
                                isToday
                                  ? 'bg-gradient-to-t from-indigo-600 to-purple-600'
                                  : d.minutes > 0
                                  ? 'bg-indigo-300 group-hover:bg-indigo-400'
                                  : 'bg-slate-200'
                              }`}
                              style={{ height: `${h}%` }}
                            />
                            <span className="text-[8px] text-slate-400 mt-0.5 font-medium">
                              {d.weekday === '今天' ? '今' : d.weekday.slice(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 高频错词标签 */}
                  <div className="min-w-[220px] flex flex-col gap-1 text-xs">
                    <span className="text-slate-400 font-semibold">顽固错词 Top 3:</span>
                    {stu.topWrongs && stu.topWrongs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {stu.topWrongs.slice(0, 3).map((w: any) => (
                          <span
                            key={w.word}
                            className="px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 font-bold text-[11px]"
                          >
                            {w.word} ({w.wrong}错)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">暂无明显错题</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: 词库中心与批量导入 (仅管理员可见) */}
      {activeTab === 'vocab' && (
        <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Upload className="text-indigo-600" size={20} />
              <h2 className="text-lg font-bold text-slate-900">公共词库维护与批量导入</h2>
            </div>
            <a
              href="/api/template"
              download="wordquest_template.csv"
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Download size={14} />
              <span>下载标准 CSV 模板</span>
            </a>
          </div>

          <p className="text-sm text-slate-500 leading-relaxed">
            此处导入的词汇将作为所有学生的公共题库。支持包含例句、词性、中文、短语的 CSV 格式，自动识别编码防乱码，并自动查重跳过已有词汇。
          </p>

          {importSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
              <Check size={18} />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {/* iOS 友好型文件选择器 */}
          <div className="relative inline-block">
            <label className="relative px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 cursor-pointer flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200">
              <Upload size={18} />
              <span>选择 Excel (.xlsx / .xls) 或 CSV 文件导入题库</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileUpload}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>

          {/* 导入预览与字段确认 */}
          {importAnalysis && (
            <div className="mt-4 p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-slate-800 text-sm">
                  解析完成：文件内共 {importAnalysis.previewRows.length} 行数据
                </h3>

                {/* 导入模式切换器 */}
                <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      importMode === 'replace'
                        ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ 完全替换并重新排序 (覆盖旧词库)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      importMode === 'append'
                        ? 'bg-white text-indigo-600 shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ➕ 增量追加 (保留旧词)
                  </button>
                </div>
              </div>

              {/* 模式说明条 */}
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  importMode === 'replace'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
                }`}
              >
                <AlertCircle size={15} className="shrink-0" />
                {importMode === 'replace' ? (
                  <span>
                    <strong>【完全替换模式】</strong> 将清空原有词库顺序，完全按照您本次 Excel 文件<strong>自上而下的行号顺序</strong>重新建立学习计划！保留已有旧词的学习掌握度。
                  </span>
                ) : (
                  <span>
                    <strong>【增量追加模式】</strong> 仅添加新词（待入库 {importAnalysis.validCount} 词），自动跳过已有重复词（跳过 {importAnalysis.duplicateCount} 词）。
                  </span>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-bold">
                    <tr>
                      <th className="p-2.5">序号</th>
                      <th className="p-2.5">单词/短语</th>
                      <th className="p-2.5">词性</th>
                      <th className="p-2.5">中文释义</th>
                      <th className="p-2.5">例句</th>
                      <th className="p-2.5">配图</th>
                      <th className="p-2.5">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importAnalysis.previewRows.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className={importMode === 'append' && row.isDuplicate ? 'bg-slate-50/60 text-slate-400' : ''}>
                        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-900">{row.word}</td>
                        <td className="p-2.5">{row.pos || '-'}</td>
                        <td className="p-2.5">{row.meaning}</td>
                        <td className="p-2.5 truncate max-w-xs">{row.example || '-'}</td>
                        <td className="p-2.5 text-slate-500 font-mono text-[11px] truncate max-w-[100px]">
                          {row.image || `${row.word}.jpg`}
                        </td>
                        <td className="p-2.5">
                          {importMode === 'replace' ? (
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                              第 {idx + 1} 顺位
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                              重复跳过
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                              待入库
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setImportAnalysis(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-200"
                >
                  取消
                </button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className={importMode === 'replace' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}
                >
                  {isImporting
                    ? '正在入库...'
                    : importMode === 'replace'
                    ? `确认按表格顺序完全替换词库 (${importAnalysis.previewRows.length} 词)`
                    : `确认增量导入 ${importAnalysis.validCount} 个新词`}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 新增学生模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 text-base">直接创建新学生账号</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">学生真实姓名</label>
              <input
                type="text"
                required
                placeholder="例如: 李小华"
                value={newStuName}
                onChange={(e) => setNewStuName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">登录账号 (拼音/英文)</label>
              <input
                type="text"
                required
                placeholder="例如: lixiaohua"
                value={newStuUsername}
                onChange={(e) => setNewStuUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">初始密码</label>
              <input
                type="text"
                required
                value={newStuPass}
                onChange={(e) => setNewStuPass(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100"
              >
                取消
              </button>
              <Button
                onClick={() => {
                  handleUserAction('add', {
                    realName: newStuName,
                    username: newStuUsername,
                    password: newStuPass,
                  });
                  setShowAddModal(false);
                }}
              >
                确定开通
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码模态框 */}
      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 text-base">重置学生登录密码</h3>
            <input
              type="text"
              autoFocus
              placeholder="输入新密码"
              value={newPasswordVal}
              onChange={(e) => setNewPasswordVal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingUserId(null)}
                className="px-4 py-2 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100"
              >
                取消
              </button>
              <Button
                onClick={() => {
                  if (newPasswordVal.trim()) {
                    handleUserAction('resetPassword', {
                      userId: editingUserId,
                      password: newPasswordVal,
                    });
                    setEditingUserId(null);
                  }
                }}
              >
                保存新密码
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
