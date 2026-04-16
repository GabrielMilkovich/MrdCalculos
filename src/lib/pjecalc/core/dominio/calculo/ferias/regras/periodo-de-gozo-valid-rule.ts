/**
 * Porte 1:1 de PeriodoDeGozoValidRule.java (277 linhas).
 *
 * Regra de validação dos períodos de gozo das férias:
 *   1. Data inicial > data final do período anterior
 *   2. Data final >= data inicial (período não-negativo)
 *   3. Período contido entre aquisitivo e demissão/hoje
 *   4. Soma dos períodos == prazo (ou < prazo se GOZADAS_PARCIALMENTE)
 *      — descontando abono se aplicável
 *   5. Período de gozo com > 1 subperíodo requer ao menos 10 dias em um deles
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/ferias/regras/PeriodoDeGozoValidRule.java
 */
import { SituacaoDaFeriasEnum } from '../../../../constantes/enums';
import { Periodo } from '../../../../base/comum/periodo';
import { HelperDate } from '../../../../base/comum/helper-date';
import type { Ferias } from '../ferias';

export const FLAGS = {
  DATA_INICIAL_GOZO1: 0,
  DATA_FINAL_GOZO1: 1,
  DATA_INICIAL_GOZO2: 2,
  DATA_FINAL_GOZO2: 3,
  DATA_INICIAL_GOZO3: 4,
  DATA_FINAL_GOZO3: 5,
} as const;

/** Qual período de gozo está sendo validado (1, 2, ou 3). */
function getPeriodoNumero(flag: number): 1 | 2 | 3 | 0 {
  if (flag === FLAGS.DATA_INICIAL_GOZO1 || flag === FLAGS.DATA_FINAL_GOZO1) return 1;
  if (flag === FLAGS.DATA_INICIAL_GOZO2 || flag === FLAGS.DATA_FINAL_GOZO2) return 2;
  if (flag === FLAGS.DATA_INICIAL_GOZO3 || flag === FLAGS.DATA_FINAL_GOZO3) return 3;
  return 0;
}

function isDataInicial(flag: number): boolean {
  return flag === FLAGS.DATA_INICIAL_GOZO1 || flag === FLAGS.DATA_INICIAL_GOZO2
    || flag === FLAGS.DATA_INICIAL_GOZO3;
}

function isDataFinal(flag: number): boolean {
  return flag === FLAGS.DATA_FINAL_GOZO1 || flag === FLAGS.DATA_FINAL_GOZO2
    || flag === FLAGS.DATA_FINAL_GOZO3;
}

function getPeriodoDoFlag(ferias: Ferias, flag: number): Periodo | null {
  const n = getPeriodoNumero(flag);
  if (n === 1) return ferias.getPeriodoDeGozo1();
  if (n === 2) return ferias.getPeriodoDeGozo2();
  if (n === 3) return ferias.getPeriodoDeGozo3();
  return null;
}

export interface PeriodoDeGozoValidResult {
  valid: boolean;
  message?: string;
  details?: string;
}

