/**
 * Golden Test — Joseli Silva Wanderley vs Grupo Casas Bahia S.A.
 * Most complex benchmark: 52 verbas, R$ 510K, Art. 384 CLT, IR RRA
 */
import { describe, it, expect } from 'vitest';
import { JOSELI_SILVA_SNAPSHOT } from '../lib/golden/joseli-silva-snapshot';

const snap = JOSELI_SILVA_SNAPSHOT;

describe('Golden Snapshot — Joseli Silva vs Grupo Casas Bahia', () => {
  // === METADATA ===
  it('should have correct case metadata', () => {
    expect(snap.meta.reclamante).toBe('JOSELI SILVA WANDERLEY');
    expect(snap.meta.reclamado).toBe('GRUPO CASAS BAHIA S.A.');
    expect(snap.meta.admissao).toBe('2011-06-02');
    expect(snap.meta.demissao).toBe('2020-03-13');
    expect(snap.meta.ajuizamento).toBe('2021-08-17');
    expect(snap.meta.carga_horaria).toBe(220);
  });

  // === PRESCRIÇÃO QUINQUENAL ===
  it('should show prescription period (início cálculo ≠ admissão)', () => {
    expect(snap.meta.inicio_calculo).toBe('2016-08-17');
    expect(snap.meta.admissao).toBe('2011-06-02');
    // início_calculo = ajuizamento - 5 anos (prescrição quinquenal)
  });

  // === RUBRIC COUNTS ===
  it('should have principal rubrics', () => {
    const principais = snap.rubricas.filter(r => r.tipo === 'PRINCIPAL');
    expect(principais.length).toBe(4);
  });

  // === PRINCIPAL VALUES ===
  it('should have correct DIF Vendas a Prazo total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'DIF_VENDAS_A_PRAZO');
    expect(r?.total).toBe(40831.71);
  });

  it('should have correct DIF Vendas Canceladas total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'DIF_VENDAS_CANCELADAS');
    expect(r?.total).toBe(9073.70);
  });

  it('should have correct Prêmio Estímulo total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'PREMIO_ESTIMULO');
    expect(r?.total).toBe(42192.79);
  });

  it('should have correct Art. 384 CLT total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'ART384_CLT');
    expect(r?.total).toBe(40831.71);
  });

  // === COINCIDENCE: Art 384 = DIF Vendas a Prazo ===
  it('should show Art 384 = DIF Vendas a Prazo (same arithmetic result)', () => {
    const art = snap.rubricas.find(r => r.codigo === 'ART384_CLT');
    const vp = snap.rubricas.find(r => r.codigo === 'DIF_VENDAS_A_PRAZO');
    expect(art?.total).toBe(vp?.total);
  });

  // === 13º REFLEXOS ===
  it('should have 13º sobre Interjornada', () => {
    const r = snap.rubricas.find(r => r.codigo === '13_INTERJORNADAS');
    expect(r?.total).toBe(11184.25);
  });

  it('should have 13º sobre Intrajornada', () => {
    const r = snap.rubricas.find(r => r.codigo === '13_INTRAJORNADA');
    expect(r?.total).toBe(26580.73);
  });

  it('should have 13º sobre Art 384 (MEDIA_PELA_QUANTIDADE = same)', () => {
    const r = snap.rubricas.find(r => r.codigo === '13_ART384');
    expect(r?.total).toBe(40831.71);
  });

  // === RESUMO FINANCEIRO ===
  it('should have correct líquido exequente (R$ 510K)', () => {
    expect(snap.resumo.liquido_exequente).toBe(510459.85);
  });

  it('should have correct INSS reclamante', () => {
    expect(snap.resumo.inss_reclamante).toBe(42357.67);
  });

  it('should have correct INSS reclamado', () => {
    expect(snap.resumo.inss_reclamado).toBe(107981.05);
  });

  it('should have significant IR (first case with IR)', () => {
    expect(snap.resumo.imposto_renda).toBe(50023.93);
    expect(snap.resumo.imposto_renda).toBeGreaterThan(0);
  });

  it('should have correct honorários', () => {
    expect(snap.resumo.honorarios_valor).toBe(88162.37);
    expect(snap.resumo.honorarios_nome).toBe('MARCOS ROBERTO DIAS');
  });

  it('should have correct custas (R$ 2.000)', () => {
    expect(snap.resumo.custas).toBe(2000);
  });

  // === NOVEL PATTERNS ===
  it('should validate this is a long case (44 competências)', () => {
    // inicio_calculo to termino_calculo = ~44 months
    const start = new Date(snap.meta.inicio_calculo);
    const end = new Date(snap.meta.termino_calculo);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    expect(months).toBeGreaterThanOrEqual(43);
  });
});
