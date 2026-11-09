'use client';

import React, { useState, useEffect } from 'react';
import { BlankSlot } from '../../lib/algorithms/spellingMasker';
import { RotateCcw } from 'lucide-react';

export interface LetterInputProps {
  slots: BlankSlot[];
  onSubmit: (userWord: string) => void;
  disabled?: boolean;
}

interface LetterChip {
  id: string;
  letter: string;
  isUsed: boolean;
}

export const LetterInput: React.FC<LetterInputProps> = ({
  slots,
  onSubmit,
  disabled = false,
}) => {
  // 维护每个 slot 的当前输入字符
  const [filledLetters, setFilledLetters] = useState<(string | null)[]>(() => slots.map(() => null));
  const [chips, setChips] = useState<LetterChip[]>([]);

  // 当题目 slots 变化时，初始化备选字母池（正确待填字母 + 2~3 个混淆干扰字母打乱）
  useEffect(() => {
    setFilledLetters(slots.map(() => null));

    // 1. 收集所有挖空待填写的真实字母
    const requiredLetters = slots.filter((s) => s.isInput).map((s) => s.letter.toLowerCase());

    // 2. 补充 2~3 个常见高频干扰字母（确保不只有固定答案）
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const distractors: string[] = [];
    const distractorCount = Math.min(3, Math.max(2, 6 - requiredLetters.length));

    while (distractors.length < distractorCount) {
      const char = alphabet[Math.floor(Math.random() * alphabet.length)];
      if (!requiredLetters.includes(char) && !distractors.includes(char)) {
        distractors.push(char);
      }
    }

    const allLetters = [...requiredLetters, ...distractors];
    // Fisher-Yates 随机打乱
    for (let i = allLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allLetters[i], allLetters[j]] = [allLetters[j], allLetters[i]];
    }

    setChips(
      allLetters.map((l, idx) => ({
        id: `chip-${idx}-${l}`,
        letter: l,
        isUsed: false,
      }))
    );
  }, [slots]);

  // 点击备选字母块：填入第一个空白槽位
  const handleSelectChip = (chip: LetterChip) => {
    if (disabled || chip.isUsed) return;

    // 寻找第一个未填写的 isInput 槽位
    const firstEmptyIdx = slots.findIndex((s, idx) => s.isInput && filledLetters[idx] === null);
    if (firstEmptyIdx === -1) return;

    const newFilled = [...filledLetters];
    newFilled[firstEmptyIdx] = chip.letter;
    setFilledLetters(newFilled);

    // 标记该 chip 已使用
    setChips((prev) =>
      prev.map((c) => (c.id === chip.id ? { ...c, isUsed: true } : c))
    );
  };

  // 点击已填入的槽位：撤销该字母，退回备选池
  const handleRemoveSlot = (slotIdx: number) => {
    if (disabled || !slots[slotIdx].isInput || filledLetters[slotIdx] === null) return;

    const removedLetter = filledLetters[slotIdx];
    const newFilled = [...filledLetters];
    newFilled[slotIdx] = null;
    setFilledLetters(newFilled);

    // 释放第一个匹配的 isUsed chip
    setChips((prev) => {
      let released = false;
      return prev.map((c) => {
        if (!released && c.letter === removedLetter && c.isUsed) {
          released = true;
          return { ...c, isUsed: false };
        }
        return c;
      });
    });
  };

  // 一键重置清空当前所有填空
  const handleResetAll = () => {
    if (disabled) return;
    setFilledLetters(slots.map(() => null));
    setChips((prev) => prev.map((c) => ({ ...c, isUsed: false })));
  };

  // 组装最终答案并提交
  const handleSubmit = () => {
    const assembled = slots
      .map((s, idx) => (s.isInput ? filledLetters[idx] || '' : s.letter))
      .join('');
    onSubmit(assembled);
  };

  // 检查所有挖空位置是否均已填好
  const isAllFilled = slots.every((s, idx) => !s.isInput || filledLetters[idx] !== null);

  return (
    <div className="flex flex-col items-center gap-6 my-2 w-full select-none">
      {/* 1. 顶部单词填空槽位区 */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-full">
        {slots.map((slot, idx) => {
          if (!slot.isInput) {
            // 固定已给出的字符
            return (
              <div
                key={idx}
                className="w-11 h-14 sm:w-14 sm:h-16 flex items-center justify-center text-xl sm:text-2xl font-bold rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 shadow-inner"
              >
                {slot.letter}
              </div>
            );
          }

          const filledChar = filledLetters[idx];
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => handleRemoveSlot(idx)}
              className={`w-11 h-14 sm:w-14 sm:h-16 flex items-center justify-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all active:scale-95 ${
                filledChar
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200'
                  : 'bg-white border-dashed border-indigo-300 text-slate-300 hover:border-indigo-400'
              }`}
            >
              {filledChar || ''}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 font-medium">
        👆 点击下方备选字母填入空位，点击已填字母可撤回
      </p>

      {/* 2. 下方备选字母积木池 (专为 iPad 触控优化，超大触控热区) */}
      <div className="w-full max-w-md bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={disabled || chip.isUsed}
              onClick={() => handleSelectChip(chip)}
              className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all active:scale-90 ${
                chip.isUsed
                  ? 'bg-slate-200/50 border-slate-200 text-slate-300 opacity-40 pointer-events-none'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 shadow-sm'
              }`}
            >
              {chip.letter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full justify-between pt-1 border-t border-slate-200/60">
          <button
            type="button"
            disabled={disabled || filledLetters.every((c) => c === null)}
            onClick={handleResetAll}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-colors px-2 py-1"
          >
            <RotateCcw size={13} />
            <span>清空重填</span>
          </button>

          <span className="text-[11px] font-mono text-slate-400">
            {slots.filter((s, i) => s.isInput && filledLetters[i] !== null).length} /{' '}
            {slots.filter((s) => s.isInput).length} 已填
          </span>
        </div>
      </div>

      {/* 3. 提交确认按钮：未填满时显示明确提示，填满后高亮呈现确认提交 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isAllFilled || disabled}
        className={`w-full max-w-sm py-3.5 px-6 rounded-2xl font-extrabold text-base transition-all flex items-center justify-center gap-2 ${
          isAllFilled
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 active:scale-95 cursor-pointer'
            : 'bg-slate-200 text-slate-600 border border-slate-300 shadow-none cursor-not-allowed'
        }`}
      >
        <span className={isAllFilled ? 'text-white font-extrabold' : 'text-slate-600 font-bold'}>
          {isAllFilled ? '确认提交 ➔' : '请先点击下方字母填满空位'}
        </span>
      </button>
    </div>
  );
};
