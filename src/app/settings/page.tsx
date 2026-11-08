'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DIFFICULTY_CONFIGS, DifficultyTier } from '../../config/gamification';
import { COPYWRITING } from '../../config/copywriting';
import { parseCSV, guessFieldMapping, buildImportPreview, ImportAnalysisResult } from '../../lib/importer/FileDecoder';
import { SoundService } from '../../lib/audio/SoundService';
import { User, Volume2, ShieldAlert, Upload, Download, RotateCcw, Check, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [studentName, setStudentName] = useState('');
  const [speechRate, setSpeechRate] = useState(0.85);
  const [difficulty, setDifficulty] = useState<DifficultyTier>('regular');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 词库导入状态
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysisResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // 重置弹窗
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [detectedVoice, setDetectedVoice] = useState<string>('正在检测最佳音色...');

  useEffect(() => {
    fetchSettings();
    SoundService.selectBestVoice().then((v) => {
      if (v) setDetectedVoice(v.name);
      else setDetectedVoice('系统默认语音');
    });
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings').then((r) => r.json());
      if (res.success && res.data) {
        setSettings(res.data);
        setStudentName(res.data.studentName || '');
        setSpeechRate(res.data.speechRate || 0.85);
        setDifficulty(res.data.difficulty || 'regular');
      }
    } catch (err) {
      console.error('Fetch settings failed:', err);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          speechRate,
          difficulty,
        }),
      }).then((r) => r.json());

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save settings failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // CSV 文件解析
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportSuccessMsg('');
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const { headers, rows } = parseCSV(text);

        if (rows.length === 0) {
          alert('文件为空或无法解析有效行！');
          return;
        }

        // 获取现有单词集合用于查重
        const existingWordsRes = await fetch('/api/words?all=true').then((r) => r.json());
        const existingWordSet = new Set<string>(
          (existingWordsRes.data || []).map((w: any) => w.word.toLowerCase())
        );

        const mapping = guessFieldMapping(headers);
        const analysis = buildImportPreview(rows, mapping, existingWordSet);
        setImportAnalysis(analysis);
      } catch (err) {
        console.error('File parse error:', err);
        alert('文件解析失败，请检查格式！');
      }
    };

    reader.readAsText(file, 'utf-8');
  };

  // 确认导入入库
  const handleConfirmImport = async () => {
    if (!importAnalysis) return;
    setIsImporting(true);

    try {
      const payloadWords = importAnalysis.previewRows
        .filter((r) => !r.isDuplicate)
        .map((r) => ({
          word: r.word,
          phonetic: r.phonetic,
          meaning: r.meaning,
          pos: r.pos,
          example: r.example,
          translation: r.translation,
        }));

      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: payloadWords }),
      }).then((r) => r.json());

      if (res.success) {
        setImportSuccessMsg(
          `成功导入 ${res.data.added} 个新单词！(跳过 ${res.data.skipped} 个重复词)`
        );
        setImportAnalysis(null);
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('导入失败，请重试！');
    } finally {
      setIsImporting(false);
    }
  };

  // 重置进度
  const handleResetProgress = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' }).then((r) => r.json());
      if (res.success) {
        setShowResetModal(false);
        alert('学习进度已重置，已保留词库！');
        fetchSettings();
      }
    } catch (err) {
      alert('重置失败！');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {COPYWRITING.settings.title}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          个性化定制你的学习节奏、词库管理与数据安全
        </p>
      </div>

      {/* 1. 个人档案与学习档位 */}
      <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <User className="text-indigo-600" size={20} />
          <h2 className="text-lg font-bold text-slate-900">{COPYWRITING.settings.studentProfile}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {COPYWRITING.settings.studentName}
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>发音语速 ({speechRate}x)</span>
              <button
                type="button"
                onClick={() => SoundService.speak('Welcome to WordQuest', speechRate)}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                试听效果
              </button>
            </label>
            <input
              type="range"
              min="0.6"
              max="1.2"
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 truncate">
              音色: <span className="font-semibold text-indigo-600">{detectedVoice}</span>
            </p>
          </div>
        </div>

        {/* 学习档位（仅限三档） */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">
            {COPYWRITING.settings.difficultyTitle}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['novice', 'regular', 'master'] as DifficultyTier[]).map((tierKey) => {
              const cfg = DIFFICULTY_CONFIGS[tierKey];
              const isSelected = difficulty === tierKey;
              return (
                <button
                  key={tierKey}
                  type="button"
                  onClick={() => setDifficulty(tierKey)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-slate-900 text-base">{cfg.label}</span>
                    <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                      +{cfg.dailyBonusPoints}分
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{cfg.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
              <Check size={16} /> 保存成功！
            </span>
          )}
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? '正在保存...' : '保存偏好设置'}
          </Button>
        </div>
      </Card>

      {/* 2. 词库导入管理 */}
      <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Upload className="text-indigo-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">{COPYWRITING.settings.importTitle}</h2>
          </div>
          <a
            href="/api/template"
            download="wordquest_template.csv"
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            下载标准 CSV 模板
          </a>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          支持 Windows 导出的 CSV 与 Excel 文件。自动支持 UTF-8、带 BOM 以及 GBK 编码防乱码。
        </p>

        {importSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
            <Check size={18} />
            <span>{importSuccessMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <label className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-100 cursor-pointer flex items-center justify-center gap-2 transition-all">
            <Upload size={18} />
            <span>{COPYWRITING.settings.importBtn}</span>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* 导入预览与字段确认 */}
        {importAnalysis && (
          <div className="mt-4 p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                导入预览：待导入 {importAnalysis.validCount} 词 (重复跳过 {importAnalysis.duplicateCount} 词)
              </h3>
              {importAnalysis.incompleteCount > 0 && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold flex items-center gap-1">
                  <AlertCircle size={14} />
                  <span>{importAnalysis.incompleteCount} 词缺少例句（自动降级为词义题）</span>
                </span>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2">单词</th>
                    <th className="px-3 py-2">释义</th>
                    <th className="px-3 py-2">词性</th>
                    <th className="px-3 py-2">例句</th>
                    <th className="px-3 py-2">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importAnalysis.previewRows.slice(0, 10).map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-bold text-slate-800">{row.word}</td>
                      <td className="px-3 py-2">{row.meaning}</td>
                      <td className="px-3 py-2">{row.pos || '-'}</td>
                      <td className="px-3 py-2 truncate max-w-[200px]">{row.example || '-'}</td>
                      <td className="px-3 py-2 font-semibold">
                        {row.isDuplicate ? (
                          <span className="text-slate-400">重复跳过</span>
                        ) : (
                          <span className="text-emerald-600">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setImportAnalysis(null)}>
                取消
              </Button>
              <Button onClick={handleConfirmImport} disabled={isImporting}>
                {isImporting ? '正在入库...' : '确认导入词库'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 3. 数据维护与安全 */}
      <Card className="p-6 sm:p-8 border-slate-100 flex flex-col gap-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <ShieldAlert className="text-rose-600" size={20} />
          <h2 className="text-lg font-bold text-slate-900">{COPYWRITING.settings.dataManageTitle}</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{COPYWRITING.settings.btnExport}</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              将当前的完整词库、复习阶梯与答题记录导出为本地 JSON 备份文件
            </p>
          </div>
          <a
            href="/api/backup"
            download
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <Download size={16} />
            <span>备份导出</span>
          </a>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div>
            <h4 className="font-bold text-rose-700 text-sm">{COPYWRITING.settings.btnReset}</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              重置所有复习天数、艾宾浩斯阶梯与积分，完整保留已导入词库
            </p>
          </div>
          <Button variant="danger" size="md" onClick={() => setShowResetModal(true)}>
            <RotateCcw size={16} />
            <span>重置学习记录</span>
          </Button>
        </div>
      </Card>

      {/* 重置进度确认弹窗 */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {COPYWRITING.settings.resetConfirmTitle}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              {COPYWRITING.settings.resetConfirmDesc}
            </p>
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button variant="secondary" onClick={() => setShowResetModal(false)}>
                取消
              </Button>
              <Button variant="danger" onClick={handleResetProgress} disabled={resetting}>
                {resetting ? '正在重置...' : '确认重置'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
