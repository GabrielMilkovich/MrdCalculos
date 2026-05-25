// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) }),
    functions: { invoke: vi.fn() },
  },
}));

const mockInvoke = vi.fn();
vi.mock('@/features/data-extraction/paridade-forense/api/invokeParidadeForense', () => ({
  invokeParidadeForense: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock('@/features/data-extraction/paridade-forense/confidence', () => ({
  mapConfidenceToCheckboxState: (c: number) => ({
    pre_marcado: c >= 70,
    aplicar_disabled: c < 30,
  }),
}));

import { useParidadeForense } from '../useParidadeForense';
import type { ParidadeForenseResult } from '@/features/data-extraction/paridade-forense/types';

function makeResult(overrides: Partial<ParidadeForenseResult> = {}): ParidadeForenseResult {
  return {
    paridade_geral: 'parcial',
    resumo: {
      total_itens_csv: 10,
      com_evidencia_pdf: 8,
      sem_evidencia_pdf: 2,
      ausentes_no_csv: 0,
      discrepancias_criticas: 1,
      discrepancias_altas: 0,
      discrepancias_medias: 0,
      discrepancias_baixas: 0,
    },
    discrepancias: [
      {
        tipo: 'valor_divergente',
        severidade: 'critica',
        field_path: 'rubricas[0].valor',
        current: 1000,
        suggested: 1200,
        motivo: 'Valor diverge do PDF',
        ai_confidence: 90,
      },
    ],
    discarded_hallucinations: [],
    resumo_executivo: 'Teste',
    ai_confidence_geral: 85,
    pdf_consultado: true,
    model: 'test-model',
    duration_ms: 1500,
    ...overrides,
  };
}

describe('useParidadeForense.iniciar', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('retorna { ok: true } em sucesso e seta estado "success"', async () => {
    mockInvoke.mockResolvedValue({ ok: true, result: makeResult() });

    const { result } = renderHook(() =>
      useParidadeForense({ documentId: 'doc-1', builder: 'ctps', parsed: {} }),
    );

    let r: { ok: boolean };
    await act(async () => {
      r = await result.current.iniciar();
    });

    expect(r!).toEqual({ ok: true });
    expect(result.current.estado).toBe('success');
    expect(result.current.resultado).not.toBeNull();
    expect(result.current.erro).toBeNull();
  });

  it('retorna { ok: false, error } em falha e seta estado "error"', async () => {
    mockInvoke.mockResolvedValue({ ok: false, error: 'Failed to fetch' });

    const { result } = renderHook(() =>
      useParidadeForense({ documentId: 'doc-1', builder: 'holerite', parsed: {} }),
    );

    let r: { ok: boolean; error?: string };
    await act(async () => {
      r = await result.current.iniciar();
    });

    expect(r!).toEqual({ ok: false, error: 'Failed to fetch' });
    expect(result.current.estado).toBe('error');
    expect(result.current.resultado).toBeNull();
    expect(result.current.erro).toBe('Failed to fetch');
  });

  it('pre-seleciona itens com ai_confidence >= 70', async () => {
    const res = makeResult({
      discrepancias: [
        { tipo: 'valor_divergente', severidade: 'critica', field_path: 'a', current: 1, suggested: 2, motivo: 'x', ai_confidence: 90 },
        { tipo: 'valor_divergente', severidade: 'baixa', field_path: 'b', current: 1, suggested: 2, motivo: 'y', ai_confidence: 40 },
      ],
    });
    mockInvoke.mockResolvedValue({ ok: true, result: res });

    const { result } = renderHook(() =>
      useParidadeForense({ documentId: 'doc-1', builder: 'ctps', parsed: {} }),
    );

    await act(async () => { await result.current.iniciar(); });

    expect(result.current.itensSelecionados.get(0)).toBe(true);
    expect(result.current.itensSelecionados.get(1)).toBe(false);
  });
});
