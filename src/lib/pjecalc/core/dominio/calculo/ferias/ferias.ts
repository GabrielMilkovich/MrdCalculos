/**
 * PJe-Calc v2.15.1 — Ferias
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/ferias/Ferias.java (472 linhas)
 *
 * Representa um registro de férias do empregado:
 *   - Período aquisitivo (início/fim)
 *   - Período concessivo (gozo)
 *   - Prazo (30 dias padrão, pode ser reduzido por faltas — Art. 130 CLT)
 *   - Situação (gozadas, indenizadas, proporcionais)
 *   - Abono pecuniário (até 1/3 — Art. 143 CLT)
 */
import { Periodo } from '../../../base/comum/periodo';

export enum SituacaoDaFeriasEnum {
  GOZADAS = 'G',
  INDENIZADAS = 'I',
  PROPORCIONAIS = 'P',
  DOBRADAS = 'D',
}

export class Ferias {
  private periodoAquisitivo: Periodo | null = null;
  private periodoConcessivo: Periodo | null = null;
  private prazo: number = 30;
  private quantidadeDiasAbono: number = 0;
  private situacao: SituacaoDaFeriasEnum = SituacaoDaFeriasEnum.GOZADAS;
  private abonoConstitucional: boolean = true;  // 1/3 constitucional
  private feriasIndenizadas: boolean = false;

  // ── Getters/Setters ──

  getPeriodoAquisitivo(): Periodo | null { return this.periodoAquisitivo; }
  setPeriodoAquisitivo(v: Periodo): void { this.periodoAquisitivo = v; }

  getPeriodoConcessivo(): Periodo | null { return this.periodoConcessivo; }
  setPeriodoConcessivo(v: Periodo): void { this.periodoConcessivo = v; }

  getPrazo(): number { return this.prazo; }
  setPrazo(v: number): void { this.prazo = v; }

  getQuantidadeDiasAbono(): number { return this.quantidadeDiasAbono; }
  setQuantidadeDiasAbono(v: number): void { this.quantidadeDiasAbono = v; }

  getSituacao(): SituacaoDaFeriasEnum { return this.situacao; }
  setSituacao(v: SituacaoDaFeriasEnum): void { this.situacao = v; }

  getAbonoConstitucional(): boolean { return this.abonoConstitucional; }
  setAbonoConstitucional(v: boolean): void { this.abonoConstitucional = v; }

  isFeriasIndenizadas(): boolean { return this.feriasIndenizadas; }
  setFeriasIndenizadas(v: boolean): void { this.feriasIndenizadas = v; }
}
