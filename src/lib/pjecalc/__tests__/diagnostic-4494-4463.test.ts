/**
 * @vitest-environment jsdom
 *
 * Diagnóstico focado — casos 4494 (-46,64%) e 4463 (+34,29%)
 *
 * Objetivo: decompor V3 vs PJC por componente (principal, corrigido, juros,
 * FGTS, INSS, IR, honorários, custas) e identificar em QUAL componente está
 * o delta. Também imprime breakdown por verba (quantidade de ocorrências,
 * comporPrincipal, diferença somada, corrigido, juros) para localizar
 * a verba (ou grupo de verbas) que está sobrando ou faltando.
 */
import { describe, it, vi, expect } from 'vitest';
vi.setConfig({ testTimeout: 60_000 });

import * as fs from 'fs';
import * as path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, SELIC_MENSAL, TR_ACUMULADO } from '../indices-fallback';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

const CORPUS_DIR = path.resolve(__dirname, '../../../../Arquivos PJC');

function buildIndicesDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  for (const [comp, valor] of Object.entries(SELIC_MENSAL).sort()) {
    rows.push({ indice: 'SELIC', competencia: comp + '-01', valor, acumulado: SELIC_ACUMULADO[comp] ?? 100 });
  }
  for (const [comp, acum] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    rows.push({ indice: 'IPCA-E', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCAE', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCA', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
  for (const [comp, acum] of Object.entries(TR_ACUMULADO).sort()) {
    rows.push({ indice: 'TR', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
  return rows;
}

function buildINSSFaixas(): PjeINSSFaixaRow[] {
  const f: PjeINSSFaixaRow[] = [];
  const add = (i: string, e: string | null, b: [number, number][]) =>
    b.forEach(([v, a], idx) => f.push({ competencia_inicio: i, competencia_fim: e, faixa: idx + 1, valor_ate: v, aliquota: a }));
  add('2015-01-01', '2015-12-01', [[1399.12, 0.08], [2331.88, 0.09], [4663.75, 0.11]]);
  add('2016-01-01', '2016-12-01', [[1556.94, 0.08], [2594.92, 0.09], [5189.82, 0.11]]);
  add('2017-01-01', '2017-12-01', [[1659.38, 0.08], [2765.66, 0.09], [5531.31, 0.11]]);
  add('2018-01-01', '2018-12-01', [[1693.72, 0.08], [2822.90, 0.09], [5645.80, 0.11]]);
  add('2019-01-01', '2019-12-01', [[1751.81, 0.08], [2919.72, 0.09], [5839.45, 0.11]]);
  add('2020-01-01', '2020-02-01', [[1830.29, 0.08], [3050.52, 0.09], [6101.06, 0.11]]);
  add('2020-03-01', '2020-12-01', [[1045.00, 0.075], [2089.60, 0.09], [3134.40, 0.12], [6101.06, 0.14]]);
  add('2021-01-01', '2021-12-01', [[1100.00, 0.075], [2203.48, 0.09], [3305.22, 0.12], [6433.57, 0.14]]);
  add('2022-01-01', '2022-12-01', [[1212.00, 0.075], [2427.35, 0.09], [3641.03, 0.12], [7087.22, 0.14]]);
  add('2023-01-01', '2023-12-01', [[1320.00, 0.075], [2571.29, 0.09], [3856.94, 0.12], [7507.49, 0.14]]);
  add('2024-01-01', '2024-12-01', [[1412.00, 0.075], [2666.68, 0.09], [4000.03, 0.12], [7786.02, 0.14]]);
  add('2025-01-01', null, [[1518.00, 0.075], [2793.88, 0.09], [4190.83, 0.12], [8157.41, 0.14]]);
  return f;
}

const INDICES = buildIndicesDB();
const FAIXAS = buildINSSFaixas();

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pad(s: string, w: number): string { return s.length >= w ? s : s + ' '.repeat(w - s.length); }
function padL(n: number, w: number): string { return fmt(n).padStart(w); }

const ALVOS = [
  { calc: '4463', file: 'PROCESSO_00000640320235050531_CALCULO_4463_DATA_05032026_HORA_112137.PJC', esperado_delta: '+34,29%' },
  { calc: '4494', file: 'PROCESSO_00120638520235150106_CALCULO_4494_DATA_06032026_HORA_111914.PJC', esperado_delta: '-46,64%' },
];

describe('Diagnóstico casos 4494 e 4463 — decomposição por componente', () => {
  for (const alvo of ALVOS) {
    it(`caso ${alvo.calc} (esperado ${alvo.esperado_delta})`, () => {
      const xml = fs.readFileSync(path.join(CORPUS_DIR, alvo.file), 'latin1');
      const a = analyzePJC(xml);
      const inputs = convertPjcToEngineInputs(a, `diag-${alvo.calc}`);
      inputs.params.modo_calculo = 'independent';
      if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;
      inputs.correcaoConfig.gt_closure = undefined;
      inputs.correcaoConfig.apuracao_juros_gt = undefined;
      if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
      if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;

      const engine = new PjeCalcEngineV3(
        inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
        inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
        inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
        inputs.custasConfig, inputs.seguroConfig, INDICES, FAIXAS,
      );
      const r = engine.liquidar();

      // ── Ground truth PJC ──
      const pjc = a.resultado;
      const honorariosPjc = pjc.honorarios.reduce((s, h) => s + h.valor, 0);
      const corrigidoPjcSum = (a.apuracao_juros ?? []).reduce((s, e) => s + (e.valor_corrigido || 0), 0);

      // ── V3 ──
      const v3 = r.resumo;

      // ── Sumário ──
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      console.log(`CASO ${alvo.calc} — Delta esperado ${alvo.esperado_delta}`);
      console.log(`  Admissão: ${inputs.params.data_admissao}  Demissão: ${inputs.params.data_demissao}`);
      console.log(`  Ajuizamento: ${inputs.params.data_ajuizamento}  Citação: ${inputs.params.data_citacao}`);
      console.log(`  Liquidação: ${inputs.correcaoConfig.data_liquidacao}`);
      console.log(`  Índice: ${inputs.correcaoConfig.indice}  Juros: ${inputs.correcaoConfig.juros_tipo} (${inputs.correcaoConfig.juros_percentual ?? 1}% ${inputs.correcaoConfig.juros_inicio})`);
      console.log(`  Base juros: ${inputs.correcaoConfig.base_de_juros_das_verbas}`);
      console.log(`  # combinações índice: ${inputs.correcaoConfig.combinacoes_indice?.length ?? 0}`);
      console.log(`  # combinações juros:  ${inputs.correcaoConfig.combinacoes_juros?.length ?? 0}`);
      if (inputs.correcaoConfig.combinacoes_indice?.length) {
        for (const ci of inputs.correcaoConfig.combinacoes_indice) {
          console.log(`     ÍND: ${ci.de ?? '—'} → ${ci.ate ?? '—'} | ${ci.indice}`);
        }
      }
      if (inputs.correcaoConfig.combinacoes_juros?.length) {
        for (const cj of inputs.correcaoConfig.combinacoes_juros) {
          console.log(`     JRS: ${cj.de ?? '—'} → ${cj.ate ?? '—'} | ${cj.tipo} ${cj.percentual ?? ''}`);
        }
      }
      console.log('───────────────────────────────────────────────────────────────────────────────');
      console.log('  COMPONENTE                          |  PJe-Calc (R$)    |  V3 (R$)          |  Delta R$        |  Delta %');
      console.log('  ────────────────────────────────────|───────────────────|───────────────────|──────────────────|─────────');

      const row = (label: string, pjcV: number | null, v3V: number, pjcMissing = false) => {
        const pjcStr = pjcMissing ? pad('N/A', 17) : (pjcV !== null ? padL(pjcV, 17) : pad('—', 17));
        const v3Str = padL(v3V, 17);
        const delta = pjcV !== null ? v3V - pjcV : 0;
        const pct = pjcV && pjcV !== 0 ? (delta / pjcV) * 100 : 0;
        const deltaStr = pjcV !== null ? (delta >= 0 ? '+' : '') + fmt(delta) : '—';
        const pctStr = pjcV && pjcV !== 0 ? ((pct >= 0 ? '+' : '') + pct.toFixed(2) + '%') : '—';
        console.log(`  ${pad(label, 36)}|  ${pjcStr}|  ${v3Str}|  ${pad(deltaStr, 16)}|  ${pctStr}`);
      };

      row('principal_bruto',           null,              v3.principal_bruto, true);
      row('principal_corrigido (ΣApJuros)', corrigidoPjcSum > 0 ? corrigidoPjcSum : null, v3.principal_corrigido);
      row('juros_mora',                null,              v3.juros_mora, true);
      row('principal + juros (bruto)', null,              v3.principal_corrigido + v3.juros_mora, true);
      row('fgts_total',                pjc.fgts_deposito, v3.fgts_total);
      row('cs_segurado (INSS reclamante)', pjc.inss_reclamante, v3.cs_segurado);
      row('cs_empregador (INSS reclamado)', pjc.inss_reclamado, v3.cs_empregador);
      row('ir_retido',                 pjc.imposto_renda, v3.ir_retido);
      row('honorarios (sucumbenciais)', honorariosPjc,    v3.honorarios_sucumbenciais);
      row('custas',                    pjc.custas,        v3.custas);
      console.log('  ────────────────────────────────────|───────────────────|───────────────────|──────────────────|─────────');
      row('LÍQUIDO RECLAMANTE',        pjc.liquido_exequente, v3.liquido_reclamante);

      // ── Breakdown por verba ──
      console.log('');
      console.log(`  VERBAS V3 (${r.verbas.length} verbas, ${r.verbas.reduce((s, v) => s + v.ocorrencias.length, 0)} ocorrências):`);
      console.log('  #  | Nome                                     | #oc | Caract.      | Σ devido       | Σ dif          | Σ corrigido    | Σ juros        | Σ final');
      console.log('  ───|──────────────────────────────────────────|─────|──────────────|────────────────|────────────────|────────────────|────────────────|───────────────');
      const verbasOrdenadas = [...r.verbas].sort((x, y) => Math.abs(y.total_final) - Math.abs(x.total_final));
      let sumDev = 0, sumDif = 0, sumCorr = 0, sumJrs = 0, sumFin = 0;
      for (let i = 0; i < verbasOrdenadas.length; i++) {
        const v = verbasOrdenadas[i];
        const vUI = inputs.verbas.find(vv => vv.id === v.verba_id);
        const cp = vUI?.compor_principal === false ? '[NC]' : '    ';
        sumDev += v.total_devido; sumDif += v.total_diferenca;
        sumCorr += v.total_corrigido; sumJrs += v.total_juros; sumFin += v.total_final;
        const nome = (v.nome || v.verba_id).slice(0, 40);
        console.log(
          `  ${String(i + 1).padStart(2)} | ${pad(cp + nome, 40)} | ${String(v.ocorrencias.length).padStart(3)} | ${pad(v.caracteristica, 12)} | ${padL(v.total_devido, 14)} | ${padL(v.total_diferenca, 14)} | ${padL(v.total_corrigido, 14)} | ${padL(v.total_juros, 14)} | ${padL(v.total_final, 14)}`
        );
      }
      console.log('  ───|──────────────────────────────────────────|─────|──────────────|────────────────|────────────────|────────────────|────────────────|───────────────');
      console.log(`     | TOTAL                                    |     |              | ${padL(sumDev, 14)} | ${padL(sumDif, 14)} | ${padL(sumCorr, 14)} | ${padL(sumJrs, 14)} | ${padL(sumFin, 14)}`);

      // ── Verbas do PJC (input) ──
      const verbasInput = inputs.verbas;
      const precomputadas = verbasInput.filter(v => v.ocorrencias_precomputadas?.length).length;
      const naoCompor = verbasInput.filter(v => v.compor_principal === false).length;
      const tipos = new Map<string, number>();
      for (const v of verbasInput) {
        tipos.set(v.caracteristica, (tipos.get(v.caracteristica) ?? 0) + 1);
      }
      console.log('');
      console.log(`  INPUT: ${verbasInput.length} verbas | ${precomputadas} com ocorrências precomputadas | ${naoCompor} com comporPrincipal=false`);
      console.log('  Por característica:');
      for (const [c, n] of [...tipos].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${pad(c, 22)} ${n}`);
      }

      // ── Verbas do ANÁLISE PJC (nomeadas) ──
      console.log('');
      console.log(`  VERBAS no XML PJC: ${a.verbas.length} (${a.verbas.filter(v => v.tipo === 'Reflexo').length} reflexos)`);
      console.log(`     cp=compor_principal | oc=#ocorrências no XML | Σdev=total devido do XML`);
      let xmlDevTotal = 0, xmlDevComporPrincipal = 0, xmlDevNaoCompor = 0;
      for (let i = 0; i < a.verbas.length; i++) {
        const v = a.verbas[i];
        const cp = v.compor_principal || '—';
        const cpTag = cp === 'NAO_COMPOR' ? '[NC]' : (cp === 'COMPOR' ? '[C ]' : '[? ]');
        const dev = v.total_devido || 0;
        xmlDevTotal += dev;
        if (cp === 'NAO_COMPOR') xmlDevNaoCompor += dev;
        else xmlDevComporPrincipal += dev;
        if (i < 40) {
          console.log(`    ${String(i + 1).padStart(2)} | ${cpTag} ${pad(v.nome.slice(0, 50), 52)} | ${pad(v.tipo, 9)} | ${pad(v.caracteristica, 14)} | oc=${String(v.ocorrencias_count).padStart(3)} | Σdev=${padL(dev, 12)}`);
        }
      }
      if (a.verbas.length > 40) console.log(`    ... +${a.verbas.length - 40} verbas`);
      console.log(`  Σ devido (todas verbas XML): ${fmt(xmlDevTotal)}  |  Σ compor: ${fmt(xmlDevComporPrincipal)}  |  Σ NAO_COMPOR: ${fmt(xmlDevNaoCompor)}`);

      // ── Multas & pensão ──
      console.log('');
      console.log(`  FGTS config: multa=${a.fgts_config?.multa_percentual ?? '—'}% sobre ${a.fgts_config?.multa_base ?? '—'}`);
      console.log(`  Pensão: ${a.pensao_alimenticia?.apurar ? `${a.pensao_alimenticia.percentual}% sobre ${a.pensao_alimenticia.base}` : 'não'}`);
      console.log(`  Contribuição social (com_correcao_trabalhista): ${a.cs_config?.com_correcao_trabalhista ?? 'não'}`);

      console.log('═══════════════════════════════════════════════════════════════════════════════');

      expect(v3.liquido_reclamante).toBeGreaterThan(0);
    });
  }
});
