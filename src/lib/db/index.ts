/**
 * WordQuest 数据持久化与多用户隔离引擎 (Multi-Tenant Local Persistence Engine)
 * 1. 严格支持学生与管理员 RBAC 角色分离
 * 2. 学生端注册需管理员在后台审核通过方可使用
 * 3. 每个学生拥有完全独立的学习进度、艾宾浩斯复习间隔、生熟词记录与统计数据
 * 4. 词库由管理员统一维护管理，全员共享
 */

import fs from 'fs';
import path from 'path';
import { DifficultyTier, DIFFICULTY_CONFIGS } from '../../config/gamification';
import { BaseWord, LearningBatch } from '../algorithms/planEngine';
import { MASTERY_INTERVAL_THRESHOLD } from '../../config/learningRules';
import { formatDate } from '../algorithms/srsScheduler';

export interface UserSettings {
  id: string;
  studentName: string;
  difficulty: DifficultyTier;
  volume: number;
  speechRate: number;
  accent: 'uk' | 'us';
  streakDays: number;
  totalPoints: number;
  lastCompletedDate: string | null;
}

export interface UserRecord {
  id: string;
  username: string;
  realName: string;
  password: string;
  role: 'admin' | 'student';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
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

export interface StudentData {
  settings: UserSettings;
  records: Record<string, LearningRecord>;
  dailyPlans: Record<string, DailyPlanEntity>;
  dailyStudyTime?: Record<string, number>; // key: YYYY-MM-DD, value: 累计学习分钟数
  dailyLearnedWords?: Record<string, number>; // key: YYYY-MM-DD, value: 当日学习/复习单词数
}

export interface DatabaseSchema {
  settings: UserSettings;
  words: Record<string, WordRecord>;
  records: Record<string, LearningRecord>;
  dailyPlans: Record<string, DailyPlanEntity>;
  users: Record<string, UserRecord>;
  students: Record<string, StudentData>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'wordquest.db.json');

const DEFAULT_SETTINGS: UserSettings = {
  id: 'student-default',
  studentName: '张同学',
  difficulty: 'regular',
  volume: 1.0,
  speechRate: 0.85,
  accent: 'uk',
  streakDays: 0,
  totalPoints: 0,
  lastCompletedDate: null,
};

function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export class LocalDB {
  private static instance: DatabaseSchema | null = null;
  private static lastMtime: number = 0;

  private static load(): DatabaseSchema {
    ensureDirSync(DATA_DIR);

    let parsed: any = {};
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        parsed = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse db file, re-initializing:', err);
      }
    }

    const initial: DatabaseSchema = {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      words: parsed.words || {},
      records: parsed.records || {},
      dailyPlans: parsed.dailyPlans || {},
      users: parsed.users || {},
      students: parsed.students || {},
    };

    // 默认管理员与默认学生用户保障
    if (!initial.users['admin']) {
      initial.users['admin'] = {
        id: 'admin',
        username: 'admin',
        realName: '系统管理员',
        password: 'admin',
        role: 'admin',
        status: 'approved',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      };
    }

    if (!initial.users['student-default']) {
      initial.users['student-default'] = {
        id: 'student-default',
        username: 'student',
        realName: initial.settings.studentName || '张同学',
        password: '123',
        role: 'student',
        status: 'approved',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      };
    }

    if (!initial.users['student-faruide']) {
      initial.users['student-faruide'] = {
        id: 'student-faruide',
        username: 'faruide',
        realName: 'Faruide',
        password: '123456',
        role: 'student',
        status: 'approved',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      };
    }

    // 平滑迁移：确保内置学生拥有独立沙盒
    if (!initial.students['student-default']) {
      initial.students['student-default'] = {
        settings: { ...initial.settings },
        records: { ...initial.records },
        dailyPlans: { ...initial.dailyPlans },
      };
    }

    if (!initial.students['student-faruide']) {
      initial.students['student-faruide'] = {
        settings: {
          ...DEFAULT_SETTINGS,
          id: 'student-faruide',
          studentName: 'Faruide',
          difficulty: 'master',
        },
        records: {},
        dailyPlans: {},
      };
    }

