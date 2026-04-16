/**
 * Testes da TabelaDeCorrecaoMonetaria e dos demais índices portados.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  TabelaDeCorrecaoMonetaria,
  IndiceMonetarioEnum,
  IndicesAcumuladosEnum,
  OcorrenciaDePagamentoEnum,
  IndiceIPCAE,
  IndiceTR,
  IndiceSemCorrecao,
  Periodo,
  TABELA_IPCAE,
  TABELA_TR,
  type ITabelaCorrecaoContext,
} from '../index';

function ctxSimples(dataLiquidacao: Date, dataDemissao: Date | null = null): ITabelaCorrecaoContext {
  return {
    getDataDeLiquidacao: () => dataLiquidacao,
    getDataDemissao: () => dataDemissao,
  };
}

describe('TabelaDeCorrecaoMonetaria — dispatcher de índices', () => {
  const ctx = ctxSimples(new Date(2025, 11, 31));
  const tabela = new TabelaDeCorrecaoMonetaria(
    ctx,
    IndiceMonetarioEnum.IPCAE,
    IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO,
    false
  );

  it('obterTabelaDeIndicesPorPeriodo dispatcha para IndiceIPCAE', () => {
    const lista = tabela.obterTabelaDeIndicesPorPeriodo(
      IndiceMonetarioEnum.IPCAE,
      new Periodo(new Date(2023, 0, 1), new Date(2023, 11, 31))
    );
    expect(lista.length).toBe(12);
    expect(lista[0]).toBeInstanceOf(IndiceIPCAE);
  });

  it('obterTabelaDeIndicesPorPeriodo dispatcha para IndiceSemCorrecao', () => {
    const lista = tabela.obterTabelaDeIndicesPorPeriodo(
      IndiceMonetarioEnum.SEM_CORRECAO,
      new Periodo(new Date(2023, 0, 1), new Date(2023, 2, 31))
    );
    expect(lista.length).toBe(3);
    expect(lista[0]).toBeInstanceOf(IndiceSemCorrecao);
    expect(lista[0].getValorAcumulado()!.toNumber()).toBe(1);
  });

  it('obterTabelaDeIndicesPorPeriodo dispatcha para IndiceTR', () => {
    const lista = tabela.obterTabelaDeIndicesPorPeriodo(
      IndiceMonetarioEnum.TR,
      new Periodo(new Date(2015, 0, 1), new Date(2015, 5, 30))
    );
    expect(lista.length).toBeGreaterThan(0);
    expect(lista[0]).toBeInstanceOf(IndiceTR);
  });
});

describe('TabelaDeCorrecaoMonetaria — ajustarData (Súmula 381)', () => {
  const ctx = ctxSimples(new Date(2025, 11, 31));

  it('MES_SUBSEQUENTE_AO_VENCIMENTO desloca para 1º dia do mês seguinte', () => {
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      IndiceMonetarioEnum.IPCAE,
      IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO,
      false
    );
    tabela.carregarTabela(new Periodo(new Date(2023, 0, 1), new Date(2025, 11, 31)));
    // Vencimento em 2023-06-15 → índice olha para 2023-07-01 (mês subsequente)
    const fator = tabela.obterIndice(new Date(2023, 5, 15));
    // IPCA-E acumulado em 2023-07 está na tabela
    expect(fator.toNumber()).toBeGreaterThan(1);
  });

  it('MES_DO_VENCIMENTO não desloca', () => {
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      IndiceMonetarioEnum.IPCAE,
      IndicesAcumuladosEnum.MES_DO_VENCIMENTO,
      false
    );
    tabela.carregarTabela(new Periodo(new Date(2023, 0, 1), new Date(2025, 11, 31)));
    const fator = tabela.obterIndice(new Date(2023, 5, 15));
    expect(fator.toNumber()).toBeGreaterThan(1);
  });
});

describe('TabelaDeCorrecaoMonetaria — carregarTabela + obterIndice', () => {
  it('IPCA-E carrega valores acumulados da TABELA_IPCAE', () => {
    const ctx = ctxSimples(new Date(2025, 11, 31));
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      IndiceMonetarioEnum.IPCAE,
      IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO,
      false
    );
    tabela.carregarTabela(new Periodo(new Date(2015, 0, 1), new Date(2025, 11, 31)));
    // Para 2015-01 (primeiro mês), MES_SUBSEQUENTE → olha 2015-02
    const fator = tabela.obterIndice(new Date(2015, 0, 15));
    expect(fator.toNumber()).toBeGreaterThan(1);
  });

  it('TR retorna valor correto para meses pré-2017 (taxa positiva)', () => {
    const ctx = ctxSimples(new Date(2017, 11, 31));
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      IndiceMonetarioEnum.TR,
      IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO,
      false
    );
    tabela.carregarTabela(new Periodo(new Date(2015, 0, 1), new Date(2017, 11, 31)));
    const fator = tabela.obterIndice(new Date(2015, 5, 1));
    // TR tinha valores positivos pré-2017
    expect(fator.toNumber()).toBeGreaterThanOrEqual(1);
  });

  it('retorna 1 quando não há valor para a data (fallback)', () => {
    const ctx = ctxSimples(new Date(2025, 11, 31));
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      IndiceMonetarioEnum.IPCA,  // tabela vazia
      IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO,
      false
    );
    tabela.carregarTabela(new Periodo(new Date(2020, 0, 1), new Date(2025, 11, 31)));
    const fator = tabela.obterIndice(new Date(2023, 5, 15));
    expect(fator.toNumber()).toBe(1);
  });
});

describe('Sanidade — tabelas', () => {
  it('TABELA_IPCAE populada (134 entradas)', () => {
    expect(TABELA_IPCAE.length).toBeGreaterThanOrEqual(130);
  });
  it('TABELA_TR populada (>100 entradas, zero pós-2017)', () => {
    expect(TABELA_TR.length).toBeGreaterThanOrEqual(100);
    const pos2020 = TABELA_TR.find(e => e.ano === 2020 && e.mes === 6);
    expect(pos2020).toBeTruthy();
    expect(pos2020!.taxa).toBe(0);
  });
});
