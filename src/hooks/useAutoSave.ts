import { useEffect, useRef, useState, useCallback } from 'react';

export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

/**
 * Debounced auto-save hook.
 *
 * Calls `saveFn` after `delayMs` milliseconds of data stability.
 * Resets the timer on every data change.
 *
 * @param data - The data to watch for changes (compared via JSON.stringify)
 * @param saveFn - Async function that performs the save
 * @param delayMs - Debounce delay in milliseconds (default 5000)
 */
export function useAutoSave(
  data: unknown,
  saveFn: () => Promise<void>,
  delayMs: number = 5000,
): AutoSaveState {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  const isFirstRender = useRef(true);
  const isMounted = useRef(true);

  // Keep saveFn ref up to date without re-triggering the effect
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Watch data for changes and debounce save
  useEffect(() => {
    // Skip auto-save on first render (initial load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear any pending save
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      if (!isMounted.current) return;

      setIsSaving(true);
      setError(null);

      try {
        await saveFnRef.current();
        if (isMounted.current) {
          setLastSaved(new Date());
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted.current) {
          setIsSaving(false);
        }
      }
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), delayMs]);

  return { isSaving, lastSaved, error };
}
