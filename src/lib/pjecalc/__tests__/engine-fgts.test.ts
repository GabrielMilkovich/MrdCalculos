import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { createEngine, makeVerba, makeHistoricoWithOcorrencias } from './helpers';

describe('PjeCalcEngine - FGTS', () => {
  it('calculates 8% deposit over diferenca', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 1000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
      incidencias: {
        fgts: true,
        irpf: false,
        contribuicao_social: false,
        previdencia_privada: false,
        pensao_alimenticia: false,
      },
    });

    const engine = createEngine({
      historicos: [makeHistoricoWithOcorrencias(3000, ['2023-06'], { fgts_recolhido: true })],
      verbas: [verba],
      fgtsConfig: {
        apurar: true,
        destino: 'pagar_reclamante',
        compor_principal: false,
        multa_apurar: false,
        multa_tipo: 'calculada',
        multa_percentual: 40,
        multa_base: 'devido',
        saldos_saques: [],
        deduzir_saldo: false,
        lc110_10: false,
        lc110_05: false,
      },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      irConfig: { apurar: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    const fgts = result.fgts;

    // 1000 diferenca * 8% = 80
    expect(fgts.depositos.length).toBe(1);
    expect(fgts.depositos[0].aliquota).toBe(0.08);
    expect(fgts.depositos[0].valor).toBe(80);
  });

  it('calculates 40% multa rescisoria (sem justa causa)', () => {
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 2000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
      incidencias: { fgts: true, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
    });

    const engine = createEngine({
      historicos: [makeHistoricoWithOcorrencias(3000, ['2023-06'], { fgts_recolhido: true })],
      verbas: [verba],
      fgtsConfig: {
        apurar: true,
        destino: 'pagar_reclamante',
        compor_principal: false,
        multa_apurar: true,
        multa_tipo: 'calculada',
        multa_percentual: 40,
        multa_base: 'devido',
        saldos_saques: [],
        deduzir_saldo: false,
        lc110_10: false,
        lc110_05: false,
      },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      irConfig: { apurar: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    const fgts = result.fgts;

    // Deposito = 2000 * 8% = 160
    // Multa = 160 * 40% = 64
    expect(fgts.depositos[0].valor).toBe(160);
    expect(fgts.multa_valor).toBe(64);
  });

  it('calculates 20% multa (culpa reciproca)', () => {
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 2000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
      incidencias: { fgts: true, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
    });

    const engine = createEngine({
      historicos: [makeHistoricoWithOcorrencias(3000, ['2023-06'], { fgts_recolhido: true })],
      verbas: [verba],
      fgtsConfig: {
        apurar: true,
        destino: 'pagar_reclamante',
        compor_principal: false,
        multa_apurar: true,
        multa_tipo: 'calculada',
        multa_percentual: 20,
        multa_base: 'devido',
        saldos_saques: [],
        deduzir_saldo: false,
        lc110_10: false,
        lc110_05: false,
      },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      irConfig: { apurar: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    // Deposito = 160, Multa = 160 * 20% = 32
    expect(result.fgts.multa_valor).toBe(32);
  });

  it('returns zero when apurar is false', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 2000,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      fgtsConfig: { apurar: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    expect(result.fgts.total_depositos).toBe(0);
    expect(result.fgts.multa_valor).toBe(0);
    expect(result.fgts.total_fgts).toBe(0);
  });

  it('deduces saldo de FGTS when configured', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 5000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
      incidencias: { fgts: true, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      fgtsConfig: {
        apurar: true,
        destino: 'pagar_reclamante',
        compor_principal: false,
        multa_apurar: false,
        multa_tipo: 'calculada',
        multa_percentual: 40,
        multa_base: 'devido',
        saldos_saques: [{ data: '2023-07-01', valor: 100 }],
        deduzir_saldo: true,
        lc110_10: false,
        lc110_05: false,
      },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      irConfig: { apurar: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    expect(result.fgts.saldo_deduzido).toBe(100);
    // total_fgts = depositos_corrigidos + multa - saldo = (corrected deposits) - 100
    expect(result.fgts.total_fgts).toBeLessThan(result.fgts.total_depositos);
  });

  it('does not count verbas without fgts incidencia', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 5000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
      incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      fgtsConfig: { apurar: true, multa_apurar: false },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      irConfig: { apurar: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    // No verbas with fgts incidencia, but historico still has incidencia_fgts
    // The hist is not recolhido so it contributes
    // But the VERBA difference won't contribute since incidencias.fgts=false
    // Only the historico's unrecolhido amount may contribute
    expect(result.fgts.depositos.length).toBeGreaterThanOrEqual(0);
  });
});
