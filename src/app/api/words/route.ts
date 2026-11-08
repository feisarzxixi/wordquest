import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';
import { MASTERY_INTERVAL_THRESHOLD } from '../../../config/learningRules';
import { getStudentIdFromRequest } from '../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'all'; // 'all' | 'learning' | 'mastered'
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  const includeUntested = searchParams.get('untested') === 'true';
  const studentId = getStudentIdFromRequest(req);

  const allWords = LocalDB.getAllWords();
  const recordsMap = new Map(LocalDB.getAllRecords(studentId).map((r) => [r.wordId, r]));

  // 严格规则：“我的单词”仅展示真正开始学习并完成测试过的单词
  let words = allWords.filter((w) => {
    const rec = recordsMap.get(w.id);
    if (!includeUntested && !rec) return false;

    if (filter === 'mastered') {
      return rec && rec.reviewInterval >= MASTERY_INTERVAL_THRESHOLD && rec.lastResult === true;
    } else if (filter === 'learning') {
      return rec && !(rec.reviewInterval >= MASTERY_INTERVAL_THRESHOLD && rec.lastResult === true);
    }
    return true;
  });

  if (query) {
    words = words.filter(
      (w) =>
        w.word.toLowerCase().includes(query) ||
        w.meaning.toLowerCase().includes(query) ||
        (w.phonetic && w.phonetic.toLowerCase().includes(query))
    );
  }

  // 补充掌握度信息
  const data = words.map((w) => {
    const rec = recordsMap.get(w.id);
    const isMastered = !!rec && rec.reviewInterval >= MASTERY_INTERVAL_THRESHOLD && rec.lastResult === true;
    return {
      ...w,
      isMastered,
      reviewInterval: rec ? rec.reviewInterval : 0,
      nextReviewDate: rec ? rec.nextReviewDate : null,
      correctCount: rec ? rec.correctCount : 0,
      totalAttempts: rec ? rec.totalAttempts : 0,
    };
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { words } = body;
    if (!Array.isArray(words)) {
      return NextResponse.json({ success: false, error: 'words must be an array' }, { status: 400 });
    }

    const result = LocalDB.addWords(words);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
