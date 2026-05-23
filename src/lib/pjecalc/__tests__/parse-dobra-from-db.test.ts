/**
 * Sprint Hotfix bug #10 — regressão da conversão dobra DB→domain.
 *
 * Antes do fix, `!!Number(x)` booleanizava qualquer não-zero como true,
 * fazendo ocs sem dobra (dobra=1 no banco, default do persist) virarem
 * true e o engine exportar `2` em todas as CALCULADA. Resultado: bruto
 * inflado em 2× nos casos importados de PJC.
 *
 * Estes testes cravam a semântica correta (threshold >= 2) e impedem
 * regressão silenciosa caso alguém tente reverter o conversor.
 */

import { describe, expect, it } from 'vitest';
import { parseDobraFromDb } from '../parse-dobra-from-db';

describe('parseDobraFromDb — conversão NUMERIC(4,2) → boolean', () => {
  describe('semântica correta (threshold >= 2)', () => {
    it('0 → false (sem dobra)', () => {
      expect(parseDobraFromDb(0)).toBe(false);
    });

    it('1 → false (default do persist, sem dobra legal)', () => {
      // PJC_IMPORT grava 1 quando oc.dobra é false (pjc-persist.ts:275).
      // Antes do fix, !!Number(1) → true → bug #10 inflava bruto em 2×.
      expect(parseDobraFromDb(1)).toBe(false);
    });

    it('2 → true (dobra legítima — Art. 467 CLT, férias Art. 137 §2º)', () => {
      expect(parseDobraFromDb(2)).toBe(true);
    });
  });

  describe('robustez contra tipos diversos', () => {
    it('aceita string numérica (PostgREST pode entregar NUMERIC como string)', () => {
      expect(parseDobraFromDb('1.00')).toBe(false);
      expect(parseDobraFromDb('2.00')).toBe(true);
      expect(parseDobraFromDb('0')).toBe(false);
    });

    it('aceita null/undefined → false (defesa)', () => {
      expect(parseDobraFromDb(null)).toBe(false);
      expect(parseDobraFromDb(undefined)).toBe(false);
    });

    it('NaN/string lixo → false (não confunde com dobra legítima)', () => {
      expect(parseDobraFromDb('abc')).toBe(false);
      expect(parseDobraFromDb({})).toBe(false);
      expect(parseDobraFromDb([])).toBe(false);
    });

    it('valores > 2 também viram true (defesa contra triplas hipotéticas)', () => {
      expect(parseDobraFromDb(3)).toBe(true);
      expect(parseDobraFromDb(2.5)).toBe(true);
    });
  });
});
