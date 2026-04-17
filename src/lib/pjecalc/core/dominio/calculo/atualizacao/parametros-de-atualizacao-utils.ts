/**
 * PJe-Calc v2.15.1 — ParametrosDeAtualizacaoUtils
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacaoUtils
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/atualizacao/ParametrosDeAtualizacaoUtils.java
 *
 * Helpers estáticos para trabalhar com combinações de índices e identificar
 * o índice aplicável em uma dada data.
 *
 * NOTA: `verificarInformacoesDeJuros` (linha 22-42) e `adicionarExcecoes*`
 * (linhas 44-121) dependem de `ExcecaoDeJurosDaAtualizacao` (ainda não portada)
 * e fazem parte do setup de UI do PJe-Calc. Portamos apenas os métodos
 * usados durante o cálculo:
 *   - montarAsCombinacoesDeIndices
 *   - encontrarIndiceCorrecaoDa
 */
import { HelperDate } from '../../../base/comum/helper-date';
import type { IndiceMonetarioEnum } from '../../../constantes/enums';
import { CombinacaoDeIndice } from './combinacao-de-indice';
import { ParametrosDeAtualizacao } from './parametros-de-atualizacao';

export class ParametrosDeAtualizacaoUtils {
  /**
   * montarAsCombinacoesDeIndices (linha 123)
   *
   * Filtra combinações relevantes para o período (apartirDe ≤ fimPeríodo) e
   * remove combinações que não introduzem mudança real (quando o próximo índice
   * é igual ao anterior).
   */
  static montarAsCombinacoesDeIndices(
    parametrosDeAtualizacao: ParametrosDeAtualizacao,
    fimDoPeriodoDeCorrecao: Date
  ): CombinacaoDeIndice[] {
    const combinacoes: CombinacaoDeIndice[] = [];
    const fimDoMes = HelperDate.getCurrentCompetence(fimDoPeriodoDeCorrecao).lastDayOfTheMonth().getDate();

    for (const c of parametrosDeAtualizacao.getListaDeCombinacaoDeIndices()) {
      const ap = c.getApartirDeOutroIndice();
      if (!ap) continue;
      if (!HelperDate.dateBeforeOrEquals(ap, fimDoMes)) continue;
      combinacoes.push(c);
    }

    // Ordena por apartirDeOutroIndice (usa compareTo do Java)
    combinacoes.sort((a, b) => a.compareTo(b));

    // Remove combinações que não mudam o índice
    let anterior: IndiceMonetarioEnum | null = parametrosDeAtualizacao.getIndiceTrabalhista();
    const paraRemover = new Set<CombinacaoDeIndice>();
    for (const c of combinacoes) {
      if (anterior !== null && anterior === c.getOutroIndiceTrabalhista()) {
        paraRemover.add(c);
      }
      anterior = c.getOutroIndiceTrabalhista();
    }
    return combinacoes.filter(c => !paraRemover.has(c));
  }

  /**
   * encontrarIndiceCorrecaoDa (linha 157)
   *
   * Dado uma data, descobre qual índice de correção se aplica (principal ou
   * uma das combinações, a mais recente cuja apartirDe ≤ data).
   */
  static encontrarIndiceCorrecaoDa(
    data: Date,
    parametrosDeAtualizacao: ParametrosDeAtualizacao
  ): IndiceMonetarioEnum {
    let indice = parametrosDeAtualizacao.getIndiceTrabalhista();
    if (parametrosDeAtualizacao.getCombinarOutroIndice()) {
      // Ordenar combinações (Java usa Set com OrderBy annotation)
      const combinacoes = [...parametrosDeAtualizacao.getListaDeCombinacaoDeIndices()];
      combinacoes.sort((a, b) => a.compareTo(b));

      for (const comb of combinacoes) {
        const ap = comb.getApartirDeOutroIndice();
        if (!ap) continue;
        if (!HelperDate.dateBeforeOrEquals(ap, data)) break;
        const outro = comb.getOutroIndiceTrabalhista();
        if (outro !== null) indice = outro;
      }
    }
    return indice;
  }
}
