export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initHawk } = await import('@/lib/hawk');
    initHawk();

    const { logger } = await import('@/lib/logger');
    logger.info({ pid: process.pid, nodeEnv: process.env.NODE_ENV }, 'server started');
  }
}
