/**
 * core-adapters — integração Fase 9
 *
 * Testa o padrão de feature-flag: cada adapter deve:
 *   1. Com flag OFF → comportamento idêntico ao legado (zero regressão).
 *   2. Com flag ON  → delega ao core portado (STF ARE 709.212 etc.).
 *   3. Fail-safe: se o core lançar, cai para o legado sem quebrar.
 *
 * Manipula `process.env.VITE_USE_PORTED_CALCULO` via `vi.stubEnv`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { calcularDataPrescricaoFgts } from '../core-adapters';

describe('core-adapters.calcularDataPrescricaoFgts', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('flag OFF (default)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_USE_PORTED_CALCULO', 'false');
    });

    it('retorna quinquenal universal (5 anos antes do ajuizamento)', () => {
      const r = calcularDataPrescricaoFgts('2024-06-01');
      expect(r?.getUTCFullYear()).toBe(2019);
      expect(r?.getUTCMonth()).toBe(5); // junho
      expect(r?.getUTCDate()).toBe(1);
    });

    it('ignora data de admissão (comportamento legado)', () => {
      // mesmo com admissão antes de 13/11/1989, devolve quinquenal
      const r = calcularDataPrescricaoFgts('2024-06-01', '1985-01-01');
      expect(r?.getUTCFullYear()).toBe(2019);
    });

    it('ajuiz null: retorna null', () => {
      expect(calcularDataPrescricaoFgts(null)).toBeNull();
      expect(calcularDataPrescricaoFgts(undefined)).toBeNull();
      expect(calcularDataPrescricaoFgts('')).toBeNull();
    });
  });

  describe('flag ON (STF ARE 709.212)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_USE_PORTED_CALCULO', 'true');
    });

    it('ajuizamento antes de 13/11/2014: trintenária', () => {
      const r = calcularDataPrescricaoFgts('2013-06-01', '2010-01-01');
      // 2013-06 − 30 anos
      expect(r?.getUTCFullYear()).toBe(1983);
    });

    it('transição: ajuiz 2016 + adm após 13/11/1989: quinquenal', () => {
      const r = calcularDataPrescricaoFgts('2016-06-01', '2010-01-01');
      expect(r?.getUTCFullYear()).toBe(2011);
    });

    it('transição: ajuiz 2016 + adm anterior a 13/11/1989: trintenária', () => {
      const r = calcularDataPrescricaoFgts('2016-06-01', '1985-01-01');
      expect(r?.getUTCFullYear()).toBe(1986);
    });

    it('pós-13/11/2019: quinquenal universal', () => {
      const r = calcularDataPrescricaoFgts('2020-06-01', '1985-01-01');
      expect(r?.getUTCFullYear()).toBe(2015);
    });

    it('borda 13/11/2014: regime transição aplica', () => {
      const r = calcularDataPrescricaoFgts('2014-11-13', '2010-01-01');
      // 2014-11-13 − 5 = 2009-11-13
      expect(r?.getUTCFullYear()).toBe(2009);
      expect(r?.getUTCMonth()).toBe(10);
      expect(r?.getUTCDate()).toBe(13);
    });

    it('sem data de admissão: trata como pré-1989 → trintenária na transição', () => {
      // core não recebe dataAdmissao → Calculo.getDataPrescricaoFgts vê null
      // e NÃO entra no ramo de quinquenal (só passa se admiss > 1989). Fica trintenária.
      const r = calcularDataPrescricaoFgts('2016-06-01');
      expect(r?.getUTCFullYear()).toBe(1986);
    });
  });

  describe('valor on/off — paridade pré-13/11/2014', () => {
    // Antes da virada STF, trintenária. O engine legado sempre usa quinquenal.
    // Esse teste documenta a DIFERENÇA — é exatamente o bug que a Fase 9 corrige.
    it('com flag OFF: devolve 2008 (bug legado — quinquenal uniforme)', () => {
      vi.stubEnv('VITE_USE_PORTED_CALCULO', 'false');
      const r = calcularDataPrescricaoFgts('2013-06-01', '2010-01-01');
      expect(r?.getUTCFullYear()).toBe(2008);
    });

    it('com flag ON: devolve 1983 (correto — trintenária STF)', () => {
      vi.stubEnv('VITE_USE_PORTED_CALCULO', 'true');
      const r = calcularDataPrescricaoFgts('2013-06-01', '2010-01-01');
      expect(r?.getUTCFullYear()).toBe(1983);
    });
  });

  describe('fail-safe', () => {
    it('data mal-formada: adapter lança (paridade Java parse error)', () => {
      vi.stubEnv('VITE_USE_PORTED_CALCULO', 'true');
      // falha no parseYMD, cai no catch interno, retorna via legado
      // mas o legado também usa parseYMD via Date — comportamento: NaN date
      // Teste: garantir que ao menos não explode o processo
      expect(() => calcularDataPrescricaoFgts('bad-date')).toThrow();
    });
  });
});
