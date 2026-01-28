export type BasicAuthCredentials = {
  username: string;
  password: string;
};

export function parseBasicAuthHeader(
  authorizationHeader?: string | null
): BasicAuthCredentials | null {
  if (!authorizationHeader) return null;
  const [scheme, encoded] = authorizationHeader.split(' ');
  if (scheme !== 'Basic' || !encoded) return null;

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx === -1) return null;
    const username = decoded.slice(0, idx);
    const password = decoded.slice(idx + 1);
    if (!username || !password) return null;
    return { username, password };
  } catch {
    return null;
  }
}
