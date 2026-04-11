import { NextResponse } from 'next/server';
import HawkCatcher from '@hawk.so/nodejs';

export async function GET(_request: Request) {
  const results: string[] = [];

  // Check 1: Is HAWK_TOKEN present?
  const token = process.env.HAWK_TOKEN;
  results.push(`HAWK_TOKEN present: ${!!token}`);
  results.push(`HAWK_TOKEN length: ${token?.length || 0}`);
  if (token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      results.push(`Token decoded successfully`);
      results.push(`Integration ID: ${decoded.integrationId}`);
      results.push(`Secret present: ${!!decoded.secret}`);
    } catch (e) {
      results.push(`Token decode failed: ${e}`);
    }
  }

  // Check 2: Try to initialize Hawk directly
  try {
    if (token) {
      HawkCatcher.init(token);
      results.push(`HawkCatcher.init() called successfully`);
    }
  } catch (e) {
    results.push(`HawkCatcher.init() failed: ${e}`);
  }

  // Check 3: Try to send a test error
  try {
    const testError = new Error('Test error from /api/test/hawk');
    HawkCatcher.send(testError, { test: true, timestamp: Date.now() });
    results.push(`HawkCatcher.send() called successfully`);
  } catch (e) {
    results.push(`HawkCatcher.send() failed: ${e}`);
  }

  // Check 4: Check if we're in a module where hawk.ts was loaded
  results.push(`Node env: ${process.env.NODE_ENV}`);
  results.push(`Process pid: ${process.pid}`);

  return NextResponse.json({
    results,
    message: 'Check your Hawk dashboard for the test error',
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'NOT SET',
  });
}

export async function POST(request: Request) {
  // Trigger an actual 500 error to test error catching
  const { type } = await request.json().catch(() => ({ type: 'sync' }));

  if (type === 'async') {
    // Async error (unhandled rejection)
    setTimeout(() => {
      Promise.reject(new Error('Async test error from /api/test/hawk'));
    }, 100);
    return NextResponse.json({ message: 'Async error triggered, check Hawk in 1-2 seconds' });
  }

  // Sync error (uncaught exception) - this will crash the process
  throw new Error('Sync test error from /api/test/hawk - this should be caught by Hawk');
}
