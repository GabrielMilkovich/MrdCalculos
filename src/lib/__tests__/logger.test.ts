/**
 * Testes do logger estruturado (`src/lib/logger.ts`).
 *
 * Cobertura:
 *  - filtragem por nível
 *  - merge de contexto
 *  - child() preserva source
 *  - erro serializado com stack
 *  - flush em batch a cada 5s (vi.useFakeTimers)
 *  - serialização completa de LogEntry
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, type LogEntry } from '../logger';

describe('Logger.level filter', () => {
  it('filtra entradas abaixo do nível configurado', () => {
    const log = Logger._forTesting({ isDev: true, level: 'warn' });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    log.debug('x');
    log.info('y');
    log.warn('z');
    expect(spy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    warnSpy.mockRestore();
  });
});

describe('Logger context', () => {
  it('inclui contexto na entrada serializada', () => {
    const log = Logger._forTesting({ isDev: true, level: 'debug' });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('hi', { userId: 'u1', n: 2 });
    const [entry] = log.getRecent(1);
    expect(entry.context).toEqual({ userId: 'u1', n: 2 });
    expect(entry.message).toBe('hi');
    expect(entry.level).toBe('info');
  });
});

describe('Logger.child', () => {
  it('child() preserva source em entradas filhas', () => {
    const root = Logger._forTesting({ isDev: true, level: 'debug' });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const child = root.child('pjecalc.engine');
    child.info('engine start');
    const entries = root.getRecent(10);
    const last = entries[entries.length - 1];
    expect(last.source).toBe('pjecalc.engine');
  });
});

describe('Logger.error', () => {
  it('serializa Error com name/message/stack', () => {
    const log = Logger._forTesting({ isDev: true, level: 'debug' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    log.error('falha', err, { op: 'liquidar' });
    const [entry] = log.getRecent(1);
    expect(entry.error?.name).toBe('Error');
    expect(entry.error?.message).toBe('boom');
    expect(typeof entry.error?.stack).toBe('string');
    expect(entry.context).toEqual({ op: 'liquidar' });
  });
});

describe('Logger flush', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('faz flush em batch após 5s em produção', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const log = Logger._forTesting({ isDev: false, level: 'debug', endpoint: 'https://ex/logs' });
    log.info('a');
    log.info('b');
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1].body as string) as { entries: LogEntry[] };
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0].message).toBe('a');
    vi.unstubAllGlobals();
  });
});

describe('LogEntry serialization', () => {
  it('produz LogEntry JSON-serializável com todos os campos', () => {
    const log = Logger._forTesting({ isDev: true, level: 'debug' }, 'ui.relatorios');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('snapshot', { k: 1 });
    const [entry] = log.getRecent(1);
    const round = JSON.parse(JSON.stringify(entry)) as LogEntry;
    expect(round.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(round.level).toBe('info');
    expect(round.source).toBe('ui.relatorios');
    expect(round.context).toEqual({ k: 1 });
    expect(round.message).toBe('snapshot');
  });
});
