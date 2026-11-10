import { NextResponse } from 'next/server';
import { CloudStorage } from '../../../lib/db/cloudStorage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cloudDbStatus = await CloudStorage.checkConnection();

  return NextResponse.json({
    status: 'ok',
    uptime: process.uptime(),
    cloudDatabase: cloudDbStatus.configured
      ? {
          status: cloudDbStatus.connected ? 'connected' : 'error',
          latencyMs: cloudDbStatus.latencyMs,
          error: cloudDbStatus.error,
        }
      : {
          status: 'not_configured',
          note: 'Running in local disk fallback mode',
        },
    timestamp: new Date().toISOString(),
  });
}
