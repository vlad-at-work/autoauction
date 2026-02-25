export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initHawk } = await import('@/lib/hawk');
    initHawk();
  }
}
