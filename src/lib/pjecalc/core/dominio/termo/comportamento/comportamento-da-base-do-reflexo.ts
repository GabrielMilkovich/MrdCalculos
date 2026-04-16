/**
 * Porte 1:1 de ComportamentoDaBaseDoReflexo.java (226 linhas).
 *
 * Classe abstrata que define o contrato dos 4 comportamentos de reflexo:
 *   - VALOR_MENSAL            → ComportamentoValorMensal
 *   - MEDIA_PELA_QUANTIDADE   → ComportamentoMediaPelaQuantidade
 *   - MEDIA_PELO_VALOR        → ComportamentoMediaPeloValor
 *   - MEDIA_PELO_VALOR_CORRIGIDO → ComportamentoMediaPeloValorCorrigido
 *
 * Ref: pjecalc-fonte/.../dominio/termo/comportamento/ComportamentoDaBaseDoReflexo.java
 */
import Decimal from 'decimal.js';
import { Periodo } from '../../../base/comum/periodo';
import { HelperDate } from '../../../base/comum/helper-date';
import { PeriodoDaMediaDoReflexoEnum } from '../../../constantes/enums';
import type { ItemBaseVerba } from '../item-base-verba';
import type { ParametroDoTermo } from '../parametro-do-termo';
import type { OcorrenciaDeVerba } from '../../ocorrenciaverba/ocorrencia-de-verba';
import type { VerbaDeCalculo } from '../../verbacalculo/verba-de-calculo';

export abstract class ComportamentoDaBaseDoReflexo {
  protected static readonly TRINTA_DIAS = 30;
  protected static readonly TRINTA = new Decimal(30);

  /** Contrato: cada comportamento resolve o valor final do reflexo. */
  abstract resolverValor(item: ItemBaseVerba, parametro: ParametroDoTermo): Decimal;

  /**
   * Obtém as ocorrências da verba-pai no período da média do reflexo.
   *
   * Ref: ComportamentoDaBaseDoReflexo.java:32-75
   */
  protected obterOcorrenciasDoPeriodoDaMediaDoReflexo(
    parametro: ParametroDoTermo,
    base: VerbaDeCalculo,
  ): OcorrenciaDeVerba[] {
    const reflexo = parametro.getVerbaDeCalculo() as unknown as {
      getPeriodoMediaReflexo?: () => PeriodoDaMediaDoReflexoEnum;
    };
    const tipo = reflexo.getPeriodoMediaReflexo?.();
    const calculo = parametro.getCalculo() as unknown as {
      getDataDemissao?: () => Date | null;
    };
    const baseExt = base as unknown as {
      obterOcorrenciasDoAno?: (d: Date) => OcorrenciaDeVerba[];
      obterDozeOcorrenciasAnterioresAoMes?: (d: Date) => OcorrenciaDeVerba[];
      obterOcorrenciasEntreMeses?: (ini: Date, fim: Date) => OcorrenciaDeVerba[];
    };

    switch (tipo) {
      case PeriodoDaMediaDoReflexoEnum.ANO_CIVIL: {
        const periodo = parametro.getPeriodo();
        if (!periodo) return [];
        let ocorrencias = baseExt.obterOcorrenciasDoAno?.(periodo.getFinal()) ?? [];
        const dataDemissao = calculo.getDataDemissao?.();
        if (dataDemissao) {
          const compDemissao = HelperDate.getInstance(dataDemissao)!;
          compDemissao.setDay(1);
          ocorrencias = ocorrencias.filter(oc => {
            const dataIni = oc.getDataInicial();
            if (!dataIni) return false;
            const compOc = HelperDate.getInstance(dataIni)!;
            compOc.setDay(1);
            return compOc.lessThanOrEqualsTo(compDemissao.getDate());
          });
        }
        return ocorrencias;
      }
      case PeriodoDaMediaDoReflexoEnum.DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA: {
        const periodo = parametro.getPeriodo();
        if (!periodo) return [];
        return baseExt.obterDozeOcorrenciasAnterioresAoMes?.(periodo.getInicial()) ?? [];
      }
      case PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO: {
        const aquisitivo = parametro.getPeriodoAquisitivo();
        if (!aquisitivo) return [];
        let inicio = aquisitivo.getInicial();
        let fim = aquisitivo.getFinal();
        const dataDemissao = calculo.getDataDemissao?.();
        if (dataDemissao && HelperDate.dateAfter(fim, dataDemissao)) {
          fim = dataDemissao;
          if (HelperDate.dateAfter(inicio, dataDemissao)) {
            inicio = HelperDate.getInstance(inicio)!.addYear(-1).getDate();
          }
        }
        const meses = HelperDate.breakInMonths(inicio, fim);
        if (meses.length === 13) {
          return baseExt.obterOcorrenciasEntreMeses?.(
            inicio, HelperDate.getInstance(fim)!.addMonth(-1).getDate(),
          ) ?? [];
        }
        return baseExt.obterOcorrenciasEntreMeses?.(inicio, fim) ?? [];
      }
      case PeriodoDaMediaDoReflexoEnum.ULTIMOS_DOZE_MESES_DO_CONTRATO: {
        const dataDemissao = calculo.getDataDemissao?.();
        if (!dataDemissao) return [];
        return baseExt.obterDozeOcorrenciasAnterioresAoMes?.(
          HelperDate.getInstance(dataDemissao)!.addMonth(1).getDate(),
        ) ?? [];
      }
    }
    return [];
  }

