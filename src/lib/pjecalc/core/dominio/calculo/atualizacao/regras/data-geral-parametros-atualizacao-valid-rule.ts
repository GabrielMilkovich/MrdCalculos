/**
 * Porte 1:1 de DataGeralParametrosAtualizacaoValidRule.java (76 linhas).
 *
 * Regra de validação geral para datas de ParametrosDeAtualizacao,
 * CombinacaoDeIndice e CombinacaoDeJuros.
 *
 * Verifica que a "data a partir de" é:
 *   - Posterior à data de admissão (ou data de liquidação, em cálculo externo).
 *   - Não posterior a hoje.
 *   - Para CombinacaoDeJuros: também precisa ser posterior à data de
 *     ajuizamento/admissão conforme flag aplicarJurosFasePreJudicial.
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/atualizacao/regras/DataGeralParametrosAtualizacaoValidRule.java
 */
import { HelperDate } from '../../../../base/comum/helper-date';
import { CombinacaoDeIndice } from '../combinacao-de-indice';
import { CombinacaoDeJuros } from '../combinacao-de-juros';
import { ParametrosDeAtualizacao } from '../parametros-de-atualizacao';

export interface DataGeralValidResult {
  valid: boolean;
  message?: string;
  detailParam?: string;
}

export class DataGeralParametrosAtualizacaoValidRule {
  /**
   * Valida a data "aPartirDe" no bean.
   * bean pode ser ParametrosDeAtualizacao, CombinacaoDeIndice ou CombinacaoDeJuros.
   */
  static isValid(
    aPartirDe: Date | null,
    bean: ParametrosDeAtualizacao | CombinacaoDeIndice | CombinacaoDeJuros,
  ): DataGeralValidResult {
    let parametros: ParametrosDeAtualizacao | null;
    let isCombinacaoJuros = false;

    if (bean instanceof ParametrosDeAtualizacao) {
      parametros = bean;
    } else if (bean instanceof CombinacaoDeIndice) {
      parametros = bean.getParametrosDeAtualizacao();
    } else if (bean instanceof CombinacaoDeJuros) {
      parametros = bean.getParametrosDeAtualizacao();
      isCombinacaoJuros = true;
    } else {
      return { valid: true };
    }

    if (!parametros) return { valid: true };
    const calc = parametros.getCalculo() as unknown as {
      isCalculoExterno?: () => boolean;
      getDataDeLiquidacao?: () => Date | null;
      getDataAdmissao?: () => Date | null;
      getDataAjuizamento?: () => Date | null;
    } | null;
    if (!calc) return { valid: true };
    const isCalculoExterno = calc.isCalculoExterno?.() ?? false;

    if (isCombinacaoJuros) {
      const dataLimite = isCalculoExterno
        ? calc.getDataDeLiquidacao?.()
        : (parametros.getAplicarJurosFasePreJudicial()
          ? calc.getDataAdmissao?.()
          : calc.getDataAjuizamento?.());
      if (!aPartirDe || !dataLimite || HelperDate.dateAfter(aPartirDe, dataLimite)) {
        return { valid: true };
      }
      return {
        valid: false,
        message: 'MSG0007',
        detailParam: isCalculoExterno
          ? 'calculoExterno.dataUltimaAtualizacao'
          : (parametros.getAplicarJurosFasePreJudicial() ? 'calculo.dataAdmissao' : 'calculo.dataAjuizamento'),
      };
    }

    const admissao = isCalculoExterno
      ? calc.getDataDeLiquidacao?.()
      : calc.getDataAdmissao?.();

    if (aPartirDe && admissao) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (HelperDate.dateBeforeOrEquals(aPartirDe, admissao)) {
        return {
          valid: false,
          message: 'MSG0007',
          detailParam: isCalculoExterno ? 'calculoExterno.dataUltimaAtualizacao' : 'calculo.dataAdmissao',
        };
      }
      if (HelperDate.dateBefore(hoje, aPartirDe)) {
        return { valid: false, message: 'MSG0010', detailParam: 'dataHoje' };
      }
    }
    return { valid: true };
  }
}
