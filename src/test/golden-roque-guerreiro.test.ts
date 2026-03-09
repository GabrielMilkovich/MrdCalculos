/**
 * Golden Test — Roque Guerreiro Teixeira vs Grupo Casas Bahia S.A.
 */
import { describe, it, expect } from 'vitest';
import { ROQUE_GUERREIRO_SNAPSHOT } from '../lib/golden/roque-guerreiro-snapshot';

const snap = ROQUE_GUERREIRO_SNAPSHOT;

describe('Golden Snapshot — Roque Guerreiro vs Grupo Casas Bahia', () => {
  it('should have correct metadata', () => {
    expect(snap.meta.reclamante).toBe('ROQUE GUERREIRO TEIXEIRA');
    expect(snap.meta.reclamado).toBe('GRUPO CASAS BAHIA S.A.');
    expect(snap.meta.admissao).toBe('2003-11-24');
    expect(snap.meta.demissao).toBe('2021-03-09');
    expect(snap.meta.carga_horaria).toBe(220);
  });

  it('should have prescrição quinquenal enabled', () => {
    expect(snap.meta.prescricao_quinquenal).toBe(true);
    expect(snap.meta.inicio_calculo).toBe('2016-06-21');
  });

  // === PRINCIPALS ===
  it('should have correct Vendas Não Faturadas', () => {
    expect(snap.rubricas.find(r => r.codigo === 'VENDAS_NAO_FATURADAS')?.total).toBe(31793.51);
  });

  it('should have correct Prêmio Estímulo', () => {
    expect(snap.rubricas.find(r => r.codigo === 'PREMIO_ESTIMULO')?.total).toBe(31793.51);
  });

  it('should have correct Horas Extras', () => {
    expect(snap.rubricas.find(r => r.codigo === 'HORAS_EXTRAS')?.total).toBe(31793.51);
  });

  it('should show three verbas with identical total (composite base pattern)', () => {
    const vnf = snap.rubricas.find(r => r.codigo === 'VENDAS_NAO_FATURADAS')?.total;
    const pe = snap.rubricas.find(r => r.codigo === 'PREMIO_ESTIMULO')?.total;
    const he = snap.rubricas.find(r => r.codigo === 'HORAS_EXTRAS')?.total;
    expect(vnf).toBe(pe);
    expect(pe).toBe(he);
  });

  // === RSR COMISSIONISTA (with paid amount) ===
  it('should have RSR with diferença (devido - pago)', () => {
    const rsr = snap.rubricas.find(r => r.codigo === 'RSR_COMISSIONISTA');
    expect(rsr?.total).toBe(5681.98);
  });

  // === REFLEXOS ===
  it('should have 13º Intrajornada', () => {
    expect(snap.rubricas.find(r => r.codigo === '13_INTRAJORNADA')?.total).toBe(832.22);
  });

  it('should have 13º HE (MEDIA_PELA_QUANTIDADE = same as principal)', () => {
    expect(snap.rubricas.find(r => r.codigo === '13_HORAS_EXTRAS')?.total).toBe(31793.51);
  });

  it('should have 13º Prêmio (MEDIA_PELO_VALOR_CORRIGIDO)', () => {
    expect(snap.rubricas.find(r => r.codigo === '13_PREMIO_ESTIMULO')?.total).toBe(4785.15);
  });

  it('should have 13º RSR (MEDIA_PELO_VALOR)', () => {
    expect(snap.rubricas.find(r => r.codigo === '13_RSR')?.total).toBe(5681.98);
  });

  it('should have 13º Vendas NF (MEDIA_PELO_VALOR_CORRIGIDO)', () => {
    expect(snap.rubricas.find(r => r.codigo === '13_VENDAS_NAO_FATURADAS')?.total).toBe(2760.67);
  });

  // === AP edge case ===
  it('should have AP sobre HE with minimal value (R$ 1.92)', () => {
    expect(snap.rubricas.find(r => r.codigo === 'AP_HORAS_EXTRAS')?.total).toBe(1.92);
  });

  // === RESUMO ===
  it('should have correct líquido', () => {
    expect(snap.resumo.liquido_exequente).toBe(231306.58);
  });

  it('should have correct INSS reclamante/reclamado', () => {
    expect(snap.resumo.inss_reclamante).toBe(20403.15);
    expect(snap.resumo.inss_reclamado).toBe(46916.24);
  });

  it('should have zero IR', () => {
    expect(snap.resumo.imposto_renda).toBe(0);
  });

  it('should have correct honorários and custas', () => {
    expect(snap.resumo.honorarios_valor).toBe(24445.72);
    expect(snap.resumo.custas).toBe(400);
  });
});
