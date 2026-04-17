/**
 * PJe-Calc v2.15.1 — DebitosDoReclamante (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante
 *
 * Ref Java: pjecalc-fonte/.../pagamento/DebitosDoReclamante.java (~1868 linhas)
 *
 * Espelha CreditosDoReclamante, mas para débitos (INSS segurado, IRPF,
 * honorários, previdência privada, custas etc. que o reclamante deve).
 *
 * **Status**: stub estrutural com os campos e getters essenciais. Lógica
 * de rateio será implementada quando MaquinaDeRateioDoPagamento estiver
 * completa.
 */
import Decimal from 'decimal.js';
import type { Atualizacao } from './atualizacao';

const ZERO = new Decimal(0);

export class DebitosDoReclamante {
  private id: number | null = null;
  private versao: number = 0;
  private atualizacao: Atualizacao | null = null;
  private dataCriacao: Date | null = null;
  private dataInicialPeriodo: Date | null = null;
  private dataFinalPeriodo: Date | null = null;

  // INSS
  private valorInssSobreSalariosDevidosSegurado: Decimal = ZERO;
  private pagoInssSobreSalariosDevidosSegurado: Decimal = ZERO;
  private valorInssSobreSalariosPagosSegurado: Decimal = ZERO;
  private pagoInssSobreSalariosPagosSegurado: Decimal = ZERO;

  // IRPF
  private valorIrpf: Decimal = ZERO;
  private pagoIrpf: Decimal = ZERO;

  // Honorários
  private valorHonorarios: Decimal = ZERO;
  private pagoHonorarios: Decimal = ZERO;

  // Previdência Privada
  private valorPrevidenciaPrivada: Decimal = ZERO;
  private pagoPrevidenciaPrivada: Decimal = ZERO;

  // Custas
  private valorCustas: Decimal = ZERO;
  private pagoCustas: Decimal = ZERO;

  // Multas a terceiros (do reclamante)
  private valorMultas: Decimal = ZERO;
  private pagoMultas: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getAtualizacao(): Atualizacao | null { return this.atualizacao; }
  setAtualizacao(a: Atualizacao | null): void { this.atualizacao = a; }

  getDataCriacao(): Date | null { return this.dataCriacao; }
  setDataCriacao(d: Date | null): void { this.dataCriacao = d; }

  getDataInicialPeriodo(): Date | null { return this.dataInicialPeriodo; }
  setDataInicialPeriodo(d: Date | null): void { this.dataInicialPeriodo = d; }

  getDataFinalPeriodo(): Date | null { return this.dataFinalPeriodo; }
  setDataFinalPeriodo(d: Date | null): void { this.dataFinalPeriodo = d; }

  getValorInssSobreSalariosDevidosSegurado(): Decimal { return this.valorInssSobreSalariosDevidosSegurado; }
  setValorInssSobreSalariosDevidosSegurado(v: Decimal): void { this.valorInssSobreSalariosDevidosSegurado = v; }

  getPagoInssSobreSalariosDevidosSegurado(): Decimal { return this.pagoInssSobreSalariosDevidosSegurado; }
  setPagoInssSobreSalariosDevidosSegurado(v: Decimal): void { this.pagoInssSobreSalariosDevidosSegurado = v; }

  getValorInssSobreSalariosPagosSegurado(): Decimal { return this.valorInssSobreSalariosPagosSegurado; }
  setValorInssSobreSalariosPagosSegurado(v: Decimal): void { this.valorInssSobreSalariosPagosSegurado = v; }

  getPagoInssSobreSalariosPagosSegurado(): Decimal { return this.pagoInssSobreSalariosPagosSegurado; }
  setPagoInssSobreSalariosPagosSegurado(v: Decimal): void { this.pagoInssSobreSalariosPagosSegurado = v; }

  getValorIrpf(): Decimal { return this.valorIrpf; }
  setValorIrpf(v: Decimal): void { this.valorIrpf = v; }

  getPagoIrpf(): Decimal { return this.pagoIrpf; }
  setPagoIrpf(v: Decimal): void { this.pagoIrpf = v; }

  getValorHonorarios(): Decimal { return this.valorHonorarios; }
  setValorHonorarios(v: Decimal): void { this.valorHonorarios = v; }

  getPagoHonorarios(): Decimal { return this.pagoHonorarios; }
  setPagoHonorarios(v: Decimal): void { this.pagoHonorarios = v; }

  getValorPrevidenciaPrivada(): Decimal { return this.valorPrevidenciaPrivada; }
  setValorPrevidenciaPrivada(v: Decimal): void { this.valorPrevidenciaPrivada = v; }

  getPagoPrevidenciaPrivada(): Decimal { return this.pagoPrevidenciaPrivada; }
  setPagoPrevidenciaPrivada(v: Decimal): void { this.pagoPrevidenciaPrivada = v; }

  getValorCustas(): Decimal { return this.valorCustas; }
  setValorCustas(v: Decimal): void { this.valorCustas = v; }

  getPagoCustas(): Decimal { return this.pagoCustas; }
  setPagoCustas(v: Decimal): void { this.pagoCustas = v; }

  getValorMultas(): Decimal { return this.valorMultas; }
  setValorMultas(v: Decimal): void { this.valorMultas = v; }

  getPagoMultas(): Decimal { return this.pagoMultas; }
  setPagoMultas(v: Decimal): void { this.pagoMultas = v; }

  getTotalValor(): Decimal {
    return this.valorInssSobreSalariosDevidosSegurado
      .plus(this.valorInssSobreSalariosPagosSegurado)
      .plus(this.valorIrpf)
      .plus(this.valorHonorarios)
      .plus(this.valorPrevidenciaPrivada)
      .plus(this.valorCustas)
      .plus(this.valorMultas);
  }
}
