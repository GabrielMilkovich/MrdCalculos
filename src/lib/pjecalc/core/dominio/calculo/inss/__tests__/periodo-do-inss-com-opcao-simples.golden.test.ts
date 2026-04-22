/**
 * PeriodoDoINSSComOpcaoSimples — golden tests (Fase 5)
 *
 * Fidelidade 1-a-1 com PeriodoDoINSSComOpcaoSimples.java v2.15.1:
 *   - validar() — L140-163
 *   - getPeriodo / isPeriodoCoincidenteCom (regression)
 */
import { describe, it, expect } from 'vitest';

import { PeriodoDoINSSComOpcaoSimples } from '../periodo-do-inss-com-opcao-simples';
import { Inss } from '../inss';
import { Calculo } from '../../calculo';
import { NegocioException } from '../../../../comum/exceptions/negocio-exception';
import { Mensagens } from '../../../../comum/mensagens';

function makeCalculo(admissao: Date, demissao: Date | null, terminoCalc: Date): Calculo {
  const c = new Calculo();
  c.setDataAdmissao(admissao);
  c.setDataDemissao(demissao);
  c.setDataTerminoCalculo(terminoCalc);
  return c;
}

function makeContext(admissao: Date, demissao: Date | null, terminoCalc: Date): { calc: Calculo; inss: Inss } {
  const calc = makeCalculo(admissao, demissao, terminoCalc);
  const inss = new Inss();
  inss.setCalculo(calc);
  return { calc, inss };
}

function makePeriodoSimples(
  inicio: Date | null,
  fim: Date | null,
  inss?: Inss,
): PeriodoDoINSSComOpcaoSimples {
  const p = new PeriodoDoINSSComOpcaoSimples();
  p.setDataInicioSimples(inicio);
  p.setDataTerminoSimples(fim);
  if (inss) p.setInss(inss);
  return p;
}

describe('PeriodoDoINSSComOpcaoSimples.validar', () => {
  it('período dentro dos limites: passa', () => {
    const { inss } = makeContext(
      new Date('2018-01-01'),
      new Date('2023-12-31'),
      new Date('2024-06-30'),
    );
    const p = makePeriodoSimples(new Date('2020-03-01'), new Date('2022-08-31'), inss);
    expect(() => p.validar()).not.toThrow();
    expect(p.validar()).toBe(p);
  });

  it('data inicial antes da admissão: lança MSG0004 em "dataInicioSimples"', () => {
    const { inss } = makeContext(
      new Date('2020-01-01'),
      new Date('2023-12-31'),
      new Date('2024-06-30'),
    );
    const p = makePeriodoSimples(new Date('2019-03-01'), new Date('2021-08-31'), inss);
    try {
      p.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msgs = (e as NegocioException).getMensagensDeRecurso();
      const inicial = msgs.find(m => m.getAtributo() === 'dataInicioSimples');
      expect(inicial?.getChave()).toBe(Mensagens.MSG0004);
    }
  });

  it('data final após demissão: lança MSG0004 em "dataTerminoSimples"', () => {
    const { inss } = makeContext(
      new Date('2018-01-01'),
      new Date('2022-01-31'),
      new Date('2024-06-30'),
    );
    const p = makePeriodoSimples(new Date('2019-03-01'), new Date('2023-08-31'), inss);
    try {
      p.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msgs = (e as NegocioException).getMensagensDeRecurso();
      const final_ = msgs.find(m => m.getAtributo() === 'dataTerminoSimples');
      expect(final_?.getChave()).toBe(Mensagens.MSG0004);
    }
  });

  it('sem demissão: usa dataTerminoCalculo como limite', () => {
    const { inss } = makeContext(
      new Date('2018-01-01'),
      null,
      new Date('2024-06-30'),
    );
    const p = makePeriodoSimples(new Date('2020-01-01'), new Date('2024-01-31'), inss);
    expect(() => p.validar()).not.toThrow();
  });

  it('coincidência com outro período Simples: MSG0024', () => {
    const { inss } = makeContext(
      new Date('2018-01-01'),
      null,
      new Date('2024-06-30'),
    );
    const a = makePeriodoSimples(new Date('2020-01-01'), new Date('2022-12-31'), inss);
    const b = makePeriodoSimples(new Date('2022-06-01'), new Date('2024-01-31'), inss);
    inss.adicionarPeriodoComOpcaoSimples(a);
    inss.adicionarPeriodoComOpcaoSimples(b);
    try {
      b.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso()[0];
      expect(msg.getChave()).toBe(Mensagens.MSG0024);
      expect(msg.getAtributo()).toBe('dataTerminoSimples');
    }
  });

  it('sem INSS linkado: retorna this sem validar', () => {
    const p = makePeriodoSimples(new Date('2020-01-01'), new Date('2022-12-31'));
    expect(() => p.validar()).not.toThrow();
    expect(p.validar()).toBe(p);
  });
});
