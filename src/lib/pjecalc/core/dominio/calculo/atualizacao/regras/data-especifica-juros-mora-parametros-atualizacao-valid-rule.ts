/**
 * Porte 1:1 de DataEspecificaJurosMoraParametrosAtualizacaoValidRule.java (73 linhas).
 *
 * Valida a data "aPartirDe" para juros de mora:
 *   - ParametrosDeAtualizacao: data deve ser > ajuizamento e <= hoje.
 *   - ExcecaoDeJurosDaAtualizacao: data deve ser >= ajuizamento.
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/atualizacao/regras/DataEspecificaJurosMoraParametrosAtualizacaoValidRule.java
 */
import { HelperDate } from '../../../../base/comum/helper-date';
import { ExcecaoDeJurosDaAtualizacao } from '../excecao-de-juros-da-atualizacao';
import { ParametrosDeAtualizacao } from '../parametros-de-atualizacao';

export interface JurosMoraValidResult {
  valid: boolean;
  message?: string;
  detailParam?: string;
}

export class DataEspecificaJurosMoraParametrosAtualizacaoValidRule {
  static isValid(
    aPartirDe: Date | null,
    bean: ParametrosDeAtualizacao | ExcecaoDeJurosDaAtualizacao,
  ): JurosMoraValidResult {
    let parametros: ParametrosDeAtualizacao | null;
    let ehDaExcecaoJuros = false;
    if (bean instanceof ParametrosDeAtualizacao) {
      parametros = bean;
    } else {
      parametros = bean.getParametrosDeAtualizacao();
      ehDaExcecaoJuros = true;
    }

    if (!parametros || !parametros.getCalculo()) return { valid: true };
    const calc = parametros.getCalculo() as unknown as { getDataAjuizamento?: () => Date | null };
    const ajuizamento = calc.getDataAjuizamento?.();

    if (!aPartirDe || !ajuizamento) return { valid: true };

    if (ehDaExcecaoJuros) {
      if (HelperDate.dateBefore(aPartirDe, ajuizamento)) {
        return { valid: false, message: 'MSG0008', detailParam: 'calculo.dataAjuizamento' };
      }
    } else if (HelperDate.dateBeforeOrEquals(aPartirDe, ajuizamento)) {
      return { valid: false, message: 'MSG0007', detailParam: 'calculo.dataAjuizamento' };
    }

    if (!ehDaExcecaoJuros) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (HelperDate.dateBefore(hoje, aPartirDe)) {
        return { valid: false, message: 'MSG0010', detailParam: 'dataHoje' };
      }
    }
    return { valid: true };
  }
}
