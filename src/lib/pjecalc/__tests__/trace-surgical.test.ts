/**
 * @vitest-environment jsdom
 *
 * TRACE CIRÚRGICO — Comparação PJC vs Engine per-verba per-competência
 * Para identificar EXATAMENTE onde o delta de +30% aparece.
 */
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 60_000 });

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngine } from '../engine';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';

const SELIC: Record<number, number[]> = {
  2015:[0.94,0.82,1.04,0.95,0.99,1.07,1.18,1.11,1.11,1.11,1.06,1.16],
  2016:[1.06,1.00,1.16,1.06,1.11,1.16,1.11,1.22,1.11,1.05,1.04,1.12],
  2017:[1.09,0.87,1.05,0.79,0.93,0.81,0.80,0.80,0.64,0.64,0.57,0.54],
  2018:[0.58,0.47,0.53,0.52,0.52,0.52,0.54,0.57,0.47,0.54,0.49,0.49],
  2019:[0.54,0.49,0.47,0.52,0.54,0.47,0.57,0.50,0.46,0.48,0.38,0.37],
  2020:[0.38,0.29,0.34,0.28,0.24,0.21,0.19,0.16,0.16,0.16,0.15,0.16],
  2021:[0.15,0.13,0.20,0.21,0.27,0.31,0.36,0.43,0.44,0.49,0.59,0.77],
  2022:[0.73,0.76,0.93,0.83,1.03,1.02,1.03,1.17,1.07,1.02,1.02,1.12],
  2023:[1.12,0.92,1.17,0.92,1.12,1.07,1.07,1.14,0.97,1.00,0.92,0.89],
  2024:[0.97,0.80,0.83,0.89,0.83,0.79,0.91,0.87,0.84,0.93,0.79,0.93],
  2025:[1.01,0.99,0.96,1.06,1.14,1.10,1.28,1.16,1.22,1.28,1.05,1.22],
};
const IPCAE: Record<number, number[]> = {
  2015:[0.89,1.33,1.24,1.07,0.60,0.99,0.59,0.43,0.39,0.66,0.85,1.18],
  2016:[0.92,1.42,0.43,0.51,0.86,0.40,0.54,0.45,0.23,0.19,0.26,0.19],
  2017:[0.31,0.54,0.15,0.21,0.24,0.16,-0.18,0.35,0.11,0.34,0.32,0.35],
  2018:[0.39,0.38,0.10,0.21,0.14,1.11,0.64,0.13,0.09,0.58,0.19,-0.16],
  2019:[0.30,0.34,0.54,0.72,0.35,0.06,0.09,0.08,0.09,0.09,0.14,1.05],
  2020:[0.71,0.22,0.02,-0.01,-0.59,0.02,0.30,0.23,0.45,0.94,0.81,1.06],
  2021:[0.78,0.48,0.93,0.60,0.44,0.83,0.72,0.89,1.14,1.20,1.17,0.78],
  2022:[0.58,0.99,0.95,1.73,0.59,0.69,0.13,-0.73,-0.37,0.16,0.53,0.52],
  2023:[0.55,0.76,0.69,0.57,0.51,0.04,-0.07,0.28,0.35,0.21,0.33,0.40],
  2024:[0.31,0.78,0.36,0.21,0.44,0.39,0.30,0.19,0.13,0.54,0.62,0.34],
  2025:[0.11,1.23,0.64,0.43,0.36,0.26,0.33,-0.14,0.48,0.18,0.20,0.25],
};
function buildDB(): PjeIndiceRow[] {
  const r: PjeIndiceRow[] = [];
  function b(n: string, rt: Record<number, number[]>, a: string[] = []) {
    let ac = 100;
    for (const y of Object.keys(rt).map(Number).sort())
      for (let m = 0; m < 12; m++) {
        ac *= (1 + rt[y][m] / 100); ac = Math.round(ac * 1e8) / 1e8;
        const c = `${y}-${String(m+1).padStart(2,'0')}-01`;
        r.push({indice:n,competencia:c,valor:rt[y][m],acumulado:ac});
        for (const al of a) r.push({indice:al,competencia:c,valor:rt[y][m],acumulado:ac});
      }
  }
  b('SELIC',SELIC); b('IPCA-E',IPCAE,['IPCAE','IPCA']);
  return r;
}
function buildINSS(): PjeINSSFaixaRow[] {
  const f: PjeINSSFaixaRow[] = [];
  const add = (i:string,e:string|null,b:[number,number][]) => b.forEach(([v,a],idx) => f.push({competencia_inicio:i,competencia_fim:e,faixa:idx+1,valor_ate:v,aliquota:a}));
  add('2019-01-01','2019-12-01',[[1751.81,0.08],[2919.72,0.09],[5839.45,0.11]]);
  add('2020-01-01','2020-02-01',[[1830.29,0.08],[3050.52,0.09],[6101.06,0.11]]);
  add('2020-03-01','2020-12-01',[[1045.00,0.075],[2089.60,0.09],[3134.40,0.12],[6101.06,0.14]]);
  add('2021-01-01','2021-12-01',[[1100.00,0.075],[2203.48,0.09],[3305.22,0.12],[6433.57,0.14]]);
  add('2022-01-01','2022-12-01',[[1212.00,0.075],[2427.35,0.09],[3641.03,0.12],[7087.22,0.14]]);
  add('2023-01-01','2023-12-01',[[1320.00,0.075],[2571.29,0.09],[3856.94,0.12],[7507.49,0.14]]);
  add('2024-01-01','2024-12-01',[[1412.00,0.075],[2666.68,0.09],[4000.03,0.12],[7786.02,0.14]]);
  add('2025-01-01',null,[[1518.00,0.075],[2793.88,0.09],[4190.83,0.12],[8157.41,0.14]]);
  return f;
}
const INDICES = buildDB();
const FAIXAS = buildINSS();
const REPORTS = path.resolve(__dirname, '../../../../public/reports');

