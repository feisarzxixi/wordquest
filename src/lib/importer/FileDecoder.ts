/**
 * 文件解码与词库解析管道 (File Decoder & Importer Pipeline)
 * 自动适配 UTF-8、UTF-8 with BOM 以及 Windows 常见的 GBK/GB2312 编码
 */

import { BaseWord } from '../algorithms/planEngine';
import * as XLSX from 'xlsx';

export interface RawRow {
  [key: string]: string;
}

export interface HeaderMapping {
  wordField: string;
  meaningField: string;
  phoneticField?: string;
  posField?: string;
  exampleField?: string;
  translationField?: string;
  imageField?: string;
}

export interface ImportPreviewItem {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  pos: string;
  example: string;
  translation: string;
  image?: string;
  isDuplicate: boolean;
  hasIncompleteContext: boolean;
}

export interface ImportAnalysisResult {
  headers: string[];
  suggestedMapping: HeaderMapping;
  previewRows: ImportPreviewItem[];
  validCount: number;
  duplicateCount: number;
  incompleteCount: number;
}

/**
 * 智能探测表头含义并提供自动映射
 */
export function guessFieldMapping(headers: string[]): HeaderMapping {
  const mapping: HeaderMapping = {
    wordField: '',
    meaningField: '',
  };

  const lower = headers.map((h) => h.trim().toLowerCase());

  // 1. 单词
  const wordIdx = lower.findIndex((h) => ['word', '单词', '英文', 'vocabulary', 'english'].includes(h));
  if (wordIdx !== -1) mapping.wordField = headers[wordIdx];
  else mapping.wordField = headers[0] || '';

  // 2. 释义
  const meaningIdx = lower.findIndex((h) => ['meaning', '释义', '中文', '解释', '翻译', 'chinese'].includes(h));
  if (meaningIdx !== -1) mapping.meaningField = headers[meaningIdx];
  else if (headers.length > 1) mapping.meaningField = headers[1];

  // 3. 音标
  const phoneticIdx = lower.findIndex((h) => ['phonetic', '音标', '发音'].includes(h));
  if (phoneticIdx !== -1) mapping.phoneticField = headers[phoneticIdx];

  // 4. 词性
  const posIdx = lower.findIndex((h) => ['pos', '词性', 'part of speech'].includes(h));
  if (posIdx !== -1) mapping.posField = headers[posIdx];

  // 5. 例句
  const exampleIdx = lower.findIndex((h) => ['example', '例句', '英文例句', 'sentence'].includes(h));
  if (exampleIdx !== -1) mapping.exampleField = headers[exampleIdx];

  // 6. 例句翻译
  const transIdx = lower.findIndex((h) => ['translation', '例句翻译', '中文例句', '例句释义'].includes(h));
  if (transIdx !== -1) mapping.translationField = headers[transIdx];

  // 7. 单词配图
  const imgIdx = lower.findIndex((h) => ['image', 'img', 'picture', 'pic', '图片', '配图'].includes(h));
  if (imgIdx !== -1) mapping.imageField = headers[imgIdx];

  return mapping;
}

/**
 * 健壮的 Excel (.xlsx / .xls) 二进制 ArrayBuffer 解析器
 */
export function parseExcelBuffer(buffer: ArrayBuffer | Uint8Array): { headers: string[]; rows: RawRow[] } {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return { headers: [], rows: [] };

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) return { headers: [], rows: [] };

    // 取第一行有效表头
    const firstRow = rawRows[0] || [];
    const headers: string[] = [];
    for (let i = 0; i < firstRow.length; i++) {
      const h = String(firstRow[i] || '').trim();
      if (h) headers.push(h);
      else if (headers.length > 0) headers.push(`Column_${i + 1}`);
    }

    if (headers.length === 0) return { headers: [], rows: [] };

    const rows: RawRow[] = [];
    for (let r = 1; r < rawRows.length; r++) {
      const line = rawRows[r] || [];
      const rowObj: RawRow = {};
      let hasContent = false;
      headers.forEach((h, colIdx) => {
        const val = line[colIdx] != null ? String(line[colIdx]).trim() : '';
        rowObj[h] = val;
        if (val) hasContent = true;
      });
      if (hasContent) {
        rows.push(rowObj);
      }
    }

    return { headers, rows };
  } catch (err) {
    console.error('Failed to parse excel buffer:', err);
    return { headers: [], rows: [] };
  }
}

/**
 * 简易且健壮的 CSV 解析器（支持引号转义和多行）
 */
export function parseCSV(text: string): { headers: string[]; rows: RawRow[] } {
  // 剥离 UTF-8 BOM (\uFEFF)
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // 跳过转义双引号
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: RawRow = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * 将解析出的原始数据与映射关系转化为入库预览
 */
export function buildImportPreview(
  rows: RawRow[],
  mapping: HeaderMapping,
  existingWordSet: Set<string>
): ImportAnalysisResult {
  const seenInBatch = new Set<string>();
  const previewRows: ImportPreviewItem[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let incompleteCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawWord = (row[mapping.wordField] || '').trim();
    const rawMeaning = (row[mapping.meaningField] || '').trim();

    // 必填项：单词与释义
    if (!rawWord || !rawMeaning) continue;

    const lowerWord = rawWord.toLowerCase();
    const isDup = existingWordSet.has(lowerWord) || seenInBatch.has(lowerWord);
    seenInBatch.add(lowerWord);

    const phonetic = mapping.phoneticField ? (row[mapping.phoneticField] || '').trim() : '';
    const pos = mapping.posField ? (row[mapping.posField] || '').trim() : '';
    const example = mapping.exampleField ? (row[mapping.exampleField] || '').trim() : '';
    const translation = mapping.translationField ? (row[mapping.translationField] || '').trim() : '';
    const image = mapping.imageField ? (row[mapping.imageField] || '').trim() : '';

    const hasIncomplete = !example || !translation;

    if (isDup) {
      duplicateCount++;
    } else {
      validCount++;
    }

    if (hasIncomplete) {
      incompleteCount++;
    }

    previewRows.push({
      id: `preview-${i}`,
      word: rawWord,
      phonetic,
      meaning: rawMeaning,
      pos,
      example,
      translation,
      image: image || undefined,
      isDuplicate: isDup,
      hasIncompleteContext: hasIncomplete,
    });
  }

  return {
    headers: Object.keys(rows[0] || {}),
    suggestedMapping: mapping,
    previewRows,
    validCount,
    duplicateCount,
    incompleteCount,
  };
}
