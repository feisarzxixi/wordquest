/**
 * 艾宾浩斯间隔复习与生熟度状态算法 (SRS - Spaced Repetition System)
 * 纯函数，零依赖，支持 100% 独立测试
 */

import { SRS_INTERVALS, MASTERY_INTERVAL_THRESHOLD } from '../../config/learningRules';

export type CognitiveGrade = 'FRAGILE' | 'PROGRESSING' | 'MASTERED' | 'UNLEARNED';

export interface SRSResult {
  nextInterval: number;
  nextReviewDate: string; // YYYY-MM-DD
  isMastered: boolean;
}

/**
 * 格式化 Date 为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 在给定日期上增加若干天
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 计算艾宾浩斯复习阶梯与下次复习日期
 * 阶梯: 1天 -> 3天 -> 7天 -> 14天 -> 30天
 * @param currentInterval 当前间隔天数 (0, 1, 3, 7, 14, 30)
 * @param isCorrect 本次测试是否正确
 * @param baseDate 计算基准日期，默认为当前日期
 */
export function calculateNextReview(
  currentInterval: number,
  isCorrect: boolean,
  baseDate: Date = new Date()
): SRSResult {
  let nextInterval: number;

  if (isCorrect) {
    const currentIndex = SRS_INTERVALS.indexOf(currentInterval as any);
    if (currentIndex === -1) {
      // 首次答对或未知间隔，进入第 1 阶梯
      nextInterval = SRS_INTERVALS[0];
    } else if (currentIndex < SRS_INTERVALS.length - 1) {
      // 升入下一阶梯
      nextInterval = SRS_INTERVALS[currentIndex + 1];
    } else {
      // 已达最大阶梯 (30天)
      nextInterval = SRS_INTERVALS[SRS_INTERVALS.length - 1];
    }
  } else {
    // 答错直接重置回 1 天
    nextInterval = SRS_INTERVALS[0];
  }

  const nextReviewDate = formatDate(addDays(baseDate, nextInterval));
  const isMastered = nextInterval >= MASTERY_INTERVAL_THRESHOLD && isCorrect;

  return {
    nextInterval,
    nextReviewDate,
    isMastered,
  };
}

/**
 * 判断是否达到【已掌握】标准 (阶梯 >= 14天 且 最近一次答对)
 */
export function checkMasteryStatus(interval: number, lastResult: boolean | null): boolean {
  return interval >= MASTERY_INTERVAL_THRESHOLD && lastResult === true;
}

/**
 * 细化评估单个单词的生熟度等级
 */
export function evaluateCognitiveGrade(record?: {
  reviewInterval?: number;
  lastResult?: boolean | null;
  familiarity?: number;
}): CognitiveGrade {
  if (!record || record.reviewInterval === undefined) {
    return 'UNLEARNED';
  }

  if (checkMasteryStatus(record.reviewInterval, record.lastResult ?? null)) {
    return 'MASTERED'; // 长期掌握
  }

  // 夹生/生疏高危词：阶梯为 1 天，或上次答错，或认识卡选了“我不认识”
  if (
    record.reviewInterval <= 1 ||
    record.lastResult === false ||
    record.familiarity === 0
  ) {
    return 'FRAGILE';
  }

  // 巩固半熟词：处于 3天 或 7天 阶梯且上次答对
  return 'PROGRESSING';
}
