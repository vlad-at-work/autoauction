export async function checkBuyerExists(
  platformUserId: string,
  platform: string,
  initData?: string
) {
  console.log('[checkBuyerExists] Starting check:', {
    platformUserId,
    platform,
    hasInitData: !!initData,
  });

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
      console.log('[checkBuyerExists] Added auth header with platform:', platform);
    }

    const url = `/api/buyers/me?${params.toString()}`;
    console.log('[checkBuyerExists] Fetching:', url);

    const res = await fetch(url, {
      headers,
    });

    console.log('[checkBuyerExists] Response status:', res.status);

    if (res.status === 404) {
      console.log('[checkBuyerExists] Buyer not found (404)');
      return { exists: false, data: null };
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[checkBuyerExists] Non-OK response:', { status: res.status, body: errorText });
      throw new Error(`Не удалось проверить покупателя: ${res.status} ${errorText}`);
    }

    const data = (await res.json()) as { id: string };
    console.log('[checkBuyerExists] Buyer found:', data.id);
    return { exists: true, data };
  } catch (error) {
    console.error('[checkBuyerExists] Error:', error);
    // On error, assume buyer doesn't exist and let them create one
    return { exists: false, data: null };
  }
}
