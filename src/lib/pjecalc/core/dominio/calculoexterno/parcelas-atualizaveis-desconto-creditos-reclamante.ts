/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisDescontoCreditosReclamante
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante
 *
 * Ref Java: ~396 linhas.
 */
import Decimal from 'decimal.js';
import { IndiceMonetarioEnum } from '../../constantes/enums';
import type { Calculo } from '../calculo/calculo';
import { ParcelasAtualizaveisCustas } from './parcelas-atualizaveis-custas';
import { ParcelasAtualizaveisHonorario } from './parcelas-atualizaveis-honorario';
import { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';

/** Utils.VALOR_DOIS = 2 (literal do Java; usado como taxaCalculado default das custas). */
const VALOR_DOIS = new Decimal(2);

export class ParcelasAtualizaveisDescontoCreditosReclamante {
  private id: number | null = null;
  private calculoExterno: Calculo | null = null;
  private marcarContribSocialSegurado: boolean = false;
  private valorParcelaContribSocialSegurado: Decimal | null = null;
  private corrigirDescontoReclamante: boolean = false;
  private marcarPrevidenciaPrivada: boolean = false;
  private valorParcelaPrevidenciaPrivada: Decimal | null = null;
  private indiceTrabalhistaPrevidenciaPrivada: IndiceMonetarioEnum = IndiceMonetarioEnum.INDICE_TRABALHISTA;
  private marcarPensaoAlimenticia: boolean = false;
  private aliquotaPensaoAlimenticia: Decimal | null = null;
  private aplicarJurosPensaoAlimenticia: boolean = false;
  private percPrincipalTributavelPensaoAlimenticia: Decimal | null = null;
  private percPrincipalNaoTributavelPensaoAlimenticia: Decimal | null = null;
  private incidirSobrePrincipalTributavelPensaoAlimenticia: boolean = true;
  private incidirSobrePrincipalNaoTributavelPensaoAlimenticia: boolean = false;
  private incidirSobreFgtsPensaoAlimenticia: boolean = false;
  private incidirSobreMultaPensaoAlimenticia: boolean = false;
  private marcarMultaIndenizTerceiroReclamante: boolean = false;
  private multaIndenizTerceiroReclamante: ParcelasAtualizaveisMultaIndenizacao = new ParcelasAtualizaveisMultaIndenizacao();
  private listaMultasIndenizTerceiroReclamante: ParcelasAtualizaveisMultaIndenizacao[] = [];
  private marcarHonorariosDevReclamante: boolean = false;
  private honorariosDevReclamante: ParcelasAtualizaveisHonorario = new ParcelasAtualizaveisHonorario();
  private listaHonorariosDevReclamante: ParcelasAtualizaveisHonorario[] = [];
  private marcarCustasConhecimentoReclamante: boolean = false;
  private custasConhecimentoReclamante: ParcelasAtualizaveisCustas | null = new ParcelasAtualizaveisCustas(VALOR_DOIS);

  constructor(calculoExterno?: Calculo) {
    if (calculoExterno) this.calculoExterno = calculoExterno;
  }

  obterChavePrimaria(): number | null { return this.id; }

  getListaMultasIndenizTerceiroReclamanteClone(): ParcelasAtualizaveisMultaIndenizacao[] {
    return this.listaMultasIndenizTerceiroReclamante.map(m => m.clonar());
  }

  getListaHonorariosDevReclamanteClone(): ParcelasAtualizaveisHonorario[] {
    return this.listaHonorariosDevReclamante.map(h => h.clonar());
  }

  getMarcarContribSocialSegurado(): boolean { return this.marcarContribSocialSegurado; }
  setMarcarContribSocialSegurado(v: boolean): void { this.marcarContribSocialSegurado = v; }

  getCorrigirDescontoReclamante(): boolean { return this.corrigirDescontoReclamante; }
  setCorrigirDescontoReclamante(v: boolean): void { this.corrigirDescontoReclamante = v; }

  getMarcarPrevidenciaPrivada(): boolean { return this.marcarPrevidenciaPrivada; }
  setMarcarPrevidenciaPrivada(v: boolean): void { this.marcarPrevidenciaPrivada = v; }

  getMarcarPensaoAlimenticia(): boolean { return this.marcarPensaoAlimenticia; }
  setMarcarPensaoAlimenticia(v: boolean): void { this.marcarPensaoAlimenticia = v; }

  getMarcarMultaIndenizTerceiroReclamante(): boolean { return this.marcarMultaIndenizTerceiroReclamante; }
  setMarcarMultaIndenizTerceiroReclamante(v: boolean): void { this.marcarMultaIndenizTerceiroReclamante = v; }

  getMarcarHonorariosDevReclamante(): boolean { return this.marcarHonorariosDevReclamante; }
  setMarcarHonorariosDevReclamante(v: boolean): void { this.marcarHonorariosDevReclamante = v; }

  getMarcarCustasConhecimentoReclamante(): boolean { return this.marcarCustasConhecimentoReclamante; }
  setMarcarCustasConhecimentoReclamante(v: boolean): void { this.marcarCustasConhecimentoReclamante = v; }

  getMultaIndenizTerceiroReclamante(): ParcelasAtualizaveisMultaIndenizacao { return this.multaIndenizTerceiroReclamante; }
  setMultaIndenizTerceiroReclamante(v: ParcelasAtualizaveisMultaIndenizacao): void { this.multaIndenizTerceiroReclamante = v; }

  getListaMultasIndenizTerceiroReclamante(): ParcelasAtualizaveisMultaIndenizacao[] { return this.listaMultasIndenizTerceiroReclamante; }
  setListaMultasIndenizTerceiroReclamante(v: ParcelasAtualizaveisMultaIndenizacao[]): void { this.listaMultasIndenizTerceiroReclamante = v; }

  getHonorariosDevReclamante(): ParcelasAtualizaveisHonorario { return this.honorariosDevReclamante; }
  setHonorariosDevReclamante(v: ParcelasAtualizaveisHonorario): void { this.honorariosDevReclamante = v; }

  getListaHonorariosDevReclamante(): ParcelasAtualizaveisHonorario[] { return this.listaHonorariosDevReclamante; }
  setListaHonorariosDevReclamante(v: ParcelasAtualizaveisHonorario[]): void { this.listaHonorariosDevReclamante = v; }

  getCustasConhecimentoReclamante(): ParcelasAtualizaveisCustas | null { return this.custasConhecimentoReclamante; }
  setCustasConhecimentoReclamante(v: ParcelasAtualizaveisCustas | null): void { this.custasConhecimentoReclamante = v; }

  getValorParcelaContribSocialSegurado(): Decimal { return this.valorParcelaContribSocialSegurado ?? new Decimal(0); }
  setValorParcelaContribSocialSegurado(v: Decimal | null): void { this.valorParcelaContribSocialSegurado = v; }

  getValorParcelaPrevidenciaPrivada(): Decimal | null { return this.valorParcelaPrevidenciaPrivada; }
  setValorParcelaPrevidenciaPrivada(v: Decimal | null): void { this.valorParcelaPrevidenciaPrivada = v; }

  getIndiceTrabalhistaPrevidenciaPrivada(): IndiceMonetarioEnum { return this.indiceTrabalhistaPrevidenciaPrivada; }
  setIndiceTrabalhistaPrevidenciaPrivada(v: IndiceMonetarioEnum): void { this.indiceTrabalhistaPrevidenciaPrivada = v; }

  getAliquotaPensaoAlimenticia(): Decimal | null { return this.aliquotaPensaoAlimenticia; }
  setAliquotaPensaoAlimenticia(v: Decimal | null): void { this.aliquotaPensaoAlimenticia = v; }

  getAplicarJurosPensaoAlimenticia(): boolean { return this.aplicarJurosPensaoAlimenticia; }
  setAplicarJurosPensaoAlimenticia(v: boolean): void { this.aplicarJurosPensaoAlimenticia = v; }

  getPercPrincipalTributavelPensaoAlimenticia(): Decimal | null { return this.percPrincipalTributavelPensaoAlimenticia; }
  setPercPrincipalTributavelPensaoAlimenticia(v: Decimal | null): void { this.percPrincipalTributavelPensaoAlimenticia = v; }

  getPercPrincipalNaoTributavelPensaoAlimenticia(): Decimal | null { return this.percPrincipalNaoTributavelPensaoAlimenticia; }
  setPercPrincipalNaoTributavelPensaoAlimenticia(v: Decimal | null): void { this.percPrincipalNaoTributavelPensaoAlimenticia = v; }

  getIncidirSobrePrincipalTributavelPensaoAlimenticia(): boolean { return this.incidirSobrePrincipalTributavelPensaoAlimenticia; }
  setIncidirSobrePrincipalTributavelPensaoAlimenticia(v: boolean): void { this.incidirSobrePrincipalTributavelPensaoAlimenticia = v; }

  getIncidirSobrePrincipalNaoTributavelPensaoAlimenticia(): boolean { return this.incidirSobrePrincipalNaoTributavelPensaoAlimenticia; }
  setIncidirSobrePrincipalNaoTributavelPensaoAlimenticia(v: boolean): void { this.incidirSobrePrincipalNaoTributavelPensaoAlimenticia = v; }

  getIncidirSobreFgtsPensaoAlimenticia(): boolean { return this.incidirSobreFgtsPensaoAlimenticia; }
  setIncidirSobreFgtsPensaoAlimenticia(v: boolean): void { this.incidirSobreFgtsPensaoAlimenticia = v; }

  getIncidirSobreMultaPensaoAlimenticia(): boolean { return this.incidirSobreMultaPensaoAlimenticia; }
  setIncidirSobreMultaPensaoAlimenticia(v: boolean): void { this.incidirSobreMultaPensaoAlimenticia = v; }

  getCalculoExterno(): Calculo | null { return this.calculoExterno; }
  setCalculoExterno(v: Calculo | null): void { this.calculoExterno = v; }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }
}
