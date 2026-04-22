/**
 * AliquotasDoEmpregadorPorPeriodo — golden tests (Fase 5)
 *
 * Fidelidade 1-a-1 com AliquotasDoEmpregadorPorPeriodo.java v2.15.1:
 *   - validar() — L170-184
 *   - getPeriodo / isPeriodoCoincidenteCom — L158-167 (regression)
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { AliquotasDoEmpregadorPorPeriodo } from '../aliquotas-do-empregador-por-periodo';
import { Inss } from '../inss';
import { NegocioException } from '../../../../comum/exceptions/negocio-exception';
import { Mensagens } from '../../../../comum/mensagens';

function makeAliquota(
  inicio: Date | null,
  fim: Date | null,
  emp?: Decimal | null,
  rat?: Decimal | null,
  terc?: Decimal | null,
  inss?: Inss,
): AliquotasDoEmpregadorPorPeriodo {
  const a = new AliquotasDoEmpregadorPorPeriodo();
  a.setDataInicioPeriodo(inicio);
  a.setDataTerminoPeriodo(fim);
  if (emp !== undefined) a.setAliquotaEmpresa(emp);
  if (rat !== undefined) a.setAliquotaRAT(rat);
  if (terc !== undefined) a.setAliquotaTerceiros(terc);
  if (inss) a.setInss(inss);
  return a;
}

describe('AliquotasDoEmpregadorPorPeriodo.validar', () => {
  it('todas as 3 alíquotas nulas: lança NegocioException com 3 MSG0045', () => {
    const a = makeAliquota(new Date('2022-01-01'), new Date('2022-12-31'), null, null, null);
    try {
      a.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msgs = (e as NegocioException).getMensagensDeRecurso();
      expect(msgs.length).toBe(3);
      expect(msgs.every(m => m.getChave() === Mensagens.MSG0045)).toBe(true);
      const atributos = msgs.map(m => m.getAtributo()).sort();
      expect(atributos).toEqual([
        'aliquotaEmpresaPorPeriodo',
        'aliquotaRatPorPeriodo',
        'aliquotaTerceirosPorPeriodo',
      ]);
    }
  });

  it('ao menos 1 alíquota informada: passa quando não há inss ligado', () => {
    const a = makeAliquota(new Date('2022-01-01'), new Date('2022-12-31'), new Decimal('0.20'), null, null);
    expect(() => a.validar()).not.toThrow();
    expect(a.validar()).toBe(a); // retorna `this`
  });

  it('apenas aliquotaRAT preenchida: passa', () => {
    const a = makeAliquota(new Date('2022-01-01'), new Date('2022-12-31'), null, new Decimal('0.02'), null);
    expect(() => a.validar()).not.toThrow();
  });

  it('apenas aliquotaTerceiros preenchida: passa', () => {
    const a = makeAliquota(new Date('2022-01-01'), new Date('2022-12-31'), null, null, new Decimal('0.058'));
    expect(() => a.validar()).not.toThrow();
  });

  it('período coincidente com outro do mesmo Inss: lança MSG0024', () => {
    const inss = new Inss();
    const a = makeAliquota(new Date('2022-01-01'), new Date('2022-06-30'), new Decimal('0.20'), null, null, inss);
    const b = makeAliquota(new Date('2022-05-01'), new Date('2022-12-31'), new Decimal('0.20'), null, null, inss);
    inss.adicionarAliquotasPorPeriodo(a);
    inss.adicionarAliquotasPorPeriodo(b);

    try {
      b.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso()[0];
      expect(msg.getChave()).toBe(Mensagens.MSG0024);
      expect(msg.getAtributo()).toBe('dataTerminoPeriodo');
    }
  });

  it('período válido sem sobreposição: passa', () => {
    const inss = new Inss();
    const a = makeAliquota(new Date('2021-01-01'), new Date('2021-12-31'), new Decimal('0.20'), null, null, inss);
    const b = makeAliquota(new Date('2022-01-01'), new Date('2022-12-31'), new Decimal('0.20'), null, null, inss);
    inss.adicionarAliquotasPorPeriodo(a);
    inss.adicionarAliquotasPorPeriodo(b);
    expect(() => b.validar()).not.toThrow();
  });

  it('não compara contra si mesmo (evita falso positivo)', () => {
    const inss = new Inss();
    const a = makeAliquota(new Date('2022-01-01'), new Date('2022-12-31'), new Decimal('0.20'), null, null, inss);
    inss.adicionarAliquotasPorPeriodo(a);
    expect(() => a.validar()).not.toThrow();
  });
});
