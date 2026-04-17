/**
 * PJe-Calc v2.15.1 — TabelaDeJuros
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.TabelaDeJuros
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
 * Método principal: `calcularTaxaDeJurosTotal(raiz, dataLiquidacao, ...)`
 * retorna taxa percentual total (ex: 13.5 para 13,5%).
 *
 * Fontes de taxas mensais (fallback offline):
 *   - SELIC: `SELIC_MENSAL` em `indices-fallback.ts` (RFB/SICALC)
 *   - TR:    `TR_MENSAL` em `indices-fallback.ts` (BCB série 188)
 *   - TAXA_LEGAL / JUROS_UM_PORCENTO: 1%/mês fixo
 *   - JUROS_MEIO_PORCENTO / FAZENDA_PUBLICA: 0.5%/mês fixo
 *   - JUROS_POUPANCA: TR + 0.5%/mês (pós-2012)
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../base/comum/helper-date';
import { Periodo } from '../base/comum/periodo';
import { CEM } from '../base/comum/utils';
import { JurosEnum, TipoDeJurosEnum, TipoDeQuantidadeDeJurosBaseEnum } from '../constantes/enums';
import { PeriodoDeJuros } from './periodo-de-juros';
import type { CombinacaoDeJuros } from '../dominio/calculo/atualizacao/combinacao-de-juros';
import { SELIC_MENSAL, TR_MENSAL } from '../../indices-fallback';

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

// ────────────── Helpers de tabela ──────────────

function competenceKey(date: Date): string {
  const h = HelperDate.getInstance(date)!;
  return h.format('yyyy-MM');
}

/** Procura a taxa mensal (%) em uma série mensal. Retorna 0 se ausente. */
function lookupTaxaMensal(tabela: Record<string, number>, competencia: Date): Decimal {
  const k = competenceKey(competencia);
  const v = tabela[k];
  if (v === undefined || v === null) return new Decimal(0);
  return new Decimal(v);
}

/** Retorna a taxa SELIC mensal. Negativos são mantidos (pode zerar por soma simples). */
function taxaSelicMensal(competencia: Date): Decimal {
  return lookupTaxaMensal(SELIC_MENSAL, competencia);
}

/** Retorna a taxa TR mensal (≥0 já saneado na fonte). */
function taxaTrMensal(competencia: Date): Decimal {
  return lookupTaxaMensal(TR_MENSAL, competencia);
}

// ────────────── Construção dos períodos ──────────────

