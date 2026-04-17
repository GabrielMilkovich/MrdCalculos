/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisCustas
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustas
 *
 * Ref Java: ~139 linhas. Entity JPA — aqui portada como data-holder.
 */
import Decimal from 'decimal.js';
import { TipoValorEnum } from '../../constantes/enums';

export class ParcelasAtualizaveisCustas {
  private id: number | null = null;
  private tipoValor: TipoValorEnum = TipoValorEnum.INFORMADO;
  private valorParcelaInformado: Decimal | null = null;
  private valorJurosInformado: Decimal | null = null;
  private readonly taxaCalculado: Decimal;

  constructor(taxaCalculado: Decimal = new Decimal(0)) {
    this.taxaCalculado = taxaCalculado;
  }

  getTipoValor(): TipoValorEnum { return this.tipoValor; }
  setTipoValor(v: TipoValorEnum): void { this.tipoValor = v; }

  getValorParcelaInformado(): Decimal | null { return this.valorParcelaInformado; }
  setValorParcelaInformado(v: Decimal | null): void { this.valorParcelaInformado = v; }

  getValorJurosInformado(): Decimal | null { return this.valorJurosInformado; }
  setValorJurosInformado(v: Decimal | null): void { this.valorJurosInformado = v; }

  getTaxaCalculado(): Decimal { return this.taxaCalculado; }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }

  obterChavePrimaria(): number | null { return this.id; }
}
