'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UsePollingOptions<T> = {
  fetcher: () => Promise<T>;
  interval?: number;
  enabled?: boolean;
};

/**
 * Hook for polling data at regular intervals with focus-based refresh
 * Combines setInterval + window focus listener for real-time updates
 */
export function usePolling<T>({
  fetcher,
  interval = 12000,
  enabled = true,
}: UsePollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      console.error('[usePolling] Fetch error:', err);
    }
  }, [fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    refresh();

    const id = setInterval(refresh, interval);
    const handleFocus = () => refresh();
    window.addEventListener('focus', handleFocus);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, interval, refresh]);

  return { data, loading, refresh };
}
