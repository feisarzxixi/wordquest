import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';

export async function GET() {
  const stats = LocalDB.getStatistics();
  return NextResponse.json({ success: true, data: stats });
}
