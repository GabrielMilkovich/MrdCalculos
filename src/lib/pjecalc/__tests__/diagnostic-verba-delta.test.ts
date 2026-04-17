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
import { PjeCalcEngineV3 } from '../engine-v3';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

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

      // Run INDEPENDENT mode (only mode supported)
      const inputsI = convertPjcToEngineInputs(analysis, 'independent');
      inputsI.params.modo_calculo = 'independent';
      if (inputsI.correcaoConfig.gt_closure) inputsI.correcaoConfig.gt_closure = undefined;
      if (inputsI.correcaoConfig.apuracao_juros_gt) inputsI.correcaoConfig.apuracao_juros_gt = undefined;
      if ((inputsI.csConfig as Record<string, unknown>).apuracao_juros_gt) (inputsI.csConfig as Record<string, unknown>).apuracao_juros_gt = undefined;
      if ((inputsI.irConfig as Record<string, unknown>).apuracao_juros_gt) (inputsI.irConfig as Record<string, unknown>).apuracao_juros_gt = undefined;
      if (!inputsI.params.data_citacao) inputsI.params.data_citacao = inputsI.params.data_ajuizamento;

      const engineI = new PjeCalcEngineV3(inputsI.params, inputsI.historicos, inputsI.faltas, inputsI.ferias, inputsI.verbas, inputsI.cartaoPonto, inputsI.fgtsConfig, inputsI.csConfig, inputsI.irConfig, inputsI.correcaoConfig, inputsI.honorariosConfig, inputsI.custasConfig, inputsI.seguroConfig, INDICES_DB, FAIXAS_INSS, [], inputsI.excecoesCargas || [], [], inputsI.prevPrivadaConfig, inputsI.pensaoConfig, inputsI.salarioFamiliaConfig);
      const resultI = engineI.liquidar();

      console.log(`\n${'═'.repeat(100)}`);
      console.log(`  DIAGNOSTIC: ${analysis.parametros.beneficiario} (${file})`);
      console.log(`  Independent liquido: ${resultI.resumo.liquido_reclamante.toFixed(2)}`);
      console.log(`  PJC Golden liquido: ${analysis.resultado.liquido_exequente.toFixed(2)}`);
      console.log(`${'═'.repeat(100)}`);

      // List verbas
      console.log(`\n  ${'Verba'.padEnd(40)} ${'Indp.Final'.padStart(14)}`);
      console.log(`  ${'─'.repeat(56)}`);

      let totalIndependent = 0;

      for (const vrI of resultI.verbas) {
        const iFinal = vrI.total_final;
        totalIndependent += iFinal;

        if (Math.abs(iFinal) > 1) {
          const shortName = vrI.nome.length > 38 ? vrI.nome.substring(0, 35) + '...' : vrI.nome;
          console.log(`  ${shortName.padEnd(40)} ${iFinal.toFixed(2).padStart(14)}`);
        }
      }

      console.log(`  ${'─'.repeat(56)}`);
      console.log(`  ${'TOTAL VERBAS'.padEnd(40)} ${totalIndependent.toFixed(2).padStart(14)}`);

      expect(resultI.resumo).toBeDefined();
    });
  }
});
