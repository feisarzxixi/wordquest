import { describe, it, expect } from 'vitest';
import { calculateNextReview, checkMasteryStatus, evaluateCognitiveGrade } from '../lib/algorithms/srsScheduler';
import { maskSpelling, getMaskCount } from '../lib/algorithms/spellingMasker';
import {
  getAdaptiveNewWordQuota,
  splitIntoBatches,
  generateDailyPlan,
  isPhrase,
  assignQuizType,
  BaseWord
} from '../lib/algorithms/planEngine';
import { QuestionFactory } from '../lib/quiz-factory/QuestionFactory';
import { parseCSV, guessFieldMapping, buildImportPreview } from '../lib/importer/FileDecoder';
import { RESULT_AUTO_ADVANCE_MS } from '../config/learningRules';
import { LocalDB } from '../lib/db';

describe('1. 基础配置与艾宾浩斯复习算法 (SRS Tests)', () => {
  it('结果页停留时间配置为 3000ms (3.0 秒)', () => {
    expect(RESULT_AUTO_ADVANCE_MS).toBe(3000);
  });

  it('答对时阶梯递增: 1 -> 3 -> 7 -> 14 -> 30', () => {
    const base = new Date('2026-11-08');
    const step1 = calculateNextReview(0, true, base);
    expect(step1.nextInterval).toBe(1);
    expect(step1.isMastered).toBe(false);

    const step2 = calculateNextReview(1, true, base);
    expect(step2.nextInterval).toBe(3);

    const step3 = calculateNextReview(3, true, base);
    expect(step3.nextInterval).toBe(7);

    const step4 = calculateNextReview(7, true, base);
    expect(step4.nextInterval).toBe(14);
    expect(step4.isMastered).toBe(true);
  });

  it('生熟度等级细化判定 (生疏/巩固/掌握)', () => {
    // 生疏：间隔1天或答错
    expect(evaluateCognitiveGrade({ reviewInterval: 1, lastResult: true })).toBe('FRAGILE');
    expect(evaluateCognitiveGrade({ reviewInterval: 7, lastResult: false })).toBe('FRAGILE');
    // 巩固：间隔3或7且答对
    expect(evaluateCognitiveGrade({ reviewInterval: 3, lastResult: true })).toBe('PROGRESSING');
    expect(evaluateCognitiveGrade({ reviewInterval: 7, lastResult: true })).toBe('PROGRESSING');
    // 掌握：间隔 >= 14 且答对
    expect(evaluateCognitiveGrade({ reviewInterval: 14, lastResult: true })).toBe('MASTERED');
  });
});

describe('2. 认知负荷自适应配比算法 (Dynamic Load Throttling)', () => {
  it('未掌握负荷量 < 20: 顺畅快跑档 (新词满额)', () => {
    const { quota, tier } = getAdaptiveNewWordQuota(12, 15);
    expect(tier).toBe('FAST');
    expect(quota).toBe(15);
  });

  it('未掌握负荷量 20 ~ 29: 稳健标准档', () => {
    const { quota, tier } = getAdaptiveNewWordQuota(25, 15);
    expect(tier).toBe('STANDARD');
    expect(quota).toBe(12);
  });

  it('未掌握负荷量 30 ~ 49: 减速攻坚档 (10:1 稀释新词)', () => {
    const { quota, tier } = getAdaptiveNewWordQuota(35, 15);
    expect(tier).toBe('REDUCE');
    expect(quota).toBeLessThanOrEqual(2);
  });

  it('未掌握负荷量 >= 50: 彻底熔断档 (0% 新词，纯旧词消灭)', () => {
    const { quota, tier } = getAdaptiveNewWordQuota(52, 15);
    expect(tier).toBe('FREEZE');
    expect(quota).toBe(0); // 绝对不增加新词！
  });
});

describe('3. 常用短语针对性练习体系 (Phrase System Tests)', () => {
  it('准确判定单字 vs 短语 (含空格判定)', () => {
    expect(isPhrase('take care of')).toBe(true);
    expect(isPhrase('depend on')).toBe(true);
    expect(isPhrase('apple')).toBe(false);
    expect(isPhrase('environment')).toBe(false);
  });

  it('短语绝对不分配单字母填空 (SPELLING)，自动分配短语题型', () => {
    const phraseWord: BaseWord = {
      id: 'p1',
      word: 'look forward to',
      meaning: '盼望；期待',
    };
    const chosenType = assignQuizType(phraseWord, 3);
    expect(chosenType).not.toBe('SPELLING');
  });

  it('语块积木拼装题 (Phrase Blocks) 生成正确语块与乱序卡片', () => {
    const phraseWord: BaseWord = {
      id: 'p2',
      word: 'take care of',
      meaning: '照顾；照料',
    };
    const quiz = QuestionFactory.createPhraseBlocks(phraseWord, 'task-pb-1');
    expect(quiz.quizType).toBe('PHRASE_BLOCKS');
    expect(quiz.phraseBlocksData?.correctTokens).toEqual(['take', 'care', 'of']);
    expect(quiz.phraseBlocksData?.shuffledChips.length).toBe(3);
  });

  it('核心介词挖空题 (Preposition Fill) 正确挖空介词并生成干扰介词', () => {
    const phraseWord: BaseWord = {
      id: 'p3',
      word: 'depend on',
      meaning: '依靠；取决于',
    };
    const quiz = QuestionFactory.createPrepositionFill(phraseWord, [], 'task-prep-1');
    expect(quiz.quizType).toBe('PREPOSITION_FILL');
    expect(quiz.prompt).toContain('______');
    const correctOption = quiz.options?.find((o) => o.isCorrect);
    expect(correctOption?.text).toBe('on');
    expect(quiz.options?.length).toBe(4);
  });
});

