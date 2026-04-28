/**
 * PagamentoUtils — golden tests (Fase 7)
 *
 * Fidelidade 1-a-1 com PagamentoUtils.java v2.15.1:
 *   - ratearValor (L338-357) + arrumarArredondamento (L359-387)
 *   - analisarMultas (L233-269)
 *   - analisarHonorarios (L271-297)
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { PagamentoUtils } from '../pagamento-utils';
import { Multa } from '../../calculo/multa/multa';
import { Honorario } from '../../calculo/honorarios/honorario';
import {
  CredorDevedorMultaEnum,
  TipoCobrancaReclamanteEnum,
  TipoDeDevedorDoHonorarioEnum,
} from '../../../constantes/enums';

// ──────────────────────────────────────────────────────────────────
//  ratearValor
// ──────────────────────────────────────────────────────────────────

describe('PagamentoUtils.ratearValor', () => {
  it('parcelas iguais: divide em partes iguais', () => {
    const r = PagamentoUtils.ratearValor(new Decimal(100), [
      new Decimal(1),
      new Decimal(1),
      new Decimal(1),
      new Decimal(1),
    ]);
    // 100 / 4 = 25 cada
    expect(r.map(x => x.toString())).toEqual(['25', '25', '25', '25']);
  });

  it('parcelas proporcionais: rateia proporcionalmente', () => {
    const r = PagamentoUtils.ratearValor(new Decimal(100), [
      new Decimal(1),
      new Decimal(2),
      new Decimal(3),
      new Decimal(4),
    ]);
    // total = 10; fatores 0.1, 0.2, 0.3, 0.4 → 10, 20, 30, 40
    expect(r.map(x => x.toString())).toEqual(['10', '20', '30', '40']);
  });

  it('soma das parcelas zero: retorna vetor zerado', () => {
    const r = PagamentoUtils.ratearValor(new Decimal(100), [
      new Decimal(0),
      new Decimal(0),
      new Decimal(0),
    ]);
    expect(r.map(x => x.toString())).toEqual(['0', '0', '0']);
  });

  it('ajuste de arredondamento: garante soma = valor', () => {
    // R$ 100 dividido entre 3 iguais (100/3 = 33.33 cada; 3*33.33 = 99.99)
    // Delta = 0.01; centavo-a-centavo na maior; resultado soma = 100
    const r = PagamentoUtils.ratearValor(new Decimal(100), [
      new Decimal(1),
      new Decimal(1),
      new Decimal(1),
    ]);
    const total = r.reduce((acc, x) => acc.plus(x), new Decimal(0));
    expect(total.toString()).toBe('100');
    // exatamente uma parcela ajustada
    const somaCentavos = r.map(x => x.minus('33.33').abs()).reduce((acc, x) => acc.plus(x), new Decimal(0));
    expect(somaCentavos.toString()).toBe('0.01'); // só uma parcela diferente
  });

  it('parcela única: recebe 100% do valor', () => {
    const r = PagamentoUtils.ratearValor(new Decimal(500), [new Decimal(1)]);
    expect(r[0].toString()).toBe('500');
  });

  it('parcelas nulas tratadas como zero', () => {
    const r = PagamentoUtils.ratearValor(new Decimal(100), [
      new Decimal(1),
      null,
      new Decimal(1),
    ]);
    // total = 2; 50-0-50
    expect(r.map(x => x.toString())).toEqual(['50', '0', '50']);
  });

  it('rateio sobre valor com decimais (R$33.33 entre 2 proporcionais)', () => {
    const r = PagamentoUtils.ratearValor(new Decimal('33.33'), [
      new Decimal(1),
      new Decimal(1),
    ]);
    // 16.665 cada → arredondado 16.67 e 16.66 (ou vice-versa) somam 33.33
    const total = r[0].plus(r[1]);
    expect(total.toString()).toBe('33.33');
  });
});

// ──────────────────────────────────────────────────────────────────
//  arrumarArredondamento (via método exposto p/ testes)
// ──────────────────────────────────────────────────────────────────

describe('PagamentoUtils.arrumarArredondamento (interno)', () => {
  it('diferença positiva: subtrai centavo da maior', () => {
    const rateios = [new Decimal('10.00'), new Decimal('20.00'), new Decimal('0.01')];
    // soma = 30.01; valor alvo = 30 → delta +0.01 → subtrai 1 centavo na maior (20.00 → 19.99)
    PagamentoUtils.__arrumarArredondamentoForTests(rateios, new Decimal(30));
    expect(rateios.map(x => x.toString())).toEqual(['10', '19.99', '0.01']);
  });

  it('diferença negativa: soma centavo na maior', () => {
    const rateios = [new Decimal('10.00'), new Decimal('19.99'), new Decimal('0.00')];
    // soma = 29.99; valor = 30 → delta -0.01 → soma 1 centavo em 19.99 → 20.00
    PagamentoUtils.__arrumarArredondamentoForTests(rateios, new Decimal(30));
    expect(rateios.map(x => x.toString())).toEqual(['10', '20', '0']);
  });

  it('diferença zero: no-op', () => {
    const rateios = [new Decimal('10.00'), new Decimal('20.00')];
    PagamentoUtils.__arrumarArredondamentoForTests(rateios, new Decimal(30));
    expect(rateios.map(x => x.toString())).toEqual(['10', '20']);
  });
});

// ──────────────────────────────────────────────────────────────────
//  analisarMultas
// ──────────────────────────────────────────────────────────────────

function makeMulta(
  tipo: CredorDevedorMultaEnum,
  tipoCobrancaReclamante: TipoCobrancaReclamanteEnum = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO,
): Multa {
  const m = new Multa();
  m.setTipoCredorDevedor(tipo);
  m.setTipoCobrancaReclamante(tipoCobrancaReclamante);
  return m;
}

describe('PagamentoUtils.analisarMultas', () => {
  it('lista vazia: todos flags false e listas vazias', () => {
    const r = PagamentoUtils.analisarMultas([]);
    expect(r.existeMultaDevidaPeloReclamadoParaReclamante).toBe(false);
    expect(r.existeMultaDevidaPeloReclamanteParaReclamado).toBe(false);
    expect(r.existeMultaDevidaPeloReclamanteParaTerceiros).toBe(false);
    expect(r.existeMultaDevidaPeloReclamadoParaTerceiros).toBe(false);
    expect(r.existeMultaACobrarDoReclamanteParaTerceiros).toBe(false);
    expect(r.listaDeMultasDevidasPeloReclamanteParaTerceiros).toEqual([]);
    expect(r.listaDeMultasDevidasPeloReclamadoParaTerceiros).toEqual([]);
    expect(r.listaDeMultasACobrarDoReclamanteParaTerceiros).toEqual([]);
  });

  it('RECLAMADO_RECLAMANTE: marca reclamante→reclamado', () => {
    const m = makeMulta(CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE);
    const r = PagamentoUtils.analisarMultas([m]);
    expect(r.existeMultaDevidaPeloReclamanteParaReclamado).toBe(true);
    expect(r.existeMultaDevidaPeloReclamadoParaReclamante).toBe(false);
  });

  it('RECLAMANTE_RECLAMADO: marca reclamado→reclamante', () => {
    const m = makeMulta(CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO);
    const r = PagamentoUtils.analisarMultas([m]);
    expect(r.existeMultaDevidaPeloReclamadoParaReclamante).toBe(true);
  });

  it('TERCEIRO_RECLAMANTE com COBRAR → ACobrar', () => {
    const m = makeMulta(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE, TipoCobrancaReclamanteEnum.COBRAR);
    const r = PagamentoUtils.analisarMultas([m]);
    expect(r.existeMultaACobrarDoReclamanteParaTerceiros).toBe(true);
    expect(r.listaDeMultasACobrarDoReclamanteParaTerceiros).toEqual([m]);
    expect(r.existeMultaDevidaPeloReclamanteParaTerceiros).toBe(false);
  });

  it('TERCEIRO_RECLAMANTE sem COBRAR → devida pelo reclamante', () => {
    const m = makeMulta(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE, TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO);
    const r = PagamentoUtils.analisarMultas([m]);
    expect(r.existeMultaDevidaPeloReclamanteParaTerceiros).toBe(true);
    expect(r.listaDeMultasDevidasPeloReclamanteParaTerceiros).toEqual([m]);
    expect(r.existeMultaACobrarDoReclamanteParaTerceiros).toBe(false);
  });

  it('TERCEIRO_RECLAMADO: marca reclamado→terceiros', () => {
    const m = makeMulta(CredorDevedorMultaEnum.TERCEIRO_RECLAMADO);
    const r = PagamentoUtils.analisarMultas([m]);
    expect(r.existeMultaDevidaPeloReclamadoParaTerceiros).toBe(true);
    expect(r.listaDeMultasDevidasPeloReclamadoParaTerceiros).toEqual([m]);
  });

  it('múltiplas multas acumulam em listas corretas', () => {
    const a = makeMulta(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE, TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO);
    const b = makeMulta(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE, TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO);
    const c = makeMulta(CredorDevedorMultaEnum.TERCEIRO_RECLAMADO);
    const r = PagamentoUtils.analisarMultas([a, b, c]);
    expect(r.listaDeMultasDevidasPeloReclamanteParaTerceiros).toEqual([a, b]);
    expect(r.listaDeMultasDevidasPeloReclamadoParaTerceiros).toEqual([c]);
  });
});

// ──────────────────────────────────────────────────────────────────
//  analisarHonorarios
// ──────────────────────────────────────────────────────────────────

function makeHonorario(
  tipoDevedor: TipoDeDevedorDoHonorarioEnum,
  tipoCobrancaReclamante: TipoCobrancaReclamanteEnum = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO,
): Honorario {
  const h = new Honorario();
  // tipoDevedor: alguns Honorario.ts podem ter setter direto; se não, setamos via cast
  (h as unknown as { tipoDeDevedor: TipoDeDevedorDoHonorarioEnum }).tipoDeDevedor = tipoDevedor;
  (h as unknown as { tipoCobrancaReclamante: TipoCobrancaReclamanteEnum }).tipoCobrancaReclamante =
    tipoCobrancaReclamante;
  return h;
}

describe('PagamentoUtils.analisarHonorarios', () => {
  it('lista vazia: todos flags false', () => {
    const r = PagamentoUtils.analisarHonorarios([]);
    expect(r.existeHonorarioDevidoPeloReclamante).toBe(false);
    expect(r.existeHonorarioDevidoPeloReclamado).toBe(false);
    expect(r.existeHonorarioACobrarDoReclamante).toBe(false);
    expect(r.listaDeHonorariosDevidosPeloReclamante).toEqual([]);
    expect(r.listaDeHonorariosDevidosPeloReclamado).toEqual([]);
    expect(r.listaDeHonorariosACobrarDoReclamante).toEqual([]);
  });

  it('RECLAMANTE com COBRAR → ACobrar', () => {
    const h = makeHonorario(TipoDeDevedorDoHonorarioEnum.RECLAMANTE, TipoCobrancaReclamanteEnum.COBRAR);
    const r = PagamentoUtils.analisarHonorarios([h]);
    expect(r.existeHonorarioACobrarDoReclamante).toBe(true);
    expect(r.listaDeHonorariosACobrarDoReclamante).toEqual([h]);
    expect(r.existeHonorarioDevidoPeloReclamante).toBe(false);
  });

  it('RECLAMANTE sem COBRAR → devido pelo reclamante', () => {
    const h = makeHonorario(TipoDeDevedorDoHonorarioEnum.RECLAMANTE, TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO);
    const r = PagamentoUtils.analisarHonorarios([h]);
    expect(r.existeHonorarioDevidoPeloReclamante).toBe(true);
    expect(r.listaDeHonorariosDevidosPeloReclamante).toEqual([h]);
  });

  it('RECLAMADO → devido pelo reclamado', () => {
    const h = makeHonorario(TipoDeDevedorDoHonorarioEnum.RECLAMADO);
    const r = PagamentoUtils.analisarHonorarios([h]);
    expect(r.existeHonorarioDevidoPeloReclamado).toBe(true);
    expect(r.listaDeHonorariosDevidosPeloReclamado).toEqual([h]);
  });

  it('misto: acumula em todas as listas corretas', () => {
    const a = makeHonorario(TipoDeDevedorDoHonorarioEnum.RECLAMADO);
    const b = makeHonorario(TipoDeDevedorDoHonorarioEnum.RECLAMANTE, TipoCobrancaReclamanteEnum.COBRAR);
    const c = makeHonorario(TipoDeDevedorDoHonorarioEnum.RECLAMANTE, TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO);
    const r = PagamentoUtils.analisarHonorarios([a, b, c]);
    expect(r.listaDeHonorariosDevidosPeloReclamado).toEqual([a]);
    expect(r.listaDeHonorariosACobrarDoReclamante).toEqual([b]);
    expect(r.listaDeHonorariosDevidosPeloReclamante).toEqual([c]);
  });
});
