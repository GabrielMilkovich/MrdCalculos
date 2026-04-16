/**
 * Porte 1:1 de ComportamentoMediaPeloValor.java (211 linhas).
 *
 * Média dos valores mensais da verba-pai, com opção de aplicar correção
 * monetária (subclasse ComportamentoMediaPeloValorCorrigido).
 *
 * Ref: pjecalc-fonte/.../dominio/termo/comportamento/ComportamentoMediaPeloValor.java
 */
import Decimal from 'decimal.js';
import { ComportamentoDaBaseDoReflexo } from './comportamento-da-base-do-reflexo';
import {
  TratamentoDaFracaoDeMesDoReflexoEnum,
  TipoDeGeracaoEnum,
} from '../../../constantes/enums';
import { HelperDate } from '../../../base/comum/helper-date';
import { Periodo } from '../../../base/comum/periodo';
import { CalculoDoIntegralizar } from '../../../comum/rotinasdecalculo/calculo-do-integralizar';
import type { ItemBaseVerba } from '../item-base-verba';
import type { ParametroDoTermo } from '../parametro-do-termo';
import type { OcorrenciaDeVerba } from '../../ocorrenciaverba/ocorrencia-de-verba';

export class ComportamentoMediaPeloValor extends ComportamentoDaBaseDoReflexo {
  protected static readonly NAO_CORRIGIR = false;

  resolverValor(item: ItemBaseVerba, parametro: ParametroDoTermo): Decimal {
    return this.resolverValorInterno(item, parametro, ComportamentoMediaPeloValor.NAO_CORRIGIR);
  }

