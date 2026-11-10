/**
 * Cambridge Global English 7 Workbook 题型数据标准规范 (Curriculum Activity Schema)
 * 覆盖全书 350 道题块的 12 大题型类别 (A ~ L)
 */

export type ActivityCategory =
  | 'A' // 词汇识别与词形拼写
  | 'B' // 词汇语境填空与辨析
  | 'C' // 词组搭配与多词动词
  | 'D' // 阅读理解与信息提取
  | 'E' // 语法规则与形式填空
  | 'F' // 语序重组与连词成句
  | 'G' // 改错、句型转换与合并
  | 'H' // 匹配、分类与排序
  | 'I' // 语篇完形与段落补全
  | 'J' // 对话补全与交际表达
  | 'K' // 写作组织与开放表达
  | 'L'; // 图表、数字与数据解读

export const CATEGORY_DEFINITIONS: Record<
  ActivityCategory,
  {
    name: string;
    totalBlocks: number;
    weight: number;
    badgeColor: string;
    description: string;
  }
> = {
  A: {
    name: '词汇识别与词形拼写',
    totalBlocks: 48,
    weight: 0.137,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: '从词义到词形建立双向联系，定义匹配、字母重组、拼写校验',
  },
  B: {
    name: '词汇语境填空与辨析',
    totalBlocks: 41,
    weight: 0.117,
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: '放入句子、短文或对话中，词库填空、多选一与上下文推断',
  },
  C: {
    name: '词组搭配与多词动词',
    totalBlocks: 21,
    weight: 0.06,
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: '固定搭配、动词短语 (multi-word verbs)、代词宾语位置语序',
  },
  D: {
    name: '阅读理解与信息提取',
    totalBlocks: 33,
    weight: 0.094,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: '篇章阅读、事实提取、Yes/No判断、原文证据句回链',
  },
  E: {
    name: '语法规则与形式填空',
    totalBlocks: 50,
    weight: 0.143,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: '全书最高频考点：时态变形、介词选择、比较级、语态规则应用',
  },
  F: {
    name: '语序重组与连词成句',
    totalBlocks: 23,
    weight: 0.066,
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    description: '打乱词块排序还原句子、疑问句语序、助动词倒装结构',
  },
  G: {
    name: '改错、句型转换与合并',
    totalBlocks: 35,
    weight: 0.1,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: '找出错误病灶并修正、主动被动转换、定语从句合并改写',
  },
  H: {
    name: '匹配、分类与排序',
    totalBlocks: 26,
    weight: 0.074,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: '标题配对、时间轴排序 (Chronological)、因果逻辑分类',
  },
  I: {
    name: '语篇完形与段落补全',
    totalBlocks: 38,
    weight: 0.109,
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: '剑桥经典每第7词挖空 (Every 7th word)、连续段落回读检验',
  },
  J: {
    name: '对话补全与交际表达',
    totalBlocks: 17,
    weight: 0.049,
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    description: '角色对话互动、语言功能回应、礼貌度与自然度反馈',
  },
  K: {
    name: '写作组织与开放表达',
    totalBlocks: 12,
    weight: 0.034,
    badgeColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    description: '段落提纲支架、连接词提示、控制性到开放性表达过渡',
  },
  L: {
    name: '图表、数字与数据解读',
    totalBlocks: 6,
    weight: 0.017,
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    description: '数字单词读写、图表百分比转换、数据对比句型描述',
  },
};

export interface ActivityItem {
  id: string;
  prompt?: string; // 题目子指令或提示
  contextPrefix?: string; // 空格前文本，如 "I went to school "
  contextSuffix?: string; // 空格后文本，如 " Monday morning."
  wordBank?: string[]; // 备选词/词库
  tokens?: string[]; // 待排序的打乱词块，如 ["Why", "did", "you", "choose", "this"]
  rawSentenceWithMistake?: string; // 待改错的原句，如 "She don't like apples."
  mistakeWord?: string; // 错词 "don't"
  correctAnswer: string | string[]; // 正确答案（支持多解）
  acceptedVariants?: string[]; // 宽容容错匹配（如大小写、缩写）
  grammarRuleHint?: string; // 语法规则提示（如 "星期几前使用介词 on"）
  errorCategory?: 'TENSE' | 'PREPOSITION' | 'SUBJECT_VERB' | 'WORD_ORDER' | 'SPELLING' | 'VOICE';
  explanation?: string; // 详细解析
  evidenceAnchor?: string; // 原文依据片段
}

export interface WorkbookActivity {
  id: string; // 唯一ID，如 "cge7-u01-act-011"
  unit: number; // 单元 1 ~ 9
  lesson: string; // "1.1", "1.2", "Use of English" 等
  page: number; // 原书页码
  category: ActivityCategory;
  instruction: string; // 英文任务指令
  instructionZh: string; // 中文说明
  grammarFocus?: string; // 语法焦点
  passage?: string; // 长阅读或完形篇章
  sharedWordBank?: string[]; // 公共词库框
  items: ActivityItem[];
}
