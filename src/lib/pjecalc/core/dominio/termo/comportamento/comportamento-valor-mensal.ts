/**
 * Porte 1:1 de ComportamentoValorMensal.java (124 linhas).
 *
 * Comportamento "Valor Mensal" — soma os valores mensais da verba-pai,
 * pondera por dias, aplica tratamento de fração de mês (INTEGRALIZAR) e
 * ajusta para férias se aplicável.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/comportamento/ComportamentoValorMensal.java:33-122
 */
import Decimal from 'decimal.js';
import { ComportamentoDaBaseDoReflexo } from './comportamento-da-base-do-reflexo';
import {
  CaracteristicaDaVerbaEnum,
  TratamentoDaFracaoDeMesDoReflexoEnum,
  TipoDeGeracaoEnum,
  SituacaoDaFeriasEnum,
} from '../../../constantes/enums';
import { HelperDate } from '../../../base/comum/helper-date';
import { Periodo } from '../../../base/comum/periodo';
import { CalculoDoIntegralizar } from '../../../comum/rotinasdecalculo/calculo-do-integralizar';
import type { ItemBaseVerba } from '../item-base-verba';
import type { ParametroDoTermo } from '../parametro-do-termo';
import type { OcorrenciaDeVerba } from '../../ocorrenciaverba/ocorrencia-de-verba';

