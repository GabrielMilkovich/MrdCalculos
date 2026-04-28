/**
 * VerbaDeCalculo — métodos de vinculação (Fase 3)
 *
 * Fidelidade 1-a-1 com VerbaDeCalculo.java v2.15.1 (linhas 847–975):
 *   - adicionar/removerDosCartoesDaVerbaDa(Quantidade|Divisor)
 *   - adicionar/removerDosHistoricosDaVerbaDo(ValorDevido|ValorPago)
 *   - adicionar/removerDosValesDaVerbaDo(ValorDevido|ValorPago)
 *
 * Contratos testados:
 *   1. `adicionar*` LIMPA a coleção destino antes de inserir.
 *   2. `adicionar*` chama `item.setVerbaDeCalculo(this)` em cada item.
 *   3. `remover*` ignora itens com `id == null` (transientes permanecem).
 *   4. `remover*` com id != null descarta o item da lista específica.
 */
import { describe, it, expect } from 'vitest';

import { VerbaDeCalculo } from '../verba-de-calculo';
import { CartaoDePontoDaVerba } from '../cartao-de-ponto-da-verba';
import { HistoricoSalarialDaVerba } from '../historico-salarial-da-verba';
import { ValeTransporteDaVerba } from '../vale-transporte-da-verba';

// ──────────────────────────────────────────────────────────────────────────
//  Cartões de ponto
// ──────────────────────────────────────────────────────────────────────────

describe('VerbaDeCalculo — cartões vinculados através da quantidade', () => {
  it('adicionar limpa a coleção e ancora cada cartão na verba', () => {
    const v = new VerbaDeCalculo();
    const c1 = new CartaoDePontoDaVerba();
    const c2 = new CartaoDePontoDaVerba();

    v.adicionarCartoesVinculadosAtravesDaQuantidade([c1, c2]);

    expect(v.getCartoesDePontoDaVerbaQuantidade()).toHaveLength(2);
    expect(c1.getVerbaDeCalculo()).toBe(v);
    expect(c2.getVerbaDeCalculo()).toBe(v);
  });

  it('segunda chamada substitui a coleção (clear + add)', () => {
    const v = new VerbaDeCalculo();
    const c1 = new CartaoDePontoDaVerba();
    const c2 = new CartaoDePontoDaVerba();
    const c3 = new CartaoDePontoDaVerba();

    v.adicionarCartoesVinculadosAtravesDaQuantidade([c1, c2]);
    v.adicionarCartoesVinculadosAtravesDaQuantidade([c3]);

    expect(v.getCartoesDePontoDaVerbaQuantidade()).toEqual([c3]);
    expect(c3.getVerbaDeCalculo()).toBe(v);
  });

  it('remover ignora cartões com id null', () => {
    const v = new VerbaDeCalculo();
    const transiente = new CartaoDePontoDaVerba();
    const persistido = new CartaoDePontoDaVerba();
    persistido.setId(42);

    v.adicionarCartoesVinculadosAtravesDaQuantidade([transiente, persistido]);
    v.removerDosCartoesDaVerbaDaQuantidade([transiente, persistido]);

    expect(v.getCartoesDePontoDaVerbaQuantidade()).toEqual([transiente]);
  });
});

