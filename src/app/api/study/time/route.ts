import { NextResponse } from 'next/server';
import { LocalDB } from '../../../../lib/db';
import { getStudentIdFromRequest } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const studentId = body.studentId || getStudentIdFromRequest(req);
    const minutes = body.minutes || (body.seconds ? body.seconds / 60 : 0.5);

    const updatedToday = LocalDB.recordStudyTime(minutes, undefined, studentId);
    return NextResponse.json({ success: true, todayMinutes: updatedToday });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
