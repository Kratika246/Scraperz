'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UsePollingOptions<T> {
  /** Async function to fetch current status */
  fetcher: () => Promise<T>;
  /** Polling interval in ms (default 3000) */
  interval?: number;
  /** Return true to stop polling */
  shouldStop?: (data: T) => boolean;
  /** Whether polling is enabled */
  enabled?: boolean;
}

export function usePolling<T>({
  fetcher,
  interval = 3000,
  shouldStop,
  enabled = true,
}: UsePollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const result = await fetcher();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);

      if (shouldStop?.(result)) {
        setIsPolling(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error('Polling failed'));
    }
  }, [fetcher, shouldStop]);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      setIsPolling(true);
      poll(); // initial fetch
      timerRef.current = setInterval(poll, interval);
    }

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, interval, poll]);

  const stop = useCallback(() => {
    setIsPolling(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { data, error, isPolling, stop };
}
