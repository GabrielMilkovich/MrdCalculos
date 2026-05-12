/**
 * @vitest-environment jsdom
 *
 * Parity Test — Engine V3 (core portado 1:1) vs 18 PJC reais
 *
 * Usa PjeCalcEngineV3 (baseado no core/ portado do PJe-Calc v2.15.1)
 * em vez do engine legado.
 */
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 60_000 });

import * as fs from 'fs';
import * as path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, SELIC_MENSAL, TR_ACUMULADO } from '../indices-fallback';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

// AUDIT #20 (2026-05-12): antes apontava para `../../../../Arquivos PJC`
// que não está versionado — quando ausente, o teste passava trivialmente
// com `expect(true).toBe(true)` (linha 117). O "94% paridade" no
// STATE-OF-PRODUCTION era teatro num corpus inexistente para qualquer
// máquina que não a do dev original.
//
// Agora aponta primeiro para `public/reports/` (14 PJCs versionados no
// repo), com fallback para `../../../../Arquivos PJC` caso o dev tenha
// um corpus maior local. Se NEM um nem outro existirem, o teste FALHA
// EXPLICITAMENTE (em vez de passar trivialmente).
const CORPUS_VERSIONED = path.resolve(__dirname, '../../../../public/reports');
const CORPUS_LOCAL = path.resolve(__dirname, '../../../../Arquivos PJC');
const CORPUS_DIR = fs.existsSync(CORPUS_VERSIONED) ? CORPUS_VERSIONED : CORPUS_LOCAL;

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

function readPjc(file: string): string {
  return fs.readFileSync(path.join(CORPUS_DIR, file), 'latin1');
}

interface Resultado {
  file: string;
  calculo: string;
  pjc_liquido: number;
  mrd_liquido: number;
  delta_pct: number;
  erro?: string;
}

function rodarCaso(file: string): Resultado {
  const result: Resultado = {
    file, calculo: file.match(/CALCULO_(\d+)/)?.[1] || '?',
    pjc_liquido: 0, mrd_liquido: 0, delta_pct: 0,
  };
  try {
    const xml = readPjc(file);
    const analysis = analyzePJC(xml);
    result.pjc_liquido = analysis.resultado.liquido_exequente;
    if (result.pjc_liquido <= 0) { result.erro = 'PJC sem valor líquido'; return result; }

    const inputs = convertPjcToEngineInputs(analysis, `v3-${file}`);
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
    result.mrd_liquido = r.resumo.liquido_reclamante;
    result.delta_pct = (result.mrd_liquido - result.pjc_liquido) / result.pjc_liquido * 100;
  } catch (e) {
    result.erro = e instanceof Error ? e.message : String(e);
  }
  return result;
}

