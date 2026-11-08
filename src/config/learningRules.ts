/**
 * WordQuest 学习规则与算法常量配置
 */

export const SRS_INTERVALS = [1, 3, 7, 14, 30] as const;

export const DAILY_WORDS_CAP = 30; // 每日最大总词量防雪崩上限

export const BATCH_SIZE_MIN = 3;  // 认知闭环单组最小词数
export const BATCH_SIZE_MAX = 5;  // 认知闭环单组最大词数

export const MASTERY_INTERVAL_THRESHOLD = 14; // 判定为【已掌握】的最小间隔天数

export const RESULT_AUTO_ADVANCE_MS = 3000; // 方案 A 答对后自动推进毫秒数 (调优为 3.0 秒)

// 15 分钟专注成就彩蛋触发毫秒数
export const FOCUS_EASTER_EGG_MS = 15 * 60 * 1000;

// 认知负荷动态熔断档位阈值
export const COGNITIVE_LOAD_THRESHOLDS = {
  FAST_CEIL: 20,     // < 20 个在学词：快跑档（40% 新词）
  STANDARD_CEIL: 30, // 20 ~ 29 个在学词：标准档（20% 新词）
  REDUCE_CEIL: 50,   // 30 ~ 49 个在学词：减速档（10 旧 : 1 新）
  FREEZE_FLOOR: 50,  // >= 50 个在学词：全面熔断（0% 新词，纯旧词消灭）
} as const;

export const ACCURACY_TIERS = [
  { minAccuracy: 0.85, ratio: 1.0, fixed: null },
  { minAccuracy: 0.75, ratio: 0.8, fixed: null },
  { minAccuracy: 0.60, ratio: 0.5, fixed: null },
  { minAccuracy: 0.00, ratio: null, fixed: 5 }, // 低于 60% 固定 5 词强攻坚
] as const;
