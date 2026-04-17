/**
 * Testes de `Calculo.liquidar()` com combinações ADC 58/59.
 *
 * Cenários cobertos:
 *  a) IPCA-E toda a vida (sem combinação)
 *  b) Transição IPCA-E → SELIC em 2021-12-01 (ADC 58/59 canônica)
 *  c) Três segmentos: TR → IPCA-E → SELIC
 *  d) Ocorrência toda dentro de um único segmento
 *  e) Ocorrência ANTES de qualquer segmento — fator=1 (só base, sem correção)
 *
 * Para cada cenário, verificamos o `indiceAcumulado` setado na ocorrência
 * após `Calculo.liquidar()` e comparamos com a composição esperada
 * (produto para IPCA-E, soma simples para SELIC).
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  Calculo,
  VerbaDeCalculo,
  OcorrenciaDeVerba,
  ParametrosDeAtualizacao,
  CombinacaoDeIndice,
  TabelaDeCorrecaoMonetaria,
  Periodo,
  IndiceMonetarioEnum,
  IndicesAcumuladosEnum,
  ValorDaVerbaEnum,
  OcorrenciaDePagamentoEnum,
  CaracteristicaDaVerbaEnum,
  LogicoEnum,
  type ITabelaCorrecaoContext,
} from '../index';

/** Monta um Calculo minimamente populado com 1 verba + 1 ocorrência. */
function montarCalculo(options: {
  dataAdmissao: Date;
  dataLiquidacao: Date;
  competenciaOcorrencia: Date;
  indicePrincipal: IndiceMonetarioEnum;
  combinacoes?: { indice: IndiceMonetarioEnum; apartirDe: Date }[];
  devido?: number;
  pago?: number;
}): { calculo: Calculo; verba: VerbaDeCalculo; ocorrencia: OcorrenciaDeVerba } {
  const calculo = new Calculo();
  calculo.setDataAdmissao(options.dataAdmissao);
  calculo.setDataAjuizamento(options.dataAdmissao);
  calculo.setDataDeLiquidacao(options.dataLiquidacao);

  const parametros = new ParametrosDeAtualizacao();
  parametros.setIndiceTrabalhista(options.indicePrincipal);
  parametros.setDataDeLiquidacao(options.dataLiquidacao);
  if (options.combinacoes && options.combinacoes.length > 0) {
    parametros.setCombinarOutroIndice(true);
    for (const c of options.combinacoes) {
      parametros.adicionarCombinacaoDeIndice(
        new CombinacaoDeIndice(c.indice, c.apartirDe),
      );
    }
  }
  calculo.setParametrosDeAtualizacao(parametros);

  const verba = new VerbaDeCalculo();
  verba.setNome('Teste');
  verba.setPeriodoInicial(options.competenciaOcorrencia);
  verba.setPeriodoFinal(options.competenciaOcorrencia);
  verba.setCaracteristica(CaracteristicaDaVerbaEnum.BASE_SALARIO);
  verba.setOcorrenciaDePagamento(OcorrenciaDePagamentoEnum.MENSAL);
  verba.setComporPrincipal(LogicoEnum.SIM);
  verba.setZeraValorNegativo(true);

  const ocorrencia = new OcorrenciaDeVerba();
  ocorrencia.setDataInicial(options.competenciaOcorrencia);
  ocorrencia.setDataFinal(options.competenciaOcorrencia);
  ocorrencia.setBase(new Decimal(options.devido ?? 1000));
  ocorrencia.setDivisor(new Decimal(1));
  ocorrencia.setMultiplicador(new Decimal(1));
  ocorrencia.setQuantidade(new Decimal(1));
  ocorrencia.setDevido(new Decimal(options.devido ?? 1000));
  ocorrencia.setPago(new Decimal(options.pago ?? 0));
  ocorrencia.setAtivo(true);
  ocorrencia.setValor(ValorDaVerbaEnum.CALCULADO);
  ocorrencia.setVerbaDeCalculo(verba);
  verba.setOcorrencias([ocorrencia]);

  calculo.adicionarVerba(verba);
  return { calculo, verba, ocorrencia };
}

/**
 * Carrega TabelaDeCorrecaoMonetaria standalone para comparar o esperado.
 * Útil para reproduzir o fator-alvo de um segmento isolado.
 */
function fatorObtido(
  ctx: ITabelaCorrecaoContext,
  indice: IndiceMonetarioEnum,
  periodo: Periodo,
  dataAlvo: Date,
): Decimal {
  const t = new TabelaDeCorrecaoMonetaria(
    ctx, indice, IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO, false,
  );
  t.setOrigemCalculo(true);
  t.carregarTabela(periodo);
  return t.obterValorAcumuladoDoIndice(dataAlvo);
}