    this.saveDirect(initial);
    return initial;
  }

  private static saveDirect(data: DatabaseSchema): void {
    ensureDirSync(DATA_DIR);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

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

  // --- Student Sandbox Helper ---
  private static ensureStudent(studentId: string = 'student-default'): StudentData {
    const db = this.get();
    if (!db.students[studentId]) {
      const user = db.users[studentId];
      db.students[studentId] = {
        settings: {
          ...DEFAULT_SETTINGS,
          id: studentId,
          studentName: user ? user.realName : '学生',
        },
        records: {},
        dailyPlans: {},
      };
      this.persist();
    }
    return db.students[studentId];
  }

  // --- Users & Auth ---
  public static getAllUsers(): UserRecord[] {
    return Object.values(this.get().users);
  }

  public static getUserById(id: string): UserRecord | undefined {
    return this.get().users[id];
  }

  public static getUserByUsername(username: string): UserRecord | undefined {
    const lower = username.trim().toLowerCase();
    return Object.values(this.get().users).find(
      (u) => u.username.toLowerCase() === lower
    );
  }

  /**
   * 学生自助注册 -> 初始状态为 pending (待审核)
   */
  public static registerStudent(username: string, realName: string, password: string): UserRecord {
    const db = this.get();
    const cleanUsername = username.trim();
    if (this.getUserByUsername(cleanUsername)) {
      throw new Error('该账号已被注册！');
    }

    const id = `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const user: UserRecord = {
      id,
      username: cleanUsername,
      realName: realName.trim(),
      password: password.trim(),
      role: 'student',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.users[id] = user;
    this.persist();
    return user;
  }

  /**
   * 管理员直接添加学生 -> 自动为 approved
   */
  public static addStudentDirect(username: string, realName: string, password: string): UserRecord {
    const db = this.get();
    const cleanUsername = username.trim();
    if (this.getUserByUsername(cleanUsername)) {
      throw new Error('该账号已存在！');
    }

    const id = `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const user: UserRecord = {
      id,
      username: cleanUsername,
      realName: realName.trim(),
      password: password.trim(),
      role: 'student',
      status: 'approved',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    };

    db.users[id] = user;
    this.ensureStudent(id);
    this.persist();
    return user;
  }

  public static approveStudent(userId: string): boolean {
    const db = this.get();
    const user = db.users[userId];
    if (!user) return false;

    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
    this.ensureStudent(userId);
    this.persist();
    return true;
  }

  public static rejectStudent(userId: string): boolean {
    const db = this.get();
    const user = db.users[userId];
    if (!user) return false;

    user.status = 'rejected';
    this.persist();
    return true;
  }

  public static deleteStudent(userId: string): boolean {
    const db = this.get();
    if (!db.users[userId] || db.users[userId].role === 'admin') return false;

    delete db.users[userId];
    delete db.students[userId];
    this.persist();
    return true;
  }

  public static resetStudentPassword(userId: string, newPass: string): boolean {
    const db = this.get();
    const user = db.users[userId];
    if (!user) return false;

    user.password = newPass.trim();
    this.persist();
    return true;
  }

  // --- Settings ---
  public static getSettings(studentId: string = 'student-default'): UserSettings {
    const student = this.ensureStudent(studentId);
    return student.settings;
  }

  public static updateSettings(partial: Partial<UserSettings>, studentId: string = 'student-default'): UserSettings {
    const student = this.ensureStudent(studentId);
    student.settings = { ...student.settings, ...partial };
    // 同步到 db.settings 以保持向下兼容
    if (studentId === 'student-default') {
      this.get().settings = { ...student.settings };
    }
    this.persist();
    return student.settings;
  }

  // --- Words (Global Shared) ---
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

  public static replaceWords(words: Omit<WordRecord, 'id' | 'createdAt'>[]): { total: number } {
    const db = this.get();

    // 建立旧单词小写 -> 旧单词ID的映射，以便智能继承学生既有记忆等级
    const oldWordTextToOldId: Record<string, string> = {};
    for (const [id, w] of Object.entries(db.words)) {
      oldWordTextToOldId[w.word.trim().toLowerCase()] = id;
    }

    // 清空现有全局词库，完全按照本次上传的 Excel 行号自上而下重新建立词库索引与先后顺序
    db.words = {};
    const newWordTextToNewId: Record<string, string> = {};

    let index = 0;
    for (const w of words) {
      const trimmedWord = w.word.trim();
      const lower = trimmedWord.toLowerCase();
      if (!lower || newWordTextToNewId[lower]) continue;

      const id = `word-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
      index++;
      db.words[id] = {
        ...w,
        id,
        word: trimmedWord,
        meaning: w.meaning.trim(),
        createdAt: new Date().toISOString(),
      };
      newWordTextToNewId[lower] = id;
    }

    // 智能更新所有学生的学习进度：保留依然在新词库里的单词记录，淘汰已删除的旧词记录
    for (const student of Object.values(db.students)) {
      const updatedRecords: Record<string, LearningRecord> = {};
      for (const [oldWordText, oldId] of Object.entries(oldWordTextToOldId)) {
        const oldRecord = student.records[oldId];
        const newId = newWordTextToNewId[oldWordText];
        if (oldRecord && newId) {
          updatedRecords[newId] = {
            ...oldRecord,
            wordId: newId,
          };
        }
      }
      student.records = updatedRecords;
      // 清空旧计划，保证系统立即基于全新词库顺序生成学习计划
      student.dailyPlans = {};
    }

    this.persist();
    return { total: Object.keys(db.words).length };
  }

  // --- Learning Records (Per-Student) ---
  public static getAllRecords(studentId: string = 'student-default'): LearningRecord[] {
    const student = this.ensureStudent(studentId);
    return Object.values(student.records);
  }

  public static getRecordByWordId(wordId: string, studentId: string = 'student-default'): LearningRecord | undefined {
    const student = this.ensureStudent(studentId);
    return student.records[wordId];
  }

  public static upsertRecord(
    record: Partial<LearningRecord> & { wordId: string },
    studentId: string = 'student-default'
  ): LearningRecord {
    const student = this.ensureStudent(studentId);
    const existing = student.records[record.wordId];
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

    student.records[record.wordId] = updated;
    if (studentId === 'student-default') {
      this.get().records[record.wordId] = updated;
    }
    this.persist();
    return updated;
  }

  // --- Daily Plans (Per-Student) ---
  public static getDailyPlan(date: string, studentId: string = 'student-default'): DailyPlanEntity | undefined {
    const student = this.ensureStudent(studentId);
    return student.dailyPlans[date];
  }

  public static saveDailyPlan(plan: DailyPlanEntity, studentId: string = 'student-default'): void {
    const student = this.ensureStudent(studentId);
    student.dailyPlans[plan.date] = {
      ...plan,
      updatedAt: new Date().toISOString(),
    };
    if (studentId === 'student-default') {
      this.get().dailyPlans[plan.date] = student.dailyPlans[plan.date];
    }
    this.persist();
  }

  // --- Daily Study Duration ---
  public static recordStudyTime(
    minutes: number,
    date?: string,
    studentId: string = 'student-default'
  ): number {
    const student = this.ensureStudent(studentId);
    if (!student.dailyStudyTime) {
      student.dailyStudyTime = {};
    }
    const today = date || formatDate(new Date());
    const prev = student.dailyStudyTime[today] || 0;
    const nextVal = Math.round((prev + minutes) * 100) / 100;
    student.dailyStudyTime[today] = nextVal;
    this.persist();
    return nextVal;
  }

  public static getRecentStudyTimes(
    studentId: string = 'student-default',
    days: number = 7
  ): Array<{
    date: string;
    label: string;
    weekday: string;
    minutes: number;
  }> {
    const student = this.ensureStudent(studentId);
    const map = student.dailyStudyTime || {};
    const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = formatDate(d);
      const isToday = i === 0;
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const weekday = isToday ? '今天' : weekDayNames[d.getDay()];
      const rawMinutes = map[dateStr] || 0;
      const minutes = Math.round(rawMinutes * 10) / 10;

      result.push({
        date: dateStr,
        label,
        weekday,
        minutes,
      });
    }

    return result;
  }

  // --- Daily Learned Words Tracking ---
  public static recordDailyLearnedWord(
    wordId: string,
    date?: string,
    studentId: string = 'student-default'
  ): void {
    const student = this.ensureStudent(studentId);
    if (!student.dailyLearnedWords) {
      student.dailyLearnedWords = {};
    }
    const today = date || new Date().toISOString().split('T')[0];
    student.dailyLearnedWords[today] = (student.dailyLearnedWords[today] || 0) + 1;
    this.persist();
  }

  public static getRecentLearnedWordCounts(
    studentId: string = 'student-default',
    days: number = 7
  ): Array<{
    date: string;
    label: string;
    weekday: string;
    count: number;
  }> {
    const student = this.ensureStudent(studentId);
    const map = student.dailyLearnedWords || {};
    const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === 0;
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const weekday = isToday ? '今天' : weekDayNames[d.getDay()];

      // 优先从 dailyLearnedWords 获取；如没有，也可按当天学习记录 updatedAt 智能聚合保底
      let count = map[dateStr] || 0;
      if (count === 0 && student.records) {
        const recordsOnDay = Object.values(student.records).filter(
          (r) => r.updatedAt && r.updatedAt.startsWith(dateStr)
        ).length;
        count = recordsOnDay;
      }

      result.push({
        date: dateStr,
        label,
        weekday,
        count,
      });
    }

    return result;
  }

  // --- Statistics (Per-Student) ---
  public static getStatistics(studentId: string = 'student-default') {
    const student = this.ensureStudent(studentId);
    const records = Object.values(student.records);
    const words = Object.values(this.get().words);

    const learnedCount = records.length;
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
    const recent7DaysTime = this.getRecentStudyTimes(studentId, 7);
    const recent7DaysWordCounts = this.getRecentLearnedWordCounts(studentId, 7);
    const todayStr = formatDate(new Date());
    const rawTodayMinutes = (student.dailyStudyTime && student.dailyStudyTime[todayStr]) || 0;
    const todayStudyMinutes = Math.round(rawTodayMinutes * 10) / 10;
    const totalStudyMinutes = student.dailyStudyTime
      ? Object.values(student.dailyStudyTime).reduce((a, b) => a + b, 0)
      : 0;

    return {
      totalVocabulary: words.length,
      learnedCount,
      masteredCount,
      learningCount: Math.max(0, learnedCount - masteredCount),
      totalAttempts,
      totalCorrect,
      accuracyRate,
      streakDays: student.settings.streakDays,
      totalPoints: student.settings.totalPoints,
      todayStudyMinutes,
      totalStudyMinutes: Math.round(totalStudyMinutes * 10) / 10,
      recent7DaysTime,
      recent7DaysWordCounts,
    };
  }

  // --- Admin Analytics (All Students) ---
  public static getAllStudentsAnalytics() {
    const db = this.get();
    const students = Object.values(db.users).filter((u) => u.role === 'student');
    const today = new Date().toISOString().split('T')[0];

    return students.map((stu) => {
      const data = this.ensureStudent(stu.id);
      const records = Object.values(data.records);
      const todayPlan = data.dailyPlans[today];

      const masteredCount = records.filter(
        (r) => r.reviewInterval >= MASTERY_INTERVAL_THRESHOLD && r.lastResult === true
      ).length;

      let attempts = 0;
      let corrects = 0;
      const wrongList: { word: string; attempts: number; wrong: number }[] = [];

      for (const r of records) {
        attempts += r.totalAttempts;
        corrects += r.correctCount;
        const wrongs = r.totalAttempts - r.correctCount;
        if (wrongs > 0) {
          const w = db.words[r.wordId];
          if (w) {
            wrongList.push({ word: w.word, attempts: r.totalAttempts, wrong: wrongs });
          }
        }
      }

      wrongList.sort((a, b) => b.wrong - a.wrong);
      const recent7DaysTime = this.getRecentStudyTimes(stu.id, 7);
      const todayStudyMinutes = (data.dailyStudyTime && data.dailyStudyTime[today]) || 0;
      const totalStudyMinutes = data.dailyStudyTime
        ? Object.values(data.dailyStudyTime).reduce((a, b) => a + b, 0)
        : 0;

      return {
        id: stu.id,
        username: stu.username,
        realName: stu.realName,
        status: stu.status,
        createdAt: stu.createdAt,
        streakDays: data.settings.streakDays,
        totalPoints: data.settings.totalPoints,
        learnedCount: records.length,
        masteredCount,
        learningCount: Math.max(0, records.length - masteredCount),
        accuracyRate: attempts > 0 ? Math.round((corrects / attempts) * 100) : 0,
        todayCompleted: !!todayPlan && todayPlan.isCompleted,
        todayStudyMinutes,
        totalStudyMinutes: Math.round(totalStudyMinutes * 10) / 10,
        recent7DaysTime,
        topWrongs: wrongList.slice(0, 5),
      };
    });
  }

  // --- Reset (Specific Student or Global) ---
  public static resetProgress(studentId: string = 'student-default'): void {
    const student = this.ensureStudent(studentId);
    student.records = {};
    student.dailyPlans = {};
    student.settings.streakDays = 0;
    student.settings.totalPoints = 0;
    student.settings.lastCompletedDate = null;

    if (studentId === 'student-default') {
      const db = this.get();
      db.records = {};
      db.dailyPlans = {};
      db.settings.streakDays = 0;
      db.settings.totalPoints = 0;
      db.settings.lastCompletedDate = null;
    }
    this.persist();
  }

  public static exportAll(): any {
    return this.get();
  }
}
