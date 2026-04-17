/**
 * PJe-Calc v2.15.1 — ParametrosDeCustasFixas
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.custas.ParametrosDeCustasFixas
 *
 * Ref Java: pjecalc-fonte/.../custas/ParametrosDeCustasFixas.java (~332 LOC)
 *
 * Tabela de parâmetros fixos de custas judiciais (pisos, tetos, valores de
 * atos processuais) por vigência. No Java é JPA; aqui usa hardcoded seed
 * (mesmos dados do Supabase `pjecalc_custas_judiciais`).
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';
import { nulo } from '../../base/comum/utils';

export class ParametrosDeCustasFixas {
  private dataInicio: Date;
  private dataFim: Date | null;
  private valorAtosUrbanosOficialJustica: Decimal;
  private valorAtosRuraisOficialJustica: Decimal;
  private valorAgravoDeInstrumento: Decimal;
  private valorAgravoDePeticao: Decimal;
  private valorImpugnacaoSentencaDeLiquidacao: Decimal;
  private valorEmbargosAArrematacao: Decimal;
  private valorEmbargosAExecucao: Decimal;
  private valorEmbargosDeTerceiros: Decimal;
  private valorRecursoDeRevista: Decimal;
  private valorPisoCustasConhecimento: Decimal;
  private valorTetoCustasLiquidacao: Decimal;
  private valorTetoCustasDeAutos: Decimal;

  constructor(init: {
    dataInicio: Date;
    dataFim: Date | null;
    atosUrbanos: number;
    atosRurais: number;
    agrInstrumento: number;
    agrPeticao: number;
    impSentenca: number;
    embArrematacao: number;
    embExecucao: number;
    embTerceiros: number;
    recRevista: number;
    pisoConhecimento: number;
    tetoLiquidacao: number;
    tetoAutos: number;
  }) {
    this.dataInicio = init.dataInicio;
    this.dataFim = init.dataFim;
    this.valorAtosUrbanosOficialJustica = new Decimal(init.atosUrbanos);
    this.valorAtosRuraisOficialJustica = new Decimal(init.atosRurais);
    this.valorAgravoDeInstrumento = new Decimal(init.agrInstrumento);
    this.valorAgravoDePeticao = new Decimal(init.agrPeticao);
    this.valorImpugnacaoSentencaDeLiquidacao = new Decimal(init.impSentenca);
    this.valorEmbargosAArrematacao = new Decimal(init.embArrematacao);
    this.valorEmbargosAExecucao = new Decimal(init.embExecucao);
    this.valorEmbargosDeTerceiros = new Decimal(init.embTerceiros);
    this.valorRecursoDeRevista = new Decimal(init.recRevista);
    this.valorPisoCustasConhecimento = new Decimal(init.pisoConhecimento);
    this.valorTetoCustasLiquidacao = new Decimal(init.tetoLiquidacao);
    this.valorTetoCustasDeAutos = new Decimal(init.tetoAutos);
  }

  getDataInicio(): Date { return this.dataInicio; }
  getDataFim(): Date | null { return this.dataFim; }
  getValorAtosUrbanosOficialJustica(): Decimal { return this.valorAtosUrbanosOficialJustica; }
  getValorAtosRuraisOficialJustica(): Decimal { return this.valorAtosRuraisOficialJustica; }
  getValorAgravoDeInstrumento(): Decimal { return this.valorAgravoDeInstrumento; }
  getValorAgravoDePeticao(): Decimal { return this.valorAgravoDePeticao; }
  getValorImpugnacaoSentencaDeLiquidacao(): Decimal { return this.valorImpugnacaoSentencaDeLiquidacao; }
  getValorEmbargosAArrematacao(): Decimal { return this.valorEmbargosAArrematacao; }
  getValorEmbargosAExecucao(): Decimal { return this.valorEmbargosAExecucao; }
  getValorEmbargosDeTerceiros(): Decimal { return this.valorEmbargosDeTerceiros; }
  getValorRecursoDeRevista(): Decimal { return this.valorRecursoDeRevista; }
  getValorPisoCustasConhecimento(): Decimal { return this.valorPisoCustasConhecimento; }
  getValorTetoCustasLiquidacao(): Decimal { return this.valorTetoCustasLiquidacao; }
  getValorTetoCustasDeAutos(): Decimal { return this.valorTetoCustasDeAutos; }

  isVigenciaAtual(): boolean { return nulo(this.dataFim); }

  isDataContidaNaVigencia(data: Date): boolean {
    if (this.isVigenciaAtual()) return HelperDate.dateAfterOrEquals(data, this.dataInicio);
    return new Periodo(this.dataInicio, this.dataFim!).isPeriodoContemEsta(data);
  }

  /** obterPorData (Java linha 248) — lookup por vigência. */
  static obterPorData(data: Date): ParametrosDeCustasFixas | null {
    for (const p of PARAMETROS_CUSTAS_FIXAS) {
      if (p.isDataContidaNaVigencia(data)) return p;
    }
    return null;
  }
}

// ────────── Dados hardcoded (fonte: Supabase seed / pjecalc_custas_judiciais) ──────────

const PARAMETROS_CUSTAS_FIXAS: ParametrosDeCustasFixas[] = [
  new ParametrosDeCustasFixas({
    dataInicio: new Date(2022, 0, 1),
    dataFim: null,
    atosUrbanos: 18.62,
    atosRurais: 37.24,
    agrInstrumento: 44.26,
    agrPeticao: 44.26,
    impSentenca: 44.26,
    embArrematacao: 44.26,
    embExecucao: 44.26,
    embTerceiros: 44.26,
    recRevista: 148.10,
    pisoConhecimento: 10.64,
    tetoLiquidacao: 22474.36,
    tetoAutos: 4494.87,
  }),
];
