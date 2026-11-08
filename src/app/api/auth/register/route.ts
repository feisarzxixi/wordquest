import { NextResponse } from 'next/server';
import { LocalDB } from '../../../../lib/db';
import { EmailService } from '../../../../lib/notify/EmailService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { username, realName, password } = await req.json();

    if (!username || !realName || !password) {
      return NextResponse.json(
        { success: false, error: '请完整填写学生姓名、账号及密码' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: '登录账号不能少于 3 个字符' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { success: false, error: '登录密码不能少于 4 个字符' },
        { status: 400 }
      );
    }

    const newUser = LocalDB.registerStudent(username, realName, password);

    // 异步触发邮件提醒管理员 (feisarz@gmail.com)，非阻塞保障极速响应
    EmailService.notifyStudentRegistration({
      realName: newUser.realName,
      username: newUser.username,
      createdAt: newUser.createdAt,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: '注册申请已成功提交！管理员邮箱已收到审批提醒，审核通过后即可登录学习。',
      data: {
        id: newUser.id,
        username: newUser.username,
        realName: newUser.realName,
        status: newUser.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || '注册失败，请稍后重试' },
      { status: 400 }
    );
  }
}
