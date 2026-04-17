/**
 * Porte parcial de ServicoAtualizacaoUtils.java (301 linhas).
 *
 * Utilitários para cálculos de atualização monetária de precatórios:
 *   - Taxa de juros do precatório (simples e SIP)
 *   - Combinação de juros do precatório SIP
 *   - Período da graça (relativo, absoluto, por data de expedição)
 *
 * STATUS: portados métodos de manipulação de período (montarPeriodoDaGraca,
 * montarPeriodoDaGracaRelativo, encontrarPeriodoDaGraca). Métodos que
 * dependem de TabelaDeJurosDoCalculo ficam como STUB (Fase 5).
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/atualizacao/ServicoAtualizacaoUtils.java
 */
import { Periodo } from '../../../base/comum/periodo';
import { HelperDate } from '../../../base/comum/helper-date';

/** Tipo do precatório — determina regras do período da graça. */
export enum TipoPrecatorioEnum {
  PRE = 'PRE',
  RPV = 'RPV',
}

export class ServicoAtualizacaoUtils {
  private static readonly PERIODO_DA_GRACA = 2;

  /**
   * montarPeriodoDaGraca (linha 228-233).
   * Converte datas inicio/fim do período da graça da Atualizacao em Periodo.
   */
  static montarPeriodoDaGraca(atualizacao: {
    getDataInicioPeriodoDaGraca?: () => Date | null;
    getDataFimPeriodoDaGraca?: () => Date | null;
  } | null): Periodo | null {
    const ini = atualizacao?.getDataInicioPeriodoDaGraca?.();
    const fim = atualizacao?.getDataFimPeriodoDaGraca?.();
    if (ini && fim) return new Periodo(ini, fim);
    return null;
  }

  /**
   * montarPeriodoDaGracaRelativo (linha 235-257).
   *
   * Recorta o período da graça ao período de atualização, ajustando:
   *   - Se graça for completamente fora do período, devolve período intacto.
   *   - Se graça começa antes do início da atualização, ajusta o início.
   *   - Se graça começa antes do início da tabela IPCA-E (01/01/1992) mas
   *     termina depois, ajusta início pra 01/01/1992.
   *   - Se graça termina depois do fim, ajusta o fim.
   */
  static montarPeriodoDaGracaRelativo(
    periodoAtualizacao: Periodo,
    periodoDaGraca: Periodo | null,
  ): Periodo {
    const inicio = periodoAtualizacao.getInicial();
    const fim = periodoAtualizacao.getFinal();
    if (!periodoDaGraca) {
      const dataForaDeContexto = new Date(1900, 0, 1);
      return new Periodo(dataForaDeContexto, dataForaDeContexto);
    }
    const periodoDaGracaRelativo = new Periodo(periodoDaGraca.getInicial(), periodoDaGraca.getFinal());
    if (HelperDate.dateAfter(periodoDaGraca.getInicial(), fim)
        || HelperDate.dateBefore(periodoDaGraca.getFinal(), inicio)) {
      return periodoDaGracaRelativo;
    }
    if (HelperDate.dateBefore(periodoDaGraca.getInicial(), inicio)) {
      periodoDaGracaRelativo.setInicial(inicio);
    }
    const inicioTabelaIPCAE = new Date(1992, 0, 1);
    if (HelperDate.dateBefore(periodoDaGraca.getInicial(), inicioTabelaIPCAE)
        && HelperDate.dateAfterOrEquals(periodoDaGraca.getFinal(), inicioTabelaIPCAE)) {
      periodoDaGracaRelativo.setInicial(inicioTabelaIPCAE);
    }
    if (HelperDate.dateAfter(periodoDaGraca.getFinal(), fim)) {
      periodoDaGracaRelativo.setFinal(fim);
    }
    return periodoDaGracaRelativo;
  }

  /**
   * encontrarPeriodoDaGraca (linha 259-296).
   *
   * Calcula o período da graça dado data de expedição e tipo do precatório:
   *   - PRE: prazo até próximo 02/04 (após 03/04/2025 via EC 136/2025) ou 02/06 (antes 02/07/2021).
   *   - RPV: começa dia útil seguinte, termina 2 meses depois.
   */
  static encontrarPeriodoDaGraca(dataExpedicao: Date, tipo: TipoPrecatorioEnum): Periodo {
    if (tipo === TipoPrecatorioEnum.PRE) {
      const inicio = HelperDate.getInstance(dataExpedicao)!;
      const abril25 = new Date(2025, 3, 3);
      if (HelperDate.dateAfterOrEquals(dataExpedicao, abril25)) {
        if (inicio.getMonth() > 1 || (inicio.getMonth() === 1 && inicio.getDay() >= 2)) {
          inicio.addYear(1);
        }
        inicio.setMonth(1);
        inicio.setDay(2);
        const fim = HelperDate.getInstance(inicio.getDate())!.setDay(31).setMonth(11).addYear(1);
        return new Periodo(inicio, fim);
      }
      const julho21 = new Date(2021, 6, 2);
      if (HelperDate.dateAfterOrEquals(dataExpedicao, julho21)) {
        if (inicio.getMonth() > 3 || (inicio.getMonth() === 3 && inicio.getDay() > 2)) {
          inicio.addYear(1);
        }
        inicio.setMonth(3);
        inicio.setDay(3);
      } else {
        if (inicio.getMonth() > 6 || (inicio.getMonth() === 6 && inicio.getDay() > 1)) {
          inicio.addYear(1);
        }
        inicio.setMonth(6);
        inicio.setDay(2);
      }
      const fim = HelperDate.getInstance(inicio.getDate())!.setDay(31).setMonth(11).addYear(1);
      return new Periodo(inicio, fim);
    }

    // RPV: dia útil seguinte até 2 meses depois - 1 dia
    const inicio = HelperDate.getInstance(dataExpedicao)!.addDay(1);
    // STUB: isWorkDayWithoutSaturdaysOrFederalHolidays requer provider de feriados.
    // Implementação simplificada: assumir que o dia seguinte é útil.
    const fim = HelperDate.getInstance(inicio.getDate())!.addMonth(ServicoAtualizacaoUtils.PERIODO_DA_GRACA).addDay(-1);
    return new Periodo(inicio, fim);
  }
}
