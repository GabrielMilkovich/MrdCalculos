/**
 * PJe-Calc v2.15.1 — CustasFixasAtualizacao
 * Porte 1:1 (struct-only) de: br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../calculo/custas/CustasFixasAtualizacao.java (~407 linhas)
 *
 * Snapshot das custas fixas em um evento de atualização. Agrupa as 9 categorias
 * (atos urbanos/rurais, agravos, embargos, recurso) com quantidade e valor
 * associados ao evento + datas.
 */
import type Decimal from 'decimal.js';
import type { CustasJudiciais } from './custas-judiciais';

export class CustasFixasAtualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private custasJudiciais: CustasJudiciais | null = null;
  private dataEvento: Date | null = null;
  private dataVencimentoCustasFixas: Date | null = null;
  private folhaDoEvento: string | null = null;

  // Quantidades
  private qtdeAtosUrbanos: number | null = null;
  private qtdeAtosRurais: number | null = null;
  private qtdeAgravosDeInstrumento: number | null = null;
  private qtdeAgravosDePeticao: number | null = null;
  private qtdeImpugnacaoSentenca: number | null = null;
  private qtdeEmbargosArrematacao: number | null = null;
  private qtdeEmbargosExecucao: number | null = null;
  private qtdeEmbargosTerceiros: number | null = null;
  private qtdeRecursoRevista: number | null = null;

  // Valores
  private valorAtosUrbanos: Decimal | null = null;
  private valorAtosRurais: Decimal | null = null;
  private valorAgravoInstrumento: Decimal | null = null;
  private valorAgravoPeticao: Decimal | null = null;
  private valorImpugnacaoSentenca: Decimal | null = null;
  private valorEmbargosArrematacao: Decimal | null = null;
  private valorEmbargosExecucao: Decimal | null = null;
  private valorEmbargosTerceiros: Decimal | null = null;
  private valorRecursoRevista: Decimal | null = null;

  private indiceCorrecao: Decimal | null = null;
  private taxaJuros: Decimal | null = null;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCustasJudiciais(): CustasJudiciais | null { return this.custasJudiciais; }
  setCustasJudiciais(c: CustasJudiciais | null): void { this.custasJudiciais = c; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getDataVencimentoCustasFixas(): Date | null { return this.dataVencimentoCustasFixas; }
  setDataVencimentoCustasFixas(d: Date | null): void { this.dataVencimentoCustasFixas = d; }

  getFolhaDoEvento(): string | null { return this.folhaDoEvento; }
  setFolhaDoEvento(v: string | null): void { this.folhaDoEvento = v; }

  getQtdeAtosUrbanos(): number | null { return this.qtdeAtosUrbanos; }
  setQtdeAtosUrbanos(v: number | null): void { this.qtdeAtosUrbanos = v; }

  getQtdeAtosRurais(): number | null { return this.qtdeAtosRurais; }
  setQtdeAtosRurais(v: number | null): void { this.qtdeAtosRurais = v; }

  getQtdeAgravosDeInstrumento(): number | null { return this.qtdeAgravosDeInstrumento; }
  setQtdeAgravosDeInstrumento(v: number | null): void { this.qtdeAgravosDeInstrumento = v; }

  getQtdeAgravosDePeticao(): number | null { return this.qtdeAgravosDePeticao; }
  setQtdeAgravosDePeticao(v: number | null): void { this.qtdeAgravosDePeticao = v; }

  getQtdeImpugnacaoSentenca(): number | null { return this.qtdeImpugnacaoSentenca; }
  setQtdeImpugnacaoSentenca(v: number | null): void { this.qtdeImpugnacaoSentenca = v; }

  getQtdeEmbargosArrematacao(): number | null { return this.qtdeEmbargosArrematacao; }
  setQtdeEmbargosArrematacao(v: number | null): void { this.qtdeEmbargosArrematacao = v; }

  getQtdeEmbargosExecucao(): number | null { return this.qtdeEmbargosExecucao; }
  setQtdeEmbargosExecucao(v: number | null): void { this.qtdeEmbargosExecucao = v; }

  getQtdeEmbargosTerceiros(): number | null { return this.qtdeEmbargosTerceiros; }
  setQtdeEmbargosTerceiros(v: number | null): void { this.qtdeEmbargosTerceiros = v; }

  getQtdeRecursoRevista(): number | null { return this.qtdeRecursoRevista; }
  setQtdeRecursoRevista(v: number | null): void { this.qtdeRecursoRevista = v; }

  getValorAtosUrbanos(): Decimal | null { return this.valorAtosUrbanos; }
  setValorAtosUrbanos(v: Decimal | null): void { this.valorAtosUrbanos = v; }

  getValorAtosRurais(): Decimal | null { return this.valorAtosRurais; }
  setValorAtosRurais(v: Decimal | null): void { this.valorAtosRurais = v; }

  getValorAgravoInstrumento(): Decimal | null { return this.valorAgravoInstrumento; }
  setValorAgravoInstrumento(v: Decimal | null): void { this.valorAgravoInstrumento = v; }

  getValorAgravoPeticao(): Decimal | null { return this.valorAgravoPeticao; }
  setValorAgravoPeticao(v: Decimal | null): void { this.valorAgravoPeticao = v; }

  getValorImpugnacaoSentenca(): Decimal | null { return this.valorImpugnacaoSentenca; }
  setValorImpugnacaoSentenca(v: Decimal | null): void { this.valorImpugnacaoSentenca = v; }

  getValorEmbargosArrematacao(): Decimal | null { return this.valorEmbargosArrematacao; }
  setValorEmbargosArrematacao(v: Decimal | null): void { this.valorEmbargosArrematacao = v; }

  getValorEmbargosExecucao(): Decimal | null { return this.valorEmbargosExecucao; }
  setValorEmbargosExecucao(v: Decimal | null): void { this.valorEmbargosExecucao = v; }

  getValorEmbargosTerceiros(): Decimal | null { return this.valorEmbargosTerceiros; }
  setValorEmbargosTerceiros(v: Decimal | null): void { this.valorEmbargosTerceiros = v; }

  getValorRecursoRevista(): Decimal | null { return this.valorRecursoRevista; }
  setValorRecursoRevista(v: Decimal | null): void { this.valorRecursoRevista = v; }

  getIndiceCorrecao(): Decimal | null { return this.indiceCorrecao; }
  setIndiceCorrecao(v: Decimal | null): void { this.indiceCorrecao = v; }

  getTaxaJuros(): Decimal | null { return this.taxaJuros; }
  setTaxaJuros(v: Decimal | null): void { this.taxaJuros = v; }
}
