import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';
import { getStudentIdFromRequest } from '../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const studentId = getStudentIdFromRequest(req);
  await LocalDB.pullStudentFromCloud(studentId);
  const stats = LocalDB.getStatistics(studentId);
  return NextResponse.json({ success: true, data: stats });
}
