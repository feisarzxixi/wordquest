/**
 * 邮件通知分发服务 (Email Notification Service)
 * 学生提交注册后，自动发送邮件提醒管理员 (feisarz@gmail.com) 审核
 * 零配置、零外部依赖、非阻塞异步投递
 */

export class EmailService {
  private static readonly ADMIN_EMAIL = 'feisarz@gmail.com';

  public static async notifyStudentRegistration(info: {
    realName: string;
    username: string;
    createdAt?: string;
  }): Promise<boolean> {
    const timeStr = info.createdAt
      ? new Date(info.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      : new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    console.log(`[EmailService] 正在向 ${this.ADMIN_EMAIL} 发送新学生审批提醒: ${info.realName} (${info.username})`);

    try {
      const payload = {
        _subject: `【WordQuest】新学生注册待审批提醒: ${info.realName} (${info.username})`,
        _template: 'box',
        通知类型: '新学生注册待审批',
        学生姓名: info.realName,
        登录账号: info.username,
        申请时间: timeStr,
        审核指引: '请在登录页面输入 ADMIN / admin 登录管理员控制台，在【学生管理】中点击【同意开通】即可。',
      };

      const res = await fetch(`https://formsubmit.co/ajax/${this.ADMIN_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Referer: 'http://localhost:3000',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log('[EmailService] 邮件投递结果:', result);
      return true;
    } catch (err) {
      console.warn('[EmailService] 邮件投递失败 (非阻塞):', err);
      return false;
    }
  }
}
