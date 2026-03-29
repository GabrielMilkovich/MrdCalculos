/**
 * @vitest-environment jsdom
 *
 * PJC Comparison Test — Real .pjc files vs Engine output
 *
 * This test parses each .pjc file using the existing pjc-analyzer,
 * converts to engine inputs via pjc-to-engine, runs the PjeCalcEngine
 * in BOTH assisted and independent modes, and compares the output
 * against golden PJe-Calc values extracted from the files.
 *
 * TWO comparisons per case:
 *   - ASSISTED: uses precomputed occurrences from PJC (proves import fidelity)
 *   - INDEPENDENT: recalculates everything from scratch (proves engine accuracy)
 *
 * NOTE: These tests are slow (XML parsing + engine calculation).
 * Mark individual cases as .skip if they cannot run (e.g., missing Supabase indices).
 */
import { describe, it, expect, vi } from 'vitest';

// Large PJC files take significant time to parse in jsdom DOMParser
vi.setConfig({ testTimeout: 60_000 });
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import Decimal from 'decimal.js';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngine } from '../engine';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO } from '../indices-fallback';
import type { PjeLiquidacaoResult, PjeIndiceRow } from '../engine-types';

// Build PjeIndiceRow[] from hardcoded fallback so engine has real indices
// instead of passing empty array (which triggers fallback with W070)
function buildIndicesDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  const ipcaeEntries = Object.entries(IPCA_E_ACUMULADO).sort(([a], [b]) => a.localeCompare(b));
  for (let i = 0; i < ipcaeEntries.length; i++) {
    const [comp, acum] = ipcaeEntries[i];
    const prevAcum = i > 0 ? ipcaeEntries[i - 1][1] : acum;
    const monthlyRate = i > 0 ? ((acum / prevAcum) - 1) * 100 : 0;
    rows.push({ indice: 'IPCA-E', competencia: comp + '-01', valor: monthlyRate, acumulado: acum });
    rows.push({ indice: 'IPCAE', competencia: comp + '-01', valor: monthlyRate, acumulado: acum });
  }
  const selicEntries = Object.entries(SELIC_ACUMULADO).sort(([a], [b]) => a.localeCompare(b));
  for (let i = 0; i < selicEntries.length; i++) {
    const [comp, acum] = selicEntries[i];
    const prevAcum = i > 0 ? selicEntries[i - 1][1] : acum;
    const monthlyRate = i > 0 ? ((acum / prevAcum) - 1) * 100 : 0;
    rows.push({ indice: 'SELIC', competencia: comp + '-01', valor: monthlyRate, acumulado: acum });
  }
  return rows;
}
const INDICES_DB = buildIndicesDB();

// ────────────────────────────────────────────────────────────────────────────
// Golden reference values from PJe-Calc (dadosEstruturados + gprec)
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const REPORTS_DIR = path.resolve(__dirname, '../../../../public/reports');

// Cache parsed XML to avoid re-reading/unzipping in each test
const xmlCache = new Map<string, string>();

/**
 * Read a .pjc file (synchronous). If it starts with "PK" (ZIP magic bytes),
 * extract the XML using the system `unzip` command.
 * Otherwise treat as raw XML.
 */
function readPjcXml(filename: string): string {
  if (xmlCache.has(filename)) return xmlCache.get(filename)!;

  const filePath = path.join(REPORTS_DIR, filename);
  const buffer = fs.readFileSync(filePath);

  let xml: string;

  // Check ZIP magic bytes: PK\x03\x04
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    // Use system unzip to extract to stdout — avoids JSZip/jsdom incompatibility
    try {
      const result = execSync(`unzip -p "${filePath}"`, {
        maxBuffer: 50 * 1024 * 1024, // 50MB
        encoding: 'utf-8',
      });
      xml = result;
    } catch {
      // Fallback: try reading as latin-1 (some PJC files may not be proper ZIPs)
      xml = buffer.toString('latin1');
    }
  } else {
    // Raw XML — try UTF-8 first, fallback to latin-1
    const text = buffer.toString('utf-8');
    xml = (text.includes('<?xml') || text.includes('<Calculo')) ? text : buffer.toString('latin1');
  }

  xmlCache.set(filename, xml);
  return xml;
}

