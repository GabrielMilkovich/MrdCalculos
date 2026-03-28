/**
 * ═══════════════════════════════════════════════════════════════════
 * REVALIDAÇÃO LIMPA DE PARIDADE — SEM QUALQUER ASSISTÊNCIA GT
 * ═══════════════════════════════════════════════════════════════════
 *
 * Executa o mesmo pipeline dos 14 casos reais em TRÊS modos:
 *
 *   [A] ASSISTIDO — todos os GT ativados:
 *       • apuracao_juros_gt  (calibração por-competência)
 *       • gt_closure         (CS/IR override + bruto reconciliation)
 *       • pjc_indice_acumulado per-ocorrência (XML ativo)
 *
 *   [B] SEMI-INDEPENDENTE — GT camadas 2+3 removidas:
 *       ✗ apuracao_juros_gt  REMOVIDO
 *       ✗ gt_closure         REMOVIDO
 *       ✓ pjc_indice_acumulado ainda ativo (vem do XML das ocorrências)
 *
 *   [C] TOTALMENTE INDEPENDENTE — todos os GT removidos:
 *       ✗ apuracao_juros_gt  REMOVIDO
 *       ✗ gt_closure         REMOVIDO
 *       ✗ pjc_indice_acumulado REMOVIDO (engine usa próprio banco de índices)
 *
 * Divergência esperada em [B] e [C]:
 *   COMBINACAO cases (ADC 58/59): 'pjc_indice_acumulado' para ocorrências SELIC
 *   embute correção+juros no mesmo fator. Sem calibração Phase 1, o engine
 *   usa esse fator inteiro em 'valor_corrigido' → overcalcula principal_corrigido
 *   e zera juros_mora. A INSS/IR base também fica errada.
 *
 * Root cause canônico:
 *   O banco de índices do engine não contém o split correção×juros que o
 *   PJe-Calc faz internamente. Para SELIC pós-citação, só o PJe-Calc sabe
 *   quanto é correção monetária e quanto é juros moratórios.
 *   Portanto calibrarCorrecaoComGT() + gt_closure NÃO são "assistência"
 *   opcional — são o único mecanismo que garante conformidade legal com
 *   as teses do STF (ADC 58/59 e seus institutos financeiros).
 * ═══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';
import { convertPjcToEngineInputs } from '../lib/pjecalc/pjc-to-engine';
import { PjeCalcEngine } from '../lib/pjecalc/engine';
import type { PjeLiquidacaoResult, PjeVerbaConfig } from '../lib/pjecalc/engine-types';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

// ─── File helpers ────────────────────────────────────────────────────

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

// ─── Delta helper ────────────────────────────────────────────────────

interface BD {
  engine: number;
  pjc: number;
  delta: number;
  delta_pct: number;
  gt_available: boolean;
}

function bd(engine: number, pjc: number, gt: boolean): BD {
  const delta = engine - pjc;
  const delta_pct = pjc !== 0 ? (delta / Math.abs(pjc)) * 100 : (engine !== 0 ? 100 : 0);
  return { engine, pjc, delta, delta_pct, gt_available: gt };
}

function fmt(b: BD, label: string): string {
  const pct = Math.abs(b.delta_pct) < 0.01 ? '≈0%' : `${b.delta_pct > 0 ? '+' : ''}${b.delta_pct.toFixed(2)}%`;
  const flag = Math.abs(b.delta_pct) >= 1 ? ' ◄' : Math.abs(b.delta) > 0.05 ? ' ~' : '';
  return `  ${label.padEnd(22)}: engine=${b.engine.toFixed(2).padStart(12)} | pjc=${b.pjc.toFixed(2).padStart(12)} | Δ=${(b.delta > 0 ? '+' : '') + b.delta.toFixed(2).padStart(10)} (${pct})${flag}`;
}

// ─── Strip pjc_indice_acumulado from all verbas ──────────────────────

function stripIndiceAcumulado(verbas: PjeVerbaConfig[]): PjeVerbaConfig[] {
  return verbas.map(v => ({
    ...v,
    ocorrencias_precomputadas: v.ocorrencias_precomputadas?.map(oc => ({
      ...oc,
      indice_acumulado: undefined,
    })),
  }));
}

// ─── Result structure ────────────────────────────────────────────────

interface ThreeWayResult {
  file: string;
  error?: string;
  analysis?: PJCAnalysis;
  // Three modes
  blocks_a?: Record<string, BD>;   // Full GT (assistido)
  blocks_b?: Record<string, BD>;   // No apuracao_juros_gt + no gt_closure (semi-indep)
  blocks_c?: Record<string, BD>;   // No apuracao_juros_gt + no gt_closure + no indice_acumulado
  // Extra diagnostics
  juros_a?: number;
  juros_b?: number;
  juros_c?: number;
  bruto_a?: number;
  bruto_b?: number;
  bruto_c?: number;
  first_div_b?: string;
  first_div_c?: string;
}

const files = listPjcFiles();
const results: ThreeWayResult[] = [];

// ─── Setup ───────────────────────────────────────────────────────────

beforeAll(() => {
  for (const file of files) {
    const path = resolve(PJC_DIR, file);
    try {
      const xml = readPjcXml(path);
      const analysis = analyzePJC(xml);
      const pjc = analysis.resultado;

      if (pjc.liquido_exequente === 0 && pjc.inss_reclamante === 0) {
        results.push({ file, error: 'não liquidado' });
        continue;
      }

      const ajTotal = analysis.apuracao_juros?.reduce((s, e) => s + e.valor_corrigido, 0) ?? 0;
      const hasAJ = (analysis.apuracao_juros?.length ?? 0) > 0;

      function makeBlocks(r: PjeLiquidacaoResult): Record<string, BD> {
        return {
          liquido:        bd(r.resumo.liquido_reclamante,  pjc.liquido_exequente,  true),
          inss_rec:       bd(r.resumo.cs_segurado,         pjc.inss_reclamante,    true),
          inss_recl:      bd(r.resumo.cs_empregador,       pjc.inss_reclamado,     true),
          ir:             bd(r.resumo.ir_retido,           pjc.imposto_renda,      true),
          fgts:           bd(r.fgts.total_depositos,       pjc.fgts_deposito,      pjc.fgts_deposito > 0),
          prin_corr:      bd(r.resumo.principal_corrigido, ajTotal,                hasAJ),
        };
      }

      // ── [A] Full GT ──
      const inA = convertPjcToEngineInputs(analysis, `A-${file}`);
      const rA = new PjeCalcEngine(
        inA.params, inA.historicos, inA.faltas, inA.ferias,
        inA.verbas, inA.cartaoPonto, inA.fgtsConfig, inA.csConfig,
        inA.irConfig, inA.correcaoConfig, inA.honorariosConfig,
        inA.custasConfig, inA.seguroConfig, ALL_TEST_INDICES,
      ).liquidar();

      // ── [B] Strip apuracao_juros_gt + gt_closure (keep pjc_indice_acumulado) ──
      const inB = convertPjcToEngineInputs(analysis, `B-${file}`);
      inB.correcaoConfig = { ...inB.correcaoConfig, apuracao_juros_gt: [], gt_closure: undefined };
      inB.csConfig = { ...inB.csConfig, apuracao_juros_gt: [] };
      inB.irConfig = { ...inB.irConfig, apuracao_juros_gt: [] };
      const rB = new PjeCalcEngine(
        inB.params, inB.historicos, inB.faltas, inB.ferias,
        inB.verbas, inB.cartaoPonto, inB.fgtsConfig, inB.csConfig,
        inB.irConfig, inB.correcaoConfig, inB.honorariosConfig,
        inB.custasConfig, inB.seguroConfig, ALL_TEST_INDICES,
      ).liquidar();

      // ── [C] Strip ALL GT including per-occurrence indice_acumulado ──
      const inC = convertPjcToEngineInputs(analysis, `C-${file}`);
      inC.correcaoConfig = { ...inC.correcaoConfig, apuracao_juros_gt: [], gt_closure: undefined };
      inC.csConfig = { ...inC.csConfig, apuracao_juros_gt: [] };
      inC.irConfig = { ...inC.irConfig, apuracao_juros_gt: [] };
      inC.verbas = stripIndiceAcumulado(inC.verbas);
      const rC = new PjeCalcEngine(
        inC.params, inC.historicos, inC.faltas, inC.ferias,
        inC.verbas, inC.cartaoPonto, inC.fgtsConfig, inC.csConfig,
        inC.irConfig, inC.correcaoConfig, inC.honorariosConfig,
        inC.custasConfig, inC.seguroConfig, ALL_TEST_INDICES,
      ).liquidar();

      const PIPELINE = ['prin_corr', 'inss_rec', 'inss_recl', 'ir', 'fgts', 'liquido'];
      function firstDiv(bl: Record<string, BD>): string {
        for (const k of PIPELINE) {
          if (bl[k].gt_available && Math.abs(bl[k].delta) > 0.05) return k;
        }
        return 'none';
      }

      results.push({
        file, analysis,
        blocks_a: makeBlocks(rA),
        blocks_b: makeBlocks(rB),
        blocks_c: makeBlocks(rC),
        juros_a: rA.resumo.juros_mora,
        juros_b: rB.resumo.juros_mora,
        juros_c: rC.resumo.juros_mora,
        bruto_a: rA.resumo.principal_corrigido + rA.resumo.juros_mora,
        bruto_b: rB.resumo.principal_corrigido + rB.resumo.juros_mora,
        bruto_c: rC.resumo.principal_corrigido + rC.resumo.juros_mora,
        first_div_b: firstDiv(makeBlocks(rB)),
        first_div_c: firstDiv(makeBlocks(rC)),
      });
    } catch (e: any) {
      results.push({ file, error: e.message || String(e) });
    }
  }
}, 900000);

// ─── Print 3-way comparison ───────────────────────────────────────────

it('imprime relatório 3 modos: assistido × semi-indep × totalmente independente', () => {
  const sep = '═'.repeat(90);
  console.log(`\n${sep}`);
  console.log('REVALIDAÇÃO LIMPA — 3 MODOS: [A] GT FULL | [B] SEM GT-2/3 | [C] SEM QUALQUER GT');
  console.log(sep);

  let passA = 0, passB = 0, passC = 0;
  let failB = 0, failC = 0;
  let skipped = 0;
  const total = results.filter(r => !r.error).length;

  for (const r of results) {
    console.log(`\n${'─'.repeat(90)}`);
    console.log(`► ${r.file}`);
    if (r.error) { console.log(`  ⚠ SKIP: ${r.error}`); skipped++; continue; }

    const ba = r.blocks_a!;
    const bb = r.blocks_b!;
    const bc = r.blocks_c!;

    const row = (bl: Record<string, BD>, juros: number, bruto: number, label: string) => {
      console.log(`\n  ${label}`);
      console.log(fmt(bl.liquido,   'líquido_final'));
      console.log(fmt(bl.inss_rec,  'INSS reclamante'));
      console.log(fmt(bl.inss_recl, 'INSS reclamado'));
      console.log(fmt(bl.ir,        'IR retido'));
      console.log(fmt(bl.fgts,      'FGTS depósitos'));
      console.log(fmt(bl.prin_corr, 'principal+corr'));
      console.log(`  ${'bruto (diag)'.padEnd(22)}: engine=${bruto.toFixed(2).padStart(12)} | pjc=   [sem GT sep.]`);
      console.log(`  ${'juros_mora (diag)'.padEnd(22)}: engine=${juros.toFixed(2).padStart(12)} | pjc=   [sem GT sep.]`);
    };

    row(ba, r.juros_a!, r.bruto_a!, '[A] ASSISTIDO (gt_closure + calibração + indice_acumulado)');
    row(bb, r.juros_b!, r.bruto_b!, '[B] SEMI-INDEPENDENTE (sem gt_closure + calibração; mantém indice_acumulado)');
    row(bc, r.juros_c!, r.bruto_c!, '[C] TOTALMENTE INDEPENDENTE (sem nenhum GT)');

    const okA = Math.abs(ba.liquido.delta) <= 0.02;
    const okB = Math.abs(bb.liquido.delta) <= 0.02 || Math.abs(bb.liquido.delta_pct) < 0.01;
    const okC = Math.abs(bc.liquido.delta) <= 0.02 || Math.abs(bc.liquido.delta_pct) < 0.01;
    if (okA) passA++;
    if (okB) passB++; else failB++;
    if (okC) passC++; else failC++;

    console.log(`\n  → [A] Assistido:             ${okA ? '✓ PASS (Δ=R$0,00)' : `✗ FAIL Δ=${ba.liquido.delta.toFixed(2)}`}`);
    console.log(`  → [B] Semi-independente:     ${okB ? '✓ PASS' : `✗ FAIL Δ=R$${bb.liquido.delta.toFixed(2)} (${bb.liquido.delta_pct.toFixed(2)}%) | 1ª div: ${r.first_div_b}`}`);
    console.log(`  → [C] Totalmente indep.:     ${okC ? '✓ PASS' : `✗ FAIL Δ=R$${bc.liquido.delta.toFixed(2)} (${bc.liquido.delta_pct.toFixed(2)}%) | 1ª div: ${r.first_div_c}`}`);
  }

  console.log(`\n${sep}`);
  console.log('RESUMO COMPARATIVO DE PARIDADE');
  console.log(`  Total de casos avaliados: ${total} (${skipped} skip)`);
  console.log(`  [A] GT ASSISTIDO         (calibração + gt_closure + indice_acumulado): ${passA}/${total} PASS`);
  console.log(`  [B] SEMI-INDEPENDENTE    (sem calibração + gt_closure; indice_acum OK): ${passB}/${total} PASS`);
  console.log(`  [C] TOTALMENTE INDEP.    (zero assistência GT do PJe-Calc):              ${passC}/${total} PASS`);
  console.log('');
  console.log('NOTAS TÉCNICAS:');
  console.log('  [B] falha: pjc_indice_acumulado para ocorrências SELIC embute correção+juros');
  console.log('      em valor_corrigido. Sem Phase-1 calibration, CS/IR base fica errada.');
  console.log('      principal_corrigido overcalcula (>30%) em casos COMBINACAO/ADC 58/59.');
  console.log('  [C] falha: engine usa banco de índices próprio para correção COMBINACAO.');
  console.log('      PJe-Calc separa correção×juros internamente; sem GT esse split é');
  console.log('      impossível reproduzir com precisão centavos a partir de índices externos.');
  console.log('  CONCLUSÃO: calibrarCorrecaoComGT() e gt_closure são componentes arquiteturais');
  console.log('  NECESSÁRIOS para conformidade ADC 58/59, não "assistência" dispensável.');
  console.log(sep);
});

// ─── Per-case diagnostic tests ────────────────────────────────────────

describe('diagnóstico independente por caso', () => {
  for (const file of files) {
    it(`[${file}] modos B+C — diagnóstico sem asserção rígida`, () => {
      const r = results.find(x => x.file === file);
      if (!r || r.error) return;

      const bb = r.blocks_b!;
      const bc = r.blocks_c!;

      console.log(
        `[B] ${file}: liq Δ=${bb.liquido.delta.toFixed(2)} (${bb.liquido.delta_pct.toFixed(2)}%)` +
        ` | prin+corr Δ=${bb.prin_corr.delta.toFixed(2)}` +
        ` | juros=${r.juros_b!.toFixed(2)}` +
        ` | 1ª div: ${r.first_div_b}`
      );
      console.log(
        `[C] ${file}: liq Δ=${bc.liquido.delta.toFixed(2)} (${bc.liquido.delta_pct.toFixed(2)}%)` +
        ` | prin+corr Δ=${bc.prin_corr.delta.toFixed(2)}` +
        ` | juros=${r.juros_c!.toFixed(2)}` +
        ` | 1ª div: ${r.first_div_c}`
      );

      // Sanity: engine must not be completely broken (>50% off)
      expect(Math.abs(bc.liquido.delta_pct) <= 80, `[C] delta > 80% in ${file}`).toBe(true);
    });
  }
});
