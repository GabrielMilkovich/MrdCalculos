/**
 * Offline cache using localStorage for reference tables.
 * When Supabase is unreachable, falls back to last known values.
 */

const PREFIX = 'mrdcalc_cache_';

export function saveToLocalStorage(key: string, data: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch { /* localStorage full or unavailable */ }
}

export function loadFromLocalStorage<T>(key: string): { data: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function clearLocalStorageCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}
