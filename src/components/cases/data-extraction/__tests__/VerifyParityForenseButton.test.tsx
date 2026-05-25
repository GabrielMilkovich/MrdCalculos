// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockIniciar = vi.fn();
const mockAplicarSelecionados = vi.fn();
const mockToggleItem = vi.fn();
const mockSelecionarTodos = vi.fn();
const mockDesselecionarTodos = vi.fn();

let hookState = {
  estado: 'idle' as 'idle' | 'running' | 'success' | 'error',
  resultado: null as unknown,
  erro: null as string | null,
  itensSelecionados: new Map<number, boolean>(),
  countSelecionados: 0,
  iniciar: mockIniciar,
  toggleItem: mockToggleItem,
  selecionarTodos: mockSelecionarTodos,
  desselecionarTodos: mockDesselecionarTodos,
  aplicarSelecionados: mockAplicarSelecionados,
};

vi.mock('../hooks/useParidadeForense', () => ({
  useParidadeForense: () => hookState,
}));

vi.mock('../RelatorioParidadeForense', () => ({
  RelatorioParidadeForense: () => <div data-testid="relatorio">Relatorio</div>,
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { VerifyParityForenseButton } from '../VerifyParityForenseButton';

function renderButton() {
  return render(
    <VerifyParityForenseButton
      documentId="doc-1"
      builder="ctps"
      parsed={{}}
      pdfDisponivel={true}
    />,
  );
}

describe('VerifyParityForenseButton', () => {
  beforeEach(() => {
    mockIniciar.mockReset();
    mockToast.mockReset();
    hookState = {
      estado: 'idle',
      resultado: null,
      erro: null,
      itensSelecionados: new Map(),
      countSelecionados: 0,
      iniciar: mockIniciar,
      toggleItem: mockToggleItem,
      selecionarTodos: mockSelecionarTodos,
      desselecionarTodos: mockDesselecionarTodos,
      aplicarSelecionados: mockAplicarSelecionados,
    };
  });

  it('abre Sheet e mostra estado de erro quando iniciar falha', async () => {
    hookState.estado = 'error';
    hookState.erro = 'Serviço indisponível';
    mockIniciar.mockResolvedValue({ ok: false, error: 'Serviço indisponível' });

    renderButton();
    fireEvent.click(screen.getByRole('button', { name: /conferir com ia/i }));

    await waitFor(() => {
      expect(screen.getByText(/não foi possível analisar/i)).toBeInTheDocument();
    });
  });

  it('abre Sheet quando iniciar retorna ok', async () => {
    mockIniciar.mockResolvedValue({ ok: true });
    hookState.estado = 'success';
    hookState.resultado = { discrepancias: [] };

    renderButton();
    fireEvent.click(screen.getByRole('button', { name: /conferir com ia/i }));

    await waitFor(() => {
      expect(screen.getByText(/paridade forense ia/i)).toBeInTheDocument();
    });
  });
});
