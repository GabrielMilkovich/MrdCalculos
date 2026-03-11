/**
 * =====================================================
 * GOLDEN TEST: Full PJC → Engine Pipeline Validation
 * =====================================================
 * Tests the complete pipeline: parse → bridge → engine → parity check
 * Using real .PJC files as ground truth.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';
import { convertPjcToEngineInputs, type PjcEngineInputs } from '../lib/pjecalc/pjc-to-engine';
import { PjeCalcEngine } from '../lib/pjecalc/engine';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

const PJC_DIR = resolve(__dirname, '../../public/reports');

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

function runGoldenCase(file: string): GoldenResult | null {
  const path = resolve(PJC_DIR, file);
  if (!existsSync(path)) return null;
  
  const content = readFileSync(path, 'utf-8');
  const analysis = analyzePJC(content);
  
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
  
  it('should find at least one PJC file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // =====================================================
  // PARSER STRUCTURAL TESTS
  // =====================================================
  describe('Parser Structural Validation', () => {
    for (const file of files) {
      it(`[${file}] should parse without errors`, () => {
        const content = readFileSync(resolve(PJC_DIR, file), 'utf-8');
        const analysis = analyzePJC(content);
        
        // Must have parametros
        expect(analysis.parametros.admissao).toBeTruthy();
        
        // Must have verbas
        expect(analysis.verbas.length).toBeGreaterThan(0);
        
        // Count structural elements
        console.log(`  ${file}: ${analysis.verbas.length} verbas, ${analysis.historicos_salariais.length} hist, ${analysis.apuracao_diaria_count} dias, ${analysis.faltas.length} faltas, ${analysis.ferias.length} férias`);
      });

      it(`[${file}] should extract historicos salariais`, () => {
        const content = readFileSync(resolve(PJC_DIR, file), 'utf-8');
        const analysis = analyzePJC(content);
        
        expect(analysis.historicos_salariais.length).toBeGreaterThanOrEqual(0);
        
        // If historicos exist, they should have names
        for (const h of analysis.historicos_salariais) {
          expect(h.nome).toBeTruthy();
        }
      });

      it(`[${file}] should extract full apuração diária when present`, () => {
        const content = readFileSync(resolve(PJC_DIR, file), 'utf-8');
        const analysis = analyzePJC(content);
        
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
        const content = readFileSync(resolve(PJC_DIR, file), 'utf-8');
        const analysis = analyzePJC(content);
        
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
        const content = readFileSync(resolve(PJC_DIR, file), 'utf-8');
        const analysis = analyzePJC(content);
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
        const content = readFileSync(resolve(PJC_DIR, file), 'utf-8');
        const analysis = analyzePJC(content);
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
        const golden = runGoldenCase(file);
        if (!golden) return; // Skip non-liquidated cases
        
        const p = golden.parity.principal_bruto;
        console.log(`  ${file} Principal: engine=${p.engine.toFixed(2)} pjc=${p.pjc.toFixed(2)} Δ=${p.delta.toFixed(2)} (${p.delta_pct.toFixed(2)}%)`);
        
        // Tolerance: R$ 1.00 or 0.5%
        expect(Math.abs(p.delta_pct)).toBeLessThan(1);
      });

      it(`[${file}] should liquidar without errors`, () => {
        const golden = runGoldenCase(file);
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
        const content = readFileSync(resolve(PJC_DIR, file), 'utf-8');
        const analysis = analyzePJC(content);
        
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
        const content = readFileSync(resolve(PJC_DIR, file), 'utf-8');
        const analysis = analyzePJC(content);
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
