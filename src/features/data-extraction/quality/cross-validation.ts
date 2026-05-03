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

// ============================================================
// Cross-validation Cartão-Ponto: soma mensal das Horas Trabalhadas
// ============================================================

const RE_TOTAL_HT_MENSAL =
  /Horas\s+Trabalhadas\s*[:\s]+(\d{1,3}:\d{2})/gi;

/**
 * Procura no OCR um total mensal de "Horas Trabalhadas" no rodapé do
 * espelho (geralmente segunda ocorrência após os dias). Compara com a
 * soma das HT diárias.
 *
 * Retorna null se não encontrar total mensal (não dá pra checar).
 */
export function checkSomaMensalHT(
  apuracoes: readonly ApuracaoDiaria[],
  ocrText: string,
): { ok: boolean; somaDiariaMin: number; totalMensalMin: number } | null {
  const matches = [...ocrText.matchAll(RE_TOTAL_HT_MENSAL)];
  if (matches.length < 2) return null; // primeira ocorrência é cabeçalho do dia
  const ultimo = matches[matches.length - 1][1];
  const totalMensalMin = hhmmToMin(ultimo);
  if (totalMensalMin === null) return null;
  // Aceita só se total mensal é > 8h (senão provável que pegamos um HT diário).
  if (totalMensalMin < 8 * 60) return null;
  let somaDiariaMin = 0;
  for (const ap of apuracoes) {
    const ev = ap.eventos.find((e) => e.tipo === "horas_trabalhadas");
    if (ev) {
      const v = hhmmToMin(ev.valor);
      if (v !== null) somaDiariaMin += v;
    }
  }
  // Tolerância de 30 minutos no total mensal (acumulação de erros pequenos).
  const ok = Math.abs(somaDiariaMin - totalMensalMin) <= 30;
  return { ok, somaDiariaMin, totalMensalMin };
}

// ============================================================
// Cross-validation Holerite: soma proventos vs total bruto
// ============================================================

const RE_TOTAL_BRUTO =
  /(?:Total\s+(?:de\s+)?Vencimentos|Total\s+(?:de\s+)?Proventos|Vencimentos\s+Total|Bruto)\s*[:R$\s]+([\d.,]+)/i;
const RE_TOTAL_DESCONTO =
  /(?:Total\s+(?:de\s+)?Descontos|Descontos\s+Total)\s*[:R$\s]+([\d.,]+)/i;
const RE_LIQUIDO =
  /(?:Liquido|Valor\s+(?:a\s+)?Receber|Salario\s+Liquido|Liquido\s+a\s+Receber)\s*[:R$\s]+([\d.,]+)/i;

