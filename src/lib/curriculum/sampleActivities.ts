import { WorkbookActivity } from './types';

export const SAMPLE_WORKBOOK_ACTIVITIES: WorkbookActivity[] = [
  // 1. 【E 语法规则与形式填空】Unit 2 Use of English, p.28
  {
    id: 'cge7-u02-act-009',
    unit: 2,
    lesson: 'Use of English',
    page: 28,
    category: 'E',
    instruction: 'Write at, on or in in the gaps.',
    instructionZh: '在空格中填入 at、on 或 in。',
    grammarFocus: 'Prepositions of time and place (at, on, in)',
    items: [
      {
        id: 'u02-e1',
        prompt: '1',
        contextPrefix: 'The science festival starts ',
        contextSuffix: ' 9 o’clock in the morning.',
        correctAnswer: 'at',
        grammarRuleHint: '具体的具体时刻点（如 9 o’clock）前使用介词 at。',
        errorCategory: 'PREPOSITION',
        explanation: 'at 9 o’clock 表示具体时间点。',
      },
      {
        id: 'u02-e2',
        prompt: '2',
        contextPrefix: 'Our school football match is ',
        contextSuffix: ' Friday afternoon.',
        correctAnswer: 'on',
        grammarRuleHint: '具体的某一天或特定某一天的上/下午前使用介词 on。',
        errorCategory: 'PREPOSITION',
        explanation: 'on Friday afternoon 表示星期五下午（具体某一天的时段）。',
      },
      {
        id: 'u02-e3',
        prompt: '3',
        contextPrefix: 'We usually travel to the mountains ',
        contextSuffix: ' July.',
        correctAnswer: 'in',
        grammarRuleHint: '月份、年份、季节前使用介词 in。',
        errorCategory: 'PREPOSITION',
        explanation: 'in July 表示在七月份。',
      },
    ],
  },

  // 2. 【F 语序重组与连词成句】Unit 1 Use of English, p.14
  {
    id: 'cge7-u01-act-011',
    unit: 1,
    lesson: 'Use of English',
    page: 14,
    category: 'F',
    instruction: 'Order the words to make questions.',
    instructionZh: '把打乱的单词重新排序组成疑问句。',
    grammarFocus: 'Question word order & auxiliary verbs',
    items: [
      {
        id: 'u01-f1',
        prompt: '1',
        tokens: ['Where', 'did', 'you', 'go', 'on', 'holiday?'],
        correctAnswer: 'Where did you go on holiday?',
        grammarRuleHint: '疑问词 + 助动词 (did) + 主语 (you) + 动词原形 (go) + 状语。',
        errorCategory: 'WORD_ORDER',
        explanation: '一般过去时特殊疑问句：疑问词 + did + 主语 + 动词原形。',
      },
      {
        id: 'u01-f2',
        prompt: '2',
        tokens: ['How', 'long', 'have', 'you', 'lived', 'here?'],
        correctAnswer: 'How long have you lived here?',
        grammarRuleHint: 'How long + have/has + 主语 + 过去分词 (lived) + 地点状语。',
        errorCategory: 'WORD_ORDER',
        explanation: '现在完成时疑问句：How long + have + you + lived + here?',
      },
    ],
  },

  // 3. 【C 词组搭配与多词动词】Unit 3 Use of English, p.44
  {
    id: 'cge7-u03-act-005',
    unit: 3,
    lesson: 'Use of English',
    page: 44,
    category: 'C',
    instruction: 'Complete the sentences using a word from A and a word from B.',
    instructionZh: '从A、B两栏各选一个词完成句子（多词动词）。',
    grammarFocus: 'Multi-word verbs (Phrasal verbs)',
    items: [
      {
        id: 'u03-c1',
        prompt: '1',
        contextPrefix: 'Please remember to ',
        contextSuffix: ' the lights when you leave the classroom.',
        correctAnswer: 'turn off',
        grammarRuleHint: '关灯在英语中固定使用多词动词 turn off。',
        errorCategory: 'WORD_ORDER',
        explanation: 'turn off 为可分多词动词，表示关闭电源/灯光。',
      },
      {
        id: 'u03-c2',
        prompt: '2',
        contextPrefix: 'I will ',
        contextSuffix: ' this difficult challenge and do my best.',
        correctAnswer: 'take on',
        grammarRuleHint: '接受挑战、承担任务固定使用 take on。',
        errorCategory: 'PREPOSITION',
        explanation: 'take on a challenge 意为接受一项挑战。',
      },
    ],
  },

  // 4. 【G 改错、句型转换与合并】Unit 1 Use of English, p.12
  {
    id: 'cge7-u01-act-013',
    unit: 1,
    lesson: 'Use of English',
    page: 12,
    category: 'G',
    instruction: 'Find and correct the mistakes in the sentences.',
    instructionZh: '找出句中的错误并改正。',
    grammarFocus: 'Present simple vs Present continuous & Subject-verb agreement',
    items: [
      {
        id: 'u01-g1',
        prompt: '1',
        rawSentenceWithMistake: 'My brother don’t like waking up early in the morning.',
        mistakeWord: 'don’t',
        correctAnswer: 'doesn’t',
        grammarRuleHint: '主语 My brother 是第三人称单数，否定句助动词应为 doesn’t 而不是 don’t。',
        errorCategory: 'SUBJECT_VERB',
        explanation: '单数第三人称主语在一般现在时否定句中与 doesn’t 连用。',
      },
      {
        id: 'u01-g2',
        prompt: '2',
        rawSentenceWithMistake: 'Look! The students is playing basketball in the yard.',
        mistakeWord: 'is',
        correctAnswer: 'are',
        grammarRuleHint: '主语 The students 为复数名词，be 动词应用 are。',
        errorCategory: 'SUBJECT_VERB',
        explanation: '复数主语 students + are playing。',
      },
    ],
  },

  // 5. 【I 语篇完形与段落补全】Unit 2 Lesson 2.6, p.33 (原书经典每第7词挖空)
  {
    id: 'cge7-u02-act-017',
    unit: 2,
    lesson: '2.6',
    page: 33,
    category: 'I',
    instruction: 'Every seventh word in the dialogue is missing. Write a suitable word in each gap.',
    instructionZh: '对话中每第七个单词被删去，请在每个空格填入合适的词。',
    grammarFocus: 'Discourse cohesion & word predictability',
    passage:
      'Jack: Hi Sophie! Are you going to [1] school concert tonight?\nSophie: Yes, I [2]! I have been practicing my violin [3] whole week.\nJack: That is wonderful. [4] tickets are five pounds each, right?\nSophie: [5], but students get a fifty percent [6].',
    items: [
      {
        id: 'u02-i1',
        prompt: '[1]',
        correctAnswer: 'the',
        grammarRuleHint: '特指今晚那场具体的学校音乐会，需使用定冠词 the。',
        explanation: 'the school concert 特指今晚的音乐会。',
      },
      {
        id: 'u02-i2',
        prompt: '[2]',
        correctAnswer: 'am',
        grammarRuleHint: '对 "Are you going to...?" 的肯定简短回答是 "Yes, I am!"。',
        explanation: '简短回答时态对应：Yes, I am.',
      },
      {
        id: 'u02-i3',
        prompt: '[3]',
        correctAnswer: 'the',
        grammarRuleHint: '"整个星期"固定表达为 the whole week。',
        explanation: 'the whole week 固定表达。',
      },
    ],
  },

  // 6. 【D 阅读理解与信息提取】Unit 1 Lesson 1.1, p.8
  {
    id: 'cge7-u01-act-007',
    unit: 1,
    lesson: '1.1',
    page: 8,
    category: 'D',
    instruction: 'Read the text about Japan. Then write yes or no beside each of the sentences.',
    instructionZh: '阅读关于日本的短文，在每句旁写 yes 或 no。',
    grammarFocus: 'Factual information scanning & evidence retrieval',
    passage:
      'Japan is an island country located in East Asia. It is made up of four main islands: Honshu, Hokkaido, Kyushu, and Shikoku. The capital city is Tokyo, which is one of the most populated cities in the world. High-speed bullet trains, known as Shinkansen, connect the major cities smoothly and punctually.',
    items: [
      {
        id: 'u01-d1',
        prompt: '1. Japan consists of five main islands.',
        correctAnswer: 'no',
        evidenceAnchor: 'It is made up of four main islands: Honshu, Hokkaido, Kyushu, and Shikoku.',
        explanation: '原文明确说明是 4 个主岛 (four main islands)，而不是 5 个。',
      },
      {
        id: 'u01-d2',
        prompt: '2. Tokyo is the capital of Japan.',
        correctAnswer: 'yes',
        evidenceAnchor: 'The capital city is Tokyo',
        explanation: '原文与题干完全一致：The capital city is Tokyo。',
      },
    ],
  },
];
