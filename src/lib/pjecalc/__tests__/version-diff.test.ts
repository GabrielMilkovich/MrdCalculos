/**
 * Testes — compararVersoes (diff de PjeLiquidacaoResult).
 */
import { describe, it, expect } from 'vitest';
import { compararVersoes, type DiffField } from '../version-diff';
import type { CalculoVersao } from '../versioning';
import type { PjeLiquidacaoResult } from '../engine-types';

function makeVersao(
  id: string,
  versao: number,
  resultado: Partial<PjeLiquidacaoResult>,
): CalculoVersao {
  return {
    id,
    case_id: 'case-1',
    versao,
    hash: '',
    created_at: new Date(2025, 0, versao, 12).toISOString(),
    resultado_json: resultado as PjeLiquidacaoResult,
  };
}

function baseResumo(overrides: Partial<PjeLiquidacaoResult['resumo']> = {}): PjeLiquidacaoResult['resumo'] {
  return {
    principal_bruto: 1000,
    principal_corrigido: 1100,
    juros_mora: 50,
    fgts_total: 200,
    cs_segurado: 80,
    cs_empregador: 100,
    ir_retido: 30,
    seguro_desemprego: 0,
    previdencia_privada: 0,
    salario_familia: 0,
    multa_523: 0,
    multa_467: 0,
    honorarios_sucumbenciais: 100,
    honorarios_contratuais: 0,
    custas: 20,
    custas_detalhadas: [],
    pensao_sobre_fgts: 0,
    pensao_total: 0,
    contribuicao_sindical: 0,
    abono_pecuniario: 0,
    liquido_reclamante: 900,
    total_reclamada: 1500,
    ...overrides,
  };
}

describe('compararVersoes', () => {
  it('retorna array vazio para versões idênticas', () => {
    const r: Partial<PjeLiquidacaoResult> = { resumo: baseResumo(), verbas: [] };
    const v1 = makeVersao('a', 1, r);
    const v2 = makeVersao('b', 2, r);
    expect(compararVersoes(v1, v2)).toEqual([]);
  });

  it('detecta campo modificado no resumo com delta numérico', () => {
    const v1 = makeVersao('a', 1, { resumo: baseResumo({ principal_bruto: 1000 }), verbas: [] });
    const v2 = makeVersao('b', 2, { resumo: baseResumo({ principal_bruto: 1250 }), verbas: [] });
    const diffs = compararVersoes(v1, v2);
    const d = diffs.find((x) => x.path === 'resumo.principal_bruto');
    expect(d).toBeDefined();
    expect(d?.antes).toBe(1000);
    expect(d?.depois).toBe(1250);
    expect(d?.delta).toBe(250);
  });

  it('usa paths aninhados com ponto para campos dentro de resumo', () => {
    const v1 = makeVersao('a', 1, { resumo: baseResumo({ juros_mora: 50 }), verbas: [] });
    const v2 = makeVersao('b', 2, { resumo: baseResumo({ juros_mora: 75 }), verbas: [] });
    const diffs = compararVersoes(v1, v2);
    const paths = diffs.map((d: DiffField) => d.path);
    expect(paths).toContain('resumo.juros_mora');
  });

  it('detecta mudança de tamanho de verbas[] e emite path .length', () => {
    const verbaA = { verba_id: 'v1', nome: 'HE50', tipo: 'x', caracteristica: 'y', ocorrencias: [], total_devido: 100, total_pago: 0, total_diferenca: 100, total_corrigido: 110, total_juros: 5, total_final: 115 };
    const verbaB = { verba_id: 'v2', nome: 'HE100', tipo: 'x', caracteristica: 'y', ocorrencias: [], total_devido: 200, total_pago: 0, total_diferenca: 200, total_corrigido: 220, total_juros: 10, total_final: 230 };
    const v1 = makeVersao('a', 1, { resumo: baseResumo(), verbas: [verbaA] });
    const v2 = makeVersao('b', 2, { resumo: baseResumo(), verbas: [verbaA, verbaB] });
    const diffs = compararVersoes(v1, v2);
    const len = diffs.find((d) => d.path === 'verbas.length');
    expect(len).toBeDefined();
    expect(len?.antes).toBe(1);
    expect(len?.depois).toBe(2);
    expect(len?.delta).toBe(1);
  });

  it('array com mesmo tamanho compara índice por índice sem gerar .length', () => {
    const verba1 = { verba_id: 'v1', nome: 'HE50', tipo: 'x', caracteristica: 'y', ocorrencias: [], total_devido: 100, total_pago: 0, total_diferenca: 100, total_corrigido: 110, total_juros: 5, total_final: 115 };
    const verba1b = { ...verba1, total_final: 120 };
    const v1 = makeVersao('a', 1, { resumo: baseResumo(), verbas: [verba1] });
    const v2 = makeVersao('b', 2, { resumo: baseResumo(), verbas: [verba1b] });
    const diffs = compararVersoes(v1, v2);
    expect(diffs.some((d) => d.path === 'verbas.length')).toBe(false);
    const d = diffs.find((d) => d.path === 'verbas[0].total_final');
    expect(d).toBeDefined();
    expect(d?.delta).toBe(5);
  });

  it('não emite delta numérico para campos não-numéricos', () => {
    const v1 = makeVersao('a', 1, { resumo: baseResumo(), verbas: [] });
    const v2 = makeVersao('b', 2, {
      resumo: { ...baseResumo(), meta: { arredondamento: 'TRUNC', tipo_mes: '30', oj415_aplicada: true } },
      verbas: [],
    });
    const diffs = compararVersoes(v1, v2);
    const metaDiff = diffs.filter((d) => d.path.startsWith('resumo.meta'));
    expect(metaDiff.length).toBeGreaterThan(0);
    for (const d of metaDiff) {
      if (typeof d.antes !== 'number' || typeof d.depois !== 'number') {
        expect(d.delta).toBeUndefined();
      }
    }
  });
});
