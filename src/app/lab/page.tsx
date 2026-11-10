'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '../../components/ui/Card';
import {
  CATEGORY_DEFINITIONS,
  WorkbookActivity,
  ActivityCategory,
  ActivityItem,
} from '../../lib/curriculum/types';
import { SAMPLE_WORKBOOK_ACTIVITIES } from '../../lib/curriculum/sampleActivities';
import {
  Sparkles,
  ArrowLeft,
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Eye,
  Lightbulb,
  BookOpen,
} from 'lucide-react';

export default function LabPage() {
  const [activeActivityIndex, setActiveActivityIndex] = useState(0);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('tablet');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [highlightEvidence, setHighlightEvidence] = useState<string | null>(null);
  const [orderedTokens, setOrderedTokens] = useState<Record<string, string[]>>({});

  const currentActivity = SAMPLE_WORKBOOK_ACTIVITIES[activeActivityIndex];
  const catDef = CATEGORY_DEFINITIONS[currentActivity.category];

  const handleInputChange = (itemId: string, val: string) => {
    setUserAnswers((prev) => ({ ...prev, [itemId]: val }));
    setSubmitted((prev) => ({ ...prev, [itemId]: false }));
  };

  const handleTokenClick = (itemId: string, token: string) => {
    setOrderedTokens((prev) => {
      const current = prev[itemId] || [];
      if (current.includes(token)) {
        return { ...prev, [itemId]: current.filter((t) => t !== token) };
      } else {
        const next = [...current, token];
        setUserAnswers((uPrev) => ({ ...uPrev, [itemId]: next.join(' ') }));
        return { ...prev, [itemId]: next };
      }
    });
  };

  const handleCheckItem = (itemId: string) => {
    setSubmitted((prev) => ({ ...prev, [itemId]: true }));
  };

  const handleReset = () => {
    setUserAnswers({});
    setSubmitted({});
    setShowAnswers(false);
    setHighlightEvidence(null);
    setOrderedTokens({});
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none pb-16">
      {/* 顶部控制栏 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="返回首页"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                WordQuest 2.0 · 题型实验室
              </span>
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                第一阶段沙盒
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Cambridge Global English 7 Workbook 全题型交互原型与触控手感测试
            </p>
          </div>
        </div>

        {/* 屏幕宽度模拟切换 */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 gap-1">
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              deviceMode === 'mobile'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'hover:text-slate-900'
            }`}
          >
            <Smartphone size={14} />
            <span>手机 (390px)</span>
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              deviceMode === 'tablet'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'hover:text-slate-900'
            }`}
          >
            <Tablet size={14} />
            <span>iPad (768px)</span>
          </button>
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              deviceMode === 'desktop'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'hover:text-slate-900'
            }`}
          >
            <Monitor size={14} />
            <span>全屏</span>
          </button>
        </div>
      </header>

      {/* 题型选择导航栏 */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto flex items-center gap-2">
        <span className="text-xs font-extrabold text-slate-400 shrink-0 uppercase tracking-wider mr-1">
          首批实验样题:
        </span>
        {SAMPLE_WORKBOOK_ACTIVITIES.map((act, idx) => {
          const isSelected = idx === activeActivityIndex;
          const def = CATEGORY_DEFINITIONS[act.category];
          return (
            <button
              key={act.id}
              onClick={() => {
                setActiveActivityIndex(idx);
                handleReset();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {act.category}
              </span>
              <span>{def.name}</span>
              <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                U{act.unit} p.{act.page}
              </span>
            </button>
          );
        })}
      </div>

      {/* 核心实验视窗画布 */}
      <main className="flex-1 flex flex-col items-center p-4 sm:p-8">
        <div
          className={`w-full transition-all duration-300 ${
            deviceMode === 'mobile'
              ? 'max-w-[390px] shadow-2xl border-4 border-slate-800 rounded-[40px] bg-white overflow-hidden p-4 my-2'
              : deviceMode === 'tablet'
              ? 'max-w-[768px] shadow-xl border-4 border-slate-400 rounded-3xl bg-white p-6 my-2'
              : 'max-w-4xl'
          }`}
        >
          {/* 活动题卡头部 */}
          <div className="mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-lg border ${catDef.badgeColor}`}
                >
                  题型 {currentActivity.category} · {catDef.name}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Unit {currentActivity.unit} · {currentActivity.lesson} (p.{currentActivity.page})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 text-xs flex items-center gap-1 font-bold"
                  title="重置作答"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">重置</span>
                </button>
                <button
                  onClick={() => setShowAnswers(!showAnswers)}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-bold transition-colors ${
                    showAnswers
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title="切换参考答案"
                >
                  <Eye size={14} />
                  <span className="hidden sm:inline">{showAnswers ? '隐藏答案' : '答案'}</span>
                </button>
              </div>
            </div>

            {/* 原题英文指令与中文提示 */}
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              {currentActivity.instruction}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              {currentActivity.instructionZh}
            </p>

            {currentActivity.grammarFocus && (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100">
                <Lightbulb size={14} className="shrink-0 text-amber-500" />
                <span>核心语法考点: {currentActivity.grammarFocus}</span>
              </div>
            )}
          </div>

          {/* 若有长文章/完形段落 (Category D / I) */}
          {currentActivity.passage && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 leading-relaxed text-sm sm:text-base text-slate-800 font-serif">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-800 uppercase tracking-wider mb-2 font-sans">
                <BookOpen size={14} />
                <span>Text / Passage 文本材料:</span>
              </div>
              <div className="whitespace-pre-line leading-loose">
                {currentActivity.passage.split('\n').map((line, lIdx) => (
                  <p key={lIdx} className="mb-2">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* 题目小问集合 */}
          <div className="space-y-4">
            {currentActivity.items.map((item, idx) => {
              const userVal = userAnswers[item.id] || '';
              const isChecked = submitted[item.id];
              const isCorrect =
                userVal.trim().toLowerCase() ===
                (typeof item.correctAnswer === 'string'
                  ? item.correctAnswer.toLowerCase()
                  : item.correctAnswer[0].toLowerCase());

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isChecked
                      ? isCorrect
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-rose-300 bg-rose-50/40'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-extrabold text-slate-400">
                      第 {idx + 1} 题 ({item.id})
                    </span>
                    {isChecked && (
                      <span
                        className={`text-xs font-black flex items-center gap-1 ${
                          isCorrect ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 size={14} /> 回答正确
                          </>
                        ) : (
                          <>
                            <XCircle size={14} /> 需复查修正
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {/* 针对题型 F：可拖拽词块排序交互原型 */}
                  {currentActivity.category === 'F' && item.tokens && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500">
                        点击下方磁贴词块，按正确语序组成完整句子：
                      </p>
                      {/* 已选序列槽 */}
                      <div className="min-h-[48px] p-2 rounded-xl bg-white border-2 border-dashed border-indigo-200 flex flex-wrap items-center gap-1.5">
                        {(orderedTokens[item.id] || []).length === 0 ? (
                          <span className="text-xs text-slate-300 italic px-2">
                            点击词块将其放入此处...
                          </span>
                        ) : (
                          orderedTokens[item.id].map((tk, tIdx) => (
                            <span
                              key={tIdx}
                              onClick={() => handleTokenClick(item.id, tk)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-black text-xs sm:text-sm cursor-pointer shadow-sm hover:bg-indigo-700 transition-colors"
                            >
                              {tk}
                            </span>
                          ))
                        )}
                      </div>

                      {/* 备选词块库 */}
                      <div className="flex flex-wrap items-center gap-2">
                        {item.tokens.map((tk, tIdx) => {
                          const isUsed = (orderedTokens[item.id] || []).includes(tk);
                          return (
                            <button
                              key={tIdx}
                              disabled={isUsed}
                              onClick={() => handleTokenClick(item.id, tk)}
                              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black border transition-all ${
                                isUsed
                                  ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                  : 'bg-white text-slate-800 border-slate-300 shadow-sm hover:border-indigo-500 hover:text-indigo-600 active:scale-95'
                              }`}
                            >
                              {tk}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 针对常规填空 (E / C / I / B) */}
                  {currentActivity.category !== 'F' && (
                    <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base text-slate-900 font-medium">
                      {item.prompt && <span className="font-bold mr-1">{item.prompt}</span>}
                      {item.contextPrefix && <span>{item.contextPrefix}</span>}
                      <input
                        type="text"
                        value={userVal}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                        placeholder="在此作答"
                        className={`px-3 py-1.5 rounded-xl border-2 font-bold text-sm sm:text-base outline-none transition-all w-32 text-center ${
                          isChecked
                            ? isCorrect
                              ? 'border-emerald-500 bg-white text-emerald-800'
                              : 'border-rose-500 bg-white text-rose-800'
                            : 'border-slate-300 focus:border-indigo-600 bg-white'
                        }`}
                      />
                      {item.contextSuffix && <span>{item.contextSuffix}</span>}
                      {item.rawSentenceWithMistake && (
                        <div className="w-full text-sm font-serif p-2 rounded-xl bg-slate-100 text-slate-700 my-1">
                          原句: {item.rawSentenceWithMistake} (错词:
                          <span className="line-through text-rose-600 font-bold ml-1">
                            {item.mistakeWord}
                          </span>
                          )
                        </div>
                      )}
                    </div>
                  )}

                  {/* 检查与反馈条 */}
                  <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100/60">
                    <button
                      onClick={() => handleCheckItem(item.id)}
                      className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors shadow-sm"
                    >
                      提交校验
                    </button>

                    {item.evidenceAnchor && (
                      <button
                        onClick={() =>
                          setHighlightEvidence(
                            highlightEvidence === item.evidenceAnchor ? null : (item.evidenceAnchor || null)
                          )
                        }
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        {highlightEvidence === item.evidenceAnchor ? '收起证据' : '查看原书证据'}
                      </button>
                    )}
                  </div>

                  {/* 证据显示 */}
                  {highlightEvidence === item.evidenceAnchor && item.evidenceAnchor && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-xs font-bold text-amber-900 animate-in fade-in duration-200">
                      🔍 原文证据定位: “{item.evidenceAnchor}”
                    </div>
                  )}

                  {/* 错因反馈与规则提示 */}
                  {isChecked && !isCorrect && item.grammarRuleHint && (
                    <div className="mt-2.5 p-3 rounded-xl bg-rose-100/80 border border-rose-200 text-xs text-rose-900 font-bold space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-700 font-black">
                        <Lightbulb size={14} />
                        <span>规则纠偏指导:</span>
                      </div>
                      <p>{item.grammarRuleHint}</p>
                    </div>
                  )}

                  {/* 显示标准答案 */}
                  {showAnswers && (
                    <div className="mt-2 p-2 rounded-lg bg-emerald-100/80 text-emerald-900 text-xs font-extrabold flex items-center justify-between">
                      <span>标准参考答案:</span>
                      <span className="font-mono text-sm underline">
                        {Array.isArray(item.correctAnswer)
                          ? item.correctAnswer.join(' / ')
                          : item.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 状态监控与开发调试底栏 */}
        <div className="w-full max-w-4xl mt-6 p-4 rounded-2xl bg-slate-900 text-slate-300 text-xs font-mono">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <span className="text-amber-400 font-bold">
              🛠️ 实验室数据诊断器 (Realtime Debug State)
            </span>
            <span className="text-slate-500">Activity ID: {currentActivity.id}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">已填答案快照:</span>
              <pre className="text-emerald-400 overflow-x-auto mt-1">
                {JSON.stringify(userAnswers, null, 2)}
              </pre>
            </div>
            <div>
              <span className="text-slate-500">当前活动标准 Schema:</span>
              <div className="text-slate-400 mt-1 line-clamp-4">
                类别: {currentActivity.category} · 总题量: {currentActivity.items.length} 问 ·
                语法: {currentActivity.grammarFocus}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
