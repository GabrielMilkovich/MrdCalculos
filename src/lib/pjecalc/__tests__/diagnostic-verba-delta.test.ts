/**
 * @vitest-environment jsdom
 *
 * DIAGNOSTIC: Per-verba delta breakdown for a single case.
 * Identifies which verbas drive the divergence in independent mode.
 */
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 60_000 });

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import Decimal from 'decimal.js';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngine } from '../engine';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

const SELIC_MONTHLY: Record<number, number[]> = {
  2015: [0.94, 0.82, 1.04, 0.95, 0.99, 1.07, 1.18, 1.11, 1.11, 1.11, 1.06, 1.16],
  2016: [1.06, 1.00, 1.16, 1.06, 1.11, 1.16, 1.11, 1.21, 1.11, 1.05, 1.04, 1.12],
  2017: [1.09, 0.87, 1.05, 0.79, 0.93, 0.81, 0.80, 0.80, 0.64, 0.64, 0.57, 0.54],
  2018: [0.58, 0.46, 0.53, 0.52, 0.52, 0.51, 0.54, 0.57, 0.47, 0.54, 0.50, 0.49],
  2019: [0.54, 0.49, 0.47, 0.52, 0.54, 0.47, 0.57, 0.50, 0.46, 0.48, 0.38, 0.37],
  2020: [0.38, 0.29, 0.34, 0.28, 0.24, 0.21, 0.19, 0.16, 0.16, 0.16, 0.15, 0.16],
  2021: [0.15, 0.13, 0.20, 0.21, 0.25, 0.31, 0.36, 0.43, 0.44, 0.49, 0.59, 0.77],
  2022: [0.73, 0.76, 0.93, 0.83, 1.03, 1.02, 1.03, 1.17, 1.07, 1.02, 1.02, 1.12],
  2023: [1.12, 0.92, 1.17, 0.92, 1.12, 1.07, 1.07, 1.14, 0.97, 1.00, 0.92, 0.89],
  2024: [0.97, 0.80, 0.83, 0.89, 0.83, 0.79, 0.91, 0.87, 0.84, 0.93, 0.79, 0.93],
  2025: [1.06, 0.99, 0.96, 1.06, 1.06, 1.07, 1.04, 0.97, 0.93, 0.93, 0.93, 0.93],
};
const IPCAE_MONTHLY: Record<number, number[]> = {
  2015: [1.33, 0.77, 1.15, 1.07, 0.56, 0.80, 0.62, 0.43, 0.39, 0.52, 0.85, 0.96],
  2016: [1.27, 0.95, 0.43, 0.52, 0.78, 0.40, 0.54, 0.37, 0.20, 0.47, 0.26, 0.33],
  2017: [0.31, 0.24, 0.30, 0.21, 0.25, -0.09, 0.10, 0.28, 0.10, 0.37, 0.18, 0.27],
  2018: [0.30, 0.33, 0.10, 0.10, 0.37, 1.11, 0.33, -0.08, 0.33, 0.48, 0.02, 0.30],
  2019: [0.32, 0.54, 0.55, 0.72, 0.35, 0.01, 0.09, 0.08, -0.04, 0.09, 0.08, 0.89],
  2020: [0.21, 0.17, 0.02, -0.05, -0.13, 0.23, 0.36, 0.45, 0.45, 0.94, 0.81, 1.06],
  2021: [0.27, 0.86, 0.93, 0.44, 0.44, 0.83, 1.14, 0.96, 1.14, 1.16, 1.17, 0.34],
  2022: [0.58, 0.99, 1.62, 1.73, 0.49, 0.65, -0.68, -0.36, -0.29, 0.59, 0.53, 0.62],
  2023: [0.55, 0.75, 0.69, 0.51, 0.04, -0.10, -0.07, 0.04, 0.16, 0.30, 0.29, 0.34],
  2024: [0.42, 0.78, 0.36, 0.31, 0.44, 0.39, 0.01, -0.14, 0.13, 0.54, 0.62, 0.34],
  2025: [0.11, 1.23, 0.64, 0.43, 0.36, 0.24, 0.24, 0.24, 0.24, 0.24, 0.24, 0.24],
};

function buildIndicesDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  function build(name: string, rates: Record<number, number[]>, aliases: string[] = []) {
    let acum = 100.0;
    for (const year of Object.keys(rates).map(Number).sort()) {
      for (let m = 0; m < 12; m++) {
        acum = acum * (1 + rates[year][m] / 100);
        const comp = `${year}-${String(m + 1).padStart(2, '0')}-01`;
        const acumR = Math.round(acum * 1e8) / 1e8;
        rows.push({ indice: name, competencia: comp, valor: rates[year][m], acumulado: acumR });
        for (const a of aliases) rows.push({ indice: a, competencia: comp, valor: rates[year][m], acumulado: acumR });
      }
    }
  }
  build('SELIC', SELIC_MONTHLY);
  build('IPCA-E', IPCAE_MONTHLY, ['IPCAE', 'IPCA']);
  return rows;
}
const INDICES_DB = buildIndicesDB();

function buildFaixasINSS(): PjeINSSFaixaRow[] {
  const f: PjeINSSFaixaRow[] = [];
  const add = (i: string, e: string | null, b: [number, number][]) => b.forEach(([v, a], idx) => f.push({ competencia_inicio: i, competencia_fim: e, faixa: idx + 1, valor_ate: v, aliquota: a }));
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
const FAIXAS_INSS = buildFaixasINSS();

const REPORTS_DIR = path.resolve(__dirname, '../../../../public/reports');

function readPjcXml(filename: string): string {
  const filePath = path.join(REPORTS_DIR, filename);
  const buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    try { return execSync(`unzip -p "${filePath}"`, { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' }); }
    catch { return buffer.toString('latin1'); }
  }
  const text = buffer.toString('utf-8');
  return (text.includes('<?xml') || text.includes('<Calculo')) ? text : buffer.toString('latin1');
}

// ─── Diagnostic: compare assisted vs independent per-verba ───

describe('DIAGNOSTIC: Per-verba delta breakdown', () => {
  // Test 3 cases: one low delta, one high delta, one medium
  const cases = ['antonio-harley.pjc', 'izabela-cristina.pjc', 'tiago-jose.pjc'];

  for (const file of cases) {
    it(`Per-verba comparison: ${file}`, () => {
      const xml = readPjcXml(file);
      const analysis = analyzePJC(xml);

      // Run ASSISTED mode
      const inputsA = convertPjcToEngineInputs(analysis, 'assisted');
      inputsA.params.modo_calculo = 'assisted_from_pjc';
      const engineA = new PjeCalcEngine(inputsA.params, inputsA.historicos, inputsA.faltas, inputsA.ferias, inputsA.verbas, inputsA.cartaoPonto, inputsA.fgtsConfig, inputsA.csConfig, inputsA.irConfig, inputsA.correcaoConfig, inputsA.honorariosConfig, inputsA.custasConfig, inputsA.seguroConfig, INDICES_DB, FAIXAS_INSS, [], inputsA.excecoesCargas || [], [], inputsA.prevPrivadaConfig, inputsA.pensaoConfig, inputsA.salarioFamiliaConfig);
      const resultA = engineA.liquidar();

      // Run INDEPENDENT mode
      const inputsI = convertPjcToEngineInputs(analysis, 'independent');
      inputsI.params.modo_calculo = 'independent';
      inputsI.correcaoConfig.gt_closure = undefined;
      inputsI.correcaoConfig.apuracao_juros_gt = undefined;
      if (inputsI.csConfig.apuracao_juros_gt) inputsI.csConfig.apuracao_juros_gt = undefined;
      if (inputsI.irConfig.apuracao_juros_gt) inputsI.irConfig.apuracao_juros_gt = undefined;
      if (!inputsI.params.data_citacao) inputsI.params.data_citacao = inputsI.params.data_ajuizamento;

      const engineI = new PjeCalcEngine(inputsI.params, inputsI.historicos, inputsI.faltas, inputsI.ferias, inputsI.verbas, inputsI.cartaoPonto, inputsI.fgtsConfig, inputsI.csConfig, inputsI.irConfig, inputsI.correcaoConfig, inputsI.honorariosConfig, inputsI.custasConfig, inputsI.seguroConfig, INDICES_DB, FAIXAS_INSS, [], inputsI.excecoesCargas || [], [], inputsI.prevPrivadaConfig, inputsI.pensaoConfig, inputsI.salarioFamiliaConfig);
      const resultI = engineI.liquidar();

      console.log(`\n${'═'.repeat(100)}`);
      console.log(`  DIAGNOSTIC: ${analysis.parametros.beneficiario} (${file})`);
      console.log(`  Assisted liquido: ${resultA.resumo.liquido_reclamante.toFixed(2)}`);
      console.log(`  Independent liquido: ${resultI.resumo.liquido_reclamante.toFixed(2)}`);
      console.log(`  PJC Golden liquido: ${analysis.resultado.liquido_exequente.toFixed(2)}`);
      console.log(`${'═'.repeat(100)}`);

      // Compare verbas between modes
      console.log(`\n  ${'Verba'.padEnd(40)} ${'Asst.Final'.padStart(14)} ${'Indp.Final'.padStart(14)} ${'Delta'.padStart(14)} ${'HasPrecomp'.padStart(12)}`);
      console.log(`  ${'─'.repeat(96)}`);

      let totalAssisted = 0, totalIndependent = 0;

      for (const vrI of resultI.verbas) {
        const vrA = resultA.verbas.find(v => v.verba_id === vrI.verba_id);
        const aFinal = vrA?.total_final || 0;
        const iFinal = vrI.total_final;
        const delta = iFinal - aFinal;
        totalAssisted += aFinal;
        totalIndependent += iFinal;

        // Check if this verba had precomputed data
        const verba = inputsI.verbas.find(v => v.id === vrI.verba_id);
        const hasPrecomp = (verba?.ocorrencias_precomputadas?.length || 0) > 0;

        if (Math.abs(delta) > 1) {
          const shortName = vrI.nome.length > 38 ? vrI.nome.substring(0, 35) + '...' : vrI.nome;
          console.log(
            `  ${shortName.padEnd(40)} ${aFinal.toFixed(2).padStart(14)} ${iFinal.toFixed(2).padStart(14)} ${(delta >= 0 ? '+' : '') + delta.toFixed(2)}`.padEnd(84) + `${hasPrecomp ? 'YES' : 'NO ←←←'}`.padStart(12)
          );
        }
      }

      // Show verbas in assisted but not in independent
      for (const vrA of resultA.verbas) {
        if (!resultI.verbas.find(v => v.verba_id === vrA.verba_id) && vrA.total_final > 0) {
          console.log(`  ${'[MISSING IN INDEP] ' + vrA.nome}`.padEnd(40).substring(0, 40) + ` ${vrA.total_final.toFixed(2).padStart(14)} ${'N/A'.padStart(14)}`);
        }
      }

      console.log(`  ${'─'.repeat(96)}`);
      console.log(`  ${'TOTAL VERBAS'.padEnd(40)} ${totalAssisted.toFixed(2).padStart(14)} ${totalIndependent.toFixed(2).padStart(14)} ${((totalIndependent - totalAssisted >= 0 ? '+' : '') + (totalIndependent - totalAssisted).toFixed(2)).padStart(14)}`);

      // Per-occurrence breakdown for top divergent verba
      const sortedByDelta = resultI.verbas
        .map(vrI => {
          const vrA = resultA.verbas.find(v => v.verba_id === vrI.verba_id);
          return { vrI, vrA, delta: Math.abs(vrI.total_final - (vrA?.total_final || 0)) };
        })
        .sort((a, b) => b.delta - a.delta);

      if (sortedByDelta.length > 0 && sortedByDelta[0].delta > 10) {
        const top = sortedByDelta[0];
        console.log(`\n  TOP DIVERGENT VERBA: ${top.vrI.nome}`);
        console.log(`  ${'Comp'.padEnd(10)} ${'A.difer'.padStart(12)} ${'I.difer'.padStart(12)} ${'A.corrig'.padStart(12)} ${'I.corrig'.padStart(12)} ${'A.juros'.padStart(12)} ${'I.juros'.padStart(12)} ${'A.final'.padStart(12)} ${'I.final'.padStart(12)}`);
        for (let i = 0; i < Math.min(top.vrI.ocorrencias.length, 6); i++) {
          const ocI = top.vrI.ocorrencias[i];
          const ocA = top.vrA?.ocorrencias[i];
          console.log(
            `  ${ocI.competencia.padEnd(10)} ${(ocA?.diferenca || 0).toFixed(2).padStart(12)} ${ocI.diferenca.toFixed(2).padStart(12)} ${(ocA?.valor_corrigido || 0).toFixed(2).padStart(12)} ${ocI.valor_corrigido.toFixed(2).padStart(12)} ${(ocA?.juros || 0).toFixed(2).padStart(12)} ${ocI.juros.toFixed(2).padStart(12)} ${(ocA?.valor_final || 0).toFixed(2).padStart(12)} ${ocI.valor_final.toFixed(2).padStart(12)}`
          );
        }
        if (top.vrI.ocorrencias.length > 6) console.log(`  ... e mais ${top.vrI.ocorrencias.length - 6} ocorrências`);
      }

      expect(resultI.resumo).toBeDefined();
    });
  }
});
