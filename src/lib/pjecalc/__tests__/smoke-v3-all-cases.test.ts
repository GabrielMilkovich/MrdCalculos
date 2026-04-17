/**
 * @vitest-environment jsdom
 *
 * Smoke test — roda os 18 casos .PJC pelos dois pipelines e produz tabela
 * comparativa PJC golden vs engine legado vs engine-v3 (core via Calculo.liquidar).
 *
 * Objetivo: avaliar se o core/ portado é consistentemente melhor que o legado.
 * Se sim, engine-v4 vale investimento. Se aleatório, falta mais porte no core.
 */
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 300_000 });

import * as fs from 'fs';
import * as path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngine } from '../engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, SELIC_MENSAL, TR_ACUMULADO } from '../indices-fallback';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

const CORPUS_DIR = path.resolve(__dirname, '../../../../Arquivos PJC');

function buildIndicesDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  for (const [comp, valor] of Object.entries(SELIC_MENSAL).sort()) {
    const acum = SELIC_ACUMULADO[comp] ?? 100;
    rows.push({ indice: 'SELIC', competencia: comp + '-01', valor, acumulado: acum });
  }
  for (const [comp, acum] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    rows.push({ indice: 'IPCA-E', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCAE', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCA', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
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

function readPjc(file: string): string {
  return fs.readFileSync(path.join(CORPUS_DIR, file)).toString('latin1');
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Resultado {
  calculo: string;
  beneficiario: string;
  pjc: number;
  legado: number;
  core: number;
  erroLegado?: string;
  erroCore?: string;
  deltaLegadoPct: number;
  deltaCorePct: number;
}

function rodar(file: string): Resultado {
  const r: Resultado = {
    calculo: file.match(/CALCULO_(\d+)/)?.[1] || '?',
    beneficiario: '',
    pjc: 0, legado: 0, core: 0,
    deltaLegadoPct: 0, deltaCorePct: 0,
  };

  const xml = readPjc(file);
  const analysis = analyzePJC(xml);
  r.beneficiario = (analysis.reclamante?.nome || '').trim().slice(0, 22) || '(sem nome)';
  r.pjc = analysis.resultado.liquido_exequente;

  if (r.pjc <= 0) {
    r.erroLegado = r.erroCore = 'PJC sem valor líquido';
    return r;
  }

  const inputs = convertPjcToEngineInputs(analysis, `corpus-${file}`);
  inputs.params.modo_calculo = 'independent';
  if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;
  inputs.correcaoConfig.gt_closure = undefined;
  inputs.correcaoConfig.apuracao_juros_gt = undefined;
  if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
  if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;

  // Legado
  try {
    const legado = new PjeCalcEngine(
      inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
      inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
      inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
      inputs.custasConfig, inputs.seguroConfig, INDICES_DB, FAIXAS_INSS,
      [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
      inputs.pensaoConfig, inputs.salarioFamiliaConfig,
    );
    r.legado = legado.liquidar().resumo.liquido_reclamante;
    r.deltaLegadoPct = ((r.legado - r.pjc) / r.pjc) * 100;
  } catch (e) {
    r.erroLegado = e instanceof Error ? e.message : String(e);
  }

  // Core via engine-v3
  try {
    const v3 = new PjeCalcEngineV3(
      inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
      inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
      inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
      inputs.custasConfig, inputs.seguroConfig, INDICES_DB, FAIXAS_INSS, [],
    );
    r.core = v3.liquidar().resumo.liquido_reclamante;
    r.deltaCorePct = ((r.core - r.pjc) / r.pjc) * 100;
  } catch (e) {
    r.erroCore = e instanceof Error ? `${e.name}: ${e.message.slice(0, 80)}` : String(e);
  }

  return r;
}

describe('Smoke — PJC vs Legado vs Core (engine-v3) — 18 casos', () => {
  it('roda todos os casos e imprime tabela comparativa', () => {
    const arquivos = fs.readdirSync(CORPUS_DIR)
      .filter(f => f.toUpperCase().endsWith('.PJC'))
      .sort();

    const resultados = arquivos.map(rodar);

    console.log('');
    console.log('══════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
    console.log('SMOKE COMPARATIVO — PJC vs Engine Legado vs Engine-v3 (Calculo.liquidar pipeline do core portado)');
    console.log('══════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  # | Cálculo | Beneficiário          | PJC (R$)         | Legado (R$)      | Core (R$)        | Δ Legado  | Δ Core    | Vencedor');
    console.log(' ───|─────────|───────────────────────|──────────────────|──────────────────|──────────────────|───────────|───────────|──────────');

    let coreVence = 0, legadoVence = 0, empate = 0, coreErro = 0, legadoErro = 0;
    let somaAbsLegado = 0, somaAbsCore = 0;
    const deltasLegado: number[] = [];
    const deltasCore: number[] = [];

    for (let i = 0; i < resultados.length; i++) {
      const r = resultados[i];
      const num = String(i + 1).padStart(2);
      const calc = r.calculo.padEnd(7);
      const benef = r.beneficiario.padEnd(21);
      const pjc = r.pjc > 0 ? fmt(r.pjc).padStart(16) : 'N/A'.padStart(16);
      const legado = r.erroLegado ? '(erro)'.padStart(16) : fmt(r.legado).padStart(16);
      const core = r.erroCore ? '(erro)'.padStart(16) : fmt(r.core).padStart(16);
      const dLeg = r.erroLegado ? 'ERRO'.padStart(9) : `${r.deltaLegadoPct >= 0 ? '+' : ''}${r.deltaLegadoPct.toFixed(2)}%`.padStart(9);
      const dCore = r.erroCore ? 'ERRO'.padStart(9) : `${r.deltaCorePct >= 0 ? '+' : ''}${r.deltaCorePct.toFixed(2)}%`.padStart(9);

      let vencedor = '—';
      if (!r.erroLegado && !r.erroCore) {
        const absL = Math.abs(r.deltaLegadoPct);
        const absC = Math.abs(r.deltaCorePct);
        if (absC < absL * 0.95) { vencedor = 'CORE'; coreVence++; }
        else if (absL < absC * 0.95) { vencedor = 'legado'; legadoVence++; }
        else { vencedor = 'empate'; empate++; }
        somaAbsLegado += absL;
        somaAbsCore += absC;
        deltasLegado.push(absL);
        deltasCore.push(absC);
      } else {
        if (r.erroLegado) { vencedor = 'CORE'; coreVence++; legadoErro++; }
        if (r.erroCore) { vencedor = 'legado'; legadoVence++; coreErro++; }
      }

      console.log(`  ${num} | ${calc} | ${benef} | ${pjc} | ${legado} | ${core} | ${dLeg} | ${dCore} | ${vencedor}`);
      if (r.erroCore) console.log(`      └─ core err: ${r.erroCore}`);
      if (r.erroLegado) console.log(`      └─ legado err: ${r.erroLegado}`);
    }

    const validos = resultados.length - Math.max(coreErro, legadoErro);
    const medLeg = deltasLegado.length > 0 ? deltasLegado.reduce((s, x) => s + x, 0) / deltasLegado.length : 0;
    const medCore = deltasCore.length > 0 ? deltasCore.reduce((s, x) => s + x, 0) / deltasCore.length : 0;

    console.log('');
    console.log('  ┌───────────────────────────────────────────────────────────────────────┐');
    console.log('  │                        ESTATÍSTICAS                                     │');
    console.log('  ├───────────────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total de casos:                 ${resultados.length}`);
    console.log(`  │  Core venceu legado (Δ menor):  ${coreVence}`);
    console.log(`  │  Legado venceu core:            ${legadoVence}`);
    console.log(`  │  Empate (Δ ≈ Δ, ±5%):           ${empate}`);
    console.log(`  │  Core lançou erro:              ${coreErro}`);
    console.log(`  │  Legado lançou erro:            ${legadoErro}`);
    console.log(`  │  |Δ| médio legado:              ${medLeg.toFixed(2)}%`);
    console.log(`  │  |Δ| médio core:                ${medCore.toFixed(2)}%`);
    console.log(`  │  Core reduz |Δ| médio em:       ${((medLeg - medCore) / medLeg * 100).toFixed(1)}%`);
    console.log('  └───────────────────────────────────────────────────────────────────────┘');
    console.log('');

    const veredicto = coreVence > legadoVence * 1.5
      ? '✅ CORE CONSISTENTEMENTE MELHOR — engine-v4 vale investimento'
      : coreVence > legadoVence
      ? '⚠️ CORE LIGEIRAMENTE MELHOR — engine-v4 promissor, mas precisa porte adicional'
      : coreVence === legadoVence
      ? '⚠️ EMPATE ESTATÍSTICO — precisa mais porte no core antes de engine-v4'
      : '❌ LEGADO MELHOR QUE CORE — core ainda tem lacunas grandes';
    console.log(`  VEREDICTO: ${veredicto}`);
    console.log('');

    expect(resultados.length).toBeGreaterThan(0);
  });
});
