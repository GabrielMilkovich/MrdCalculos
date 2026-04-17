/**
 * @vitest-environment jsdom
 *
 * COMPREHENSIVE INDEPENDENT MODE PARITY ANALYSIS
 *
 * Tests ALL available .pjc files against the MRD Calc engine in INDEPENDENT mode.
 * Compares engine output against PJe-Calc golden values embedded in the PJC XML.
 *
 * Purpose: identify exactly where and how much our independent calculation diverges
 * from PJe-Calc, per component (líquido, INSS, IR, FGTS, custas, honorários).
 */
import { describe, it, expect, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000 });

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import Decimal from 'decimal.js';
import { analyzePJC, type PJCAnalysis } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import type { PjeLiquidacaoResult, PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

// ────────────────────────────────────────────────────────────────────────────
// INDEX DATA — Real BCB monthly rates for SELIC and IPCA-E
// ────────────────────────────────────────────────────────────────────────────

const SELIC_MONTHLY: Record<number, number[]> = {
  2015: [0.94, 0.82, 1.04, 0.95, 0.99, 1.07, 1.18, 1.11, 1.11, 1.11, 1.06, 1.16],
  2016: [1.06, 1.00, 1.16, 1.06, 1.11, 1.16, 1.11, 1.22, 1.11, 1.05, 1.04, 1.12],
  2017: [1.09, 0.87, 1.05, 0.79, 0.93, 0.81, 0.80, 0.80, 0.64, 0.64, 0.57, 0.54],
  2018: [0.58, 0.47, 0.53, 0.52, 0.52, 0.52, 0.54, 0.57, 0.47, 0.54, 0.49, 0.49],
  2019: [0.54, 0.49, 0.47, 0.52, 0.54, 0.47, 0.57, 0.50, 0.46, 0.48, 0.38, 0.37],
  2020: [0.38, 0.29, 0.34, 0.28, 0.24, 0.21, 0.19, 0.16, 0.16, 0.16, 0.15, 0.16],
  2021: [0.15, 0.13, 0.20, 0.21, 0.27, 0.31, 0.36, 0.43, 0.44, 0.49, 0.59, 0.77],
  2022: [0.73, 0.76, 0.93, 0.83, 1.03, 1.02, 1.03, 1.17, 1.07, 1.02, 1.02, 1.12],
  2023: [1.12, 0.92, 1.17, 0.92, 1.12, 1.07, 1.07, 1.14, 0.97, 1.00, 0.92, 0.89],
  2024: [0.97, 0.80, 0.83, 0.89, 0.83, 0.79, 0.91, 0.87, 0.84, 0.93, 0.79, 0.93],
  2025: [1.01, 0.99, 0.96, 1.06, 1.14, 1.10, 1.28, 1.16, 1.22, 1.28, 1.05, 1.22],
};

const IPCAE_MONTHLY: Record<number, number[]> = {
  2015: [0.89, 1.33, 1.24, 1.07, 0.60, 0.99, 0.59, 0.43, 0.39, 0.66, 0.85, 1.18],
  2016: [0.92, 1.42, 0.43, 0.51, 0.86, 0.40, 0.54, 0.45, 0.23, 0.19, 0.26, 0.19],
  2017: [0.31, 0.54, 0.15, 0.21, 0.24, 0.16, -0.18, 0.35, 0.11, 0.34, 0.32, 0.35],
  2018: [0.39, 0.38, 0.10, 0.21, 0.14, 1.11, 0.64, 0.13, 0.09, 0.58, 0.19, -0.16],
  2019: [0.30, 0.34, 0.54, 0.72, 0.35, 0.06, 0.09, 0.08, 0.09, 0.09, 0.14, 1.05],
  2020: [0.71, 0.22, 0.02, -0.01, -0.59, 0.02, 0.30, 0.23, 0.45, 0.94, 0.81, 1.06],
  2021: [0.78, 0.48, 0.93, 0.60, 0.44, 0.83, 0.72, 0.89, 1.14, 1.20, 1.17, 0.78],
  2022: [0.58, 0.99, 0.95, 1.73, 0.59, 0.69, 0.13, -0.73, -0.37, 0.16, 0.53, 0.52],
  2023: [0.55, 0.76, 0.69, 0.57, 0.51, 0.04, -0.07, 0.28, 0.35, 0.21, 0.33, 0.40],
  2024: [0.31, 0.78, 0.36, 0.21, 0.44, 0.39, 0.30, 0.19, 0.13, 0.54, 0.62, 0.34],
  2025: [0.11, 1.23, 0.64, 0.43, 0.36, 0.26, 0.33, -0.14, 0.48, 0.18, 0.20, 0.25],
};

// INPC monthly rates (BCB serie 188) — for cases using INPC
const INPC_MONTHLY: Record<number, number[]> = {
  2015: [1.48, 1.16, 1.51, 0.71, 0.99, 0.77, 0.58, 0.25, 0.51, 0.77, 1.11, 0.90],
  2016: [1.51, 0.95, 0.44, 0.64, 0.98, 0.47, 0.64, 0.31, 0.08, 0.17, 0.07, 0.14],
  2017: [0.42, 0.24, 0.32, 0.08, 0.36, -0.30, 0.17, -0.03, -0.02, 0.37, 0.18, 0.26],
  2018: [0.23, 0.18, 0.07, 0.21, 0.43, 1.43, 0.25, 0.00, 0.30, 0.40, -0.25, 0.14],
  2019: [0.36, 0.54, 0.77, 0.60, 0.15, 0.01, 0.10, 0.12, -0.05, 0.04, 0.54, 1.22],
  2020: [0.19, 0.17, 0.18, -0.23, -0.25, 0.30, 0.44, 0.36, 0.87, 0.89, 0.95, 1.46],
  2021: [0.27, 0.82, 0.86, 0.38, 0.96, 0.60, 1.02, 0.88, 1.20, 1.16, 0.84, 0.73],
  2022: [0.67, 1.00, 1.71, 1.04, 0.45, 0.62, -0.60, -0.31, -0.32, 0.47, 0.38, 0.69],
  2023: [0.46, 0.77, 0.64, 0.53, 0.36, -0.10, -0.09, 0.20, 0.11, 0.12, 0.10, 0.55],
  2024: [0.57, 0.81, 0.19, 0.37, 0.46, 0.25, 0.26, -0.14, 0.48, 0.61, 0.33, 0.48],
  2025: [0.00, 1.48, 0.51, 0.48, 0.35, 0.23, 0.21, -0.21, 0.52, 0.03, 0.03, 0.21],
};

function buildIndicesDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];

  function buildFromMonthly(
    indexName: string,
    monthlyRates: Record<number, number[]>,
    aliases: string[] = [],
  ) {
    let acum = 100.0;
    const years = Object.keys(monthlyRates).map(Number).sort();
    for (const year of years) {
      const rates = monthlyRates[year];
      for (let m = 0; m < 12; m++) {
        const rate = rates[m];
        acum = acum * (1 + rate / 100);
        const comp = `${year}-${String(m + 1).padStart(2, '0')}`;
        const compDate = comp + '-01';
        const acumRounded = Math.round(acum * 1e8) / 1e8;
        rows.push({ indice: indexName, competencia: compDate, valor: rate, acumulado: acumRounded });
        for (const alias of aliases) {
          rows.push({ indice: alias, competencia: compDate, valor: rate, acumulado: acumRounded });
        }
      }
    }
  }

  buildFromMonthly('SELIC', SELIC_MONTHLY);
  buildFromMonthly('IPCA-E', IPCAE_MONTHLY, ['IPCAE', 'IPCA']);
  buildFromMonthly('INPC', INPC_MONTHLY);

  return rows;
}
const INDICES_DB = buildIndicesDB();

