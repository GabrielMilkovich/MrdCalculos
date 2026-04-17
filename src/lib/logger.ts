/**
 * Logger estruturado central do MRD Calc.
 *
 * Objetivos:
 *  - Substituir usos ad-hoc de `console.log` / `console.warn`
 *  - Produzir entradas serializáveis (JSON) com nível, source e contexto
 *  - Em DEV imprime no console com cores; em PROD faz buffer e envia em batch
 *    para um endpoint HTTP configurado via `VITE_LOG_ENDPOINT`.
 *
 * O nível mínimo pode ser controlado via `VITE_LOG_LEVEL`. O default é
 * `'info'` em produção e `'debug'` em desenvolvimento.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  source?: string;
  error?: { name: string; message: string; stack?: string };
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

// Cores ANSI/CSS usadas apenas em DEV.
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#6b7280',
  info: '#2563eb',
  warn: '#d97706',
  error: '#dc2626',
  fatal: '#7c3aed',
};

const FLUSH_INTERVAL_MS = 5000;
const FLUSH_BATCH_SIZE = 50;
const RING_BUFFER_MAX = 500;

interface LoggerEnv {
  isDev: boolean;
  level: LogLevel;
  endpoint?: string;
}

function readEnv(): LoggerEnv {
  const meta = (import.meta as unknown as { env?: Record<string, string> });
  const e = meta?.env ?? ({} as Record<string, string>);
  const isDev = e.DEV === true || e.MODE === 'development' || e.NODE_ENV !== 'production';
  const envLvl = e.VITE_LOG_LEVEL as LogLevel | undefined;
  const level: LogLevel = envLvl && envLvl in LEVEL_ORDER ? envLvl : isDev ? 'debug' : 'info';
  return { isDev, level, endpoint: e.VITE_LOG_ENDPOINT };
}

function serializeError(err: unknown): LogEntry['error'] {
  if (!err) return undefined;
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { name: 'NonError', message: String(err) };
}

export class Logger {
  private env: LoggerEnv;
  private source?: string;
  private buffer: LogEntry[] = [];
  private ring: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(source?: string, env?: LoggerEnv) {
    this.source = source;
    this.env = env ?? readEnv();
    if (!this.env.isDev && this.env.endpoint) {
      this.startFlushTimer();
    }
  }

  child(source: string): Logger {
    const next = new Logger(source, this.env);
    // Sub-loggers compartilham o buffer da raiz para envio consolidado.
    next.buffer = this.buffer;
    next.ring = this.ring;
    return next;
  }

  debug(m: string, c?: LogContext): void { this.write('debug', m, c); }
  info(m: string, c?: LogContext): void { this.write('info', m, c); }
  warn(m: string, c?: LogContext): void { this.write('warn', m, c); }
  error(m: string, err?: unknown, c?: LogContext): void { this.write('error', m, c, err); }
  fatal(m: string, err?: unknown, c?: LogContext): void { this.write('fatal', m, c, err); }

  /** Entradas recentes mantidas em memória (ring buffer) para o painel admin. */
  getRecent(limit = 200): LogEntry[] {
    return this.ring.slice(-limit);
  }

  /** Força flush imediato. Útil em testes ou antes de `beforeunload`. */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    if (!this.env.endpoint) return;
    try {
      await fetch(this.env.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: batch }),
        keepalive: true,
      });
    } catch {
      // Reinjeta no buffer em caso de falha de rede, limitando tamanho.
      this.buffer.unshift(...batch.slice(-FLUSH_BATCH_SIZE));
    }
  }

  private write(level: LogLevel, message: string, context?: LogContext, err?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.env.level]) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(this.source ? { source: this.source } : {}),
      ...(context ? { context } : {}),
      ...(err ? { error: serializeError(err) } : {}),
    };
    this.pushRing(entry);
    if (this.env.isDev) {
      this.printDev(entry);
    } else {
      this.buffer.push(entry);
      if (this.buffer.length >= FLUSH_BATCH_SIZE) void this.flush();
    }
  }

  private pushRing(entry: LogEntry): void {
    this.ring.push(entry);
    if (this.ring.length > RING_BUFFER_MAX) this.ring.splice(0, this.ring.length - RING_BUFFER_MAX);
  }

  private printDev(entry: LogEntry): void {
    const color = LEVEL_COLORS[entry.level];
    const prefix = `[${entry.level.toUpperCase()}]${entry.source ? ` ${entry.source}` : ''}`;
    const payload: unknown[] = [entry.message];
    if (entry.context) payload.push(entry.context);
    if (entry.error) payload.push(entry.error);
    // eslint-disable-next-line no-console
    const sink = entry.level === 'error' || entry.level === 'fatal' ? console.error : entry.level === 'warn' ? console.warn : console.log;
    sink(`%c${prefix}`, `color:${color};font-weight:bold`, ...payload);
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  /** Apenas para testes: permite injetar env customizado. */
  static _forTesting(env: Partial<LoggerEnv>, source?: string): Logger {
    const base = readEnv();
    return new Logger(source, { ...base, ...env });
  }
}

export const logger = new Logger();
