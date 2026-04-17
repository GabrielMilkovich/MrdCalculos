/**
 * @vitest-environment jsdom
 *
 * Forensic Diagnostic Test — Isolating the EXACT cause of delta
 * between MRD CALC independent mode and PJe-Calc.
 *
 * Three comparative modes per case:
 *   MODE 1: Current independent baseline (known delta)
 *   MODE 2: Independent + PJC correction factors injected (isolates correction index delta)
 *   MODE 3: Independent + PJC correction + VERBA_INSS juros base adjustment (isolates juros base delta)
 */
import { describe, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60_000 });

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import Decimal from 'decimal.js';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO } from '../indices-fallback';
import type { PjeLiquidacaoResult, PjeIndiceRow, PjeVerbaResult, PjeOcorrenciaResult } from '../engine-types';

// ────────────────────────────────────────────────────────────────────────────
// Shared infrastructure (mirrored from pjc-comparison.test.ts)
// ────────────────────────────────────────────────────────────────────────────

function buildIndicesDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  for (const [comp, acum] of Object.entries(IPCA_E_ACUMULADO)) {
    rows.push({ indice: 'IPCA-E', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCAE', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
  for (const [comp, acum] of Object.entries(SELIC_ACUMULADO)) {
    rows.push({ indice: 'SELIC', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
  return rows;
}
const INDICES_DB = buildIndicesDB();

interface GoldenExpected {
  liquido: number;
  inss_reclamante: number;
  inss_reclamado: number;
  ir: number;
  custas: number;
}

interface GoldenCase {
  file: string;
  beneficiario: string;
  expected: GoldenExpected;
}

const GOLDEN_CASES: GoldenCase[] = [
  {
    file: 'antonio-harley.pjc',
    beneficiario: 'ANTONIO HARLEY MARQUES GOMES',
    expected: { liquido: 39929.92, inss_reclamante: 2405.58, inss_reclamado: 6336.11, ir: 0.00, custas: 400.00 },
  },
  {
    file: 'izabela-cristina.pjc',
    beneficiario: 'IZABELA CRISTINA RANGEL DO AMARAL',
    expected: { liquido: 73879.96, inss_reclamante: 5550.27, inss_reclamado: 14373.85, ir: 0.00, custas: 800.00 },
  },
  {
    file: 'joseli-silva.pjc',
    beneficiario: 'JOSELI SILVA WANDERLEY',
    expected: { liquido: 510459.85, inss_reclamante: 42357.67, inss_reclamado: 107981.05, ir: 50023.93, custas: 2000.00 },
  },
  {
    file: 'roque-guerreiro.pjc',
    beneficiario: 'ROQUE GUERREIRO TEIXEIRA',
    expected: { liquido: 231306.58, inss_reclamante: 20403.15, inss_reclamado: 46916.24, ir: 0.00, custas: 400.00 },
  },
  {
    file: 'rosicleia-pereira-chaves.pjc',
    beneficiario: 'ROSICLEIA PEREIRA CHAVES',
    expected: { liquido: 247215.95, inss_reclamante: 23475.40, inss_reclamado: 53224.55, ir: 4185.26, custas: 0 },
  },
];

const REPORTS_DIR = path.resolve(__dirname, '../../../../public/reports');
const xmlCache = new Map<string, string>();

function readPjcXml(filename: string): string {
  if (xmlCache.has(filename)) return xmlCache.get(filename)!;
  const filePath = path.join(REPORTS_DIR, filename);
  const buffer = fs.readFileSync(filePath);
  let xml: string;
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    try {
      xml = execSync(`unzip -p "${filePath}"`, { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' });
    } catch {
      xml = buffer.toString('latin1');
    }
  } else {
    const text = buffer.toString('utf-8');
    xml = (text.includes('<?xml') || text.includes('<Calculo')) ? text : buffer.toString('latin1');
  }
  xmlCache.set(filename, xml);
  return xml;
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctDelta(actual: number, expected: number): string {
  if (expected === 0) return actual === 0 ? '0.00%' : 'INF%';
  const pct = ((actual - expected) / Math.abs(expected)) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

// ────────────────────────────────────────────────────────────────────────────
// Engine runner (independent mode only)
// ────────────────────────────────────────────────────────────────────────────

function runIndependent(xmlString: string): PjeLiquidacaoResult | { error: string } {
  const analysis = analyzePJC(xmlString);
  const inputs = convertPjcToEngineInputs(analysis, 'test-independent');
  inputs.params.modo_calculo = 'independent';
  inputs.correcaoConfig.gt_closure = undefined;
  inputs.correcaoConfig.apuracao_juros_gt = undefined;
  if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
  if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;
  if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;

  try {
    const engine = new PjeCalcEngineV3(
      inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
      inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
      inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
      inputs.custasConfig, inputs.seguroConfig, INDICES_DB, [], [],
      inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
      inputs.pensaoConfig, inputs.salarioFamiliaConfig,
    );
    return engine.liquidar();
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PJC correction factor extraction
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extract PJC indiceAcumulado per competencia from the raw XML.
 * Returns a map: competencia (YYYY-MM) -> indiceAcumulado.
 * When multiple verbas share the same competencia, they should have the
 * same correction factor, so we just take the first non-null one.
 */
function extractPjcCorrectionFactors(xmlString: string): Map<string, number> {
  const analysis = analyzePJC(xmlString);
  const factorMap = new Map<string, number>();

  for (const v of analysis.verbas) {
    for (const oc of v.ocorrencias_all) {
      if (oc.indice_acumulado && oc.indice_acumulado > 0) {
        // competencia from analyzer is YYYY-MM-DD; use YYYY-MM as key
        const key = oc.competencia.slice(0, 7);
        if (!factorMap.has(key)) {
          factorMap.set(key, oc.indice_acumulado);
        }
      }
    }
  }

  return factorMap;
}

// ────────────────────────────────────────────────────────────────────────────
// Deep clone helper
// ────────────────────────────────────────────────────────────────────────────

function deepCloneResult(r: PjeLiquidacaoResult): PjeLiquidacaoResult {
  return JSON.parse(JSON.stringify(r));
}

// ────────────────────────────────────────────────────────────────────────────
// Recalculate resumo totals from verbas (after overriding correction/juros)
// ────────────────────────────────────────────────────────────────────────────

function recalcResumoFromVerbas(result: PjeLiquidacaoResult): void {
  let principalCorrigido = new Decimal(0);
  let jurosMora = new Decimal(0);

  for (const vr of result.verbas) {
    let vrCorrigido = new Decimal(0);
    let vrJuros = new Decimal(0);
    let vrFinal = new Decimal(0);

    for (const oc of vr.ocorrencias) {
      vrCorrigido = vrCorrigido.plus(oc.valor_corrigido);
      vrJuros = vrJuros.plus(oc.juros);
      vrFinal = vrFinal.plus(oc.valor_final);
    }

    vr.total_corrigido = Number(vrCorrigido.toDP(2));
    vr.total_juros = Number(vrJuros.toDP(2));
    vr.total_final = Number(vrFinal.toDP(2));

    principalCorrigido = principalCorrigido.plus(vrCorrigido);
    jurosMora = jurosMora.plus(vrJuros);
  }

  result.resumo.principal_corrigido = Number(principalCorrigido.toDP(2));
  result.resumo.juros_mora = Number(jurosMora.toDP(2));

  // Recompute liquido: bruto + salario_familia - cs_segurado - ir - prev_privada - pensao - contrib_sindical
  const brutoTotal = Number(
    principalCorrigido
      .plus(jurosMora)
      .plus(result.resumo.abono_pecuniario || 0)
      .toDP(2)
  );
  const liquido = Number(
    new Decimal(brutoTotal)
      .plus(result.resumo.salario_familia || 0)
      .minus(result.resumo.cs_segurado)
      .minus(result.resumo.ir_retido)
      .minus(result.resumo.previdencia_privada || 0)
      .minus(result.resumo.pensao_total || 0)
      .minus(result.resumo.contribuicao_sindical || 0)
      .toDP(2)
  );
  result.resumo.liquido_reclamante = liquido;
}

// ────────────────────────────────────────────────────────────────────────────
// MODE 2: Override correction indices with PJC factors
// ────────────────────────────────────────────────────────────────────────────

function applyMode2(
  result: PjeLiquidacaoResult,
  pjcFactorMap: Map<string, number>,
): { overridden: number; total: number } {
  let overridden = 0;
  let total = 0;

  for (const vr of result.verbas) {
    for (const oc of vr.ocorrencias) {
      total++;
      if (oc.diferenca === 0) continue;

      const compKey = oc.competencia.slice(0, 7);
      const pjcFactor = pjcFactorMap.get(compKey);

      if (pjcFactor && pjcFactor > 0) {
        overridden++;
        const oldCorrigido = oc.valor_corrigido;

        // Override correction with PJC factor
        oc.indice_correcao = pjcFactor;
        oc.valor_corrigido = Number(
          new Decimal(oc.diferenca).times(pjcFactor).toDP(2, Decimal.ROUND_HALF_EVEN).toNumber()
        );

        // Recompute juros proportionally: if original had juros, scale by ratio of new/old corrected
        if (oc.juros !== 0 && oldCorrigido !== 0) {
          // Keep the same juros rate (juros/old_corrigido), apply to new corrected value
          const jurosRate = new Decimal(oc.juros).div(oldCorrigido);
          oc.juros = Number(jurosRate.times(oc.valor_corrigido).toDP(2, Decimal.ROUND_HALF_EVEN).toNumber());
        }

        oc.valor_final = Number(
          new Decimal(oc.valor_corrigido).plus(oc.juros).toDP(2).toNumber()
        );
      }
    }
  }

  recalcResumoFromVerbas(result);
  return { overridden, total };
}

// ────────────────────────────────────────────────────────────────────────────
// MODE 3: Mode 2 + VERBA_INSS juros base adjustment
// In PJe-Calc, "baseDeJurosDasVerbas = VERBA_INSS" means juros are
// calculated on (diferenca - proportional INSS share), not on full diferenca.
// After INSS is computed, reduce the juros base.
// ────────────────────────────────────────────────────────────────────────────

function applyMode3(
  result: PjeLiquidacaoResult,
  pjcFactorMap: Map<string, number>,
): { overridden: number; total: number; jurosAdjusted: number } {
  let overridden = 0;
  let total = 0;
  let jurosAdjusted = 0;

  // First, compute the proportional INSS rate from the engine's CS result.
  // INSS reclamante rate = cs_segurado / principal_bruto
  const principalBruto = result.resumo.principal_bruto || 1;
  const inssRate = result.resumo.cs_segurado > 0
    ? new Decimal(result.resumo.cs_segurado).div(principalBruto)
    : new Decimal(0);

  for (const vr of result.verbas) {
    for (const oc of vr.ocorrencias) {
      total++;
      if (oc.diferenca === 0) continue;

      const compKey = oc.competencia.slice(0, 7);
      const pjcFactor = pjcFactorMap.get(compKey);

      if (pjcFactor && pjcFactor > 0) {
        overridden++;

        // Override correction with PJC factor
        oc.indice_correcao = pjcFactor;
        oc.valor_corrigido = Number(
          new Decimal(oc.diferenca).times(pjcFactor).toDP(2, Decimal.ROUND_HALF_EVEN).toNumber()
        );

        // MODE 3 juros adjustment: reduce juros base by proportional INSS
        // juros_base = diferenca - (diferenca * inssRate) = diferenca * (1 - inssRate)
        const jurosBase = Number(
          new Decimal(oc.diferenca).times(new Decimal(1).minus(inssRate)).toDP(2).toNumber()
        );
        const jurosBaseCorrigido = Number(
          new Decimal(jurosBase).times(pjcFactor).toDP(2, Decimal.ROUND_HALF_EVEN).toNumber()
        );

        // Recompute juros using the original juros rate applied to the INSS-reduced base
        if (oc.juros !== 0 && oc.valor_corrigido !== 0) {
          // Use the original engine's juros rate (juros proportion relative to corrected value)
          // but apply it to the reduced base
          const originalFullCorrigido = oc.valor_corrigido;
          const jurosRatio = originalFullCorrigido > 0
            ? new Decimal(oc.juros).div(originalFullCorrigido)
            : new Decimal(0);
          // Actually we need the original juros rate from the engine before Mode 2 override.
          // Since this function is called on a fresh clone, we need to reconstruct.
          // Instead, compute juros as: (jurosBaseCorrigido / valor_corrigido) * original_juros_amount
          // Simpler: scale juros by (jurosBaseCorrigido / valor_corrigido)
          if (originalFullCorrigido > 0) {
            const reductionFactor = new Decimal(jurosBaseCorrigido).div(originalFullCorrigido);
            // But we need the juros from Mode 2 first. Let's compute from scratch.
            jurosAdjusted++;
          }
        }
      }
    }
  }

  // Re-run Mode 2 first to get the corrected juros, then apply INSS reduction
  // Strategy: Clone the result, apply Mode 2, then reduce juros by INSS proportion
  // Actually, let's do this more cleanly in two passes.

  // PASS 1: Apply PJC correction factors (same as Mode 2)
  // We already did this above. Now PASS 2: reduce juros by INSS proportion.
  jurosAdjusted = 0;
  for (const vr of result.verbas) {
    for (const oc of vr.ocorrencias) {
      if (oc.diferenca === 0 || oc.juros === 0) continue;
      // Reduce juros by the INSS proportion
      const reduction = new Decimal(1).minus(inssRate);
      const newJuros = Number(new Decimal(oc.juros).times(reduction).toDP(2, Decimal.ROUND_HALF_EVEN).toNumber());
      if (newJuros !== oc.juros) {
        oc.juros = newJuros;
        oc.valor_final = Number(new Decimal(oc.valor_corrigido).plus(oc.juros).toDP(2).toNumber());
        jurosAdjusted++;
      }
    }
  }

  recalcResumoFromVerbas(result);
  return { overridden, total, jurosAdjusted };
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

interface ModeResult {
  label: string;
  liquido: number;
  principal_corrigido: number;
  juros_mora: number;
  cs_segurado: number;
  ir_retido: number;
}

describe('Diagnostic Delta — Forensic isolation of MRD vs PJe-Calc delta', () => {
  const summaryRows: {
    name: string;
    pjcLiquido: number;
    mode1: number;
    mode2: number;
    mode3: number;
    delta1: number;
    delta2: number;
    delta3: number;
  }[] = [];

  for (const gc of GOLDEN_CASES) {
    it(`DIAGNOSTIC: ${gc.beneficiario}`, () => {
      const xml = readPjcXml(gc.file);

      // ── Extract PJC correction factors ──
      const pjcFactorMap = extractPjcCorrectionFactors(xml);
      console.log(`\n  PJC correction factors extracted: ${pjcFactorMap.size} competencias`);

      // ── MODE 1: Current independent baseline ──
      const mode1Result = runIndependent(xml);
      if ('error' in mode1Result) {
        console.log(`  MODE 1 ERROR: ${mode1Result.error}`);
        summaryRows.push({
          name: gc.beneficiario, pjcLiquido: gc.expected.liquido,
          mode1: NaN, mode2: NaN, mode3: NaN,
          delta1: NaN, delta2: NaN, delta3: NaN,
        });
        return;
      }

      const mode1Liquido = mode1Result.resumo.liquido_reclamante;

      // ── MODE 2: Independent + PJC correction factors ──
      const mode2Result = deepCloneResult(mode1Result);
      const m2Stats = applyMode2(mode2Result, pjcFactorMap);
      const mode2Liquido = mode2Result.resumo.liquido_reclamante;
      console.log(`  Mode 2: overrode ${m2Stats.overridden}/${m2Stats.total} occurrences with PJC indices`);

      // ── MODE 3: Mode 2 + INSS juros base ──
      const mode3Result = deepCloneResult(mode1Result);
      const m3Stats = applyMode3(mode3Result, pjcFactorMap);
      const mode3Liquido = mode3Result.resumo.liquido_reclamante;
      console.log(`  Mode 3: adjusted juros on ${m3Stats.jurosAdjusted} occurrences for INSS base`);

      // ── Compute deltas ──
      const pjcLiq = gc.expected.liquido;
      const delta1 = mode1Liquido - pjcLiq;
      const delta2 = mode2Liquido - pjcLiq;
      const delta3 = mode3Liquido - pjcLiq;

      const delta1Pct = pjcLiq !== 0 ? (delta1 / Math.abs(pjcLiq)) * 100 : 0;
      const delta2Pct = pjcLiq !== 0 ? (delta2 / Math.abs(pjcLiq)) * 100 : 0;
      const delta3Pct = pjcLiq !== 0 ? (delta3 / Math.abs(pjcLiq)) * 100 : 0;

      // ── Print comparison table ──
      console.log(`\n${'='.repeat(80)}`);
      console.log(`  DIAGNOSTIC: ${gc.beneficiario}`);
      console.log(`${'='.repeat(80)}`);
      console.log(
        '  Mode'.padEnd(28) +
        'Liquido'.padStart(16) +
        'Delta'.padStart(16) +
        'Delta%'.padStart(12)
      );
      console.log(`  ${'-'.repeat(70)}`);

      console.log(
        '  PJe-Calc'.padEnd(28) +
        fmtBRL(pjcLiq).padStart(16) +
        '---'.padStart(16) +
        '---'.padStart(12)
      );
      console.log(
        '  Mode 1 (current)'.padEnd(28) +
        fmtBRL(mode1Liquido).padStart(16) +
        (`${delta1 >= 0 ? '+' : ''}${fmtBRL(delta1)}`).padStart(16) +
        (`${delta1Pct >= 0 ? '+' : ''}${delta1Pct.toFixed(2)}%`).padStart(12)
      );
      console.log(
        '  Mode 2 (+PJC idx)'.padEnd(28) +
        fmtBRL(mode2Liquido).padStart(16) +
        (`${delta2 >= 0 ? '+' : ''}${fmtBRL(delta2)}`).padStart(16) +
        (`${delta2Pct >= 0 ? '+' : ''}${delta2Pct.toFixed(2)}%`).padStart(12)
      );
      console.log(
        '  Mode 3 (+INSS base)'.padEnd(28) +
        fmtBRL(mode3Liquido).padStart(16) +
        (`${delta3 >= 0 ? '+' : ''}${fmtBRL(delta3)}`).padStart(16) +
        (`${delta3Pct >= 0 ? '+' : ''}${delta3Pct.toFixed(2)}%`).padStart(12)
      );

      // ── Delta reduction analysis ──
      const absDelta1 = Math.abs(delta1);
      const absDelta2 = Math.abs(delta2);
      const absDelta3 = Math.abs(delta3);

      const reductionM1toM2 = absDelta1 > 0 ? ((absDelta1 - absDelta2) / absDelta1) * 100 : 0;
      const reductionM2toM3 = absDelta1 > 0 ? ((absDelta2 - absDelta3) / absDelta1) * 100 : 0;
      const remainingPct = absDelta1 > 0 ? (absDelta3 / absDelta1) * 100 : 0;

      console.log('');
      console.log(`  Delta reduction Mode 1 -> Mode 2: ${reductionM1toM2.toFixed(2)}% of original delta eliminated`);
      console.log(`  Delta reduction Mode 2 -> Mode 3: ${reductionM2toM3.toFixed(2)}% of original delta eliminated`);
      console.log(`  Remaining delta: ${remainingPct.toFixed(2)}% of original`);

      // ── Detailed breakdown: correction vs juros vs CS/IR ──
      console.log('');
      console.log('  Component breakdown:');
      console.log(`    Principal corrigido: Mode1=${fmtBRL(mode1Result.resumo.principal_corrigido)} / Mode2=${fmtBRL(mode2Result.resumo.principal_corrigido)} / PJC=n/a`);
      console.log(`    Juros mora:          Mode1=${fmtBRL(mode1Result.resumo.juros_mora)} / Mode2=${fmtBRL(mode2Result.resumo.juros_mora)} / Mode3=${fmtBRL(mode3Result.resumo.juros_mora)}`);
      console.log(`    CS segurado:         ${fmtBRL(mode1Result.resumo.cs_segurado)} (same across modes, PJC=${fmtBRL(gc.expected.inss_reclamante)})`);
      console.log(`    IR retido:           ${fmtBRL(mode1Result.resumo.ir_retido)} (same across modes, PJC=${fmtBRL(gc.expected.ir)})`);

      // Store for summary
      summaryRows.push({
        name: gc.beneficiario,
        pjcLiquido: pjcLiq,
        mode1: mode1Liquido,
        mode2: mode2Liquido,
        mode3: mode3Liquido,
        delta1, delta2, delta3,
      });

      // Soft pass — diagnostic test
      expect(mode1Result.resumo).toBeDefined();
    });
  }

  // ── Grand Summary ──
  it('SUMMARY: Delta attribution across all cases', () => {
    if (summaryRows.length === 0) {
      console.log('  No results to summarize.');
      return;
    }

    console.log(`\n${'='.repeat(110)}`);
    console.log('  GRAND SUMMARY: FORENSIC DELTA ATTRIBUTION');
    console.log(`${'='.repeat(110)}`);
    console.log(
      '  Case'.padEnd(30) +
      'PJe-Calc'.padStart(14) +
      'Mode1'.padStart(14) +
      'Mode2'.padStart(14) +
      'Mode3'.padStart(14) +
      'Idx Fix%'.padStart(10) +
      'Juros Fix%'.padStart(12) +
      'Remain%'.padStart(10)
    );
    console.log(`  ${'-'.repeat(106)}`);

    let totalAbsDelta1 = 0;
    let totalAbsDelta2 = 0;
    let totalAbsDelta3 = 0;

    for (const row of summaryRows) {
      if (isNaN(row.mode1)) {
        const shortName = row.name.split(' ').slice(0, 2).join(' ');
        console.log(`  ${shortName.padEnd(28)}  ERROR`);
        continue;
      }

      const absDelta1 = Math.abs(row.delta1);
      const absDelta2 = Math.abs(row.delta2);
      const absDelta3 = Math.abs(row.delta3);

      totalAbsDelta1 += absDelta1;
      totalAbsDelta2 += absDelta2;
      totalAbsDelta3 += absDelta3;

      const idxFixPct = absDelta1 > 0 ? ((absDelta1 - absDelta2) / absDelta1) * 100 : 0;
      const jurosFix = absDelta1 > 0 ? ((absDelta2 - absDelta3) / absDelta1) * 100 : 0;
      const remainPct = absDelta1 > 0 ? (absDelta3 / absDelta1) * 100 : 0;

      const shortName = row.name.split(' ').slice(0, 2).join(' ');
      console.log(
        `  ${shortName.padEnd(28)}` +
        fmtBRL(row.pjcLiquido).padStart(14) +
        fmtBRL(row.mode1).padStart(14) +
        fmtBRL(row.mode2).padStart(14) +
        fmtBRL(row.mode3).padStart(14) +
        `${idxFixPct.toFixed(1)}%`.padStart(10) +
        `${jurosFix.toFixed(1)}%`.padStart(12) +
        `${remainPct.toFixed(1)}%`.padStart(10)
      );
    }

    // Aggregated totals
    const aggIdxFix = totalAbsDelta1 > 0 ? ((totalAbsDelta1 - totalAbsDelta2) / totalAbsDelta1) * 100 : 0;
    const aggJurosFix = totalAbsDelta1 > 0 ? ((totalAbsDelta2 - totalAbsDelta3) / totalAbsDelta1) * 100 : 0;
    const aggRemain = totalAbsDelta1 > 0 ? (totalAbsDelta3 / totalAbsDelta1) * 100 : 0;

    console.log(`  ${'-'.repeat(106)}`);
    console.log(
      '  AGGREGATE'.padEnd(28) +
      ''.padStart(14) +
      ''.padStart(14) +
      ''.padStart(14) +
      ''.padStart(14) +
      `${aggIdxFix.toFixed(1)}%`.padStart(10) +
      `${aggJurosFix.toFixed(1)}%`.padStart(12) +
      `${aggRemain.toFixed(1)}%`.padStart(10)
    );

    console.log('');
    console.log('  DIAGNOSIS:');
    console.log(`    1. Correction indices account for ${aggIdxFix.toFixed(1)}% of the total delta`);
    console.log(`    2. Juros base (VERBA_INSS) accounts for ${aggJurosFix.toFixed(1)}% of the total delta`);
    console.log(`    3. Remaining unexplained: ${aggRemain.toFixed(1)}% (likely CS/IR table differences, rounding, or verba calculation differences)`);
    console.log('');

    expect(summaryRows.length).toBeGreaterThan(0);
  });
});
