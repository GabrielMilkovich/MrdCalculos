/**
 * Porte 1:1 de ComportamentoMediaPelaQuantidade.java (349 linhas).
 *
 * Consolidação de reflexos baseada na MÉDIA DA QUANTIDADE ao longo do período
 * de média (12 meses típicos). Produz UM valor final para o reflexo aplicado
 * sobre a base da verba-pai.
 *
 * Fórmula (Java linha 204-206):
 *   valor = baseDaVerbaPrincipalNoPeriodo × mediaQuantidade / divisorDaVerbaPrincipalNoMesDeOcorrencia
 *
 * Ref: pjecalc-fonte/.../dominio/termo/comportamento/ComportamentoMediaPelaQuantidade.java:37-211
 */
import Decimal from 'decimal.js';
import { ComportamentoDaBaseDoReflexo } from './comportamento-da-base-do-reflexo';
import {
  TratamentoDaFracaoDeMesDoReflexoEnum,
  TipoDeGeracaoEnum,
  PeriodoDaMediaDoReflexoEnum,
} from '../../../constantes/enums';
import { HelperDate } from '../../../base/comum/helper-date';
import { Periodo } from '../../../base/comum/periodo';
import { CalculoDoIntegralizar } from '../../../comum/rotinasdecalculo/calculo-do-integralizar';
import type { ItemBaseVerba } from '../item-base-verba';
import { ParametroDoTermo } from '../parametro-do-termo';
import type { OcorrenciaDeVerba } from '../../ocorrenciaverba/ocorrencia-de-verba';

export class ComportamentoMediaPelaQuantidade extends ComportamentoDaBaseDoReflexo {
  private static readonly DOZE_MESES = 12;

