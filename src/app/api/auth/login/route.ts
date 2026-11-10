import { NextResponse } from 'next/server';
import { LocalDB } from '../../../../lib/db';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入账号和密码' },
        { status: 400 }
      );
    }

    await LocalDB.pullUsersFromCloud();

    const user = LocalDB.getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '账号不存在，请先注册或联系管理员开通' },
        { status: 404 }
      );
    }

    if (user.password !== password.trim()) {
      return NextResponse.json(
        { success: false, error: '密码错误，请重试' },
        { status: 401 }
      );
    }

    if (user.role === 'student') {
      if (user.status === 'pending') {
        return NextResponse.json(
          {
            success: false,
            error: '您的注册申请正在等待后台管理员审核同意，暂无法登录。',
            status: 'pending',
          },
          { status: 403 }
        );
      }
      if (user.status === 'rejected') {
        return NextResponse.json(
          {
            success: false,
            error: '您的注册申请已被管理员拒绝，请联系管理员。',
            status: 'rejected',
          },
          { status: 403 }
        );
      }
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role,
      status: user.status,
    };

    return NextResponse.json({ success: true, data: safeUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