  /**
   * Método interno que permite às subclasses ativar correção monetária.
   * Ref: ComportamentoMediaPeloValor.java:38-135
   */
  protected resolverValorInterno(
    item: ItemBaseVerba,
    parametro: ParametroDoTermo,
    corrigir: boolean,
  ): Decimal {
    const base = item.getVerbaDeCalculo();
    if (!base) return new Decimal(0);

    let quantidadePeriodosDaMedia = this.obterQuantidadeEsperadaDeOcorrenciasParaMediaDoReflexo(parametro);
    let media = new Decimal(0);
    const ocorrencias = this.obterOcorrenciasDoPeriodoDaMediaDoReflexo(parametro, base);
    const ocorrenciasAgrupadas = new Map<number, OcorrenciaDeVerba[]>();
    this.agruparOcorrencias(ocorrencias, ocorrenciasAgrupadas);

    // TODO: TabelaDeCorrecaoMonetaria quando corrigir=true (port pendente)
    // TODO: calcularFatorDasCompetencias (ConversaoDeMoedas) quando corrigir=false
    const reflexoExt = parametro.getVerbaDeCalculo() as unknown as {
      getTratamentoDaFracaoDeMesDoReflexo?: () => TratamentoDaFracaoDeMesDoReflexoEnum;
    };
    const tratamento = reflexoExt.getTratamentoDaFracaoDeMesDoReflexo?.()
      ?? TratamentoDaFracaoDeMesDoReflexoEnum.MANTER;

    let ultimaCompetencia: Date | null = null;

    for (const [keyTime, ocorrenciasDaCompetencia] of ocorrenciasAgrupadas.entries()) {
      const keyDate = new Date(keyTime);
      if (!ultimaCompetencia || HelperDate.dateAfter(keyDate, ultimaCompetencia)) {
        ultimaCompetencia = keyDate;
      }
      const diasCobertos = new Set<number>();
      let diasParaExcluir = 0;
      let valorDaCompetencia = new Decimal(0);
      let valorDaCompetenciaIntegral: Decimal | null = null;

      const verbaExt = item.getVerbaDeCalculo() as unknown as {
        getGerarReflexo?: () => TipoDeGeracaoEnum;
      };
      const gerarReflexo = verbaExt.getGerarReflexo?.();

      for (const oc of ocorrenciasDaCompetencia) {
        if (!oc.getAtivo()) continue;
        this.marcarDias(diasCobertos, oc);
        const ocExt = oc as unknown as {
          verificaDiasParaExcluirDeAcordoComA?: (v: unknown) => number;
          getDevidoIntegral?: () => Decimal | null;
          getDiferencaIntegral?: () => Decimal | null;
        };
        diasParaExcluir += ocExt.verificaDiasParaExcluirDeAcordoComA?.(base) ?? 0;
        let valorBase: Decimal | null;
        let valorDaBaseIntegral: Decimal | null;
        if (gerarReflexo === TipoDeGeracaoEnum.DEVIDO) {
          valorBase = oc.getDevido();
          valorDaBaseIntegral = ocExt.getDevidoIntegral?.() ?? null;
        } else {
          const dif = (oc as unknown as { getDiferenca?: () => Decimal | null }).getDiferenca?.();
          valorBase = dif ?? new Decimal(0);
          valorDaBaseIntegral = ocExt.getDiferencaIntegral?.() ?? null;
        }
        valorDaCompetencia = valorDaCompetencia.plus(valorBase ?? new Decimal(0));
        if (valorDaCompetenciaIntegral === null) valorDaCompetenciaIntegral = valorDaBaseIntegral;
      }

      if (diasCobertos.size === 0) continue;

      switch (tratamento) {
        case TratamentoDaFracaoDeMesDoReflexoEnum.MANTER:
          // Sem conversão de moeda (stub) nem correção (stub): soma direta.
          media = media.plus(valorDaCompetencia);
          break;
        case TratamentoDaFracaoDeMesDoReflexoEnum.INTEGRALIZAR: {
          let qtdDias = diasCobertos.size - diasParaExcluir;
          if (qtdDias < 0) qtdDias = 0;
          if (qtdDias > 0) {
            if (valorDaCompetenciaIntegral !== null) {
              valorDaCompetencia = valorDaCompetenciaIntegral;
            } else {
              const periodoCondensado = new Periodo(
                HelperDate.getInstance(keyDate)!.setDay(1).getDate(),
                HelperDate.getInstance(keyDate)!.setDay(diasCobertos.size).getDate(),
              );
              const integralizar = new CalculoDoIntegralizar(periodoCondensado as never, valorDaCompetencia, diasParaExcluir);
              integralizar.executar();
              valorDaCompetencia = integralizar.getResultado();
            }
          }
          media = media.plus(valorDaCompetencia);
          break;
        }
        case TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR: {
          const qtdDias = diasCobertos.size - diasParaExcluir;
          const inicioMes = HelperDate.getInstance(keyDate)!.setDay(1).getDate();
          const dim = HelperDate.getInstance(keyDate)!.daysInMonth();
          const fimMes = HelperDate.getInstance(keyDate)!.setDay(dim).getDate();
          const mesVerbaBase = new Periodo(inicioMes, fimMes);
          if (qtdDias < mesVerbaBase.totalDeDias()) {
            quantidadePeriodosDaMedia--;
            break;
          }
          media = media.plus(valorDaCompetencia);
          break;
        }
        case TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR_MENOR_QUE_15_DIAS: {
          const qtdDias = diasCobertos.size - diasParaExcluir;
          if (qtdDias < 15) {
            quantidadePeriodosDaMedia--;
            break;
          }
          media = media.plus(valorDaCompetencia);
          break;
        }
      }
    }

    if (quantidadePeriodosDaMedia <= 0 || media.isZero()) return new Decimal(0);

    media = media.div(quantidadePeriodosDaMedia);

    const verbaExt2 = parametro.getVerbaDeCalculo() as unknown as {
      isCaracteristicaFerias?: () => boolean;
    };
    if (verbaExt2.isCaracteristicaFerias?.()) {
      const periodo = parametro.getPeriodo();
      if (periodo) {
        media = this.verificarValorParaFerias(parametro, media, periodo.totalDeDias());
      }
    }

    // TODO: aplicar fator de conversão entre última competência e data do reflexo
    // (encontrarFatorConversaoAteDataDoReflexo). Stub: sem conversão.
    void ultimaCompetencia;

    return media;
  }

  /**
   * Stub: calcula fator de conversão de moeda por competência.
   * Ref: ComportamentoMediaPeloValor.java:158-190 (ConversaoDeMoedas.COMPETENCIAS_MENSAIS...)
   * Por padrão, fator=1 (sem conversão). Implementar quando necessário.
   */
  protected calcularFatorDasCompetencias(_competencias: Set<number>): Map<number, Decimal> {
    return new Map();
  }
}
