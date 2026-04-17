/**
 * PJe-Calc v2.15.1 — JurosSelicIrpf
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicIrpf
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/juros/selicirpf/JurosSelicIrpf.java
 *
 * Entidade standalone (estende EntidadeBase no Java). Armazena a taxa SELIC
 * aplicável ao IRPF (Imposto de Renda Pessoa Física) por competência, com
 * referência para cálculo composto e flag de alteração.
 *
 * Há 2 tabelas distintas no Java:
 *   obterTabelaParaJurosMora(dataInicio, dataFim) — juros de mora
 *   obterTabelaParaCorrecao(periodo)              — correção monetária
 *
 * Campos transient:
 *   taxaAcumulada — populada em tempo de cálculo
 *   alteracao     — auditoria
 */
import type Decimal from 'decimal.js';

export class JurosSelicIrpf {
  private id: number | null = null;
  private competencia: Date;
  private competenciaReferencia: Date;
  private taxa: Decimal;
  /** transient (Java linha 66) */
  private taxaAcumulada: Decimal | null = null;
  /** transient (Java linha 68) */
  private alteracao: boolean = false;

  constructor(competencia: Date, competenciaReferencia: Date, taxa: Decimal) {
    this.competencia = competencia;
    this.competenciaReferencia = competenciaReferencia;
    this.taxa = taxa;
  }

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }

  getCompetencia(): Date { return this.competencia; }
  setCompetencia(c: Date): void { this.competencia = c; }

  getCompetenciaReferencia(): Date { return this.competenciaReferencia; }
  setCompetenciaReferencia(c: Date): void { this.competenciaReferencia = c; }

  getTaxa(): Decimal { return this.taxa; }
  setTaxa(t: Decimal): void { this.taxa = t; }

  getTaxaAcumulada(): Decimal | null { return this.taxaAcumulada; }
  setTaxaAcumulada(t: Decimal | null): void { this.taxaAcumulada = t; }

  isAlteracao(): boolean { return this.alteracao; }
  setAlteracao(a: boolean): void { this.alteracao = a; }

  /** clonar (linha 123 Java) — copia campos do origem para this */
  clonar(origem: JurosSelicIrpf): this {
    this.competencia = origem.getCompetencia();
    this.competenciaReferencia = origem.getCompetenciaReferencia();
    this.taxa = origem.getTaxa();
    return this;
  }
}
