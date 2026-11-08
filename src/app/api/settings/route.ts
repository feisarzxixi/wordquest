import { NextResponse } from 'next/server';
import { LocalDB } from '../../../lib/db';

export async function GET() {
  const settings = LocalDB.getSettings();
  return NextResponse.json({ success: true, data: settings });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = LocalDB.updateSettings(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
