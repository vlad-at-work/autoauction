export async function GET() {
  const envVars: Record<string, string> = {};

  // List of keys we care about
  const keys = [
    'HAWK_TOKEN',
    'MAX_BOT_TOKEN',
    'MAX_BOT_TOKEN_DEALER',
    'TG_BOT_TOKEN',
    'TG_BOT_TOKEN_DEALER',
    'POSTGRES_PRISMA_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_MAX_BOT_NAME',
    'NODE_ENV',
  ];

  for (const key of keys) {
    const value = process.env[key];
    envVars[key] = value ? `${value.substring(0, 20)}...` : 'UNDEFINED';
  }

  // Also check if .env file exists and what it contains
  const fs = await import('fs');
  let envFileContent = 'NOT_READABLE';
  try {
    const content = fs.readFileSync('/home/autoauction/app/.env', 'utf8');
    envFileContent = content
      .split('\n')
      .filter((line) => line.includes('=') && !line.startsWith('#'))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        const value = rest.join('=');
        return `${key}=${value.substring(0, 10)}...`;
      })
      .join('\n');
  } catch (e) {
    envFileContent = `ERROR: ${(e as Error).message}`;
  }

  return Response.json({
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    runtime: 'nodejs',
    envVars,
    envFileContent,
    allEnvKeys: Object.keys(process.env).filter(
      (k) =>
        k.includes('TOKEN') || k.includes('BOT') || k.includes('HAWK') || k.includes('POSTGRES')
    ),
  });
}