function buildFaixasINSSDB(): PjeINSSFaixaRow[] {
  const faixas: PjeINSSFaixaRow[] = [];
  function addFlat(inicio: string, fim: string, brackets: [number, number][]) {
    brackets.forEach(([valorAte, aliquota], i) => {
      faixas.push({ competencia_inicio: inicio, competencia_fim: fim, faixa: i + 1, valor_ate: valorAte, aliquota });
    });
  }
  function addProgressive(inicio: string, fim: string | null, brackets: [number, number][]) {
    brackets.forEach(([valorAte, aliquota], i) => {
      faixas.push({ competencia_inicio: inicio, competencia_fim: fim, faixa: i + 1, valor_ate: valorAte, aliquota });
    });
  }

  addFlat('2015-01-01', '2015-12-01', [[1399.12, 0.08], [2331.88, 0.09], [4663.75, 0.11]]);
  addFlat('2016-01-01', '2016-12-01', [[1556.94, 0.08], [2594.92, 0.09], [5189.82, 0.11]]);
  addFlat('2017-01-01', '2017-12-01', [[1659.38, 0.08], [2765.66, 0.09], [5531.31, 0.11]]);
  addFlat('2018-01-01', '2018-12-01', [[1693.72, 0.08], [2822.90, 0.09], [5645.80, 0.11]]);
  addFlat('2019-01-01', '2019-12-01', [[1751.81, 0.08], [2919.72, 0.09], [5839.45, 0.11]]);
  addFlat('2020-01-01', '2020-02-01', [[1830.29, 0.08], [3050.52, 0.09], [6101.06, 0.11]]);
  addProgressive('2020-03-01', '2020-12-01', [[1045.00, 0.075], [2089.60, 0.09], [3134.40, 0.12], [6101.06, 0.14]]);
  addProgressive('2021-01-01', '2021-12-01', [[1100.00, 0.075], [2203.48, 0.09], [3305.22, 0.12], [6433.57, 0.14]]);
  addProgressive('2022-01-01', '2022-12-01', [[1212.00, 0.075], [2427.35, 0.09], [3641.03, 0.12], [7087.22, 0.14]]);
  addProgressive('2023-01-01', '2023-12-01', [[1320.00, 0.075], [2571.29, 0.09], [3856.94, 0.12], [7507.49, 0.14]]);
  addProgressive('2024-01-01', '2024-12-01', [[1412.00, 0.075], [2666.68, 0.09], [4000.03, 0.12], [7786.02, 0.14]]);
  addProgressive('2025-01-01', null, [[1518.00, 0.075], [2793.88, 0.09], [4190.83, 0.12], [8157.41, 0.14]]);

  return faixas;
}
const FAIXAS_INSS_DB = buildFaixasINSSDB();

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const REPORTS_DIR = path.resolve(__dirname, '../../../../public/reports');

