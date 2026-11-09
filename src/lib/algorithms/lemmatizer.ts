/**
 * 单词词元化、规则变形合并与语法词过滤引擎 (Lemmatization & Grammar Filter)
 * 1. 过滤纯元语法/说明性词汇 (verb, nouns, adjectives, infinitive 等)，避免作为死记硬背生词干扰正常学习
 * 2. 词元合并 (Lemmatization)：合并名词规则复数、动词规则三单、进行时及过去式至其词元 (Lemma)，杜绝同一词汇重复出现
 * 3. 提取派生词形数据 (forms)，用于时态/词性转换考题
 */

import { BaseWord } from './planEngine';

// 纯元语法与说明性词汇集合（不作为独立生词考点推送）
export const METAGRAMMAR_TERMS = new Set([
  'verb', 'verbs',
  'noun', 'nouns',
  'adjective', 'adjectives',
  'adverb', 'adverbs',
  'pronoun', 'pronouns',
  'preposition', 'prepositions',
  'conjunction', 'conjunctions',
  'infinitive', 'infinitives',
  'passive',
  'singular', 'plural',
  'comparative', 'superlative',
  'tense', 'tenses',
  'participle', 'participles',
  'gerund', 'gerunds',
  'clause', 'clauses',
  'subject', 'subjects',
  'predicate', 'predicates',
]);

/**
 * 判定是否为纯元语法/题目要求说明词
 */
export function isMetagrammarTerm(word: string): boolean {
  if (!word || typeof word !== 'string') return false;
  return METAGRAMMAR_TERMS.has(word.trim().toLowerCase());
}

/**
 * 尝试推导可能的词元原形候选项
 */
export function getPossibleBaseForms(word: string): string[] {
  const w = word.trim().toLowerCase();
  const candidates: string[] = [];

  // 1. 复数或三单变形
  if (w.endsWith('ies') && w.length > 4) {
    candidates.push(w.slice(0, -3) + 'y'); // possibilities -> possibility, cities -> city
  }
  if (w.endsWith('es') && w.length > 4) {
    candidates.push(w.slice(0, -2)); // boxes -> box, watches -> watch
    candidates.push(w.slice(0, -1)); // clauses -> clause
  }
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    candidates.push(w.slice(0, -1)); // schools -> school, verbs -> verb
  }

  // 2. 过去式或被动过去分词变形
  if (w.endsWith('ied') && w.length > 4) {
    candidates.push(w.slice(0, -3) + 'y'); // worried -> worry
  }
  if (w.endsWith('ed') && w.length > 4) {
    candidates.push(w.slice(0, -2)); // painted -> paint
    candidates.push(w.slice(0, -1)); // recycled -> recycle, relaxed -> relax
  }

  // 3. 现在分词/动名词变形
  if (w.endsWith('ing') && w.length > 5) {
    candidates.push(w.slice(0, -3)); // playing -> play
    candidates.push(w.slice(0, -3) + 'e'); // making -> make
  }

  return candidates;
}

export interface LemmatizedWordPool {
  primaryWords: BaseWord[];
  aliasToPrimaryId: Map<string, string>;
  wordFormsMap: Map<string, { plural?: string; past?: string; ing?: string }>;
}

/**
 * 对词库执行词元合并与元语法词汇清洗
 */
export function processLemmatization(words: BaseWord[]): LemmatizedWordPool {
  const wordMap = new Map<string, BaseWord>();
  for (const w of words) {
    wordMap.set(w.word.toLowerCase().trim(), w);
  }

  const primaryWords: BaseWord[] = [];
  const aliasToPrimaryId = new Map<string, string>();
  const wordFormsMap = new Map<string, { plural?: string; past?: string; ing?: string }>();

  // 记录已被合并为变形的词汇 ID
  const mergedIds = new Set<string>();

  for (const w of words) {
    const text = w.word.toLowerCase().trim();

    // 过滤掉元语法词汇
    if (isMetagrammarTerm(text)) {
      continue;
    }

    // 检查此词是否为某个已知原形的规则变形
    const candidates = getPossibleBaseForms(text);
    let foundBase: BaseWord | null = null;
    for (const cand of candidates) {
      const base = wordMap.get(cand);
      if (base && base.id !== w.id) {
        foundBase = base;
        break;
      }
    }

    if (foundBase) {
      // 记录别名映射
      aliasToPrimaryId.set(w.id, foundBase.id);
      mergedIds.add(w.id);

      // 将该变形挂载至原形词的 forms 属性中
      const forms = wordFormsMap.get(foundBase.id) || {};
      if (text.endsWith('s')) {
        forms.plural = w.word;
      } else if (text.endsWith('ed')) {
        forms.past = w.word;
      } else if (text.endsWith('ing')) {
        forms.ing = w.word;
      }
      wordFormsMap.set(foundBase.id, forms);
    }
  }

  // 收集所有未被合并的有效主词
  for (const w of words) {
    const text = w.word.toLowerCase().trim();
    if (!isMetagrammarTerm(text) && !mergedIds.has(w.id)) {
      const forms = wordFormsMap.get(w.id);
      primaryWords.push({
        ...w,
        ...(forms ? { forms } : {}),
      });
    }
  }

  return {
    primaryWords,
    aliasToPrimaryId,
    wordFormsMap,
  };
}
