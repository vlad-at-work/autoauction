import pino from 'pino';
import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || '/var/log/autoauction';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const isProd = process.env.NODE_ENV === 'production';

function canWriteToDir(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function createLogger() {
  if (!isProd) {
    // In dev/test, write to stdout
    try {
      return pino({
        level: LOG_LEVEL,
        transport: { target: 'pino-pretty', options: { colorize: true } },
      });
    } catch {
      return pino({ level: LOG_LEVEL });
    }
  }

  // In production, write to a file — bypasses the stdout/systemd/worker issue entirely
  if (canWriteToDir(LOG_DIR)) {
    const dest = pino.destination({
      dest: path.join(LOG_DIR, 'app.log'),
      mkdir: false,
      sync: false,
    });
    return pino({ level: LOG_LEVEL }, dest);
  }

  // Fall back to stdout if log dir isn't writable
  return pino({ level: LOG_LEVEL });
}

export const logger = createLogger();

type RouteHandler = (request: Request, context?: unknown) => Promise<Response>;

/**
 * Wraps an API route handler with request/response logging.
 *
 *   export const POST = withLogging('webhooks/max', async (request) => { ... });
 */
export function withLogging(routeName: string, handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const start = Date.now();
    const method = request.method;
    const url = new URL(request.url).pathname;

    const reqLog = logger.child({ route: routeName, method, url });
    reqLog.info('request');

    try {
      const response = await handler(request, context);
      const ms = Date.now() - start;
      reqLog.info({ status: response.status, ms }, 'response');
      return response;
    } catch (err) {
      const ms = Date.now() - start;
      reqLog.error({ err, ms }, 'unhandled error');
      throw err;
    }
  };
}
