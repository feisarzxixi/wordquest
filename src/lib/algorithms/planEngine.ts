/**
 * 每日学习计划排程与认知负荷自适应引擎 (Plan & Batching Engine)
 * 纯函数：防雪崩 30 词截断、自适应生熟度配比、短语专项题型分流、3~5 词组块闭环
 */

import { DAILY_WORDS_CAP, BATCH_SIZE_MIN, BATCH_SIZE_MAX, COGNITIVE_LOAD_THRESHOLDS } from '../../config/learningRules';
import { DifficultyTier, DIFFICULTY_CONFIGS } from '../../config/gamification';

export interface BaseWord {
  id: string;
  word: string;
  phonetic?: string | null;
  meaning: string;
  pos?: string | null;
  example?: string | null;
  translation?: string | null;
}

export type QuizType =
  | 'MEANING_CHOICE'
  | 'AUDIO_CHOICE'
  | 'SENTENCE_FILL'
  | 'SPELLING'
  | 'PHRASE_BLOCKS'     // 短语专属：语块积木拼装
  | 'PREPOSITION_FILL'; // 短语专属：核心介词挖空

export interface PlanTaskItem {
  taskId: string;
  wordId: string;
  word: BaseWord;
  taskType: QuizType;
  isAnswered: boolean;
  isFirstTryCorrect: boolean | null;
  scoreAwarded: boolean;
}

export interface LearningBatch {
  batchIndex: number;
  wordIds: string[];
  words: BaseWord[];
  testTasks: PlanTaskItem[];
}

export interface DailyPlanResult {
  reviewWords: BaseWord[];
  newWords: BaseWord[];
  allWords: BaseWord[];
  batches: LearningBatch[];
  totalWordCount: number;
  reviewWordCount: number;
  newWordCount: number;
  targetNewWordCount: number;
  cognitiveTier: 'FAST' | 'STANDARD' | 'REDUCE' | 'FREEZE';
}

/**
 * 自动判定是否为短语（包含空格，如 "take care of"）
 */
export function isPhrase(word: string): boolean {
  return word.trim().includes(' ');
}

/**
 * 依据当前在学未掌握负荷量 (N)，计算自适应新词抽取上限
 * - N < 20: 顺畅快跑档（新词比例 ~40%）
 * - 20 <= N < 30: 稳健标准档（新词比例 ~20%）
 * - 30 <= N < 50: 减速攻坚档（10 旧 : 1 新）
 * - N >= 50: 彻底熔断档（0% 新词，纯旧词消灭）
 */
export function getAdaptiveNewWordQuota(
  activeLearningCount: number,
  baseTarget: number
): { quota: number; tier: 'FAST' | 'STANDARD' | 'REDUCE' | 'FREEZE' } {
  if (activeLearningCount >= COGNITIVE_LOAD_THRESHOLDS.FREEZE_FLOOR) {
    // 达到或超过 50 个在学词，绝对熔断，不加任何新词
    return { quota: 0, tier: 'FREEZE' };
  }

  if (activeLearningCount >= COGNITIVE_LOAD_THRESHOLDS.STANDARD_CEIL) {
    // 30 ~ 49 个：每 10 个旧词配 1 个新词，极度克制 (10:1)
    return { quota: Math.min(2, Math.max(1, Math.round(baseTarget * 0.1))), tier: 'REDUCE' };
  }

  if (activeLearningCount >= COGNITIVE_LOAD_THRESHOLDS.FAST_CEIL) {
    // 20 ~ 29 个：标准强度
    return { quota: Math.round(baseTarget * 0.8), tier: 'STANDARD' };
  }

  // < 20 个：负荷极轻，满额推进
  return { quota: baseTarget, tier: 'FAST' };
}

/**
 * 将单词切分为 3~5 词的认知批次
 */
export function splitIntoBatches(words: BaseWord[]): BaseWord[][] {
  if (words.length === 0) return [];
  const batches: BaseWord[][] = [];
  let remaining = [...words];

  while (remaining.length > 0) {
    if (remaining.length <= BATCH_SIZE_MAX) {
      batches.push(remaining);
      break;
    }
    if (remaining.length === 6) {
      batches.push(remaining.slice(0, 3));
      batches.push(remaining.slice(3));
      break;
    }
    const take = remaining.length >= 8 ? BATCH_SIZE_MAX : BATCH_SIZE_MIN;
    batches.push(remaining.slice(0, take));
    remaining = remaining.slice(take);
  }

  return batches;
}

/**
 * 智能为单词或短语匹配最契合的题型
 */
