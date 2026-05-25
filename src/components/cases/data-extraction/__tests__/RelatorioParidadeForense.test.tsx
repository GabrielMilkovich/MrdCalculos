// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelatorioParidadeForense } from '../RelatorioParidadeForense';
import type { ParidadeForenseResult } from '@/features/data-extraction/paridade-forense/types';

function makeResultado(overrides: Partial<ParidadeForenseResult> = {}): ParidadeForenseResult {
  return {
    paridade_geral: 'completa',
    resumo: {
      total_itens_csv: 10,
      com_evidencia_pdf: 10,
      sem_evidencia_pdf: 0,
      ausentes_no_csv: 0,
      discrepancias_criticas: 0,
      discrepancias_altas: 0,
      discrepancias_medias: 0,
      discrepancias_baixas: 0,
    },
    discrepancias: [],
    discarded_hallucinations: [],
    resumo_executivo: 'CSV com paridade completa em relação ao PDF.',
    ai_confidence_geral: 95,
    pdf_consultado: true,
    model: 'claude-sonnet-4-6',
    duration_ms: 5000,
    ...overrides,
  };
}

const defaultProps = {
  itensSelecionados: new Map<number, boolean>(),
  onToggle: vi.fn(),
  onSelecionarTodos: vi.fn(),
  onDesselecionarTodos: vi.fn(),
  countSelecionados: 0,
  onAplicar: vi.fn(),
};

describe('RelatorioParidadeForense', () => {
  it('render paridade completa com verde', () => {
    render(<RelatorioParidadeForense resultado={makeResultado()} {...defaultProps} />);
    expect(screen.getByText('Paridade completa')).toBeTruthy();
    expect(screen.getByText(/95\/100/)).toBeTruthy();
  });

  it('render paridade parcial com amarelo', () => {
    render(
      <RelatorioParidadeForense
        resultado={makeResultado({
          paridade_geral: 'parcial',
          resumo: {
            total_itens_csv: 10, com_evidencia_pdf: 8, sem_evidencia_pdf: 2,
            ausentes_no_csv: 1, discrepancias_criticas: 1, discrepancias_altas: 1,
            discrepancias_medias: 0, discrepancias_baixas: 0,
          },
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByText('Paridade parcial')).toBeTruthy();
  });

  it('render paridade falhou com vermelho', () => {
    render(
      <RelatorioParidadeForense
        resultado={makeResultado({ paridade_geral: 'falhou' })}
        {...defaultProps}
      />,
    );
    expect(screen.getByText('Paridade falhou')).toBeTruthy();
  });

  it('resumo executivo é exibido', () => {
    render(
      <RelatorioParidadeForense
        resultado={makeResultado({ resumo_executivo: 'Teste resumo executivo aqui' })}
        {...defaultProps}
      />,
    );
    expect(screen.getByText('Teste resumo executivo aqui')).toBeTruthy();
  });

  it('discrepância com confidence >= 95 tem badge "Alta confiança"', () => {
    const resultado = makeResultado({
      paridade_geral: 'parcial',
      discrepancias: [{
        tipo: 'valor_divergente',
        severidade: 'critica',
        field_path: 'rubricas[0].valores_mensais[0].valor',
        competencia: '01/2016',
        current: 1000,
        suggested: 1200,
        delta_pct: 20,
        motivo: 'Valor divergente',
        evidencia_pdf: '1200,00',
        ai_confidence: 96,
      }],
    });
    const itens = new Map([[0, true]]);
    render(
      <RelatorioParidadeForense
        resultado={resultado}
        {...defaultProps}
        itensSelecionados={itens}
        countSelecionados={1}
      />,
    );
    expect(screen.getByText(/Alta confiança/)).toBeTruthy();
  });

  it('discrepância com confidence < 60 tem checkbox disabled', () => {
    const resultado = makeResultado({
      paridade_geral: 'parcial',
      discrepancias: [{
        tipo: 'valor_divergente',
        severidade: 'baixa',
        field_path: 'test.field',
        current: 'a',
        suggested: 'b',
        motivo: 'Teste',
        ai_confidence: 55,
      }],
    });
    const itens = new Map([[0, false]]);
    render(
      <RelatorioParidadeForense
        resultado={resultado}
        {...defaultProps}
        itensSelecionados={itens}
      />,
    );
    expect(screen.getByText(/Baixa confiança/)).toBeTruthy();
  });

  it('tab Discrepâncias mostra contagem correta', () => {
    const resultado = makeResultado({
      discrepancias: [
        { tipo: 'valor_divergente', severidade: 'critica', field_path: 'a', current: 1, suggested: 2, motivo: 'm', ai_confidence: 90 },
        { tipo: 'valor_divergente', severidade: 'alta', field_path: 'b', current: 3, suggested: 4, motivo: 'm', ai_confidence: 85 },
      ],
    });
    render(<RelatorioParidadeForense resultado={resultado} {...defaultProps} />);
    expect(screen.getByText('Discrepâncias (2)')).toBeTruthy();
  });

  it('botão aplicar disabled quando nenhum selecionado', () => {
    render(
      <RelatorioParidadeForense
        resultado={makeResultado()}
        {...defaultProps}
        countSelecionados={0}
      />,
    );
    const btn = screen.getByText(/Aplicar 0/);
    expect(btn.closest('button')?.disabled).toBe(true);
  });
});
