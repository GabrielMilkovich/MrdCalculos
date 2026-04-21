/**
 * Offline cache using localStorage for reference tables + calculation results.
 * When Supabase is unreachable, falls back to last known values.
 *
 * VERSIONING: entries are tagged with CACHE_VERSION. Bumping the version
 * invalidates all cached data automatically — previne que bugs do engine
 * antigo persistam em caches do navegador após deploy.
 */

const PREFIX = 'mrdcalc_cache_';

// Bump this when:
//  - Engine output shape changes (breaking)
//  - Reference tables schema changes (breaking)
//  - Bug fixes que mudam cálculos (evitar stale results)
export const CACHE_VERSION = 2;

interface CachedEntry<T> {
  version: number;
  data: T;
  savedAt: number;
}

export function saveToLocalStorage(key: string, data: unknown): void {
  try {
    const entry: CachedEntry<unknown> = {
      version: CACHE_VERSION,
      data,
      savedAt: Date.now(),
    };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch { /* localStorage full or unavailable */ }
}

export function loadFromLocalStorage<T>(key: string): { data: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T> | { data: T; savedAt: number };
    // Entrada sem version ou com version antiga é inválida — limpa e retorna null
    if (!('version' in parsed) || parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch { return null; }
}

// Itera chaves do localStorage via API padrão (length + key(i)),
// compatível com Web Storage API em qualquer ambiente.
function listPrefixedKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  return keys;
}

export function clearLocalStorageCache(): void {
  for (const k of listPrefixedKeys()) localStorage.removeItem(k);
}

/**
 * Limpa apenas entradas de versão antiga. Seguro para chamar no bootstrap.
 */
export function pruneStaleCache(): number {
  let removed = 0;
  for (const k of listPrefixedKeys()) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { version?: number };
      if (parsed.version !== CACHE_VERSION) {
        localStorage.removeItem(k);
        removed++;
      }
    } catch {
      // entrada corrompida — remove
      localStorage.removeItem(k);
      removed++;
    }
  }
  return removed;
}
