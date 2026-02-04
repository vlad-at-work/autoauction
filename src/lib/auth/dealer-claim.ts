import { createHmac } from 'crypto';

const CLAIM_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-prod';
const CLAIM_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type DealerClaimPayload = {
  dealerId: string;
  exp: number; // unix seconds
};

export function createDealerClaimToken(dealerId: string, maxAgeSeconds = CLAIM_MAX_AGE_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload: DealerClaimPayload = { dealerId, exp: now + maxAgeSeconds };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', CLAIM_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function validateDealerClaimToken(token: string): DealerClaimPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expectedSignature = createHmac('sha256', CLAIM_SECRET)
    .update(payloadB64)
    .digest('base64url');
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as DealerClaimPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.dealerId || typeof payload.dealerId !== 'string') return null;
    if (typeof payload.exp !== 'number') return null;
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
