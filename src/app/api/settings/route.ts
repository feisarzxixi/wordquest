import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';
import { getStudentIdFromRequest } from '../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const studentId = getStudentIdFromRequest(req);
  await LocalDB.pullStudentFromCloud(studentId);
  const settings = LocalDB.getSettings(studentId);
  return NextResponse.json({ success: true, data: settings });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const studentId = getStudentIdFromRequest(req) || body.studentId || 'student-default';
    await LocalDB.pullStudentFromCloud(studentId);
    const updated = LocalDB.updateSettings(body, studentId);
    await LocalDB.pushStudentToCloud(studentId);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
