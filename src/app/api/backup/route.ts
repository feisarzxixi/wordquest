import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';

export async function GET() {
  const allData = LocalDB.exportAll();
  return new NextResponse(JSON.stringify(allData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="wordquest_backup_${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
