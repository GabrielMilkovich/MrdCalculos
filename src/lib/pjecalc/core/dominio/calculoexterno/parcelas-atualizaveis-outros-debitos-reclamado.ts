/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisOutrosDebitosReclamado
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado
 *
 * Ref Java: ~693 linhas. Entity JPA portada como data-holder.
 *
 * Contém estrutura de outros débitos do reclamado: contribuições sociais
 * (segurado, patronal, pagos) antes/após Fev/2009, multas previdenciárias,
 * CS 10/05%, honorários/custas conhecimento/liquidação/execução.
 */
import Decimal from 'decimal.js';
import { IndiceMonetarioEnum } from '../../constantes/enums';
import type { Calculo } from '../calculo/calculo';
import { ParcelasAtualizaveisCustas } from './parcelas-atualizaveis-custas';
import { ParcelasAtualizaveisHonorario } from './parcelas-atualizaveis-honorario';
import { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';

const VALOR_DOIS = new Decimal(2);
const CINQUENTA_POR_CENTO = new Decimal(50);

export class ParcelasAtualizaveisOutrosDebitosReclamado {
  private id: number | null = null;
  private calculoExterno: Calculo | null = null;

  // Contribuição social — segurado
  private marcarContribSocialSegurado: boolean = false;
  private valorParcelasAteFev2009ContribSocialSegurado: Decimal | null = null;
  private valorJurosAteFev2009ContribSocialSegurado: Decimal | null = null;
  private valorParcelasAposFev2009ContribSocialSegurado: Decimal | null = null;
  private valorJurosAposFev2009ContribSocialSegurado: Decimal | null = null;
  private valorParcelaContribSocialSegurado: Decimal | null = null;
  private valorJurosContribSocialSegurado: Decimal | null = null;

  // Contribuição social — patronal
  private marcarContribSocialPatronal: boolean = false;
  private valorParcelasAteFev2009ContribSocialPatronal: Decimal | null = null;
  private valorJurosAteFev2009ContribSocialPatronal: Decimal | null = null;
  private valorParcelasAposFev2009ContribSocialPatronal: Decimal | null = null;
  private valorJurosAposFev2009ContribSocialPatronal: Decimal | null = null;
  private valorParcelaContribSocialPatronal: Decimal | null = null;
  private valorJurosContribSocialPatronal: Decimal | null = null;

  // Multa contribuição social — devidos
  private marcarMultaContribSocialDevidos: boolean = false;
  private dataInicialAteFev2009MultaContribSocialDevidos: Date | null = null;
  private dataInicialAposFev2009MultaContribSocialDevidos: Date | null = null;
  private dataInicialBaseMultaContribSocialDevidos: Date | null = null;

  // Contribuição social — pagos
  private marcarContribSocialPagos: boolean = false;
  private valorParcelasAteFev2009ContribSocialPagos: Decimal | null = null;
  private valorJurosAteFev2009ContribSocialPagos: Decimal | null = null;
  private valorParcelasAposFev2009ContribSocialPagos: Decimal | null = null;
  private valorJurosAposFev2009ContribSocialPagos: Decimal | null = null;
  private valorParcelaContribSocialPagos: Decimal | null = null;
  private valorJurosContribSocialPagos: Decimal | null = null;

  // Multa contribuição social — pagos
  private marcarMultaContribSocialPagos: boolean = false;
  private dataInicialAteFev2009MultaContribSocialPagos: Date | null = null;
  private dataInicialAposFev2009MultaContribSocialPagos: Date | null = null;
  private dataInicialBaseMultaContribSocialPagos: Date | null = null;

  // Juros previdência privada
  private marcarJurosPrevidenciaPrivada: boolean = false;
  private valorJurosPrevidenciaPrivada: Decimal | null = null;
  private indiceTrabalhistaInformadoPrevidenciaPrivada: IndiceMonetarioEnum = IndiceMonetarioEnum.INDICE_TRABALHISTA;
  private aplicarJurosPrevidenciaPrivada: boolean | null = null;

  // Multas indenização terceiro reclamado
  private marcarMultaIndenizTerceiroReclamado: boolean = false;
  private multaIndenizTerceiroReclamado: ParcelasAtualizaveisMultaIndenizacao = new ParcelasAtualizaveisMultaIndenizacao();
  private listaMultasIndenizTerceiroReclamado: ParcelasAtualizaveisMultaIndenizacao[] = [];

  // Honorários reclamado
  private marcarHonorariosDevReclamado: boolean = false;
  private honorariosDevReclamado: ParcelasAtualizaveisHonorario = new ParcelasAtualizaveisHonorario();
  private listaHonorariosDevReclamado: ParcelasAtualizaveisHonorario[] = [];

  // Contribuição social 10% / 05%
  private marcarContribSocial10: boolean = false;
  private valorParcelaContribSocial10: Decimal | null = null;
  private indiceTrabalhistaContribSocial10: IndiceMonetarioEnum = IndiceMonetarioEnum.IPCAE;
  private marcarContribSocial05: boolean = false;
  private valorParcelaContribSocial05: Decimal | null = null;
  private indiceTrabalhistaContribSocial05: IndiceMonetarioEnum = IndiceMonetarioEnum.IPCAE;

  // Custas
  private marcarCustasConhecimentoReclamado: boolean = false;
  private custasConhecimentoReclamado: ParcelasAtualizaveisCustas | null = new ParcelasAtualizaveisCustas(VALOR_DOIS);
  private marcarCustasLiquidacao: boolean = false;
  private custasLiquidacao: ParcelasAtualizaveisCustas | null = new ParcelasAtualizaveisCustas(CINQUENTA_POR_CENTO);
  private marcarCustasExecucao: boolean = false;
  private custasExecucao: ParcelasAtualizaveisCustas | null = new ParcelasAtualizaveisCustas();

  constructor(calculoExterno?: Calculo) {
    if (calculoExterno) this.calculoExterno = calculoExterno;
  }

  obterChavePrimaria(): number | null { return this.id; }

  getListaMultasIndenizTerceiroReclamadoClone(): ParcelasAtualizaveisMultaIndenizacao[] {
    return this.listaMultasIndenizTerceiroReclamado.map(m => m.clonar());
  }

  getListaHonorariosDevReclamadoClone(): ParcelasAtualizaveisHonorario[] {
    return this.listaHonorariosDevReclamado.map(h => h.clonar());
  }

  // ===== Getters / Setters =====

  getMarcarMultaContribSocialDevidos(): boolean { return this.marcarMultaContribSocialDevidos; }
  setMarcarMultaContribSocialDevidos(v: boolean): void { this.marcarMultaContribSocialDevidos = v; }

  getMarcarContribSocialPagos(): boolean { return this.marcarContribSocialPagos; }
  setMarcarContribSocialPagos(v: boolean): void { this.marcarContribSocialPagos = v; }

  getMarcarMultaContribSocialPagos(): boolean { return this.marcarMultaContribSocialPagos; }
  setMarcarMultaContribSocialPagos(v: boolean): void { this.marcarMultaContribSocialPagos = v; }

  getMarcarJurosPrevidenciaPrivada(): boolean { return this.marcarJurosPrevidenciaPrivada; }
  setMarcarJurosPrevidenciaPrivada(v: boolean): void { this.marcarJurosPrevidenciaPrivada = v; }

  getMarcarMultaIndenizTerceiroReclamado(): boolean { return this.marcarMultaIndenizTerceiroReclamado; }
  setMarcarMultaIndenizTerceiroReclamado(v: boolean): void { this.marcarMultaIndenizTerceiroReclamado = v; }

  getMarcarHonorariosDevReclamado(): boolean { return this.marcarHonorariosDevReclamado; }
  setMarcarHonorariosDevReclamado(v: boolean): void { this.marcarHonorariosDevReclamado = v; }

  getMarcarContribSocial10(): boolean { return this.marcarContribSocial10; }
  setMarcarContribSocial10(v: boolean): void { this.marcarContribSocial10 = v; }

  getMarcarContribSocial05(): boolean { return this.marcarContribSocial05; }
  setMarcarContribSocial05(v: boolean): void { this.marcarContribSocial05 = v; }

  getMarcarCustasConhecimentoReclamado(): boolean { return this.marcarCustasConhecimentoReclamado; }
  setMarcarCustasConhecimentoReclamado(v: boolean): void { this.marcarCustasConhecimentoReclamado = v; }

  getMarcarCustasLiquidacao(): boolean { return this.marcarCustasLiquidacao; }
  setMarcarCustasLiquidacao(v: boolean): void { this.marcarCustasLiquidacao = v; }

  getMarcarCustasExecucao(): boolean { return this.marcarCustasExecucao; }
  setMarcarCustasExecucao(v: boolean): void { this.marcarCustasExecucao = v; }

  getCustasConhecimentoReclamado(): ParcelasAtualizaveisCustas | null { return this.custasConhecimentoReclamado; }
  setCustasConhecimentoReclamado(v: ParcelasAtualizaveisCustas | null): void { this.custasConhecimentoReclamado = v; }

  getCustasLiquidacao(): ParcelasAtualizaveisCustas | null { return this.custasLiquidacao; }
  setCustasLiquidacao(v: ParcelasAtualizaveisCustas | null): void { this.custasLiquidacao = v; }

  getCustasExecucao(): ParcelasAtualizaveisCustas | null { return this.custasExecucao; }
  setCustasExecucao(v: ParcelasAtualizaveisCustas | null): void { this.custasExecucao = v; }

  getIndiceTrabalhistaInformadoPrevidenciaPrivada(): IndiceMonetarioEnum { return this.indiceTrabalhistaInformadoPrevidenciaPrivada; }
  setIndiceTrabalhistaInformadoPrevidenciaPrivada(v: IndiceMonetarioEnum): void { this.indiceTrabalhistaInformadoPrevidenciaPrivada = v; }

  getMarcarContribSocialSegurado(): boolean { return this.marcarContribSocialSegurado; }
  setMarcarContribSocialSegurado(v: boolean): void { this.marcarContribSocialSegurado = v; }

  getValorParcelasAteFev2009ContribSocialSegurado(): Decimal | null { return this.valorParcelasAteFev2009ContribSocialSegurado; }
  setValorParcelasAteFev2009ContribSocialSegurado(v: Decimal | null): void { this.valorParcelasAteFev2009ContribSocialSegurado = v; }

  getValorJurosAteFev2009ContribSocialSegurado(): Decimal | null { return this.valorJurosAteFev2009ContribSocialSegurado; }
  setValorJurosAteFev2009ContribSocialSegurado(v: Decimal | null): void { this.valorJurosAteFev2009ContribSocialSegurado = v; }

  getValorParcelasAposFev2009ContribSocialSegurado(): Decimal | null { return this.valorParcelasAposFev2009ContribSocialSegurado; }
  setValorParcelasAposFev2009ContribSocialSegurado(v: Decimal | null): void { this.valorParcelasAposFev2009ContribSocialSegurado = v; }

  getValorJurosAposFev2009ContribSocialSegurado(): Decimal | null { return this.valorJurosAposFev2009ContribSocialSegurado; }
  setValorJurosAposFev2009ContribSocialSegurado(v: Decimal | null): void { this.valorJurosAposFev2009ContribSocialSegurado = v; }

  getValorParcelaContribSocialSegurado(): Decimal | null { return this.valorParcelaContribSocialSegurado; }
  setValorParcelaContribSocialSegurado(v: Decimal | null): void { this.valorParcelaContribSocialSegurado = v; }

  getValorJurosContribSocialSegurado(): Decimal | null { return this.valorJurosContribSocialSegurado; }
  setValorJurosContribSocialSegurado(v: Decimal | null): void { this.valorJurosContribSocialSegurado = v; }

  getMarcarContribSocialPatronal(): boolean { return this.marcarContribSocialPatronal; }
  setMarcarContribSocialPatronal(v: boolean): void { this.marcarContribSocialPatronal = v; }

  getValorParcelasAteFev2009ContribSocialPatronal(): Decimal | null { return this.valorParcelasAteFev2009ContribSocialPatronal; }
  setValorParcelasAteFev2009ContribSocialPatronal(v: Decimal | null): void { this.valorParcelasAteFev2009ContribSocialPatronal = v; }

  getValorJurosAteFev2009ContribSocialPatronal(): Decimal | null { return this.valorJurosAteFev2009ContribSocialPatronal; }
  setValorJurosAteFev2009ContribSocialPatronal(v: Decimal | null): void { this.valorJurosAteFev2009ContribSocialPatronal = v; }

  getValorParcelasAposFev2009ContribSocialPatronal(): Decimal | null { return this.valorParcelasAposFev2009ContribSocialPatronal; }
  setValorParcelasAposFev2009ContribSocialPatronal(v: Decimal | null): void { this.valorParcelasAposFev2009ContribSocialPatronal = v; }

  getValorJurosAposFev2009ContribSocialPatronal(): Decimal | null { return this.valorJurosAposFev2009ContribSocialPatronal; }
  setValorJurosAposFev2009ContribSocialPatronal(v: Decimal | null): void { this.valorJurosAposFev2009ContribSocialPatronal = v; }

  getValorParcelaContribSocialPatronal(): Decimal | null { return this.valorParcelaContribSocialPatronal; }
  setValorParcelaContribSocialPatronal(v: Decimal | null): void { this.valorParcelaContribSocialPatronal = v; }

  getValorJurosContribSocialPatronal(): Decimal | null { return this.valorJurosContribSocialPatronal; }
  setValorJurosContribSocialPatronal(v: Decimal | null): void { this.valorJurosContribSocialPatronal = v; }

  getDataInicialAteFev2009MultaContribSocialDevidos(): Date | null { return this.dataInicialAteFev2009MultaContribSocialDevidos; }
  setDataInicialAteFev2009MultaContribSocialDevidos(v: Date | null): void { this.dataInicialAteFev2009MultaContribSocialDevidos = v; }

  getDataInicialAposFev2009MultaContribSocialDevidos(): Date | null { return this.dataInicialAposFev2009MultaContribSocialDevidos; }
  setDataInicialAposFev2009MultaContribSocialDevidos(v: Date | null): void { this.dataInicialAposFev2009MultaContribSocialDevidos = v; }

  getDataInicialBaseMultaContribSocialDevidos(): Date | null { return this.dataInicialBaseMultaContribSocialDevidos; }
  setDataInicialBaseMultaContribSocialDevidos(v: Date | null): void { this.dataInicialBaseMultaContribSocialDevidos = v; }

  getValorParcelasAteFev2009ContribSocialPagos(): Decimal | null { return this.valorParcelasAteFev2009ContribSocialPagos; }
  setValorParcelasAteFev2009ContribSocialPagos(v: Decimal | null): void { this.valorParcelasAteFev2009ContribSocialPagos = v; }

  getValorJurosAteFev2009ContribSocialPagos(): Decimal | null { return this.valorJurosAteFev2009ContribSocialPagos; }
  setValorJurosAteFev2009ContribSocialPagos(v: Decimal | null): void { this.valorJurosAteFev2009ContribSocialPagos = v; }

  getValorParcelasAposFev2009ContribSocialPagos(): Decimal | null { return this.valorParcelasAposFev2009ContribSocialPagos; }
  setValorParcelasAposFev2009ContribSocialPagos(v: Decimal | null): void { this.valorParcelasAposFev2009ContribSocialPagos = v; }

  getValorJurosAposFev2009ContribSocialPagos(): Decimal | null { return this.valorJurosAposFev2009ContribSocialPagos; }
  setValorJurosAposFev2009ContribSocialPagos(v: Decimal | null): void { this.valorJurosAposFev2009ContribSocialPagos = v; }

  getValorParcelaContribSocialPagos(): Decimal | null { return this.valorParcelaContribSocialPagos; }
  setValorParcelaContribSocialPagos(v: Decimal | null): void { this.valorParcelaContribSocialPagos = v; }

  getValorJurosContribSocialPagos(): Decimal | null { return this.valorJurosContribSocialPagos; }
  setValorJurosContribSocialPagos(v: Decimal | null): void { this.valorJurosContribSocialPagos = v; }

  getDataInicialAteFev2009MultaContribSocialPagos(): Date | null { return this.dataInicialAteFev2009MultaContribSocialPagos; }
  setDataInicialAteFev2009MultaContribSocialPagos(v: Date | null): void { this.dataInicialAteFev2009MultaContribSocialPagos = v; }

  getDataInicialAposFev2009MultaContribSocialPagos(): Date | null { return this.dataInicialAposFev2009MultaContribSocialPagos; }
  setDataInicialAposFev2009MultaContribSocialPagos(v: Date | null): void { this.dataInicialAposFev2009MultaContribSocialPagos = v; }

  getDataInicialBaseMultaContribSocialPagos(): Date | null { return this.dataInicialBaseMultaContribSocialPagos; }
  setDataInicialBaseMultaContribSocialPagos(v: Date | null): void { this.dataInicialBaseMultaContribSocialPagos = v; }

  getValorJurosPrevidenciaPrivada(): Decimal | null { return this.valorJurosPrevidenciaPrivada; }
  setValorJurosPrevidenciaPrivada(v: Decimal | null): void { this.valorJurosPrevidenciaPrivada = v; }

  getAplicarJurosPrevidenciaPrivada(): boolean | null { return this.aplicarJurosPrevidenciaPrivada; }
  setAplicarJurosPrevidenciaPrivada(v: boolean | null): void { this.aplicarJurosPrevidenciaPrivada = v; }

  getValorParcelaContribSocial10(): Decimal | null { return this.valorParcelaContribSocial10; }
  setValorParcelaContribSocial10(v: Decimal | null): void { this.valorParcelaContribSocial10 = v; }

  getIndiceTrabalhistaContribSocial10(): IndiceMonetarioEnum { return this.indiceTrabalhistaContribSocial10; }
  setIndiceTrabalhistaContribSocial10(v: IndiceMonetarioEnum): void { this.indiceTrabalhistaContribSocial10 = v; }

  getValorParcelaContribSocial05(): Decimal | null { return this.valorParcelaContribSocial05; }
  setValorParcelaContribSocial05(v: Decimal | null): void { this.valorParcelaContribSocial05 = v; }

  getIndiceTrabalhistaContribSocial05(): IndiceMonetarioEnum { return this.indiceTrabalhistaContribSocial05; }
  setIndiceTrabalhistaContribSocial05(v: IndiceMonetarioEnum): void { this.indiceTrabalhistaContribSocial05 = v; }

  getCalculoExterno(): Calculo | null { return this.calculoExterno; }
  setCalculoExterno(v: Calculo | null): void { this.calculoExterno = v; }

  getMultaIndenizTerceiroReclamado(): ParcelasAtualizaveisMultaIndenizacao { return this.multaIndenizTerceiroReclamado; }
  setMultaIndenizTerceiroReclamado(v: ParcelasAtualizaveisMultaIndenizacao): void { this.multaIndenizTerceiroReclamado = v; }

  getListaMultasIndenizTerceiroReclamado(): ParcelasAtualizaveisMultaIndenizacao[] { return this.listaMultasIndenizTerceiroReclamado; }
  setListaMultasIndenizTerceiroReclamado(v: ParcelasAtualizaveisMultaIndenizacao[]): void { this.listaMultasIndenizTerceiroReclamado = v; }

  getHonorariosDevReclamado(): ParcelasAtualizaveisHonorario { return this.honorariosDevReclamado; }
  setHonorariosDevReclamado(v: ParcelasAtualizaveisHonorario): void { this.honorariosDevReclamado = v; }

  getListaHonorariosDevReclamado(): ParcelasAtualizaveisHonorario[] { return this.listaHonorariosDevReclamado; }
  setListaHonorariosDevReclamado(v: ParcelasAtualizaveisHonorario[]): void { this.listaHonorariosDevReclamado = v; }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }
}
