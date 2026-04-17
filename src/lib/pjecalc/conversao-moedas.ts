/**
 * Tabela de Conversão de Moedas Brasileiras (1986-1994) + UFIR.
 *
 * Módulo "enxuto" de alto nível para converter valores históricos em moedas
 * extintas (Cruzado, Cruzado Novo, Cruzeiro, Cruzeiro Real) para Real (BRL),
 * aplicando URV no período de transição (mar/1994 a jun/1994) e UFIR
 * (índice fiscal 1992-1995).
 *
 * Marcos históricos:
 *   28/02/1986: Cruzeiro (Cr$)       → Cruzado (Cz$)          (÷ 1.000)
 *   16/01/1989: Cruzado (Cz$)        → Cruzado Novo (NCz$)    (÷ 1.000)
 *   16/03/1990: Cruzado Novo (NCz$)  → Cruzeiro (Cr$)         (1:1 renomeação)
 *   01/08/1993: Cruzeiro (Cr$)       → Cruzeiro Real (CR$)    (÷ 1.000)
 *   01/07/1994: Cruzeiro Real (CR$)  → Real (R$)              (÷ 2.750 via URV)
 *
 * Todas operações em Decimal.js (precisão 20).
 *
 * Ref Java: pjecalc-fonte/.../constantes/ConversaoDeMoedas.java
 * (porte 1:1 literal vive em core/constantes/conversao-de-moedas.ts)
 */
import Decimal from 'decimal.js';

Decimal.set({ precision: 20 });

// ============================================================================
// Enum de moedas
// ============================================================================

export enum Moeda {
  CRUZEIRO = 'CRUZEIRO',           // Cr$ — até 27/02/1986
  CRUZADO = 'CRUZADO',             // Cz$ — 28/02/1986 a 15/01/1989
  CRUZADO_NOVO = 'CRUZADO_NOVO',   // NCz$ — 16/01/1989 a 15/03/1990
  CRUZEIRO_CR = 'CRUZEIRO_CR',     // Cr$ — 16/03/1990 a 31/07/1993 (renomeado)
  CRUZEIRO_REAL = 'CRUZEIRO_REAL', // CR$ — 01/08/1993 a 30/06/1994
  REAL = 'REAL',                   // R$ — a partir de 01/07/1994
}

// ============================================================================
// Tabela de transições (ordem cronológica)
// ============================================================================

interface Transicao {
  readonly data: Date;
  readonly de: Moeda;
  readonly para: Moeda;
  readonly fator: Decimal; // divisor aplicado ao valor na moeda "de"
}

function d(y: number, m1: number, dia: number): Date {
  return new Date(y, m1 - 1, dia, 0, 0, 0, 0);
}

/** Transições em ordem cronológica crescente. */
export const CONVERSOES: readonly Transicao[] = [
  { data: d(1986, 2, 28), de: Moeda.CRUZEIRO, para: Moeda.CRUZADO, fator: new Decimal(1000) },
  { data: d(1989, 1, 16), de: Moeda.CRUZADO, para: Moeda.CRUZADO_NOVO, fator: new Decimal(1000) },
  { data: d(1990, 3, 16), de: Moeda.CRUZADO_NOVO, para: Moeda.CRUZEIRO_CR, fator: new Decimal(1) },
  { data: d(1993, 8, 1),  de: Moeda.CRUZEIRO_CR, para: Moeda.CRUZEIRO_REAL, fator: new Decimal(1000) },
  { data: d(1994, 7, 1),  de: Moeda.CRUZEIRO_REAL, para: Moeda.REAL, fator: new Decimal(2750) },
] as const;

// ============================================================================
// Moeda vigente em certa data
// ============================================================================

export function moedaVigenteEm(data: Date): Moeda {
  const t = data.getTime();
  if (t < CONVERSOES[0].data.getTime()) return Moeda.CRUZEIRO;
  for (let i = CONVERSOES.length - 1; i >= 0; i--) {
    if (t >= CONVERSOES[i].data.getTime()) return CONVERSOES[i].para;
  }
  return Moeda.CRUZEIRO;
}

