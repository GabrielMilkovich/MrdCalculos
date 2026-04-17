/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisDebitosReclamante
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante
 *
 * Ref Java: ~226 linhas.
 */
import Decimal from 'decimal.js';
import type { Calculo } from '../calculo/calculo';
import { ParcelasAtualizaveisCustas } from './parcelas-atualizaveis-custas';
import { ParcelasAtualizaveisHonorario } from './parcelas-atualizaveis-honorario';
import { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';

const VALOR_DOIS = new Decimal(2);

export class ParcelasAtualizaveisDebitosReclamante {
  private id: number | null = null;
  private calculoExterno: Calculo | null = null;
  private marcarMultaIndenizDevReclamante: boolean = false;
  private multaIndenizDevReclamante: ParcelasAtualizaveisMultaIndenizacao = new ParcelasAtualizaveisMultaIndenizacao();
  private listaMultasIndenizDevReclamante: ParcelasAtualizaveisMultaIndenizacao[] = [];
  private marcarHonorariosDevReclamante: boolean = false;
  private honorariosDevReclamante: ParcelasAtualizaveisHonorario = new ParcelasAtualizaveisHonorario();
  private listaHonorariosDevReclamante: ParcelasAtualizaveisHonorario[] = [];
  private marcarCustasConhecimentoDevReclamante: boolean = false;
  private custasConhecimentoDevReclamante: ParcelasAtualizaveisCustas | null = new ParcelasAtualizaveisCustas(VALOR_DOIS);

  constructor(calculoExterno?: Calculo) {
    if (calculoExterno) this.calculoExterno = calculoExterno;
  }

  obterChavePrimaria(): number | null { return this.id; }

  getListaMultasIndenizDevReclamanteClone(): ParcelasAtualizaveisMultaIndenizacao[] {
    return this.listaMultasIndenizDevReclamante.map(m => m.clonar());
  }

  getListaHonorariosDevReclamanteClone(): ParcelasAtualizaveisHonorario[] {
    return this.listaHonorariosDevReclamante.map(h => h.clonar());
  }

  getMarcarMultaIndenizDevReclamante(): boolean { return this.marcarMultaIndenizDevReclamante; }
  setMarcarMultaIndenizDevReclamante(v: boolean): void { this.marcarMultaIndenizDevReclamante = v; }

  getMultaIndenizDevReclamante(): ParcelasAtualizaveisMultaIndenizacao { return this.multaIndenizDevReclamante; }
  setMultaIndenizDevReclamante(v: ParcelasAtualizaveisMultaIndenizacao): void { this.multaIndenizDevReclamante = v; }

  getListaMultasIndenizDevReclamante(): ParcelasAtualizaveisMultaIndenizacao[] { return this.listaMultasIndenizDevReclamante; }
  setListaMultasIndenizDevReclamante(v: ParcelasAtualizaveisMultaIndenizacao[]): void { this.listaMultasIndenizDevReclamante = v; }

  getMarcarHonorariosDevReclamante(): boolean { return this.marcarHonorariosDevReclamante; }
  setMarcarHonorariosDevReclamante(v: boolean): void { this.marcarHonorariosDevReclamante = v; }

  getHonorariosDevReclamante(): ParcelasAtualizaveisHonorario { return this.honorariosDevReclamante; }
  setHonorariosDevReclamante(v: ParcelasAtualizaveisHonorario): void { this.honorariosDevReclamante = v; }

  getMarcarCustasConhecimentoDevReclamante(): boolean { return this.marcarCustasConhecimentoDevReclamante; }
  setMarcarCustasConhecimentoDevReclamante(v: boolean): void { this.marcarCustasConhecimentoDevReclamante = v; }

  getListaHonorariosDevReclamante(): ParcelasAtualizaveisHonorario[] { return this.listaHonorariosDevReclamante; }
  setListaHonorariosDevReclamante(v: ParcelasAtualizaveisHonorario[]): void { this.listaHonorariosDevReclamante = v; }

  getCustasConhecimentoDevReclamante(): ParcelasAtualizaveisCustas | null { return this.custasConhecimentoDevReclamante; }
  setCustasConhecimentoDevReclamante(v: ParcelasAtualizaveisCustas | null): void { this.custasConhecimentoDevReclamante = v; }

  getCalculoExterno(): Calculo | null { return this.calculoExterno; }
  setCalculoExterno(v: Calculo | null): void { this.calculoExterno = v; }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }
}
