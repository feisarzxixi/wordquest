'use client';

import React, { useRef, useState, useEffect } from 'react';
import { BlankSlot } from '../../lib/algorithms/spellingMasker';

export interface LetterInputProps {
  slots: BlankSlot[];
  onSubmit: (userWord: string) => void;
  disabled?: boolean;
}

export const LetterInput: React.FC<LetterInputProps> = ({
  slots,
  onSubmit,
  disabled = false,
}) => {
  // 维护每个 slot 的当前字符输入
  const [values, setValues] = useState<string[]>(() => slots.map(() => ''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 槽位重置
  useEffect(() => {
    setValues(slots.map(() => ''));
    // 自动聚焦到第一个空白输入槽位
    const firstInputIdx = slots.findIndex((s) => s.isInput);
    if (firstInputIdx !== -1 && inputRefs.current[firstInputIdx]) {
      setTimeout(() => inputRefs.current[firstInputIdx]?.focus(), 50);
    }
  }, [slots]);

  const handleChange = (index: number, val: string) => {
    if (disabled) return;

    // 只取最后一个字符，且必须为英文字母
    const char = val.slice(-1);
    if (char && !/[a-zA-Z]/.test(char)) return;

    const newValues = [...values];
    newValues[index] = char.toLowerCase();
    setValues(newValues);

    // 自动跳向下一个待输入的槽位
    if (char) {
      let nextIdx = -1;
      for (let i = index + 1; i < slots.length; i++) {
        if (slots[i].isInput) {
          nextIdx = i;
          break;
        }
      }
      if (nextIdx !== -1) {
        inputRefs.current[nextIdx]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace' && !values[index]) {
      // 当前为空且按退格，回退到上一个可输入的槽位
      for (let i = index - 1; i >= 0; i--) {
        if (slots[i].isInput) {
          inputRefs.current[i]?.focus();
          break;
        }
      }
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    // 组装最终完整单词
    const assembled = slots
      .map((slot, idx) => (slot.isInput ? values[idx] || '' : slot.letter))
      .join('');
    onSubmit(assembled);
  };

  // 检查是否所有必填位都已填入
  const isFilled = slots.every((s, idx) => !s.isInput || values[idx].length > 0);

  return (
    <div className="flex flex-col items-center gap-6 my-4 w-full">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-full">
        {slots.map((slot, idx) => {
          if (!slot.isInput) {
            // 固定已给出的字符
            return (
              <div
                key={idx}
                className="w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-bold rounded-xl bg-slate-100 text-slate-700 select-none border border-slate-200"
              >
                {slot.letter}
              </div>
            );
          }

          // 待填空位
          return (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              maxLength={1}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={values[idx] || ''}
              disabled={disabled}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 border-indigo-400 bg-white text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all shadow-sm"
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isFilled || disabled}
        className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-lg shadow-md transition-all"
      >
        提交拼写
      </button>
    </div>
  );
};
