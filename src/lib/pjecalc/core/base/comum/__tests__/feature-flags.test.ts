/**
 * Testes do módulo de feature flags do port — Fase 0.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PORTED_MODULES,
  envVarForModule,
  isPortedEnabled,
  isAnyPortedEnabled,
  snapshotPortedFlags,
} from '../feature-flags';

const ORIGINAL_ENV = { ...process.env };

function clearPortedEnv() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('VITE_USE_PORTED_')) delete process.env[key];
  }
}

describe('feature-flags', () => {
  beforeEach(() => clearPortedEnv());
  afterEach(() => {
    clearPortedEnv();
    // Restaura o env original sem cascatear flags de teste
    for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
      if (k.startsWith('VITE_USE_PORTED_') && typeof v === 'string') {
        process.env[k] = v;
      }
    }
  });

  it('envVarForModule produz nomes canônicos', () => {
    expect(envVarForModule('IRPF')).toBe('VITE_USE_PORTED_IRPF');
    expect(envVarForModule('Fgts')).toBe('VITE_USE_PORTED_FGTS');
    expect(envVarForModule('salario_familia')).toBe('VITE_USE_PORTED_SALARIO_FAMILIA');
  });

  it('default é false para todos os módulos quando env vazio', () => {
    for (const m of PORTED_MODULES) {
      expect(isPortedEnabled(m)).toBe(false);
    }
    expect(isAnyPortedEnabled()).toBe(false);
  });

  it('aceita "true", "1", "on", "yes" como valores truthy (case-insensitive)', () => {
    for (const raw of ['true', 'TRUE', 'True', '1', 'on', 'ON', 'yes', 'YES']) {
      clearPortedEnv();
      process.env.VITE_USE_PORTED_IRPF = raw;
      expect(isPortedEnabled('IRPF'), `raw=${raw}`).toBe(true);
    }
  });

  it('rejeita valores falsy', () => {
    for (const raw of ['false', '0', 'off', 'no', '', 'random', ' FALSE ']) {
      clearPortedEnv();
      process.env.VITE_USE_PORTED_IRPF = raw;
      expect(isPortedEnabled('IRPF'), `raw=${raw}`).toBe(false);
    }
  });

  it('snapshotPortedFlags retorna estado por módulo', () => {
    process.env.VITE_USE_PORTED_IRPF = 'true';
    process.env.VITE_USE_PORTED_INSS = '1';
    const snap = snapshotPortedFlags();
    expect(snap.IRPF).toBe(true);
    expect(snap.INSS).toBe(true);
    expect(snap.FGTS).toBe(false);
    expect(Object.keys(snap).length).toBe(PORTED_MODULES.length);
  });

  it('isAnyPortedEnabled true quando pelo menos uma flag está on', () => {
    expect(isAnyPortedEnabled()).toBe(false);
    process.env.VITE_USE_PORTED_CARTAO = 'on';
    expect(isAnyPortedEnabled()).toBe(true);
  });

  it('aceita strings arbitrárias (módulos ainda não canônicos)', () => {
    expect(isPortedEnabled('MODULO_FUTURO')).toBe(false);
    process.env.VITE_USE_PORTED_MODULO_FUTURO = 'yes';
    expect(isPortedEnabled('MODULO_FUTURO')).toBe(true);
    expect(isPortedEnabled('modulo_futuro')).toBe(true); // case-insensitive no nome
  });
});
