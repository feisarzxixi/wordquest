import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';
import { getStudentIdFromRequest } from '../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const studentId = getStudentIdFromRequest(req);
  const settings = LocalDB.getSettings(studentId);
  return NextResponse.json({ success: true, data: settings });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const studentId = getStudentIdFromRequest(req) || body.studentId || 'student-default';
    const updated = LocalDB.updateSettings(body, studentId);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
