/**
 * Validação cruzada — verifica que os dados extraídos batem com os
 * totais agregados que o próprio OCR reporta.
 *
 * Para Cartão-Ponto:
 *   Cada apuração de dia trabalhado (NORMAL/FERIADO/etc com batidas) tem
 *   evento `horas_trabalhadas` (HT) com o valor que o sistema do empregador
 *   calculou. Somando as batidas (S - E por par), tem que dar HT ± 5min.
 *
 * Quando bate: confiança extra naquele dia (auto-aceito).
 * Quando NÃO bate: dia suspeito → highlight + sugestão de re-checar via IA.
 */

import type { ApuracaoDiaria } from "../parsers/cartao-ponto";

export interface CrossCheckResult {
  /** Total de minutos somando os pares E/S preenchidos. */
  computadoMin: number;
  /** Total de minutos do evento `horas_trabalhadas` do OCR. */
  esperadoMin: number | null;
  /** Diferença em minutos (computado - esperado). 0 = perfeito. */
  diffMin: number;
  /** True se diff ≤ tolerância. */
  ok: boolean;
  /** Tolerância em minutos (default 5 — arredondamentos do espelho). */
  toleranciaMin: number;
}

const TOLERANCIA_MIN_PADRAO = 5;

/** "HH:MM" ou "HHH:MM" (até 999h) → minutos. Retorna null se inválido. */
export function hhmmToMin(s: string): number | null {
  const m = s.match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (min < 0 || min > 59 || h < 0) return null;
  return h * 60 + min;
}

/** Soma os pares E/S em minutos, ignorando órfãos (E sem S ou vice-versa). */
export function somarBatidasMin(ap: ApuracaoDiaria): number {
  let total = 0;
  for (const m of ap.marcacoes) {
    if (!m.e || !m.s) continue;
    const e = hhmmToMin(m.e);
    const s = hhmmToMin(m.s);
    if (e === null || s === null) continue;
    if (s < e) continue; // travessia de meia-noite — fora do escopo
    total += s - e;
  }
  return total;
}

/** Verifica se a soma de batidas bate com o evento `horas_trabalhadas`. */
export function checkHorasTrabalhadas(
  ap: ApuracaoDiaria,
  toleranciaMin = TOLERANCIA_MIN_PADRAO,
): CrossCheckResult {
  const computado = somarBatidasMin(ap);
  const evento = ap.eventos.find((e) => e.tipo === "horas_trabalhadas");
  const esperado = evento ? hhmmToMin(evento.valor) : null;
  const diff = esperado === null ? 0 : computado - esperado;
  const ok = esperado === null || Math.abs(diff) <= toleranciaMin;
  return {
    computadoMin: computado,
    esperadoMin: esperado,
    diffMin: diff,
    ok,
    toleranciaMin,
  };
}

/**
 * Roda a verificação em todas as apurações com batidas e devolve só as
 * que falharam — pra UI destacar.
 */
export function diasComDiscrepancia(
  apuracoes: readonly ApuracaoDiaria[],
  toleranciaMin = TOLERANCIA_MIN_PADRAO,
): Array<{ data: string; check: CrossCheckResult }> {
  const out: Array<{ data: string; check: CrossCheckResult }> = [];
  for (const ap of apuracoes) {
    if (ap.marcacoes.length === 0) continue;
    const check = checkHorasTrabalhadas(ap, toleranciaMin);
    if (!check.ok) out.push({ data: ap.data, check });
  }
  return out;
}

/** Format HH:MM com sinal pra UI. */
export function formatDiff(diffMin: number): string {
  const sign = diffMin >= 0 ? "+" : "-";
  const abs = Math.abs(diffMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
