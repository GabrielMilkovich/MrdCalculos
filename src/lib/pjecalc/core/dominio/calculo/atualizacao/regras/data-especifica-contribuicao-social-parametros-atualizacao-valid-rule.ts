/**
 * Porte 1:1 de DataEspecificaContribuicaoSocialParametrosAtualizacaoValidRule.java (52 linhas).
 *
 * Valida a data "aplicarAte" para correção previdenciária sobre INSS.
 * Só valida se lei11941 está habilitado. Data deve ser:
 *   - >= data de admissão
 *   - <= hoje
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/atualizacao/regras/DataEspecificaContribuicaoSocialParametrosAtualizacaoValidRule.java
 */
import { HelperDate } from '../../../../base/comum/helper-date';
import type { ParametrosDeAtualizacao } from '../parametros-de-atualizacao';

export interface CSValidResult {
  valid: boolean;
  message?: string;
  detailParam?: string;
}

export class DataEspecificaContribuicaoSocialParametrosAtualizacaoValidRule {
  static isValid(aplicarAte: Date | null, parametros: ParametrosDeAtualizacao): CSValidResult {
    const lei11941 = parametros.getLei11941();
    const calc = parametros.getCalculo() as unknown as { getDataAdmissao?: () => Date | null } | null;
    const admissao = calc?.getDataAdmissao?.();
    if (!lei11941 || !aplicarAte || !admissao) return { valid: true };

    if (HelperDate.dateBefore(aplicarAte, admissao)) {
      return { valid: false, message: 'MSG0008', detailParam: 'calculo.dataAdmissao' };
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (HelperDate.dateBefore(hoje, aplicarAte)) {
      return { valid: false, message: 'MSG0010', detailParam: 'dataHoje' };
    }
    return { valid: true };
  }
}
