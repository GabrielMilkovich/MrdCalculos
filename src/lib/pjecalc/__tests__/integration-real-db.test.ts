/**
 * @vitest-environment jsdom
 * 
 * Integration test: runs PJC comparison using REAL indices from Supabase production DB.
 * This proves whether the delta comes from data precision or engine logic.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import type { PjeIndiceRow, PjeINSSFaixaRow, PjeIRFaixaRow } from '../engine-types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://guozwjosshsmcgzstroe.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const REPORTS_DIR = path.resolve(__dirname, '../../../..', 'public/reports');
const TEST_TIMEOUT = 120_000;

const GOLDEN = [
  { file: 'antonio-harley.pjc', name: 'ANTONIO HARLEY', expected_liquido: 39929.92 },
  { file: 'izabela-cristina.pjc', name: 'IZABELA CRISTINA', expected_liquido: 73879.96 },
  { file: 'joseli-silva.pjc', name: 'JOSELI SILVA', expected_liquido: 510459.85 },
  { file: 'roque-guerreiro.pjc', name: 'ROQUE GUERREIRO', expected_liquido: 231306.58 },
  { file: 'rosicleia-pereira-chaves.pjc', name: 'ROSICLEIA', expected_liquido: 247215.95 },
];

function readPjcXml(filename: string): string {
  const filePath = path.join(REPORTS_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error(`PJC file not found: ${filePath}`);
  const buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return execSync(`unzip -p "${filePath}"`, { maxBuffer: 50 * 1024 * 1024, encoding: 'latin1' });
  }
  return buffer.toString('latin1');
}

describe('Integration: Real DB indices vs PJe-Calc', { timeout: TEST_TIMEOUT }, () => {
  let indicesDB: PjeIndiceRow[] = [];
  let faixasINSS: PjeINSSFaixaRow[] = [];
  let faixasIR: PjeIRFaixaRow[] = [];
  let dbAvailable = false;

  beforeAll(async () => {
    if (!SUPABASE_KEY) {
      console.log('⚠️ SKIP: No Supabase key available');
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Load ALL correction indices (paginated to avoid 1000 limit)
    let allIndices: PjeIndiceRow[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('pjecalc_correcao_monetaria')
        .select('indice, competencia, valor, acumulado')
        .order('competencia')
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`Failed to load indices: ${error.message}`);
      if (!data || data.length === 0) break;
      allIndices = allIndices.concat(data as PjeIndiceRow[]);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    indicesDB = allIndices;
    
    // Count by index type
    const counts: Record<string, number> = {};
    for (const i of indicesDB) {
      counts[i.indice] = (counts[i.indice] || 0) + 1;
    }
    console.log(`✅ Loaded ${indicesDB.length} correction indices from DB`);
    console.log('   Index counts:', JSON.stringify(counts));

    // Load INSS faixas
    const { data: inssData } = await supabase
      .from('pjecalc_inss_faixas')
      .select('*')
      .order('competencia_inicio');
    faixasINSS = (inssData || []) as PjeINSSFaixaRow[];
    console.log(`✅ Loaded ${faixasINSS.length} INSS faixas from DB`);

    // Load IR faixas — need to join with pjecalc_imposto_renda to get competencia
    const { data: irParentData } = await supabase
      .from('pjecalc_imposto_renda')
      .select('id, competencia, deducao_dependente');
    const { data: irFaixasData } = await supabase
      .from('pjecalc_imposto_renda_faixas')
      .select('*')
      .order('faixa');

    // Convert to PjeIRFaixaRow format
    if (irParentData && irFaixasData) {
      const parentMap = new Map(irParentData.map(p => [p.id, p]));
      faixasIR = irFaixasData.map(f => {
        const parent = parentMap.get(f.ir_id);
        return {
          competencia_inicio: parent?.competencia || '2024-01-01',
          competencia_fim: null,
          faixa: f.faixa,
          valor_ate: f.valor_final || 999999999,
          aliquota: f.aliquota,
          deducao: f.parcela_deduzir || 0,
          deducao_dependente: parent?.deducao_dependente || 0,
        } as PjeIRFaixaRow;
      });
    }
    console.log(`✅ Loaded ${faixasIR.length} IR faixas from DB`);

    dbAvailable = indicesDB.length > 100;
  });

  for (const gc of GOLDEN) {
    it(`[REAL DB] ${gc.name} (${gc.file})`, { timeout: TEST_TIMEOUT }, () => {
      if (!dbAvailable) {
        console.log('⚠️ SKIP: No DB data loaded');
        return;
      }

      const xml = readPjcXml(gc.file);
      const analysis = analyzePJC(xml);
      const inputs = convertPjcToEngineInputs(analysis, `realdb-${gc.name}`);

      // Force independent mode — NO GT calibration
      inputs.params.modo_calculo = 'independent';
      inputs.correcaoConfig.gt_closure = undefined;
      inputs.correcaoConfig.apuracao_juros_gt = undefined;
      if ((inputs.csConfig as any).apuracao_juros_gt) {
        (inputs.csConfig as any).apuracao_juros_gt = undefined;
      }
      if ((inputs.irConfig as any).apuracao_juros_gt) {
        (inputs.irConfig as any).apuracao_juros_gt = undefined;
      }
      if (!inputs.params.data_citacao) {
        inputs.params.data_citacao = inputs.params.data_ajuizamento;
      }

      const engine = new PjeCalcEngineV3(
        inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
        inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
        inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
        inputs.custasConfig, inputs.seguroConfig,
        indicesDB,
        faixasINSS,
        faixasIR,
        inputs.excecoesCargas || [],
        [], // feriadosDB
        inputs.prevPrivadaConfig,
        inputs.pensaoConfig,
        inputs.salarioFamiliaConfig,
      );

      const result = engine.liquidar();
      const liquido = result.resumo.liquido_reclamante;
      const delta = liquido - gc.expected_liquido;
      const deltaPct = (delta / gc.expected_liquido * 100);

      console.log(`\n${'='.repeat(70)}`);
      console.log(`  [REAL DB] ${gc.name}`);
      console.log(`  PJe-Calc: R$ ${gc.expected_liquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`  MRD CALC: R$ ${liquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`  Delta:    R$ ${delta.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${deltaPct.toFixed(2)}%)`);
      console.log(`  Bruto:    R$ ${result.resumo.principal_bruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`  INSS Rec: R$ ${result.resumo.cs_segurado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`  IR:       R$ ${result.resumo.ir_retido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`  Juros:    R$ ${result.resumo.juros_mora.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`  Corrigido: R$ ${result.resumo.principal_corrigido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`  Warnings: ${result.calculation_warnings?.length || 0}`);
      if (result.calculation_warnings?.length) {
        for (const w of result.calculation_warnings.slice(0, 10)) {
          console.log(`    ⚠️ ${w.code}: ${w.message.slice(0, 120)}`);
        }
      }
      console.log(`${'='.repeat(70)}`);

      // Test passes regardless — we want to see the delta
      expect(result).toBeDefined();
    });
  }
});
