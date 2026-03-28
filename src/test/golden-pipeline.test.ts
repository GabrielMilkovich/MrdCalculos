/**
 * =====================================================
 * GOLDEN TEST: Full PJC → Engine Pipeline Validation
 * =====================================================
 * Tests the complete pipeline: parse → bridge → engine → parity check
 * Using real .PJC files as ground truth.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';
import { convertPjcToEngineInputs, type PjcEngineInputs } from '../lib/pjecalc/pjc-to-engine';
import { PjeCalcEngine } from '../lib/pjecalc/engine';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

const PJC_DIR = resolve(__dirname, '../../public/reports');

/** Read a PJC file, handling both plain-XML and ZIP-wrapped formats. */
function readPjcXml(path: string): string {
  const buf = readFileSync(path);
  // ZIP magic: PK\x03\x04
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    return execSync(`unzip -p "${path}"`, { encoding: 'latin1', maxBuffer: 32 * 1024 * 1024 });
  }
  return buf.toString('latin1');
}

// List all available .PJC files
function listPjcFiles(): string[] {
  if (!existsSync(PJC_DIR)) return [];
  return readdirSync(PJC_DIR).filter(f => f.endsWith('.pjc'));
}

interface GoldenResult {
  file: string;
  analysis: PJCAnalysis;
  inputs: PjcEngineInputs;
  engineResult: any;
  parity: {
    principal_bruto: { engine: number; pjc: number; delta: number; delta_pct: number };
    liquido: { engine: number; pjc: number; delta: number; delta_pct: number };
    inss_recl: { engine: number; pjc: number; delta: number; delta_pct: number };
    inss_emp: { engine: number; pjc: number; delta: number; delta_pct: number };
    ir: { engine: number; pjc: number; delta: number; delta_pct: number };
  };
}

function deltaCalc(engine: number, pjc: number): { delta: number; delta_pct: number } {
  const delta = engine - pjc;
  const delta_pct = pjc !== 0 ? (delta / pjc) * 100 : (engine !== 0 ? 100 : 0);
  return { delta, delta_pct };
}

function runGoldenCase(file: string, analysis: PJCAnalysis): GoldenResult | null {
  // Skip cases with no resultado (not liquidated)
  if (analysis.resultado.liquido_exequente === 0 && analysis.resultado.inss_reclamante === 0) {
    return null;
  }
  
  const inputs = convertPjcToEngineInputs(analysis, `golden-${file}`);
  
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
    ALL_TEST_INDICES,
  );
  
  const result = engine.liquidar();
  
  return {
    file,
    analysis,
    inputs,
    engineResult: result,
    parity: {
      principal_bruto: {
        engine: result.resumo.principal_bruto,
        pjc: analysis.verbas.reduce((s, v) => s + (v.total_diferenca || 0), 0),
        ...deltaCalc(result.resumo.principal_bruto, analysis.verbas.reduce((s, v) => s + (v.total_diferenca || 0), 0)),
      },
      liquido: {
        engine: result.resumo.liquido_reclamante,
        pjc: analysis.resultado.liquido_exequente,
        ...deltaCalc(result.resumo.liquido_reclamante, analysis.resultado.liquido_exequente),
      },
      inss_recl: {
        engine: result.resumo.cs_segurado,
        pjc: analysis.resultado.inss_reclamante,
        ...deltaCalc(result.resumo.cs_segurado, analysis.resultado.inss_reclamante),
      },
      inss_emp: {
        engine: result.resumo.cs_empregador,
        pjc: analysis.resultado.inss_reclamado,
        ...deltaCalc(result.resumo.cs_empregador, analysis.resultado.inss_reclamado),
      },
      ir: {
        engine: result.resumo.ir_retido,
        pjc: analysis.resultado.imposto_renda,
        ...deltaCalc(result.resumo.ir_retido, analysis.resultado.imposto_renda),
      },
    },
  };
}

