/**
 * PJe-Calc — Adapters do Engine Portado (Fase 9)
 *
 * Ponto de integração entre o **engine legado** (`engine-v3.ts`, `engine.ts`,
 * `orchestrator.ts`) e o **core portado** (`src/lib/pjecalc/core/`).
 *
 * Cada adapter segue o padrão:
 *
 * ```ts
 * if (isPortedEnabled('CALCULO')) {
 *   return portedImplementation(...);
 * }
 * return legacyImplementation(...);
 * ```
 *
 * As funções aqui são **fachadas idempotentes** — recebem os tipos que o
 * engine legado já usa (Date, string, number), chamam o core (que usa
 * Decimal.js, enums tipados, etc.), e devolvem resultados no formato
 * do engine.
 *
 * ## Design decisions
 *
 * 1. **Nunca quebrar o engine legado**: quando a flag está off (default),
 *    retorno bate 100% com a implementação anterior.
 * 2. **Fail-safe**: se o core lançar exception, o adapter faz fallback
 *    para o legado + log estruturado via `logger.warn` (visível em dev).
 * 3. **Isolamento**: este arquivo não vaza tipos do core (`Calculo`, etc.)
 *    para o engine legado. Cada adapter trafega dados simples.
 *
 * ## Rollback
 *
 * `VITE_USE_PORTED_<MODULO>=false` em `.env` + redeploy → engine volta
 * instantaneamente ao comportamento anterior.
 */
import { Calculo } from './core/dominio/calculo/calculo';
import { isPortedEnabled } from './core/base/comum/feature-flags';
import { logger } from '@/lib/logger';

const adapterLog = logger.child('pjecalc:adapter');

// ═════════════════════════════════════════════════════════════════════
//  CALCULO — prescrição FGTS (STF ARE 709.212)
// ═════════════════════════════════════════════════════════════════════

/**
 * Calcula a data de prescrição do FGTS aplicando as **3 regras do STF
 * ARE 709.212** (13/11/2014). Engine legado usa sempre 5 anos — este
 * adapter traz fidelidade à regra real.
 *
 * **Flag:** `VITE_USE_PORTED_CALCULO=true`
 *
 * Regras portadas (ver `Calculo.getDataPrescricaoFgts`):
 *   - Ajuizamento < 13/11/2014 → trintenária (30 anos)
 *   - Admissão ≤ 13/11/1989 → trintenária (independente do ajuizamento)
 *   - Transição (13/11/2014–13/11/2019) + adm > 1989 → quinquenal
 *   - Ajuizamento ≥ 13/11/2019 → quinquenal universal
 *
 * Quando a flag está off, devolve o comportamento legado: quinquenal
 * universal (`ajuiz − 5 anos`). **Zero regressão por default**.
 *
 * @param dataAjuizamento Data em formato `YYYY-MM-DD` (como no engine)
 * @param dataAdmissao Data de admissão em `YYYY-MM-DD` (opcional; ignorado
 *                     quando flag off)
 * @returns `Date` UTC da prescrição, ou `null` se inputs faltando
 */
export function calcularDataPrescricaoFgts(
  dataAjuizamento: string | null | undefined,
  dataAdmissao?: string | null | undefined,
): Date | null {
  if (!dataAjuizamento) return null;

  if (isPortedEnabled('CALCULO')) {
    try {
      const c = new Calculo();
      c.setDataAjuizamento(parseYMD(dataAjuizamento));
      if (dataAdmissao) c.setDataAdmissao(parseYMD(dataAdmissao));
      return c.getDataPrescricaoFgts();
    } catch (e) {
      // fail-safe: não quebrar o engine se o core falhar
      adapterLog.warn('getDataPrescricaoFgts portado falhou, usando legado', { err: String(e) });
    }
  }

  // Comportamento legado: quinquenal universal (sem as regras STF)
  const ajuiz = parseYMD(dataAjuizamento);
  return new Date(Date.UTC(ajuiz.getUTCFullYear() - 5, ajuiz.getUTCMonth(), ajuiz.getUTCDate()));
}

/**
 * Parse de data YYYY-MM-DD para `Date` UTC. Lança se formato inválido.
 * Não aceita horas/timezone — o engine usa sempre datas "puras" (dia).
 */
function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Data inválida: ${ymd}`);
  return new Date(Date.UTC(y, m - 1, d));
}