export class PeriodoDeGozoValidRule {
  /**
   * Valida o valor de uma data (inicial ou final) de um período de gozo.
   * flag indica qual data está sendo validada.
   */
  static isValid(value: Date | null, ferias: Ferias, flag: number): PeriodoDeGozoValidResult {
    if (value === null) return { valid: true };

    const periodo = getPeriodoDoFlag(ferias, flag);
    if (!periodo) return { valid: true };

    // 1. Data inicial ≥ data final do período anterior
    if (isDataInicial(flag)) {
      const n = getPeriodoNumero(flag);
      if (n === 2) {
        const p1 = ferias.getPeriodoDeGozo1();
        if (p1 && p1.getFinal() && periodo.getInicial()
            && HelperDate.dateBeforeOrEquals(periodo.getInicial(), p1.getFinal())) {
          return { valid: false, message: 'MSG0007', details: 'DATA_FINAL_GOZO1' };
        }
      } else if (n === 3) {
        const p2 = ferias.getPeriodoDeGozo2();
        if (p2 && p2.getFinal() && periodo.getInicial()
            && HelperDate.dateBeforeOrEquals(periodo.getInicial(), p2.getFinal())) {
          return { valid: false, message: 'MSG0007', details: 'DATA_FINAL_GOZO2' };
        }
      }
    }

    // 2. Data final >= data inicial
    if (isDataFinal(flag) && periodo.isDataFinalMenorQueInicial()) {
      return { valid: false, message: 'MSG0008' };
    }

    // 3. Período dentro do aquisitivo até demissão/hoje
    if (isDataFinal(flag)) {
      const calculo = ferias.getCalculo();
      const calculoExt = calculo as unknown as {
        getDataDemissao?: () => Date | null;
      };
      let dataFinal = calculoExt?.getDataDemissao?.() ?? null;
      if (!dataFinal) {
        dataFinal = new Date();
        dataFinal.setHours(0, 0, 0, 0);
      }
      const aquisitivoIni = ferias.getDataInicialDoPeriodoAquisitivo();
      if (aquisitivoIni) {
        const periodoValido = new Periodo(aquisitivoIni, dataFinal);
        if (!periodoValido.isPeriodoContemTotalmenteEste(periodo)) {
          return { valid: false, message: 'MSG0039' };
        }
      }
    }

    // 4. Soma dos períodos == prazo (ou < se GOZADAS_PARCIALMENTE)
    if (isDataFinal(flag)) {
      const result = PeriodoDeGozoValidRule.consistenciaDoSomaDosPeriodosDeGozo(ferias, flag);
      if (!result.valid) return result;
    }

    return { valid: true };
  }

  /** consistenciaDoSomaDosPeriodosDeGozo (Java linhas 143-179) */
  private static consistenciaDoSomaDosPeriodosDeGozo(ferias: Ferias, flag: number): PeriodoDeGozoValidResult {
    const p1 = ferias.getPeriodoDeGozo1();
    const p2 = ferias.getPeriodoDeGozo2();
    const p3 = ferias.getPeriodoDeGozo3();

    let ultimoPeriodoPreenchido = 0;
    if (p3?.isCompleto()) ultimoPeriodoPreenchido = 3;
    else if (p2?.isCompleto()) ultimoPeriodoPreenchido = 2;
    else if (p1?.isCompleto()) ultimoPeriodoPreenchido = 1;

    if (getPeriodoNumero(flag) !== ultimoPeriodoPreenchido) return { valid: true };

    const somaDosPeriodos = (p1?.totalDeDias() ?? 0) + (p2?.totalDeDias() ?? 0) + (p3?.totalDeDias() ?? 0);
    const prazo = ferias.getPrazo();

    if (!ferias.getAbono()) {
      if (ferias.getSituacao() === SituacaoDaFeriasEnum.GOZADAS_PARCIALMENTE) {
        return somaDosPeriodos < prazo
          ? { valid: true }
          : { valid: false, message: 'MSG0040' };
      }
      return somaDosPeriodos === prazo
        ? { valid: true }
        : { valid: false, message: 'MSG0036' };
    }

    const prazoComAbono = prazo - ferias.getQuantidadeDiasAbono();
    if (ferias.getSituacao() === SituacaoDaFeriasEnum.GOZADAS_PARCIALMENTE) {
      return somaDosPeriodos < prazoComAbono
        ? { valid: true }
        : { valid: false, message: 'MSG0041' };
    }
    return somaDosPeriodos === prazoComAbono
      ? { valid: true }
      : { valid: false, message: 'MSG0037' };
  }

  /**
   * consistenciaDoPeriodosDeGozoSuperiorA10Dias (Java linhas 181-194).
   * Se há mais de um período de gozo, pelo menos um deve ter >= 10 dias.
   */
  static consistenciaDoPeriodosDeGozoSuperiorA10Dias(ferias: Ferias): PeriodoDeGozoValidResult {
    const t1 = ferias.getPeriodoDeGozo1()?.totalDeDias() ?? 0;
    const t2 = ferias.getPeriodoDeGozo2()?.totalDeDias() ?? 0;
    const t3 = ferias.getPeriodoDeGozo3()?.totalDeDias() ?? 0;
    if (t2 > 0 || t3 > 0) {
      return (t1 >= 10 || t2 >= 10 || t3 >= 10)
        ? { valid: true }
        : { valid: false, message: 'MSG0035' };
    }
    return { valid: true };
  }
}
