/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisMultaIndenizacao
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao
 *
 * Ref Java: ~361 linhas. Entity JPA — aqui portada como data-holder.
 */
import Decimal from 'decimal.js';
import {
  CredorDevedorMultaEnum,
  IndiceMonetarioEnum,
  TipoCobrancaReclamanteEnum,
  TipoValorEnum,
} from '../../constantes/enums';
import type { ParcelasAtualizaveisCreditosReclamante } from './parcelas-atualizaveis-creditos-reclamante';
import type { ParcelasAtualizaveisDebitosReclamante } from './parcelas-atualizaveis-debitos-reclamante';
import type { ParcelasAtualizaveisDescontoCreditosReclamante } from './parcelas-atualizaveis-desconto-creditos-reclamante';
import type { ParcelasAtualizaveisOutrosDebitosReclamado } from './parcelas-atualizaveis-outros-debitos-reclamado';

/** Multa é uma entidade do pacote calculo/multa (não portada ainda). */
export type MultaRef = unknown;

export class ParcelasAtualizaveisMultaIndenizacao {
  private id: number | null = null;
  private creditosReclamante: ParcelasAtualizaveisCreditosReclamante | null = null;
  private descontoCreditosReclamante: ParcelasAtualizaveisDescontoCreditosReclamante | null = null;
  private outrosDebitosReclamado: ParcelasAtualizaveisOutrosDebitosReclamado | null = null;
  private debitosReclamante: ParcelasAtualizaveisDebitosReclamante | null = null;
  private multa: MultaRef | null = null;
  private credor: string | null = null;
  private descricao: string | null = null;
  private tipoCredorDevedor: CredorDevedorMultaEnum = CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO;
  private tipoValor: TipoValorEnum = TipoValorEnum.INFORMADO;
  private valorParcelaInformado: Decimal | null = null;
  private valorJurosInformado: Decimal | null = null;
  private indiceTrabalhistaInformado: IndiceMonetarioEnum | null = IndiceMonetarioEnum.INDICE_TRABALHISTA;
  private aplicarJurosInformado: boolean = false;
  private dataApartirDeAplicarJurosInformado: Date | null = null;
  private aplicarDescontoContribSocialCalculado: boolean = false;
  private aplicarDescontoPrevPrivadaCalculado: boolean = false;
  private taxaCalculado: Decimal | null = null;
  private tipoCobrancaReclamante: TipoCobrancaReclamanteEnum = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;

  clonar(): ParcelasAtualizaveisMultaIndenizacao {
    const clone = new ParcelasAtualizaveisMultaIndenizacao();
    clone.aplicarJurosInformado = this.aplicarJurosInformado;
    clone.dataApartirDeAplicarJurosInformado = this.dataApartirDeAplicarJurosInformado;
    clone.creditosReclamante = this.creditosReclamante;
    clone.credor = this.credor;
    clone.debitosReclamante = this.debitosReclamante;
    clone.aplicarDescontoContribSocialCalculado = this.aplicarDescontoContribSocialCalculado;
    clone.descontoCreditosReclamante = this.descontoCreditosReclamante;
    clone.aplicarDescontoPrevPrivadaCalculado = this.aplicarDescontoPrevPrivadaCalculado;
    clone.descricao = this.descricao;
    clone.indiceTrabalhistaInformado = this.indiceTrabalhistaInformado;
    clone.outrosDebitosReclamado = this.outrosDebitosReclamado;
    clone.taxaCalculado = this.taxaCalculado;
    clone.tipoCredorDevedor = this.tipoCredorDevedor;
    clone.tipoValor = this.tipoValor;
    clone.valorJurosInformado = this.valorJurosInformado;
    clone.valorParcelaInformado = this.valorParcelaInformado;
    clone.tipoCobrancaReclamante = this.tipoCobrancaReclamante;
    clone.multa = this.multa;
    return clone;
  }

  obterChavePrimaria(): number | null { return this.id; }

  /** Base de cálculo informada: principal + juros (quando TipoValor.INFORMADO). */
  getValorBaseCalculo(): Decimal {
    let base = new Decimal(0);
    if (this.tipoValor === TipoValorEnum.INFORMADO) {
      base = base.plus(this.valorParcelaInformado ?? new Decimal(0))
                 .plus(this.valorJurosInformado ?? new Decimal(0));
    }
    return base;
  }