describe('Paridade V3 — Engine Core vs PJC reais', () => {
  const arquivos = fs.existsSync(CORPUS_DIR)
    ? fs.readdirSync(CORPUS_DIR).filter(f => f.toLowerCase().endsWith('.pjc')).sort()
    : [];

  if (arquivos.length === 0) {
    // AUDIT #20: era `expect(true).toBe(true)` — passava silenciosamente
    // sem corpus. Agora falha loud: o teste de paridade É a confirmação
    // do "94%" no STATE-OF-PRODUCTION; sem corpus, não há confirmação.
    it('corpus PJC AUSENTE — teste de paridade não pode rodar', () => {
      throw new Error(
        `Corpus PJC não encontrado em ${CORPUS_VERSIONED} nem em ${CORPUS_LOCAL}. ` +
        `O teste de paridade depende de PJCs reais para validar o engine V3 — ` +
        `sem ele, o número "94% paridade" no STATE-OF-PRODUCTION é teatro. ` +
        `Copie ao menos 1 .pjc para public/reports/.`,
      );
    });
    return;
  }

  const resultados: Resultado[] = [];

  for (const arq of arquivos) {
    it(`V3 ${arq.replace(/^PROCESSO_/, '').slice(0, 50)}...`, () => {
      const r = rodarCaso(arq);
      resultados.push(r);
      if (!r.erro && r.pjc_liquido > 0) {
        expect(Math.abs(r.delta_pct)).toBeLessThan(500);
      }
    });
  }

  it('relatório V3 consolidado', () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('PARIDADE V3 (core portado 1:1) vs PJe-Calc (18 casos reais)');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  #  | Cálculo | PJe-Calc (R$)      | MRD V3 (R$)        | Delta %   | Status');
    console.log('  ───|─────────|─────────────────────|─────────────────────|───────────|────────');

    let ap10 = 0, ap5 = 0, ap1 = 0, erros = 0;
    let totalPjc = 0, totalMrd = 0;
    const deltas: number[] = [];

    for (let i = 0; i < resultados.length; i++) {
      const r = resultados[i];
      const status = r.erro ? 'ERRO'
        : Math.abs(r.delta_pct) <= 1 ? 'GOLDEN'
        : Math.abs(r.delta_pct) <= 5 ? 'APROV5%'
        : Math.abs(r.delta_pct) <= 10 ? 'APROV10%'
        : 'REPROV';
      if (r.erro) erros++;
      else {
        if (Math.abs(r.delta_pct) <= 1) ap1++;
        if (Math.abs(r.delta_pct) <= 5) ap5++;
        if (Math.abs(r.delta_pct) <= 10) ap10++;
        totalPjc += r.pjc_liquido;
        totalMrd += r.mrd_liquido;
        deltas.push(r.delta_pct);
      }
      const pjc = r.pjc_liquido > 0 ? fmt(r.pjc_liquido).padStart(18) : 'N/A'.padStart(18);
      const mrd = r.erro ? '(erro)'.padStart(18) : fmt(r.mrd_liquido).padStart(18);
      const delta = r.erro ? '   --' : `${r.delta_pct >= 0 ? '+' : ''}${r.delta_pct.toFixed(2)}%`.padStart(9);
      console.log(`  ${String(i + 1).padStart(2)} | ${r.calculo.padEnd(7)} | ${pjc} | ${mrd} | ${delta} | ${status}`);
    }

    const validos = resultados.length - erros;
    const mediaAbs = deltas.length > 0 ? deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length : 0;
    const deltaGlobal = totalPjc > 0 ? ((totalMrd - totalPjc) / totalPjc) * 100 : 0;

    console.log('  ───|─────────|─────────────────────|─────────────────────|───────────|────────');
    console.log(`  APROV ≤1%:  ${ap1}/${validos}  |  APROV ≤5%:  ${ap5}/${validos}  |  APROV ≤10%:  ${ap10}/${validos}`);
    console.log(`  Delta médio abs: ${mediaAbs.toFixed(2)}%  |  Delta global: ${deltaGlobal >= 0 ? '+' : ''}${deltaGlobal.toFixed(2)}%`);
    console.log(`  PJe-Calc total: R$ ${fmt(totalPjc)}  |  MRD V3 total: R$ ${fmt(totalMrd)}`);
    console.log('═══════════════════════════════════════════════════════════════════════════');
    expect(resultados.length).toBeGreaterThan(0);

    // AUDIT #20: além do "não-explosão" (<500%) por caso, agregado honesto:
    // de todos os casos que rodaram, exigir que pelo menos 50% estejam em
    // APROV≤5%. Isso protege contra regressão silenciosa onde TODOS os
    // casos passam pelo gate `<500` individualmente mas o sistema todo
    // está fora de paridade. Para falhar:
    //   - >50% dos casos válidos precisariam estar acima de 5% de delta
    //   - OU mais de 30% dos casos teriam erro de execução
    if (validos > 0) {
      const taxaAprov5 = ap5 / validos;
      const taxaErro = erros / resultados.length;
      expect(
        taxaAprov5,
        `Apenas ${ap5}/${validos} casos (${(taxaAprov5 * 100).toFixed(0)}%) em APROV≤5%. ` +
        `Limiar mínimo de paridade: 50%. Engine V3 fora de paridade com o corpus.`,
      ).toBeGreaterThanOrEqual(0.5);
      // Taxa de erro mais frouxa porque os erros vêm do parser PJC
      // (pjc-analyzer / pjc-to-engine), não do engine de cálculo em si.
      // Threshold 50%: protege contra regressão grande do parser sem
      // fazer um caso novo de fixture broken quebrar o CI imediatamente.
      // Quando o parser PJC for endurecido, baixar este número.
      expect(
        taxaErro,
        `${erros}/${resultados.length} casos com erro de execução (${(taxaErro * 100).toFixed(0)}%). ` +
        `Limiar máximo aceitável: 50% (limitação do parser PJC, não do engine).`,
      ).toBeLessThan(0.5);
    }
  });
});
