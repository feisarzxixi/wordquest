import { NextResponse } from 'next/server';
import { LocalDB } from '../../../../lib/db';

export async function POST(req: Request) {
  try {
    const { userIds } = await req.json();
    if (!Array.isArray(userIds)) {
      return NextResponse.json({ success: false, error: 'userIds must be an array' }, { status: 400 });
    }

    const profiles = userIds
      .map((id) => LocalDB.getUserById(id))
      .filter((u): u is NonNullable<typeof u> => !!u && u.role === 'student' && u.status === 'approved')
      .map((u) => {
        const stats = LocalDB.getStatistics(u.id);
        return {
          id: u.id,
          username: u.username,
          realName: u.realName,
          role: u.role,
          streakDays: stats.streakDays,
          totalPoints: stats.totalPoints,
        };
      });

    return NextResponse.json({ success: true, data: profiles });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