export function assignQuizType(word: BaseWord, indexSeed: number): QuizType {
  const isPhraseWord = isPhrase(word.word);

  if (isPhraseWord) {
    // 短语专属题型轮换：绝不走单字母拼写！
    const phraseTypes: QuizType[] = ['PHRASE_BLOCKS', 'PREPOSITION_FILL', 'MEANING_CHOICE', 'SENTENCE_FILL'];
    let chosen = phraseTypes[indexSeed % phraseTypes.length];
    if (chosen === 'SENTENCE_FILL' && (!word.example || !word.translation)) {
      chosen = 'PHRASE_BLOCKS';
    }
    return chosen;
  }

  // 单个单词常规题型轮换
  const wordTypes: QuizType[] = ['MEANING_CHOICE', 'AUDIO_CHOICE', 'SENTENCE_FILL', 'SPELLING'];
  let chosen = wordTypes[indexSeed % wordTypes.length];
  if (chosen === 'SENTENCE_FILL' && (!word.example || !word.translation)) {
    chosen = 'MEANING_CHOICE';
  }
  return chosen;
}

/**
 * 生成每日初始计划
 */
export function generateDailyPlan(
  dueReviewWords: BaseWord[],
  unlearnedWords: BaseWord[],
  activeLearningCount: number,
  difficulty: DifficultyTier,
  planDateStr: string = new Date().toISOString().split('T')[0]
): DailyPlanResult {
  const baseTarget = DIFFICULTY_CONFIGS[difficulty].defaultDailyWords;
  const { quota: targetNewWordCount, tier: cognitiveTier } = getAdaptiveNewWordQuota(
    activeLearningCount,
    baseTarget
  );

  // 防雪崩 30 词截断：优先安排到期复习词
  const reviewWords = dueReviewWords.slice(0, DAILY_WORDS_CAP);
  const remainingSlots = Math.max(0, DAILY_WORDS_CAP - reviewWords.length);
  const actualNewWordTake = Math.min(targetNewWordCount, remainingSlots, unlearnedWords.length);
  const newWords = unlearnedWords.slice(0, actualNewWordTake);

  const allWords = [...reviewWords, ...newWords];
  const rawBatches = splitIntoBatches(allWords);

  const batches: LearningBatch[] = rawBatches.map((batchWords, batchIdx) => {
    const shuffledWords = [...batchWords].sort(() => 0.5 - Math.random());
    const testTasks: PlanTaskItem[] = shuffledWords.map((word, wordIdx) => ({
      taskId: `${planDateStr}-b${batchIdx}-t${wordIdx}-${word.id}`,
      wordId: word.id,
      word,
      taskType: assignQuizType(word, batchIdx * 5 + wordIdx),
      isAnswered: false,
      isFirstTryCorrect: null,
      scoreAwarded: false,
    }));

    return {
      batchIndex: batchIdx,
      wordIds: batchWords.map((w) => w.id),
      words: batchWords,
      testTasks,
    };
  });

  return {
    reviewWords,
    newWords,
    allWords,
    batches,
    totalWordCount: allWords.length,
    reviewWordCount: reviewWords.length,
    newWordCount: newWords.length,
    targetNewWordCount,
    cognitiveTier,
  };
}

/**
 * 生成“无尽加练模式”下的单批微计划 (3~5 词)
 * 严格按照在学词负荷 (N) 动态决定加不加新词
 */
export function generateNextEndlessBatch(
  allReviewWords: BaseWord[],     // 可供复习的所有旧词
  unlearnedWords: BaseWord[],     // 尚存的未学新词
  activeLearningCount: number,    // 当前未掌握负荷量
  batchIndex: number,
  sessionDateStr: string = new Date().toISOString().split('T')[0]
): LearningBatch {
  const { quota, tier } = getAdaptiveNewWordQuota(activeLearningCount, 5);

  let newWordTake = 0;
  if (tier === 'FREEZE') {
    newWordTake = 0; // 熔断：0 新词！
  } else if (tier === 'REDUCE') {
    // 减速：每两三个批次才可能带 1 个新词
    newWordTake = (batchIndex % 2 === 0 && unlearnedWords.length > 0) ? 1 : 0;
  } else if (tier === 'STANDARD') {
    newWordTake = Math.min(1, unlearnedWords.length);
  } else {
    // 快跑：可放 2 个新词
    newWordTake = Math.min(2, unlearnedWords.length);
  }

  const batchSize = Math.min(5, Math.max(3, 4));
  const oldWordTake = batchSize - newWordTake;

  // 乱序抓取旧词
  const shuffledOld = [...allReviewWords].sort(() => 0.5 - Math.random());
  const selectedOld = shuffledOld.slice(0, oldWordTake);
  const selectedNew = unlearnedWords.slice(0, newWordTake);

  const batchWords = [...selectedOld, ...selectedNew].sort(() => 0.5 - Math.random());

  // 保证至少有 3 个词可练
  if (batchWords.length < 3 && allReviewWords.length >= 3) {
    batchWords.push(...shuffledOld.slice(batchWords.length, 3));
  }

  const testTasks: PlanTaskItem[] = batchWords.map((word, wordIdx) => ({
    taskId: `endless-${sessionDateStr}-b${batchIndex}-t${wordIdx}-${word.id}`,
    wordId: word.id,
    word,
    taskType: assignQuizType(word, batchIndex * 7 + wordIdx),
    isAnswered: false,
    isFirstTryCorrect: null,
    scoreAwarded: false,
  }));

  return {
    batchIndex,
    wordIds: batchWords.map((w) => w.id),
    words: batchWords,
    testTasks,
  };
}
