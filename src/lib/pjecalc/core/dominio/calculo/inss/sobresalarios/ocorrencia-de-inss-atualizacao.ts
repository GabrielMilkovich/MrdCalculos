/**
 * PJe-Calc v2.15.1 — OcorrenciaDeInssAtualizacao (abstract)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/OcorrenciaDeInssAtualizacao.java
 *
 * Linha-mensal de atualização de INSS pós-liquidação. Diferente de
 * `OcorrenciaDeInss`: não armazena alíquotas ou base, apenas totais já
 * calculados (devido, juros, multa, total, pago, diferenças).
 *
 * Subclasses concretas:
 *   OcorrenciaDeInssSobreSalariosDevidosAtualizacao
 *   OcorrenciaDeInssSobreSalariosPagosAtualizacao
 */
import Decimal from 'decimal.js';

const ZERO = new Decimal(0);

export abstract class OcorrenciaDeInssAtualizacao {
  protected dataInicioPeriodo: Date | null = null;
  protected dataTerminoPeriodo: Date | null = null;
  protected dataOcorrenciaInss: Date | null = null;
  protected dataEvento: Date | null = null;
  protected devido: Decimal = ZERO;
  protected indiceCorrecao: Decimal = ZERO;
  protected devidoCorrigido: Decimal = ZERO;
  protected juros: Decimal = ZERO;
  protected multa: Decimal = ZERO;
  protected total: Decimal = ZERO;
  protected pago: Decimal = ZERO;
  protected devidoDiferenca: Decimal = ZERO;
  protected jurosDiferenca: Decimal = ZERO;
  protected multaDiferenca: Decimal = ZERO;
  protected totalDiferenca: Decimal = ZERO;
  protected ocorrenciaDecimoTerceiro: boolean = false;
  // transient
  protected amortizado: boolean = false;
  protected parcialmenteAmortizado: boolean = false;

  getDataInicioPeriodo(): Date | null { return this.dataInicioPeriodo; }
  setDataInicioPeriodo(d: Date | null): void { this.dataInicioPeriodo = d; }

  getDataTerminoPeriodo(): Date | null { return this.dataTerminoPeriodo; }
  setDataTerminoPeriodo(d: Date | null): void { this.dataTerminoPeriodo = d; }

  getDataOcorrenciaInss(): Date | null { return this.dataOcorrenciaInss; }
  setDataOcorrenciaInss(d: Date | null): void { this.dataOcorrenciaInss = d; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getDevido(): Decimal { return this.devido; }
  setDevido(v: Decimal): void { this.devido = v; }

  getIndiceCorrecao(): Decimal { return this.indiceCorrecao; }
  setIndiceCorrecao(v: Decimal): void { this.indiceCorrecao = v; }

  getDevidoCorrigido(): Decimal { return this.devidoCorrigido; }
  setDevidoCorrigido(v: Decimal): void { this.devidoCorrigido = v; }

  getJuros(): Decimal { return this.juros; }
  setJuros(v: Decimal): void { this.juros = v; }

  getMulta(): Decimal { return this.multa; }
  setMulta(v: Decimal): void { this.multa = v; }

  getTotal(): Decimal { return this.total; }
  setTotal(v: Decimal): void { this.total = v; }

  getPago(): Decimal { return this.pago; }
  setPago(v: Decimal): void { this.pago = v; }

  getDevidoDiferenca(): Decimal { return this.devidoDiferenca; }
  setDevidoDiferenca(v: Decimal): void { this.devidoDiferenca = v; }

  getJurosDiferenca(): Decimal { return this.jurosDiferenca; }
  setJurosDiferenca(v: Decimal): void { this.jurosDiferenca = v; }

  getMultaDiferenca(): Decimal { return this.multaDiferenca; }
  setMultaDiferenca(v: Decimal): void { this.multaDiferenca = v; }

  getTotalDiferenca(): Decimal { return this.totalDiferenca; }
  setTotalDiferenca(v: Decimal): void { this.totalDiferenca = v; }

  isAmortizado(): boolean { return this.amortizado; }
  setAmortizado(v: boolean): void { this.amortizado = v; }

  isParcialmenteAmortizado(): boolean { return this.parcialmenteAmortizado; }
  setParcialmenteAmortizado(v: boolean): void { this.parcialmenteAmortizado = v; }

  getOcorrenciaDecimoTerceiro(): boolean { return this.ocorrenciaDecimoTerceiro; }
  setOcorrenciaDecimoTerceiro(v: boolean): void { this.ocorrenciaDecimoTerceiro = v; }

  /**
   * getCompetenciaFormatada (Java linha 79) — retorna "MM/YYYY".
   * Obs: Java soma 1 ao mês (Competencia.getMes() é 0-based lá); aqui o mês já
   * é 1-based, então retornamos direto.
   */
  getCompetenciaFormatada(): string {
    if (!this.dataOcorrenciaInss) return '';
    const mes = this.dataOcorrenciaInss.getMonth() + 1;
    const ano = this.dataOcorrenciaInss.getFullYear();
    return `${mes}/${ano}`;
  }

  /** compareTo — por dataOcorrenciaInss (Java linha 93) */
  compareTo(o: OcorrenciaDeInssAtualizacao): number {
    const a = this.dataOcorrenciaInss;
    const b = o.dataOcorrenciaInss;
    if (!a || !b) return 0;
    return a.getTime() - b.getTime();
  }
}