// ============================================================================
// URV — Unidade Real de Valor (01/03/1994 a 30/06/1994)
// ============================================================================

/**
 * URV diária simplificada: valores em CR$ por 1 URV.
 * Fonte: BCB (aproximação por amostras de datas-chave, contexto de validação).
 * Para datas entre amostras usa a amostra mais recente anterior.
 */
const URV_AMOSTRAS: readonly { data: Date; valorCr: Decimal }[] = [
  { data: d(1994, 3, 1),  valorCr: new Decimal('647.50') },
  { data: d(1994, 4, 1),  valorCr: new Decimal('931.08') },
  { data: d(1994, 5, 1),  valorCr: new Decimal('1323.92') },
  { data: d(1994, 6, 1),  valorCr: new Decimal('1875.22') },
  { data: d(1994, 6, 30), valorCr: new Decimal('2750.00') },
] as const;

function urvEm(data: Date): Decimal {
  const t = data.getTime();
  let escolhida = URV_AMOSTRAS[0].valorCr;
  for (const a of URV_AMOSTRAS) {
    if (t >= a.data.getTime()) escolhida = a.valorCr;
  }
  return escolhida;
}

const INICIO_URV = d(1994, 3, 1);
const FIM_URV = d(1994, 7, 1);

export function estaNoPeriodoURV(data: Date): boolean {
  const t = data.getTime();
  return t >= INICIO_URV.getTime() && t < FIM_URV.getTime();
}

// ============================================================================
// Conversão para Real
// ============================================================================

/**
 * Converte valor monetário de sua moeda vigente na `dataOriginal` para Real (R$).
 *
 * Estratégia:
 * - Se a data está no período URV (mar-jun/1994), divide pelo valor da URV
 *   daquela data (CR$ por 1 URV ≈ R$ 1 ao término).
 * - Caso contrário, aplica em sequência todas as transições posteriores
 *   à data original (÷1000, ÷1000, ×1, ÷1000, ÷2750 conforme o caso).
 */
export function converterParaReal(
  valor: Decimal | string,
  dataOriginal: Date,
): Decimal {
  let resultado = valor instanceof Decimal ? valor : new Decimal(valor);

  if (estaNoPeriodoURV(dataOriginal)) {
    // Valor em CR$ dividido pela URV do dia → Real
    return resultado.div(urvEm(dataOriginal));
  }

  const t = dataOriginal.getTime();
  for (const c of CONVERSOES) {
    if (c.data.getTime() > t && !c.fator.equals(1)) {
      resultado = resultado.div(c.fator);
    }
  }
  return resultado;
}

// ============================================================================
// UFIR — Unidade Fiscal de Referência (1992-1995)
// ============================================================================

/**
 * UFIR anual (valor em Real no último trimestre do ano).
 * Fonte: Receita Federal (valores históricos convertidos para R$).
 * 1992/1993 expressos em moeda da época convertida a Real para uso direto.
 */
export const UFIR_ANUAL: Readonly<Record<number, Decimal>> = {
  1992: new Decimal('0.00001'),
  1993: new Decimal('0.01'),
  1994: new Decimal('0.5618'),
  1995: new Decimal('0.7061'),
} as const;

export function ufirDoAno(ano: number): Decimal {
  const v = UFIR_ANUAL[ano];
  if (!v) throw new Error(`UFIR não disponível para o ano ${ano}`);
  return v;
}

/**
 * Converte um valor expresso em UFIR (quantidade de UFIRs) para Real,
 * multiplicando pelo valor da UFIR do ano da `data`.
 * O valor resultante já está em Real — não passa por conversão de moedas.
 */
export function converterUfirParaReal(valorUfir: Decimal, data: Date): Decimal {
  const ano = data.getFullYear();
  return valorUfir.mul(ufirDoAno(ano));
}
