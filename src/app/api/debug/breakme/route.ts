import { NextResponse } from 'next/server';
import { captureError } from '@/lib/hawk';

export async function GET() {
  try {
    throw new Error('Hawk test error — delete this route when confirmed');
  } catch (err) {
    captureError(err, { route: 'debug/breakme' });
    console.error('[breakme]', err);
    return NextResponse.json({ error: 'intentional 500' }, { status: 500 });
  }
}
