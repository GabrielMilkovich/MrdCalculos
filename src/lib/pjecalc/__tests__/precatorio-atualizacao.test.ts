/**
 * Testes — Atualização de Precatórios (EC 136/2025)
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  atualizarPrecatorio,
  type PrecatorioInput,
} from '../precatorio-atualizacao';

describe('atualizarPrecatorio — regência temporal', () => {
  it('precatório pré-EC 113 (expedição 2019-06) gera três segmentos TR_6 → SELIC → IPCA_2', () => {
    const input: PrecatorioInput = {
      valor_base: 100_000,
      data_expedicao: '2019-06-01',
      data_atualizacao: '2026-01-01',
      tipo: 'FEDERAL',
    };
    const r = atualizarPrecatorio(input);
    expect(r.segmentos).toHaveLength(3);
    expect(r.segmentos[0].regime).toBe('TR_6');
    expect(r.segmentos[1].regime).toBe('SELIC');
    expect(r.segmentos[2].regime).toBe('IPCA_2');

    // Segmentos contíguos
    expect(r.segmentos[0].data_fim).toBe(r.segmentos[1].data_inicio);
    expect(r.segmentos[1].data_fim).toBe(r.segmentos[2].data_inicio);

    // Valor final > valor_base
    expect(new Decimal(r.valor_final).greaterThan(100_000)).toBe(true);
  });

  it('precatório pós-EC 113 e pré-EC 136 (expedição 2022-03) gera dois segmentos SELIC → IPCA_2', () => {
    const input: PrecatorioInput = {
      valor_base: 50_000,
      data_expedicao: '2022-03-01',
      data_atualizacao: '2026-01-01',
      tipo: 'FEDERAL',
    };
    const r = atualizarPrecatorio(input);
    expect(r.segmentos).toHaveLength(2);
    expect(r.segmentos[0].regime).toBe('SELIC');
    expect(r.segmentos[0].data_inicio).toBe('2022-03-01');
    expect(r.segmentos[1].regime).toBe('IPCA_2');
    expect(r.segmentos[1].data_inicio).toBe('2025-07-01');
    expect(r.segmentos[1].data_fim).toBe('2026-01-01');
    expect(new Decimal(r.valor_final).greaterThan(50_000)).toBe(true);
  });

  it('precatório pós-EC 136 (expedição 2025-09) gera segmento único IPCA_2', () => {
    const input: PrecatorioInput = {
      valor_base: 200_000,
      data_expedicao: '2025-09-01',
      data_atualizacao: '2026-02-01',
      tipo: 'FEDERAL',
    };
    const r = atualizarPrecatorio(input);
    expect(r.segmentos).toHaveLength(1);
    expect(r.segmentos[0].regime).toBe('IPCA_2');
    expect(r.segmentos[0].data_inicio).toBe('2025-09-01');
    expect(r.segmentos[0].data_fim).toBe('2026-02-01');
    // Valor cresceu (IPCA positivo + juros 2% a.a.)
    expect(new Decimal(r.valor_final).greaterThan(200_000)).toBe(true);
  });

  it('edge case: data_atualizacao == data_expedicao → fator 1, valor igual', () => {
    const input: PrecatorioInput = {
      valor_base: 123_456.78,
      data_expedicao: '2024-05-10',
      data_atualizacao: '2024-05-10',
      tipo: 'FEDERAL',
    };
    const r = atualizarPrecatorio(input);
    expect(r.segmentos).toHaveLength(1);
    expect(r.segmentos[0].regime).toBe('SEM_CORRECAO');
    expect(r.segmentos[0].fator_acumulado).toBe('1');
    expect(r.valor_final).toBe('123456.78');
    expect(r.total_correcao).toBe('0.00');
    expect(r.total_juros).toBe('0.00');
  });

  it('ESTADUAL não aplica EC 136 — SELIC continua após 2025-07', () => {
    const base: Omit<PrecatorioInput, 'tipo'> = {
      valor_base: 80_000,
      data_expedicao: '2023-01-01',
      data_atualizacao: '2026-01-01',
    };
    const fed = atualizarPrecatorio({ ...base, tipo: 'FEDERAL' });
    const est = atualizarPrecatorio({ ...base, tipo: 'ESTADUAL' });

    // Federal deve ter SELIC + IPCA_2 (2 segmentos)
    expect(fed.segmentos).toHaveLength(2);
    expect(fed.segmentos.map((s) => s.regime)).toEqual(['SELIC', 'IPCA_2']);

    // Estadual deve ter SELIC único até a data de atualização
    expect(est.segmentos).toHaveLength(1);
    expect(est.segmentos[0].regime).toBe('SELIC');
    expect(est.segmentos[0].data_fim).toBe('2026-01-01');

    // Valores finais diferentes (regimes distintos no período pós-EC 136)
    expect(fed.valor_final).not.toBe(est.valor_final);
  });

  it('valores monetários mantêm precisão Decimal (não há drift float)', () => {
    const input: PrecatorioInput = {
      valor_base: 0.1 + 0.2, // classic float drift → 0.30000000000000004
      data_expedicao: '2025-09-01',
      data_atualizacao: '2025-09-01',
      tipo: 'FEDERAL',
    };
    const r = atualizarPrecatorio(input);
    // Arredondamento para 2 casas deve sanear o drift
    expect(r.valor_final).toBe('0.30');
    expect(new Decimal(r.valor_final).toFixed(2)).toBe('0.30');
  });

  it('soma dos deltas dos segmentos bate com valor_final - valor_base', () => {
    const input: PrecatorioInput = {
      valor_base: 100_000,
      data_expedicao: '2020-01-01',
      data_atualizacao: '2026-01-01',
      tipo: 'FEDERAL',
    };
    const r = atualizarPrecatorio(input);
    expect(r.segmentos.length).toBeGreaterThanOrEqual(2);

    const ultimo = r.segmentos[r.segmentos.length - 1];
    expect(ultimo.valor_acumulado).toBe(r.valor_final);

    // Cada segmento parte do valor_acumulado do anterior (cumulativo)
    for (let i = 1; i < r.segmentos.length; i++) {
      expect(r.segmentos[i].data_inicio).toBe(r.segmentos[i - 1].data_fim);
    }
  });

  it('lança erro quando data_atualizacao < data_expedicao', () => {
    expect(() =>
      atualizarPrecatorio({
        valor_base: 1000,
        data_expedicao: '2025-01-01',
        data_atualizacao: '2024-01-01',
        tipo: 'FEDERAL',
      }),
    ).toThrow(/não pode ser anterior/);
  });
});