function parseBR(s: string): number | null {
  const cleaned = s.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface CheckHoleriteTotaisResult {
  /** True quando passou (ou quando não há total declarado pra checar). */
  ok: boolean;
  somaProventos: number;
  somaDescontos: number;
  totalBrutoOcr: number | null;
  totalDescontosOcr: number | null;
  liquidoOcr: number | null;
  diffBruto: number;
  diffDescontos: number;
  diffLiquido: number;
}

/**
 * Verifica que a soma das rubricas casa com os totais reportados no OCR.
 * Tolerância default: R$ 0.50 (arredondamento).
 */
export function checkHoleriteTotais(
  rubricas: ReadonlyArray<{
    nome: string;
    valor_vencimento: number | null;
    valor_desconto: number | null;
  }>,
  ocrText: string,
  toleranciaReais = 0.5,
): CheckHoleriteTotaisResult {
  let somaProventos = 0;
  let somaDescontos = 0;
  for (const r of rubricas) {
    if (r.valor_vencimento && r.valor_vencimento > 0) {
      somaProventos += r.valor_vencimento;
    }
    if (r.valor_desconto && r.valor_desconto > 0) {
      somaDescontos += r.valor_desconto;
    }
  }
  const brutoMatch = ocrText.match(RE_TOTAL_BRUTO);
  const descMatch = ocrText.match(RE_TOTAL_DESCONTO);
  const liqMatch = ocrText.match(RE_LIQUIDO);
  const totalBrutoOcr = brutoMatch ? parseBR(brutoMatch[1]) : null;
  const totalDescontosOcr = descMatch ? parseBR(descMatch[1]) : null;
  const liquidoOcr = liqMatch ? parseBR(liqMatch[1]) : null;

  const diffBruto =
    totalBrutoOcr !== null ? somaProventos - totalBrutoOcr : 0;
  const diffDescontos =
    totalDescontosOcr !== null ? somaDescontos - totalDescontosOcr : 0;
  const liqEsperado = liquidoOcr ?? 0;
  const liqComputado = somaProventos - somaDescontos;
  const diffLiquido = liquidoOcr !== null ? liqComputado - liqEsperado : 0;

  const ok =
    (totalBrutoOcr === null || Math.abs(diffBruto) <= toleranciaReais) &&
    (totalDescontosOcr === null || Math.abs(diffDescontos) <= toleranciaReais) &&
    (liquidoOcr === null || Math.abs(diffLiquido) <= toleranciaReais);

  return {
    ok,
    somaProventos,
    somaDescontos,
    totalBrutoOcr,
    totalDescontosOcr,
    liquidoOcr,
    diffBruto,
    diffDescontos,
    diffLiquido,
  };
}

// ============================================================
// Cross-validation Férias: dias entre gozo[N].inicio e .fim == prazo
// ============================================================

function diasEntreBR(inicio: string, fim: string): number | null {
  const m1 = inicio.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const m2 = fim.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m1 || !m2) return null;
  const d1 = new Date(parseInt(m1[3], 10), parseInt(m1[2], 10) - 1, parseInt(m1[1], 10));
  const d2 = new Date(parseInt(m2[3], 10), parseInt(m2[2], 10) - 1, parseInt(m2[1], 10));
  if (d2 < d1) return null;
  // Inclusivo (1/6 a 30/6 = 30 dias).
  return Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

export interface CheckFeriasResult {
  ok: boolean;
  prazo: number;
  diasGozados: number;
  diasAbono: number;
  diff: number;
}

/**
 * Soma os dias dos gozos + abono pecuniário e compara com `prazo`.
 * Quando situacao=I (indenizada) ou NG (não gozada), não há gozos —
 * cross-check passa trivial.
 */
export function checkFerias(f: {
  prazo: number;
  situacao: string;
  abono: boolean;
  dias_abono: number;
  gozo1: { inicio: string; fim: string } | null;
  gozo2: { inicio: string; fim: string } | null;
  gozo3: { inicio: string; fim: string } | null;
}): CheckFeriasResult {
  const gozos = [f.gozo1, f.gozo2, f.gozo3].filter((g) => g !== null);
  if (gozos.length === 0) {
    return {
      ok: true,
      prazo: f.prazo,
      diasGozados: 0,
      diasAbono: f.dias_abono,
      diff: 0,
    };
  }
  let diasGozados = 0;
  for (const g of gozos) {
    const d = diasEntreBR(g!.inicio, g!.fim);
    if (d !== null) diasGozados += d;
  }
  const total = diasGozados + (f.abono ? f.dias_abono : 0);
  const diff = total - f.prazo;
  // Tolerância de 1 dia (rubricas de início/fim podem variar).
  return {
    ok: Math.abs(diff) <= 1,
    prazo: f.prazo,
    diasGozados,
    diasAbono: f.dias_abono,
    diff,
  };
}

// ============================================================
// Cross-validation Faltas: ordem cronológica + sem overlap
// ============================================================

export interface CheckFaltasResult {
  ok: boolean;
  problemas: Array<{
    indice: number;
    tipo: "ordem-quebrada" | "overlap";
    detalhe: string;
  }>;
}

export function checkFaltas(
  faltas: ReadonlyArray<{ data_inicio: string; data_fim: string }>,
): CheckFaltasResult {
  const problemas: CheckFaltasResult["problemas"] = [];
  const ordenadas = [...faltas].sort((a, b) =>
    a.data_inicio.localeCompare(b.data_inicio),
  );
  // Ordem (a entrada já deveria vir ordenada — sinaliza se não)
  for (let i = 0; i < faltas.length; i++) {
    if (faltas[i].data_inicio !== ordenadas[i].data_inicio) {
      problemas.push({
        indice: i,
        tipo: "ordem-quebrada",
        detalhe: `posição ${i}: ${faltas[i].data_inicio} mas ordenado seria ${ordenadas[i].data_inicio}`,
      });
      break; // 1 problema basta pra sinalizar
    }
  }
  // Overlap entre intervalos
  for (let i = 0; i < ordenadas.length - 1; i++) {
    const a = ordenadas[i];
    const b = ordenadas[i + 1];
    if (a.data_fim >= b.data_inicio) {
      problemas.push({
        indice: i,
        tipo: "overlap",
        detalhe: `${a.data_inicio}–${a.data_fim} sobrepõe ${b.data_inicio}–${b.data_fim}`,
      });
    }
  }
  return { ok: problemas.length === 0, problemas };
}
