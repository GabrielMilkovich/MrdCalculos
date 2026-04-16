/**
 * PJe-Calc v2.15.1 — CalculadorDeIndices
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculadorDeIndices
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/comum/rotinasdecalculo/CalculadorDeIndices.java
 *
 * Contém a LÓGICA FUNDAMENTAL da paridade SELIC:
 * - calcularIndiceAcumulado(): PRODUTO (índices multiplicativos: IPCA-E, IGPM, etc.)
 * - calcularIndiceAcumuladoComSomas(): SOMA SIMPLES (SELIC RFB — Súmula 121 STF)
 */
import Decimal from 'decimal.js';
import type { IndiceDeCalculo } from '../../dominio/indices/indice-de-calculo';
import { nulo, naoNulo, multiplicar, dividir, somar, subtrair } from '../../base/comum/utils';

/**
 * Tabela de COMPETÊNCIAS DE CONVERSÃO DE MOEDAS brasileiras (1986-1994).
 * Mapa: Date (primeiro dia do mês) → divisor de conversão
 * Usado em `calcularIndiceAcumulado` para ajustar valores no momento da troca
 * da moeda corrente (Cruzeiro → Cruzado → NCz → Cruzeiro Real → Real).
 *
 * TODO: popular valores históricos reais quando casos pré-1994 forem processados.
 * Para casos modernos (≥1995), este mapa está vazio — sem impacto.
 */
export const COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS: Map<string, Decimal> = new Map();
export const COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS: Map<string, Decimal> = new Map();

function chaveData(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * calcularIndiceAcumulado (linha 72)
 *
 * Algoritmo PRODUTO (índices multiplicativos — IPCA-E, IGPM, INPC, IPC, IPCA):
 *   acumulado_n = valorIndice_n × acumuladoAnterior
 *
 * Para o primeiro índice, acumulado = valorIndice.
 * Se a competência coincide com conversão de moeda, divide valorIndice pelo fator.
 */
export function calcularIndiceAcumulado(listaDeIndices: IndiceDeCalculo[]): IndiceDeCalculo[] {
  // Clone defensivo (evita mutar original)
  const novaLista = listaDeIndices.map(i => i.clonar());

  // Ordena por competência (Java: Collections.sort(listaDeIndices))
  novaLista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());

  let indiceAnterior: IndiceDeCalculo | null = null;
  for (const indiceDeCalculo of novaLista) {
    const chave = chaveData(indiceDeCalculo.getCompetencia());
    const conversao = COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(chave);

    if (nulo(indiceAnterior)) {
      if (naoNulo(conversao)) {
        indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().div(conversao!));
      } else {
        indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice());
      }
    } else if (naoNulo(conversao)) {
      indiceDeCalculo.setValorAcumulado(
        indiceDeCalculo.getValorIndice().div(conversao!).times(indiceAnterior.getValorAcumulado()!)
      );
    } else {
      indiceDeCalculo.setValorAcumulado(
        indiceDeCalculo.getValorIndice().times(indiceAnterior.getValorAcumulado()!)
      );
    }
    indiceAnterior = indiceDeCalculo;
  }
  return novaLista;
}

/**
 * calcularIndiceAcumuladoComSomas (linha 181) — **CORE DA PARIDADE SELIC**
 *
 * Algoritmo SOMA SIMPLES (SELIC RFB, conforme Súmula 121 STF):
 *
 * Para SELIC, `valorIndice = 1 + taxa/100` (ex: 1.0112 para 1.12%).
 * A fórmula PJe-Calc (linha 200 do Java) é:
 *
 *   acumuladoSemConversao = acumuladoAnterior × fatorConversao
 *   acumulado_n = (valorIndice − 1) + acumuladoSemConversao
 *               = (taxa/100) + acumuladoAnterior
 *               ÷ fatorConversao (se mudança de moeda)
 *
 * Portanto acumulado final = 1 + Σ(taxa_i/100) — SOMA SIMPLES das taxas.
 * Comprovado com 17 PJC reais: PJe-Calc 2018-07→2026-03 = 80.37% (soma),
 * ratio composto = 91.92% (delta +11.55pp). Ref: Súmula 121 STF.
 *
 * Se `ignorarTaxaNegativa = true` e a taxa é negativa, valorIndice é clampado a 1
 * (sem contribuir para o acumulado).
 */
