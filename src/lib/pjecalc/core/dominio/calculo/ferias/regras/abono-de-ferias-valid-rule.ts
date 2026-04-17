/**
 * Porte 1:1 de AbonoDeFeriasValidRule.java (34 linhas).
 *
 * Regra: abono pecuniário só pode ser marcado se a situação for GOZADAS ou
 * GOZADAS_PARCIALMENTE (férias indenizadas ou perdidas não têm abono).
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/ferias/regras/AbonoDeFeriasValidRule.java
 */
import { SituacaoDaFeriasEnum } from '../../../../constantes/enums';
import type { Ferias } from '../ferias';

export class AbonoDeFeriasValidRule {
  static readonly MESSAGE = 'MSG0004';

  static isValid(abono: boolean | null, ferias: Ferias): boolean {
    if (abono === null) return true;
    if (abono) {
      return ferias.getSituacao() === SituacaoDaFeriasEnum.GOZADAS
        || ferias.getSituacao() === SituacaoDaFeriasEnum.GOZADAS_PARCIALMENTE;
    }
    return true;
  }
}
