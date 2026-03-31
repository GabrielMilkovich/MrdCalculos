/**
 * Sistema de Alerta de Índices — Detecção de desatualização
 */
import { describe, it, expect } from 'vitest';
import {
  verificarDesatualizacaoIndices,
  getUltimoMesDisponivel,
} from '../indices-fallback';

describe('Sistema de Alerta de Índices', () => {

  it('deve retornar último mês disponível para os 3 índices', () => {
    const status = getUltimoMesDisponivel();
    expect(status.ipca_e).toMatch(/^\d{4}-\d{2}$/);
    expect(status.selic).toMatch(/^\d{4}-\d{2}$/);
    expect(status.tr).toMatch(/^\d{4}-\d{2}$/);
    expect(status.mais_antigo).toMatch(/^\d{4}-\d{2}$/);
    // Dados devem ser recentes (após 2025-12)
    expect(status.mais_antigo >= '2025-12').toBe(true);
  });

  it('não deve alertar quando liquidação está dentro dos índices disponíveis', () => {
    const status = getUltimoMesDisponivel();
    const dataSegura = status.mais_antigo + '-01';
    const resultado = verificarDesatualizacaoIndices(dataSegura);
    expect(resultado.desatualizado).toBe(false);
    expect(resultado.meses_de_atraso).toBe(0);
    expect(resultado.warnings).toHaveLength(0);
    expect(resultado.bloqueante).toBe(false);
  });

  it('deve alertar (não bloqueante) com 1-3 meses de atraso', () => {
    const status = getUltimoMesDisponivel();
    const [ano, mes] = status.mais_antigo.split('-').map(Number);
    const mesAtraso = mes + 2 > 12
      ? `${ano + 1}-${String(mes + 2 - 12).padStart(2, '0')}`
      : `${ano}-${String(mes + 2).padStart(2, '0')}`;
    const resultado = verificarDesatualizacaoIndices(mesAtraso + '-15');
    expect(resultado.desatualizado).toBe(true);
    expect(resultado.meses_de_atraso).toBe(2);
    expect(resultado.warnings.length).toBeGreaterThan(0);
    expect(resultado.bloqueante).toBe(false);
  });

  it('deve bloquear com mais de 6 meses de atraso', () => {
    const resultado = verificarDesatualizacaoIndices('2030-01-01');
    expect(resultado.desatualizado).toBe(true);
    expect(resultado.meses_de_atraso).toBeGreaterThan(6);
    expect(resultado.bloqueante).toBe(true);
    expect(resultado.warnings.some(w => w.includes('BLOQUEIO'))).toBe(true);
  });

  it('não deve bloquear com data passada (dentro dos índices)', () => {
    const resultado = verificarDesatualizacaoIndices('2024-06-15');
    expect(resultado.desatualizado).toBe(false);
    expect(resultado.bloqueante).toBe(false);
  });
});
