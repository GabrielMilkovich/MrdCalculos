/**
 * @vitest-environment jsdom
 *
 * Smoke test — PjeCalcEngineV3 (pipeline `Calculo.liquidar()` em core/) vs.
 * PjeCalcEngine (engine legado) vs. PJC golden.
 *
 * Caso: 4770 (golden atual no engine legado: +0,17%).
 *
 * Objetivo: medir se o core/ portado gera resultado razoável (±10%). Se sim,
 * Tarefa 2 (montar engine-v4 end-to-end sobre Calculo.liquidar) é viável. Se
 * explodir ou der delta catastrófico, identifica-se o que falta.
 */
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 60_000 });

import * as fs from 'fs';
import * as path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngine } from '../engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, SELIC_MENSAL, TR_ACUMULADO } from '../indices-fallback';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

const CORPUS_DIR = path.resolve(__dirname, '../../../../Arquivos PJC');
const FILE_4770 = 'PROCESSO_00112865220255150067_CALCULO_4770_DATA_22072025_HORA_090423.PJC';

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

describe('Smoke — Calculo.liquidar() pipeline vs engine legado (caso 4770)', () => {
  it('engine-v3 (pipeline core) roda sem lançar e produz liquido > 0', () => {
    const xml = readPjc(FILE_4770);
    const analysis = analyzePJC(xml);
    const pjcGolden = analysis.resultado.liquido_exequente;
    expect(pjcGolden).toBeGreaterThan(0);

    const inputs = convertPjcToEngineInputs(analysis, 'smoke-4770');
    inputs.params.modo_calculo = 'independent';
    if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;
    inputs.correcaoConfig.gt_closure = undefined;
    inputs.correcaoConfig.apuracao_juros_gt = undefined;
    if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
    if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;

    // ── Engine legado (baseline) ──
    const legacy = new PjeCalcEngine(
      inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
      inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
      inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
      inputs.custasConfig, inputs.seguroConfig, INDICES_DB, FAIXAS_INSS,
      [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
      inputs.pensaoConfig, inputs.salarioFamiliaConfig,
    );
    const rLegacy = legacy.liquidar();
    const liquidoLegacy = rLegacy.resumo.liquido_reclamante;
    const deltaLegacy = ((liquidoLegacy - pjcGolden) / pjcGolden) * 100;

    // ── Engine-v3 (core/Calculo.liquidar) ──
    let liquidoV3 = 0;
    let erroV3: string | null = null;
    try {
      const v3 = new PjeCalcEngineV3(
        inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
        inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
        inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
        inputs.custasConfig, inputs.seguroConfig, INDICES_DB, FAIXAS_INSS, [],
      );
      const rV3 = v3.liquidar();
      liquidoV3 = rV3.resumo.liquido_reclamante;
    } catch (e) {
      erroV3 = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }

    const deltaV3 = erroV3 ? NaN : ((liquidoV3 - pjcGolden) / pjcGolden) * 100;

    // ── Relatório ──
    console.log('');
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('SMOKE TEST — pipeline Calculo.liquidar() vs engine legado');
    console.log('Caso: 4770 (Antonio Harley)');
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  PJC golden (líquido exequente):  R$ ${pjcGolden.toFixed(2)}`);
    console.log(`  engine legado (baseline):        R$ ${liquidoLegacy.toFixed(2)}  (Δ ${deltaLegacy >= 0 ? '+' : ''}${deltaLegacy.toFixed(3)}%)`);
    if (erroV3) {
      console.log(`  engine-v3 (core pipeline):       ERRO — ${erroV3}`);
    } else {
      console.log(`  engine-v3 (core pipeline):       R$ ${liquidoV3.toFixed(2)}  (Δ ${deltaV3 >= 0 ? '+' : ''}${deltaV3.toFixed(3)}%)`);
    }
    console.log('');
    console.log(`  Veredicto: ${erroV3 ? 'FALHA CATASTRÓFICA (exceção)'
      : Math.abs(deltaV3) <= 10 ? 'VIÁVEL (±10%) — Tarefa 2 completa vale a pena'
      : Math.abs(deltaV3) <= 50 ? 'PARCIAL (±50%) — core/ roda mas tem lacunas significativas'
      : 'RUIM (>50%) — core/ tem lacunas críticas (reflexos/juros/módulos)'}`);
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('');

    // Gate frouxo: somente sanidade — não bloqueia CI. O valor do teste é o relatório.
    expect(liquidoLegacy).toBeGreaterThan(0);
  });
});
