/**
 * PJe-Calc v2.15.1 — JurosBase
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.juros.JurosBase
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/juros/JurosBase.java
 *
 * Classe abstrata base para juros padronizados (Padrão, Fazenda Pública,
 * Precatório EC). Define período [dataInicio, dataFim] + aliquota mensal +
 * tipo (SIMPLES/COMPOSTOS) + tipoQuantidade (FRACAO/INTEIRO).
 */
import Decimal from 'decimal.js';
import { TipoDeJurosEnum, TipoDeQuantidadeDeJurosBaseEnum } from '../../constantes/enums';

export abstract class JurosBase {
  protected dataInicio: Date;
  protected dataFim: Date | null;
  protected aliquota: Decimal;
  protected tipoDeJuros: TipoDeJurosEnum = TipoDeJurosEnum.SIMPLES;
  protected tipoDeQuantidade: TipoDeQuantidadeDeJurosBaseEnum = TipoDeQuantidadeDeJurosBaseEnum.FRACAO;

  constructor(
    dataInicio: Date,
    dataFim: Date | null,
    aliquota: Decimal,
    tipoDeJuros: TipoDeJurosEnum = TipoDeJurosEnum.SIMPLES,
    tipoDeQuantidade: TipoDeQuantidadeDeJurosBaseEnum = TipoDeQuantidadeDeJurosBaseEnum.FRACAO,
  ) {
    this.dataInicio = dataInicio;
    this.dataFim = dataFim;
    this.aliquota = aliquota;
    this.tipoDeJuros = tipoDeJuros;
    this.tipoDeQuantidade = tipoDeQuantidade;
  }

  getDataInicio(): Date { return this.dataInicio; }
  setDataInicio(d: Date): void { this.dataInicio = d; }
  getDataFim(dataDefault?: Date): Date | null { return this.dataFim ?? dataDefault ?? null; }
  setDataFim(d: Date | null): void { this.dataFim = d; }

  getAliquota(): Decimal { return this.aliquota; }
  setAliquota(a: Decimal): void { this.aliquota = a; }

  getTipoDeJuros(): TipoDeJurosEnum { return this.tipoDeJuros; }
  setTipoDeJuros(t: TipoDeJurosEnum): void { this.tipoDeJuros = t; }

  getTipoDeQuantidade(): TipoDeQuantidadeDeJurosBaseEnum { return this.tipoDeQuantidade; }
  setTipoDeQuantidade(t: TipoDeQuantidadeDeJurosBaseEnum): void { this.tipoDeQuantidade = t; }
}

/** JurosPadrao — entidade de taxa default (configurável). */
export class JurosPadrao extends JurosBase {}

/** JurosFazendaPublica — juros de Fazenda Pública (Poupança pré-EC 113/2021). */
export class JurosFazendaPublica extends JurosBase {}

/**
 * JurosTaxaLegal — entidade de taxa legal (Lei 14.905/2024, vigência 31/08/2024).
 * competencia é diária (não um período).
 */
export class JurosTaxaLegal {
  private competencia: Date;
  private taxa: Decimal;

  constructor(competencia: Date, taxa: Decimal) {
    this.competencia = competencia;
    this.taxa = taxa;
  }

  getCompetencia(): Date { return this.competencia; }
  getTaxa(): Decimal { return this.taxa; }
}

/**
 * JurosPrecatorioEC1362025 — juros de precatório conforme EC 136/2025.
 */
export class JurosPrecatorioEC1362025 {
  private competencia: Date;
  private taxa: Decimal;

  constructor(competencia: Date, taxa: Decimal) {
    this.competencia = competencia;
    this.taxa = taxa;
  }

  getCompetencia(): Date { return this.competencia; }
  getTaxa(): Decimal { return this.taxa; }
}

/**
 * JurosSelicIrpf — entidade de taxa SELIC mensal (RFB/SICALC).
 * Modelo simplificado — o Java original tem campos adicionais
 * (competenciaReferencia, taxaAcumulada transient).
 */
export class JurosSelicIrpf {
  private competencia: Date;
  private competenciaReferencia: Date;
  private taxa: Decimal;

  constructor(competencia: Date, competenciaReferencia: Date, taxa: Decimal) {
    this.competencia = competencia;
    this.competenciaReferencia = competenciaReferencia;
    this.taxa = taxa;
  }

  getCompetencia(): Date { return this.competencia; }
  getCompetenciaReferencia(): Date { return this.competenciaReferencia; }
  getTaxa(): Decimal { return this.taxa; }
}
