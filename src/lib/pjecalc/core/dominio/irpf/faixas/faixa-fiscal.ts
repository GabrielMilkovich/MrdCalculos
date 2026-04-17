/**
 * PJe-Calc v2.15.1 — FaixaFiscal (abstract) + 5 subclasses concretas
 * Porte 1:1 de:
 *   br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.FaixaFiscal
 *   + PrimeiraFaixaFiscal / SegundaFaixaFiscal / TerceiraFaixaFiscal /
 *     QuartaFaixaFiscal / QuintaFaixaFiscal
 *
 * Ref Java: pjecalc-fonte/.../irpf/faixas/ (6 arquivos, ~250 LOC total)
 *
 * FaixaFiscal é a base de uma faixa de tabela progressiva de IR:
 *   [valorInicial, valorFinal] — faixa de base tributável
 *   aliquota     — percentual (ex: 7.5 para 7,5%)
 *   deducao      — parcela a deduzir
 */
import Decimal from 'decimal.js';

export abstract class FaixaFiscal {
  private valorInicial: Decimal | null = null;
  private valorFinal: Decimal | null = null;
  private aliquota: Decimal | null = null;
  private deducao: Decimal | null = null;

  constructor(
    valorInicial?: Decimal | null,
    valorFinal?: Decimal | null,
    aliquota?: Decimal | null,
    deducao?: Decimal | null,
  ) {
    if (valorInicial !== undefined) this.valorInicial = valorInicial ?? null;
    if (valorFinal !== undefined) this.valorFinal = valorFinal ?? null;
    if (aliquota !== undefined) this.aliquota = aliquota ?? null;
    if (deducao !== undefined) this.deducao = deducao ?? null;
  }

  abstract getDiscriminador(): string;

  getValorInicial(): Decimal | null { return this.valorInicial; }
  setValorInicial(v: Decimal | null): void { this.valorInicial = v; }

  getValorFinal(): Decimal | null { return this.valorFinal; }
  setValorFinal(v: Decimal | null): void { this.valorFinal = v; }

  getAliquota(): Decimal { return this.aliquota ?? new Decimal(0); }
  setAliquota(v: Decimal | null): void { this.aliquota = v; }

  getDeducao(): Decimal | null { return this.deducao; }
  setDeducao(v: Decimal | null): void { this.deducao = v; }

  isValorFinalMenorOuIgualQueValorInicial(): boolean {
    if (!this.valorFinal || !this.valorInicial) return false;
    return this.valorFinal.lessThanOrEqualTo(this.valorInicial);
  }

  adicionarNovoValorInicial(faixa: FaixaFiscal | null): void {
    if (faixa && faixa.getValorFinal()) {
      this.valorInicial = faixa.getValorFinal()!.plus('0.01');
    }
  }
}

export class PrimeiraFaixaFiscal extends FaixaFiscal {
  getDiscriminador(): string { return '1'; }
}

export class SegundaFaixaFiscal extends FaixaFiscal {
  getDiscriminador(): string { return '2'; }
}

export class TerceiraFaixaFiscal extends FaixaFiscal {
  getDiscriminador(): string { return '3'; }
}

export class QuartaFaixaFiscal extends FaixaFiscal {
  getDiscriminador(): string { return '4'; }
}

export class QuintaFaixaFiscal extends FaixaFiscal {
  getDiscriminador(): string { return '5'; }
}
