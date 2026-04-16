/**
 * PJe-Calc v2.15.1 — FaixaPrevidenciaria
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.inss.faixas.FaixaPrevidenciaria
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/inss/faixas/FaixaPrevidenciaria.java
 *
 * Representa uma faixa do INSS progressivo:
 *   { valorInicial, valorFinal, aliquota }
 *
 * O cálculo `calcularValorNaFaixa(base)` retorna a contribuição DENTRO desta faixa:
 *   - Se base < valorInicial: 0
 *   - Senão: (base - valorInicial + 0.01) × (aliquota/100)
 *
 * Esse algoritmo permite somar contribuições de várias faixas para obter o INSS
 * total progressivo (usado desde EC 103/2019, mar/2020).
 */
import Decimal from 'decimal.js';
import { naoNulo, naoNulos, nulo, multiplicar, dividir, subtrair, CEM } from '../../../base/comum/utils';

const UM_CENTAVO = new Decimal('0.01');

export abstract class FaixaPrevidenciaria {
  protected valorInicial: Decimal | null;
  protected valorFinal: Decimal | null;
  protected aliquota: Decimal | null;

  constructor(valorInicial?: Decimal, valorFinal?: Decimal | null, aliquota?: Decimal) {
    this.valorInicial = valorInicial ?? null;
    this.valorFinal = valorFinal ?? null;
    this.aliquota = aliquota ?? null;
  }

  abstract getDiscriminador(): string;

  isValorFinalMenorOuIgualQueValorInicial(): boolean {
    if (!this.valorFinal || !this.valorInicial) return false;
    return this.valorFinal.comparedTo(this.valorInicial) <= 0;
  }

  /** adicionarNovoValorInicial (linha 62) — valorInicial = faixaAnterior.valorFinal + 0.01 */
  adicionarNovoValorInicial(faixa: FaixaPrevidenciaria | null): void {
    if (naoNulo(faixa) && faixa!.getValorFinal()) {
      this.valorInicial = faixa!.getValorFinal()!.plus(UM_CENTAVO);
    }
  }

  /** getValorMaximoDaFaixa (linha 68) */
  getValorMaximoDaFaixa(): Decimal | null {
    if (nulo(this.valorFinal)) return null;
    return multiplicar(
      subtrair(this.valorFinal, subtrair(this.valorInicial, UM_CENTAVO)),
      dividir(this.aliquota, CEM)
    );
  }

  /**
   * calcularValorNaFaixa (linha 75) — retorna a contribuição DENTRO desta faixa:
   *   - 0 se valorBase < valorInicial
   *   - (valorBase - valorInicial + 0.01) × (aliquota/100) caso contrário
   *
   * NOTA: para INSS progressivo, o caller deve limitar valorBase ao valorFinal
   * da faixa antes de chamar (ou usar min(valorBase, valorFinal)).
   */
  calcularValorNaFaixa(valorBase: Decimal | null): Decimal | null {
    if (nulo(valorBase)) return null;
    if (valorBase!.comparedTo(this.valorInicial!) < 0) return new Decimal(0);
    const valorBaseNaFaixa = subtrair(valorBase, subtrair(this.valorInicial, UM_CENTAVO))!;
    return multiplicar(valorBaseNaFaixa, dividir(this.aliquota, CEM));
  }

  sugerirValorMaximoParaValorFinal(): void { this.valorFinal = null; }

  getValorInicial(): Decimal | null { return this.valorInicial; }
  setValorInicial(v: Decimal): void { this.valorInicial = v; }
  getValorFinal(): Decimal | null { return this.valorFinal; }
  setValorFinal(v: Decimal | null): void { this.valorFinal = v; }
  getAliquota(): Decimal | null { return this.aliquota; }
  setAliquota(v: Decimal): void { this.aliquota = v; }
}

// Implementações concretas (1ª, 2ª, 3ª, 4ª, 5ª faixas)
// Cada uma só difere pelo discriminador (usado em mensagens de validação).

export class PrimeiraFaixaPrevidenciaria extends FaixaPrevidenciaria {
  getDiscriminador(): string { return '1'; }
}
export class SegundaFaixaPrevidenciaria extends FaixaPrevidenciaria {
  getDiscriminador(): string { return '2'; }
}
export class TerceiraFaixaPrevidenciaria extends FaixaPrevidenciaria {
  getDiscriminador(): string { return '3'; }
}
export class QuartaFaixaPrevidenciaria extends FaixaPrevidenciaria {
  getDiscriminador(): string { return '4'; }
}
export class QuintaFaixaPrevidenciaria extends FaixaPrevidenciaria {
  getDiscriminador(): string { return '5'; }
}

/**
 * Utilitário — calcula INSS progressivo total somando a contribuição de cada faixa.
 * Implementa o algoritmo:
 *   INSS = Σ faixa.calcularValorNaFaixa( min(base, faixa.valorFinal) )
 *
 * @param valorBase salário do mês
 * @param faixas    lista ordenada de faixas (valorInicial crescente)
 * @returns INSS total (não arredondado — caller aplica arredondamento HALF_EVEN)
 */
export function calcularInssProgressivo(
  valorBase: Decimal,
  faixas: FaixaPrevidenciaria[]
): Decimal {
  let total = new Decimal(0);
  for (const faixa of faixas) {
    const valorFinal = faixa.getValorFinal();
    const baseCapped = valorFinal !== null && valorBase.comparedTo(valorFinal) > 0 ? valorFinal : valorBase;
    const contribuicaoNaFaixa = faixa.calcularValorNaFaixa(baseCapped);
    if (contribuicaoNaFaixa !== null) {
      total = total.plus(contribuicaoNaFaixa);
    }
    // Se base menor que valorFinal, as próximas faixas não contribuem
    if (valorFinal !== null && valorBase.comparedTo(valorFinal) <= 0) break;
  }
  return total;
}
