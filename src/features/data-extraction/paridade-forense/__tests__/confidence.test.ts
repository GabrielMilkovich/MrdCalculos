import { describe, expect, it } from 'vitest';
import { mapConfidenceToCheckboxState } from '../confidence';

describe('mapConfidenceToCheckboxState', () => {
  it('95+ → pre_marcado=true, badge=alta, disabled=false', () => {
    expect(mapConfidenceToCheckboxState(95)).toEqual({ pre_marcado: true, badge: 'alta', aplicar_disabled: false });
    expect(mapConfidenceToCheckboxState(100)).toEqual({ pre_marcado: true, badge: 'alta', aplicar_disabled: false });
  });

  it('80-94 → pre_marcado=true, badge=revisar, disabled=false', () => {
    expect(mapConfidenceToCheckboxState(80)).toEqual({ pre_marcado: true, badge: 'revisar', aplicar_disabled: false });
    expect(mapConfidenceToCheckboxState(94)).toEqual({ pre_marcado: true, badge: 'revisar', aplicar_disabled: false });
  });

  it('60-79 → pre_marcado=false, badge=verificar, disabled=false', () => {
    expect(mapConfidenceToCheckboxState(60)).toEqual({ pre_marcado: false, badge: 'verificar', aplicar_disabled: false });
    expect(mapConfidenceToCheckboxState(79)).toEqual({ pre_marcado: false, badge: 'verificar', aplicar_disabled: false });
  });

  it('<60 → pre_marcado=false, badge=baixa, disabled=true', () => {
    expect(mapConfidenceToCheckboxState(59)).toEqual({ pre_marcado: false, badge: 'baixa', aplicar_disabled: true });
    expect(mapConfidenceToCheckboxState(0)).toEqual({ pre_marcado: false, badge: 'baixa', aplicar_disabled: true });
  });

  it('boundary cases', () => {
    expect(mapConfidenceToCheckboxState(95).badge).toBe('alta');
    expect(mapConfidenceToCheckboxState(94).badge).toBe('revisar');
    expect(mapConfidenceToCheckboxState(80).badge).toBe('revisar');
    expect(mapConfidenceToCheckboxState(79).badge).toBe('verificar');
    expect(mapConfidenceToCheckboxState(60).badge).toBe('verificar');
    expect(mapConfidenceToCheckboxState(59).badge).toBe('baixa');
  });
});
