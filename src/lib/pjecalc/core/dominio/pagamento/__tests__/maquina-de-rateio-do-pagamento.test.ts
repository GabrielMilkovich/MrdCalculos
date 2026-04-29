/**
 * Testes para MaquinaDeRateioDoPagamento (porte 1:1 do Java).
 * Cobre cenários documentados nos comentários do Java original.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { Pagamento } from '../pagamento';
import {
  MaquinaDeRateioDoPagamento,
  type RateioInput,
} from '../maquina-de-rateio-do-pagamento';

Decimal.set({ precision: 20 });

function novoPagamento(opts: {
  valorPagamento: number | string;
  recolherDebitosReclamante?: boolean;
  priorizarPagamentoDeJuros?: boolean;
}): Pagamento {
  const p = new Pagamento();
  p.setValorPagamento(new Decimal(opts.valorPagamento));
  p.setRecolherDebitosReclamante(opts.recolherDebitosReclamante ?? true);
  p.setPriorizarPagamentoDeJuros(opts.priorizarPagamentoDeJuros ?? false);
  return p;
}

const D = (v: number | string) => new Decimal(v);

describe('MaquinaDeRateioDoPagamento', () => {
  it('caso 1: pagamento integral cobre tudo (sobra zero)', () => {
    const pag = novoPagamento({ valorPagamento: 10000 });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const input: RateioInput = {
      creditos: {
        totalDevidoPrincipal: D(5000),
        totalDevidoFgts: D(1000),
        totalDevidoMultasDevidasReclamante: D(500),
      },
      debitos: {
        custasJudiciais: D(200),
        descontoCS: D(800),
        irpfReclamante: D(500),
        pensaoAlimenticia: D(0),
        previdenciaPrivada: D(0),
        honorarios: D(1000),
        multasTerceiros: D(1000),
      },
    };
    const r = m.ratearPagamento(input);
    // Total devido = 200 + 800 + 500 + 1000 + 1000 + 5000 + 1000 + 500 = 10000
    expect(r.sobra.toFixed(2)).toBe('0.00');
    expect(r.totalAplicado.toFixed(2)).toBe('10000.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial.toFixed(2)).toBe('800.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante.toFixed(2)).toBe('500.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteCustasJudiciais.toFixed(2)).toBe('200.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteHonorarios.toFixed(2)).toBe('1000.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteMultasTerceiros.toFixed(2)).toBe('1000.00');
    expect(r.credito.valorParaPagamentoCreditoReclamantePrincipal.toFixed(2)).toBe('5000.00');
    expect(r.credito.valorParaPagamentoCreditoReclamanteFgts.toFixed(2)).toBe('1000.00');
    expect(r.credito.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante.toFixed(2)).toBe('500.00');
  });

  it('caso 2: pagamento que cobre exatamente as deduções obrigatórias (zero saldo restante)', () => {
    const pag = novoPagamento({ valorPagamento: 1500 });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const r = m.ratearPagamento({
      debitos: {
        descontoCS: D(800),
        irpfReclamante: D(500),
        pensaoAlimenticia: D(200),
      },
      creditos: {
        totalDevidoPrincipal: D(10000),
      },
    });
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial.toFixed(2)).toBe('800.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante.toFixed(2)).toBe('500.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamantePensaoAlimenticia.toFixed(2)).toBe('200.00');
    expect(r.credito.valorParaPagamentoCreditoReclamantePrincipal.toFixed(2)).toBe('0.00');
    expect(r.sobra.toFixed(2)).toBe('0.00');
  });

  it('caso 3: pagamento parcial NÃO cobre nem deduções obrigatórias (rateio proporcional)', () => {
    const pag = novoPagamento({ valorPagamento: 100 });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const r = m.ratearPagamento({
      debitos: {
        descontoCS: D(800),
        irpfReclamante: D(500),
        pensaoAlimenticia: D(200),
        previdenciaPrivada: D(500),
      },
    });
    // Total das deduções = 2000; pagamento = 100; rateio proporcional
    const total = r.debitos.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial
      .plus(r.debitos.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante)
      .plus(r.debitos.valorParaRecolhimentoDebitosReclamantePensaoAlimenticia)
      .plus(r.debitos.valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada);
    expect(total.toFixed(2)).toBe('100.00');
    // Custas/honorários/crédito não receberam nada
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteCustasJudiciais.toFixed(2)).toBe('0.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteHonorarios.toFixed(2)).toBe('0.00');
    expect(r.sobra.toFixed(2)).toBe('0.00');
  });

  it('caso 4: deduções cobertas, custas parciais (sem chegar em honorários nem crédito)', () => {
    const pag = novoPagamento({ valorPagamento: 1000 });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const r = m.ratearPagamento({
      debitos: {
        descontoCS: D(500),
        custasJudiciais: D(800),
        honorarios: D(1000),
      },
      creditos: { totalDevidoPrincipal: D(5000) },
    });
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial.toFixed(2)).toBe('500.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteCustasJudiciais.toFixed(2)).toBe('500.00'); // saldo 1000-500 = 500
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteHonorarios.toFixed(2)).toBe('0.00');
    expect(r.credito.valorParaPagamentoCreditoReclamantePrincipal.toFixed(2)).toBe('0.00');
    expect(r.sobra.toFixed(2)).toBe('0.00');
  });

  it('caso 5: honorários + multas terceiros distribuídos proporcionalmente quando saldo insuficiente', () => {
    // Total deduções = 100, pagamento = 200 (sobram 100)
    // honorarios=300, multas=300 (total=600, saldo=100). Cada um leva 50 (proporcional 1:1).
    const pag = novoPagamento({ valorPagamento: 200 });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const r = m.ratearPagamento({
      debitos: {
        descontoCS: D(100),
        honorarios: D(300),
        multasTerceiros: D(300),
      },
    });
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial.toFixed(2)).toBe('100.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteHonorarios.toFixed(2)).toBe('50.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteMultasTerceiros.toFixed(2)).toBe('50.00');
    expect(r.sobra.toFixed(2)).toBe('0.00');
  });

  it('caso 6: priorizarPagamentoDeJuros consome juros antes do principal "limpo"', () => {
    const pag = novoPagamento({
      valorPagamento: 600,
      priorizarPagamentoDeJuros: true,
    });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const r = m.ratearPagamento({
      creditos: {
        totalDevidoPrincipal: D(1000),
        jurosPrincipal: D(400),
        totalDevidoFgts: D(500),
        jurosFgts: D(100),
      },
    });
    // Ordem: jurosPrincipal(400) → jurosFgts(100) → resto principal(600) → resto FGTS(400)
    // Saldo 600 → consome 400 juros principal, 100 juros FGTS, sobra 100 → vai pro principal sem juros.
    expect(r.credito.valorParaPagamentoCreditoReclamantePrincipal.toFixed(2)).toBe('500.00');
    expect(r.credito.valorParaPagamentoCreditoReclamanteFgts.toFixed(2)).toBe('100.00');
    expect(r.sobra.toFixed(2)).toBe('0.00');
  });

  it('caso 7: recolherDebitosReclamante=false envia tudo pro crédito', () => {
    const pag = novoPagamento({
      valorPagamento: 1000,
      recolherDebitosReclamante: false,
    });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const r = m.ratearPagamento({
      creditos: { totalDevidoPrincipal: D(2000) },
      debitos: {
        descontoCS: D(500),
        custasJudiciais: D(200),
        honorarios: D(300),
      },
    });
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial.toFixed(2)).toBe('0.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteCustasJudiciais.toFixed(2)).toBe('0.00');
    expect(r.debitos.valorParaRecolhimentoDebitosReclamanteHonorarios.toFixed(2)).toBe('0.00');
    // Tudo no crédito (proporcional, mas só uma parcela → integral até saldo)
    expect(r.credito.valorParaPagamentoCreditoReclamantePrincipal.toFixed(2)).toBe('1000.00');
    expect(r.sobra.toFixed(2)).toBe('0.00');
  });

  it('caso 8: multas devidas AO reclamado abatem antes do principal/FGTS', () => {
    const pag = novoPagamento({ valorPagamento: 1000 });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const r = m.ratearPagamento({
      creditos: {
        totalDevidoPrincipal: D(2000),
        totalDevidoMultasDevidasReclamado: D(300),
      },
    });
    expect(r.credito.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado.toFixed(2)).toBe('300.00');
    expect(r.credito.valorParaPagamentoCreditoReclamantePrincipal.toFixed(2)).toBe('700.00');
    expect(r.sobra.toFixed(2)).toBe('0.00');
  });

  it('caso 9: sobra positiva quando pagamento excede tudo', () => {
    const pag = novoPagamento({ valorPagamento: 10000 });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const r = m.ratearPagamento({
      creditos: { totalDevidoPrincipal: D(1000) },
      debitos: { descontoCS: D(500) },
    });
    expect(r.totalAplicado.toFixed(2)).toBe('1500.00');
    expect(r.sobra.toFixed(2)).toBe('8500.00');
  });

  it('caso 10: rateio proporcional no crédito quando saldo < total devido (sem priorizar juros)', () => {
    // Saldo final no crédito = 600; principal=300, FGTS=300 → cada um leva 300.
    const pag = novoPagamento({ valorPagamento: 600 });
    const m = new MaquinaDeRateioDoPagamento(pag);
    const r = m.ratearPagamento({
      creditos: {
        totalDevidoPrincipal: D(900),
        totalDevidoFgts: D(900),
      },
    });
    expect(r.credito.valorParaPagamentoCreditoReclamantePrincipal.toFixed(2)).toBe('300.00');
    expect(r.credito.valorParaPagamentoCreditoReclamanteFgts.toFixed(2)).toBe('300.00');
    expect(r.sobra.toFixed(2)).toBe('0.00');
  });

  it('caso 11: getters de inspeção espelham campos Java', () => {
    const pag = novoPagamento({ valorPagamento: 1000 });
    const m = new MaquinaDeRateioDoPagamento(pag);
    m.ratearPagamento({
      creditos: { totalDevidoPrincipal: D(2000) },
      debitos: { descontoCS: D(300) },
    });
    expect(m.getValorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial().toFixed(2)).toBe('300.00');
    expect(m.getValorParaPagamentoCreditoReclamantePrincipal().toFixed(2)).toBe('700.00');
    expect(m.getPagamento()).toBe(pag);
  });
});
