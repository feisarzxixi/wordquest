import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'template.csv');
  if (!fs.existsSync(filePath)) {
    return new NextResponse('Template not found', { status: 404 });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  // 注入 UTF-8 BOM，保证 Windows Excel 打开不乱码
  const bomContent = '\uFEFF' + content.replace(/^\uFEFF/, '');

  return new NextResponse(bomContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="wordquest_template.csv"',
    },
  });
}
