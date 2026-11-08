import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';

export async function POST() {
  LocalDB.resetProgress();
  return NextResponse.json({ success: true, message: '学习进度已重置，已保留词库' });
}