export function calcularIndiceAcumuladoComSomas(
  listaDeIndices: IndiceDeCalculo[],
  ignorarTaxaNegativa: boolean
): IndiceDeCalculo[] {
  listaDeIndices.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
  let indiceAnterior: IndiceDeCalculo | null = null;
  let fatorConversao = new Decimal(1);

  for (const indiceDeCalculo of listaDeIndices) {
    let valorIndice = indiceDeCalculo.getValorIndice();
    if (ignorarTaxaNegativa && indiceDeCalculo.getTaxa().isNegative()) {
      valorIndice = new Decimal(1);
    }

    const chave = chaveData(indiceDeCalculo.getCompetencia());
    const conversao = COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(chave);

    if (indiceAnterior === null) {
      if (naoNulo(conversao)) {
        fatorConversao = fatorConversao.times(conversao!);
      }
      indiceDeCalculo.setValorAcumulado(valorIndice.div(fatorConversao));
    } else {
      // acumuladoSemConversao = indiceAnterior.valorAcumulado × fatorConversao
      const acumuladoSemConversao = indiceAnterior.getValorAcumulado()!.times(fatorConversao);
      if (naoNulo(conversao)) {
        fatorConversao = fatorConversao.times(conversao!);
      }
      // acumulado = (valorIndice - 1 + acumuladoSemConversao) / fatorConversao
      indiceDeCalculo.setValorAcumulado(
        valorIndice.minus(1).plus(acumuladoSemConversao).div(fatorConversao)
      );
    }
    indiceAnterior = indiceDeCalculo;
  }
  return listaDeIndices;
}

/**
 * obterTabelaDeIndicesIgnorandoTaxasNegativas (linha 118)
 *
 * Para índices com taxas negativas (deflação — ex: IPCA-E ago/2017), aplica
 * `ignorarTaxaNegativa`: a taxa negativa não diminui o acumulado, é tratada
 * como 1 (sem contribuição). O baseline não cai.
 */
export function obterTabelaDeIndicesIgnorandoTaxasNegativas(
  listaDeIndices: IndiceDeCalculo[]
): IndiceDeCalculo[] {
  const listaModificada = [...listaDeIndices];
  listaModificada.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
  let indiceAnterior: IndiceDeCalculo | null = null;
  for (const indiceDeCalculo of listaModificada) {
    const chave = chaveData(indiceDeCalculo.getCompetencia());
    const conversao = COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(chave);
    const temConversao = naoNulo(conversao);
    const taxaNegativa = indiceDeCalculo.getTaxa().isNegative();

    if (indiceAnterior === null) {
      if (taxaNegativa) {
        if (temConversao) {
          indiceDeCalculo.setValorAcumulado(new Decimal(1).div(conversao!));
        } else {
          indiceDeCalculo.setValorAcumulado(new Decimal(1));
        }
      } else if (temConversao) {
        indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().div(conversao!));
      } else {
        indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice());
      }
    } else if (taxaNegativa) {
      if (temConversao) {
        indiceDeCalculo.setValorAcumulado(
          new Decimal(1).div(conversao!).times(indiceAnterior.getValorAcumulado()!)
        );
      } else {
        indiceDeCalculo.setValorAcumulado(indiceAnterior.getValorAcumulado()!);
      }
    } else if (temConversao) {
      indiceDeCalculo.setValorAcumulado(
        indiceDeCalculo.getValorIndice().div(conversao!).times(indiceAnterior.getValorAcumulado()!)
      );
    } else {
      indiceDeCalculo.setValorAcumulado(
        indiceDeCalculo.getValorIndice().times(indiceAnterior.getValorAcumulado()!)
      );
    }
    indiceAnterior = indiceDeCalculo;
  }
  return listaModificada;
}

/**
 * revisarConversaoInicial (linha 207)
 *
 * Quando a data de liquidação cai no mês de conversão de moeda mas ANTES do
 * dia da conversão, "desfaz" a conversão no índice inicial da tabela.
 * Edge case para casos pré-1995. Para casos modernos (sem conversão no período),
 * é no-op.
 */
export function revisarConversaoInicial(
  tabelaDeIndices: IndiceDeCalculo[] | null,
  dataLiquidacao: Date
): IndiceDeCalculo[] {
  if (nulo(tabelaDeIndices) || tabelaDeIndices!.length === 0) {
    return tabelaDeIndices ?? [];
  }
  // Simplificação: o mapa de conversões está vazio para casos modernos,
  // então não há alteração. Quando popular COMPETENCIAS_*, implementar
  // a lógica completa do original (linhas 216-227).
  return tabelaDeIndices!;
}

// Helper export (reuso em outros porters)
export function _chaveData(d: Date): string { return chaveData(d); }

// Re-export helpers de Utils usados pelo call-site Java (não removidos)
export { nulo, naoNulo, multiplicar, dividir, somar, subtrair };
