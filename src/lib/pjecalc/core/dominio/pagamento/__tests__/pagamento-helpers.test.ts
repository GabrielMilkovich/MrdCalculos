import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { Pagamento } from '../pagamento';
import {
  aplicarPagamentoEmCustasJudiciais,
  calcularDescontosObrigatorios,
  calcularLiquidoPago,
  calcularSaldoCreditoReclamante,
  calcularValorAmortizado,
  validarPagamento,
} from '../pagamento-helpers';

function setupBasico(): Pagamento {
  const p = new Pagamento();
  p.setDataPagamento(new Date('2024-06-01'));
  p.setValorPagamento(new Decimal(10000));
  p.setValorParcelaCreditoReclamante(new Decimal(7000));
  p.setValorParcelaOutrosDebitos(new Decimal(2000));
  p.setValorParcelaDebitosCobrarDoReclamante(new Decimal(1000));
  return p;
}

describe('pagamento-helpers — Java 1:1', () => {
  describe('calcularValorAmortizado', () => {
    it('soma Principal + FGTS + Multas Devidas Reclamante', () => {
      const p = setupBasico();
      p.setValorParcelaPrincipal(new Decimal(3000));
      p.setValorParcelaFgts(new Decimal(1500));
      p.setValorParcelaMultasDevidasReclamante(new Decimal(500));
      expect(calcularValorAmortizado(p).toNumber()).toBe(5000);
    });

    it('zero quando todas as parcelas null', () => {
      const p = new Pagamento();
      expect(calcularValorAmortizado(p).toNumber()).toBe(0);
    });
  });

  describe('calcularSaldoCreditoReclamante', () => {
    it('credito - amortizado', () => {
      const p = setupBasico();
      p.setValorParcelaPrincipal(new Decimal(3000));
      p.setValorParcelaFgts(new Decimal(1500));
      // amortizado = 4500; credito = 7000; saldo = 2500
      expect(calcularSaldoCreditoReclamante(p).toNumber()).toBe(2500);
    });

    it('saldo negativo se amortizado > credito', () => {
      const p = setupBasico();
      p.setValorParcelaPrincipal(new Decimal(8000));
      expect(calcularSaldoCreditoReclamante(p).toNumber()).toBe(-1000);
    });
  });

  describe('calcularDescontosObrigatorios', () => {
    it('soma CS+IRPF+Pensao+PrevPriv', () => {
      const p = setupBasico();
      p.setDescontoDaContribuicaoSocial(new Decimal(800));
      p.setImpostoDoReclamante(new Decimal(1200));
      p.setPensaoAlimenticia(new Decimal(500));
      p.setPrevidenciaPrivada(new Decimal(300));
      expect(calcularDescontosObrigatorios(p).toNumber()).toBe(2800);
    });

    it('zero quando todos null', () => {
      const p = new Pagamento();
      expect(calcularDescontosObrigatorios(p).toNumber()).toBe(0);
    });
  });

  describe('calcularLiquidoPago', () => {
    it('valorPagamento - descontos', () => {
      const p = setupBasico();
      p.setDescontoDaContribuicaoSocial(new Decimal(800));
      p.setImpostoDoReclamante(new Decimal(1200));
      // 10000 - 2000 = 8000
      expect(calcularLiquidoPago(p).toNumber()).toBe(8000);
    });
  });

  describe('aplicarPagamentoEmCustasJudiciais', () => {
    it('cobre devida e retorna sobra', () => {
      const p = setupBasico();
      p.setCustasJudiciais(new Decimal(500));
      const r = aplicarPagamentoEmCustasJudiciais(p, new Decimal(300));
      expect(r.aplicado.toNumber()).toBe(300);
      expect(r.sobra.toNumber()).toBe(200);
    });

    it('paga parcial sem sobra quando insuficiente', () => {
      const p = setupBasico();
      p.setCustasJudiciais(new Decimal(150));
      const r = aplicarPagamentoEmCustasJudiciais(p, new Decimal(300));
      expect(r.aplicado.toNumber()).toBe(150);
      expect(r.sobra.toNumber()).toBe(0);
    });
  });

  describe('validarPagamento', () => {
    it('OK quando soma das parcelas == valorPagamento', () => {
      const p = setupBasico();
      const erros = validarPagamento(p);
      expect(erros).toEqual([]);
    });

    it('erro quando valorPagamento <= 0', () => {
      const p = new Pagamento();
      p.setDataPagamento(new Date('2024-06-01'));
      p.setValorPagamento(new Decimal(0));
      const erros = validarPagamento(p);
      expect(erros.some(e => e.includes('valorPagamento deve ser maior que zero'))).toBe(true);
    });

    it('erro quando dataPagamento null', () => {
      const p = new Pagamento();
      p.setValorPagamento(new Decimal(1000));
      p.setValorParcelaCreditoReclamante(new Decimal(1000));
      const erros = validarPagamento(p);
      expect(erros.some(e => e.includes('dataPagamento eh obrigatoria'))).toBe(true);
    });

    it('erro quando rateio nao bate', () => {
      const p = setupBasico();
      p.setValorParcelaCreditoReclamante(new Decimal(8000)); // 8k+2k+1k = 11k != 10k
      const erros = validarPagamento(p);
      expect(erros.some(e => e.includes('Soma das parcelas'))).toBe(true);
    });

    it('erro quando amortizado > credito', () => {
      const p = setupBasico();
      p.setValorParcelaPrincipal(new Decimal(10000)); // > credito (7000)
      const erros = validarPagamento(p);
      expect(erros.some(e => e.includes('amortizado') && e.includes('excede'))).toBe(true);
    });

    it('erro quando descontos > valorPagamento', () => {
      const p = setupBasico();
      p.setImpostoDoReclamante(new Decimal(15000)); // > 10000
      const erros = validarPagamento(p);
      expect(erros.some(e => e.includes('Descontos obrigatorios'))).toBe(true);
    });
  });
});
