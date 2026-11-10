import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';
import { getStudentIdFromRequest } from '../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const studentId = getStudentIdFromRequest(req);
    const data = LocalDB.getStudentData(studentId);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const studentId = getStudentIdFromRequest(req);
    const body = await req.json();
    const { clientData, backupPlans } = body;

    const result = LocalDB.syncStudentData(studentId, clientData, backupPlans);
    return NextResponse.json({
      success: true,
      data: result.student,
      restoredCount: result.restoredCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