  getBaseDeCalculoDescricao(): string {
    const parts: string[] = [];
    if (this.tipoValor === TipoValorEnum.CALCULADO) {
      parts.push('(+) Principal');
      if (this.aplicarDescontoContribSocialCalculado) parts.push(' (-) Desc. Contrib. Social');
      if (this.aplicarDescontoPrevPrivadaCalculado) parts.push(' (-) Desc. Prev. Privada');
    }
    return parts.join('');
  }

  getCredor(): string | null { return this.credor; }
  setCredor(v: string | null): void { this.credor = v; }

  getDescricao(): string | null { return this.descricao; }
  setDescricao(v: string | null): void { this.descricao = v; }

  getValorParcelaInformado(): Decimal | null { return this.valorParcelaInformado; }
  setValorParcelaInformado(v: Decimal | null): void { this.valorParcelaInformado = v; }

  getValorJurosInformado(): Decimal | null { return this.valorJurosInformado; }
  setValorJurosInformado(v: Decimal | null): void { this.valorJurosInformado = v; }

  getIndiceTrabalhistaInformado(): IndiceMonetarioEnum | null { return this.indiceTrabalhistaInformado; }
  setIndiceTrabalhistaInformado(v: IndiceMonetarioEnum | null): void { this.indiceTrabalhistaInformado = v; }

  getAplicarJurosInformado(): boolean { return this.aplicarJurosInformado; }
  setAplicarJurosInformado(v: boolean): void { this.aplicarJurosInformado = v; }

  getDataApartirDeAplicarJurosInformado(): Date | null { return this.dataApartirDeAplicarJurosInformado; }
  setDataApartirDeAplicarJurosInformado(v: Date | null): void { this.dataApartirDeAplicarJurosInformado = v; }

  getTaxaCalculado(): Decimal | null { return this.taxaCalculado; }
  setTaxaCalculado(v: Decimal | null): void { this.taxaCalculado = v; }

  getTipoValor(): TipoValorEnum { return this.tipoValor; }
  setTipoValor(v: TipoValorEnum): void { this.tipoValor = v; }

  getTipoCredorDevedor(): CredorDevedorMultaEnum { return this.tipoCredorDevedor; }
  setTipoCredorDevedor(v: CredorDevedorMultaEnum): void { this.tipoCredorDevedor = v; }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }

  getDescontoCreditosReclamante(): ParcelasAtualizaveisDescontoCreditosReclamante | null { return this.descontoCreditosReclamante; }
  setDescontoCreditosReclamante(v: ParcelasAtualizaveisDescontoCreditosReclamante | null): void { this.descontoCreditosReclamante = v; }

  getOutrosDebitosReclamado(): ParcelasAtualizaveisOutrosDebitosReclamado | null { return this.outrosDebitosReclamado; }
  setOutrosDebitosReclamado(v: ParcelasAtualizaveisOutrosDebitosReclamado | null): void { this.outrosDebitosReclamado = v; }

  getDebitosReclamante(): ParcelasAtualizaveisDebitosReclamante | null { return this.debitosReclamante; }
  setDebitosReclamante(v: ParcelasAtualizaveisDebitosReclamante | null): void { this.debitosReclamante = v; }

  getCreditosReclamante(): ParcelasAtualizaveisCreditosReclamante | null { return this.creditosReclamante; }
  setCreditosReclamante(v: ParcelasAtualizaveisCreditosReclamante | null): void { this.creditosReclamante = v; }

  getMulta(): MultaRef | null { return this.multa; }
  setMulta(v: MultaRef | null): void { this.multa = v; }

  getTipoCobrancaReclamante(): TipoCobrancaReclamanteEnum { return this.tipoCobrancaReclamante; }
  setTipoCobrancaReclamante(v: TipoCobrancaReclamanteEnum): void { this.tipoCobrancaReclamante = v; }

  getAplicarDescontoContribSocialCalculado(): boolean { return this.aplicarDescontoContribSocialCalculado; }
  setAplicarDescontoContribSocialCalculado(v: boolean): void { this.aplicarDescontoContribSocialCalculado = v; }

  getAplicarDescontoPrevPrivadaCalculado(): boolean { return this.aplicarDescontoPrevPrivadaCalculado; }
  setAplicarDescontoPrevPrivadaCalculado(v: boolean): void { this.aplicarDescontoPrevPrivadaCalculado = v; }
}
