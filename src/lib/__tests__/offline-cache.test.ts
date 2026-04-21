/**
 * Testes do offline-cache com versioning.
 *
 * Garantias:
 *  - save/load preservam dados
 *  - entrada sem version (formato antigo) retorna null e é removida
 *  - entrada de version errada retorna null e é removida
 *  - pruneStaleCache limpa apenas entradas de versão antiga
 *  - clearLocalStorageCache limpa tudo do prefixo
 */
import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';

// Mock localStorage para ambiente Node (vitest roda em `node` environment)
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, value); }
}

beforeAll(() => {
  (globalThis as { localStorage?: Storage }).localStorage = new MemoryStorage();
  (globalThis as { Storage?: typeof Storage }).Storage = MemoryStorage as unknown as typeof Storage;
});

afterAll(() => {
  delete (globalThis as { localStorage?: Storage }).localStorage;
});

// Imports DEPOIS do mock de localStorage (módulo não acessa no load, mas safety)
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorageCache,
  pruneStaleCache,
  CACHE_VERSION,
} from '../offline-cache';

describe('offline-cache versioning', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('save + load round-trip preserva dados', () => {
    saveToLocalStorage('chave1', { foo: 'bar', n: 42 });
    const loaded = loadFromLocalStorage<{ foo: string; n: number }>('chave1');
    expect(loaded).not.toBeNull();
    expect(loaded?.data).toEqual({ foo: 'bar', n: 42 });
  });

  it('load retorna savedAt timestamp', () => {
    const before = Date.now();
    saveToLocalStorage('k', 'v');
    const loaded = loadFromLocalStorage<string>('k');
    expect(loaded?.savedAt).toBeGreaterThanOrEqual(before);
  });

  it('entrada sem version (formato antigo) é descartada', () => {
    // Simula cache escrito por versão antiga (sem campo version)
    localStorage.setItem(
      'mrdcalc_cache_legacy',
      JSON.stringify({ data: { x: 1 }, savedAt: Date.now() }),
    );
    const loaded = loadFromLocalStorage('legacy');
    expect(loaded).toBeNull();
    // E também foi removida do storage
    expect(localStorage.getItem('mrdcalc_cache_legacy')).toBeNull();
  });

  it('entrada com version errada é descartada', () => {
    localStorage.setItem(
      'mrdcalc_cache_old',
      JSON.stringify({ version: CACHE_VERSION - 1, data: { x: 1 }, savedAt: Date.now() }),
    );
    const loaded = loadFromLocalStorage('old');
    expect(loaded).toBeNull();
    expect(localStorage.getItem('mrdcalc_cache_old')).toBeNull();
  });

  it('pruneStaleCache remove apenas entradas antigas', () => {
    // Mistura: 2 válidas + 2 antigas + 1 corrompida
    saveToLocalStorage('valida1', { a: 1 });
    saveToLocalStorage('valida2', { b: 2 });
    localStorage.setItem('mrdcalc_cache_antiga1', JSON.stringify({ version: 0, data: {} }));
    localStorage.setItem('mrdcalc_cache_antiga2', JSON.stringify({ data: { x: 1 } })); // sem version
    localStorage.setItem('mrdcalc_cache_corrompida', 'not json');

    const removed = pruneStaleCache();
    expect(removed).toBe(3);

    expect(loadFromLocalStorage('valida1')).not.toBeNull();
    expect(loadFromLocalStorage('valida2')).not.toBeNull();
    expect(localStorage.getItem('mrdcalc_cache_antiga1')).toBeNull();
    expect(localStorage.getItem('mrdcalc_cache_antiga2')).toBeNull();
    expect(localStorage.getItem('mrdcalc_cache_corrompida')).toBeNull();
  });

  it('clearLocalStorageCache remove todas as entradas do prefixo', () => {
    saveToLocalStorage('a', 1);
    saveToLocalStorage('b', 2);
    localStorage.setItem('outro_namespace', 'mantido');

    clearLocalStorageCache();

    expect(loadFromLocalStorage('a')).toBeNull();
    expect(loadFromLocalStorage('b')).toBeNull();
    expect(localStorage.getItem('outro_namespace')).toBe('mantido');
  });

  it('save não quebra quando localStorage lança (quota cheia)', () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveToLocalStorage('falha', { big: 'x'.repeat(100) })).not.toThrow();
    setSpy.mockRestore();
  });

  it('load retorna null para chave inexistente', () => {
    expect(loadFromLocalStorage('nunca_salvou')).toBeNull();
  });

  it('load retorna null para JSON corrompido sem lançar', () => {
    localStorage.setItem('mrdcalc_cache_corrupto', '{invalid json');
    expect(loadFromLocalStorage('corrupto')).toBeNull();
  });
});
