// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MotorWarningsBanner, hasCriticalWarning } from '../MotorWarningsBanner';

describe('MotorWarningsBanner', () => {
  it('renders nothing when warnings is undefined', () => {
    const { container } = render(<MotorWarningsBanner warnings={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when warnings is empty array', () => {
    const { container } = render(<MotorWarningsBanner warnings={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders critical header when a critical warning is present', () => {
    render(
      <MotorWarningsBanner
        warnings={[{ code: 'W_ESTABILIDADE_MESES_ZERO', message: 'test' }]}
      />,
    );
    expect(screen.getByText('Pendências críticas detectadas no cálculo')).toBeTruthy();
    expect(screen.getByText(/Crítico/)).toBeTruthy();
  });

  it('does not render critical header for non-critical warnings', () => {
    render(
      <MotorWarningsBanner
        warnings={[{ code: 'W_CITACAO_ESTIMADA', message: 'test' }]}
      />,
    );
    expect(screen.queryByText('Pendências críticas detectadas no cálculo')).toBeNull();
  });

  it('sorts warnings by severity (critical first)', () => {
    const { container } = render(
      <MotorWarningsBanner
        warnings={[
          { code: 'W_SELIC_FALLBACK', message: 'medium' },
          { code: 'W_ESTABILIDADE_MESES_ZERO', message: 'critical' },
          { code: 'W_CITACAO_E_AJUIZAMENTO_AUSENTES', message: 'high' },
        ]}
      />,
    );
    const labels = container.querySelectorAll('[class*="text-xs"][class*="font-medium"]');
    const labelTexts = Array.from(labels).map(el => el.textContent);
    expect(labelTexts[0]).toBe('Crítico');
    expect(labelTexts[1]).toBe('Atenção');
    expect(labelTexts[2]).toBe('Aviso');
  });

  it('shows action_hint when present', () => {
    render(
      <MotorWarningsBanner
        warnings={[{ code: 'W_ESTABILIDADE_MESES_ZERO', message: 'test' }]}
      />,
    );
    expect(screen.getByText(/Volte ao módulo Estabilidade/)).toBeTruthy();
  });

  it('shows warning code in mono text', () => {
    render(
      <MotorWarningsBanner
        warnings={[{ code: 'W_CITACAO_ESTIMADA', message: 'test' }]}
      />,
    );
    const codeEl = screen.getByText('W_CITACAO_ESTIMADA');
    expect(codeEl.classList.contains('font-mono')).toBe(true);
  });

  it('renders user_message from catalog, not raw message', () => {
    render(
      <MotorWarningsBanner
        warnings={[{ code: 'W_CITACAO_ESTIMADA', message: 'raw technical detail' }]}
      />,
    );
    expect(screen.getByText(/Data de citação não informada/)).toBeTruthy();
    expect(screen.queryByText('raw technical detail')).toBeNull();
  });

  it('renders raw message for unknown warning codes', () => {
    render(
      <MotorWarningsBanner
        warnings={[{ code: 'W_UNKNOWN', message: 'Custom unknown warning' }]}
      />,
    );
    expect(screen.getByText('Custom unknown warning')).toBeTruthy();
  });
});

describe('hasCriticalWarning', () => {
  it('returns false for undefined', () => {
    expect(hasCriticalWarning(undefined)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasCriticalWarning([])).toBe(false);
  });

  it('returns true when a critical warning is present', () => {
    expect(
      hasCriticalWarning([{ code: 'W_ESTABILIDADE_MESES_ZERO', message: 'test' }]),
    ).toBe(true);
  });

  it('returns false when only medium/high warnings are present', () => {
    expect(
      hasCriticalWarning([
        { code: 'W_CITACAO_ESTIMADA', message: 'test' },
        { code: 'W_CITACAO_E_AJUIZAMENTO_AUSENTES', message: 'test' },
      ]),
    ).toBe(false);
  });

  it('returns false for unknown warning codes (default is medium)', () => {
    expect(
      hasCriticalWarning([{ code: 'W_RANDOM', message: 'test' }]),
    ).toBe(false);
  });
});
