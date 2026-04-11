import HawkCatcher from '@hawk.so/nodejs';

const HAWK_TOKEN = process.env.HAWK_TOKEN;

let initialized = false;

export function initHawk() {
  if (initialized || !HAWK_TOKEN) return;

  // Initialize with environment context
  HawkCatcher.init({
    token: HAWK_TOKEN,
    context: {
      environment: process.env.NODE_ENV || 'unknown',
      app: 'autoauction',
      port: process.env.PORT,
    },
  });

  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  try {
    // Merge provided context with default environment info
    const enrichedContext = {
      environment: process.env.NODE_ENV || 'unknown',
      port: process.env.PORT,
      ...context,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HawkCatcher.send(
      error instanceof Error ? error : new Error(String(error)),
      enrichedContext as any
    );
  } catch {
    // swallow — error tracking must never break the app
  }
}

// Auto-initialize on module load (for API routes where instrumentation.ts doesn't run)
initHawk();
