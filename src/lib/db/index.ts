/**
 * WordQuest 本地数据持久化引擎 (Local File Persistence Engine)
 * 零 C++ 依赖、原子写入、自动冷启动 Seeding、跨平台绝对可靠
 */

import fs from 'fs';
import path from 'path';
import { DifficultyTier, DIFFICULTY_CONFIGS } from '../../config/gamification';
import { BaseWord, LearningBatch } from '../algorithms/planEngine';
import { MASTERY_INTERVAL_THRESHOLD } from '../../config/learningRules';
import seedWordsRaw from '../../data/seedWords.json';

export interface UserSettings {
  id: string;
  studentName: string;
  difficulty: DifficultyTier;
  volume: number;
  speechRate: number;
  streakDays: number;
  totalPoints: number;
  lastCompletedDate: string | null;
}

export interface WordRecord extends BaseWord {
  createdAt: string;
}

export interface LearningRecord {
  wordId: string;
  familiarity: number;     // 0: 未知/我不认识, 1: 初识/我认识
  reviewInterval: number;  // 1, 3, 7, 14, 30
  nextReviewDate: string;  // YYYY-MM-DD
  totalAttempts: number;
  correctCount: number;
  lastResult: boolean | null;
  firstTestedAt: string;
  updatedAt: string;
}

export interface DailyPlanEntity {
  id: string;
  date: string; // YYYY-MM-DD
  difficulty: DifficultyTier;
  targetNewWordCount: number;
  totalWordCount: number;
  isCompleted: boolean;
  bonusAwarded: boolean;
  currentBatchIndex: number;
  currentTaskIndex: number;
  batches: LearningBatch[];
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  settings: UserSettings;
  words: Record<string, WordRecord>;
  records: Record<string, LearningRecord>; // key: wordId
  dailyPlans: Record<string, DailyPlanEntity>; // key: date YYYY-MM-DD
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'wordquest.db.json');

const DEFAULT_SETTINGS: UserSettings = {
  id: 'student-default',
  studentName: '张同学',
  difficulty: 'regular',
  volume: 1.0,
  speechRate: 0.85,
  streakDays: 0,
  totalPoints: 0,
  lastCompletedDate: null,
};

function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 数据库单例管理类
 */
export class LocalDB {
  private static instance: DatabaseSchema | null = null;

