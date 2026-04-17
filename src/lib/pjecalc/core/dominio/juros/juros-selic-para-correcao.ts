/**
 * PJe-Calc v2.15.1 — JurosSelicParaCorrecao
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicParaCorrecao
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/juros/selicirpf/JurosSelicParaCorrecao.java
 *
 * Monta a tabela de índices SELIC para uso como CORREÇÃO monetária (não juros).
 * Diferença crucial: inclui +1,00% fixo no mês de liquidação (regra RFB).
 *
 * O PJe-Calc usa esta classe quando IndiceMonetarioEnum.SELIC é selecionado como
 * índice de correção trabalhista (ADC 58/59 fase pós-citação).
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';
import { calcularIndiceAcumuladoComSomas } from '../../comum/rotinasdecalculo/calculador-de-indices';
import { IndiceBase } from '../indices/indice-base';
import type { IndiceDeCalculo } from '../indices/indice-de-calculo';
import { TABELA_SELIC_MENSAL } from '../indices/selic/tabela-selic-mensal';

/** Wrapper que implementa IndiceDeCalculo para as taxas SELIC mensais */
class SelicParaCorrecaoEntry extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal) {
    super(competencia, taxa);
  }
  clonar(): SelicParaCorrecaoEntry {
    const c = new SelicParaCorrecaoEntry(this.getCompetencia(), this.getTaxa());
    if (this.getValorAcumulado() !== null) c.setValorAcumulado(this.getValorAcumulado()!);
    return c;
  }
}

/**
 * obterTabelaParaCorrecao (linha 61 do Java)
 *
 * Monta a lista de SelicParaCorrecaoEntry para o período dado, aplicando:
 * 1. Taxa mensal SELIC de cada competência (soma simples)
 * 2. +1,00% fixo no mês de liquidação (quando incluirUmPorcento=true)
 *
 * @param periodo Periodo de correção (admissão → liquidação ou subset)
 * @param dataLiquidacao Data de liquidação do cálculo
 * @param ignorarTaxaNegativa Se true, taxas negativas são clampadas a 0
 */
export function obterTabelaSelicParaCorrecao(
  periodo: Periodo,
  dataLiquidacao: Date,
  ignorarTaxaNegativa: boolean,
): IndiceDeCalculo[] {
  const lista: SelicParaCorrecaoEntry[] = [];
  const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
  const fim = HelperDate.getCurrentCompetence(periodo.getFinal());

  // Determina se inclui 1% no mês da liquidação
  const incluirUmPorcento = periodo.isPeriodoContemEsta(dataLiquidacao);
  let maxCompetencia: Date | null = null;

  for (const entry of TABELA_SELIC_MENSAL) {
    const comp = new Date(entry.ano, entry.mes - 1, 1);
    if (comp < inicio.getDate() || comp > fim.getDate()) continue;

    // Pula taxa do mês da liquidação (será substituída por 1% fixo)
    const compLiq = HelperDate.getCurrentCompetence(dataLiquidacao).getDate();
    if (HelperDate.dateEquals(comp, compLiq)) continue;

    lista.push(new SelicParaCorrecaoEntry(comp, new Decimal(entry.taxa)));
    if (maxCompetencia === null || comp > maxCompetencia) {
      maxCompetencia = comp;
    }
  }

  // Adiciona +1,00% fixo no mês da liquidação (regra RFB/PJe-Calc)
  if (incluirUmPorcento && maxCompetencia !== null) {
    const compUmPorcento = HelperDate.getCurrentCompetence(maxCompetencia).addMonth(1).getDate();
    lista.push(new SelicParaCorrecaoEntry(compUmPorcento, new Decimal(1)));
  }

  // Ordena e aplica soma simples
  lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
  return calcularIndiceAcumuladoComSomas(lista, ignorarTaxaNegativa);
}
