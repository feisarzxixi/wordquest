import { NextResponse } from 'next/server';
import { LocalDB } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const users = LocalDB.getAllUsers().map((u) => {
      const stats = u.role === 'student' ? LocalDB.getStatistics(u.id) : null;
      return {
        id: u.id,
        username: u.username,
        realName: u.realName,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        approvedAt: u.approvedAt,
        stats,
      };
    });

    return NextResponse.json({ success: true, data: users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, username, realName, password } = body;

    switch (action) {
      case 'approve': {
        if (!userId) throw new Error('缺少 userId');
        const ok = LocalDB.approveStudent(userId);
        return NextResponse.json({ success: ok, message: '已同意该学生注册申请！' });
      }

      case 'reject': {
        if (!userId) throw new Error('缺少 userId');
        const ok = LocalDB.rejectStudent(userId);
        return NextResponse.json({ success: ok, message: '已拒绝该学生注册申请' });
      }

      case 'add': {
        if (!username || !realName || !password) {
          throw new Error('请完整填写账号、姓名和密码');
        }
        const created = LocalDB.addStudentDirect(username, realName, password);
        return NextResponse.json({ success: true, data: created, message: '学生账号创建成功！' });
      }

      case 'delete': {
        if (!userId) throw new Error('缺少 userId');
        const ok = LocalDB.deleteStudent(userId);
        if (!ok) throw new Error('无法删除管理员账号或用户不存在');
        return NextResponse.json({ success: true, message: '学生账号及数据已删除' });
      }

      case 'resetPassword': {
        if (!userId || !password) throw new Error('缺少 userId 或新密码');
        const ok = LocalDB.resetStudentPassword(userId, password);
        return NextResponse.json({ success: ok, message: '密码重置成功！' });
      }

      case 'resetProgress': {
        if (!userId) throw new Error('缺少 userId');
        LocalDB.resetProgress(userId);
        return NextResponse.json({ success: true, message: '该学生的学习进度与记忆曲线已成功重置！' });
      }

      default:
        return NextResponse.json({ success: false, error: '未知操作指令' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
