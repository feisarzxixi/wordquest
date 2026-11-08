/**
 * 拼写填空题比例挖空与确定性哈希算法
 * 纯函数，相同 seed (wordId + taskId) 保证产生绝对一致的挖空位置，刷新不改变
 */

export interface BlankSlot {
  index: number;         // 在单词中的字符索引
  letter: string;        // 正确字母（小写）
  isInput: boolean;      // 是否为需要输入的空格
}

export interface MaskedSpellingResult {
  fullWord: string;
  maskedDisplay: string; // 呈现用，如 "p _ o _ e c t"
  slots: BlankSlot[];    // 各槽位明细
  blankCount: number;    // 被挖空的字符数
}

/**
 * 简单的 32 位字符串哈希（用于确定性伪随机种子）
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // 转换为 32 位整数
  }
  return Math.abs(hash);
}

/**
 * 基于种子的线性同余伪随机数生成器 (LCG)
 */
export function createPRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * 计算需要挖空的字母数量（按比例规则）
 */
export function getMaskCount(letterCount: number): number {
  if (letterCount <= 2) return 1;
  if (letterCount <= 4) return 2; // e.g., "desk" -> 2
  if (letterCount <= 8) return Math.min(4, Math.max(3, Math.round(letterCount * 0.45))); // e.g., "protect" -> 3 or 4
  // > 8 字母长词: 隐藏 40% ~ 50%
  return Math.max(4, Math.round(letterCount * 0.45));
}

/**
 * 针对单词执行比例挖空
 * @param word 目标单词
 * @param seed 确定性种子（通常为 wordId + taskId）
 */
export function maskSpelling(word: string, seed: string): MaskedSpellingResult {
  const cleanWord = word.trim();
  const prng = createPRNG(hashString(seed || cleanWord));

  // 筛选出所有英文字母的位置（排除标点、空格与连字符）
  const letterIndices: number[] = [];
  for (let i = 0; i < cleanWord.length; i++) {
    if (/[a-zA-Z]/.test(cleanWord[i])) {
      letterIndices.push(i);
    }
  }

  const maskCount = Math.min(getMaskCount(letterIndices.length), letterIndices.length);

  // Fisher-Yates 洗牌（使用确定性 PRNG）
  const shuffledIndices = [...letterIndices];
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }

  // 截取前 maskCount 个作为挖空位
  const chosenMaskIndices = new Set(shuffledIndices.slice(0, maskCount));

  const slots: BlankSlot[] = [];
  const displayParts: string[] = [];

  for (let i = 0; i < cleanWord.length; i++) {
    const char = cleanWord[i];
    const isLetter = /[a-zA-Z]/.test(char);
    const shouldMask = isLetter && chosenMaskIndices.has(i);

    slots.push({
      index: i,
      letter: char.toLowerCase(),
      isInput: shouldMask,
    });

    displayParts.push(shouldMask ? '_' : char);
  }

  return {
    fullWord: cleanWord,
    maskedDisplay: displayParts.join(' '),
    slots,
    blankCount: chosenMaskIndices.size,
  };
}
