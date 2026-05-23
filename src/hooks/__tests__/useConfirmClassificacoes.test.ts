// @vitest-environment jsdom
/**
 * Testes do hook useConfirmClassificacoes.
 *
 * Cobre o caminho do confirm: invoca edge function, repassa retorno,
 * trata erro sem swallowar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

import { useConfirmClassificacoes } from '../useConfirmClassificacoes';

beforeEach(() => {
  invokeMock.mockReset();
});

describe('useConfirmClassificacoes', () => {
  it('retorna {promovidos: 0, conflitos: []} quando caseId é null', async () => {
    const { result } = renderHook(() => useConfirmClassificacoes(null));
    let resp: { promovidos: number; conflitos: unknown[] } = {
      promovidos: -1,
      conflitos: [],
    };
    await act(async () => {
      resp = await result.current.confirm();
    });
    expect(resp).toEqual({ promovidos: 0, conflitos: [] });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('invoca holerite-classify-confirm com case_id e retorna shape correto', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { promovidos: 3, conflitos: [] },
      error: null,
    });
    const { result } = renderHook(() => useConfirmClassificacoes('case-abc'));
    let resp: { promovidos: number; conflitos: unknown[] } = {
      promovidos: -1,
      conflitos: [],
    };
    await act(async () => {
      resp = await result.current.confirm();
    });
    expect(invokeMock).toHaveBeenCalledWith('holerite-classify-confirm', {
      body: { case_id: 'case-abc' },
    });
    expect(resp.promovidos).toBe(3);
    expect(resp.conflitos).toEqual([]);
  });

  it('propaga conflitos sem throw', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        promovidos: 1,
        conflitos: [
          {
            tentativa_id: 't-1',
            alias_original: 'X',
            normalized_key: 'x',
            motivo: 'conflict_existing',
            categoria_tentativa: 'PREMIOS',
            categoria_existente: 'COMISSOES_PRODUTOS',
          },
        ],
      },
      error: null,
    });
    const { result } = renderHook(() => useConfirmClassificacoes('case-abc'));
    let resp: { promovidos: number; conflitos: Array<{ motivo: string }> } = {
      promovidos: 0,
      conflitos: [],
    };
    await act(async () => {
      resp = (await result.current.confirm()) as typeof resp;
    });
    expect(resp.promovidos).toBe(1);
    expect(resp.conflitos).toHaveLength(1);
    expect(resp.conflitos[0].motivo).toBe('conflict_existing');
  });

  it('throw quando edge function retorna erro', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Internal server error' },
    });
    const { result } = renderHook(() => useConfirmClassificacoes('case-abc'));
    await expect(
      act(async () => {
        await result.current.confirm();
      }),
    ).rejects.toThrow(/Internal server error/);
  });
});
