import { describe, it, expect } from 'vitest';
import { enrichWarning, WARNING_CATALOG, SEVERITY_RANK } from '../warning-catalog';
import type { WarningSeverity } from '../warning-types';

describe('warning-catalog', () => {
  describe('enrichWarning', () => {
    it('maps known code to catalog entry', () => {
      const raw = { code: 'W_ESTABILIDADE_MESES_ZERO', message: 'Estabilidade tipo gestante sem meses' };
      const enriched = enrichWarning(raw);
      expect(enriched.code).toBe('W_ESTABILIDADE_MESES_ZERO');
      expect(enriched.severity).toBe('critical');
      expect(enriched.category).toBe('config');
      expect(enriched.user_message).toContain('Estabilidade marcada como ativa');
      expect(enriched.action_hint).toBeDefined();
      expect(enriched.module).toBe('estabilidade');
      expect(enriched.message).toBe(raw.message);
    });

    it('maps W_CITACAO_ESTIMADA to medium/data', () => {
      const enriched = enrichWarning({ code: 'W_CITACAO_ESTIMADA', message: 'test' });
      expect(enriched.severity).toBe('medium');
      expect(enriched.category).toBe('data');
      expect(enriched.module).toBe('dados_processo');
    });

    it('maps W_CITACAO_E_AJUIZAMENTO_AUSENTES to high/data', () => {
      const enriched = enrichWarning({ code: 'W_CITACAO_E_AJUIZAMENTO_AUSENTES', message: 'test' });
      expect(enriched.severity).toBe('high');
      expect(enriched.category).toBe('data');
    });

    it('maps W_INSALUBRIDADE_SM_FALLBACK to high/engine', () => {
      const enriched = enrichWarning({ code: 'W_INSALUBRIDADE_SM_FALLBACK', message: 'test' });
      expect(enriched.severity).toBe('high');
      expect(enriched.category).toBe('engine');
      expect(enriched.module).toBe('insalubridade');
    });

    it('maps W_SELIC_FALLBACK to medium/engine', () => {
      const enriched = enrichWarning({ code: 'W_SELIC_FALLBACK', message: 'test' });
      expect(enriched.severity).toBe('medium');
      expect(enriched.category).toBe('engine');
    });

    it('returns medium fallback for unknown code', () => {
      const raw = { code: 'W_UNKNOWN_FUTURE', message: 'Something new happened' };
      const enriched = enrichWarning(raw);
      expect(enriched.code).toBe('W_UNKNOWN_FUTURE');
      expect(enriched.severity).toBe('medium');
      expect(enriched.category).toBe('engine');
      expect(enriched.user_message).toBe(raw.message);
      expect(enriched.action_hint).toBeUndefined();
      expect(enriched.module).toBeUndefined();
    });

    it('preserves original message from raw warning', () => {
      const raw = { code: 'W_ESTABILIDADE_MESES_ZERO', message: 'Technical detail here' };
      const enriched = enrichWarning(raw);
      expect(enriched.message).toBe('Technical detail here');
      expect(enriched.user_message).not.toBe('Technical detail here');
    });
  });

  describe('SEVERITY_RANK', () => {
    it('orders critical < high < medium < info', () => {
      expect(SEVERITY_RANK.critical).toBeLessThan(SEVERITY_RANK.high);
      expect(SEVERITY_RANK.high).toBeLessThan(SEVERITY_RANK.medium);
      expect(SEVERITY_RANK.medium).toBeLessThan(SEVERITY_RANK.info);
    });

    it('sorts warnings correctly when used as comparator', () => {
      const severities: WarningSeverity[] = ['info', 'critical', 'medium', 'high'];
      const sorted = [...severities].sort((a, b) => SEVERITY_RANK[a] - SEVERITY_RANK[b]);
      expect(sorted).toEqual(['critical', 'high', 'medium', 'info']);
    });
  });

  describe('WARNING_CATALOG', () => {
    it('has entries for all 5 known warning codes', () => {
      const expectedCodes = [
        'W_ESTABILIDADE_MESES_ZERO',
        'W_CITACAO_ESTIMADA',
        'W_CITACAO_E_AJUIZAMENTO_AUSENTES',
        'W_INSALUBRIDADE_SM_FALLBACK',
        'W_SELIC_FALLBACK',
      ];
      for (const code of expectedCodes) {
        expect(WARNING_CATALOG[code]).toBeDefined();
        expect(WARNING_CATALOG[code].severity).toBeTruthy();
        expect(WARNING_CATALOG[code].category).toBeTruthy();
        expect(WARNING_CATALOG[code].user_message).toBeTruthy();
      }
    });

    it('every entry has valid severity and category', () => {
      const validSeverities = ['critical', 'high', 'medium', 'info'];
      const validCategories = ['engine', 'config', 'data', 'parity'];
      for (const [code, entry] of Object.entries(WARNING_CATALOG)) {
        expect(validSeverities).toContain(entry.severity);
        expect(validCategories).toContain(entry.category);
      }
    });
  });
});
