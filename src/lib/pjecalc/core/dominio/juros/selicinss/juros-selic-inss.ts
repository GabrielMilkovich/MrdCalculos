/**
 * PJe-Calc v2.15.1 — JurosSelicInss
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.juros.selicinss.JurosSelicInss
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/juros/selicinss/JurosSelicInss.java
 *
 * Entidade standalone (estende EntidadeBase no Java, não IndiceBase nem
 * JurosBase). Armazena a taxa SELIC aplicável a contribuições previdenciárias
 * (INSS) por competência, com referência para cálculo composto (alíquota
 * acumulada) e flag de alteração para auditoria.
 *
 * Campos transient (java.persistence.Transient):
 *   taxaAcumulada — preenchido por CalculadorDeTaxaAcumulada
 *   alteracao     — marca se o registro foi alterado e precisa salvar
 */
import type Decimal from 'decimal.js';

export class JurosSelicInss {
  private id: number | null = null;
  private competencia: Date;
  private competenciaReferencia: Date;
  private taxa: Decimal;
  /** transient (Java linha 65) — populado em tempo de cálculo */
  private taxaAcumulada: Decimal | null = null;
  /** transient (Java linha 67) — flag de auditoria */
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
}