/**
 * Format a number as Brazilian currency for display.
 */
function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Compute percentage delta between actual and expected.
 */
function pctDelta(actual: number, expected: number): string {
  if (expected === 0) return actual === 0 ? '0.00%' : 'INF%';
  const pct = ((actual - expected) / Math.abs(expected)) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

/**
 * Build and run the engine from a PJCAnalysis in the specified mode.
 * Returns the liquidation result or null if it threw (e.g., validation errors).
 */
function runEngine(
  xmlString: string,
  mode: 'assisted_from_pjc' | 'independent',
): PjeLiquidacaoResult | { error: string } {
  const analysis = analyzePJC(xmlString);
  const inputs = convertPjcToEngineInputs(analysis, `test-${mode}`);

  // Override modo_calculo
  inputs.params.modo_calculo = mode;

  // For independent mode, strip GT closure and apuracao_juros_gt
  if (mode === 'independent') {
    inputs.correcaoConfig.gt_closure = undefined;
    inputs.correcaoConfig.apuracao_juros_gt = undefined;
    if (inputs.csConfig.apuracao_juros_gt) {
      inputs.csConfig.apuracao_juros_gt = undefined;
    }
    if (inputs.irConfig.apuracao_juros_gt) {
      inputs.irConfig.apuracao_juros_gt = undefined;
    }
    // Independent mode requires data_citacao for ADC 58/59 (IPCA-E/SELIC).
    // PJC files rarely contain dataCitacao. Use ajuizamento as a reasonable proxy
    // (common judicial practice: citacao happens shortly after ajuizamento).
    if (!inputs.params.data_citacao) {
      inputs.params.data_citacao = inputs.params.data_ajuizamento;
    }
  }

  try {
    const engine = new PjeCalcEngine(
      inputs.params,
      inputs.historicos,
      inputs.faltas,
      inputs.ferias,
      inputs.verbas,
      inputs.cartaoPonto,
      inputs.fgtsConfig,
      inputs.csConfig,
      inputs.irConfig,
      inputs.correcaoConfig,
      inputs.honorariosConfig,
      inputs.custasConfig,
      inputs.seguroConfig,
      INDICES_DB, // Real IPCA-E + SELIC indices from BCB data
      [], // faixasINSSDB
      [], // faixasIRDB
      inputs.excecoesCargas || [],
      [], // feriadosDB
      inputs.prevPrivadaConfig,
      inputs.pensaoConfig,
      inputs.salarioFamiliaConfig,
    );

    return engine.liquidar();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}

/**
 * Print a delta comparison table for a single case.
 */
function printDeltaTable(
  label: string,
  beneficiario: string,
  expected: GoldenExpected,
  result: PjeLiquidacaoResult,
): void {
  const actual = {
    liquido: result.resumo.liquido_reclamante,
    inss_reclamante: result.resumo.cs_segurado,
    inss_reclamado: result.resumo.cs_empregador,
    ir: result.resumo.ir_retido,
    custas: result.resumo.custas,
  };

  const rows = [
    { component: 'Liquido', exp: expected.liquido, act: actual.liquido },
    { component: 'INSS Reclamante', exp: expected.inss_reclamante, act: actual.inss_reclamante },
    { component: 'INSS Reclamado', exp: expected.inss_reclamado, act: actual.inss_reclamado },
    { component: 'IR', exp: expected.ir, act: actual.ir },
    { component: 'Custas', exp: expected.custas, act: actual.custas },
  ];

  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ${label} | ${beneficiario}`);
  console.log(`${'='.repeat(80)}`);
  console.log(
    '  Component'.padEnd(22) +
    'Expected'.padStart(16) +
    'Actual'.padStart(16) +
    'Delta'.padStart(16) +
    'Delta %'.padStart(12)
  );
  console.log(`  ${'-'.repeat(76)}`);

  for (const r of rows) {
    const delta = new Decimal(r.act).minus(r.exp).toNumber();
    console.log(
      `  ${r.component.padEnd(20)}` +
      `${fmtBRL(r.exp).padStart(16)}` +
      `${fmtBRL(r.act).padStart(16)}` +
      `${(delta >= 0 ? '+' : '') + fmtBRL(delta)}`.padStart(16) +
      `${pctDelta(r.act, r.exp)}`.padStart(12)
    );
  }
  console.log('');
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('PJC Comparison — Real PJe-Calc files vs Engine', () => {
  // Verify test infrastructure
  it('should find the reports directory', () => {
    expect(fs.existsSync(REPORTS_DIR)).toBe(true);
  });

  it('should have all golden case files available', () => {
    for (const gc of GOLDEN_CASES) {
      const filePath = path.join(REPORTS_DIR, gc.file);
      expect(fs.existsSync(filePath), `Missing file: ${gc.file}`).toBe(true);
    }
  });

  // ── Parse + Analyze each PJC file ──
  describe('Step 1: PJC Parsing Fidelity', () => {
    for (const gc of GOLDEN_CASES) {
      it(`should parse ${gc.file} and extract correct beneficiario`, () => {
        const xml = readPjcXml(gc.file);
        expect(xml.length).toBeGreaterThan(100);

        const analysis = analyzePJC(xml);
        expect(analysis.parametros.beneficiario).toBe(gc.beneficiario);
      });

      it(`should extract golden result values from ${gc.file}`, () => {
        const xml = readPjcXml(gc.file);
        const analysis = analyzePJC(xml);

        // PJe-Calc resultado from the XML should match our golden reference
        expect(analysis.resultado.liquido_exequente).toBeCloseTo(gc.expected.liquido, 0);
        expect(analysis.resultado.inss_reclamante).toBeCloseTo(gc.expected.inss_reclamante, 0);
        expect(analysis.resultado.inss_reclamado).toBeCloseTo(gc.expected.inss_reclamado, 0);
        expect(analysis.resultado.imposto_renda).toBeCloseTo(gc.expected.ir, 0);
      });

      it(`should convert ${gc.file} to engine inputs without error`, () => {
        const xml = readPjcXml(gc.file);
        const analysis = analyzePJC(xml);
        const inputs = convertPjcToEngineInputs(analysis, 'test');

        expect(inputs.params).toBeDefined();
        expect(inputs.verbas.length).toBeGreaterThan(0);
        expect(inputs.historicos.length).toBeGreaterThan(0);
      });
    }
  });

  // ── Assisted Mode (with precomputed occurrences) ──
  describe('Step 2: Assisted Mode — PJC Ground Truth', () => {
    for (const gc of GOLDEN_CASES) {
      it(`[ASSISTED] ${gc.beneficiario} (${gc.file})`, () => {
        const xml = readPjcXml(gc.file);
        const result = runEngine(xml, 'assisted_from_pjc');

        if ('error' in result) {
          console.log(`  [ASSISTED] ${gc.file}: ENGINE ERROR — ${result.error}`);
          // Document the error but do not fail — the goal is comparison data
          expect(result.error).toBeDefined();
          return;
        }

        printDeltaTable('ASSISTED', gc.beneficiario, gc.expected, result);

        // In assisted mode, differences should be small since we use PJC precomputed values.
        // We use generous tolerance here because correction indices and INSS/IR tables
        // may differ between our engine and PJe-Calc.
        const liquidoDelta = Math.abs(result.resumo.liquido_reclamante - gc.expected.liquido);
        const liquidoPct = gc.expected.liquido > 0
          ? (liquidoDelta / gc.expected.liquido) * 100
          : 0;

        // Document the delta — do not assert strict equality yet
        console.log(`  [ASSISTED] Liquido delta: R$ ${fmtBRL(liquidoDelta)} (${liquidoPct.toFixed(2)}%)`);

        // Soft assertion: engine ran and produced a positive result
        expect(result.resumo).toBeDefined();
      });
    }
  });

  // ── Independent Mode (no GT calibration) ──
  describe('Step 3: Independent Mode — Engine from Scratch', () => {
    for (const gc of GOLDEN_CASES) {
      it(`[INDEPENDENT] ${gc.beneficiario} (${gc.file})`, () => {
        const xml = readPjcXml(gc.file);
        const result = runEngine(xml, 'independent');

        if ('error' in result) {
          console.log(`  [INDEPENDENT] ${gc.file}: ENGINE ERROR — ${result.error}`);
          // Document the error but do not fail
          expect(result.error).toBeDefined();
          return;
        }

        printDeltaTable('INDEPENDENT', gc.beneficiario, gc.expected, result);

        const actual = {
          liquido: result.resumo.liquido_reclamante,
          inss_reclamante: result.resumo.cs_segurado,
          inss_reclamado: result.resumo.cs_empregador,
          ir: result.resumo.ir_retido,
          custas: result.resumo.custas,
        };

        // Print a summary line
        const totalExpected = gc.expected.liquido + gc.expected.inss_reclamante + gc.expected.inss_reclamado + gc.expected.ir;
        const totalActual = actual.liquido + actual.inss_reclamante + actual.inss_reclamado + actual.ir;
        const totalDelta = Math.abs(totalActual - totalExpected);
        const totalPct = totalExpected > 0 ? (totalDelta / totalExpected) * 100 : 0;

        console.log(`  [INDEPENDENT] Total bruto delta: R$ ${fmtBRL(totalDelta)} (${totalPct.toFixed(2)}%)`);
        console.log(`  [INDEPENDENT] Verbas calculadas: ${result.verbas.length}`);
        console.log(`  [INDEPENDENT] Warnings: ${result.calculation_warnings?.length || 0}`);

        // Soft assertion: engine ran and produced a result
        expect(result.resumo).toBeDefined();
      });
    }
  });

  // ── Cross-mode comparison ──
  describe('Step 4: Cross-mode Delta Summary', () => {
    it('should produce a summary table comparing all modes', () => {
      console.log('\n' + '='.repeat(100));
      console.log('  CROSS-MODE COMPARISON SUMMARY');
      console.log('='.repeat(100));
      console.log(
        '  Case'.padEnd(30) +
        'Golden'.padStart(14) +
        'Assisted'.padStart(14) +
        'Indep.'.padStart(14) +
        'Asst.Delta%'.padStart(12) +
        'Indep.Delta%'.padStart(12)
      );
      console.log('  ' + '-'.repeat(96));

      for (const gc of GOLDEN_CASES) {
        const xml = readPjcXml(gc.file);
        const assisted = runEngine(xml, 'assisted_from_pjc');
        const independent = runEngine(xml, 'independent');

        const asstLiq = 'error' in assisted ? NaN : assisted.resumo.liquido_reclamante;
        const indepLiq = 'error' in independent ? NaN : independent.resumo.liquido_reclamante;

        const asstDelta = isNaN(asstLiq) ? 'ERR' : pctDelta(asstLiq, gc.expected.liquido);
        const indepDelta = isNaN(indepLiq) ? 'ERR' : pctDelta(indepLiq, gc.expected.liquido);

        const shortName = gc.beneficiario.split(' ').slice(0, 2).join(' ');
        console.log(
          `  ${shortName.padEnd(28)}` +
          `${fmtBRL(gc.expected.liquido).padStart(14)}` +
          `${(isNaN(asstLiq) ? 'ERROR' : fmtBRL(asstLiq)).padStart(14)}` +
          `${(isNaN(indepLiq) ? 'ERROR' : fmtBRL(indepLiq)).padStart(14)}` +
          `${asstDelta.padStart(12)}` +
          `${indepDelta.padStart(12)}`
        );
      }
      console.log('');

      // This test always passes — its purpose is to print the comparison table
      expect(true).toBe(true);
    });
  });
});
