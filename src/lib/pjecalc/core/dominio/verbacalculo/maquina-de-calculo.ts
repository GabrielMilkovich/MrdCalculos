/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculo
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculo
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/verbacalculo/MaquinaDeCalculo.java
 *
 * Método principal: `calcularValorDevidoDaOcorrencia(ocorrencia)` (linhas 320-350).
 *
 * Fórmula PJe-Calc OFICIAL (confirmada pelo fonte v2.15.1):
 *   1. Todas operações intermediárias em MathContext(38)
 *   2. devido = base / divisor × multiplicador × quantidade
 *   3. Se dobra: devido = devido × 2
 *   4. devido = round(devido, 2, HALF_EVEN)
 *   → Arredondamento ÚNICO no final (não em etapas intermediárias!)
 *
 * Base é arredondada a 2 casas ANTES da fórmula (linha 415 do Java):
 *   ocorrencia.setBase(Utils.arredondarValorMonetario(valorDaBase))
 */
import Decimal from 'decimal.js';
import { naoNulo, nulo, arredondarValorMonetario } from '../../base/comum/utils';
import { OcorrenciaDeVerba } from '../ocorrenciaverba/ocorrencia-de-verba';
import { ValorDaVerbaEnum } from '../../constantes/enums';

/** Constante de dobra (fator 2x para verbas com dobra ativa — Art. 467 CLT) */
const VALOR_PARA_APLICAR_DOBRA = new Decimal(2);

/**
 * calcularValorDevidoDaOcorrencia (linhas 320-350 do Java)
 *
 * Calcula `devido` a partir de base/divisor/mult/qty/dobra.
 * NOTA IMPORTANTE: as operações intermediárias NÃO arredondam.
 * O arredondamento HALF_EVEN a 2 casas acontece APENAS uma vez no final.
 * Isso reproduz exatamente o comportamento do PJe-Calc.
 */
export function calcularValorDevidoDaOcorrencia(ocorrencia: OcorrenciaDeVerba): void {
  if (ocorrencia.getValor() !== ValorDaVerbaEnum.CALCULADO) return;

  const base = ocorrencia.getBase();
  const divisor = ocorrencia.getDivisor();
  const multiplicador = ocorrencia.getMultiplicador();
  const quantidade = ocorrencia.getQuantidade();

  if (naoNulo(base) && naoNulo(divisor) && naoNulo(multiplicador) && naoNulo(quantidade)) {
    // Fórmula: base / divisor × multiplicador × quantidade — sem round intermediário
    let devido = base!
      .div(divisor!)
      .times(multiplicador!)
      .times(quantidade!);

    // Dobra (Art. 467 CLT — pagamento em dobro)
    if (ocorrencia.getDobra()) {
      devido = devido.times(VALOR_PARA_APLICAR_DOBRA);
    }

    // Arredondamento ÚNICO final — HALF_EVEN a 2 casas
    ocorrencia.setDevido(arredondarValorMonetario(devido));

    // Cálculo integral (devidoIntegral — mesmo algoritmo mas com base/qtd integral se disponíveis)
    let baseParaIntegral: Decimal | null = null;
    let quantidadeParaIntegral: Decimal | null = null;

    const baseIntegral = ocorrencia.getBaseIntegral();
    if (naoNulo(baseIntegral) && !baseIntegral!.equals(base!)) {
      baseParaIntegral = baseIntegral;
      quantidadeParaIntegral = quantidade;
    } else {
      baseParaIntegral = base;
      const qtdIntegral = ocorrencia.getQuantidadeIntegral();
      quantidadeParaIntegral = naoNulo(qtdIntegral) && !qtdIntegral!.equals(quantidade!)
        ? qtdIntegral
        : quantidade;
    }

    if (naoNulo(baseParaIntegral) && naoNulo(quantidadeParaIntegral)) {
      let devidoIntegral = baseParaIntegral!
        .div(divisor!)
        .times(multiplicador!)
        .times(quantidadeParaIntegral!);

      if (ocorrencia.getDobra()) {
        devidoIntegral = devidoIntegral.times(VALOR_PARA_APLICAR_DOBRA);
      }

      ocorrencia.setDevidoIntegral(arredondarValorMonetario(devidoIntegral));
    }
  } else {
    ocorrencia.setDevido(null as unknown as Decimal);
    ocorrencia.setDevidoIntegral(null);
  }
}