  resolverValor(item: ItemBaseVerba, parametro: ParametroDoTermo): Decimal {
    let quantidadePeriodosDaMedia = this.obterQuantidadeEsperadaDeOcorrenciasParaMediaDoReflexo(parametro);
    if (quantidadePeriodosDaMedia <= 0) return new Decimal(0);

    const ocorrencias = this.obterOcorrenciasDoPeriodoDaMediaDoReflexo(parametro, item.getVerbaDeCalculo()!);
    if (ocorrencias.length === 0) return new Decimal(0);

    const base = item.getVerbaDeCalculo()!;
    let mediaQuantidade = new Decimal(0);
    let valorTotalPagoParaAbater = new Decimal(0);
    const ocorrenciasAgrupadas = new Map<number, OcorrenciaDeVerba[]>();
    this.agruparOcorrencias(ocorrencias, ocorrenciasAgrupadas);

    const verbaExt = item.getVerbaDeCalculo() as unknown as {
      getGerarReflexo?: () => TipoDeGeracaoEnum;
    };
    const gerarReflexo = verbaExt.getGerarReflexo?.();
    const reflexoExt = parametro.getVerbaDeCalculo() as unknown as {
      getTratamentoDaFracaoDeMesDoReflexo?: () => TratamentoDaFracaoDeMesDoReflexoEnum;
    };
    const tratamento = reflexoExt.getTratamentoDaFracaoDeMesDoReflexo?.()
      ?? TratamentoDaFracaoDeMesDoReflexoEnum.MANTER;

    for (const [keyTime, ocorrenciasDaCompetencia] of ocorrenciasAgrupadas.entries()) {
      const keyDate = new Date(keyTime);
      const diasCobertos = new Set<number>();
      let diasParaExcluir = 0;
      let valorQuantidadeDaCompetencia = new Decimal(0);
      let valorQuantidadeDaCompetenciaIntegral: Decimal | null = null;
      let valorPagoParaAbaterDaCompetencia = new Decimal(0);
      let valorPagoParaAbaterDaCompetenciaIntegral: Decimal | null = null;

      for (const oc of ocorrenciasDaCompetencia) {
        if (!oc.getAtivo()) continue;
        this.marcarDias(diasCobertos, oc);
        const ocExt = oc as unknown as {
          verificaDiasParaExcluirDeAcordoComA?: (v: unknown) => number;
          getQuantidade?: () => Decimal | null;
          getQuantidadeIntegral?: () => Decimal | null;
          getMultiplicador?: () => Decimal | null;
          getDobra?: () => boolean;
          getDevidoIntegral?: () => Decimal | null;
          getDiferenca?: () => Decimal | null;
          getDiferencaIntegral?: () => Decimal | null;
        };
        diasParaExcluir += ocExt.verificaDiasParaExcluirDeAcordoComA?.(base) ?? 0;

        const qtd = ocExt.getQuantidade?.() ?? new Decimal(0);
        const mult = ocExt.getMultiplicador?.() ?? new Decimal(1);
        let valorQuantidade = qtd.times(mult);
        let valorQuantidadeIntegral: Decimal | null = ocExt.getQuantidadeIntegral?.() ?? null;
        if (valorQuantidadeIntegral !== null) {
          valorQuantidadeIntegral = valorQuantidadeIntegral.times(mult);
        }
        if (ocExt.getDobra?.()) {
          valorQuantidade = valorQuantidade.times(2);
          if (valorQuantidadeIntegral !== null) {
            valorQuantidadeIntegral = valorQuantidadeIntegral.times(2);
          }
        }

        // Ajuste para TipoDeGeracaoEnum.DIFERENCA (Java linhas 75-86)
        const devido = oc.getDevido() ?? new Decimal(0);
        const diferenca = ocExt.getDiferenca?.() ?? new Decimal(0);
        if (devido.isZero() && gerarReflexo === TipoDeGeracaoEnum.DIFERENCA) {
          valorPagoParaAbaterDaCompetencia = valorPagoParaAbaterDaCompetencia.plus(diferenca);
        } else if (!devido.isZero() && gerarReflexo === TipoDeGeracaoEnum.DIFERENCA) {
          valorQuantidade = valorQuantidade.times(diferenca).div(devido);
        }

        const devidoIntegral = ocExt.getDevidoIntegral?.() ?? new Decimal(0);
        const diferencaIntegral = ocExt.getDiferencaIntegral?.();
        if (devidoIntegral.isZero() && gerarReflexo === TipoDeGeracaoEnum.DIFERENCA
            && valorPagoParaAbaterDaCompetenciaIntegral === null) {
          valorPagoParaAbaterDaCompetenciaIntegral = diferencaIntegral ?? null;
        } else if (!devidoIntegral.isZero() && gerarReflexo === TipoDeGeracaoEnum.DIFERENCA
            && valorQuantidadeIntegral !== null && diferencaIntegral) {
          valorQuantidadeIntegral = valorQuantidadeIntegral.times(diferencaIntegral).div(devidoIntegral);
        }

        valorQuantidadeDaCompetencia = valorQuantidadeDaCompetencia.plus(valorQuantidade);
        if (valorQuantidadeDaCompetenciaIntegral === null) {
          valorQuantidadeDaCompetenciaIntegral = valorQuantidadeIntegral;
        }
      }

      switch (tratamento) {
        case TratamentoDaFracaoDeMesDoReflexoEnum.MANTER:
          mediaQuantidade = mediaQuantidade.plus(valorQuantidadeDaCompetencia);
          valorTotalPagoParaAbater = valorTotalPagoParaAbater.plus(valorPagoParaAbaterDaCompetencia);
          break;
        case TratamentoDaFracaoDeMesDoReflexoEnum.INTEGRALIZAR: {
          let qtdDias = diasCobertos.size - diasParaExcluir;
          if (qtdDias < 0) qtdDias = 0;
          const periodoCondensado = new Periodo(
            HelperDate.getInstance(keyDate)!.setDay(1).getDate(),
            HelperDate.getInstance(keyDate)!.setDay(diasCobertos.size).getDate(),
          );
          const vqc = this.encontrarQuantidadeDaCompetencia(
            valorQuantidadeDaCompetenciaIntegral, qtdDias, periodoCondensado, valorQuantidadeDaCompetencia, diasParaExcluir,
          );
          if (vqc !== null) valorQuantidadeDaCompetencia = vqc;
          const vpc = this.encontrarValorPagoParaAbaterDaCompetencia(
            valorPagoParaAbaterDaCompetenciaIntegral, qtdDias, periodoCondensado, valorPagoParaAbaterDaCompetencia, diasParaExcluir,
          );
          if (vpc !== null) valorPagoParaAbaterDaCompetencia = vpc;
          mediaQuantidade = mediaQuantidade.plus(valorQuantidadeDaCompetencia);
          valorTotalPagoParaAbater = valorTotalPagoParaAbater.plus(valorPagoParaAbaterDaCompetencia);
          break;
        }
        case TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR: {
          const qtdDias = diasCobertos.size - diasParaExcluir;
          const dim = HelperDate.getInstance(keyDate)!.daysInMonth();
          const mesVerbaBase = new Periodo(
            HelperDate.getInstance(keyDate)!.setDay(1).getDate(),
            HelperDate.getInstance(keyDate)!.setDay(dim).getDate(),
          );
          let totalDiasMesVerbaBase = mesVerbaBase.totalDeDias();
          if (totalDiasMesVerbaBase === 31) totalDiasMesVerbaBase--;
          if (qtdDias < totalDiasMesVerbaBase) {
            quantidadePeriodosDaMedia--;
            break;
          }
          mediaQuantidade = mediaQuantidade.plus(valorQuantidadeDaCompetencia);
          valorTotalPagoParaAbater = valorTotalPagoParaAbater.plus(valorPagoParaAbaterDaCompetencia);
          break;
        }
        case TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR_MENOR_QUE_15_DIAS: {
          const qtdDias = diasCobertos.size - diasParaExcluir;
          if (qtdDias < 15) {
            quantidadePeriodosDaMedia--;
            break;
          }
          mediaQuantidade = mediaQuantidade.plus(valorQuantidadeDaCompetencia);
          valorTotalPagoParaAbater = valorTotalPagoParaAbater.plus(valorPagoParaAbaterDaCompetencia);
          break;
        }
      }
    }

    if (quantidadePeriodosDaMedia <= 0 || mediaQuantidade.lte(0)) return new Decimal(0);

    mediaQuantidade = mediaQuantidade.div(quantidadePeriodosDaMedia);
    valorTotalPagoParaAbater = valorTotalPagoParaAbater.div(quantidadePeriodosDaMedia);

    // Calcular base da verba-pai no período (Java linhas 145-178)
    let baseDaVerbaPrincipalNoPeriodo = new Decimal(0);
    let divisorDaVerbaPrincipalNoMesDeOcorrencia = new Decimal(0);
    const periodo = parametro.getPeriodo();
    if (!periodo) return new Decimal(0);
    const parametroSimulado = new ParametroDoTermo(
      parametro.getCalculo(),
      item.getVerbaDeCalculo()!,
      null,
      parametro.getModo(),
      parametro.getFase(),
      null,
      null,
    );
    const periodosSimulados = HelperDate.breakInMonths(periodo.getInicial(), periodo.getFinal());
    const diasTotais = HelperDate.getInstance(periodo.getFinal())!.subtractDays(periodo.getInicial()) + 1;

    for (const periodoSimulado of periodosSimulados) {
      const diasPeriodo = periodoSimulado.totalDeDias();
      const comecoPeriodoSimulado = HelperDate.getInstance(periodoSimulado.getInicial())!;
      comecoPeriodoSimulado.setDay(1);
      const terminoPeriodoSimulado = HelperDate.getInstance(periodoSimulado.getInicial())!;
      terminoPeriodoSimulado.setDay(terminoPeriodoSimulado.daysInMonth());
      parametroSimulado.setPeriodo(new Periodo(comecoPeriodoSimulado.getDate(), terminoPeriodoSimulado.getDate()));

      if (!parametroSimulado.getPeriodoParaMedia()) {
        const tipo = (parametro.getVerbaDeCalculo() as unknown as {
          getPeriodoMediaReflexo?: () => PeriodoDaMediaDoReflexoEnum;
        }).getPeriodoMediaReflexo?.();
        if (tipo === PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO) {
          parametroSimulado.setPeriodoParaMedia(
            this.obterUltimosDozeMeses(parametroSimulado.getPeriodo()!, parametro.getCalculo() as unknown as { getDataAdmissao?: () => Date | null }),
          );
        } else {
          parametroSimulado.setPeriodoParaMedia(this.obterPeriodoDaMedia(ocorrenciasAgrupadas));
        }
      }

      const baseSimulada = this.obterBaseSimulada(item, parametroSimulado).times(diasPeriodo);
      baseDaVerbaPrincipalNoPeriodo = baseDaVerbaPrincipalNoPeriodo.plus(baseSimulada);

      let mediaDivisor = this.obterMediaDivisor(item, parametroSimulado.getPeriodoParaMedia());
      if (mediaDivisor.isZero()) {
        mediaDivisor = this.obterMediaDivisor(item, parametro.getPeriodoAquisitivo());
      }
      mediaDivisor = mediaDivisor.times(diasPeriodo);
      divisorDaVerbaPrincipalNoMesDeOcorrencia = divisorDaVerbaPrincipalNoMesDeOcorrencia.plus(mediaDivisor);
    }

    baseDaVerbaPrincipalNoPeriodo = baseDaVerbaPrincipalNoPeriodo.div(diasTotais);
    divisorDaVerbaPrincipalNoMesDeOcorrencia = divisorDaVerbaPrincipalNoMesDeOcorrencia.div(diasTotais);
    if (divisorDaVerbaPrincipalNoMesDeOcorrencia.isZero()) {
      divisorDaVerbaPrincipalNoMesDeOcorrencia = new Decimal(1);
    }

    let valor = baseDaVerbaPrincipalNoPeriodo.times(mediaQuantidade)
      .div(divisorDaVerbaPrincipalNoMesDeOcorrencia)
      .plus(valorTotalPagoParaAbater);

    const verbaExt2 = parametro.getVerbaDeCalculo() as unknown as {
      isCaracteristicaFerias?: () => boolean;
    };
    if (verbaExt2.isCaracteristicaFerias?.()) {
      valor = this.verificarValorParaFerias(parametro, valor, periodo.totalDeDias());
    }

    return valor;
  }

