/**
 * PJe-Calc v2.15.1 — TipoSalarioPagoEnum
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.constantes.TipoSalarioPagoEnum
 *
 * Determina qual salário é usado para apurar o valor-pago de uma verba
 * (base para calcular diferenças devidas).
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/constantes/TipoSalarioPagoEnum.java
 */

export enum TipoSalarioPagoEnum {
  /** Nenhum salário pago considerado — devido integral. */
  NENHUM = 'N',
  /** Última remuneração do contrato. */
  ULTIMA_REMUNERACAO = 'U',
  /** Maior remuneração do período histórico. */
  MAIOR_REMUNERACAO = 'M',
  /** Histórico salarial mês a mês (padrão jurisprudencial). */
  HISTORICO_SALARIAL = 'H',
}

export const TipoSalarioPagoEnumNomes: Record<TipoSalarioPagoEnum, string> = {
  [TipoSalarioPagoEnum.NENHUM]: 'Nenhum',
  [TipoSalarioPagoEnum.ULTIMA_REMUNERACAO]: 'Última Remuneração',
  [TipoSalarioPagoEnum.MAIOR_REMUNERACAO]: 'Maior Remuneração',
  [TipoSalarioPagoEnum.HISTORICO_SALARIAL]: 'Histórico Salarial',
};
