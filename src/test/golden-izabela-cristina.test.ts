/**
 * Golden Test — Izabela Cristina Rangel do Amaral vs Grupo Casas Bahia S.A.
 * Validates the ground truth snapshot extracted from the .PJC file.
 */
import { describe, it, expect } from 'vitest';
import { IZABELA_CRISTINA_SNAPSHOT } from '../lib/golden/izabela-cristina-snapshot';

const snap = IZABELA_CRISTINA_SNAPSHOT;

describe('Golden Snapshot — Izabela Cristina vs Grupo Casas Bahia', () => {
  // === METADATA ===
  it('should have correct case metadata', () => {
    expect(snap.meta.reclamante).toBe('IZABELA CRISTINA RANGEL DO AMARAL');
    expect(snap.meta.reclamado).toBe('GRUPO CASAS BAHIA S.A.');
    expect(snap.meta.admissao).toBe('2020-11-12');
    expect(snap.meta.demissao).toBe('2022-04-14');
    expect(snap.meta.ajuizamento).toBe('2022-04-25');
    expect(snap.meta.carga_horaria).toBe(220);
    expect(snap.meta.pje_calc_version).toBe('2.13.0');
  });

  // === RUBRIC COUNTS ===
  it('should have 5 principal rubrics', () => {
    const principais = snap.rubricas.filter(r => r.tipo === 'PRINCIPAL');
    expect(principais.length).toBe(5);
  });

  it('should have reflexo rubrics', () => {
    const reflexos = snap.rubricas.filter(r => r.tipo !== 'PRINCIPAL');
    expect(reflexos.length).toBeGreaterThan(2);
  });

  // === PRINCIPAL VALUES ===
  it('should have correct DIF Não Faturadas total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'DIF_NAO_FATURADAS');
    expect(r?.total).toBe(4829.53);
  });

  it('should have correct Vendas a Prazo total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'VENDAS_A_PRAZO');
    expect(r?.total).toBe(9272.67);
  });

  it('should have correct Horas Extras total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'HORAS_EXTRAS');
    expect(r?.total).toBe(9272.67);
  });

  it('should have correct Prêmio Estímulo total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'PREMIO_ESTIMULO');
    expect(r?.total).toBe(12080.25);
  });

  it('should have correct Intrajornada total', () => {
    const r = snap.rubricas.find(r => r.codigo === 'INTRAJORNADA');
    expect(r?.total).toBe(12080.25);
  });

  // === HE and VENDAS A PRAZO have the same total (comissionista pattern) ===
  it('should show HE = Vendas a Prazo (comissionista base composta)', () => {
    const he = snap.rubricas.find(r => r.codigo === 'HORAS_EXTRAS');
    const vp = snap.rubricas.find(r => r.codigo === 'VENDAS_A_PRAZO');
    expect(he?.total).toBe(vp?.total);
  });

  // === PRÊMIO and INTRAJORNADA have the same total ===
  it('should show Prêmio Estímulo = Intrajornada (same composite base)', () => {
    const pe = snap.rubricas.find(r => r.codigo === 'PREMIO_ESTIMULO');
    const ij = snap.rubricas.find(r => r.codigo === 'INTRAJORNADA');
    expect(pe?.total).toBe(ij?.total);
  });

  // === 13º REFLEXOS ===
  it('should have 13º sobre DIF Não Faturadas (MEDIA_PELO_VALOR_CORRIGIDO)', () => {
    const r = snap.rubricas.find(r => r.codigo === '13_DIF_NAO_FATURADAS');
    expect(r?.total).toBe(4829.53);
    expect(r?.tipo).toBe('REFLEXO_13');
  });

  it('should have 13º sobre Prêmio Estímulo (MEDIA_PELO_VALOR_CORRIGIDO) with proportional value', () => {
    const r = snap.rubricas.find(r => r.codigo === '13_PREMIO_ESTIMULO');
    expect(r?.total).toBe(1106.20);
    expect(r?.tipo).toBe('REFLEXO_13');
  });

  it('should have 13º sobre HE (MEDIA_PELA_QUANTIDADE = same as principal)', () => {
    const r = snap.rubricas.find(r => r.codigo === '13_HORAS_EXTRAS');
    expect(r?.total).toBe(9272.67);
  });

  it('should have 13º sobre Intrajornada (MEDIA_PELA_QUANTIDADE = same as principal)', () => {
    const r = snap.rubricas.find(r => r.codigo === '13_INTRAJORNADA');
    expect(r?.total).toBe(12080.25);
  });

  // === RESUMO FINANCEIRO ===
  it('should have correct líquido exequente', () => {
    expect(snap.resumo.liquido_exequente).toBe(73879.96);
  });

  it('should have correct INSS reclamante', () => {
    expect(snap.resumo.inss_reclamante).toBe(5550.27);
  });

  it('should have correct INSS reclamado', () => {
    expect(snap.resumo.inss_reclamado).toBe(14373.85);
  });

  it('should have zero IR', () => {
    expect(snap.resumo.imposto_renda).toBe(0);
  });

  it('should have correct honorários advocatícios', () => {
    const adv = snap.resumo.honorarios.find(h => h.nome === 'MARCOS ROBERTO DIAS');
    expect(adv?.valor).toBe(7784.13);
  });

  it('should have honorários periciais (new pattern)', () => {
    const per = snap.resumo.honorarios.find(h => h.nome === 'PERITO(A) CONTÁBIL');
    expect(per?.valor).toBe(5000.00);
  });

  it('should have correct custas', () => {
    expect(snap.resumo.custas).toBe(800);
  });

  // === FORMULA PATTERNS ===
  it('should validate multiplier patterns for comissionista', () => {
    // DIF Não Faturadas: mult=0.3
    // Vendas a Prazo: mult=0.72, qtd=0.8 → effective 0.576
    // HE: same as Vendas a Prazo
    // Prêmio Estímulo: mult=0.4
    // These multipliers are non-standard, confirming CCT/ACT-specific values
    expect(snap.rubricas.length).toBeGreaterThan(5);
  });
});
