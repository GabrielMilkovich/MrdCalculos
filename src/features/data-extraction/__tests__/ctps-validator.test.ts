import { describe, expect, it } from 'vitest';
import { validarCtps } from '../validators/ctps-validator';
import type { FeriasParseada } from '../parsers/ferias';
import type { FaltaParseada } from '../parsers/faltas';

function makeFerias(overrides: Partial<FeriasParseada> = {}): FeriasParseada {
  return {
    relativa: '2022/2023',
    inicio_aquisitivo: '2022-01-01',
    fim_aquisitivo: '2022-12-31',
    prazo: 30,
    situacao: 'G',
    gozos: [{ inicio: '2023-01-02', fim: '2023-01-31', dobra: false }],
    abono: false,
    ...overrides,
  };
}

function makeFalta(overrides: Partial<FaltaParseada> = {}): FaltaParseada {
  return {
    data_inicio: '2024-03-15',
    data_fim: '2024-03-15',
    tipo_afastamento: 'falta_simples',
    duracao_dias: 1,
    justificada: false,
    reiniciar_periodo_aquisitivo: false,
    justificativa: null,
    ...overrides,
  };
}

describe('validarCtps', () => {
  it('caso válido sem violações → ok=true', () => {
    const r = validarCtps(
      [makeFerias()],
      [makeFalta()],
    );
    expect(r.ok).toBe(true);
    expect(r.violacoes).toHaveLength(0);
  });

  it('gozos sobrepostos → alta', () => {
    const ferias = [
      makeFerias({
        relativa: '2022/2023',
        gozos: [{ inicio: '2023-01-01', fim: '2023-01-30', dobra: false }],
      }),
      makeFerias({
        relativa: '2023/2024',
        gozos: [{ inicio: '2023-01-15', fim: '2023-02-13', dobra: false }],
      }),
    ];
    const r = validarCtps(ferias, []);
    expect(r.ok).toBe(false);
    expect(r.violacoes).toHaveLength(1);
    expect(r.violacoes[0].regra).toBe('gozos_sobrepostos');
    expect(r.violacoes[0].severidade).toBe('alta');
  });

  it('gozo antes da admissão → critica', () => {
    const r = validarCtps(
      [makeFerias({ gozos: [{ inicio: '2020-06-01', fim: '2020-06-30', dobra: false }] })],
      [],
      { data_admissao: '2021-01-01' },
    );
    expect(r.ok).toBe(false);
    expect(r.violacoes[0].regra).toBe('gozo_antes_admissao');
    expect(r.violacoes[0].severidade).toBe('critica');
  });

  it('reinicia aquisitivo com 5 dias → alta', () => {
    const r = validarCtps(
      [],
      [makeFalta({
        duracao_dias: 5,
        reiniciar_periodo_aquisitivo: true,
      })],
    );
    expect(r.ok).toBe(false);
    expect(r.violacoes[0].regra).toBe('reinicia_aquisitivo_invalido');
  });

  it('reinicia aquisitivo com 35 dias → OK (art. 130 CLT)', () => {
    const r = validarCtps(
      [],
      [makeFalta({
        duracao_dias: 35,
        reiniciar_periodo_aquisitivo: true,
      })],
    );
    expect(r.ok).toBe(true);
  });

  it('faltas sobrepostas → media', () => {
    const r = validarCtps(
      [],
      [
        makeFalta({ data_inicio: '2024-03-10', data_fim: '2024-03-20' }),
        makeFalta({ data_inicio: '2024-03-15', data_fim: '2024-03-25' }),
      ],
    );
    expect(r.ok).toBe(true);
    expect(r.violacoes).toHaveLength(1);
    expect(r.violacoes[0].regra).toBe('faltas_sobrepostas');
    expect(r.violacoes[0].severidade).toBe('media');
  });

  it('férias vazia → ok', () => {
    const r = validarCtps([], []);
    expect(r.ok).toBe(true);
    expect(r.resumo.total_ferias).toBe(0);
    expect(r.resumo.total_faltas).toBe(0);
  });

  it('contrato sem data_admissao → R3 não dispara', () => {
    const r = validarCtps(
      [makeFerias({ gozos: [{ inicio: '2020-01-01', fim: '2020-01-30', dobra: false }] })],
      [],
      {},
    );
    expect(r.violacoes.filter((v) => v.regra === 'gozo_antes_admissao')).toHaveLength(0);
  });

  it('múltiplas violações contabilizadas no resumo', () => {
    const r = validarCtps(
      [
        makeFerias({
          gozos: [{ inicio: '2023-01-01', fim: '2023-01-30', dobra: false }],
        }),
        makeFerias({
          gozos: [{ inicio: '2023-01-15', fim: '2023-02-13', dobra: false }],
        }),
      ],
      [
        makeFalta({ duracao_dias: 3, reiniciar_periodo_aquisitivo: true }),
      ],
    );
    expect(r.resumo.violacoes_criticas + r.resumo.violacoes_altas).toBeGreaterThanOrEqual(2);
  });

  it('férias sem gozos → sem sobreposição', () => {
    const r = validarCtps(
      [makeFerias({ gozos: [] })],
      [],
    );
    expect(r.ok).toBe(true);
    expect(r.violacoes).toHaveLength(0);
  });

  it('ok=true quando só violações media', () => {
    const r = validarCtps(
      [],
      [
        makeFalta({ data_inicio: '2024-03-10', data_fim: '2024-03-20' }),
        makeFalta({ data_inicio: '2024-03-15', data_fim: '2024-03-25' }),
      ],
    );
    expect(r.ok).toBe(true);
  });

  it('resumo conta totais corretamente', () => {
    const r = validarCtps(
      [makeFerias(), makeFerias({ relativa: '2023/2024' })],
      [makeFalta(), makeFalta({ data_inicio: '2024-05-01', data_fim: '2024-05-01' })],
    );
    expect(r.resumo.total_ferias).toBe(2);
    expect(r.resumo.total_faltas).toBe(2);
  });
});
