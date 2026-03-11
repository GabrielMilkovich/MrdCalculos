/**
 * Table Validator Tests
 * Tests pre-calculation validation of historical tables.
 */

import { describe, it, expect } from 'vitest';
import { validarTabelasHistoricas, type TableValidationInput } from '../lib/pjecalc/domain/table-validator';

function baseInput(overrides: Partial<TableValidationInput> = {}): TableValidationInput {
  return {
    competencia_inicio: '2020-01',
    competencia_fim: '2023-06',
    indice_correcao: 'IPCA-E',
    indicesDB: [],
    faixasINSSDB: [],
    faixasIRDB: [],
    apurar_cs: true,
    apurar_ir: true,
    apurar_fgts: true,
    data_liquidacao: '2025-01-15',
    modo_precomputado: false,
    ...overrides,
  };
}

describe('Table Validator', () => {
  it('should allow calculation in precomputed mode even without tables', () => {
    const result = validarTabelasHistoricas(baseInput({ modo_precomputado: true }));
    expect(result.can_proceed).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should block when data_liquidacao is missing', () => {
    const result = validarTabelasHistoricas(baseInput({ data_liquidacao: '' }));
    expect(result.can_proceed).toBe(false);
    expect(result.errors.some(e => e.code === 'E002')).toBe(true);
  });

  it('should warn when no indices are available', () => {
    const result = validarTabelasHistoricas(baseInput());
    expect(result.warnings.some(w => w.code === 'W010')).toBe(true);
  });

  it('should warn when no INSS brackets are available', () => {
    const result = validarTabelasHistoricas(baseInput());
    expect(result.warnings.some(w => w.code === 'W012')).toBe(true);
  });

  it('should compute coverage percentages', () => {
    const result = validarTabelasHistoricas(baseInput());
    expect(result.coverage.competencias_total).toBe(42); // 2020-01 to 2023-06
  });

  it('should reject empty competência range', () => {
    const result = validarTabelasHistoricas(baseInput({ competencia_inicio: '', competencia_fim: '' }));
    expect(result.can_proceed).toBe(false);
    expect(result.errors.some(e => e.code === 'E000')).toBe(true);
  });
});
