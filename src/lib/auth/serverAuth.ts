/**
 * 服务端请求学生身份识别中间件
 * 支持通过请求头 x-student-id、Cookie studentId 以及 URL query 自动捕获当前学习学生
 */

export function getStudentIdFromRequest(req: Request): string {
  // 1. 显式请求头
  const headerId = req.headers.get('x-student-id');
  if (headerId && headerId.trim()) return headerId.trim();

  // 2. 浏览器与 iPad Cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)studentId=([^;]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].trim());
    } catch (e) {
      return match[1].trim();
    }
  }

  // 3. URL 查询参数
  try {
    const url = new URL(req.url);
    const qId = url.searchParams.get('studentId');
    if (qId && qId.trim()) return qId.trim();
  } catch (e) {}

  // 4. 默认安全回退
  return 'student-default';
}
