/**
 * PJe-Calc v2.15.1 — TabelaDeJuros
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.comum.TabelaDeJuros
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/comum/TabelaDeJuros.java
 *
 * Classe abstrata (no Java) que monta períodos de juros encadeados
 * (PeriodoDeJuros → PeriodoDeJuros.proximoPeriodo → ...) e depois
 * calcula a taxa total por ocorrência.
 *
 * Neste port, em vez de abstract class com Calculo injetado, usamos
 * uma interface `ITabelaDeJurosContext` e construção funcional.
 *
 * Método principal: `calcularTaxaDeJuros(data, projetarData)` → retorna
 * taxa percentual total (ex: 13.5 para 13,5%).
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../base/comum/helper-date';
import { Periodo } from '../base/comum/periodo';
import { nulo, naoNulo, multiplicar, subtrair, CEM } from '../base/comum/utils';
import { JurosEnum, TipoDeJurosEnum, TipoDeQuantidadeDeJurosBaseEnum } from '../constantes/enums';
import { PeriodoDeJuros } from './periodo-de-juros';
import type { CombinacaoDeJuros } from '../dominio/calculo/atualizacao/combinacao-de-juros';

// ────────────── Contexto injetável ──────────────

export interface ITabelaDeJurosContext {
  getDataDeLiquidacao(): Date;
  getDataAjuizamento(): Date;
  getDataAdmissao(): Date;
  getAplicarJurosFasePreJudicial(): boolean;
  getJuros(): JurosEnum;
  getCombinarOutroJuros(): boolean;
  getListaDeCombinacaoDeJuros(): Iterable<CombinacaoDeJuros>;
  /** Se SELIC é o índice na data de liquidação (requer info do cálculo) */
  isSelicIndiceNaLiquidacao(): boolean;
}

// ────────────── Construção dos períodos ──────────────

/**
 * Constrói a cadeia de PeriodoDeJuros a partir do contexto.
 * Port de `carregarPeriodosDeJurosTotalComCombinacoes` (linha 81) e
 * `montarPeriodo` (linha 107).
 */
