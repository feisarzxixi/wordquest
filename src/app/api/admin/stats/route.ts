import { NextResponse } from 'next/server';
import { LocalDB } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const studentsAnalytics = LocalDB.getAllStudentsAnalytics();
    const allUsers = LocalDB.getAllUsers();
    const allWords = LocalDB.getAllWords();

    const pendingCount = allUsers.filter((u) => u.status === 'pending').length;
    const totalStudents = allUsers.filter((u) => u.role === 'student').length;
    const activeToday = studentsAnalytics.filter((s) => s.todayCompleted).length;
    const totalStudyMinutesToday = studentsAnalytics.reduce((sum, s) => sum + (s.todayStudyMinutes || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalWords: allWords.length,
          totalStudents,
          pendingCount,
          activeToday,
          totalStudyMinutesToday: Math.round(totalStudyMinutesToday * 10) / 10,
        },
        students: studentsAnalytics,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
