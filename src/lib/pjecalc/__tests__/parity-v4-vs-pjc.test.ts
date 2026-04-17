/**
 * Paridade V4 — INSS proporcionalizado vs V3 vs 18 PJC reais.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import { PjeCalcEngineV4 } from '../engine-v4';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, SELIC_MENSAL, TR_ACUMULADO } from '../indices-fallback';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

const CORPUS_DIR = path.resolve(__dirname, '../../../../Arquivos PJC');

function buildIndicesDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  for (const [comp, valor] of Object.entries(SELIC_MENSAL).sort())
    rows.push({ indice: 'SELIC', competencia: comp + '-01', valor, acumulado: SELIC_ACUMULADO[comp] ?? 100 });
  for (const [comp, acum] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    rows.push({ indice: 'IPCA-E', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCAE', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCA', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
  for (const [comp, acum] of Object.entries(TR_ACUMULADO).sort())
    rows.push({ indice: 'TR', competencia: comp + '-01', valor: 0, acumulado: acum });
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

describe('Paridade V4 vs V3 vs PJC', () => {
  it('comparativo 18 casos', { timeout: 120000 }, () => {
    if (!fs.existsSync(CORPUS_DIR)) return;
    const files = fs.readdirSync(CORPUS_DIR).filter(f => f.endsWith('.PJC')).sort();
    const rows: string[] = [];
    rows.push('  #  | Cálculo | PJe-Calc       | V3             | V4             | Δ V3    | Δ V4    | ');
    let v3AbsSum = 0, v4AbsSum = 0, cnt = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const calcId = file.match(/CALCULO_(\d+)/)?.[1] ?? '????';
      try {
        const xml = fs.readFileSync(path.join(CORPUS_DIR, file), 'utf8');
        const analysis = analyzePJC(xml);
        const pjcLiq = analysis.resultado.liquido_exequente;
        if (pjcLiq <= 0) { rows.push(`  ${String(i+1).padStart(2)} | ${calcId}   | N/A`); continue; }

        const inputs = convertPjcToEngineInputs(analysis, `v4-${file}`);
        inputs.params.modo_calculo = 'independent';
        if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;
        inputs.correcaoConfig.gt_closure = undefined;
        inputs.correcaoConfig.apuracao_juros_gt = undefined;
        if ((inputs.csConfig as any).apuracao_juros_gt) (inputs.csConfig as any).apuracao_juros_gt = undefined;

        const args = [
          inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
          inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
          inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
          inputs.custasConfig, inputs.seguroConfig, INDICES, FAIXAS,
        ] as const;

        const r3 = new PjeCalcEngineV3(...args).liquidar();
        const r4 = new PjeCalcEngineV4(...args).liquidar();
        const d3 = (r3.resumo.liquido_reclamante - pjcLiq) / pjcLiq * 100;
        const d4 = (r4.resumo.liquido_reclamante - pjcLiq) / pjcLiq * 100;
        const better = Math.abs(d4) < Math.abs(d3) ? '✅' : Math.abs(d4) > Math.abs(d3) ? '❌' : '—';
        v3AbsSum += Math.abs(d3); v4AbsSum += Math.abs(d4); cnt++;

        const f = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(14);
        rows.push(`  ${String(i+1).padStart(2)} | ${calcId}   | ${f(pjcLiq)} | ${f(r3.resumo.liquido_reclamante)} | ${f(r4.resumo.liquido_reclamante)} | ${d3>=0?'+':''}${d3.toFixed(2).padStart(6)}% | ${d4>=0?'+':''}${d4.toFixed(2).padStart(6)}% | ${better}`);
      } catch (e) {
        rows.push(`  ${String(i+1).padStart(2)} | ${calcId}   | (erro: ${(e as Error).message?.slice(0,40)})`);
      }
    }
    rows.push(`  Δ abs médio: V3=${(cnt>0?v3AbsSum/cnt:0).toFixed(2)}%  V4=${(cnt>0?v4AbsSum/cnt:0).toFixed(2)}%  ${v4AbsSum<v3AbsSum?'V4 MELHOR ✅':'V3 melhor'}`);
    console.log('\n' + rows.join('\n') + '\n');
    expect(true).toBe(true);
  });
});