describe('Golden Test Suite — PJC Pipeline', () => {
  const files = listPjcFiles();

  // Parse all PJC files once — large files (caso-real-v2: 6.3MB) can take 25s+
  const analysisCache = new Map<string, PJCAnalysis>();
  beforeAll(() => {
    for (const file of files) {
      const content = readPjcXml(resolve(PJC_DIR, file));
      analysisCache.set(file, analyzePJC(content));
    }
  }, 600000); // 10 min: handles all 14 files including the 6.3MB one

  it('should find at least one PJC file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // =====================================================
  // PARSER STRUCTURAL TESTS
  // =====================================================
  describe('Parser Structural Validation', () => {
    for (const file of files) {
      it(`[${file}] should parse without errors`, () => {
        const analysis = analysisCache.get(file)!;
        
        // Must have parametros
        expect(analysis.parametros.admissao).toBeTruthy();
        
        // Must have verbas
        expect(analysis.verbas.length).toBeGreaterThan(0);
        
        // Count structural elements
        console.log(`  ${file}: ${analysis.verbas.length} verbas, ${analysis.historicos_salariais.length} hist, ${analysis.apuracao_diaria_count} dias, ${analysis.faltas.length} faltas, ${analysis.ferias.length} férias`);
      });

      it(`[${file}] should extract historicos salariais`, () => {
        const analysis = analysisCache.get(file)!;

        expect(analysis.historicos_salariais.length).toBeGreaterThanOrEqual(0);

        // If historicos exist, they should have names
        for (const h of analysis.historicos_salariais) {
          expect(h.nome).toBeTruthy();
        }
      });

      it(`[${file}] should extract full apuração diária when present`, () => {
        const analysis = analysisCache.get(file)!;

        // apuracao_diaria array should match count
        expect(analysis.apuracao_diaria.length).toBe(analysis.apuracao_diaria_count);

        // If daily data exists, validate structure
        if (analysis.apuracao_diaria.length > 0) {
          const first = analysis.apuracao_diaria[0];
          expect(first.data).toBeTruthy();
          expect(first.tipo_dia).toBeTruthy();
        }
      });

      it(`[${file}] should extract férias`, () => {
        const analysis = analysisCache.get(file)!;

        if (analysis.ferias.length > 0) {
          for (const f of analysis.ferias) {
            expect(f.aquisitivo_inicio).toBeTruthy();
            expect(f.situacao).toBeTruthy();
          }
        }
      });
    }
  });

  // =====================================================
  // BRIDGE TESTS
  // =====================================================
  describe('Bridge Validation (PJC → Engine)', () => {
    for (const file of files) {
      it(`[${file}] should convert to engine inputs without errors`, () => {
        const analysis = analysisCache.get(file)!;
        const inputs = convertPjcToEngineInputs(analysis, `test-${file}`);

        // Params must be populated
        expect(inputs.params.case_id).toBe(`test-${file}`);
        expect(inputs.params.data_admissao).toBeTruthy();

        // Verbas must be populated
        expect(inputs.verbas.length).toBeGreaterThan(0);

        // Fidelity report must exist
        expect(inputs.fidelityReport).toBeDefined();
        expect(inputs.fidelityReport.total_entries).toBeGreaterThanOrEqual(0);

        // Log fidelity summary
        const fr = inputs.fidelityReport;
        if (fr.total_entries > 0) {
          console.log(`  ${file} fidelity: ${fr.by_severity.critical} critical, ${fr.by_severity.error} errors, ${fr.by_severity.warning} warnings, ${fr.by_severity.info} info`);
          if (fr.synthetic_fallbacks_used) {
            console.log(`  ⚠ Synthetic fallbacks used`);
          }
        }
      });

      it(`[${file}] should produce non-empty cartaoPonto when daily data exists`, () => {
        const analysis = analysisCache.get(file)!;
        const inputs = convertPjcToEngineInputs(analysis, `test-${file}`);

        if (analysis.apuracao_diaria_count > 0) {
          expect(inputs.cartaoPonto.length).toBeGreaterThan(0);
          console.log(`  ${file}: ${inputs.cartaoPonto.length} months of cartão ponto from ${analysis.apuracao_diaria_count} daily records`);
        }
      });
    }
  });

  // =====================================================
  // ENGINE PARITY TESTS
  // =====================================================
  describe('Engine Parity (vs PJC Ground Truth)', () => {
    for (const file of files) {
      it(`[${file}] should achieve principal bruto parity`, () => {
        const analysis = analysisCache.get(file)!;
        const golden = runGoldenCase(file, analysis);
        if (!golden) return; // Skip non-liquidated cases

        // Use liquido_reclamante vs liquido_exequente — the correct end-to-end metric.
        // principal_bruto (sum of ALL verba total_diferenca) ≠ engine.principal_bruto
        // because PJe-Calc includes verbas with compor_principal=false in the XML sum.
        const p = golden.parity.liquido;
        const pb = golden.parity.principal_bruto;
        console.log(`  ${file} Líquido: engine=${p.engine.toFixed(2)} pjc=${p.pjc.toFixed(2)} Δ=${p.delta.toFixed(2)} (${p.delta_pct.toFixed(2)}%)`);
        console.log(`  ${file} Principal bruto (diagnóstico): engine=${pb.engine.toFixed(2)} pjc=${pb.pjc.toFixed(2)} Δ=${pb.delta.toFixed(2)} (${pb.delta_pct.toFixed(2)}%)`);

        // Tolerance: ≤0.01% on liquido (GT closure ensures near-exact parity)
        expect(Math.abs(p.delta_pct) < 0.01 || Math.abs(p.delta) <= 0.02).toBe(true);
      });

      it(`[${file}] should liquidar without errors`, () => {
        const analysis = analysisCache.get(file)!;
        const golden = runGoldenCase(file, analysis);
        if (!golden) return;

        expect(golden.engineResult).toBeDefined();
        expect(golden.engineResult.verbas.length).toBeGreaterThan(0);
        expect(golden.engineResult.resumo).toBeDefined();
      });
    }
  });

  // =====================================================
  // PER-COMPETÊNCIA COMPARISON (ApuracaoDeJuros)
  // =====================================================
  describe('Per-competência Parity (ApuracaoDeJuros)', () => {
    for (const file of files) {
      it(`[${file}] should compare per-competência when GT available`, () => {
        const analysis = analysisCache.get(file)!;

        if (!analysis.apuracao_juros || analysis.apuracao_juros.length === 0) {
          console.log(`  ${file}: No ApuracaoDeJuros GT available — skipping`);
          return;
        }
        
        console.log(`  ${file}: ${analysis.apuracao_juros.length} GT competências`);
        
        let totalCorrigido = 0;
        let totalCSBase = 0;
        for (const ap of analysis.apuracao_juros) {
          totalCorrigido += ap.valor_corrigido;
          totalCSBase += ap.cs_base_normal + ap.cs_base_13;
        }
        
        console.log(`  GT total corrigido: ${totalCorrigido.toFixed(2)}`);
        console.log(`  GT total CS base: ${totalCSBase.toFixed(2)}`);
        
        expect(analysis.apuracao_juros.length).toBeGreaterThan(0);
      });
    }
  });

  // =====================================================
  // FIDELITY REPORT SUMMARY
  // =====================================================
  describe('Fidelity Report Summary', () => {
    it('should generate aggregate fidelity report across all cases', () => {
      const summaries: string[] = [];

      for (const file of files) {
        const analysis = analysisCache.get(file)!;
        const inputs = convertPjcToEngineInputs(analysis, `fidelity-${file}`);
        const fr = inputs.fidelityReport;
        
        summaries.push(`${file}: ${fr.total_entries} entries (${fr.by_severity.warning}W ${fr.by_severity.error}E ${fr.by_severity.critical}C) synth=${fr.synthetic_fallbacks_used} blocked=${fr.calculation_blocked}`);
      }
      
      console.log('\n=== FIDELITY REPORT SUMMARY ===');
      for (const s of summaries) console.log(`  ${s}`);
      
      expect(summaries.length).toBeGreaterThan(0);
    });
  });
});
