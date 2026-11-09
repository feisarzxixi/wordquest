import fs from 'fs';
import path from 'path';

/**
 * 单词配图智能解析引擎 (Word Image Resolver)
 * 1. 同步扫描并缓存 public/words/ 目录中已存在的 800*400 配图文件
 * 2. 避免前端因 404 异步探测导致的卡片高度塌陷和文字跳动闪烁
 * 3. 有图单词：精准返回 /words/[word].[ext]，让前端从首帧即刻稳定展示
 * 4. 无图单词：精准返回 null，让前端从首帧彻底隐藏配图区，既美观又杜绝任何跳动
 */

let cachedImageMap: Map<string, string> | null = null;
let lastScanTime = 0;

/**
 * 获取 public/words 目录中所有有效图片文件映射
 */
export function getAvailableWordImages(): Map<string, string> {
  const now = Date.now();
  // 缓存 3 秒，既保证极高访问性能，又保证新增图片后 3 秒内自动被感知
  if (cachedImageMap && now - lastScanTime < 3000) {
    return cachedImageMap;
  }

  const map = new Map<string, string>();
  const wordsDir = path.join(process.cwd(), 'public', 'words');

  if (fs.existsSync(wordsDir)) {
    try {
      const files = fs.readdirSync(wordsDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) {
          const baseName = path.basename(file, ext).trim().toLowerCase();
          const publicUrl = `/words/${file}`;
          // 记录小写基础名
          map.set(baseName, publicUrl);
          // 兼容下划线与空格互转（例如 "look after" 和 "look_after"）
          map.set(baseName.replace(/\s+/g, '_'), publicUrl);
          map.set(baseName.replace(/_/g, ' '), publicUrl);
        }
      }
    } catch (err) {
      console.error('Error scanning public/words directory:', err);
    }
  }

  cachedImageMap = map;
  lastScanTime = now;
  return map;
}

/**
 * 解析并返回特定单词的最优配图路径，无图则返回 null
 */
export function resolveWordImage(wordText: string, currentImage?: string | null): string | null {
  // 1. 如果已有显式指定的有效网络或本地路径
  if (currentImage && typeof currentImage === 'string' && currentImage.trim() !== '') {
    return currentImage.trim();
  }

  if (!wordText || typeof wordText !== 'string') {
    return null;
  }

  const cleanWord = wordText.trim().toLowerCase();
  const map = getAvailableWordImages();

  return (
    map.get(cleanWord) ||
    map.get(cleanWord.replace(/\s+/g, '_')) ||
    map.get(cleanWord.replace(/_/g, ' ')) ||
    null
  );
}
