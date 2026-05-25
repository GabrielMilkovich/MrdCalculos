// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ data: [], error: null }),
          maybeSingle: () => ({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/supabase-untyped', () => ({
  fromUntyped: () => ({
    select: () => ({
      eq: () => ({
        order: () => ({ data: [], error: null }),
        maybeSingle: () => ({ data: null, error: null }),
      }),
    }),
  }),
}));

vi.mock('@/lib/pjecalc/service', () => ({
  getExcecoesJuros: vi.fn().mockResolvedValue([]),
  insertExcecaoJuros: vi.fn().mockResolvedValue(undefined),
  deleteExcecaoJuros: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/pjecalc/worktime-adjuster', () => ({
  adjustWorktime: vi.fn(),
  parseSentencaRegex: vi.fn(),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('ModuloAjusteSentenca — disabled banner', () => {
  it('shows "Módulo em desenvolvimento" warning banner', async () => {
    const { ModuloAjusteSentenca } = await import('../ModuloAjusteSentenca');
    render(
      <Wrapper>
        <ModuloAjusteSentenca caseId="test-123" />
      </Wrapper>,
    );
    expect(screen.getByText('Módulo em desenvolvimento')).toBeTruthy();
    expect(screen.getByText(/ainda não alimentam o motor de cálculo/)).toBeTruthy();
  });
});

describe('ModuloExcecoesJuros — disabled banner', () => {
  it('shows "Módulo em desenvolvimento" warning banner', async () => {
    const { ModuloExcecoesJuros } = await import('../ModuloExcecoesJuros');
    render(
      <Wrapper>
        <ModuloExcecoesJuros caseId="test-123" />
      </Wrapper>,
    );
    expect(screen.getByText('Módulo em desenvolvimento')).toBeTruthy();
    expect(screen.getByText(/ainda não são lidas pelo motor de cálculo/)).toBeTruthy();
  });
});
