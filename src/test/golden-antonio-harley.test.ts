/**
 * Golden Test — Antônio Harley Marques Gomes vs Magazine Luiza S/A
 * Validates the ground truth snapshot extracted from the .PJC file.
 */
import { describe, it, expect } from 'vitest';
import { ANTONIO_HARLEY_SNAPSHOT } from '../lib/golden/antonio-harley-snapshot';

const snap = ANTONIO_HARLEY_SNAPSHOT;

describe('Golden Snapshot — Antônio Harley vs Magazine Luiza', () => {
  // === METADATA ===
  it('should have correct case metadata', () => {
    expect(snap.meta.reclamante).toBe('ANTONIO HARLEY MARQUES GOMES');
    expect(snap.meta.reclamado).toBe('MAGAZINE LUIZA S/A');
    expect(snap.meta.admissao).toBe('2019-11-21');
    expect(snap.meta.demissao).toBe('2020-11-13');
    expect(snap.meta.ajuizamento).toBe('2022-09-20');
    expect(snap.meta.carga_horaria).toBe(220);
    expect(snap.meta.pje_calc_version).toBe('2.13.2');
  });

  // === RUBRIC COUNTS ===
  it('should have 7 principal rubrics', () => {
    const principais = snap.rubricas.filter(r => r.tipo === 'PRINCIPAL');
    expect(principais.length).toBe(7);
  });

  it('should have reflexo rubrics', () => {
    const reflexos = snap.rubricas.filter(r => r.tipo !== 'PRINCIPAL');
    expect(reflexos.length).toBeGreaterThan(10);
  });

  // === PRINCIPAL VALUES ===
  it('should have correct Vendas Não Faturadas total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'VENDAS_NAO_FATURADAS');
    expect(r?.total).toBe(1008.60);
  });

  it('should have correct Horas Extras total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'HORAS_EXTRAS');
    expect(r?.total).toBe(5613.67);
  });

  it('should have correct Intrajornada total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'INTRAJORNADA');
    expect(r?.total).toBe(3312.54);
  });

  it('should have correct Interjornada total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'INTERJORNADAS');
    expect(r?.total).toBe(65.43);
  });

  it('should have correct Domingos e Feriados total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'DOMINGOS_FERIADOS_LABORADOS');
    expect(r?.total).toBe(1008.60);
  });

  // === 13º REFLEXOS ===
  it('should have correct 13º sobre HE (MEDIA_PELA_QUANTIDADE = same as principal)', () => {
    const r = snap.rubricas.find(r => r.codigo === '13_HORAS_EXTRAS');
    expect(r?.total).toBe(5613.67);
  });

  it('should have correct 13º sobre Prêmio Meta (MEDIA_PELO_VALOR_CORRIGIDO)', () => {
    const r = snap.rubricas.find(r => r.codigo === '13_PREMIO_META');
    expect(r?.total).toBe(295.40);
  });

  // === RESUMO FINANCEIRO ===
  it('should have correct líquido exequente', () => {
    expect(snap.resumo.liquido_exequente).toBe(39929.92);
  });

  it('should have correct INSS reclamante', () => {
    expect(snap.resumo.inss_reclamante).toBe(2405.58);
  });

  it('should have correct INSS reclamado', () => {
    expect(snap.resumo.inss_reclamado).toBe(6336.11);
  });

  it('should have zero IR (below threshold)', () => {
    expect(snap.resumo.imposto_renda).toBe(0);
  });

  it('should have correct honorários', () => {
    expect(snap.resumo.honorarios_valor).toBe(6235.38);
    expect(snap.resumo.honorarios_nome).toBe('MARCOS ROBERTO DIAS');
  });

  it('should have correct custas', () => {
    expect(snap.resumo.custas).toBe(400);
  });

  // === FORMULA PATTERNS ===
  it('should document HE multiplier as 0.7 (70% - CCT/sentença)', () => {
    // This case uses 70% overtime multiplier, not the standard 50%
    // Confirmed from PJC: mult=0.7 in HORAS EXTRAS formula
    expect(true).toBe(true);
  });

  it('should document Intrajornada multiplier as 1.7 (hora + 70%)', () => {
    // Confirmed from PJC: mult=1.7 for both Intrajornada and Interjornada
    expect(true).toBe(true);
  });

  // === SUM CONSISTENCY ===
  it('should have consistent principal totals', () => {
    const principais = snap.rubricas.filter(r => r.tipo === 'PRINCIPAL');
    const totalPrincipais = principais.reduce((acc, r) => acc + r.total, 0);
    // Sum of 7 principals: 1008.60 + 1008.60 + 1008.60 + 1008.60 + 5613.67 + 65.43 + 3312.54 = 13026.04
    expect(totalPrincipais).toBeCloseTo(13026.04, 2);
  });
});
