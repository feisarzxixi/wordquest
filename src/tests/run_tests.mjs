/**
 * 自动化测试运行器 (Zero-Dependency Node.js Test Suite)
 * 可直接执行: node src/tests/run_tests.mjs
 */

import { calculateNextReview, checkMasteryStatus } from '../lib/algorithms/srsScheduler.js';
import { maskSpelling, getMaskCount } from '../lib/algorithms/spellingMasker.js';
import { calculateNewWordsQuota, splitIntoBatches, generateDailyPlan } from '../lib/algorithms/planEngine.js';
import { parseCSV, guessFieldMapping, buildImportPreview } from '../lib/importer/FileDecoder.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

console.log('========================================');
console.log('🧪 WordQuest 核心算法自动化测试套件');
console.log('========================================\n');

// 1. SRS
console.log('--- 1. 艾宾浩斯复习算法 ---');
const base = new Date('2026-11-08');
const s1 = calculateNextReview(0, true, base);
assert(s1.nextInterval === 1 && !s1.isMastered, '初识答对升为 1 天');

const s2 = calculateNextReview(1, true, base);
assert(s2.nextInterval === 3, '1天晋升为 3 天');

const s3 = calculateNextReview(7, true, base);
assert(s3.nextInterval === 14 && s3.isMastered, '7天晋升为 14 天且达到【已掌握】标准');

const sWrong = calculateNextReview(14, false, base);
assert(sWrong.nextInterval === 1 && !sWrong.isMastered, '已掌握单词答错后强制重置为 1 天且不再掌握');

// 2. 拼写比例挖空
console.log('\n--- 2. 拼写比例挖空与确定性哈希 ---');
assert(getMaskCount(4) === 2, '4 字母短词挖空 2 个 (比例)');
assert(getMaskCount(7) === 3, '7 字母词挖空 3 个');
assert(getMaskCount(11) === 5, '11 字母长词挖空 5 个');

const m1 = maskSpelling('environment', 'seed-task-1');
const m2 = maskSpelling('environment', 'seed-task-1');
assert(m1.maskedDisplay === m2.maskedDisplay, '相同 seed 挖空完全相同 (刷新不改变)');

// 3. 计划与组块
console.log('\n--- 3. 每日学习计划排程与组块 ---');
assert(calculateNewWordsQuota(0.92, 'regular') === 15, '正确率 >= 85% 满额 15 词');
assert(calculateNewWordsQuota(0.79, 'regular') === 12, '正确率 75%~84% 配额 12 词');
assert(calculateNewWordsQuota(0.55, 'regular') === 5, '正确率 < 60% 锁定 5 词强攻坚');

const fakeDue = Array.from({ length: 40 }, (_, i) => ({ id: `d${i}`, word: `w${i}`, meaning: `m${i}` }));
const fakeNew = Array.from({ length: 15 }, (_, i) => ({ id: `n${i}`, word: `nw${i}`, meaning: `nm${i}` }));
const plan = generateDailyPlan(fakeDue, fakeNew, 0.9, 'regular', '2026-11-08');
assert(plan.totalWordCount === 30, '防雪崩：严格封顶 30 词');
assert(plan.newWordCount === 0, '到期复习词达 30 时，暂停排入新词');

const batches = splitIntoBatches(Array.from({ length: 14 }, (_, i) => ({ id: `${i}`, word: `w${i}`, meaning: `m${i}` })));
const allValidBatchSizes = batches.every((b) => b.length >= 3 && b.length <= 5);
assert(allValidBatchSizes, '认知科学组块：所有组均严格控制在 3~5 词');

// 4. 导入与解码
console.log('\n--- 4. 词库导入与数据清洗 ---');
const csv = '\uFEFFword,meaning\napple,苹果\napple,苹果重复\nbanana,香蕉';
const { headers, rows } = parseCSV(csv);
assert(headers[0] === 'word' && rows.length === 3, 'BOM 正常剥离并正确切分行');

const mapping = guessFieldMapping(headers);
const preview = buildImportPreview(rows, mapping, new Set());
assert(preview.validCount === 2 && preview.duplicateCount === 1, '去重检测正常 (2 有效, 1 重复)');

console.log('\n========================================');
console.log(`测试结果统计: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

if (failed > 0) process.exit(1);