describe('4. 拼写题比例挖空与确定性哈希 (Spelling Masker Tests)', () => {
  it('挖空数量符合比例规则 (<=4短词, 5-8常规词, >8长词)', () => {
    expect(getMaskCount(4)).toBe(2);
    expect(getMaskCount(7)).toBe(3);
    expect(getMaskCount(11)).toBe(5);
  });

  it('确定性哈希：相同的 seed 保证绝对相同的挖空位置', () => {
    const res1 = maskSpelling('environment', 'seed-task-101');
    const res2 = maskSpelling('environment', 'seed-task-101');
    expect(res1.maskedDisplay).toBe(res2.maskedDisplay);
  });
});

describe('5. 词库导入与数据清洗 (File Decoder Tests)', () => {
  it('正确剥离 UTF-8 BOM 并解析 CSV 字段', () => {
    const csvContent = '\uFEFFword,meaning,phonetic\napple,苹果,/ˈæpl/\nbanana,香蕉,/bəˈnɑːnə/';
    const { headers, rows } = parseCSV(csvContent);
    expect(headers).toEqual(['word', 'meaning', 'phonetic']);
    expect(rows.length).toBe(2);
  });
});

describe('6. 单词配图精准预解析与零闪烁零上跳 (Image Resolver Tests)', () => {
  it('有图单词返回对应静态文件路径，无图单词返回 null (杜绝 404 异步探测塌陷)', async () => {
    const { resolveWordImage } = await import('../lib/utils/imageResolver');
    // public/words/asked.png 存在
    expect(resolveWordImage('asked')).toBe('/words/asked.png');
    // 大小写不敏感
    expect(resolveWordImage('ASKED')).toBe('/words/asked.png');
    // 不存在的单词返回 null，前端直接不渲染图片容器，零占位零跳动
    expect(resolveWordImage('non_existent_xyz_word_12345')).toBeNull();
    // 显式指定自定义图片优先使用
    expect(resolveWordImage('custom', 'https://example.com/custom.png')).toBe('https://example.com/custom.png');
  });

  it('客户端词图字典能够同步检索并判定有无配图', async () => {
    const { setClientWordImages, getClientWordImage, isImagePreloaded, preloadImage, preloadWordImages } = await import('../lib/images/clientImageCache');
    setClientWordImages({
      camping: '/words/camping.png',
      'look after': '/words/look_after.png',
    });
    expect(getClientWordImage('camping')).toBe('/words/camping.png');
    expect(getClientWordImage('CAMPING')).toBe('/words/camping.png');
    expect(getClientWordImage('look_after')).toBe('/words/look_after.png');
    expect(getClientWordImage('unknown_word')).toBeNull();

    // 智能预加载 API 测试 (服务端/环境无 window 时安全降级)
    expect(isImagePreloaded('/words/camping.png')).toBe(false);
    await preloadImage('/words/camping.png');
    preloadWordImages([{ word: 'camping' }, 'look after', null]);
  });
});