/**
 * Constrói a cadeia de PeriodoDeJuros a partir do contexto.
 * Port de `carregarPeriodosDeJurosTotalComCombinacoes` (Java linha 81) e
 * `montarPeriodo` (Java linha 107).
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
    const fazendaPublica =
      tabelaJuros === JurosEnum.FAZENDA_PUBLICA ||
      tabelaJuros === JurosEnum.JUROS_POUPANCA;
    const p = new PeriodoDeJuros(
      dataInicial, dataFinal, aliquota, tipoQuantidade, tipoJuros, fazendaPublica, tabelaJuros
    );
    if (periodoAnterior === null) { raiz = p; }
    else { periodoAnterior.setProximoPeriodo(p); }
    periodoAnterior = p;
    return p;
  };

  /**
   * Quebra [dataInicial, dataFinal] em competências mensais e cria um
   * PeriodoDeJuros por mês com a aliquota retornada por `aliqFn`.
   *
   * `tipoJurosFn` permite diferenciar SIMPLES vs COMPOSTOS por mês.
   */
  const montarPorMes = (
    dataInicial: Date, dataFinal: Date,
    tabelaJuros: JurosEnum,
    aliqFn: (competencia: Date) => Decimal,
    tipoJuros: TipoDeJurosEnum = TipoDeJurosEnum.SIMPLES
  ) => {
    // Caso degenerado: intervalo vazio ou invertido — nada a fazer.
    if (HelperDate.dateAfter(dataInicial, dataFinal)) return;
    const periodos = HelperDate.breakInMonths(dataInicial, dataFinal);
    for (const p of periodos) {
      const competencia = HelperDate.getCurrentCompetence(p.getInicial()).getDate();
      const aliq = aliqFn(competencia);
      criarPeriodo(
        p.getInicial(), p.getFinal(), aliq,
        TipoDeQuantidadeDeJurosBaseEnum.FRACAO, tipoJuros, tabelaJuros
      );
    }
  };

  const montarPeriodo = (tabelaAtual: JurosEnum, dataInicial: Date, dataFinal: Date) => {
    // Caso degenerado: nada a fazer.
    if (HelperDate.dateAfter(dataInicial, dataFinal)) return;

    // ── Taxas fixas em percentual mensal ──
    if (tabelaAtual === JurosEnum.SEM_JUROS) {
      criarPeriodo(dataInicial, dataFinal, new Decimal(0),
        TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
      return;
    }
    if (tabelaAtual === JurosEnum.JUROS_MEIO_PORCENTO) {
      criarPeriodo(dataInicial, dataFinal, new Decimal('0.5'),
        TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
      return;
    }
    if (tabelaAtual === JurosEnum.JUROS_ZERO_TRINTA_TRES) {
      // 0,0333% a.d. — getTaxa() do PeriodoDeJuros trata como aliquota × dias.
      criarPeriodo(dataInicial, dataFinal, new Decimal('0.0333333'),
        TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
      return;
    }
    if (tabelaAtual === JurosEnum.JUROS_UM_PORCENTO ||
        tabelaAtual === JurosEnum.JUROS_PADRAO ||
        tabelaAtual === JurosEnum.TAXA_LEGAL) {
      // TAXA_LEGAL (CC Art. 406): historicamente 1%/mês; remissão à SELIC
      // superveniente tratada via CombinacaoDeJuros quando necessário.
      criarPeriodo(dataInicial, dataFinal, new Decimal(1),
        TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
      return;
    }
    if (tabelaAtual === JurosEnum.FAZENDA_PUBLICA) {
      // Pre-EC 113: TR + 0,5%/mês. Simplificamos p/ 0,5%/mês (TR≈0 pós-2017).
      criarPeriodo(dataInicial, dataFinal, new Decimal('0.5'),
        TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
      return;
    }

    // ── SELIC mensal — soma simples das taxas mensais ──
    // Cada mês vira um PeriodoDeJuros com aliquota = taxa RFB do mês.
    if (tabelaAtual === JurosEnum.SELIC || tabelaAtual === JurosEnum.SELIC_FAZENDA) {
      montarPorMes(dataInicial, dataFinal, tabelaAtual, taxaSelicMensal);
      return;
    }

    // ── SELIC_BACEN — taxa mensal composta (produto (1+i)). ──
    // Java armazena a aliquota como (1 + taxa/100) para compor via multiplicação.
    if (tabelaAtual === JurosEnum.SELIC_BACEN) {
      montarPorMes(dataInicial, dataFinal, tabelaAtual,
        (comp) => taxaSelicMensal(comp).div(CEM).plus(1),
        TipoDeJurosEnum.SIMPLES // o regime composto é tratado via acumulado em calcularTaxaDeJurosTotal
      );
      return;
    }

    // ── JUROS_POUPANCA — por mês: TR + 0.5%/mês (soma simples). ──
    if (tabelaAtual === JurosEnum.JUROS_POUPANCA) {
      montarPorMes(dataInicial, dataFinal, tabelaAtual,
        (comp) => taxaTrMensal(comp).plus(new Decimal('0.5'))
      );
      return;
    }

    // ── TRD_SIMPLES — 1%/mês simples (stub histórico TJT diário). ──
    if (tabelaAtual === JurosEnum.TRD_SIMPLES) {
      criarPeriodo(dataInicial, dataFinal, new Decimal(1),
        TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
      return;
    }

    // ── TRD_COMPOSTOS — 1%/mês composto. ──
    // Um período por mês com aliquota=(1+0.01); o produtório é feito em
    // calcularTaxaDeJurosTotal via o acumuladoComposto (isJurosCompostos=true).
    if (tabelaAtual === JurosEnum.TRD_COMPOSTOS) {
      montarPorMes(dataInicial, dataFinal, tabelaAtual,
        () => new Decimal('1.01'),
        TipoDeJurosEnum.SIMPLES
      );
      return;
    }
  };

  // Constrói cadeia a partir de combinações
  let tabelaAtual = ctx.getJuros();
  let dataInicio = periodoDeJuros.getInicial();

  if (ctx.getCombinarOutroJuros()) {
    const combs = [...ctx.getListaDeCombinacaoDeJuros()];
    combs.sort((a, b) => a.compareTo(b));

    for (const combinacao of combs) {
      const proximaTabela = combinacao.getOutroJuros();
      const dataAPartirDe = combinacao.getApartirDeOutroJuros();
      if (proximaTabela === null || dataAPartirDe === null) continue;

      if (HelperDate.dateBeforeOrEquals(dataAPartirDe, dataInicio)) {
        tabelaAtual = proximaTabela;
        continue;
      }
      if (HelperDate.dateAfter(dataAPartirDe, periodoDeJuros.getFinal())) break;

      montarPeriodo(
        tabelaAtual,
        dataInicio,
        HelperDate.getInstance(dataAPartirDe)!.addDay(-1).getDate()
      );
      dataInicio = dataAPartirDe;
      tabelaAtual = proximaTabela;
    }
  }
  montarPeriodo(tabelaAtual, dataInicio, periodoDeJuros.getFinal());

  return raiz;
}

// ────────────── Cálculo da taxa total ──────────────

function isJurosCompostos(t: JurosEnum | null): boolean {
  return t === JurosEnum.TRD_COMPOSTOS || t === JurosEnum.SELIC_BACEN;
}

/**
 * calcularTaxaDeJurosTotal — port de `calcularTaxaDeJuros` (Java linha 489).
 *
 * Percorre a cadeia de PeriodoDeJuros e soma (simples) ou acumula (composto)
 * as taxas. Retorna taxa percentual total (ex: 13.5 para 13,5%).
 *
 * Para regimes compostos (SELIC_BACEN, TRD_COMPOSTOS), cada período armazena
 * em `aliquota` o fator (1+i) e o acumulado é multiplicado. Ao mudar de
 * regime (ou acabar a cadeia), o acumulado é convertido para taxa percentual
 * via `(fator - 1) * 100` e somado a `totalDeTaxa`.
 *
 * @param raiz início da cadeia
 * @param dataLiquidacao data final para clampar períodos
 * @param isSelicIndiceNaLiquidacao se SELIC é o índice principal na liquidação
 *        (quando true, o mês da liquidação é usado como mês cheio, não pro-rata)
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

    // Se o período ultrapassa a liquidação, clampa.
    if (HelperDate.dateAfter(periodoAtual.getDataFinal()!, dataLiquidacao)) {
      const periodoAux = periodoAtual.clone();
      periodoAux.setDataFinal(
        isSelicIndiceNaLiquidacao
          ? HelperDate.getCurrentCompetence(dataLiquidacao).lastDayOfTheMonth().getDate()
          : dataLiquidacao
      );
      if (isJurosCompostos(tabelaJuros)) {
        acumuladoComposto = acumuladoComposto ?? new Decimal(1);
        const aliq = periodoAux.getAliquota();
        if (aliq) acumuladoComposto = acumuladoComposto.times(aliq);
      } else {
        totalDeTaxa = totalDeTaxa.plus(periodoAux.getTaxa());
      }
    } else if (isJurosCompostos(tabelaJuros)) {
      acumuladoComposto = acumuladoComposto ?? new Decimal(1);
      const aliq = periodoAtual.getAliquota();
      if (aliq) acumuladoComposto = acumuladoComposto.times(aliq);
    } else {
      totalDeTaxa = totalDeTaxa.plus(periodoAtual.getTaxa());
    }

    // Se mudou de regime (composto → simples ou acabou), converte acumulado.
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
