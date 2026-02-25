import HawkCatcher from '@hawk.so/nodejs';

const HAWK_TOKEN = process.env.HAWK_TOKEN;

let initialized = false;

export function initHawk() {
  if (initialized || !HAWK_TOKEN) return;
  HawkCatcher.init(HAWK_TOKEN);
  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HawkCatcher.send(error instanceof Error ? error : new Error(String(error)), context as any);
  } catch {
    // swallow — error tracking must never break the app
  }
}
