import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';
import { getStudentIdFromRequest } from '../../../lib/auth/serverAuth';

export async function POST(req: Request) {
  try {
    let studentId = getStudentIdFromRequest(req);
    try {
      const body = await req.json();
      if (body.studentId) studentId = body.studentId;
    } catch (e) {}

    LocalDB.resetProgress(studentId);
    return NextResponse.json({ success: true, message: '学习进度已成功重置！' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