describe('7. 词元合并、语法过滤与 8 词闭环考点测试 (Lemmatization & 8-Word Batches)', () => {
  it('纯元语法词汇被正确识别并过滤 (verb, verbs, nouns, infinitive 等)', async () => {
    const { isMetagrammarTerm, processLemmatization } = await import('../lib/algorithms/lemmatizer');
    expect(isMetagrammarTerm('verb')).toBe(true);
    expect(isMetagrammarTerm('verbs')).toBe(true);
    expect(isMetagrammarTerm('adjectives')).toBe(true);
    expect(isMetagrammarTerm('challenge')).toBe(false);

    const rawWords: BaseWord[] = [
      { id: 'w1', word: 'verb', meaning: '动词' },
      { id: 'w2', word: 'verbs', meaning: '动词' },
      { id: 'w3', word: 'school', meaning: '学校' },
      { id: 'w4', word: 'schools', meaning: '学校' },
      { id: 'w5', word: 'enjoy', meaning: '享受' },
      { id: 'w6', word: 'enjoyed', meaning: '享受（过去式）' },
    ];

    const result = processLemmatization(rawWords);
    // 元语法词 verb, verbs 被过滤
    expect(result.primaryWords.some(w => w.word === 'verb')).toBe(false);
    expect(result.primaryWords.some(w => w.word === 'verbs')).toBe(false);
    // 规则变形被合并为原形属性
    expect(result.primaryWords.some(w => w.word === 'school')).toBe(true);
    expect(result.primaryWords.some(w => w.word === 'schools')).toBe(false);
    const schoolWord = result.primaryWords.find(w => w.word === 'school');
    expect(schoolWord?.forms?.plural).toBe('schools');
  });

  it('每组切分为 8 个单词的认知批次 (TARGET = 8)', () => {
    const dummyWords: BaseWord[] = Array.from({ length: 16 }, (_, i) => ({
      id: `w-${i}`,
      word: `word${i}`,
      meaning: `含义${i}`,
    }));

    const batches = splitIntoBatches(dummyWords);
    expect(batches.length).toBe(2);
    expect(batches[0].length).toBe(8);
    expect(batches[1].length).toBe(8);
  });

  it('新题型正确生成：词性辨析 (PART_OF_SPEECH) 与时态转换 (FORM_TRANSFORMATION)', () => {
    const verbWord: BaseWord = {
      id: 'v1',
      word: 'improve',
      meaning: '改善；提高',
      pos: 'v.',
    };
    const pool: BaseWord[] = [
      verbWord,
      { id: 'n1', word: 'challenge', meaning: '挑战', pos: 'n.' },
      { id: 'a1', word: 'rich', meaning: '富有的', pos: 'adj.' },
      { id: 'adv1', word: 'quietly', meaning: '安静地', pos: 'adv.' },
    ];

    // 词性辨析题
    const posQuiz = QuestionFactory.createPartOfSpeech(verbWord, pool, 'pos-task-1');
    expect(posQuiz.quizType).toBe('PART_OF_SPEECH');
    expect(posQuiz.prompt).toContain('动词');
    expect(posQuiz.options?.find(o => o.isCorrect)?.text).toContain('improve');

    // 词形时态题
    const formQuiz = QuestionFactory.createFormTransformation(verbWord, pool, 'form-task-1');
    expect(formQuiz.quizType).toBe('FORM_TRANSFORMATION');
    expect(formQuiz.prompt).toContain('过去式');
    expect(formQuiz.options?.find(o => o.isCorrect)?.text).toBe('improved');
  });
});

describe('8. 数据自愈与持久化同步 (Dual-Layer Sync Tests)', () => {
  it('从历史备份快照中自愈恢复学习记录与掌握度', () => {
    const studentId = 'test-sync-student';
    LocalDB.resetProgress(studentId);

    const backupPlan = {
      id: 'plan-2026-11-09',
      date: '2026-11-09',
      difficulty: 'regular',
      targetNewWordCount: 8,
      totalWordCount: 8,
      isCompleted: true,
      bonusAwarded: true,
      currentBatchIndex: 0,
      currentTaskIndex: 8,
      batches: [
        {
          batchIndex: 0,
          wordIds: ['w1', 'w2'],
          words: [
            { id: 'w1', word: 'challenge', meaning: '挑战' },
            { id: 'w2', word: 'enjoy', meaning: '享受' },
          ],
          testTasks: [
            {
              taskId: 't1',
              wordId: 'w1',
              word: { id: 'w1', word: 'challenge', meaning: '挑战' },
              taskType: 'ENG_TO_CHN_CHOICE',
              isAnswered: true,
              isFirstTryCorrect: true,
              scoreAwarded: true,
            },
            {
              taskId: 't2',
              wordId: 'w2',
              word: { id: 'w2', word: 'enjoy', meaning: '享受' },
              taskType: 'CHN_TO_ENG_CHOICE',
              isAnswered: true,
              isFirstTryCorrect: false,
              scoreAwarded: false,
            },
          ],
        },
      ],
      createdAt: '2026-11-09T10:00:00.000Z',
      updatedAt: '2026-11-09T10:30:00.000Z',
    };

    const res = LocalDB.syncStudentData(studentId, undefined, [backupPlan]);
    expect(res.restoredCount).toBe(2);
    expect(res.student.records['w1']).toBeDefined();
    expect(res.student.records['w1'].correctCount).toBe(1);
    expect(res.student.records['w1'].lastResult).toBe(true);
    expect(res.student.records['w2'].lastResult).toBe(false);
    expect(res.student.dailyPlans['2026-11-09']).toBeDefined();
    expect(res.student.settings.streakDays).toBeGreaterThanOrEqual(1);
  });
});

