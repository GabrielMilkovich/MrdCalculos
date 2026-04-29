/**
 * Tests para sub-flag "Reiniciar Ferias" (Art. 130-A CLT).
 *
 * Regras:
 *   - Quando uma PjeFalta tem reinicia=true, o periodo aquisitivo de ferias
 *     reinicia a partir da data_final + 1 dia.
 *   - Faltas (justificadas ou nao) anteriores ao novo marco sao
 *     desconsideradas para a redutora do Art. 130 CLT.
 *   - Multiplas faltas com reinicia=true: prevalece a de maior data_final.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularInicioPeriodoAquisitivo,
  contarFaltasNoPeriodo,
  FeriasVencidasModule,
} from '../verba-modules/ferias';
import type { PjeFalta } from '../engine-types';
import type { VerbaModuleContext } from '../verba-modules/types';
import { makeVerba } from './helpers';

function makeFalta(over: Partial<PjeFalta>): PjeFalta {
  return {
    id: over.id ?? 'f',
    data_inicial: over.data_inicial ?? '2023-01-01',
    data_final: over.data_final ?? '2023-01-01',
    justificada: over.justificada ?? false,
    reinicia: over.reinicia,
    justificativa: over.justificativa,
  };
}

function makeCtx(over: Partial<VerbaModuleContext> = {}): VerbaModuleContext {
  return {
    caseId: 'c',
    competencia: '2023-12',
    periodo: { inicio: '2020-01-01', fim: '2023-12-31' },
    admissao: '2020-01-01',
    demissao: '2023-12-31',
    historicos: [{
      id: 'h1', nome: 'Salario', periodo_inicio: '2020-01-01', periodo_fim: '2023-12-31',
      tipo_valor: 'informado', valor_informado: 3000,
      incidencia_fgts: true, incidencia_cs: true,
      fgts_recolhido: false, cs_recolhida: false, ocorrencias: [],
    }],
    cartaoPonto: [],
    faltas: [],
    ferias: [],
    calendario: { diasUteis: 22, repousos: 8, feriados: 1, diasNoMes: 30 },
    cargaHoraria: 220,
    sabadoDiaUtil: false,
    zerarNegativo: true,
    resultadosAnteriores: new Map(),
    ...over,
  };
}

describe('calcularInicioPeriodoAquisitivo (Art. 130-A CLT)', () => {
  it('sem flag reinicia: mantem inicio original', () => {
    const r = calcularInicioPeriodoAquisitivo('2020-01-01', [
      makeFalta({ id: 'f1', data_inicial: '2022-03-01', data_final: '2022-03-05' }),
    ]);
    expect(r.inicio).toBe('2020-01-01');
    expect(r.reiniciado).toBe(false);
  });

  it('falta com reinicia=true: avanca para data_final+1', () => {
    const r = calcularInicioPeriodoAquisitivo('2020-01-01', [
      makeFalta({
        id: 'f1', data_inicial: '2022-03-01', data_final: '2022-03-05',
        reinicia: true,
      }),
    ]);
    expect(r.inicio).toBe('2022-03-06');
    expect(r.reiniciado).toBe(true);
    expect(r.faltaQueReiniciou).toBe('f1');
  });

  it('multiplas faltas reinicia: prevalece a de maior data_final', () => {
    const r = calcularInicioPeriodoAquisitivo('2020-01-01', [
      makeFalta({ id: 'a', data_inicial: '2021-05-01', data_final: '2021-05-10', reinicia: true }),
      makeFalta({ id: 'b', data_inicial: '2022-08-01', data_final: '2022-08-15', reinicia: true }),
      makeFalta({ id: 'c', data_inicial: '2022-01-01', data_final: '2022-01-05', reinicia: true }),
    ]);
    expect(r.inicio).toBe('2022-08-16');
    expect(r.faltaQueReiniciou).toBe('b');
  });

  it('falta reinicia anterior ao inicio: ignorada', () => {
    const r = calcularInicioPeriodoAquisitivo('2023-01-01', [
      makeFalta({
        id: 'antiga', data_inicial: '2021-01-01', data_final: '2021-01-10',
        reinicia: true,
      }),
    ]);
    expect(r.inicio).toBe('2023-01-01');
    expect(r.reiniciado).toBe(false);
  });
});

describe('contarFaltasNoPeriodo', () => {
  it('conta apenas faltas nao justificadas dentro do periodo', () => {
    const faltas = [
      makeFalta({ id: '1', data_inicial: '2021-01-01', justificada: false }),
      makeFalta({ id: '2', data_inicial: '2023-06-01', justificada: false }),
      makeFalta({ id: '3', data_inicial: '2023-07-01', justificada: true }),
      makeFalta({ id: '4', data_inicial: '2023-08-01', justificada: false }),
    ];
    expect(contarFaltasNoPeriodo(faltas, '2023-01-01')).toBe(2);
  });
});

describe('FeriasVencidasModule.resolveInputs (com reinicia)', () => {
  const mod = new FeriasVencidasModule();

  it('sem reinicia + 6 faltas: 24 dias (Art. 130 II CLT)', () => {
    const ctx = makeCtx({
      faltas: Array.from({ length: 6 }, (_, i) => makeFalta({
        id: `f${i}`, data_inicial: `2023-0${i + 1}-01`, data_final: `2023-0${i + 1}-01`,
        justificada: false,
      })),
    });
    const inputs = mod.resolveInputs(ctx, makeVerba());
    expect(inputs.quantidade).toBe(24);
    expect(inputs.metadata?.reiniciado).toBe(false);
  });

  it('com falta reinicia=true: faltas anteriores desconsideradas → 30 dias', () => {
    // 6 faltas comuns ANTES da falta grave + 1 falta grave (reinicia)
    const faltas: PjeFalta[] = [
      ...Array.from({ length: 6 }, (_, i) => makeFalta({
        id: `f${i}`, data_inicial: `2023-0${i + 1}-15`, data_final: `2023-0${i + 1}-15`,
        justificada: false,
      })),
      makeFalta({
        id: 'grave', data_inicial: '2023-09-01', data_final: '2023-10-15',
        justificada: false, reinicia: true,
      }),
    ];
    const ctx = makeCtx({ faltas });
    const inputs = mod.resolveInputs(ctx, makeVerba());
    // Periodo aquisitivo reinicia em 2023-10-16. Nenhuma falta posterior.
    expect(inputs.quantidade).toBe(30);
    expect(inputs.metadata?.reiniciado).toBe(true);
    expect(inputs.metadata?.marcoPeriodoAquisitivo).toBe('2023-10-16');
    expect(inputs.metadata?.faltasCount).toBe(0);
  });

  it('com reinicia + faltas POSTERIORES: conta apenas as posteriores', () => {
    const faltas: PjeFalta[] = [
      makeFalta({ id: 'antiga1', data_inicial: '2023-03-01', justificada: false }),
      makeFalta({
        id: 'grave', data_inicial: '2023-05-01', data_final: '2023-05-15',
        justificada: false, reinicia: true,
      }),
      // 6 faltas APOS a grave → cai para 24 dias.
      ...Array.from({ length: 6 }, (_, i) => makeFalta({
        id: `pos${i}`, data_inicial: `2023-0${6 + Math.floor(i / 3)}-${10 + i}`,
        justificada: false,
      })),
    ];
    const ctx = makeCtx({ faltas });
    const inputs = mod.resolveInputs(ctx, makeVerba());
    expect(inputs.metadata?.reiniciado).toBe(true);
    expect(inputs.metadata?.faltasCount).toBe(6);
    expect(inputs.quantidade).toBe(24);
  });
});
