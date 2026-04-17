/**
 * PJe-Calc v2.15.1 — DebitosCobrarDoReclamante (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante
 *
 * Ref Java: pjecalc-fonte/.../pagamento/DebitosCobrarDoReclamante.java (~1002 linhas)
 *
 * Subgrupo dos débitos que são cobrados DIRETAMENTE do reclamante (em vez de
 * descontar do crédito): tipicamente honorários advocatícios e multas em que
 * o reclamante é devedor e tipoCobrancaReclamante = COBRAR.
 */
import Decimal from 'decimal.js';
import type { Atualizacao } from './atualizacao';

const ZERO = new Decimal(0);

export class DebitosCobrarDoReclamante {
  private id: number | null = null;
  private versao: number = 0;
  private atualizacao: Atualizacao | null = null;
  private dataInicialPeriodo: Date | null = null;
  private dataFinalPeriodo: Date | null = null;

  private valorHonorarios: Decimal = ZERO;
  private pagoHonorarios: Decimal = ZERO;
  private valorMultas: Decimal = ZERO;
  private pagoMultas: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getAtualizacao(): Atualizacao | null { return this.atualizacao; }
  setAtualizacao(a: Atualizacao | null): void { this.atualizacao = a; }

  getDataInicialPeriodo(): Date | null { return this.dataInicialPeriodo; }
  setDataInicialPeriodo(d: Date | null): void { this.dataInicialPeriodo = d; }

  getDataFinalPeriodo(): Date | null { return this.dataFinalPeriodo; }
  setDataFinalPeriodo(d: Date | null): void { this.dataFinalPeriodo = d; }

  getValorHonorarios(): Decimal { return this.valorHonorarios; }
  setValorHonorarios(v: Decimal): void { this.valorHonorarios = v; }

  getPagoHonorarios(): Decimal { return this.pagoHonorarios; }
  setPagoHonorarios(v: Decimal): void { this.pagoHonorarios = v; }

  getValorMultas(): Decimal { return this.valorMultas; }
  setValorMultas(v: Decimal): void { this.valorMultas = v; }

  getPagoMultas(): Decimal { return this.pagoMultas; }
  setPagoMultas(v: Decimal): void { this.pagoMultas = v; }

  getTotalValor(): Decimal {
    return this.valorHonorarios.plus(this.valorMultas);
  }
}