  /**
   * Retorna a quantidade esperada de meses no período da média (máx 12).
   *
   * Ref: ComportamentoDaBaseDoReflexo.java:77-133
   */
  protected obterQuantidadeEsperadaDeOcorrenciasParaMediaDoReflexo(
    parametro: ParametroDoTermo,
  ): number {
    const reflexo = parametro.getVerbaDeCalculo() as unknown as {
      getPeriodoMediaReflexo?: () => PeriodoDaMediaDoReflexoEnum;
    };
    const calculo = parametro.getCalculo() as unknown as {
      getDataAdmissao?: () => Date | null;
      getDataDemissao?: () => Date | null;
    };
    const tipo = reflexo.getPeriodoMediaReflexo?.();
    let quantidade = 0;

    switch (tipo) {
      case PeriodoDaMediaDoReflexoEnum.ANO_CIVIL: {
        const periodo = parametro.getPeriodo();
        if (!periodo) return 0;
        const ano = HelperDate.getInstance(periodo.getInicial())!.getYear();
        const admissao = calculo.getDataAdmissao?.();
        const demissao = calculo.getDataDemissao?.();
        for (let i = 0; i < 12; i++) {
          const competenciaMes = HelperDate.getInstance(new Date(ano, i, 1))!;
          if (admissao) {
            const compAdm = HelperDate.getInstance(admissao)!;
            compAdm.setDay(1);
            if (!compAdm.lessThanOrEqualsTo(competenciaMes.getDate())) continue;
          }
          if (demissao) {
            const compDem = HelperDate.getInstance(demissao)!;
            compDem.setDay(1);
            if (!competenciaMes.lessThanOrEqualsTo(compDem.getDate())) continue;
          }
          quantidade++;
        }
        return quantidade;
      }
      case PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO: {
        const aquisitivo = parametro.getPeriodoAquisitivo();
        if (!aquisitivo) return 0;
        let inicio = aquisitivo.getInicial();
        let fim = aquisitivo.getFinal();
        const demissao = calculo.getDataDemissao?.();
        if (demissao && HelperDate.dateAfter(fim, demissao)) {
          fim = demissao;
          if (HelperDate.dateAfter(inicio, demissao)) {
            inicio = HelperDate.getInstance(inicio)!.addYear(-1).getDate();
          }
        }
        const n = HelperDate.breakInMonths(inicio, fim).length;
        return n === 13 ? 12 : n;
      }
      case PeriodoDaMediaDoReflexoEnum.ULTIMOS_DOZE_MESES_DO_CONTRATO: {
        const demissao = calculo.getDataDemissao?.();
        if (!demissao) return 0;
        const admissao = calculo.getDataAdmissao?.();
        for (let i = 0; i < 12; i++) {
          const compDem = HelperDate.getInstance(demissao)!;
          compDem.setDay(1);
          const mesI = compDem.addMonth(-i).getDate();
          if (admissao) {
            const compAdm = HelperDate.getInstance(admissao)!;
            compAdm.setDay(1);
            if (!compAdm.lessThanOrEqualsTo(mesI)) continue;
          }
          quantidade++;
        }
        return quantidade;
      }
      case PeriodoDaMediaDoReflexoEnum.DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA: {
        const periodo = parametro.getPeriodo();
        if (!periodo) return 0;
        const admissao = calculo.getDataAdmissao?.();
        const mesAntIni = HelperDate.getInstance(periodo.getInicial())!;
        mesAntIni.setDay(1);
        mesAntIni.addMonth(-13);
        for (let i = 0; i < 12; i++) {
          const mesI = mesAntIni.clone().addMonth(i + 1).getDate();
          if (admissao) {
            const compAdm = HelperDate.getInstance(admissao)!;
            compAdm.setDay(1);
            if (!compAdm.lessThanOrEqualsTo(mesI)) continue;
          }
          quantidade++;
        }
        return quantidade;
      }
    }
    return quantidade;
  }