  private static load(): DatabaseSchema {
    ensureDirSync(DATA_DIR);

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          words: parsed.words || {},
          records: parsed.records || {},
          dailyPlans: parsed.dailyPlans || {},
        };
      } catch (err) {
        console.error('Failed to parse db file, re-initializing:', err);
      }
    }

    // 初始化默认数据库
    const initial: DatabaseSchema = {
      settings: DEFAULT_SETTINGS,
      words: {},
      records: {},
      dailyPlans: {},
    };

    // 默认内置初中核心 100 词 Seed Data
    if (Array.isArray(seedWordsRaw)) {
      seedWordsRaw.forEach((sw, idx) => {
        const id = `seed-${idx + 1}-${sw.word.toLowerCase()}`;
        initial.words[id] = {
          id,
          word: sw.word,
          phonetic: sw.phonetic,
          meaning: sw.meaning,
          pos: sw.pos,
          example: sw.example,
          translation: sw.translation,
          createdAt: new Date().toISOString(),
        };
      });
    }

    this.saveDirect(initial);
    return initial;
  }

  private static saveDirect(data: DatabaseSchema): void {
    ensureDirSync(DATA_DIR);
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  private static lastMtime: number = 0;

  public static get(): DatabaseSchema {
    ensureDirSync(DATA_DIR);
    if (fs.existsSync(DB_FILE)) {
      const stat = fs.statSync(DB_FILE);
      if (!this.instance || stat.mtimeMs !== this.lastMtime) {
        this.instance = this.load();
        this.lastMtime = stat.mtimeMs;
      }
    } else {
      this.instance = this.load();
    }
    return this.instance;
  }

  public static persist(): void {
    if (this.instance) {
      this.saveDirect(this.instance);
      if (fs.existsSync(DB_FILE)) {
        this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
      }
    }
  }

  // --- Settings ---
  public static getSettings(): UserSettings {
    return this.get().settings;
  }

  public static updateSettings(partial: Partial<UserSettings>): UserSettings {
    const db = this.get();
    db.settings = { ...db.settings, ...partial };
    this.persist();
    return db.settings;
  }

  // --- Words ---
  public static getAllWords(): WordRecord[] {
    return Object.values(this.get().words);
  }

  public static getWordById(id: string): WordRecord | undefined {
    return this.get().words[id];
  }

  public static addWords(words: Omit<WordRecord, 'id' | 'createdAt'>[]): { added: number; skipped: number } {
    const db = this.get();
    const existingWordSet = new Set(Object.values(db.words).map((w) => w.word.toLowerCase()));

    let added = 0;
    let skipped = 0;

    for (const w of words) {
      const lower = w.word.trim().toLowerCase();
      if (!lower || existingWordSet.has(lower)) {
        skipped++;
        continue;
      }

      const id = `word-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      db.words[id] = {
        ...w,
        id,
        word: w.word.trim(),
        meaning: w.meaning.trim(),
        createdAt: new Date().toISOString(),
      };
      existingWordSet.add(lower);
      added++;
    }

    if (added > 0) {
      this.persist();
    }

    return { added, skipped };
  }

  // --- Learning Records ---
  public static getAllRecords(): LearningRecord[] {
    return Object.values(this.get().records);
  }

  public static getRecordByWordId(wordId: string): LearningRecord | undefined {
    return this.get().records[wordId];
  }

  public static upsertRecord(record: Partial<LearningRecord> & { wordId: string }): LearningRecord {
    const db = this.get();
    const existing = db.records[record.wordId];
    const now = new Date().toISOString();

    const updated: LearningRecord = {
      wordId: record.wordId,
      familiarity: record.familiarity ?? existing?.familiarity ?? 0,
      reviewInterval: record.reviewInterval ?? existing?.reviewInterval ?? 1,
      nextReviewDate: record.nextReviewDate ?? existing?.nextReviewDate ?? now.split('T')[0],
      totalAttempts: (existing?.totalAttempts ?? 0) + (record.totalAttempts ?? 0),
      correctCount: (existing?.correctCount ?? 0) + (record.correctCount ?? 0),
      lastResult: record.lastResult !== undefined ? record.lastResult : (existing?.lastResult ?? null),
      firstTestedAt: existing?.firstTestedAt ?? now,
      updatedAt: now,
    };

    db.records[record.wordId] = updated;
    this.persist();
    return updated;
  }

  // --- Daily Plans ---
  public static getDailyPlan(date: string): DailyPlanEntity | undefined {
    return this.get().dailyPlans[date];
  }

  public static saveDailyPlan(plan: DailyPlanEntity): void {
    const db = this.get();
    db.dailyPlans[plan.date] = {
      ...plan,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
  }

  // --- Statistics ---
  public static getStatistics() {
    const db = this.get();
    const records = Object.values(db.records);
    const words = Object.values(db.words);

    const learnedCount = records.length; // 仅参加过测试的词
    const masteredCount = records.filter(
      (r) => r.reviewInterval >= MASTERY_INTERVAL_THRESHOLD && r.lastResult === true
    ).length;

    let totalAttempts = 0;
    let totalCorrect = 0;

    for (const r of records) {
      totalAttempts += r.totalAttempts;
      totalCorrect += r.correctCount;
    }

    const accuracyRate = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    return {
      totalVocabulary: words.length,
      learnedCount,
      masteredCount,
      learningCount: Math.max(0, learnedCount - masteredCount),
      totalAttempts,
      totalCorrect,
      accuracyRate,
      streakDays: db.settings.streakDays,
      totalPoints: db.settings.totalPoints,
    };
  }

  // --- Reset & Export ---
  public static resetProgress(): void {
    const db = this.get();
    db.records = {};
    db.dailyPlans = {};
    db.settings.streakDays = 0;
    db.settings.totalPoints = 0;
    db.settings.lastCompletedDate = null;
    this.persist();
  }

  public static exportAll(): any {
    return this.get();
  }
}
