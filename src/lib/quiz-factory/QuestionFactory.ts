/**
 * 题型生成工厂 (Question Factory)
 * 纯逻辑解耦：支持单词常规题型与短语专属题型（语块拼装、介词挖空）
 */

import { BaseWord, QuizType, isPhrase } from '../algorithms/planEngine';
import { maskSpelling, MaskedSpellingResult } from '../algorithms/spellingMasker';

export interface ChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface PhraseBlocksData {
  correctTokens: string[];
  shuffledChips: string[];
}

export interface QuizPayload {
  taskId: string;
  wordId: string;
  word: BaseWord;
  quizType: QuizType;
  prompt: string;         // 题干主文字
  subPrompt?: string;     // 题干次要文字（例句翻译等）
  options?: ChoiceOption[];// 选择类题目的 4 个选项
  spellingData?: MaskedSpellingResult; // 拼写题专用数据
  phraseBlocksData?: PhraseBlocksData; // 短语积木专用数据
}

const COMMON_PREPOSITIONS = [
  'on', 'in', 'at', 'with', 'for', 'to', 'of', 'from',
  'about', 'after', 'up', 'down', 'out', 'off', 'away', 'by', 'into'
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class QuestionFactory {
  /**
   * 1. 词义选择题：看英文，选中文释义
   */
  static createMeaningChoice(
    word: BaseWord,
    pool: BaseWord[],
    taskId: string
  ): QuizPayload {
    const otherMeanings = pool
      .filter((w) => w.id !== word.id && w.meaning !== word.meaning)
      .map((w) => w.meaning);

    const shuffledOthers = shuffle(Array.from(new Set(otherMeanings)));
    const distractors = shuffledOthers.slice(0, 3);

    const fallbackDistractors = ['保护；保卫', '发现；发掘', '旅行；旅程', '依靠；取决于'];
    while (distractors.length < 3) {
      const fb = fallbackDistractors.find((d) => d !== word.meaning && !distractors.includes(d));
      if (fb) distractors.push(fb);
      else distractors.push(`选项 ${distractors.length + 1}`);
    }

    const options: ChoiceOption[] = shuffle([
      { id: 'correct', text: word.meaning, isCorrect: true },
      ...distractors.map((text, idx) => ({ id: `distractor-${idx}`, text, isCorrect: false })),
    ]);

    return {
      taskId,
      wordId: word.id,
      word,
      quizType: 'MEANING_CHOICE',
      prompt: word.word,
      subPrompt: word.phonetic || '',
      options,
    };
  }

  /**
   * 2. 听音辨词题：听发音，选英文文本
   */
  static createAudioChoice(
    word: BaseWord,
    pool: BaseWord[],
    taskId: string
  ): QuizPayload {
    const otherWords = pool
      .filter((w) => w.id !== word.id && w.word.toLowerCase() !== word.word.toLowerCase())
      .map((w) => w.word);

    const shuffledOthers = shuffle(Array.from(new Set(otherWords)));
    const distractors = shuffledOthers.slice(0, 3);

    const fallbackDistractors = ['protect', 'discover', 'journey', 'depend on'];
    while (distractors.length < 3) {
      const fb = fallbackDistractors.find(
        (d) => d.toLowerCase() !== word.word.toLowerCase() && !distractors.includes(d)
      );
      if (fb) distractors.push(fb);
      else distractors.push(`word-${distractors.length}`);
    }

    const options: ChoiceOption[] = shuffle([
      { id: 'correct', text: word.word, isCorrect: true },
      ...distractors.map((text, idx) => ({ id: `distractor-${idx}`, text, isCorrect: false })),
    ]);

    return {
      taskId,
      wordId: word.id,
      word,
      quizType: 'AUDIO_CHOICE',
      prompt: '点击喇叭听发音，选出你听到的词汇',
      subPrompt: word.pos ? `词性：${word.pos}` : '',
      options,
    };
  }

  /**
   * 3. 句子理解题：英文例句挖空，展示中文翻译
   */
  static createSentenceFill(
    word: BaseWord,
    pool: BaseWord[],
    taskId: string
  ): QuizPayload {
    if (!word.example || !word.translation) {
      return this.createMeaningChoice(word, pool, taskId);
    }

    const regex = new RegExp(`\\b${word.word}\\b`, 'i');
    let maskedSentence = word.example;
    if (regex.test(word.example)) {
      maskedSentence = word.example.replace(regex, '______');
    } else {
      return this.createMeaningChoice(word, pool, taskId);
    }

    const otherWords = pool
      .filter((w) => w.id !== word.id && w.word.toLowerCase() !== word.word.toLowerCase())
      .map((w) => w.word);

    const shuffledOthers = shuffle(Array.from(new Set(otherWords)));
    const distractors = shuffledOthers.slice(0, 3);

    const fallbackDistractors = ['prepare', 'protect', 'connect', 'take care of'];
    while (distractors.length < 3) {
      const fb = fallbackDistractors.find(
        (d) => d.toLowerCase() !== word.word.toLowerCase() && !distractors.includes(d)
      );
      if (fb) distractors.push(fb);
      else distractors.push(`word-${distractors.length}`);
    }

    const options: ChoiceOption[] = shuffle([
      { id: 'correct', text: word.word, isCorrect: true },
      ...distractors.map((text, idx) => ({ id: `distractor-${idx}`, text, isCorrect: false })),
    ]);

    return {
      taskId,
      wordId: word.id,
      word,
      quizType: 'SENTENCE_FILL',
      prompt: maskedSentence,
      subPrompt: word.translation,
      options,
    };
  }

  /**
   * 4. 拼写填空题（仅限单个单词使用，比例挖空）
   */
  static createSpelling(word: BaseWord, taskId: string): QuizPayload {
    const spellingData = maskSpelling(word.word, `${word.id}-${taskId}`);

    return {
      taskId,
      wordId: word.id,
      word,
      quizType: 'SPELLING',
      prompt: word.meaning,
      subPrompt: word.translation || word.example || '',
      spellingData,
    };
  }

  /**
   * 5. 短语专属：语块积木拼装题 (Phrase Blocks)
   * 将短语拆为单词卡片，学生依次点击拼装
   */
  static createPhraseBlocks(word: BaseWord, taskId: string): QuizPayload {
    const tokens = word.word.trim().split(/\s+/);
    // 打乱顺序，确保与原顺序不同
    let shuffled = shuffle([...tokens]);
    if (shuffled.join(' ') === tokens.join(' ') && tokens.length > 1) {
      shuffled.reverse();
    }

    return {
      taskId,
      wordId: word.id,
      word,
      quizType: 'PHRASE_BLOCKS',
      prompt: word.meaning,
      subPrompt: word.translation || '请按正确顺序轻点下方语块组装短语',
      phraseBlocksData: {
        correctTokens: tokens,
        shuffledChips: shuffled,
      },
    };
  }

  /**
   * 6. 短语专属：核心介词/副词挖空单选题 (Preposition Fill)
   * 针对中考重点考查的搭配（如 depend [on], look forward [to]）
   */
  static createPrepositionFill(
    word: BaseWord,
    pool: BaseWord[],
    taskId: string
  ): QuizPayload {
    const tokens = word.word.trim().split(/\s+/);
    // 寻找短语中的核心介词/小品词
    let targetPrepIndex = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (COMMON_PREPOSITIONS.includes(tokens[i].toLowerCase())) {
        targetPrepIndex = i;
        break;
      }
    }

    if (targetPrepIndex === -1) {
      // 若无常见介词，降级为语块拼装
      return this.createPhraseBlocks(word, taskId);
    }

    const correctPrep = tokens[targetPrepIndex].toLowerCase();
    const maskedTokens = [...tokens];
    maskedTokens[targetPrepIndex] = '______';
    const maskedPrompt = maskedTokens.join(' ');

    // 抽取 3 个干扰介词
    const otherPreps = COMMON_PREPOSITIONS.filter((p) => p !== correctPrep);
    const distractors = shuffle(otherPreps).slice(0, 3);

    const options: ChoiceOption[] = shuffle([
      { id: 'correct', text: correctPrep, isCorrect: true },
      ...distractors.map((text, idx) => ({ id: `prep-${idx}`, text, isCorrect: false })),
    ]);

    return {
      taskId,
      wordId: word.id,
      word,
      quizType: 'PREPOSITION_FILL',
      prompt: maskedPrompt,
      subPrompt: `搭配释义：${word.meaning}`,
      options,
    };
  }

  /**
   * 综合调度入口（自动进行短语分流与降级防护）
   */
  static createQuiz(
    type: QuizType,
    word: BaseWord,
    pool: BaseWord[],
    taskId: string
  ): QuizPayload {
    const isPhraseWord = isPhrase(word.word);

    // 短语严禁使用单字母拼写！
    if (isPhraseWord && type === 'SPELLING') {
      type = 'PHRASE_BLOCKS';
    }

    switch (type) {
      case 'PHRASE_BLOCKS':
        return this.createPhraseBlocks(word, taskId);
      case 'PREPOSITION_FILL':
        return this.createPrepositionFill(word, pool, taskId);
      case 'MEANING_CHOICE':
        return this.createMeaningChoice(word, pool, taskId);
      case 'AUDIO_CHOICE':
        return this.createAudioChoice(word, pool, taskId);
      case 'SENTENCE_FILL':
        return this.createSentenceFill(word, pool, taskId);
      case 'SPELLING':
        return this.createSpelling(word, taskId);
      default:
        return this.createMeaningChoice(word, pool, taskId);
    }
  }
}
