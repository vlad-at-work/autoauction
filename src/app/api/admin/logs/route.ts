import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { logger } from '@/lib/logger';

const LOG_PATH =
  process.env.PORT === '3001'
    ? '/var/log/autoauction-staging/app.log'
    : '/var/log/autoauction/app.log';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter')?.toLowerCase() || '';

    // Read log file - last 200 lines
    const content = readFileSync(LOG_PATH, 'utf8');
    const allLines = content.split('\n').filter((line) => line.trim());
    const last200 = allLines.slice(-200);

    // Filter if needed
    const filtered = filter
      ? last200.filter((line) => line.toLowerCase().includes(filter))
      : last200;

    return NextResponse.json({
      lines: filtered,
      total: filtered.length,
      filter: filter || null,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to read log file');
    return NextResponse.json({ error: 'Failed to read logs', lines: [] }, { status: 500 });
  }
}
