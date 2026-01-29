export async function checkBuyerExists(platformUserId: string, platform: string) {
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
