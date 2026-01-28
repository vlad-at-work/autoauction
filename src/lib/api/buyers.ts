import { MOCK_USERS } from '@/lib/debug/mock-data';

export async function checkBuyerExists(
  platformUserId: string,
  platform: string,
  debugMode?: { enabled: boolean; useMockData: boolean; mockUserId: string | null }
) {
  if (debugMode?.enabled && debugMode.useMockData && debugMode.mockUserId) {
    const exists = !!MOCK_USERS[debugMode.mockUserId];
    return { exists, data: exists ? { id: debugMode.mockUserId } : null };
  }

  try {
    const res = await fetch(`/api/buyers/me?platformUserId=${platformUserId}&platform=${platform}`);

    if (res.status === 404) {
      return { exists: false, data: null };
    }

    if (!res.ok) {
      throw new Error('Failed to check buyer');
    }

    const data = (await res.json()) as { id: string };
    return { exists: true, data };
  } catch (error) {
    console.error('Check buyer error:', error);
    return { exists: false, data: null };
  }
}