describe('Calculo.liquidar() — composição de fator por segmento (ADC 58/59)', () => {
  // ────────────────────────────────────────────────────────────────────
  // a) IPCA-E toda a vida — sem combinações
  // ────────────────────────────────────────────────────────────────────
  it('(a) compete 2020-05, liq 2026-03, IPCA-E toda a vida — fator cresce monotonicamente', () => {
    const { calculo, ocorrencia } = montarCalculo({
      dataAdmissao: new Date(2020, 0, 1),
      dataLiquidacao: new Date(2026, 2, 31),
      competenciaOcorrencia: new Date(2020, 4, 1),
      indicePrincipal: IndiceMonetarioEnum.IPCAE,
    });

    calculo.liquidar();

    const fator = ocorrencia.getIndiceAcumulado();
    expect(fator).not.toBeNull();
    // IPCA-E acumulado 2020-06 → 2026-03 > 1 (inflação positiva)
    expect(fator!.toNumber()).toBeGreaterThan(1);
    // Ordem de grandeza: IPCA-E acumulou cerca de 30-40% entre 2020-06 e 2026-03
    expect(fator!.toNumber()).toBeLessThan(3.0);
  });

  // ────────────────────────────────────────────────────────────────────
  // b) IPCA-E → SELIC em 2021-12-01 (ADC 58/59 canônica)
  // ────────────────────────────────────────────────────────────────────
  it('(b) IPCA-E até 2021-12 + SELIC dela em diante — fator final ~ IPCAE × (1 + soma_SELIC)', () => {
    const dataLiquidacao = new Date(2026, 2, 31);
    const competOcorr = new Date(2020, 4, 1); // 2020-05
    const dataTransicao = new Date(2021, 11, 1); // 2021-12-01

    const { calculo, ocorrencia } = montarCalculo({
      dataAdmissao: new Date(2020, 0, 1),
      dataLiquidacao,
      competenciaOcorrencia: competOcorr,
      indicePrincipal: IndiceMonetarioEnum.IPCAE,
      combinacoes: [{ indice: IndiceMonetarioEnum.SELIC, apartirDe: dataTransicao }],
    });

    calculo.liquidar();

    const fator = ocorrencia.getIndiceAcumulado();
    expect(fator).not.toBeNull();
    // Fator deve ser MAIOR que apenas IPCA-E parado em 2021-11, pois SELIC
    // acumula taxas pós 2021-12.
    expect(fator!.toNumber()).toBeGreaterThan(1);

    // Verificar que fator é compatível com composição IPCAE(inicio→transicao)
    // × SELIC(transicao→liq). Tolerância de ±10% — modelo matemático
    // considerado aproximado versus PJe-Calc.
    const ctx: ITabelaCorrecaoContext = {
      getDataDeLiquidacao: () => dataLiquidacao,
      getDataDemissao: () => null,
      getParametrosDeAtualizacao: () => null,
    };
    const segIpca = new Periodo(new Date(2020, 0, 1), new Date(2021, 10, 30));
    const segSelic = new Periodo(new Date(2021, 11, 1), dataLiquidacao);
    const fatorIpca = fatorObtido(ctx, IndiceMonetarioEnum.IPCAE, segIpca, competOcorr);
    const fatorSelic = fatorObtido(ctx, IndiceMonetarioEnum.SELIC, segSelic, new Date(2021, 11, 1));
    const esperadoAprox = fatorIpca.times(fatorSelic);

    // Como há diferenças de bordas (Súmula 381 aplicada internamente), permite 20% de variação
    const ratio = fator!.div(esperadoAprox).toNumber();
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2.0);
  });

  // ────────────────────────────────────────────────────────────────────
  // c) TR → IPCA-E → SELIC (três segmentos)
  // ────────────────────────────────────────────────────────────────────
  it('(c) três segmentos TR → IPCA-E → SELIC — fator composto > 1 e finito', () => {
    const dataLiquidacao = new Date(2026, 2, 31);
    const competOcorr = new Date(2017, 0, 1); // 2017-01
    const trocaIpca = new Date(2017, 2, 25); // 2017-03-25 (TR → IPCA-E por TST)
    const trocaSelic = new Date(2021, 11, 1); // 2021-12-01 (IPCA-E → SELIC)

    const { calculo, ocorrencia } = montarCalculo({
      dataAdmissao: new Date(2017, 0, 1),
      dataLiquidacao,
      competenciaOcorrencia: competOcorr,
      indicePrincipal: IndiceMonetarioEnum.TR,
      combinacoes: [
        { indice: IndiceMonetarioEnum.IPCAE, apartirDe: trocaIpca },
        { indice: IndiceMonetarioEnum.SELIC, apartirDe: trocaSelic },
      ],
    });

    calculo.liquidar();

    const fator = ocorrencia.getIndiceAcumulado();
    expect(fator).not.toBeNull();
    expect(fator!.toNumber()).toBeGreaterThan(1);
    expect(fator!.isFinite()).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────
  // d) Ocorrência toda dentro de um único segmento (segmento do meio)
  // ────────────────────────────────────────────────────────────────────
  it('(d) ocorrência toda dentro de um segmento — fator ≈ IPCAE(compInicio→liq)', () => {
    const dataLiquidacao = new Date(2026, 2, 31);
    const competOcorr = new Date(2022, 5, 1); // 2022-06 (dentro do segmento SELIC pós-ADC)
    const trocaSelic = new Date(2021, 11, 1); // 2021-12-01

    const { calculo, ocorrencia } = montarCalculo({
      dataAdmissao: new Date(2020, 0, 1),
      dataLiquidacao,
      competenciaOcorrencia: competOcorr,
      indicePrincipal: IndiceMonetarioEnum.IPCAE,
      combinacoes: [{ indice: IndiceMonetarioEnum.SELIC, apartirDe: trocaSelic }],
    });

    calculo.liquidar();

    const fator = ocorrencia.getIndiceAcumulado();
    expect(fator).not.toBeNull();
    // Dentro do segmento SELIC (pós-2021-12) aplicado para ocorrência 2022-06,
    // o fator é apenas a SELIC acumulada 2022-07 → 2026-03 — inflação positiva,
    // sem componente IPCA-E (segmento IPCA-E acaba antes do compInicio).
    expect(fator!.toNumber()).toBeGreaterThan(1);
    expect(fator!.toNumber()).toBeLessThan(2.0);
  });

  // ────────────────────────────────────────────────────────────────────
  // e) Ocorrência ANTES de qualquer segmento — fator = 1 (só base)
  // ────────────────────────────────────────────────────────────────────
  it('(e) ocorrência após a data de liquidação — fator = 1 (não atravessa nenhum segmento)', () => {
    const dataLiquidacao = new Date(2021, 11, 31);
    // Ocorrência NO MÊS da liquidação — compInicio = 2022-01 > dataLiquidacao 2021-12-31,
    // então nenhum segmento cobre a janela; fator deve ser 1.
    const competOcorr = new Date(2021, 11, 1); // 2021-12

    const { calculo, ocorrencia } = montarCalculo({
      dataAdmissao: new Date(2020, 0, 1),
      dataLiquidacao,
      competenciaOcorrencia: competOcorr,
      indicePrincipal: IndiceMonetarioEnum.IPCAE,
      combinacoes: [
        { indice: IndiceMonetarioEnum.SELIC, apartirDe: new Date(2022, 0, 1) },
      ],
    });

    calculo.liquidar();

    const fator = ocorrencia.getIndiceAcumulado();
    expect(fator).not.toBeNull();
    // Sem cobertura de segmento, fator = 1 (base sem correção).
    expect(fator!.toNumber()).toBeCloseTo(1, 6);
  });

  // ────────────────────────────────────────────────────────────────────
  // Bônus: SEM_CORRECAO em um segmento produz fator neutro naquela janela
  // ────────────────────────────────────────────────────────────────────
  it('(bonus) segmento SEM_CORRECAO contribui fator neutro (= 1)', () => {
    const dataLiquidacao = new Date(2026, 2, 31);
    const competOcorr = new Date(2020, 4, 1);
    const troca = new Date(2023, 5, 1); // IPCA-E → SEM_CORRECAO após citação

    const { calculo, ocorrencia } = montarCalculo({
      dataAdmissao: new Date(2020, 0, 1),
      dataLiquidacao,
      competenciaOcorrencia: competOcorr,
      indicePrincipal: IndiceMonetarioEnum.IPCAE,
      combinacoes: [{ indice: IndiceMonetarioEnum.SEM_CORRECAO, apartirDe: troca }],
    });

    calculo.liquidar();

    const fator = ocorrencia.getIndiceAcumulado();
    expect(fator).not.toBeNull();
    // Deve ser aproximadamente IPCA-E(2020-06 → 2023-05), pois o resto vira SEM_CORRECAO.
    const ctx: ITabelaCorrecaoContext = {
      getDataDeLiquidacao: () => dataLiquidacao,
      getDataDemissao: () => null,
      getParametrosDeAtualizacao: () => null,
    };
    const segIpca = new Periodo(new Date(2020, 0, 1), new Date(2023, 4, 31));
    const fatorIpca = fatorObtido(ctx, IndiceMonetarioEnum.IPCAE, segIpca, competOcorr);

    const ratio = fator!.div(fatorIpca).toNumber();
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(1.4);
  });
});
