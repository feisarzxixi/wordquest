/**
 * 每日学习计划排程与认知负荷自适应引擎 (Plan & Batching Engine)
 * 纯函数：防雪崩 30 词截断、词元合并过滤、无剧透复习分流、每组 8 词闭环多样化题型
 */

import { DAILY_WORDS_CAP, BATCH_SIZE_MIN, BATCH_SIZE_MAX, BATCH_SIZE_TARGET, COGNITIVE_LOAD_THRESHOLDS } from '../../config/learningRules';
import { DifficultyTier, DIFFICULTY_CONFIGS } from '../../config/gamification';
import { processLemmatization } from './lemmatizer';

export interface BaseWord {
  id: string;
  word: string;
  phonetic?: string | null;
  meaning: string;
  pos?: string | null;
  example?: string | null;
  translation?: string | null;
  image?: string | null;
  forms?: { plural?: string; past?: string; ing?: string };
}

export type QuizType =
  | 'MEANING_CHOICE'
  | 'AUDIO_CHOICE'
  | 'SENTENCE_FILL'
  | 'SPELLING'
  | 'PHRASE_BLOCKS'        // 短语专属：语块积木拼装
  | 'PREPOSITION_FILL'     // 短语专属：核心介词挖空
  | 'MATCHING'             // 连线配对题：4对4 独立着色配对
  | 'PART_OF_SPEECH'       // 词性辨析题：选择动词/形容词/名词
  | 'FORM_TRANSFORMATION'  // 词形时态题：原形变过去式/复数
  | 'GRAMMAR_USAGE';       // 语法理解题：Workbook 经典语法功能理解

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
  newWordIds?: string[];      // 仅属于首次学习的新词 ID 集合
  reviewWordIds?: string[];   // 属于 SRS 周期复习的旧词 ID 集合 (严禁提前剧透释义)
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
 * 将单词切分为每组 8 个单词的认知批次 (TARGET = 8)
 */
export function splitIntoBatches(words: BaseWord[]): BaseWord[][] {
  if (words.length === 0) return [];
  const batches: BaseWord[][] = [];
  let remaining = [...words];

  const targetSize = BATCH_SIZE_TARGET || 8;

  while (remaining.length > 0) {
    if (remaining.length <= targetSize) {
      batches.push(remaining);
      break;
    }
    // 如果剩余在 9~12 之间，均分成两组避免出现过小碎批次 (如 5 + 5 或 5 + 6)
    if (remaining.length < targetSize + 4) {
      const half = Math.ceil(remaining.length / 2);
      batches.push(remaining.slice(0, half));
      batches.push(remaining.slice(half));
      break;
    }

    batches.push(remaining.slice(0, targetSize));
    remaining = remaining.slice(targetSize);
  }

  return batches;
}

/**
 * 智能为单词或短语匹配最契合的题型（题型随机分发且丰富多样）
 */
export function assignQuizType(word: BaseWord, indexSeed: number): QuizType {
  const isPhraseWord = isPhrase(word.word);

  if (isPhraseWord) {
    // 短语专属题型轮换
    const phraseTypes: QuizType[] = [
      'PHRASE_BLOCKS',
      'PREPOSITION_FILL',
      'MATCHING',
      'MEANING_CHOICE',
      'SENTENCE_FILL',
    ];
    let chosen = phraseTypes[indexSeed % phraseTypes.length];
    if (chosen === 'SENTENCE_FILL' && (!word.example || !word.translation)) {
      chosen = 'PHRASE_BLOCKS';
    }
    return chosen;
  }

  // 单个单词常规题型丰富多样化随机分发 (8 种综合题型)
  const wordTypes: QuizType[] = [
    'MEANING_CHOICE',       // 词义选择
    'AUDIO_CHOICE',         // 听音辨词
    'MATCHING',             // 连线配对
    'SENTENCE_FILL',        // 句子理解
    'SPELLING',             // 字母拼写
    'PART_OF_SPEECH',       // 词性辨析 (动词/形容词/名词)
    'FORM_TRANSFORMATION',  // 词形时态 (过去式/复数)
    'GRAMMAR_USAGE',        // 语法理解
  ];

  let chosen = wordTypes[indexSeed % wordTypes.length];
  if (chosen === 'SENTENCE_FILL' && (!word.example || !word.translation)) {
    chosen = 'MEANING_CHOICE';
  }
  return chosen;
}