export function construirPeriodosDeJuros(ctx: ITabelaDeJurosContext): PeriodoDeJuros | null {
  const periodoDeJuros = new Periodo(
    ctx.getAplicarJurosFasePreJudicial()
      ? HelperDate.getCurrentCompetence(ctx.getDataAdmissao()).getDate()
      : HelperDate.getCurrentCompetence(ctx.getDataAjuizamento()).getDate(),
    HelperDate.getInstance(ctx.getDataDeLiquidacao())!.removeTime().getDate()
  );

  let periodoAnterior: PeriodoDeJuros | null = null;
  let raiz: PeriodoDeJuros | null = null;

  const criarPeriodo = (
    dataInicial: Date, dataFinal: Date, aliquota: Decimal,
    tipoQuantidade: TipoDeQuantidadeDeJurosBaseEnum, tipoJuros: TipoDeJurosEnum,
    tabelaJuros: JurosEnum
  ): PeriodoDeJuros => {
    const fazendaPublica = tabelaJuros === JurosEnum.FAZENDA_PUBLICA || tabelaJuros === JurosEnum.JUROS_POUPANCA;
    const p = new PeriodoDeJuros(dataInicial, dataFinal, aliquota, tipoQuantidade, tipoJuros, fazendaPublica, tabelaJuros);
    if (periodoAnterior === null) { raiz = p; }
    else { periodoAnterior.setProximoPeriodo(p); }
    periodoAnterior = p;
    return p;
  };

  const montarPeriodo = (tabelaAtual: JurosEnum, dataInicial: Date, dataFinal: Date) => {
    // Juros fixos por tipo
    if (tabelaAtual === JurosEnum.SEM_JUROS) {
      criarPeriodo(dataInicial, dataFinal, new Decimal(0), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
    if (tabelaAtual === JurosEnum.JUROS_MEIO_PORCENTO) {
      criarPeriodo(dataInicial, dataFinal, new Decimal('0.5'), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
    if (tabelaAtual === JurosEnum.JUROS_ZERO_TRINTA_TRES) {
      criarPeriodo(dataInicial, dataFinal, new Decimal('0.0333333'), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
    if (tabelaAtual === JurosEnum.JUROS_UM_PORCENTO) {
      criarPeriodo(dataInicial, dataFinal, new Decimal(1), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
    // SELIC mensal — cada mês é um PeriodoDeJuros (taxa mensal da tabela)
    if (tabelaAtual === JurosEnum.SELIC) {
      // Simplificado: sem tabela SELIC mensal detalhada, montamos como período único.
      // O taxa será a soma simples das taxas mensais; quando a tabela SELIC estiver
      // populada, refinar para múltiplos períodos (um por mês).
      criarPeriodo(dataInicial, dataFinal, new Decimal(0), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
    if (tabelaAtual === JurosEnum.TRD_SIMPLES) {
      criarPeriodo(dataInicial, dataFinal, new Decimal(0), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
    if (tabelaAtual === JurosEnum.TRD_COMPOSTOS) {
      criarPeriodo(dataInicial, dataFinal, new Decimal(0), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.COMPOSTOS, tabelaAtual);
    }
    if (tabelaAtual === JurosEnum.TAXA_LEGAL) {
      criarPeriodo(dataInicial, dataFinal, new Decimal(0), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
    if (tabelaAtual === JurosEnum.SELIC_FAZENDA) {
      criarPeriodo(dataInicial, dataFinal, new Decimal(0), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
    if (tabelaAtual === JurosEnum.SELIC_BACEN) {
      criarPeriodo(dataInicial, dataFinal, new Decimal(0), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
    if (tabelaAtual === JurosEnum.FAZENDA_PUBLICA || tabelaAtual === JurosEnum.JUROS_PADRAO || tabelaAtual === JurosEnum.JUROS_POUPANCA) {
      // Tabelas com alíquotas variáveis por período — simplificado: alíquota 1%
      criarPeriodo(dataInicial, dataFinal, new Decimal(1), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
    }
  };

  // Constrói cadeia a partir de combinações
  let tabelaAtual = ctx.getJuros();
  let dataInicio = periodoDeJuros.getInicial();

  if (ctx.getCombinarOutroJuros()) {
    const combs = [...ctx.getListaDeCombinacaoDeJuros()];
    combs.sort((a, b) => a.compareTo(b));

    for (const combinacao of combs) {
      const proximaTabela = combinacao.getOutroJuros()!;
      const dataAPartirDe = combinacao.getApartirDeOutroJuros()!;

      if (HelperDate.dateBeforeOrEquals(dataAPartirDe, dataInicio)) {
        tabelaAtual = proximaTabela;
        continue;
      }
      if (HelperDate.dateAfter(dataAPartirDe, periodoDeJuros.getFinal())) break;

      montarPeriodo(tabelaAtual, dataInicio, HelperDate.getInstance(dataAPartirDe)!.addDay(-1).getDate());
      dataInicio = dataAPartirDe;
      tabelaAtual = proximaTabela;
    }
  }
  montarPeriodo(tabelaAtual, dataInicio, periodoDeJuros.getFinal());

  return raiz;
}

// ────────────── Cálculo da taxa total ──────────────

function isJurosCompostos(t: JurosEnum): boolean {
  return t === JurosEnum.TRD_COMPOSTOS || t === JurosEnum.SELIC_BACEN;
}

/**
 * calcularTaxaDeJuros (linha 489)
 *
 * Percorre a cadeia de PeriodoDeJuros e soma (simples) ou acumula (composto) as taxas.
 * Retorna taxa percentual total (ex: 13.5 para 13,5%).
 *
 * @param raiz início da cadeia
 * @param dataLiquidacao data final para clampar períodos
 * @param isSelicIndiceNaLiquidacao se SELIC é o índice principal na liquidação
 */
export function calcularTaxaDeJurosTotal(
  raiz: PeriodoDeJuros | null,
  dataLiquidacao: Date,
  isSelicIndiceNaLiquidacao: boolean
): Decimal {
  let totalDeTaxa = new Decimal(0);
  let periodoAtual = raiz;
  let acumuladoComposto: Decimal | null = null;

  while (periodoAtual !== null) {
    const tabelaJuros = periodoAtual.getTabelaJuros();

    // Se o período ultrapassa a liquidação, clampa
    if (HelperDate.dateAfter(periodoAtual.getDataFinal()!, dataLiquidacao)) {
      const periodoAux = periodoAtual.clone();
      periodoAux.setDataFinal(
        isSelicIndiceNaLiquidacao
          ? HelperDate.getCurrentCompetence(dataLiquidacao).lastDayOfTheMonth().getDate()
          : dataLiquidacao
      );
      if (tabelaJuros && isJurosCompostos(tabelaJuros)) {
        acumuladoComposto = acumuladoComposto ?? new Decimal(1);
        const aliq = periodoAux.getAliquota();
        if (aliq) acumuladoComposto = acumuladoComposto.times(aliq);
      } else {
        totalDeTaxa = totalDeTaxa.plus(periodoAux.getTaxa());
      }
    } else if (tabelaJuros && isJurosCompostos(tabelaJuros)) {
      acumuladoComposto = acumuladoComposto ?? new Decimal(1);
      const aliq = periodoAtual.getAliquota();
      if (aliq) acumuladoComposto = acumuladoComposto.times(aliq);
    } else {
      totalDeTaxa = totalDeTaxa.plus(periodoAtual.getTaxa());
    }

    // Se mudou de regime (composto → simples), converte acumulado para taxa
    const anterior = tabelaJuros;
    periodoAtual = periodoAtual.getProximoPeriodo();
    if (periodoAtual !== null && anterior === periodoAtual.getTabelaJuros()) continue;
    if (acumuladoComposto !== null) {
      totalDeTaxa = totalDeTaxa.plus(
        acumuladoComposto.minus(1).times(CEM)
      );
      acumuladoComposto = null;
    }
  }

  return totalDeTaxa;
}