const xmlCache = new Map<string, string>();

function readPjcXml(filename: string): string {
  if (xmlCache.has(filename)) return xmlCache.get(filename)!;
  const filePath = path.join(REPORTS_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
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
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctDelta(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : Infinity;
  return ((actual - expected) / Math.abs(expected)) * 100;
}

function pctStr(pct: number): string {
  if (!isFinite(pct)) return 'N/A';
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

interface AnalysisResult {
  file: string;
  beneficiario: string;
  periodo: string;
  indice_correcao: string;
  num_verbas_pjc: number;
  num_verbas_engine: number;
  golden: {
    liquido: number;
    inss_reclamante: number;
    inss_reclamado: number;
    ir: number;
    custas: number;
    fgts: number;
  };
  engine: {
    liquido: number;
    inss_reclamante: number;
    inss_reclamado: number;
    ir: number;
    custas: number;
    fgts: number;
  } | null;
  error: string | null;
  warnings: string[];
  deltaLiquidoPct: number;
  deltaBrutoPct: number;
}

function runIndependentAnalysis(filename: string): AnalysisResult {
  const xml = readPjcXml(filename);
  const analysis = analyzePJC(xml);
  const inputs = convertPjcToEngineInputs(analysis, `independent-analysis`);

  const golden = {
    liquido: analysis.resultado.liquido_exequente,
    inss_reclamante: analysis.resultado.inss_reclamante,
    inss_reclamado: analysis.resultado.inss_reclamado,
    ir: analysis.resultado.imposto_renda,
    custas: analysis.resultado.custas,
    fgts: analysis.resultado.fgts_deposito,
  };

  const base: Omit<AnalysisResult, 'engine' | 'error' | 'warnings' | 'deltaLiquidoPct' | 'deltaBrutoPct'> = {
    file: filename,
    beneficiario: analysis.parametros.beneficiario,
    periodo: `${analysis.parametros.inicio_calculo} a ${analysis.parametros.termino_calculo}`,
    indice_correcao: analysis.atualizacao?.indice_pre_citacao || analysis.parametros.indices_acumulados || 'N/A',
    num_verbas_pjc: analysis.verbas.length,
    num_verbas_engine: inputs.verbas.length,
    golden,
  };

  // Force independent mode with GT-light calibration:
  // - Keep all GT data for correction/juros/INSS/IR calibration
  // - gt_closure kept for INSS scaling (override final is blocked by engine for independent mode)
  inputs.params.modo_calculo = 'independent';
  if (!inputs.params.data_citacao) {
    inputs.params.data_citacao = inputs.params.data_ajuizamento;
  }

  try {
    const engine = new PjeCalcEngineV3(
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
      INDICES_DB,
      FAIXAS_INSS_DB,
      [],
      inputs.excecoesCargas || [],
      [],
      inputs.prevPrivadaConfig,
      inputs.pensaoConfig,
      inputs.salarioFamiliaConfig,
    );

    const result = engine.liquidar();

    const eng = {
      liquido: result.resumo.liquido_reclamante,
      inss_reclamante: result.resumo.cs_segurado,
      inss_reclamado: result.resumo.cs_empregador,
      ir: result.resumo.ir_retido,
      custas: result.resumo.custas,
      fgts: result.resumo.fgts_deposito || 0,
    };

    const totalGolden = golden.liquido + golden.inss_reclamante + golden.inss_reclamado + golden.ir;
    const totalEngine = eng.liquido + eng.inss_reclamante + eng.inss_reclamado + eng.ir;

    return {
      ...base,
      engine: eng,
      error: null,
      warnings: result.calculation_warnings?.map(w => w.mensagem || w.codigo || String(w)) || [],
      deltaLiquidoPct: pctDelta(eng.liquido, golden.liquido),
      deltaBrutoPct: pctDelta(totalEngine, totalGolden),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ...base,
      engine: null,
      error: msg,
      warnings: [],
      deltaLiquidoPct: Infinity,
      deltaBrutoPct: Infinity,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('INDEPENDENT MODE — Full Parity Analysis (All PJC files)', () => {
  const pjcFiles = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.pjc')).sort();

  it('should find PJC files in reports directory', () => {
    expect(pjcFiles.length).toBeGreaterThan(0);
    console.log(`\n  Found ${pjcFiles.length} PJC files for analysis\n`);
  });

  const results: AnalysisResult[] = [];

  for (const file of pjcFiles) {
    it(`[INDEPENDENT] ${file}`, () => {
      const r = runIndependentAnalysis(file);
      results.push(r);

      // Print detailed per-case report
      console.log(`\n${'═'.repeat(90)}`);
      console.log(`  CASO: ${r.beneficiario}`);
      console.log(`  Arquivo: ${r.file}`);
      console.log(`  Período: ${r.periodo}`);
      console.log(`  Índice: ${r.indice_correcao}`);
      console.log(`  Verbas PJC: ${r.num_verbas_pjc} | Verbas Engine: ${r.num_verbas_engine}`);
      console.log(`${'═'.repeat(90)}`);

      if (r.error) {
        console.log(`  ❌ ERRO: ${r.error}`);
        console.log(`  Golden → Líquido: ${fmtBRL(r.golden.liquido)}`);
        expect(r.error).toBeDefined();
        return;
      }

      const eng = r.engine!;

      const components = [
        { name: 'Líquido Reclamante', golden: r.golden.liquido, engine: eng.liquido },
        { name: 'INSS Segurado', golden: r.golden.inss_reclamante, engine: eng.inss_reclamante },
        { name: 'INSS Empregador', golden: r.golden.inss_reclamado, engine: eng.inss_reclamado },
        { name: 'Imposto de Renda', golden: r.golden.ir, engine: eng.ir },
        { name: 'Custas', golden: r.golden.custas, engine: eng.custas },
        { name: 'FGTS Depósito', golden: r.golden.fgts, engine: eng.fgts },
      ];

      console.log(`  ${'Componente'.padEnd(24)} ${'PJe-Calc'.padStart(16)} ${'MRD Calc'.padStart(16)} ${'Delta R$'.padStart(16)} ${'Delta %'.padStart(10)}`);
      console.log(`  ${'─'.repeat(84)}`);

      for (const c of components) {
        const delta = new Decimal(c.engine).minus(c.golden).toNumber();
        const pct = pctDelta(c.engine, c.golden);
        const badge = Math.abs(pct) < 1 ? '✅' : Math.abs(pct) < 5 ? '⚠️' : '❌';
        console.log(
          `  ${badge} ${c.name.padEnd(22)} ${fmtBRL(c.golden).padStart(16)} ${fmtBRL(c.engine).padStart(16)} ${fmtBRL(delta).padStart(16)} ${pctStr(pct).padStart(10)}`
        );
      }

      if (r.warnings.length > 0) {
        console.log(`\n  ⚠️  Warnings (${r.warnings.length}):`);
        for (const w of r.warnings.slice(0, 5)) {
          console.log(`     - ${w}`);
        }
        if (r.warnings.length > 5) console.log(`     ... e mais ${r.warnings.length - 5}`);
      }

      console.log(`\n  📊 DELTA LÍQUIDO: ${pctStr(r.deltaLiquidoPct)} | DELTA BRUTO: ${pctStr(r.deltaBrutoPct)}`);

      expect(r.engine).toBeDefined();
    });
  }

  it('CONSOLIDATED SUMMARY — All Cases', () => {
    console.log(`\n\n${'█'.repeat(100)}`);
    console.log(`  RELATÓRIO CONSOLIDADO — PARIDADE MRD CALC vs PJE-CALC (MODO INDEPENDENTE)`);
    console.log(`${'█'.repeat(100)}\n`);

    // Summary table
    console.log(`  ${'Caso'.padEnd(35)} ${'PJe-Calc'.padStart(16)} ${'MRD Calc'.padStart(16)} ${'Delta %'.padStart(10)} ${'Status'.padStart(8)}`);
    console.log(`  ${'─'.repeat(87)}`);

    let totalGolden = 0;
    let totalEngine = 0;
    let successCount = 0;
    let errorCount = 0;
    let closeCount = 0; // < 5% delta
    let exactCount = 0; // < 1% delta

    for (const r of results) {
      const shortName = r.beneficiario.length > 33 ? r.beneficiario.substring(0, 30) + '...' : r.beneficiario;

      if (r.error) {
        errorCount++;
        console.log(`  ${shortName.padEnd(35)} ${fmtBRL(r.golden.liquido).padStart(16)} ${'ERRO'.padStart(16)} ${'N/A'.padStart(10)} ${'❌'.padStart(8)}`);
        continue;
      }

      successCount++;
      totalGolden += r.golden.liquido;
      totalEngine += r.engine!.liquido;

      const pct = r.deltaLiquidoPct;
      const badge = Math.abs(pct) < 1 ? '✅' : Math.abs(pct) < 5 ? '⚠️' : '❌';
      if (Math.abs(pct) < 1) exactCount++;
      else if (Math.abs(pct) < 5) closeCount++;

      console.log(
        `  ${shortName.padEnd(35)} ${fmtBRL(r.golden.liquido).padStart(16)} ${fmtBRL(r.engine!.liquido).padStart(16)} ${pctStr(pct).padStart(10)} ${badge.padStart(8)}`
      );
    }

    console.log(`  ${'─'.repeat(87)}`);

    const overallDelta = pctDelta(totalEngine, totalGolden);
    console.log(`  ${'TOTAL'.padEnd(35)} ${fmtBRL(totalGolden).padStart(16)} ${fmtBRL(totalEngine).padStart(16)} ${pctStr(overallDelta).padStart(10)}`);

    // Statistics
    console.log(`\n  ┌─────────────────────────────────────────┐`);
    console.log(`  │  ESTATÍSTICAS DE PARIDADE                │`);
    console.log(`  ├─────────────────────────────────────────┤`);
    console.log(`  │  Total de casos:     ${String(results.length).padStart(3)}                │`);
    console.log(`  │  Calculados:         ${String(successCount).padStart(3)}                │`);
    console.log(`  │  Erros:              ${String(errorCount).padStart(3)}                │`);
    console.log(`  │  Delta < 1%  (✅):   ${String(exactCount).padStart(3)}                │`);
    console.log(`  │  Delta 1-5%  (⚠️):   ${String(closeCount).padStart(3)}                │`);
    console.log(`  │  Delta > 5%  (❌):   ${String(successCount - exactCount - closeCount).padStart(3)}                │`);
    console.log(`  │  Delta Global:    ${pctStr(overallDelta).padStart(8)}              │`);
    console.log(`  └─────────────────────────────────────────┘`);

    // Per-component aggregate
    console.log(`\n  DELTA POR COMPONENTE (médio entre casos calculados):`);
    if (successCount > 0) {
      const components = ['liquido', 'inss_reclamante', 'inss_reclamado', 'ir', 'custas', 'fgts'] as const;
      const labels: Record<string, string> = {
        liquido: 'Líquido',
        inss_reclamante: 'INSS Segurado',
        inss_reclamado: 'INSS Empregador',
        ir: 'IR',
        custas: 'Custas',
        fgts: 'FGTS',
      };
      for (const comp of components) {
        const deltas = results
          .filter(r => r.engine && r.golden[comp] > 0)
          .map(r => pctDelta(r.engine![comp], r.golden[comp]));
        if (deltas.length === 0) continue;
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const min = Math.min(...deltas);
        const max = Math.max(...deltas);
        console.log(`    ${(labels[comp] || comp).padEnd(20)} Médio: ${pctStr(avg).padStart(10)}  Min: ${pctStr(min).padStart(10)}  Max: ${pctStr(max).padStart(10)}  (${deltas.length} casos)`);
      }
    }

    // Error details
    if (errorCount > 0) {
      console.log(`\n  CASOS COM ERRO:`);
      for (const r of results.filter(r => r.error)) {
        console.log(`    ❌ ${r.beneficiario}: ${r.error!.substring(0, 120)}`);
      }
    }

    console.log(`\n${'█'.repeat(100)}\n`);

    expect(results.length).toBeGreaterThan(0);
  });
});
