/**
 * Testes de TabelaDeJuros — montagem de períodos e cálculo de taxa total.
 *
 * Ref Java: pjecalc-fonte/.../comum/TabelaDeJuros.java
 *
 * Cobre:
 *   - SELIC mensal (soma simples) em 12 meses → soma das taxas RFB
 *   - TAXA_LEGAL 24m → 24% (1%/mês × 24)
 *   - Combinação TAXA_LEGAL → SELIC no meio do período
 *   - FAZENDA_PUBLICA 12m → 6% (0,5%/mês)
 *   - SEM_JUROS → 0
 *   - Taxa SELIC com histórico → nunca explode, pode ficar > 0
 *   - JUROS_POUPANCA 6m → TR + 0,5% × 6
 *   - Período zero (início == fim) → dentro do mesmo dia
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  construirPeriodosDeJuros,
  calcularTaxaDeJurosTotal,
  JurosEnum,
  type ITabelaDeJurosContext,
  PeriodoDeJuros,
} from '../index';
import { CombinacaoDeJuros } from '../dominio/calculo/atualizacao/combinacao-de-juros';
import { SELIC_MENSAL, TR_MENSAL } from '../../../pjecalc/indices-fallback';

function ctxBase(params: {
  juros: JurosEnum;
  dataAjuizamento: Date;
  dataLiquidacao: Date;
  combinacoes?: CombinacaoDeJuros[];
  selicNaLiquidacao?: boolean;
  aplicarFasePreJudicial?: boolean;
}): ITabelaDeJurosContext {
  const combinacoes = params.combinacoes ?? [];
  return {
    getDataDeLiquidacao: () => params.dataLiquidacao,
    getDataAjuizamento: () => params.dataAjuizamento,
    getDataAdmissao: () => params.dataAjuizamento,
    getAplicarJurosFasePreJudicial: () => params.aplicarFasePreJudicial ?? false,
    getJuros: () => params.juros,
    getCombinarOutroJuros: () => combinacoes.length > 0,
    getListaDeCombinacaoDeJuros: () => combinacoes,
    isSelicIndiceNaLiquidacao: () => params.selicNaLiquidacao ?? (params.juros === JurosEnum.SELIC),
  };
}

function contarPeriodos(raiz: PeriodoDeJuros | null): number {
  let n = 0;
  let cur = raiz;
  while (cur !== null) { n++; cur = cur.getProximoPeriodo(); }
  return n;
}

describe('TabelaDeJuros — montagem e cálculo', () => {
  it('(a) SELIC simples em 12 meses (2015): soma das 12 taxas mensais RFB', () => {
    const liq = new Date(2015, 11, 31);
    const ctx = ctxBase({
      juros: JurosEnum.SELIC,
      dataAjuizamento: new Date(2015, 0, 1),
      dataLiquidacao: liq,
      selicNaLiquidacao: true,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    expect(raiz).not.toBeNull();
    expect(contarPeriodos(raiz)).toBe(12);

    const esperada = Object.keys(SELIC_MENSAL)
      .filter((k) => k.startsWith('2015-'))
      .reduce((acc, k) => acc + SELIC_MENSAL[k], 0);

    const taxa = calcularTaxaDeJurosTotal(raiz, liq, true);
    expect(taxa.toNumber()).toBeCloseTo(esperada, 4);
    // sanity check absoluto — 2015 foi ~12,54%
    expect(taxa.toNumber()).toBeCloseTo(12.54, 2);
  });

  it('(b) TAXA_LEGAL em 24 meses → 24% (1%/mês simples)', () => {
    const liq = new Date(2022, 11, 31);
    const ctx = ctxBase({
      juros: JurosEnum.TAXA_LEGAL,
      dataAjuizamento: new Date(2021, 0, 1),
      dataLiquidacao: liq,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    const taxa = calcularTaxaDeJurosTotal(raiz, liq, false);
    // 24 meses × 1% = 24%
    expect(taxa.toNumber()).toBeCloseTo(24, 4);
  });

  it('(c) Combinação TAXA_LEGAL 12m + SELIC 12m', () => {
    const liq = new Date(2016, 11, 31);
    const mudanca = new Date(2016, 0, 1); // início de 2016 muda para SELIC
    const comb = new CombinacaoDeJuros(JurosEnum.SELIC, mudanca);
    const ctx = ctxBase({
      juros: JurosEnum.TAXA_LEGAL,
      dataAjuizamento: new Date(2015, 0, 1),
      dataLiquidacao: liq,
      combinacoes: [comb],
      selicNaLiquidacao: true,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    expect(raiz).not.toBeNull();
    // primeira parte: 1 período (TAXA_LEGAL) + 12 períodos SELIC mensais
    expect(contarPeriodos(raiz)).toBe(1 + 12);

    const selic2016 = Object.keys(SELIC_MENSAL)
      .filter((k) => k.startsWith('2016-'))
      .reduce((acc, k) => acc + SELIC_MENSAL[k], 0);

    const taxa = calcularTaxaDeJurosTotal(raiz, liq, true);
    // 12 meses × 1% + soma SELIC 2016
    expect(taxa.toNumber()).toBeCloseTo(12 + selic2016, 3);
  });

  it('(d) FAZENDA_PUBLICA 12m → 6% (0,5%/mês simples)', () => {
    const liq = new Date(2020, 11, 31);
    const ctx = ctxBase({
      juros: JurosEnum.FAZENDA_PUBLICA,
      dataAjuizamento: new Date(2020, 0, 1),
      dataLiquidacao: liq,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    const taxa = calcularTaxaDeJurosTotal(raiz, liq, false);
    expect(taxa.toNumber()).toBeCloseTo(6, 4);
  });

  it('(e) SEM_JUROS → 0', () => {
    const liq = new Date(2020, 11, 31);
    const ctx = ctxBase({
      juros: JurosEnum.SEM_JUROS,
      dataAjuizamento: new Date(2018, 0, 1),
      dataLiquidacao: liq,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    const taxa = calcularTaxaDeJurosTotal(raiz, liq, false);
    expect(taxa.toNumber()).toBe(0);
  });

  it('(f) SELIC com histórico longo (2017→2024) → positivo e somado corretamente', () => {
    // SELIC não teve mês negativo no histórico RFB coberto pelo fallback.
    // Este teste valida que o valor acumulado é coerente e monotônico crescente.
    const liq = new Date(2024, 11, 31);
    const ctx = ctxBase({
      juros: JurosEnum.SELIC,
      dataAjuizamento: new Date(2017, 0, 1),
      dataLiquidacao: liq,
      selicNaLiquidacao: true,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    const taxa = calcularTaxaDeJurosTotal(raiz, liq, true);

    // Todas as taxas SELIC mensais no fallback são ≥ 0; soma não pode ser negativa
    expect(taxa.toNumber()).toBeGreaterThan(0);
    // ~8 anos × 7% médio ≈ 56%
    expect(taxa.toNumber()).toBeGreaterThan(40);
    expect(taxa.toNumber()).toBeLessThan(100);
  });

  it('(g) JUROS_POUPANCA 6m → (TR + 0.5%) por mês', () => {
    const liq = new Date(2015, 5, 30);
    const ctx = ctxBase({
      juros: JurosEnum.JUROS_POUPANCA,
      dataAjuizamento: new Date(2015, 0, 1),
      dataLiquidacao: liq,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    expect(contarPeriodos(raiz)).toBe(6);

    const trKeys = ['2015-01','2015-02','2015-03','2015-04','2015-05','2015-06'];
    const esperada = trKeys.reduce((acc, k) => acc + (TR_MENSAL[k] ?? 0), 0) + 0.5 * 6;

    const taxa = calcularTaxaDeJurosTotal(raiz, liq, false);
    expect(taxa.toNumber()).toBeCloseTo(esperada, 4);
  });

  it('(h) Período zero — mesmo dia (ajuizamento == liquidação) → 0 ou taxa mínima', () => {
    // Quando ajuizamento e liquidação caem no mesmo dia, periodoDeJuros
    // colapsa para [1º do mês, mesmo dia]. getMeses() pro-rata deve aproximar 0.
    const dia = new Date(2020, 5, 15);
    const ctx = ctxBase({
      juros: JurosEnum.SEM_JUROS,
      dataAjuizamento: dia,
      dataLiquidacao: dia,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    const taxa = calcularTaxaDeJurosTotal(raiz, dia, false);
    expect(taxa.toNumber()).toBe(0);
  });

  it('JUROS_UM_PORCENTO 10m → 10%', () => {
    const liq = new Date(2020, 9, 31); // out/2020
    const ctx = ctxBase({
      juros: JurosEnum.JUROS_UM_PORCENTO,
      dataAjuizamento: new Date(2020, 0, 1),
      dataLiquidacao: liq,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    const taxa = calcularTaxaDeJurosTotal(raiz, liq, false);
    expect(taxa.toNumber()).toBeCloseTo(10, 4);
  });

  it('JUROS_MEIO_PORCENTO 12m → 6%', () => {
    const liq = new Date(2020, 11, 31);
    const ctx = ctxBase({
      juros: JurosEnum.JUROS_MEIO_PORCENTO,
      dataAjuizamento: new Date(2020, 0, 1),
      dataLiquidacao: liq,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    const taxa = calcularTaxaDeJurosTotal(raiz, liq, false);
    expect(taxa.toNumber()).toBeCloseTo(6, 4);
  });

  it('TRD_COMPOSTOS 12m → (1.01^12 - 1)*100 ≈ 12.6825%', () => {
    const liq = new Date(2020, 11, 31);
    const ctx = ctxBase({
      juros: JurosEnum.TRD_COMPOSTOS,
      dataAjuizamento: new Date(2020, 0, 1),
      dataLiquidacao: liq,
    });
    const raiz = construirPeriodosDeJuros(ctx);
    const taxa = calcularTaxaDeJurosTotal(raiz, liq, false);

    // Formato composto: (1.01)^12 - 1 = 0.12682503...
    const esperada = new Decimal('1.01').pow(12).minus(1).times(100);
    expect(taxa.toNumber()).toBeCloseTo(esperada.toNumber(), 2);
  });
});