export class ComportamentoValorMensal extends ComportamentoDaBaseDoReflexo {
  resolverValor(item: ItemBaseVerba, parametro: ParametroDoTermo): Decimal {
    const base = item.getVerbaDeCalculo();
    const periodo = parametro.getPeriodo();
    if (!base || !periodo) return new Decimal(0);

    const diasOcorrenciaReflexo = HelperDate
      .getInstance(periodo.getFinal())!
      .subtractDays(periodo.getInicial()) + 1;

    const periodosOcorrenciaDoReflexo = HelperDate.breakInMonths(
      periodo.getInicial(), periodo.getFinal(),
    );

    let valorBaseReflexo = new Decimal(0);
    const baseExt = base as unknown as {
      obterOcorrenciasDoMes?: (d: Date) => OcorrenciaDeVerba[];
    };

    for (const p of periodosOcorrenciaDoReflexo) {
      const ocorrencias = baseExt.obterOcorrenciasDoMes?.(p.getFinal()) ?? [];
      const diasCobertos = new Set<number>();
      let diasParaExcluir = 0;
      let valorDoPeriodo = new Decimal(0);
      let valorDoPeriodoIntegral: Decimal | null = null;

      for (const oc of ocorrencias) {
        if (!oc.getAtivo()) continue;
        this.marcarDias(diasCobertos, oc);
        const ocExt = oc as unknown as {
          verificaDiasParaExcluirDeAcordoComA?: (v: unknown) => number;
        };
        diasParaExcluir += ocExt.verificaDiasParaExcluirDeAcordoComA?.(base) ?? 0;

        const verbaExt = item.getVerbaDeCalculo() as unknown as {
          getGerarReflexo?: () => TipoDeGeracaoEnum;
        };
        const gerarReflexo = verbaExt.getGerarReflexo?.();
        const ocExt2 = oc as unknown as {
          getDevidoIntegral?: () => Decimal | null;
          getDiferencaIntegral?: () => Decimal | null;
        };
        let valorBase: Decimal | null;
        let valorDaBaseIntegral: Decimal | null;
        if (gerarReflexo === TipoDeGeracaoEnum.DEVIDO) {
          valorBase = oc.getDevido();
          valorDaBaseIntegral = ocExt2.getDevidoIntegral?.() ?? null;
        } else {
          const difFn = (oc as unknown as { getDiferenca?: () => Decimal | null }).getDiferenca;
          valorBase = difFn?.call(oc) ?? new Decimal(0);
          valorDaBaseIntegral = ocExt2.getDiferencaIntegral?.() ?? null;
        }
        valorDoPeriodo = valorDoPeriodo.plus(valorBase ?? new Decimal(0));
        if (valorDoPeriodoIntegral === null) valorDoPeriodoIntegral = valorDaBaseIntegral;
      }

      if (diasCobertos.size > 0) {
        const reflexoExt = parametro.getVerbaDeCalculo() as unknown as {
          getTratamentoDaFracaoDeMesDoReflexo?: () => TratamentoDaFracaoDeMesDoReflexoEnum;
        };
        if (reflexoExt.getTratamentoDaFracaoDeMesDoReflexo?.() === TratamentoDaFracaoDeMesDoReflexoEnum.INTEGRALIZAR) {
          if (valorDoPeriodoIntegral !== null) {
            valorDoPeriodo = valorDoPeriodoIntegral;
          } else {
            let qtdDias = diasCobertos.size - diasParaExcluir;
            if (qtdDias < 0) qtdDias = 0;
            if (qtdDias === 0) {
              // SimuladorDeBaseParaVerba.obterValorTeoricoParaMesSemFeriasOuFaltas — stub (não portado)
              valorDoPeriodo = new Decimal(0);
            } else {
              const pfim = HelperDate.getInstance(p.getFinal())!;
              const periodoCondensado = new Periodo(
                HelperDate.getInstance(p.getFinal())!.setDay(1).getDate(),
                HelperDate.getInstance(p.getFinal())!.setDay(diasCobertos.size).getDate(),
              );
              void pfim;
              const integralizar = new CalculoDoIntegralizar(periodoCondensado as never, valorDoPeriodo, diasParaExcluir);
              integralizar.executar();
              valorDoPeriodo = integralizar.getResultado();
            }
          }
        }
      } else {
        valorDoPeriodo = new Decimal(0);
      }

      const diasPeriodo = p.totalDeDias();
      valorBaseReflexo = valorBaseReflexo.plus(valorDoPeriodo.times(diasPeriodo));
    }

    const verbaExt = parametro.getVerbaDeCalculo() as unknown as {
      getCaracteristica?: () => CaracteristicaDaVerbaEnum;
    };
    const calculoExt = parametro.getCalculo() as unknown as {
      getRegimeDoContrato?: () => string;
      getDataDemissao?: () => Date | null;
      getListaDeFerias?: () => Array<{
        getPeriodoAquisitivo: () => Periodo;
        getPrazo: () => number;
        getPeriodoDeGozo1?: () => Periodo | null;
        getPeriodoDeGozo2?: () => Periodo | null;
        getPeriodoDeGozo3?: () => Periodo | null;
        getAbono: () => boolean;
        getQuantidadeDiasAbono: () => number;
        getSituacao: () => SituacaoDaFeriasEnum;
      }>;
    };

    if (verbaExt.getCaracteristica?.() === CaracteristicaDaVerbaEnum.FERIAS
        && calculoExt.getRegimeDoContrato?.() !== 'INTERMITENTE') {
      valorBaseReflexo = valorBaseReflexo.div(30);

      const dataDemissao = calculoExt.getDataDemissao?.();
      if (
        HelperDate.dateEquals(periodo.getInicial(), periodo.getFinal())
        && dataDemissao
        && HelperDate.dateEquals(periodo.getInicial(), dataDemissao)
      ) {
        let encontrouFerias = false;
        for (const ferias of calculoExt.getListaDeFerias?.() ?? []) {
          if (!ferias.getPeriodoAquisitivo().isMesmoPeriodo(parametro.getPeriodoAquisitivo()!)) continue;
          encontrouFerias = true;
          const sit = ferias.getSituacao();
          if (sit !== SituacaoDaFeriasEnum.INDENIZADAS && sit !== SituacaoDaFeriasEnum.GOZADAS_PARCIALMENTE) break;
          let totalDeDias = ferias.getPrazo();
          const g1 = ferias.getPeriodoDeGozo1?.();
          const g2 = ferias.getPeriodoDeGozo2?.();
          const g3 = ferias.getPeriodoDeGozo3?.();
          if (g1) totalDeDias -= g1.totalDeDias();
          if (g2) totalDeDias -= g2.totalDeDias();
          if (g3) totalDeDias -= g3.totalDeDias();
          if (ferias.getAbono()) totalDeDias -= ferias.getQuantidadeDiasAbono();
          valorBaseReflexo = valorBaseReflexo.times(totalDeDias);
          break;
        }
        if (!encontrouFerias) {
          // Ferias.encontrarPrazoFeriasProporcionais — stub
          valorBaseReflexo = valorBaseReflexo.times(30);
        }
      }
    } else {
      valorBaseReflexo = valorBaseReflexo.div(diasOcorrenciaReflexo);
    }

    return valorBaseReflexo;
  }
}
