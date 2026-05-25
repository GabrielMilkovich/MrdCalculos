// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationBanner } from '../ValidationBanner';
import type { FichaFinanceiraParsed } from '../ficha-financeira-types';

function makeValidacao(
  overrides: Partial<FichaFinanceiraParsed['validacao']> = {},
): FichaFinanceiraParsed['validacao'] {
  return {
    ok: true,
    competencias: [],
    resumo: {
      total_competencias: 3,
      competencias_ok: 3,
      competencias_fora: 0,
      competencias_sem_total: 0,
      pior_delta_pct: 0.05,
    },
    ...overrides,
  };
}

describe('ValidationBanner', () => {
  it('mostra verde quando validação ok sem ausentes', () => {
    render(<ValidationBanner validacao={makeValidacao()} />);
    expect(screen.getByText(/Validado/)).toBeTruthy();
    expect(screen.getByText(/3 meses OK/)).toBeTruthy();
  });

  it('mostra amarelo quando ok mas com meses sem total', () => {
    render(
      <ValidationBanner
        validacao={makeValidacao({
          resumo: {
            total_competencias: 5,
            competencias_ok: 3,
            competencias_fora: 0,
            competencias_sem_total: 2,
            pior_delta_pct: 0.1,
          },
        })}
      />,
    );
    expect(screen.getByText(/2 sem total no PDF/)).toBeTruthy();
  });

  it('mostra vermelho quando validação falha', () => {
    render(
      <ValidationBanner
        validacao={makeValidacao({
          ok: false,
          resumo: {
            total_competencias: 5,
            competencias_ok: 3,
            competencias_fora: 2,
            competencias_sem_total: 0,
            pior_delta_pct: 8.3,
          },
        })}
      />,
    );
    expect(screen.getByText(/2 meses fora/)).toBeTruthy();
    expect(screen.getByText(/8\.3%/)).toBeTruthy();
  });

  it('singular quando apenas 1 mês OK', () => {
    render(
      <ValidationBanner
        validacao={makeValidacao({
          resumo: {
            total_competencias: 1,
            competencias_ok: 1,
            competencias_fora: 0,
            competencias_sem_total: 0,
            pior_delta_pct: 0,
          },
        })}
      />,
    );
    expect(screen.getByText(/1 mês OK/)).toBeTruthy();
  });

  it('singular quando 1 mês fora', () => {
    render(
      <ValidationBanner
        validacao={makeValidacao({
          ok: false,
          resumo: {
            total_competencias: 2,
            competencias_ok: 1,
            competencias_fora: 1,
            competencias_sem_total: 0,
            pior_delta_pct: 5.5,
          },
        })}
      />,
    );
    expect(screen.getByText(/1 mês fora/)).toBeTruthy();
  });
});
