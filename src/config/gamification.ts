/**
 * WordQuest 游戏化、难度档位与积分规则配置
 */

export type DifficultyTier = 'novice' | 'regular' | 'master';

export interface DifficultyConfig {
  id: DifficultyTier;
  label: string;
  defaultDailyWords: number;
  dailyBonusPoints: number;
  description: string;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyTier, DifficultyConfig> = {
  novice: {
    id: 'novice',
    label: '新手',
    defaultDailyWords: 8,
    dailyBonusPoints: 10,
    description: '每日 8 词，扎实起步，日结奖励 10 积分',
  },
  regular: {
    id: 'regular',
    label: '常规',
    defaultDailyWords: 15,
    dailyBonusPoints: 20,
    description: '每日 15 词，标准强度，日结奖励 20 积分',
  },
  master: {
    id: 'master',
    label: '大师',
    defaultDailyWords: 25,
    dailyBonusPoints: 30,
    description: '每日 25 词，进阶突破，日结奖励 30 积分',
  },
};

export const SINGLE_QUIZ_FIRST_TRY_POINTS = 1; // 首次答对获得积分
