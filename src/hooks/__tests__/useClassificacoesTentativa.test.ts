// @vitest-environment jsdom
/**
 * Testes do hook useClassificacoesTentativa.
 *
 * Cobertura mínima — caminhos de leitura e escrita mais sensíveis:
 *   - Hidratação aplica precedência tentativa > seed
 *   - setClassificacao otimista atualiza imediato + saving=true
 *   - Debounce 800ms agrupa edições rápidas
 *   - UPSERT bem-sucedido limpa saving + muda origem pra 'tentativa'
 *   - UPSERT falha mantém valor + dispara toast + saving=false
 *
 * Versão pré-4.4 tinha caminho de leitura legacy
 * (documents.metadata.classificacoes_manuais_holerite). Removido após
 * confirmar zero entries em prod (dry-run 5fa3a14). Mock de documents
 * tabela também removido.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
const tentativaSelectChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
};
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
    warning: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'rubrica_aliases_tentativa') {
        return {
          ...tentativaSelectChain,
          upsert: upsertMock,
        };
      }
      // Hook não consulta outras tabelas pós-4.4. Defesa caso futuro
      // consumer adicione query nova sem ajustar este mock.
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-test-123' } },
      }),
    },
  },
}));

import { useClassificacoesTentativa } from '../useClassificacoesTentativa';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  upsertMock.mockClear();
  tentativaSelectChain.eq.mockClear();
  tentativaSelectChain.eq.mockResolvedValue({ data: [], error: null });
  toastErrorMock.mockClear();
  toastSuccessMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

const rubricasIniciais = [
  {
    alias_original: 'Verba Pet Shop',
    normalized_key: 'verba pet shop',
    categoria: 'NAO_CLASSIFICADO',
    tipo_pjecalc: 'INDEFINIDO',
  },
  {
    alias_original: 'Comissões',
    normalized_key: 'comissoes',
    categoria: 'COMISSOES_PRODUTOS',
    tipo_pjecalc: 'COMISSAO',
  },
];

describe('useClassificacoesTentativa', () => {
  it('hidrata seed inicial e marca origem=seed', async () => {
    const { result } = renderHook(() =>
      useClassificacoesTentativa({
        caseId: 'case-1',
        documentId: 'doc-1',
        rubricasIniciais,
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const entry = result.current.classificacoes.get('comissoes');
    expect(entry?.categoria).toBe('COMISSOES_PRODUTOS');
    expect(entry?.origem).toBe('seed');
  });

  it('precedência: tentativa do banco sobrescreve seed', async () => {
    tentativaSelectChain.eq.mockResolvedValueOnce({
      data: [
        {
          normalized_key: 'verba pet shop',
          alias_original: 'Verba Pet Shop',
          categoria: 'PREMIOS',
          tipo_pjecalc: 'PREMIO',
        },
      ],
      error: null,
    });

    const { result } = renderHook(() =>
      useClassificacoesTentativa({
        caseId: 'case-1',
        documentId: 'doc-1',
        rubricasIniciais,
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const entry = result.current.classificacoes.get('verba pet shop');
    expect(entry?.categoria).toBe('PREMIOS');
    expect(entry?.origem).toBe('tentativa');
  });

  it('setClassificacao otimista: muda imediato + saving=true', async () => {
    const { result } = renderHook(() =>
      useClassificacoesTentativa({
        caseId: 'case-1',
        documentId: 'doc-1',
        rubricasIniciais,
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setClassificacao('verba pet shop', 'COMISSOES_PRODUTOS');
    });

    const entry = result.current.classificacoes.get('verba pet shop');
    expect(entry?.categoria).toBe('COMISSOES_PRODUTOS');
    expect(entry?.origem).toBe('session');
    expect(entry?.saving).toBe(true);
    // UPSERT não disparou ainda (debounce 800ms pendente)
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('debounce: UPSERT só dispara após 800ms de estabilidade', async () => {
    const { result } = renderHook(() =>
      useClassificacoesTentativa({
        caseId: 'case-1',
        documentId: 'doc-1',
        rubricasIniciais,
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Toggle rápido: COMISSOES_PRODUTOS → DESCONSIDERADAS dentro de 200ms
    act(() => {
      result.current.setClassificacao('verba pet shop', 'COMISSOES_PRODUTOS');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.setClassificacao('verba pet shop', 'DESCONSIDERADAS');
    });
    // 200ms passados: nenhum UPSERT ainda
    expect(upsertMock).not.toHaveBeenCalled();

    // Avança 800ms: dispara só o último (DESCONSIDERADAS)
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: 'DESCONSIDERADAS',
        tipo_pjecalc: 'DESCONSIDERAR',
        incluido: false,
      }),
      expect.any(Object),
    );
  });

  it('UPSERT sucesso: limpa saving + muda origem pra tentativa', async () => {
    const { result } = renderHook(() =>
      useClassificacoesTentativa({
        caseId: 'case-1',
        documentId: 'doc-1',
        rubricasIniciais,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setClassificacao('verba pet shop', 'PREMIOS');
    });
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      const e = result.current.classificacoes.get('verba pet shop');
      expect(e?.origem).toBe('tentativa');
      expect(e?.saving).toBe(false);
    });
  });

  it('UPSERT falha: toast erro + saving=false + valor preservado', async () => {
    upsertMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'RLS rejected' },
    });

    const { result } = renderHook(() =>
      useClassificacoesTentativa({
        caseId: 'case-1',
        documentId: 'doc-1',
        rubricasIniciais,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setClassificacao('verba pet shop', 'PREMIOS');
    });
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      const e = result.current.classificacoes.get('verba pet shop');
      expect(e?.categoria).toBe('PREMIOS'); // valor preservado
      expect(e?.saving).toBe(false);
    });
    expect(toastErrorMock).toHaveBeenCalled();
  });
});
