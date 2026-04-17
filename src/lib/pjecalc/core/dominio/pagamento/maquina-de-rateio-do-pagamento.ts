/**
 * PJe-Calc v2.15.1 — MaquinaDeRateioDoPagamento (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.MaquinaDeRateioDoPagamento
 *
 * Ref Java: pjecalc-fonte/.../pagamento/MaquinaDeRateioDoPagamento.java (~832 linhas)
 *
 * Orquestrador do rateio de um pagamento entre os 3 grupos:
 *   - Créditos do reclamante (principal + FGTS + juros)
 *   - Outros débitos do reclamado (INSS empresa, multas terceiros etc.)
 *   - Débitos a cobrar do reclamante
 *
 * Entradas: Pagamento, Calculo e listas de CreditosDoReclamante /
 * DebitosDoReclamante / OutrosDebitosReclamado / DebitosCobrarDoReclamante.
 * Aplica prioridades (priorizarPagamentoDeJuros), flags por categoria
 * (apurarValorPrincipal/Fgts/Multas*) e retorna valores amortizados.
 *
 * **Status**: stub estrutural. Implementação completa virá nas próximas
 * iterações, quando TabelaDeCorrecaoMonetaria e todos os módulos
 * dependentes estiverem estáveis.
 */
import type Decimal from 'decimal.js';
import type { Pagamento } from './pagamento';
import type { Atualizacao } from './atualizacao';
import type { Calculo } from '../calculo/calculo';
import type { CreditosDoReclamante } from './creditos-do-reclamante';
import type { DebitosDoReclamante } from './debitos-do-reclamante';
import type { OutrosDebitosReclamado } from './outros-debitos-reclamado';
import type { DebitosCobrarDoReclamante } from './debitos-cobrar-do-reclamante';

export interface ResultadoDoRateio {
  valorAplicadoPrincipal: Decimal;
  valorAplicadoFgts: Decimal;
  valorAplicadoJuros: Decimal;
  valorAplicadoOutrosDebitos: Decimal;
  valorAplicadoDebitosCobrar: Decimal;
  sobra: Decimal;
}

export class MaquinaDeRateioDoPagamento {
  private pagamento: Pagamento;
  private atualizacao: Atualizacao | null = null;
  private calculo: Calculo | null = null;

  constructor(pagamento: Pagamento, atualizacao?: Atualizacao) {
    this.pagamento = pagamento;
    this.atualizacao = atualizacao ?? null;
    this.calculo = pagamento.getCalculo();
  }

  getPagamento(): Pagamento { return this.pagamento; }
  setPagamento(p: Pagamento): void { this.pagamento = p; }
  getAtualizacao(): Atualizacao | null { return this.atualizacao; }
  setAtualizacao(a: Atualizacao | null): void { this.atualizacao = a; }
  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  /**
   * ratear (Java) — entry point. Distribui valorPagamento entre as 3 listas
   * seguindo as flags do Pagamento e as prioridades configuradas.
   *
   * TODO(fase-9): implementar.
   */
  ratear(
    _creditos: CreditosDoReclamante[],
    _debitos: DebitosDoReclamante[],
    _outrosDebitos: OutrosDebitosReclamado[],
    _debitosCobrar: DebitosCobrarDoReclamante[],
  ): ResultadoDoRateio | null {
    return null;
  }
}
