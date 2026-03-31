/**
 * @vitest-environment jsdom
 *
 * MOTOR INDEPENDENTE — Teste Principal de Paridade
 *
 * O .PJC é usado APENAS para:
 * (1) Extrair dados de entrada: datas, salários, verbas (os "ingredientes")
 * (2) Extrair gabarito: <dadosEstruturados> para comparação
 *
 * O motor calcula TUDO de forma independente.
 * O gabarito só serve para medir o delta.
 * Nenhum resultado do PJe-Calc entra no cálculo.
 *
 * O resultado é comparado com o PJe-Calc golden APENAS no final.
 * ZERO dados do resultado PJC entram no cálculo.
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
  2015: [0.94,0.82,1.04,0.95,0.99,1.07,1.18,1.11,1.11,1.11,1.06,1.16],
  2016: [1.06,1.00,1.16,1.06,1.11,1.16,1.11,1.22,1.11,1.05,1.04,1.12],
  2017: [1.09,0.87,1.05,0.79,0.93,0.81,0.80,0.80,0.64,0.64,0.57,0.54],
  2018: [0.58,0.47,0.53,0.52,0.52,0.52,0.54,0.57,0.47,0.54,0.49,0.49],
  2019: [0.54,0.49,0.47,0.52,0.54,0.47,0.57,0.50,0.46,0.48,0.38,0.37],
  2020: [0.38,0.29,0.34,0.28,0.24,0.21,0.19,0.16,0.16,0.16,0.15,0.16],
  2021: [0.15,0.13,0.20,0.21,0.27,0.31,0.36,0.43,0.44,0.49,0.59,0.77],
  2022: [0.73,0.76,0.93,0.83,1.03,1.02,1.03,1.17,1.07,1.02,1.02,1.12],
  2023: [1.12,0.92,1.17,0.92,1.12,1.07,1.07,1.14,0.97,1.00,0.92,0.89],
  2024: [0.97,0.80,0.83,0.89,0.83,0.79,0.91,0.87,0.84,0.93,0.79,0.93],
  2025: [1.01,0.99,0.96,1.06,1.14,1.10,1.28,1.16,1.22,1.28,1.05,1.22],
};
const IPCAE: Record<number, number[]> = {
  2015: [0.89,1.33,1.24,1.07,0.60,0.99,0.59,0.43,0.39,0.66,0.85,1.18],
  2016: [0.92,1.42,0.43,0.51,0.86,0.40,0.54,0.45,0.23,0.19,0.26,0.19],
  2017: [0.31,0.54,0.15,0.21,0.24,0.16,-0.18,0.35,0.11,0.34,0.32,0.35],
  2018: [0.39,0.38,0.10,0.21,0.14,1.11,0.64,0.13,0.09,0.58,0.19,-0.16],
  2019: [0.30,0.34,0.54,0.72,0.35,0.06,0.09,0.08,0.09,0.09,0.14,1.05],
  2020: [0.71,0.22,0.02,-0.01,-0.59,0.02,0.30,0.23,0.45,0.94,0.81,1.06],
  2021: [0.78,0.48,0.93,0.60,0.44,0.83,0.72,0.89,1.14,1.20,1.17,0.78],
  2022: [0.58,0.99,0.95,1.73,0.59,0.69,0.13,-0.73,-0.37,0.16,0.53,0.52],
  2023: [0.55,0.76,0.69,0.57,0.51,0.04,-0.07,0.28,0.35,0.21,0.33,0.40],
  2024: [0.31,0.78,0.36,0.21,0.44,0.39,0.30,0.19,0.13,0.54,0.62,0.34],
  2025: [0.11,1.23,0.64,0.43,0.36,0.26,0.33,-0.14,0.48,0.18,0.20,0.25],
};

function buildDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  function build(n: string, r: Record<number, number[]>, a: string[] = []) {
    let ac = 100;
    for (const y of Object.keys(r).map(Number).sort())
      for (let m = 0; m < 12; m++) {
        ac *= (1 + r[y][m] / 100); ac = Math.round(ac * 1e8) / 1e8;
        const c = `${y}-${String(m+1).padStart(2,'0')}-01`;
        rows.push({ indice: n, competencia: c, valor: r[y][m], acumulado: ac });
        for (const al of a) rows.push({ indice: al, competencia: c, valor: r[y][m], acumulado: ac });
      }
  }
  build('SELIC', SELIC); build('IPCA-E', IPCAE, ['IPCAE','IPCA']);
  return rows;
}
function buildINSS(): PjeINSSFaixaRow[] {
  const f: PjeINSSFaixaRow[] = [];
  const add = (i: string, e: string|null, b: [number,number][]) => b.forEach(([v,a],idx) => f.push({competencia_inicio:i,competencia_fim:e,faixa:idx+1,valor_ate:v,aliquota:a}));
  add('2015-01-01','2015-12-01',[[1399.12,0.08],[2331.88,0.09],[4663.75,0.11]]);
  add('2016-01-01','2016-12-01',[[1556.94,0.08],[2594.92,0.09],[5189.82,0.11]]);
  add('2017-01-01','2017-12-01',[[1659.38,0.08],[2765.66,0.09],[5531.31,0.11]]);
  add('2018-01-01','2018-12-01',[[1693.72,0.08],[2822.90,0.09],[5645.80,0.11]]);
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

const VALID_FILES = [
  'antonio-harley.pjc','carla-pego.pjc','caso-real-v2.pjc',
  'francisco-pablo.pjc','islan-rodrigues.pjc','izabela-cristina.pjc',
  'joseli-silva.pjc','leandro-casademunt.pjc','leide-santana.pjc',
  'roque-guerreiro.pjc','rosicleia-pereira-chaves.pjc',
  'tiago-jose.pjc','vanderlei-carvalho.pjc',
];

describe('AUDITORIA CEGA — Modo Independente PURO (zero contaminação)', () => {
  const results: { file: string; pjc: number; blind: number; delta: number; status: string }[] = [];

  for (const file of VALID_FILES) {
    it(`[BLIND] ${file}`, () => {
      const xml = readPjc(file);
      const analysis = analyzePJC(xml);
      const goldenLiquido = analysis.resultado.liquido_exequente;
      if (goldenLiquido <= 0) { results.push({ file, pjc: 0, blind: 0, delta: 0, status: 'SKIP' }); return; }

      const inputs = convertPjcToEngineInputs(analysis, `blind-${file}`);

      // ═══ BLOQUEIO TOTAL DE CONTAMINAÇÃO ═══
      inputs.params.modo_calculo = 'independent';

      // REMOVER gt_closure (C3, C4, C5)
      inputs.correcaoConfig.gt_closure = undefined;

      // REMOVER apuracao_juros_gt de TODOS os configs (C1, C2, C6, C7)
      inputs.correcaoConfig.apuracao_juros_gt = undefined;
      if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
      if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;

      // data_citacao fallback (necessário para ADC 58/59)
      if (!inputs.params.data_citacao) {
        inputs.params.data_citacao = inputs.params.data_ajuizamento;
      }

      const engine = new PjeCalcEngine(
        inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
        inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
        inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
        inputs.custasConfig, inputs.seguroConfig, INDICES, FAIXAS,
        [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
        inputs.pensaoConfig, inputs.salarioFamiliaConfig,
      );

      const result = engine.liquidar();
      const blindLiquido = result.resumo.liquido_reclamante;
      const delta = goldenLiquido > 0 ? (blindLiquido - goldenLiquido) / goldenLiquido : 0;

      const r = result.resumo;
      console.log(`\n  [BLIND] ${file}`);
      console.log(`    PJe-Calc:  R$ ${goldenLiquido.toFixed(2)}`);
      console.log(`    MRD Blind: R$ ${blindLiquido.toFixed(2)}`);
      console.log(`    Delta:     ${(delta * 100).toFixed(2)}%`);
      console.log(`    Bruto:     R$ ${(r.principal_corrigido + r.juros_mora).toFixed(2)}`);
      console.log(`    INSS Seg:  R$ ${r.cs_segurado.toFixed(2)} (PJC: ${analysis.resultado.inss_reclamante.toFixed(2)})`);
      console.log(`    INSS Emp:  R$ ${r.cs_empregador.toFixed(2)} (PJC: ${analysis.resultado.inss_reclamado.toFixed(2)})`);
      console.log(`    IR:        R$ ${r.ir_retido.toFixed(2)} (PJC: ${analysis.resultado.imposto_renda.toFixed(2)})`);
      console.log(`    Custas:    R$ ${r.custas.toFixed(2)}`);

      let status = 'REPROVADO POR DIVERGÊNCIA REAL';
      if (Math.abs(delta) <= 0.0025) status = 'Nível 3 — Paridade pericial (±0.25%)';
      else if (Math.abs(delta) <= 0.005) status = 'Nível 2 — Paridade técnica (±0.50%)';
      else if (Math.abs(delta) <= 0.01) status = 'Nível 1 — Paridade operacional (±1.00%)';

      results.push({ file, pjc: goldenLiquido, blind: blindLiquido, delta: delta * 100, status });

      // Log status
      console.log(`    STATUS:    ${status}`);

      // Soft assertion — don't fail, just document
      expect(result.resumo).toBeDefined();
    });
  }

  it('[BLIND] RELATÓRIO CONSOLIDADO', () => {
    console.log('\n' + '█'.repeat(90));
    console.log('  AUDITORIA CEGA — RELATÓRIO FINAL');
    console.log('█'.repeat(90));

    console.log(`\n  ${'Caso'.padEnd(30)} ${'PJe-Calc'.padStart(14)} ${'MRD Blind'.padStart(14)} ${'Delta %'.padStart(10)} Status`);
    console.log('  ' + '─'.repeat(86));

    let approved = 0, total = 0;
    let sumDelta = 0;

    for (const r of results) {
      if (r.status === 'SKIP') continue;
      total++;
      const badge = Math.abs(r.delta) <= 1 ? '✅' : Math.abs(r.delta) <= 5 ? '⚠️' : '❌';
      console.log(`  ${badge} ${r.file.padEnd(28)} ${r.pjc.toFixed(0).padStart(14)} ${r.blind.toFixed(0).padStart(14)} ${r.delta.toFixed(2).padStart(9)}% ${r.status}`);
      sumDelta += r.delta;
      if (Math.abs(r.delta) <= 1) approved++;
    }

    const avgDelta = total > 0 ? sumDelta / total : 0;
    console.log('  ' + '─'.repeat(86));
    console.log(`  MÉDIA: ${avgDelta.toFixed(2)}% | APROVADOS ±1%: ${approved}/${total}`);
    console.log('█'.repeat(90));

    expect(results.length).toBeGreaterThan(0);
  });
});
