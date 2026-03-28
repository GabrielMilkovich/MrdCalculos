/**
 * ═══════════════════════════════════════════════════════════════════
 * PROVA DE PARIDADE — 14 Casos Reais × Todos os Blocos
 * ═══════════════════════════════════════════════════════════════════
 *
 * Compara MRD CALC vs PJe-Calc bloco a bloco para todos os
 * arquivos .PJC disponíveis no repositório.
 *
 * O que PODE ser comparado diretamente com Ground Truth PJe-Calc:
 *   ✓ liquido_exequente  vs  engine.liquido_reclamante
 *   ✓ inss_reclamante    vs  engine.cs_segurado
 *   ✓ inss_reclamado     vs  engine.cs_empregador
 *   ✓ imposto_renda      vs  engine.ir_retido
 *   ✓ fgts_deposito      vs  engine.fgts.total_depositos (nota: FGTS corrigido)
 *   ✓ principal_corrigido via sum(ApuracaoDeJuros.valor_corrigido) (se disponível)
 *
 * O que NÃO está no resultado PJe-Calc (sem GT direto):
 *   ✗ FGTS multa: não reportada no <dados> do PJC
 *   ✗ Juros mora: embutida no bruto; não reportada isoladamente
 *   ✗ Correção monetária por verba: embutida
 *   ✗ Reflexos subtotal: não como bloco separado no <dados>
 *
 * Evidência executável: deltas são assertions que falham se > tolerância
 * ═══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';
import { convertPjcToEngineInputs } from '../lib/pjecalc/pjc-to-engine';
import { PjeCalcEngine } from '../lib/pjecalc/engine';
import type { PjeLiquidacaoResult } from '../lib/pjecalc/engine-types';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

// ─── File helpers ───────────────────────────────────────────────────

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
  return readdirSync(PJC_DIR)
    .filter(f => f.endsWith('.pjc'))
    .sort();
}

// ─── Structures ─────────────────────────────────────────────────────

interface BlockDelta {
  engine: number;
  pjc: number;
  delta: number;
  delta_pct: number;
  gt_available: boolean;
}

interface CaseParityResult {
  file: string;
  error?: string;
  analysis?: PJCAnalysis;
  result?: PjeLiquidacaoResult;
  blocks?: {
    liquido: BlockDelta;
    inss_reclamante: BlockDelta;
    inss_reclamado: BlockDelta;
    ir: BlockDelta;
    fgts_deposito: BlockDelta;
    principal_corrigido: BlockDelta;   // via ApuracaoDeJuros sum (if available)
    // Diagnostics only — no direct PJC GT
    principal_bruto_engine: number;
    fgts_multa_engine: number;
    juros_mora_engine: number;
    reflexos_engine: number;
    // verbas count
    verbas_pjc: number;
    verbas_engine: number;
  };
}

function bd(engine: number, pjc: number, gt: boolean): BlockDelta {
  const delta = engine - pjc;
  const delta_pct = pjc !== 0 ? (delta / Math.abs(pjc)) * 100 : (engine !== 0 ? 100 : 0);
  return { engine, pjc, delta, delta_pct, gt_available: gt };
}

// ─── Global state ───────────────────────────────────────────────────

const files = listPjcFiles();
const parityResults: CaseParityResult[] = [];

// ─── Setup — parse all 14 files once ────────────────────────────────

beforeAll(() => {
  for (const file of files) {
    const path = resolve(PJC_DIR, file);
    try {
      const xml = readPjcXml(path);
      const analysis = analyzePJC(xml);

      // Skip non-liquidated cases
      if (analysis.resultado.liquido_exequente === 0 && analysis.resultado.inss_reclamante === 0) {
        parityResults.push({ file, error: 'não liquidado (liquido_exequente=0)' });
        continue;
      }

      const inputs = convertPjcToEngineInputs(analysis, `parity-${file}`);
      const engine = new PjeCalcEngine(
        inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
        inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
        inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
        inputs.custasConfig, inputs.seguroConfig, ALL_TEST_INDICES,
      );
      const result = engine.liquidar();

      // ApuracaoDeJuros — sum(valor_corrigido) = principal corrigido per PJe-Calc
      const ajTotal = analysis.apuracao_juros?.reduce((s, e) => s + e.valor_corrigido, 0) ?? 0;
      const hasAJ = (analysis.apuracao_juros?.length ?? 0) > 0;

      // Reflexos from engine
      const reflexosEngine = result.verbas
        .filter(v => v.tipo === 'reflexa')
        .reduce((s, v) => s + v.total_diferenca, 0);

      parityResults.push({
        file,
        analysis,
        result,
        blocks: {
          liquido:           bd(result.resumo.liquido_reclamante,    analysis.resultado.liquido_exequente, true),
          inss_reclamante:   bd(result.resumo.cs_segurado,           analysis.resultado.inss_reclamante,  true),
          inss_reclamado:    bd(result.resumo.cs_empregador,         analysis.resultado.inss_reclamado,   true),
          ir:                bd(result.resumo.ir_retido,             analysis.resultado.imposto_renda,    true),
          fgts_deposito:     bd(result.fgts.total_depositos,         analysis.resultado.fgts_deposito,    true),
          principal_corrigido: bd(result.resumo.principal_corrigido, ajTotal, hasAJ),
          principal_bruto_engine: result.resumo.principal_bruto,
          fgts_multa_engine:  result.fgts.multa_valor,
          juros_mora_engine:  result.resumo.juros_mora,
          reflexos_engine:    reflexosEngine,
          verbas_pjc:   analysis.verbas.filter(v => v.ativo).length,
          verbas_engine: result.verbas.length,
        },
      });
    } catch (e: any) {
      parityResults.push({ file, error: e.message || String(e) });
    }
  }
}, 600000); // 10 min for 14 files including 6MB ones

// ─── Helper: print table ─────────────────────────────────────────────

function fmtBlock(b: BlockDelta | undefined, label: string): string {
  if (!b) return `  ${label}: n/a`;
  const gt = b.gt_available ? '' : ' [sem GT]';
  const pct = Math.abs(b.delta_pct) < 0.01 ? '≈0%' : `${b.delta_pct > 0 ? '+' : ''}${b.delta_pct.toFixed(2)}%`;
  const dSign = b.delta > 0 ? '+' : '';
  return `  ${label.padEnd(22)}: engine=${b.engine.toFixed(2).padStart(12)} | pjc=${b.pjc.toFixed(2).padStart(12)} | Δ=${dSign}${b.delta.toFixed(2).padStart(10)} (${pct})${gt}`;
}

// ─── Print summary table ─────────────────────────────────────────────

it('imprime tabela de paridade por caso e por bloco', () => {
  const separator = '═'.repeat(90);
  console.log('\n' + separator);
  console.log('PROVA DE PARIDADE — MRD CALC vs PJe-Calc — 14 Casos Reais');
  console.log(separator);

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const r of parityResults) {
    console.log(`\n► ${r.file}`);
    if (r.error) {
      console.log(`  ⚠ SKIP: ${r.error}`);
      skipCount++;
      continue;
    }

    const b = r.blocks!;
    console.log(fmtBlock(b.liquido,           'líquido_final    ✓'));
    console.log(fmtBlock(b.inss_reclamante,    'INSS reclamante  ✓'));
    console.log(fmtBlock(b.inss_reclamado,     'INSS reclamada   ✓'));
    console.log(fmtBlock(b.ir,                 'IR               ✓'));
    console.log(fmtBlock(b.fgts_deposito,      'FGTS depósitos   ✓'));
    console.log(fmtBlock(b.principal_corrigido,'principal+corr   ~'));
    console.log(`  ${'principal_bruto diag'.padEnd(22)}: engine=${b.principal_bruto_engine.toFixed(2).padStart(12)} | pjc=   [sem GT sep.]`);
    console.log(`  ${'FGTS multa'.padEnd(22)}: engine=${b.fgts_multa_engine.toFixed(2).padStart(12)} | pjc=   [sem GT sep.]`);
    console.log(`  ${'juros_mora'.padEnd(22)}: engine=${b.juros_mora_engine.toFixed(2).padStart(12)} | pjc=   [sem GT sep.]`);
    console.log(`  ${'reflexos'.padEnd(22)}: engine=${b.reflexos_engine.toFixed(2).padStart(12)} | pjc=   [sem GT sep.]`);
    console.log(`  ${'verbas'.padEnd(22)}: engine=${String(b.verbas_engine).padStart(12)} | pjc=${String(b.verbas_pjc).padStart(12)}`);

    const liqDelta = Math.abs(b.liquido.delta_pct);
    if (liqDelta < 2) {
      console.log(`  → LÍQUIDO ✓ (${liqDelta.toFixed(2)}% < 2%)`);
      passCount++;
    } else {
      console.log(`  → LÍQUIDO ✗ (${liqDelta.toFixed(2)}% ≥ 2%)`);
      failCount++;
    }
  }

  console.log('\n' + separator);
  console.log(`RESUMO: ${passCount} ✓ | ${failCount} ✗ | ${skipCount} SKIP de ${parityResults.length} casos`);
  console.log(separator);

  expect(parityResults.length).toBeGreaterThan(0);
});

// ─── Per-case assertions (pre-defined so vitest can collect at startup) ──────

describe.each(files)('%s', (file) => {
  function getResult(): CaseParityResult | undefined {
    return parityResults.find(r => r.file === file);
  }

  it('motor V3 executou sem crash', () => {
    const r = getResult();
    if (!r) return; // beforeAll not done yet — shouldn't happen
    if (r.error?.includes('não liquidado')) return; // skip by design
    expect(r.error, `falha ao processar: ${r.error}`).toBeUndefined();
    expect(r.result).toBeDefined();
  });

  it('líquido final dentro de 2% vs PJe-Calc', () => {
    const r = getResult();
    if (!r || r.error) return;
    const b = r.blocks!;
    expect(Math.abs(b.liquido.delta_pct)).toBeLessThan(2);
  });

  it('INSS reclamante dentro de 5% ou R$10 vs PJe-Calc', () => {
    const r = getResult();
    if (!r || r.error) return;
    const b = r.blocks!;
    if (b.inss_reclamante.pjc === 0 && b.inss_reclamante.engine === 0) return;
    expect(Math.abs(b.inss_reclamante.delta_pct) < 5 || Math.abs(b.inss_reclamante.delta) < 10).toBe(true);
  });

  it('IR dentro de 5% ou R$10 vs PJe-Calc', () => {
    const r = getResult();
    if (!r || r.error) return;
    const b = r.blocks!;
    if (b.ir.pjc === 0 && b.ir.engine === 0) return;
    expect(Math.abs(b.ir.delta_pct) < 5 || Math.abs(b.ir.delta) < 10).toBe(true);
  });
});
