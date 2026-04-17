/**
 * Métricas em memória (contadores + timers) para observabilidade básica.
 *
 * API enxuta inspirada em Prometheus/StatsD:
 *
 *   metrics.counter('liquidacao.iniciada').inc();
 *   metrics.counter('liquidacao.erro', { tipo: 'validacao' }).inc();
 *   const timer = metrics.timer('liquidacao.duracao').start();
 *   timer.end();
 *
 * O snapshot achata labels em sufixos `{k=v}` para leitura simples no painel
 * admin. Em produção o snapshot pode ser enviado junto com o logger.
 */

export type Labels = Record<string, string | number>;

interface CounterSample {
  name: string;
  labels: Labels;
  value: number;
}

interface TimingSample {
  name: string;
  labels: Labels;
  count: number;
  totalMs: number;
  lastMs: number;
}

function keyOf(name: string, labels: Labels): string {
  const parts = Object.keys(labels)
    .sort()
    .map((k) => `${k}=${String(labels[k])}`);
  return parts.length ? `${name}{${parts.join(',')}}` : name;
}

export interface CounterHandle {
  inc(by?: number): void;
  get(): number;
}

export interface TimerStart {
  end(): number;
}

export interface TimerHandle {
  start(): TimerStart;
  observe(ms: number): void;
  stats(): { count: number; totalMs: number; lastMs: number };
}

export class Metrics {
  private counters = new Map<string, CounterSample>();
  private timings = new Map<string, TimingSample>();
  private now: () => number;

  constructor(now: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    this.now = now;
  }

  counter(name: string, labels: Labels = {}): CounterHandle {
    const key = keyOf(name, labels);
    let s = this.counters.get(key);
    if (!s) { s = { name, labels, value: 0 }; this.counters.set(key, s); }
    return { inc: (by = 1) => { s!.value += by; }, get: () => s!.value };
  }

  timer(name: string, labels: Labels = {}): TimerHandle {
    const key = keyOf(name, labels);
    let sample = this.timings.get(key);
    if (!sample) {
      sample = { name, labels, count: 0, totalMs: 0, lastMs: 0 };
      this.timings.set(key, sample);
    }
    const observe = (ms: number) => {
      sample!.count += 1;
      sample!.totalMs += ms;
      sample!.lastMs = ms;
    };
    return {
      start: (): TimerStart => {
        const startedAt = this.now();
        return {
          end: () => {
            const elapsed = this.now() - startedAt;
            observe(elapsed);
            return elapsed;
          },
        };
      },
      observe,
      stats: () => ({ count: sample!.count, totalMs: sample!.totalMs, lastMs: sample!.lastMs }),
    };
  }

  /** Retorna um snapshot achatado — útil para painel admin e envio ao backend. */
  getSnapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [key, s] of this.counters) out[key] = s.value;
    for (const [key, s] of this.timings) {
      out[`${key}.count`] = s.count;
      out[`${key}.total_ms`] = s.totalMs;
      out[`${key}.last_ms`] = s.lastMs;
      out[`${key}.avg_ms`] = s.count ? s.totalMs / s.count : 0;
    }
    return out;
  }

  /** Zera todas as métricas. Uso típico: testes. */
  reset(): void {
    this.counters.clear();
    this.timings.clear();
  }
}

export const metrics = new Metrics();
