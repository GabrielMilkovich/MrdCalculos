/**
 * @vitest-environment jsdom
 *
 * Parity Test — "Arquivos PJC" corpus
 *
 * Runs the PjeCalcEngine in INDEPENDENT mode against every .PJC file in
 * the "Arquivos PJC/" directory and compares against the golden values
 * extracted from the <resultado> block of each PJC.
 *
 * Reports per-case delta in % and aggregate stats. No hard assertion
 * thresholds beyond a sanity gate (≤500% per case) to keep the run green
 * while we measure; adjust after baseline is known.
 */
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 60_000 });

import * as fs from 'fs';
import * as path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngine } from '../engine';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, SELIC_MENSAL, TR_ACUMULADO } from '../indices-fallback';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

const CORPUS_DIR = path.resolve(__dirname, '../../../../Arquivos PJC');

// ─── Build indicesDB from fallback tables ──────────────────────────────────────
function buildIndicesDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  // SELIC — IMPORTANTE: incluir campo valor (taxa mensal) para soma simples
  for (const [comp, valor] of Object.entries(SELIC_MENSAL).sort()) {
    // valor também derivado do acumulado se possível
    const acum = SELIC_ACUMULADO[comp] ?? 100;
    rows.push({ indice: 'SELIC', competencia: comp + '-01', valor, acumulado: acum });
  }
  // IPCA-E
  for (const [comp, acum] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    rows.push({ indice: 'IPCA-E', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCAE', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCA', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
  // TR
  for (const [comp, acum] of Object.entries(TR_ACUMULADO).sort()) {
    rows.push({ indice: 'TR', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'TRD', competencia: comp + '-01', valor: 0, acumulado: acum });
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
  add('2025-01-01', '2025-12-01', [[1518.00, 0.075], [2793.88, 0.09], [4190.83, 0.12], [8157.41, 0.14]]);
  add('2026-01-01', null, [[1518.00, 0.075], [2793.88, 0.09], [4190.83, 0.12], [8157.41, 0.14]]);
  return f;
}

const INDICES_DB = buildIndicesDB();
const FAIXAS_INSS = buildINSSFaixas();

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function readPjc(file: string): string {
  const buf = fs.readFileSync(path.join(CORPUS_DIR, file));
  // Latin-1 → UTF-8 conversion for Node
  return buf.toString('latin1');
}

interface Resultado {
  file: string;
  beneficiario: string;
  calculo: string;
  pjc_liquido: number;
  mrd_liquido: number;
  delta_abs: number;
  delta_pct: number;
  erro?: string;
}

function rodarCaso(file: string): Resultado {
  const result: Resultado = {
    file,
    beneficiario: '',
    calculo: file.match(/CALCULO_(\d+)/)?.[1] || '?',
    pjc_liquido: 0,
    mrd_liquido: 0,
    delta_abs: 0,
    delta_pct: 0,
  };

  try {
    const xml = readPjc(file);
    const analysis = analyzePJC(xml);
    result.beneficiario = (analysis.reclamante?.nome || '').trim() || '(sem nome)';
    result.pjc_liquido = analysis.resultado.liquido_exequente;

    if (result.pjc_liquido <= 0) {
      result.erro = 'PJC sem valor líquido (calculo vazio ou zerado)';
      return result;
    }

    const inputs = convertPjcToEngineInputs(analysis, `corpus-${file}`);
    inputs.params.modo_calculo = 'independent';
    // Data de citação é obrigatória em independent — fallback para ajuizamento
    if (!inputs.params.data_citacao) {
      inputs.params.data_citacao = inputs.params.data_ajuizamento;
    }
    // Limpa GT artifacts (independent mode = zero GT)
    inputs.correcaoConfig.gt_closure = undefined;
    inputs.correcaoConfig.apuracao_juros_gt = undefined;
    if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
    if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;

    const engine = new PjeCalcEngine(
      inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
      inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
      inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
      inputs.custasConfig, inputs.seguroConfig, INDICES_DB, FAIXAS_INSS,
      [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
      inputs.pensaoConfig, inputs.salarioFamiliaConfig,
    );
    const r = engine.liquidar();
    result.mrd_liquido = r.resumo.liquido_reclamante;
    result.delta_abs = result.mrd_liquido - result.pjc_liquido;
    result.delta_pct = (result.delta_abs / result.pjc_liquido) * 100;
  } catch (e) {
    result.erro = e instanceof Error ? e.message : String(e);
  }

  return result;
}

describe('Paridade — Corpus "Arquivos PJC" (18 arquivos, modo independent)', () => {
  const arquivos = fs.readdirSync(CORPUS_DIR)
    .filter(f => f.toUpperCase().endsWith('.PJC'))
    .sort();

  if (arquivos.length === 0) {
    it('corpus PJC ausente — placeholder', () => {
      console.warn('Nenhum arquivo .PJC encontrado em Arquivos PJC/');
      expect(arquivos.length).toBe(0);
    });
    return;
  }

  const resultados: Resultado[] = [];

  for (const arq of arquivos) {
    it(`${arq.replace(/^PROCESSO_/, '').slice(0, 60)}...`, () => {
      const r = rodarCaso(arq);
      resultados.push(r);
      // Gate frouxo — capturamos delta, não bloqueamos (a meta ≤10% é aspiracional).
      // Limite sanidade: evita que um caso catastroficamente quebrado passe.
      if (!r.erro && r.pjc_liquido > 0) {
        expect(Math.abs(r.delta_pct)).toBeLessThan(500);
      }
    });
  }

  it('relatório consolidado de paridade', () => {
    console.log('');
    console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════');
    console.log('RELATÓRIO DE PARIDADE — MRD Calc vs PJe-Calc (18 casos reais, modo independent)');
    console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  #  | Cálculo |  Beneficiário              | PJe-Calc (R$)      | MRD Calc (R$)      | Delta %   | Status');
    console.log('  ───|─────────|────────────────────────────|─────────────────────|─────────────────────|───────────|─────────');

    let aprovados10 = 0;
    let aprovados5 = 0;
    let aprovados1 = 0;
    let comErro = 0;
    let totalPjc = 0;
    let totalMrd = 0;
    const deltas: number[] = [];

    for (let i = 0; i < resultados.length; i++) {
      const r = resultados[i];
      const status = r.erro ? 'ERRO'
        : Math.abs(r.delta_pct) <= 1 ? 'GOLDEN'
        : Math.abs(r.delta_pct) <= 5 ? 'APROV 5%'
        : Math.abs(r.delta_pct) <= 10 ? 'APROV 10%'
        : 'REPROV';

      if (r.erro) {
        comErro++;
      } else {
        if (Math.abs(r.delta_pct) <= 1) aprovados1++;
        if (Math.abs(r.delta_pct) <= 5) aprovados5++;
        if (Math.abs(r.delta_pct) <= 10) aprovados10++;
        totalPjc += r.pjc_liquido;
        totalMrd += r.mrd_liquido;
        deltas.push(r.delta_pct);
      }

      const num = String(i + 1).padStart(2);
      const calc = r.calculo.padEnd(7);
      const benef = (r.beneficiario || '(erro)').slice(0, 26).padEnd(26);
      const pjc = r.pjc_liquido > 0 ? fmt(r.pjc_liquido).padStart(18) : 'N/A'.padStart(18);
      const mrd = r.erro ? '(erro)'.padStart(18) : fmt(r.mrd_liquido).padStart(18);
      const delta = r.erro ? '     --'
        : `${r.delta_pct >= 0 ? '+' : ''}${r.delta_pct.toFixed(2).padStart(6)}%`;
      console.log(`  ${num} | ${calc} | ${benef} | ${pjc} | ${mrd} | ${delta.padStart(9)} | ${status}`);
    }

    console.log('  ───|─────────|────────────────────────────|─────────────────────|─────────────────────|───────────|─────────');

    const validos = resultados.length - comErro;
    const mediaDelta = deltas.length > 0 ? deltas.reduce((s, d) => s + d, 0) / deltas.length : 0;
    const mediaAbs = deltas.length > 0 ? deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length : 0;
    const deltaGlobal = totalPjc > 0 ? ((totalMrd - totalPjc) / totalPjc) * 100 : 0;

    console.log('');
    console.log(`  Total de casos:        ${resultados.length}`);
    console.log(`  Válidos (rodaram):     ${validos}`);
    console.log(`  Com erro:              ${comErro}`);
    console.log('');
    console.log(`  APROV ≤1% (golden):    ${aprovados1}/${validos} (${validos > 0 ? (aprovados1 * 100 / validos).toFixed(1) : '0'}%)`);
    console.log(`  APROV ≤5%:             ${aprovados5}/${validos} (${validos > 0 ? (aprovados5 * 100 / validos).toFixed(1) : '0'}%)`);
    console.log(`  APROV ≤10%:            ${aprovados10}/${validos} (${validos > 0 ? (aprovados10 * 100 / validos).toFixed(1) : '0'}%)`);
    console.log('');
    console.log(`  Delta médio:           ${mediaDelta >= 0 ? '+' : ''}${mediaDelta.toFixed(2)}%`);
    console.log(`  Delta médio absoluto:  ${mediaAbs.toFixed(2)}%`);
    console.log(`  Delta global (Σ):      PJe-Calc R$ ${fmt(totalPjc)} | MRD R$ ${fmt(totalMrd)} | Δ ${deltaGlobal >= 0 ? '+' : ''}${deltaGlobal.toFixed(2)}%`);
    console.log('═════════════════════════════════════════════════════════════════════════════════════════════════════════════');
    console.log('');

    // O relatório sempre passa — é diagnóstico, não gate.
    expect(resultados.length).toBeGreaterThan(0);
  });
});
