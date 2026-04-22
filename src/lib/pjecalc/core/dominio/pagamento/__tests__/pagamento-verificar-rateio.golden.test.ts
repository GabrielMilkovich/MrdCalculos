/**
 * Pagamento.verificarRateioInicial — golden (Fase 7)
 *
 * Fidelidade 1-a-1 com Pagamento.java:425-432.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { Pagamento } from '../pagamento';
import { Mensagens } from '../../../comum/mensagens';

describe('Pagamento.verificarRateioInicial', () => {
  it('soma das parcelas = valorPagamento: não acumula mensagem', () => {
    const p = new Pagamento();
    p.setValorPagamento(new Decimal(1000));
    p.setValorParcelaCreditoReclamante(new Decimal(700));
    p.setValorParcelaOutrosDebitos(new Decimal(200));
    p.setValorParcelaDebitosCobrarDoReclamante(new Decimal(100));
    const e = p.verificarRateioInicial();
    expect(e.existeMensagensDeRecurso()).toBe(false);
  });

  it('soma divergente: MSG0125', () => {
    const p = new Pagamento();
    p.setValorPagamento(new Decimal(1000));
    p.setValorParcelaCreditoReclamante(new Decimal(500));
    // outras duas nulas → soma = 500 ≠ 1000
    const e = p.verificarRateioInicial();
    expect(e.existeMensagensDeRecurso()).toBe(true);
    const msg = e.getMensagensDeRecurso()[0];
    expect(msg.getChave()).toBe(Mensagens.MSG0125);
  });

  it('parcelas nulas tratadas como zero', () => {
    const p = new Pagamento();
    p.setValorPagamento(new Decimal(0));
    // todas as 3 parcelas null → soma = 0 = valor → OK
    const e = p.verificarRateioInicial();
    expect(e.existeMensagensDeRecurso()).toBe(false);
  });

  it('valorPagamento null tratado como zero (soma igual → OK)', () => {
    const p = new Pagamento();
    // valorPagamento null; parcelas null → soma 0 = 0 → OK
    const e = p.verificarRateioInicial();
    expect(e.existeMensagensDeRecurso()).toBe(false);
  });

  it('retorna NegocioException (não lança)', () => {
    const p = new Pagamento();
    p.setValorPagamento(new Decimal(1000));
    p.setValorParcelaCreditoReclamante(new Decimal(0));
    // soma 0 ≠ 1000 → acumula mensagem mas NÃO lança
    expect(() => p.verificarRateioInicial()).not.toThrow();
  });
});
