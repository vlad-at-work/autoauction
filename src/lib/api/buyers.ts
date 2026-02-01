export async function checkBuyerExists(
  platformUserId: string,
  platform: string,
  initData?: string
) {
  try {
    const params = new URLSearchParams({
      platformUserId,
      platform,
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add server-side validation of WebApp initData if provided
    if (initData) {
      headers.Authorization = `Bearer ${platform}:${initData}`;
    }

    const res = await fetch(`/api/buyers/me?${params.toString()}`, {
      headers,
    });

    if (res.status === 404) {
      return { exists: false, data: null };
    }

    if (!res.ok) {
      throw new Error('Не удалось проверить покупателя');
    }

    const data = (await res.json()) as { id: string };
    return { exists: true, data };
  } catch (error) {
    console.error('Check buyer error:', error);
    return { exists: false, data: null };
  }
}
