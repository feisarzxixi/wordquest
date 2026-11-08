'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { SpeakerBtn } from '../../components/ui/SpeakerBtn';
import { COPYWRITING } from '../../config/copywriting';
import { Search, BookOpen } from 'lucide-react';

export default function WordsPage() {
  const [words, setWords] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'learning' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWords();
  }, [filter, searchQuery]);

  const fetchWords = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`/api/words?${params.toString()}`).then((r) => r.json());
      if (res.success) {
        setWords(res.data);
      }
    } catch (err) {
      console.error('Fetch words failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 flex flex-col">
      {/* 头部标题与筛选 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {COPYWRITING.words.title}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            {COPYWRITING.words.subtitle}
          </p>
        </div>

        {/* 筛选标签 */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {COPYWRITING.words.filterAll}
          </button>
          <button
            type="button"
            onClick={() => setFilter('learning')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filter === 'learning' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {COPYWRITING.words.filterLearning}
          </button>
          <button
            type="button"
            onClick={() => setFilter('mastered')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filter === 'mastered' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {COPYWRITING.words.filterMastered}
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
        <input
          type="text"
          placeholder={COPYWRITING.words.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm"
        />
      </div>

      {/* 紧凑单行纯文本列表展示（只显示英文和中文翻译） */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : words.length === 0 ? (
        <Card className="p-12 text-center text-slate-400 flex flex-col items-center">
          <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">{COPYWRITING.words.emptyState}</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden border-slate-200 shadow-sm divide-y divide-slate-100">
          {words.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-indigo-50/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-300 w-6 text-right select-none">
                  {idx + 1}
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {item.word}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm sm:text-base font-medium text-slate-600 text-right">
                  {item.meaning}
                </span>
                <SpeakerBtn text={item.word} size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
