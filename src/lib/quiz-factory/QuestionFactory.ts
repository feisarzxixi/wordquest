/**
 * 题型生成工厂 (Question Factory)
 * 纯逻辑解耦：支持单词常规题型与短语专属题型（语块拼装、介词挖空）
 * 新增 Workbook 针对性考题：词性辨析 (PART_OF_SPEECH)、词形时态变换 (FORM_TRANSFORMATION)、语法功能理解 (GRAMMAR_USAGE)
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

export interface MatchingPair {
  id: string;
  word: string;
  meaning: string;
}

export interface MatchingQuizData {
  pairs: MatchingPair[];
  shuffledWords: { id: string; text: string }[];
  shuffledMeanings: { id: string; text: string }[];
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
  matchingData?: MatchingQuizData;     // 连线配对题专用数据
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
    let targetPrepIndex = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (COMMON_PREPOSITIONS.includes(tokens[i].toLowerCase())) {
        targetPrepIndex = i;
        break;
      }
    }

    if (targetPrepIndex === -1) {
      return this.createPhraseBlocks(word, taskId);
    }

    const correctPrep = tokens[targetPrepIndex].toLowerCase();
    const maskedTokens = [...tokens];
    maskedTokens[targetPrepIndex] = '______';
    const maskedPrompt = maskedTokens.join(' ');

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
   * 7. 连线配对题：左边 4 个英语单词/短语，右边 4 个中文翻译
   */
  static createMatchingQuiz(
    word: BaseWord,
    pool: BaseWord[],
    taskId: string
  ): QuizPayload {
    const otherWords = pool.filter((w) => w.id !== word.id);
    const shuffledOthers = shuffle(otherWords);
    const selectedWords: BaseWord[] = [word, ...shuffledOthers.slice(0, 3)];

    const fallbacks: BaseWord[] = [
      { id: 'fb-1', word: 'challenge', meaning: '挑战' },
      { id: 'fb-2', word: 'past', meaning: '过去的；一般过去时' },
      { id: 'fb-3', word: 'present', meaning: '现在的；礼物' },
      { id: 'fb-4', word: 'enjoy', meaning: '享受；喜欢' },
    ];
    for (const fb of fallbacks) {
      if (selectedWords.length >= 4) break;
      if (!selectedWords.find((w) => w.word.toLowerCase() === fb.word.toLowerCase())) {
        selectedWords.push(fb);
      }
    }

    const pairs: MatchingPair[] = selectedWords.slice(0, 4).map((w) => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning,
    }));

    const shuffledWords = shuffle(pairs.map((p) => ({ id: p.id, text: p.word })));
    const shuffledMeanings = shuffle(pairs.map((p) => ({ id: p.id, text: p.meaning })));

    return {
      taskId,
      wordId: word.id,
      word,
      quizType: 'MATCHING',
      prompt: '连线配对题',
      subPrompt: '点击左边的英文单词/短语，再点击右边对应的中文翻译进行连线配对',
      matchingData: {
        pairs,
        shuffledWords,
        shuffledMeanings,
      },
    };
  }

  /**
   * 8. 词性辨析题 (Part of Speech) - 真实 Workbook 核心题型
   */
  static createPartOfSpeech(
    word: BaseWord,
    pool: BaseWord[],
    taskId: string
  ): QuizPayload {
    let targetPosName = '名词 (Noun)';
    let posKey = 'n';

    if (word.pos?.includes('v')) {
      targetPosName = '动词 (Verb)';
      posKey = 'v';
    } else if (word.pos?.includes('adj')) {
      targetPosName = '形容词 (Adjective)';
      posKey = 'adj';
    } else if (word.pos?.includes('adv')) {
      targetPosName = '副词 (Adverb)';
      posKey = 'adv';
    }

    // 从词池中筛选不同词性的干扰项
    const otherWords = pool.filter(
      (w) => w.id !== word.id && w.pos && !w.pos.includes(posKey)
    );
    const shuffledDistractors = shuffle(otherWords).slice(0, 3);

    const fallbackDistractors = [
      { text: 'quickly (快地)', isCorrect: false },
      { text: 'beautiful (美丽的)', isCorrect: false },
      { text: 'decision (决定)', isCorrect: false },
      { text: 'explore (探索)', isCorrect: false },
    ];

    const distractors: ChoiceOption[] = shuffledDistractors.map((w, idx) => ({
      id: `pos-distractor-${idx}`,
      text: `${w.word} (${w.meaning.split(/；|;/)[0]})`,
      isCorrect: false,
    }));

    while (distractors.length < 3) {
      const fb = fallbackDistractors.find((f) => !distractors.some((d) => d.text.startsWith(f.text.split(' ')[0])));
      if (fb) {
        distractors.push({ id: `pos-fb-${distractors.length}`, text: fb.text, isCorrect: false });
      } else {
        break;
      }
    }

    const options: ChoiceOption[] = shuffle([
      { id: 'correct', text: `${word.word} (${word.meaning.split(/；|;/)[0]})`, isCorrect: true },
      ...distractors,
    ]);

    return {
      taskId,
      wordId: word.id,
      word,
      quizType: 'PART_OF_SPEECH',
      prompt: `下列选项中，哪一个是【${targetPosName}】？`,
      subPrompt: `考查考点：词性识别与句子语法成分对应`,
      options,
    };
  }

  /**
   * 9. 词形与时态转换题 (Form / Tense Transformation) - 真实 Workbook 语法题
   */
  static createFormTransformation(
    word: BaseWord,
    pool: BaseWord[],
    taskId: string
  ): QuizPayload {
    const isVerb = word.pos?.includes('v');
    const baseText = word.word.trim();

    if (isVerb || word.forms?.past) {
      // 考查动词过去式
      const correctPast = word.forms?.past || (
        baseText.endsWith('e') ? `${baseText}d` :
        baseText.endsWith('y') && !/[aeiou]y$/i.test(baseText) ? `${baseText.slice(0, -1)}ied` :
        `${baseText}ed`
      );

      const d1 = baseText.endsWith('e') ? `${baseText}ed` : `${baseText}d`;
      const d2 = `${baseText}ing`;
      const d3 = `${baseText}s`;

      const options: ChoiceOption[] = shuffle([
        { id: 'correct', text: correctPast, isCorrect: true },
        { id: 'd1', text: d1, isCorrect: false },
        { id: 'd2', text: d2, isCorrect: false },
        { id: 'd3', text: d3, isCorrect: false },
      ].filter((v, idx, arr) => arr.findIndex(t => t.text === v.text) === idx));

      return {
        taskId,
        wordId: word.id,
        word,
        quizType: 'FORM_TRANSFORMATION',
        prompt: `请选出动词 【${baseText}】 的正确一般过去式 (Past Simple) 形式：`,
        subPrompt: `动词含义：${word.meaning}`,
        options,
      };
    } else {
      // 考查名词规则复数
      const correctPlural = word.forms?.plural || (
        baseText.endsWith('y') && !/[aeiou]y$/i.test(baseText) ? `${baseText.slice(0, -1)}ies` :
        baseText.endsWith('s') || baseText.endsWith('ch') || baseText.endsWith('sh') || baseText.endsWith('x') ? `${baseText}es` :
        `${baseText}s`
      );

      const d1 = `${baseText}es`;
      const d2 = `${baseText}'s`;
      const d3 = `${baseText}ies`;

      const options: ChoiceOption[] = shuffle([
        { id: 'correct', text: correctPlural, isCorrect: true },
        { id: 'd1', text: d1, isCorrect: false },
        { id: 'd2', text: d2, isCorrect: false },
        { id: 'd3', text: d3, isCorrect: false },
      ].filter((v, idx, arr) => arr.findIndex(t => t.text === v.text) === idx));

      return {
        taskId,
        wordId: word.id,
        word,
        quizType: 'FORM_TRANSFORMATION',
        prompt: `请选出名词 【${baseText}】 的正确规则复数 (Plural) 形式：`,
        subPrompt: `名词含义：${word.meaning}`,
        options,
      };
    }
  }

  /**
   * 10. Workbook 经典语法理解题 (Grammar Usage)
   */
  static createGrammarUsage(
    word: BaseWord,
    taskId: string
  ): QuizPayload {
    const text = word.word.toLowerCase();

    const grammarQuestions = [
      {
        keyword: 'past',
        prompt: '在英语中，【一般过去时 (Past Simple)】最核心的用法是：',
        subPrompt: '语法考点：过去时态的表达范围与时间状语搭配',
        correct: '表示在过去特定时间发生并已结束的动作或状态',
        distractors: [
          '表示说话时刻正在进行的动作',
          '表示对将来发生的事情做出的打算或预测',
          '表示从过去一直持续到现在的动作并对现在造成影响',
        ],
      },
      {
        keyword: 'present',
        prompt: '【一般现在时 (Present Simple)】常用于下列哪种语境？',
        subPrompt: '语法考点：现在时态的基本表达功能',
        correct: '表示经常性、习惯性的动作、客观事实或客观真理',
        distractors: [
          '表示过去已经完成且与现在无关的事情',
          '表示正在发生的瞬时动作',
          '表示过去某时刻正在发生的事情',
        ],
      },
      {
        keyword: 'passive',
        prompt: '在英语句子中，【被动语态 (Passive Voice)】的基本动词构成是：',
        subPrompt: '语法考点：被动语态核心结构',
        correct: 'be 动词 + 过去分词 (done)',
        distractors: [
          'have / has + 动词原形',
          'will + 过去分词 (done)',
          'be 动词 + 动词-ing (现在分词)',
        ],
      },
      {
        keyword: 'default',
        prompt: `在句子 "Yesterday, they ______ (${word.word}) the project successfully." 中，空格处动词应使用什么时态？`,
        subPrompt: `根据时间状语 Yesterday 判断时态`,
        correct: '一般过去时 (Past Simple)',
        distractors: [
          '一般现在时 (Present Simple)',
          '现在进行时 (Present Continuous)',
          '一般将来时 (Future Simple)',
        ],
      },
    ];

    let match = grammarQuestions.find((q) => text.includes(q.keyword));
    if (!match) {
      match = grammarQuestions[grammarQuestions.length - 1];
    }

    const options: ChoiceOption[] = shuffle([
      { id: 'correct', text: match.correct, isCorrect: true },
      ...match.distractors.map((text, idx) => ({ id: `gram-${idx}`, text, isCorrect: false })),
    ]);

    return {
      taskId,
      wordId: word.id,
      word,
      quizType: 'GRAMMAR_USAGE',
      prompt: match.prompt,
      subPrompt: match.subPrompt,
      options,
    };
  }

  /**
   * 综合调度入口（自动进行短语分流与针对性考题匹配）
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
      case 'MATCHING':
        return this.createMatchingQuiz(word, pool, taskId);
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
      case 'PART_OF_SPEECH':
        return this.createPartOfSpeech(word, pool, taskId);
      case 'FORM_TRANSFORMATION':
        return this.createFormTransformation(word, pool, taskId);
      case 'GRAMMAR_USAGE':
        return this.createGrammarUsage(word, taskId);
      default:
        return this.createMeaningChoice(word, pool, taskId);
    }
  }
}
