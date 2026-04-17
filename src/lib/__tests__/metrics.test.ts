/**
 * Testes das métricas em memória (`src/lib/metrics.ts`).
 */
import { describe, it, expect } from 'vitest';
import { Metrics } from '../metrics';

describe('Metrics.counter', () => {
  it('incrementa contador simples', () => {
    const m = new Metrics();
    const c = m.counter('liquidacao.iniciada');
    c.inc();
    c.inc(2);
    expect(c.get()).toBe(3);
    expect(m.getSnapshot()['liquidacao.iniciada']).toBe(3);
  });

  it('separa contadores por labels', () => {
    const m = new Metrics();
    m.counter('liquidacao.erro', { tipo: 'validacao' }).inc();
    m.counter('liquidacao.erro', { tipo: 'validacao' }).inc();
    m.counter('liquidacao.erro', { tipo: 'sistema' }).inc();
    const snap = m.getSnapshot();
    expect(snap['liquidacao.erro{tipo=validacao}']).toBe(2);
    expect(snap['liquidacao.erro{tipo=sistema}']).toBe(1);
  });
});

describe('Metrics.timer', () => {
  it('mede duração entre start/end', () => {
    let t = 0;
    const m = new Metrics(() => t);
    const timer = m.timer('liquidacao.duracao');
    const run = timer.start();
    t = 125;
    const elapsed = run.end();
    expect(elapsed).toBe(125);
    expect(timer.stats()).toEqual({ count: 1, totalMs: 125, lastMs: 125 });
  });
});

describe('Metrics.getSnapshot', () => {
  it('inclui counters e stats de timers', () => {
    let t = 0;
    const m = new Metrics(() => t);
    m.counter('req.total').inc(5);
    const timer = m.timer('req.duracao', { rota: '/a' });
    const s = timer.start();
    t = 40;
    s.end();
    const snap = m.getSnapshot();
    expect(snap['req.total']).toBe(5);
    expect(snap['req.duracao{rota=/a}.count']).toBe(1);
    expect(snap['req.duracao{rota=/a}.total_ms']).toBe(40);
    expect(snap['req.duracao{rota=/a}.last_ms']).toBe(40);
    expect(snap['req.duracao{rota=/a}.avg_ms']).toBe(40);
  });
});
