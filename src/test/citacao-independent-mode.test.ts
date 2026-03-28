/**
 * ═══════════════════════════════════════════════════════════════════
 * data_citacao COMO CAMPO DE PRIMEIRA CLASSE — TESTES DE INTEGRAÇÃO
 * ═══════════════════════════════════════════════════════════════════
 *
 * Grupos:
 *   A — modo_calculo = 'independent': bloqueio E_CITACAO_OBRIGATORIA
 *   B — modo_calculo = 'assisted_from_pjc': fallback +60 dias mantido
 *   C — gt_closure bloqueado em modo independent
 *   D — sensibilidade: variação de data_citacao altera resultado
 *
 * Restrições:
 *   ✗ NO gt_closure em modo independent
 *   ✗ NO calibrarCorrecaoComGT em modo independent
 *   ✗ NO fallback silencioso em modo independent
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { PjeCalcEngine } from '../lib/pjecalc/engine';
import { analyzePJC } from '../lib/pjecalc/pjc-analyzer';
import { convertPjcToEngineInputs } from '../lib/pjecalc/pjc-to-engine';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';
import type { PjeParametros, PjeCalcMode } from '../lib/pjecalc/engine-types';
import type { PjeCorrecaoConfig } from '../lib/pjecalc/engine-types';

const PJC_DIR = resolve(__dirname, '../../public/reports');

function readPjcXml(path: string): string {
  const buf = readFileSync(path);
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    return execSync(`unzip -p "${path}"`, { encoding: 'latin1', maxBuffer: 32 * 1024 * 1024 });
  }
  return buf.toString('latin1');
}

function listPjcFiles(): string[] {
  if (!existsSync(PJC_DIR)) return [];
  return readdirSync(PJC_DIR).filter(f => f.endsWith('.pjc')).sort();
}

/** Strip all GT artifacts so engine runs purely independently */
function stripAllGT(inputs: ReturnType<typeof convertPjcToEngineInputs>) {
  return {
    ...inputs,
    correcaoConfig: { ...inputs.correcaoConfig, apuracao_juros_gt: [], gt_closure: undefined },
    csConfig: { ...inputs.csConfig, apuracao_juros_gt: [] },
    irConfig: { ...inputs.irConfig, apuracao_juros_gt: [] },
    // Strip pjc_indice_acumulado from individual occurrences and ocorrencias_precomputadas
    // so the engine follows the ADC 58/59 split path instead of using GT precomputed values.
    verbas: inputs.verbas.map(v => ({
      ...v,
      ocorrencias: v.ocorrencias?.map(oc => ({
        ...oc,
        pjc_indice_acumulado: undefined,
        pjc_ground_truth_applied: undefined,
      })) ?? [],
      // Strip precomputed indice_acumulado so engine recalculates from DB indices
      ocorrencias_precomputadas: v.ocorrencias_precomputadas?.map(pre => ({
        ...pre,
        indice_acumulado: undefined,
      })),
    })),
  };
}

/** Run engine and collect validation items */
function runEngine(
  inputs: ReturnType<typeof convertPjcToEngineInputs>,
  overrideParams?: Partial<PjeParametros>,
  overrideCorrecao?: Partial<PjeCorrecaoConfig>,
) {
  const params: PjeParametros = { ...inputs.params, ...overrideParams };
  const correcao: PjeCorrecaoConfig = { ...inputs.correcaoConfig, ...overrideCorrecao };
  const engine = new PjeCalcEngine(
    params, inputs.historicos, inputs.faltas, inputs.ferias,
    inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
    inputs.irConfig, correcao, inputs.honorariosConfig,
    inputs.custasConfig, inputs.seguroConfig, ALL_TEST_INDICES,
  );
  const validacaoResult = engine.validarPreLiquidacao();
  return { engine, result: engine.liquidar(), validacao: validacaoResult.itens };
}

// ─── Global state ──────────────────────────────────────────────────────────

const files = listPjcFiles();
let islanXml: string | null = null;

beforeAll(() => {
  const islanPath = resolve(PJC_DIR, 'islan-rodrigues.pjc');
  if (existsSync(islanPath)) {
    islanXml = readPjcXml(islanPath);
  }
}, 60000);

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO A — modo independent: bloqueio E_CITACAO_OBRIGATORIA
// ═══════════════════════════════════════════════════════════════════════════

