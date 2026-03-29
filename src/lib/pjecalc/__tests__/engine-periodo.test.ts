import { describe, it, expect } from 'vitest';
import { createEngine, makeParams } from './helpers';

describe('PjeCalcEngine - getPeriodoCalculo', () => {
  it('returns admissao to demissao as normal period', () => {
    const engine = createEngine({
      params: {
        data_admissao: '2020-03-15',
        data_demissao: '2023-06-30',
        prescricao_quinquenal: false,
      },
    });

    const periodo = engine.getPeriodoCalculo();
    expect(periodo.inicio).toBe('2020-03-15');
    expect(periodo.fim).toBe('2023-06-30');
  });

  it('uses data_inicial/data_final when provided (overrides admissao)', () => {
    const engine = createEngine({
      params: {
        data_admissao: '2018-01-01',
        data_demissao: '2023-12-31',
        data_inicial: '2020-06-01',
        data_final: '2022-12-31',
        prescricao_quinquenal: false,
      },
    });

    const periodo = engine.getPeriodoCalculo();
    expect(periodo.inicio).toBe('2020-06-01');
    expect(periodo.fim).toBe('2022-12-31');
  });

  it('calculates prescricao quinquenal as ajuizamento - 5 years', () => {
    const engine = createEngine({
      params: {
        data_admissao: '2015-01-01',
        data_demissao: '2023-12-31',
        data_ajuizamento: '2024-06-15',
        prescricao_quinquenal: true,
      },
    });

    const periodo = engine.getPeriodoCalculo();
    // 2024-06-15 minus 5 years = 2019-06-15
    expect(periodo.inicio).toBe('2019-06-15');
    expect(periodo.fim).toBe('2023-12-31');
  });

  it('prescricao quinquenal does not go before admissao', () => {
    const engine = createEngine({
      params: {
        data_admissao: '2022-01-01',
        data_demissao: '2023-12-31',
        data_ajuizamento: '2024-06-15',
        prescricao_quinquenal: true,
      },
    });

    const periodo = engine.getPeriodoCalculo();
    // 2024-06-15 - 5 years = 2019-06-15 BUT admissao is 2022-01-01
    expect(periodo.inicio).toBe('2022-01-01');
  });

  it('uses explicit data_prescricao_quinquenal when provided', () => {
    const engine = createEngine({
      params: {
        data_admissao: '2015-01-01',
        data_demissao: '2023-12-31',
        data_ajuizamento: '2024-06-15',
        prescricao_quinquenal: true,
        data_prescricao_quinquenal: '2020-01-01',
      },
    });

    const periodo = engine.getPeriodoCalculo();
    expect(periodo.inicio).toBe('2020-01-01');
  });
});

describe('PjeCalcEngine - getCompetencias', () => {
  it('generates monthly competencias for a normal period', () => {
    const engine = createEngine();
    const comps = engine.getCompetencias('2023-01-01', '2023-06-30');

    expect(comps).toEqual([
      '2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06',
    ]);
  });

  it('handles cross-year periods', () => {
    const engine = createEngine();
    const comps = engine.getCompetencias('2022-11-01', '2023-02-28');

    expect(comps).toEqual([
      '2022-11', '2022-12', '2023-01', '2023-02',
    ]);
  });

  it('returns single competencia when start and end are in same month', () => {
    const engine = createEngine();
    const comps = engine.getCompetencias('2023-07-10', '2023-07-25');

    expect(comps).toEqual(['2023-07']);
  });

  it('handles end date on first day of month', () => {
    const engine = createEngine();
    const comps = engine.getCompetencias('2023-01-01', '2023-03-01');

    expect(comps).toEqual(['2023-01', '2023-02', '2023-03']);
  });

  it('returns empty array when end is before start', () => {
    const engine = createEngine();
    const comps = engine.getCompetencias('2023-06-01', '2023-01-01');

    expect(comps).toEqual([]);
  });
});
