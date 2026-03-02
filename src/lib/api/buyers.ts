export async function checkBuyerExists(
  platformUserId: string,
  platform: 'max' | 'telegram',
  initData?: string
) {
  console.log('[checkBuyerExists] Starting check:', {
    platformUserId,
    platform,
    hasInitData: !!initData,
  });

  try {
    const headers: HeadersInit = {};

    // Add server-side validation of WebApp initData if provided
    if (initData) {
      headers.Authorization = `Bearer ${platform}:customer:${initData}`;
      console.log('[checkBuyerExists] Added auth header with platform:', platform);
    }

    const url = `/api/buyers/me?platformUserId=${platformUserId}&platform=${platform}`;
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

    const data = (await res.json()) as { id: string; phone?: string; phoneVerified?: boolean };
    console.log('[checkBuyerExists] Buyer found:', data.id);
    return { exists: true, data };
  } catch (error) {
    console.error('[checkBuyerExists] Error:', error);
    // On error, assume buyer doesn't exist and let them create one
    return { exists: false, data: null };
  }
}