/**
 * 生成每日初始计划（集成词元合并与旧词无剧透复习分流）
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

  // 1. 词元合并与元语法词清洗过滤 (杜绝 verb, verbs 独立出现，合并 330+ 规则复数变形)
  const cleanReviewPool = processLemmatization(dueReviewWords).primaryWords;
  const cleanUnlearnedPool = processLemmatization(unlearnedWords).primaryWords;

  // 防雪崩 30 词截断：优先安排到期复习词
  const reviewWords = cleanReviewPool.slice(0, DAILY_WORDS_CAP);
  const remainingSlots = Math.max(0, DAILY_WORDS_CAP - reviewWords.length);
  const actualNewWordTake = Math.min(targetNewWordCount, remainingSlots, cleanUnlearnedPool.length);
  const newWords = cleanUnlearnedPool.slice(0, actualNewWordTake);

  const reviewWordIdSet = new Set(reviewWords.map((w) => w.id));
  const newWordIdSet = new Set(newWords.map((w) => w.id));

  const allWords = [...reviewWords, ...newWords];
  const rawBatches = splitIntoBatches(allWords);

  const batches: LearningBatch[] = rawBatches.map((batchWords, batchIdx) => {
    const shuffledWords = [...batchWords].sort(() => 0.5 - Math.random());
    const testTasks: PlanTaskItem[] = shuffledWords.map((word, wordIdx) => ({
      taskId: `${planDateStr}-b${batchIdx}-t${wordIdx}-${word.id}`,
      wordId: word.id,
      word,
      taskType: assignQuizType(word, batchIdx * 8 + wordIdx),
      isAnswered: false,
      isFirstTryCorrect: null,
      scoreAwarded: false,
    }));

    return {
      batchIndex: batchIdx,
      wordIds: batchWords.map((w) => w.id),
      newWordIds: batchWords.filter((w) => newWordIdSet.has(w.id)).map((w) => w.id),
      reviewWordIds: batchWords.filter((w) => reviewWordIdSet.has(w.id)).map((w) => w.id),
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
 * 生成“无尽加练模式”下的单批微计划 (每组 8 词)
 * 严格按照在学词负荷 (N) 动态决定加不加新词
 */
export function generateNextEndlessBatch(
  allReviewWords: BaseWord[],     // 可供复习的所有旧词
  unlearnedWords: BaseWord[],     // 尚存的未学新词
  activeLearningCount: number,    // 当前未掌握负荷量
  batchIndex: number,
  sessionDateStr: string = new Date().toISOString().split('T')[0]
): LearningBatch {
  const cleanReview = processLemmatization(allReviewWords).primaryWords;
  const cleanUnlearned = processLemmatization(unlearnedWords).primaryWords;

  const { quota, tier } = getAdaptiveNewWordQuota(activeLearningCount, 8);

  let newWordTake = 0;
  if (tier === 'FREEZE') {
    newWordTake = 0; // 熔断：0 新词！
  } else if (tier === 'REDUCE') {
    newWordTake = (batchIndex % 2 === 0 && cleanUnlearned.length > 0) ? 1 : 0;
  } else if (tier === 'STANDARD') {
    newWordTake = Math.min(2, cleanUnlearned.length);
  } else {
    // 快跑：可放 3 个新词
    newWordTake = Math.min(3, cleanUnlearned.length);
  }

  const batchSize = Math.min(8, Math.max(6, 8));
  const oldWordTake = batchSize - newWordTake;

  // 乱序抓取旧词
  const shuffledOld = [...cleanReview].sort(() => 0.5 - Math.random());
  const selectedOld = shuffledOld.slice(0, oldWordTake);
  const selectedNew = cleanUnlearned.slice(0, newWordTake);

  const batchWords = [...selectedOld, ...selectedNew].sort(() => 0.5 - Math.random());

  // 保证至少有 4 个词可练
  if (batchWords.length < 4 && cleanReview.length >= 4) {
    batchWords.push(...shuffledOld.slice(batchWords.length, 4));
  }

  const newWordIdSet = new Set(selectedNew.map((w) => w.id));
  const reviewWordIdSet = new Set(selectedOld.map((w) => w.id));

  const testTasks: PlanTaskItem[] = batchWords.map((word, wordIdx) => ({
    taskId: `endless-${sessionDateStr}-b${batchIndex}-t${wordIdx}-${word.id}`,
    wordId: word.id,
    word,
    taskType: assignQuizType(word, batchIndex * 8 + wordIdx),
    isAnswered: false,
    isFirstTryCorrect: null,
    scoreAwarded: false,
  }));

  return {
    batchIndex,
    wordIds: batchWords.map((w) => w.id),
    newWordIds: batchWords.filter((w) => newWordIdSet.has(w.id)).map((w) => w.id),
    reviewWordIds: batchWords.filter((w) => reviewWordIdSet.has(w.id)).map((w) => w.id),
    words: batchWords,
    testTasks,
  };
}
