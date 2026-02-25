import HawkCatcher from '@hawk.so/nodejs';

const HAWK_TOKEN = process.env.HAWK_TOKEN;

// DEBUG LOGGING
console.warn('[HAWK DEBUG] process.env.HAWK_TOKEN exists:', !!HAWK_TOKEN);
console.warn('[HAWK DEBUG] HAWK_TOKEN length:', HAWK_TOKEN?.length || 0);
console.warn('[HAWK DEBUG] HAWK_TOKEN first 20 chars:', HAWK_TOKEN?.substring(0, 20) || 'N/A');
console.warn(
  '[HAWK DEBUG] All env keys:',
  Object.keys(process.env).filter((k) => k.includes('TOKEN') || k.includes('HAWK'))
);

let initialized = false;

export function initHawk() {
  console.warn(
    '[HAWK DEBUG] initHawk called, HAWK_TOKEN exists:',
    !!HAWK_TOKEN,
    'already initialized:',
    initialized
  );
  if (initialized || !HAWK_TOKEN) {
    console.warn('[HAWK DEBUG] Skipping init - already init or no token');
    return;
  }
  try {
    HawkCatcher.init(HAWK_TOKEN);
    initialized = true;
    console.warn('[HAWK DEBUG] Hawk initialized successfully');
  } catch (err) {
    console.error('[HAWK DEBUG] Hawk init failed:', err);
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  console.warn('[HAWK DEBUG] captureError called, initialized:', initialized);
  if (!initialized) {
    console.warn('[HAWK DEBUG] Not initialized, skipping error capture');
    return;
  }
  try {
    console.warn('[HAWK DEBUG] Sending error to Hawk');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HawkCatcher.send(error instanceof Error ? error : new Error(String(error)), context as any);
    console.warn('[HAWK DEBUG] Error sent successfully');
  } catch (err) {
    console.error('[HAWK DEBUG] Failed to send error:', err);
  }
}

// Auto-initialize on module load (for API routes where instrumentation.ts doesn't run)
initHawk();
