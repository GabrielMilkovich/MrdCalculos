/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisCreditosReclamante
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamante
 *
 * Ref Java: ~334 linhas. Entity JPA — aqui portada como data-holder.
 */
import Decimal from 'decimal.js';
import type { Calculo } from '../calculo/calculo';
import { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';

export class ParcelasAtualizaveisCreditosReclamante {
  private id: number | null = null;
  private calculoExterno: Calculo | null = null;
  private marcarVerbasTributavel: boolean = false;
  private valorParcelaVerbasTributavel: Decimal | null = null;
  private valorJurosVerbasTributavel: Decimal | null = null;
  private marcarVerbasNaoTributavel: boolean = false;
  private valorParcelaVerbasNaoTributavel: Decimal | null = null;
  private valorJurosVerbasNaoTributavel: Decimal | null = null;
  private marcarFgts: boolean = false;
  private valorParcelaFgts: Decimal | null = null;
  private valorJurosFgts: Decimal | null = null;
  private marcarMultaFgts: boolean = false;
  private valorParcelaMultaFgts: Decimal | null = null;
  private valorJurosMultaFgts: Decimal | null = null;
  private marcarMultaIndenizDevReclamante: boolean = false;
  private multaIndenizDevReclamante: ParcelasAtualizaveisMultaIndenizacao = new ParcelasAtualizaveisMultaIndenizacao();
  private listaMultasIndenizDevReclamante: ParcelasAtualizaveisMultaIndenizacao[] = [];
  private marcarMultaIndenizDevReclamado: boolean = false;
  private multaIndenizDevReclamado: ParcelasAtualizaveisMultaIndenizacao = new ParcelasAtualizaveisMultaIndenizacao();
  private listaMultasIndenizDevReclamado: ParcelasAtualizaveisMultaIndenizacao[] = [];

  constructor(calculoExterno?: Calculo) {
    if (calculoExterno) this.calculoExterno = calculoExterno;
  }

  obterChavePrimaria(): number | null { return this.id; }

  getListaMultasIndenizDevReclamanteClone(): ParcelasAtualizaveisMultaIndenizacao[] {
    return this.listaMultasIndenizDevReclamante.map(m => m.clonar());
  }

  getListaMultasIndenizDevReclamadoClone(): ParcelasAtualizaveisMultaIndenizacao[] {
    return this.listaMultasIndenizDevReclamado.map(m => m.clonar());
  }

  getMarcarVerbasTributavel(): boolean { return this.marcarVerbasTributavel; }
  setMarcarVerbasTributavel(v: boolean): void { this.marcarVerbasTributavel = v; }

  getValorParcelaVerbasTributavel(): Decimal | null { return this.valorParcelaVerbasTributavel; }
  setValorParcelaVerbasTributavel(v: Decimal | null): void { this.valorParcelaVerbasTributavel = v; }

  getValorJurosVerbasTributavel(): Decimal | null { return this.valorJurosVerbasTributavel; }
  setValorJurosVerbasTributavel(v: Decimal | null): void { this.valorJurosVerbasTributavel = v; }

  getMarcarVerbasNaoTributavel(): boolean { return this.marcarVerbasNaoTributavel; }
  setMarcarVerbasNaoTributavel(v: boolean): void { this.marcarVerbasNaoTributavel = v; }

  getValorParcelaVerbasNaoTributavel(): Decimal | null { return this.valorParcelaVerbasNaoTributavel; }
  setValorParcelaVerbasNaoTributavel(v: Decimal | null): void { this.valorParcelaVerbasNaoTributavel = v; }

  getValorJurosVerbasNaoTributavel(): Decimal | null { return this.valorJurosVerbasNaoTributavel; }
  setValorJurosVerbasNaoTributavel(v: Decimal | null): void { this.valorJurosVerbasNaoTributavel = v; }

  getMarcarFgts(): boolean { return this.marcarFgts; }
  setMarcarFgts(v: boolean): void { this.marcarFgts = v; }

  getValorParcelaFgts(): Decimal | null { return this.valorParcelaFgts; }
  setValorParcelaFgts(v: Decimal | null): void { this.valorParcelaFgts = v; }

  getValorJurosFgts(): Decimal | null { return this.valorJurosFgts; }
  setValorJurosFgts(v: Decimal | null): void { this.valorJurosFgts = v; }

  getMarcarMultaFgts(): boolean { return this.marcarMultaFgts; }
  setMarcarMultaFgts(v: boolean): void { this.marcarMultaFgts = v; }

  getValorParcelaMultaFgts(): Decimal | null { return this.valorParcelaMultaFgts; }
  setValorParcelaMultaFgts(v: Decimal | null): void { this.valorParcelaMultaFgts = v; }

  getValorJurosMultaFgts(): Decimal | null { return this.valorJurosMultaFgts; }
  setValorJurosMultaFgts(v: Decimal | null): void { this.valorJurosMultaFgts = v; }

  getMarcarMultaIndenizDevReclamado(): boolean { return this.marcarMultaIndenizDevReclamado; }
  setMarcarMultaIndenizDevReclamado(v: boolean): void { this.marcarMultaIndenizDevReclamado = v; }

  getMarcarMultaIndenizDevReclamante(): boolean { return this.marcarMultaIndenizDevReclamante; }
  setMarcarMultaIndenizDevReclamante(v: boolean): void { this.marcarMultaIndenizDevReclamante = v; }

  getListaMultasIndenizDevReclamante(): ParcelasAtualizaveisMultaIndenizacao[] { return this.listaMultasIndenizDevReclamante; }
  setListaMultasIndenizDevReclamante(v: ParcelasAtualizaveisMultaIndenizacao[]): void { this.listaMultasIndenizDevReclamante = v; }

  getMultaIndenizDevReclamado(): ParcelasAtualizaveisMultaIndenizacao { return this.multaIndenizDevReclamado; }
  setMultaIndenizDevReclamado(v: ParcelasAtualizaveisMultaIndenizacao): void { this.multaIndenizDevReclamado = v; }

  getListaMultasIndenizDevReclamado(): ParcelasAtualizaveisMultaIndenizacao[] { return this.listaMultasIndenizDevReclamado; }
  setListaMultasIndenizDevReclamado(v: ParcelasAtualizaveisMultaIndenizacao[]): void { this.listaMultasIndenizDevReclamado = v; }

  getMultaIndenizDevReclamante(): ParcelasAtualizaveisMultaIndenizacao { return this.multaIndenizDevReclamante; }
  setMultaIndenizDevReclamante(v: ParcelasAtualizaveisMultaIndenizacao): void { this.multaIndenizDevReclamante = v; }

  getCalculoExterno(): Calculo | null { return this.calculoExterno; }
  setCalculoExterno(v: Calculo | null): void { this.calculoExterno = v; }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }
}
