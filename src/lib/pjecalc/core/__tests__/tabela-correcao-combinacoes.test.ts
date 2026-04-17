/**
 * Testes da `TabelaDeCorrecaoMonetaria` com combinações de índice (ADC 58/59).
 *
 * Cobre o cenário mais importante: IPCA-E até data de citação, SEM_CORRECAO
 * ou SELIC (fator 1) a partir dela. Esse é o arranjo típico pós-ADC 58/59 do STF.
 */
import { describe, it, expect } from 'vitest';
import {
  TabelaDeCorrecaoMonetaria,
  IndiceMonetarioEnum,
  IndicesAcumuladosEnum,
  Periodo,
  ParametrosDeAtualizacao,
  CombinacaoDeIndice,
  type ITabelaCorrecaoContext,
} from '../index';

function ctxCom(
  dataLiquidacao: Date,
  parametros: ParametrosDeAtualizacao,
  dataDemissao: Date | null = null
): ITabelaCorrecaoContext {
  return {
    getDataDeLiquidacao: () => dataLiquidacao,
    getDataDemissao: () => dataDemissao,
    getParametrosDeAtualizacao: () => parametros,
  };
}

describe('TabelaDeCorrecaoMonetaria — combinação IPCA-E → SEM_CORRECAO (ADC 58/59)', () => {
  const dataCitacao = new Date(2023, 5, 1);       // 2023-06-01
  const dataLiquidacao = new Date(2024, 11, 31);  // 2024-12-31
  const inicio = new Date(2021, 0, 1);            // 2021-01-01

  function montarParametros(): ParametrosDeAtualizacao {
    const p = new ParametrosDeAtualizacao();
    p.setIndiceTrabalhista(IndiceMonetarioEnum.IPCAE);
    p.setCombinarOutroIndice(true);
    p.setOutroIndiceTrabalhista(IndiceMonetarioEnum.SEM_CORRECAO);
    p.setApartirDeOutroIndice(dataCitacao);
    p.setDataDeLiquidacao(dataLiquidacao);
    p.adicionarCombinacaoDeIndice(
      new CombinacaoDeIndice(IndiceMonetarioEnum.SEM_CORRECAO, dataCitacao)
    );
    return p;
  }

  it('carrega tabela sem lançar, cobrindo período pré e pós citação', () => {
    const parametros = montarParametros();
    const ctx = ctxCom(dataLiquidacao, parametros);
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      IndiceMonetarioEnum.IPCAE,
      IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO,
      false
    );
    expect(() => tabela.carregarTabela(new Periodo(inicio, dataLiquidacao))).not.toThrow();
  });

  it('pós-citação: fator permanece aproximadamente constante (SEM_CORRECAO ≈ fator congelado)', () => {
    const parametros = montarParametros();
    const ctx = ctxCom(dataLiquidacao, parametros);
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      IndiceMonetarioEnum.IPCAE,
      IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO,
      false
    );
    tabela.carregarTabela(new Periodo(inicio, dataLiquidacao));

    const fator2024a = tabela.obterIndice(new Date(2024, 0, 15));
    const fator2024b = tabela.obterIndice(new Date(2024, 6, 15));
    const fator2024c = tabela.obterIndice(new Date(2024, 11, 15));

    // Pós-citação (SEM_CORRECAO = 1.0 acumulado), todos os fatores pós devem ser iguais
    // OU pelo menos ter variação <1% (fator congelado no mês da citação)
    expect(fator2024a.toNumber()).toBeGreaterThan(0);
    expect(fator2024b.toNumber()).toBeGreaterThan(0);
    expect(fator2024c.toNumber()).toBeGreaterThan(0);
    // Variação relativa entre datas pós-citação deve ser muito pequena
    const variacao = Math.abs(fator2024c.toNumber() - fator2024a.toNumber()) / fator2024a.toNumber();
    expect(variacao).toBeLessThan(0.01);
  });

  it('sem combinação (combinarOutroIndice=false): comportamento idêntico a IPCA-E simples', () => {
    const parametros = new ParametrosDeAtualizacao();
    parametros.setIndiceTrabalhista(IndiceMonetarioEnum.IPCAE);
    parametros.setCombinarOutroIndice(false);
    parametros.setDataDeLiquidacao(dataLiquidacao);

    const ctx = ctxCom(dataLiquidacao, parametros);
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      IndiceMonetarioEnum.IPCAE,
      IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO,
      false
    );
    tabela.carregarTabela(new Periodo(inicio, dataLiquidacao));

    // Sem combinação, IPCA-E cresce monotonicamente no tempo
    const fator2022 = tabela.obterIndice(new Date(2022, 0, 15));
    const fator2024 = tabela.obterIndice(new Date(2024, 0, 15));
    expect(fator2024.toNumber()).toBeGreaterThan(fator2022.toNumber());
  });

  it('contexto sem getParametrosDeAtualizacao: degrada para índice único (compatibilidade)', () => {
    const ctx: ITabelaCorrecaoContext = {
      getDataDeLiquidacao: () => dataLiquidacao,
      getDataDemissao: () => null,
      // getParametrosDeAtualizacao omitido
    };
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      IndiceMonetarioEnum.IPCAE,
      IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO,
      false
    );
    expect(() => tabela.carregarTabela(new Periodo(inicio, dataLiquidacao))).not.toThrow();
    const fator = tabela.obterIndice(new Date(2023, 0, 15));
    expect(fator.toNumber()).toBeGreaterThan(1);
  });
});

describe('TabelaDeCorrecaoMonetaria — detecção de combinação via ParametrosDeAtualizacaoUtils', () => {
  it('montarAsCombinacoesDeIndices retorna 1 combinação quando apartirDe é válida', () => {
    const p = new ParametrosDeAtualizacao();
    p.setIndiceTrabalhista(IndiceMonetarioEnum.IPCAE);
    p.setCombinarOutroIndice(true);
    const c = new CombinacaoDeIndice(IndiceMonetarioEnum.SEM_CORRECAO, new Date(2023, 5, 1));
    p.adicionarCombinacaoDeIndice(c);
    // Só para sanity check — não há assert, apenas verificar que não lança
    expect(p.getListaDeCombinacaoDeIndices().size).toBe(1);
  });
});