  private encontrarQuantidadeDaCompetencia(
    valorIntegral: Decimal | null,
    qtdDias: number,
    periodoCondensado: Periodo,
    valor: Decimal,
    diasParaExcluir: number,
  ): Decimal | null {
    if (valorIntegral !== null) return valorIntegral;
    if (qtdDias > 0) {
      const integralizar = new CalculoDoIntegralizar(periodoCondensado as never, valor, diasParaExcluir);
      integralizar.executar();
      return integralizar.getResultado();
    }
    return null;
  }

  private encontrarValorPagoParaAbaterDaCompetencia(
    valorIntegral: Decimal | null,
    qtdDias: number,
    periodoCondensado: Periodo,
    valor: Decimal,
    diasParaExcluir: number,
  ): Decimal | null {
    if (valorIntegral !== null) return valorIntegral;
    if (qtdDias > 0) {
      const integralizar = new CalculoDoIntegralizar(periodoCondensado as never, valor, diasParaExcluir);
      integralizar.executar();
      return integralizar.getResultado();
    }
    return null;
  }

  private obterPeriodoDaMedia(ocorrenciasAgrupadas: Map<number, OcorrenciaDeVerba[]>): Periodo {
    let dateInicial: Date | null = null;
    let dateFinal: Date | null = null;
    for (const keyTime of ocorrenciasAgrupadas.keys()) {
      const d = new Date(keyTime);
      if (dateInicial === null || dateFinal === null) {
        dateInicial = d; dateFinal = d;
      }
      if (HelperDate.dateBefore(d, dateInicial!)) dateInicial = d;
      if (HelperDate.dateAfter(d, dateFinal!)) dateFinal = d;
    }
    return new Periodo(dateInicial, dateFinal);
  }