function readPjc(f: string): string {
  const p = path.join(REPORTS, f);
  const buf = fs.readFileSync(p);
  if (buf[0]===0x50 && buf[1]===0x4b) {
    try { return execSync(`unzip -p "${p}"`,{maxBuffer:50*1024*1024,encoding:'utf-8'}); }
    catch { return buf.toString('latin1'); }
  }
  const t = buf.toString('utf-8');
  return (t.includes('<?xml')||t.includes('<Calculo')) ? t : buf.toString('latin1');
}

describe('TRACE CIRÚRGICO — PJC vs Engine per-verba', () => {
  // Test 2 cases: TIAGO (low delta) and CARLA (high delta)
  for (const file of ['tiago-jose.pjc', 'carla-pego.pjc']) {
    it(`[TRACE] ${file}`, () => {
      const xml = readPjc(file);
      const analysis = analyzePJC(xml);
      const inputs = convertPjcToEngineInputs(analysis, `trace-${file}`);

      // BLIND mode — strip GT
      inputs.params.modo_calculo = 'independent';
      inputs.correcaoConfig.gt_closure = undefined;
      inputs.correcaoConfig.apuracao_juros_gt = undefined;
      if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
      if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;
      if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;

      const engine = new PjeCalcEngine(
        inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
        inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
        inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
        inputs.custasConfig, inputs.seguroConfig, INDICES, FAIXAS,
        [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
        inputs.pensaoConfig, inputs.salarioFamiliaConfig,
      );
      const result = engine.liquidar();

      // Find first verba with >= 3 occurrences
      const verba = result.verbas.find(v => v.ocorrencias.length >= 3 && v.total_diferenca > 0);
      if (!verba) {
        console.log(`  [${file}] No verba with >= 3 occs found`);
        return;
      }

      // Find corresponding PJC precomputed data
      const pjcVerba = inputs.verbas.find(v => v.id === verba.verba_id);
      const pjcPrecomp = pjcVerba?.ocorrencias_precomputadas;

      console.log(`\n${'═'.repeat(100)}`);
      console.log(`  TRACE: ${file} — VERBA: ${verba.nome}`);
      console.log(`  Engine ocorrências: ${verba.ocorrencias.length} | PJC precomputed: ${pjcPrecomp?.length || 0}`);
      console.log(`${'═'.repeat(100)}`);

      console.log(`\n  ${'Comp'.padEnd(8)} | ${'PJC devido'.padStart(12)} ${'Eng devido'.padStart(12)} ${'Δ%'.padStart(8)} | ${'PJC fator'.padStart(10)} ${'Eng fator'.padStart(10)} ${'Δ%'.padStart(8)} | ${'PJC final'.padStart(12)} ${'Eng final'.padStart(12)} ${'Δ%'.padStart(8)}`);
      console.log(`  ${'─'.repeat(96)}`);

      for (let i = 0; i < Math.min(verba.ocorrencias.length, 6); i++) {
        const eng = verba.ocorrencias[i];
        const pjc = pjcPrecomp?.[i];

        const pjcDevido = pjc?.devido ?? 0;
        const engDevido = eng.devido;
        const dDevido = pjcDevido > 0 ? ((engDevido - pjcDevido) / pjcDevido * 100).toFixed(1) : 'N/A';

        const pjcFator = pjc?.indice_acumulado ?? 0;
        const engFator = eng.indice_correcao ?? 1;
        const dFator = pjcFator > 0 ? ((engFator - pjcFator) / pjcFator * 100).toFixed(1) : 'N/A';

        const pjcFinal = pjcDevido > 0 && pjcFator > 0 ? pjcDevido * pjcFator : pjcDevido;
        const engFinal = eng.valor_final;
        const dFinal = pjcFinal > 0 ? ((engFinal - pjcFinal) / pjcFinal * 100).toFixed(1) : 'N/A';

        console.log(
          `  ${eng.competencia.padEnd(8)} | ${pjcDevido.toFixed(2).padStart(12)} ${engDevido.toFixed(2).padStart(12)} ${String(dDevido).padStart(8)} | ${pjcFator.toFixed(6).padStart(10)} ${engFator.toFixed(6).padStart(10)} ${String(dFator).padStart(8)} | ${pjcFinal.toFixed(2).padStart(12)} ${engFinal.toFixed(2).padStart(12)} ${String(dFinal).padStart(8)}`
        );
      }

      // Summary
      const totalPJC = pjcPrecomp?.reduce((s, o) => s + (o.devido - (o.pago || 0)), 0) ?? 0;
      const totalEng = verba.total_diferenca;
      const totalFinalEng = verba.total_final;
      console.log(`\n  TOTAIS: PJC diferenca=${totalPJC.toFixed(2)} | Engine diferenca=${totalEng.toFixed(2)} | Delta=${totalPJC > 0 ? ((totalEng - totalPJC) / totalPJC * 100).toFixed(2) + '%' : 'N/A'}`);
      console.log(`  Engine total_final=${totalFinalEng.toFixed(2)} (com correção+juros)`);
      console.log(`  Ratio final/diferenca: ${totalEng > 0 ? (totalFinalEng / totalEng).toFixed(4) : 'N/A'}`);

      expect(result.resumo).toBeDefined();
    });
  }
});