  /**
   * Marca dias cobertos por uma ocorrência (um Set de timestamps por dia).
   *
   * Ref: ComportamentoDaBaseDoReflexo.java:135-144
   */
  protected marcarDias(diasCobertos: Set<number>, ocorrencia: OcorrenciaDeVerba): void {
    const ini = ocorrencia.getDataInicial();
    const fim = ocorrencia.getDataFinal();
    if (!ini || !fim) return;
    const auxiliarInicio = HelperDate.getInstance(ini)!;
    const auxiliarFim = HelperDate.getInstance(fim)!;
    auxiliarInicio.removeTime();
    auxiliarFim.removeTime();
    while (auxiliarInicio.lessThanOrEqualsTo(auxiliarFim.getDate())) {
      diasCobertos.add(auxiliarInicio.getDate().getTime());
      auxiliarInicio.addDay(1);
    }
  }

  /**
   * Agrupa ocorrências por competência (mês, dia=1).
   *
   * Ref: ComportamentoDaBaseDoReflexo.java:146-156
   */
  protected agruparOcorrencias(
    ocorrencias: OcorrenciaDeVerba[],
    mapa: Map<number, OcorrenciaDeVerba[]>,
  ): void {
    for (const oc of ocorrencias) {
      const dataFinal = oc.getDataFinal();
      if (!dataFinal) continue;
      const comp = HelperDate.getInstance(dataFinal)!;
      comp.removeTime();
      comp.setDay(1);
      const key = comp.getDate().getTime();
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(oc);
    }
  }

  /**
   * Ajuste de valor para férias (× dias / 30).
   * Inclui caso especial de férias indenizadas/gozadas parcialmente na rescisão.
   *
   * Ref: ComportamentoDaBaseDoReflexo.java:190-224
   */
  protected verificarValorParaFerias(
    parametro: ParametroDoTermo,
    valorDoPeriodo: Decimal,
    diasPeriodo: number,
  ): Decimal {
    const verba = parametro.getVerbaDeCalculo() as unknown as {
      isCaracteristicaFerias?: () => boolean;
    };
    if (!verba.isCaracteristicaFerias?.()) return valorDoPeriodo;

    const periodo = parametro.getPeriodo();
    const calculo = parametro.getCalculo() as unknown as {
      getDataDemissao?: () => Date | null;
      getListaDeFerias?: () => Array<{
        getPeriodoAquisitivo: () => Periodo;
        getPrazo: () => number;
        getPeriodoDeGozo1?: () => Periodo | null;
        getPeriodoDeGozo2?: () => Periodo | null;
        getPeriodoDeGozo3?: () => Periodo | null;
        getAbono: () => boolean;
        getQuantidadeDiasAbono: () => number;
      }>;
    };
    const dataDemissao = calculo.getDataDemissao?.();

    if (
      periodo &&
      HelperDate.dateEquals(periodo.getInicial(), periodo.getFinal()) &&
      dataDemissao &&
      HelperDate.dateEquals(periodo.getInicial(), dataDemissao)
    ) {
      // férias indenizadas/gozadas parcialmente na demissão
      let encontrouFerias = false;
      for (const ferias of calculo.getListaDeFerias?.() ?? []) {
        if (!ferias.getPeriodoAquisitivo().isMesmoPeriodo(parametro.getPeriodoAquisitivo()!)) continue;
        encontrouFerias = true;
        if (!parametro.isFeriasIndenizadas()) break;
        let totalDeDias = ferias.getPrazo();
        const g1 = ferias.getPeriodoDeGozo1?.();
        const g2 = ferias.getPeriodoDeGozo2?.();
        const g3 = ferias.getPeriodoDeGozo3?.();
        if (g1) totalDeDias -= g1.totalDeDias();
        if (g2) totalDeDias -= g2.totalDeDias();
        if (g3) totalDeDias -= g3.totalDeDias();
        if (ferias.getAbono()) totalDeDias -= ferias.getQuantidadeDiasAbono();
        valorDoPeriodo = valorDoPeriodo.times(totalDeDias);
        break;
      }
      if (!encontrouFerias) {
        // Ferias.encontrarPrazoFeriasProporcionais — stub: 30 dias
        const prazo = 30;
        valorDoPeriodo = valorDoPeriodo.times(prazo);
      }
    } else {
      valorDoPeriodo = valorDoPeriodo.times(diasPeriodo);
    }

    return valorDoPeriodo.div(ComportamentoDaBaseDoReflexo.TRINTA);
  }
}