  private obterUltimosDozeMeses(
    periodo: Periodo,
    calculo: { getDataAdmissao?: () => Date | null },
  ): Periodo {
    const inicial = HelperDate.getInstance(periodo.getInicial())!.addMonth(-ComportamentoMediaPelaQuantidade.DOZE_MESES).setDay(1).getDate();
    const dataFinalAux = HelperDate.getInstance(periodo.getInicial())!.addMonth(-1);
    dataFinalAux.setDay(dataFinalAux.daysInMonth());
    const dataFinal = dataFinalAux.getDate();
    const ultimosDozeMeses = new Periodo(inicial, dataFinal);
    const admissao = calculo.getDataAdmissao?.();
    if (admissao && HelperDate.dateAfter(admissao, dataFinal)) return periodo;
    if (admissao && HelperDate.dateAfter(admissao, inicial)) {
      ultimosDozeMeses.setInicial(admissao);
    }
    return ultimosDozeMeses;
  }

  private obterMediaDivisor(_item: ItemBaseVerba, _periodoParaMedia: Periodo | null): Decimal {
    // Stub: depende de getOcorrenciasAtivasOptimizerListSearch e Competencia class.
    // Ref: ComportamentoMediaPelaQuantidade.java:236-260. Por padrão, 1.
    return new Decimal(1);
  }

  private obterBaseSimulada(item: ItemBaseVerba, _parametro: ParametroDoTermo): Decimal {
    // Stub: depende de SimuladorDeBaseParaVerba e FormulaCalculada/Reflexo.
    // Ref: ComportamentoMediaPelaQuantidade.java:330-347. Por padrão, usa total
    // do devido da verba-pai dividido pelos meses (aproximação grosseira).
    const verba = item.getVerbaDeCalculo() as unknown as {
      getOcorrenciasAtivas?: () => OcorrenciaDeVerba[];
    };
    let total = new Decimal(0);
    let count = 0;
    for (const oc of verba.getOcorrenciasAtivas?.() ?? []) {
      const dev = oc.getDevido();
      if (dev) { total = total.plus(dev); count++; }
    }
    return count > 0 ? total.div(count) : new Decimal(0);
  }
}