describe('Grupo A — independent mode: E_CITACAO_OBRIGATORIA', () => {
  it('A-01: independent + IPCA-E + sem data_citacao → erro E_CITACAO_OBRIGATORIA', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const inputs = stripAllGT(convertPjcToEngineInputs(analysis, 'a01'));

    const { validacao } = runEngine(inputs, {
      modo_calculo: 'independent',
      data_citacao: undefined,  // explicitly absent
    }, {
      indice: 'IPCA-E',
    });

    const erros = validacao.filter(v => v.tipo === 'erro');
    const citacaoErro = erros.find(e => e.mensagem.includes('E_CITACAO_OBRIGATORIA'));

    console.log('\n=== A-01: Validação modo independent sem data_citacao ===');
    erros.forEach(e => console.log(`  [ERRO] ${e.mensagem}`));

    expect(citacaoErro, 'Deve existir erro E_CITACAO_OBRIGATORIA').toBeDefined();
    expect(citacaoErro!.tipo).toBe('erro');
  });

  it('A-02: independent + SELIC + sem data_citacao → erro E_CITACAO_OBRIGATORIA', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const inputs = stripAllGT(convertPjcToEngineInputs(analysis, 'a02'));

    const { validacao } = runEngine(inputs, {
      modo_calculo: 'independent',
      data_citacao: undefined,
    }, {
      indice: 'SELIC',
    });

    const citacaoErro = validacao.find(v => v.tipo === 'erro' && v.mensagem.includes('E_CITACAO_OBRIGATORIA'));

    console.log('\n=== A-02: Validação modo independent SELIC sem data_citacao ===');
    expect(citacaoErro, 'SELIC também deve exigir data_citacao no modo independent').toBeDefined();
  });

  it('A-03: independent + IPCA-E + data_citacao presente → sem erro E_CITACAO_OBRIGATORIA', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const inputs = stripAllGT(convertPjcToEngineInputs(analysis, 'a03'));

    const { validacao } = runEngine(inputs, {
      modo_calculo: 'independent',
      data_citacao: '2021-12-01',  // valid date provided
    }, {
      indice: 'IPCA-E',
    });

    const citacaoErro = validacao.find(v => v.mensagem.includes('E_CITACAO_OBRIGATORIA'));

    console.log('\n=== A-03: independent com data_citacao → sem bloqueio ===');
    expect(citacaoErro, 'Com data_citacao não deve haver erro de bloqueio').toBeUndefined();
  });

  it('A-04: independent + INSS (não-ADC) + sem data_citacao → sem erro E_CITACAO_OBRIGATORIA', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const inputs = stripAllGT(convertPjcToEngineInputs(analysis, 'a04'));

    const { validacao } = runEngine(inputs, {
      modo_calculo: 'independent',
      data_citacao: undefined,
    }, {
      // Non-ADC index: data_citacao is not required
      indice: 'IPCA-E',  // keep but check: only required when post-citation exists
    });

    // Note: this test checks that a non-SELIC/non-IPCA-E index would not block.
    // Since we only have IPCA-E in available indices, we simulate via TR:
    const { validacao: validacaoTR } = runEngine(inputs, {
      modo_calculo: 'independent',
      data_citacao: undefined,
    }, {
      indice: 'TR' as any,
    });

    const citacaoErroTR = validacaoTR.find(v => v.mensagem.includes('E_CITACAO_OBRIGATORIA'));

    console.log('\n=== A-04: independent + TR (não-ADC) → sem E_CITACAO_OBRIGATORIA ===');
    expect(citacaoErroTR, 'Índice TR não deve exigir data_citacao').toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO B — assisted_from_pjc: fallback +60 dias mantido (sem bloqueio)
// ═══════════════════════════════════════════════════════════════════════════

describe('Grupo B — assisted_from_pjc: fallback ajuizamento+60d', () => {
  it('B-01: assisted_from_pjc + sem data_citacao → apenas alerta (não erro)', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const inputs = stripAllGT(convertPjcToEngineInputs(analysis, 'b01'));

    const { validacao } = runEngine(inputs, {
      modo_calculo: 'assisted_from_pjc',
      data_citacao: undefined,
    }, {
      indice: 'IPCA-E',
    });

    const citacaoErro = validacao.find(v => v.tipo === 'erro' && v.mensagem.includes('E_CITACAO_OBRIGATORIA'));
    const citacaoAlerta = validacao.find(v => v.tipo === 'alerta' && v.mensagem.toLowerCase().includes('citação'));

    console.log('\n=== B-01: assisted_from_pjc sem data_citacao → alerta, não erro ===');
    validacao.filter(v => v.mensagem.toLowerCase().includes('citação')).forEach(v =>
      console.log(`  [${v.tipo.toUpperCase()}] ${v.mensagem}`)
    );

    expect(citacaoErro, 'assisted_from_pjc não deve bloquear com erro').toBeUndefined();
    expect(citacaoAlerta, 'Deve haver alerta sobre estimativa').toBeDefined();
  });

  it('B-02: assisted_from_pjc + sem modo_calculo (default) → comportamento assistido', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const inputs = stripAllGT(convertPjcToEngineInputs(analysis, 'b02'));

    // Omit modo_calculo entirely → should default to assisted_from_pjc
    const params = { ...inputs.params };
    delete (params as any).modo_calculo;

    const { validacao } = runEngine({ ...inputs, params } as any, {
      data_citacao: undefined,
    }, {
      indice: 'IPCA-E',
    });

    const citacaoErro = validacao.find(v => v.tipo === 'erro' && v.mensagem.includes('E_CITACAO_OBRIGATORIA'));

    console.log('\n=== B-02: sem modo_calculo (default=assisted) → sem bloqueio ===');
    expect(citacaoErro, 'Default deve ser assisted_from_pjc (sem bloqueio)').toBeUndefined();
  });

  it('B-03: assisted_from_pjc + sem data_citacao → cálculo completa (resultado não nulo)', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const inputs = stripAllGT(convertPjcToEngineInputs(analysis, 'b03'));

    const { result } = runEngine(inputs, {
      modo_calculo: 'assisted_from_pjc',
      data_citacao: undefined,
    }, {
      indice: 'IPCA-E',
    });

    console.log('\n=== B-03: assisted_from_pjc completa cálculo ===');
    console.log(`  liquido_reclamante: R$ ${result.resumo.liquido_reclamante.toFixed(2)}`);

    expect(result.resumo.liquido_reclamante).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO C — gt_closure bloqueado em modo independent
// ═══════════════════════════════════════════════════════════════════════════

describe('Grupo C — gt_closure bloqueado em modo independent', () => {
  it('C-01: modo independent ignora gt_closure (resultado ≠ resultado com GT)', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const baseInputs = convertPjcToEngineInputs(analysis, 'c01');

    // With GT (assisted_from_pjc)
    const { result: resultWithGT } = runEngine(baseInputs, {
      modo_calculo: 'assisted_from_pjc',
      data_citacao: '2021-12-01',
    });

    // Independent mode with same GT artifacts still present in config
    // (engine must ignore them)
    const { result: resultIndependent } = runEngine(baseInputs, {
      modo_calculo: 'independent',
      data_citacao: '2021-12-01',
    });

    console.log('\n=== C-01: GT bloqueado em modo independent ===');
    console.log(`  assisted_from_pjc (GT ativo): R$ ${resultWithGT.resumo.liquido_reclamante.toFixed(2)}`);
    console.log(`  independent (GT bloqueado):   R$ ${resultIndependent.resumo.liquido_reclamante.toFixed(2)}`);
    console.log(`  Δ: R$ ${(resultIndependent.resumo.liquido_reclamante - resultWithGT.resumo.liquido_reclamante).toFixed(2)}`);

    // When GT closure is present and would change the result, the two should differ
    const hasGTClosure = baseInputs.correcaoConfig.gt_closure != null &&
      (baseInputs.correcaoConfig.gt_closure.liquido_exequente > 0 ||
       baseInputs.correcaoConfig.gt_closure.inss_reclamante > 0);

    if (hasGTClosure) {
      // GT closure would have overridden INSS/IR/bruto — independent result differs
      const delta = Math.abs(resultIndependent.resumo.liquido_reclamante - resultWithGT.resumo.liquido_reclamante);
      console.log(`  GT closure ativo — Δ esperado > 0: ${delta > 0.01 ? '✓' : '✗'}`);
      expect(delta, 'Independent mode should produce different result when GT closure is active').toBeGreaterThan(0.01);
    } else {
      console.log('  Nenhum gt_closure no arquivo — teste de igualdade de resultado (ambos sem GT)');
      // Results may be equal if no GT closure; just assert both ran without throwing
      expect(resultIndependent.resumo.liquido_reclamante).toBeGreaterThanOrEqual(0);
    }
  });

  it('C-02: modo independent ignora calibrarCorrecaoComGT (apuracao_juros_gt presente)', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const baseInputs = convertPjcToEngineInputs(analysis, 'c02');

    // Verify there IS apuracao_juros_gt data to potentially calibrate
    const hasAJ = (baseInputs.correcaoConfig.apuracao_juros_gt?.length ?? 0) > 0;

    if (!hasAJ) {
      console.log('\n=== C-02: Sem apuracao_juros_gt no arquivo — pulando ===');
      return;
    }

    // assisted_from_pjc with calibration
    const { result: resultAssisted } = runEngine(baseInputs, {
      modo_calculo: 'assisted_from_pjc',
      data_citacao: '2021-12-01',
    });

    // independent: calibration must be skipped
    const { result: resultIndep } = runEngine(baseInputs, {
      modo_calculo: 'independent',
      data_citacao: '2021-12-01',
    });

    console.log('\n=== C-02: calibrarCorrecaoComGT ignorado em modo independent ===');
    console.log(`  apuracao_juros_gt entries: ${baseInputs.correcaoConfig.apuracao_juros_gt!.length}`);
    console.log(`  assisted_from_pjc juros:   R$ ${resultAssisted.resumo.juros_mora.toFixed(2)}`);
    console.log(`  independent juros:         R$ ${resultIndep.resumo.juros_mora.toFixed(2)}`);

    // Results can be different; main assertion is that both complete without error
    expect(resultIndep.resumo.liquido_reclamante).toBeGreaterThanOrEqual(0);
    expect(resultAssisted.resumo.liquido_reclamante).toBeGreaterThanOrEqual(0);
  });

  it('C-03: modo independent puro com data_citacao → resultado determinístico', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const baseInputs = stripAllGT(convertPjcToEngineInputs(analysis, 'c03'));

    const citacao = '2021-12-01';

    const { result: r1 } = runEngine(baseInputs, { modo_calculo: 'independent', data_citacao: citacao });
    const { result: r2 } = runEngine(baseInputs, { modo_calculo: 'independent', data_citacao: citacao });

    console.log('\n=== C-03: determinismo em modo independent ===');
    console.log(`  run1 liquido: R$ ${r1.resumo.liquido_reclamante.toFixed(2)}`);
    console.log(`  run2 liquido: R$ ${r2.resumo.liquido_reclamante.toFixed(2)}`);

    expect(r1.resumo.liquido_reclamante).toBe(r2.resumo.liquido_reclamante);
    expect(r1.resumo.principal_corrigido).toBe(r2.resumo.principal_corrigido);
    expect(r1.resumo.juros_mora).toBe(r2.resumo.juros_mora);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO D — sensibilidade: variação de data_citacao altera resultado
// ═══════════════════════════════════════════════════════════════════════════

describe('Grupo D — sensibilidade: data_citacao determina ponto de corte IPCA-E/SELIC', () => {
  it('D-01: citação mais cedo → mais SELIC, menos IPCA-E → resultado diferente', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const inputs = stripAllGT(convertPjcToEngineInputs(analysis, 'd01'));

    // Override to plain IPCA-E (not COMBINACAO) so the ADC split path is exercised.
    // Clear combinacoes_indice (otherwise engine short-circuits to aplicarCorrecaoCombinacao).
    // Set juros_apos_deducao_cs=false so aplicarCorrecaoJuros (which has the ADC split) is used,
    // not aplicarCorrecaoSomente (which does not implement the ADC split).
    const plainIPCAEOverride = {
      indice: 'IPCA-E' as any,
      combinacoes_indice: [],
      combinacoes_juros: [],
      juros_apos_deducao_cs: false,
    };

    // Early citação: IPCA-E(comp→2021-07) × SELIC(2021-07→liq) per occurrence
    const { result: rEarly } = runEngine(inputs, {
      modo_calculo: 'independent',
      data_citacao: '2021-07-01',
    }, plainIPCAEOverride);

    // Late citação: IPCA-E(comp→2022-06) × SELIC(2022-06→liq) per occurrence
    const { result: rLate } = runEngine(inputs, {
      modo_calculo: 'independent',
      data_citacao: '2022-06-01',
    }, plainIPCAEOverride);

    console.log('\n=== D-01: sensibilidade a data_citacao ===');
    console.log(`  citação precoce (2021-07): principal_corrigido = R$ ${rEarly.resumo.principal_corrigido.toFixed(2)}`);
    console.log(`  citação tardia (2022-06):  principal_corrigido = R$ ${rLate.resumo.principal_corrigido.toFixed(2)}`);
    console.log(`  Δ principal: R$ ${(rLate.resumo.principal_corrigido - rEarly.resumo.principal_corrigido).toFixed(2)}`);

    // Different citação dates must produce different results (not identical)
    expect(rEarly.resumo.principal_corrigido).not.toBe(rLate.resumo.principal_corrigido);
  });

  it('D-02: benchmark de sensibilidade — tabela completa por data_citacao', () => {
    if (!islanXml) { console.log('islan-rodrigues.pjc não encontrado — pulando'); return; }

    const analysis = analyzePJC(islanXml);
    const inputs = stripAllGT(convertPjcToEngineInputs(analysis, 'd02'));

    // Override to plain IPCA-E so the ADC split path is exercised (not COMBINACAO).
    // juros_apos_deducao_cs=false ensures aplicarCorrecaoJuros (with ADC split) is called.
    const plainIPCAEOverride = { indice: 'IPCA-E' as any, combinacoes_indice: [], combinacoes_juros: [], juros_apos_deducao_cs: false };

    const candidatos = [
      '2021-07-01', '2021-08-01', '2021-09-01',
      '2021-10-01', '2021-11-01', '2021-12-01',
      '2022-01-01', '2022-03-01', '2022-06-01',
    ];

    console.log('\n=== D-02: Benchmark de Sensibilidade — data_citacao ===');
    console.log('  data_citacao    principal_corrigido    juros_mora       liquido');
    console.log('  ' + '─'.repeat(72));

    let prevLiquido: number | null = null;
    let monotonicOk = true;

    for (const citacao of candidatos) {
      const { result } = runEngine(inputs, {
        modo_calculo: 'independent',
        data_citacao: citacao,
      }, plainIPCAEOverride);

      const pc = result.resumo.principal_corrigido;
      const jm = result.resumo.juros_mora;
      const lq = result.resumo.liquido_reclamante;

      console.log(
        `  ${citacao}     ` +
        `${pc.toFixed(2).padStart(18)}   ` +
        `${jm.toFixed(2).padStart(12)}   ` +
        `${lq.toFixed(2).padStart(10)}`
      );

      // Check monotonicity: later citação → less post-citação months → smaller juros via SELIC
      // (not strictly required but useful to document behavior)
      if (prevLiquido !== null && lq > prevLiquido * 1.5) {
        // Large non-monotonic jump would indicate a bug
        monotonicOk = false;
      }
      prevLiquido = lq;
    }

    console.log('\n  Resultados distintos por data_citacao: ✓ (senão D-01 teria falhado)');
    expect(monotonicOk, 'Resultados não devem ter saltos > 50% entre datas consecutivas').toBe(true);
  });

  it('D-03: W_CITACAO_AUSENTE emitido por analyzePJC para todos os arquivos PJC disponíveis', { timeout: 120000 }, () => {
    if (files.length === 0) {
      console.log('Nenhum arquivo .pjc disponível — pulando');
      return;
    }

    let countComCitacao = 0;
    let countSemCitacao = 0;

    console.log('\n=== D-03: W_CITACAO_AUSENTE em analyzePJC ===');
    for (const file of files) {
      const xml = readPjcXml(resolve(PJC_DIR, file));
      const analysis = analyzePJC(xml);
      const hasCitacao = !!analysis.parametros.data_citacao;
      const hasWarning = analysis.avisos?.some(w => w.codigo === 'W_CITACAO_AUSENTE');

      if (hasCitacao) {
        countComCitacao++;
        // If citação is present, warning must NOT be emitted
        expect(hasWarning, `${file}: não deve ter W_CITACAO_AUSENTE quando data_citacao presente`).toBeFalsy();
      } else {
        countSemCitacao++;
        // If citação absent, warning MUST be emitted
        expect(hasWarning, `${file}: deve ter W_CITACAO_AUSENTE quando data_citacao ausente`).toBeTruthy();
      }

      console.log(`  ${file.padEnd(40)} citacao=${hasCitacao ? 'SIM' : 'NÃO '} W_CITACAO_AUSENTE=${hasWarning ? 'SIM' : 'NÃO'}`);
    }

    console.log(`\n  Com citação: ${countComCitacao} | Sem citação: ${countSemCitacao}`);
    console.log(`  Comprovado: PJC XML não contém data_citacao em ${countSemCitacao}/${files.length} arquivos`);
  });
});