describe('VerbaDeCalculo — cartões vinculados através do divisor', () => {
  it('adicionar limpa e ancora', () => {
    const v = new VerbaDeCalculo();
    const c = new CartaoDePontoDaVerba();
    v.adicionarCartoesVinculadosAtravesDoDivisor([c]);
    expect(v.getCartoesDePontoDaVerbaDivisor()).toEqual([c]);
    expect(c.getVerbaDeCalculo()).toBe(v);
  });

  it('remover ignora id null', () => {
    const v = new VerbaDeCalculo();
    const a = new CartaoDePontoDaVerba();
    const b = new CartaoDePontoDaVerba();
    b.setId(1);
    v.adicionarCartoesVinculadosAtravesDoDivisor([a, b]);
    v.removerDosCartoesDaVerbaDoDivisor([a, b]);
    expect(v.getCartoesDePontoDaVerbaDivisor()).toEqual([a]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
//  Históricos salariais
// ──────────────────────────────────────────────────────────────────────────

describe('VerbaDeCalculo — históricos vinculados (valor devido)', () => {
  it('adicionar limpa e ancora', () => {
    const v = new VerbaDeCalculo();
    const h1 = new HistoricoSalarialDaVerba();
    const h2 = new HistoricoSalarialDaVerba();
    v.adicionarHistoricosVinculadosAtravesDoValorDevido([h1, h2]);
    expect(v.getHistoricosDaVerbaDoValorDevido()).toHaveLength(2);
    expect(h1.getVerbaDeCalculo()).toBe(v);
    expect(h2.getVerbaDeCalculo()).toBe(v);
  });

  it('remover ignora id null', () => {
    const v = new VerbaDeCalculo();
    const a = new HistoricoSalarialDaVerba();
    const b = new HistoricoSalarialDaVerba();
    b.setId(10);
    v.adicionarHistoricosVinculadosAtravesDoValorDevido([a, b]);
    v.removerDosHistoricosDaVerbaDoValorDevido([a, b]);
    expect(v.getHistoricosDaVerbaDoValorDevido()).toEqual([a]);
  });
});

describe('VerbaDeCalculo — históricos vinculados (valor pago)', () => {
  it('adicionar limpa e ancora', () => {
    const v = new VerbaDeCalculo();
    const h = new HistoricoSalarialDaVerba();
    v.adicionarHistoricosVinculadosAtravesDoValorPago([h]);
    expect(v.getHistoricosDaVerbaDoValorPago()).toEqual([h]);
    expect(h.getVerbaDeCalculo()).toBe(v);
  });

  it('remover ignora id null', () => {
    const v = new VerbaDeCalculo();
    const a = new HistoricoSalarialDaVerba();
    const b = new HistoricoSalarialDaVerba();
    b.setId(77);
    v.adicionarHistoricosVinculadosAtravesDoValorPago([a, b]);
    v.removerDosHistoricosDaVerbaDoValorPago([a, b]);
    expect(v.getHistoricosDaVerbaDoValorPago()).toEqual([a]);
  });

  it('valor-devido e valor-pago são coleções independentes', () => {
    const v = new VerbaDeCalculo();
    const hD = new HistoricoSalarialDaVerba();
    const hP = new HistoricoSalarialDaVerba();
    v.adicionarHistoricosVinculadosAtravesDoValorDevido([hD]);
    v.adicionarHistoricosVinculadosAtravesDoValorPago([hP]);
    expect(v.getHistoricosDaVerbaDoValorDevido()).toEqual([hD]);
    expect(v.getHistoricosDaVerbaDoValorPago()).toEqual([hP]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
//  Vale-transporte
// ──────────────────────────────────────────────────────────────────────────

describe('VerbaDeCalculo — vales vinculados (valor devido)', () => {
  it('adicionar limpa e ancora', () => {
    const v = new VerbaDeCalculo();
    const vt = new ValeTransporteDaVerba();
    v.adicionarValesVinculadosAtravesDoValorDevido([vt]);
    expect(v.getValesTransportesDoValorDevido()).toEqual([vt]);
    expect(vt.getVerbaDeCalculo()).toBe(v);
  });

  it('remover ignora id null', () => {
    const v = new VerbaDeCalculo();
    const a = new ValeTransporteDaVerba();
    const b = new ValeTransporteDaVerba();
    b.setId(5);
    v.adicionarValesVinculadosAtravesDoValorDevido([a, b]);
    v.removerDosValesDaVerbaDoValorDevido([a, b]);
    expect(v.getValesTransportesDoValorDevido()).toEqual([a]);
  });
});

describe('VerbaDeCalculo — vales vinculados (valor pago)', () => {
  it('adicionar limpa e ancora', () => {
    const v = new VerbaDeCalculo();
    const vt = new ValeTransporteDaVerba();
    v.adicionarValesVinculadosAtravesDoValorPago([vt]);
    expect(v.getValesTransportesDoValorPago()).toEqual([vt]);
    expect(vt.getVerbaDeCalculo()).toBe(v);
  });

  it('remover ignora id null', () => {
    const v = new VerbaDeCalculo();
    const a = new ValeTransporteDaVerba();
    const b = new ValeTransporteDaVerba();
    b.setId(99);
    v.adicionarValesVinculadosAtravesDoValorPago([a, b]);
    v.removerDosValesDaVerbaDoValorPago([a, b]);
    expect(v.getValesTransportesDoValorPago()).toEqual([a]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
//  Re-ancoragem entre verbas (bug UUID-versus-name — auditoria §7)
// ──────────────────────────────────────────────────────────────────────────

describe('VerbaDeCalculo — re-ancoragem em verba diferente', () => {
  it('adicionar sobrescreve o vínculo de verba anterior do item', () => {
    const v1 = new VerbaDeCalculo();
    const v2 = new VerbaDeCalculo();
    const c = new CartaoDePontoDaVerba();

    v1.adicionarCartoesVinculadosAtravesDaQuantidade([c]);
    expect(c.getVerbaDeCalculo()).toBe(v1);

    v2.adicionarCartoesVinculadosAtravesDaQuantidade([c]);
    expect(c.getVerbaDeCalculo()).toBe(v2);
    expect(v1.getCartoesDePontoDaVerbaQuantidade()).toHaveLength(1); // não é removido da anterior — Java idem
    expect(v2.getCartoesDePontoDaVerbaQuantidade()).toHaveLength(1);
  });
});
