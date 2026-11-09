import { NextResponse } from 'next/server';
import { getAvailableWordImages } from '../../../../lib/utils/imageResolver';

export const dynamic = 'force-dynamic';

export async function GET() {
  const map = getAvailableWordImages();
  const obj: Record<string, string> = {};
  map.forEach((val, key) => {
    obj[key] = val;
  });
  return NextResponse.json({ success: true, data: obj });
}
