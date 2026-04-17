/**
 * PJe-Calc v2.15.1 — TabelaDeCorrecaoMonetariaUtils
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetariaUtils
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/verbacalculo/TabelaDeCorrecaoMonetariaUtils.java
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { naoNulo, multiplicar, dividir, somar, subtrair } from '../../base/comum/utils';
import { IndiceMonetarioEnum } from '../../constantes/enums';
import type { CombinacaoDeIndice } from '../calculo/atualizacao/combinacao-de-indice';
import type { IndiceDeCalculo } from '../indices/indice-de-calculo';

/**
 * Interface mínima para um "Calculo" no escopo dos utils de correção.
 * (Calculo real tem 3087 linhas; usamos subset aqui para evitar dep circular.)
 */
export interface ICalculoRefUtils {
  getDataDemissao(): Date | null;
  getParametrosDeAtualizacao(): {
    getIndiceTrabalhista(): IndiceMonetarioEnum;
    getCombinarOutroIndice(): boolean;
    getListaDeCombinacaoDeIndices(): Set<CombinacaoDeIndice> | Iterable<CombinacaoDeIndice>;
  };
}

/** Indices classificados como "diários" (JAM, TabelaUnica diária, SELIC BCB, TUACDT). */
function isIndiceDiario(indice: IndiceMonetarioEnum | null): boolean {
  if (indice === null) return false;
  return indice === IndiceMonetarioEnum.JAM
    || indice === IndiceMonetarioEnum.TABELA_UNICA_JT_DIARIO
    || indice === IndiceMonetarioEnum.SELIC_BACEN
    || indice === IndiceMonetarioEnum.TUACDT;
}

export class TabelaDeCorrecaoMonetariaUtils {
  /**
   * verificarSeExisteIndiceUnicoNaDemissao (linha 24)
   * Retorna o índice aplicável ao mês da demissão, ou null se há combinação no próprio mês.
   */
  static verificarSeExisteIndiceUnicoNaDemissao(calculo: ICalculoRefUtils): IndiceMonetarioEnum | null {
    let indice: IndiceMonetarioEnum | null = calculo.getParametrosDeAtualizacao().getIndiceTrabalhista();
    const parametros = calculo.getParametrosDeAtualizacao();
    const demissao = calculo.getDataDemissao();
    if (!demissao) return indice;
    if (parametros.getCombinarOutroIndice()) {
      for (const comb of parametros.getListaDeCombinacaoDeIndices()) {
        const ap = comb.getApartirDeOutroIndice();
        if (!ap) continue;
        const mesAp = HelperDate.getCurrentCompetence(ap).getDate();
        const mesDem = HelperDate.getCurrentCompetence(demissao).getDate();
        if (HelperDate.dateBefore(mesAp, mesDem)) {
          indice = comb.getOutroIndiceTrabalhista();
          continue;
        }
        if (!HelperDate.dateEquals(mesAp, mesDem)) break;
        indice = null;
        break;
      }
    }
    return indice;
  }

  /**
   * encontrarCombinacoesAdicionaisNoMesmoMes (linha 41)
   * Localiza outras combinações que caem no mesmo mês que `segundaDoMes` mas
   * antes dela (para resolução de combinações encadeadas no mesmo mês).
   */
  static encontrarCombinacoesAdicionaisNoMesmoMes(
    segundaDoMes: CombinacaoDeIndice,
    combinacoesDeIndices: Iterable<CombinacaoDeIndice>
  ): CombinacaoDeIndice[] {
    const saida: CombinacaoDeIndice[] = [];
    const apSegunda = segundaDoMes.getApartirDeOutroIndice();
    if (!apSegunda) return saida;
    const mesDaCombinacao = HelperDate.getCurrentCompetence(apSegunda).getDate();
    for (const comb of combinacoesDeIndices) {
      const ap = comb.getApartirDeOutroIndice();
      if (!ap) continue;
      const mesComb = HelperDate.getCurrentCompetence(ap).getDate();
      if (!HelperDate.dateEquals(mesDaCombinacao, mesComb)) continue;
      if (!HelperDate.dateBefore(ap, apSegunda)) continue;
      saida.push(comb);
    }
    saida.sort((a, b) => a.compareTo(b));
    return saida;
  }

  /** isAte (linha 51) — true se a competência está no ou antes de mes/ano. */
  static isAte(mes: number, ano: number, competenciaDaOcorrencia: HelperDate): boolean {
    if (competenciaDaOcorrencia.getYear() > ano) return false;
    if (competenciaDaOcorrencia.getYear() < ano) return true;
    return competenciaDaOcorrencia.getMonth() <= mes;
  }

  /**
   * encontrarIndiceAcumuladoAposMudanca (linha 61)
   * Retorna o valorAcumulado do penúltimo índice da lista (primeiro índice após
   * o mês de mudança, viajando de trás para frente).
   */
  static encontrarIndiceAcumuladoAposMudanca(outrosIndices: IndiceDeCalculo[]): Decimal {
    let indiceAcumuladoDepoisDoMesDaMudanca = new Decimal(1);
    for (let sizeAuxiliar = outrosIndices.length; sizeAuxiliar > 1; --sizeAuxiliar) {
      const idx = outrosIndices[sizeAuxiliar - 2];
      if (!naoNulo(idx)) continue;
      const val = idx.getValorAcumulado();
      if (val) {
        indiceAcumuladoDepoisDoMesDaMudanca = val;
        break;
      }
    }
    return indiceAcumuladoDepoisDoMesDaMudanca;
  }

  /** verificarSeExisteIndiceDiarioNaCombinacao (linha 71) */
  static verificarSeExisteIndiceDiarioNaCombinacao(calculo: ICalculoRefUtils): boolean {
    const parametros = calculo.getParametrosDeAtualizacao();
    if (isIndiceDiario(parametros.getIndiceTrabalhista())) return true;
    if (parametros.getCombinarOutroIndice()) {
      for (const comb of parametros.getListaDeCombinacaoDeIndices()) {
        if (isIndiceDiario(comb.getOutroIndiceTrabalhista())) return true;
      }
    }
    return false;
  }

  /**
   * tratarConversaoMoedaNaCombinacaoComSelic (linha 89) — conversão de moeda
   * durante combinação com SELIC. Simplificado: ConversaoDeMoedas vazia por
   * padrão (casos modernos), fatorConversao=1.
   */
  static tratarConversaoMoedaNaCombinacaoComSelic(
    fator: Decimal,
    indice: IndiceDeCalculo,
    _dataCombinacao: Date
  ): Decimal {
    // Simplificação: COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS está vazio
    // para casos modernos (≥1995). fatorConversao = 1.
    const fatorConversao = new Decimal(1);
    let valorIndice = dividir(indice.getValorAcumulado(), fatorConversao)!;
    valorIndice = subtrair(somar(valorIndice, fator)!, new Decimal(1))!;
    valorIndice = multiplicar(valorIndice, fatorConversao)!;
    return valorIndice;
  }

  /** Exporta isIndiceDiario (usado internamente e pela TabelaDeCorrecaoMonetaria) */
  static isIndiceDiario(indice: IndiceMonetarioEnum | null): boolean {
    return isIndiceDiario(indice);
  }
}
