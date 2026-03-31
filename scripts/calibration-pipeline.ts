/**
 * =====================================================
 * PIPELINE DE CALIBRAÇÃO EM MASSA — Modo Independente
 * =====================================================
 * Processa N arquivos .PJC no modo 100% independente
 * e mede delta vs gabarito XML do PJe-Calc.
 *
 * Uso:
 *   npm run calibrate
 *   npm run calibrate -- --dir ./pjc-corpus
 * =====================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports for ESM compatibility
async function loadEngine() {
  const { analyzePJC } = await import('../src/lib/pjecalc/pjc-analyzer.js');
  const { convertPjcToEngineInputs } = await import('../src/lib/pjecalc/pjc-to-engine.js');
  const { PjeCalcEngine } = await import('../src/lib/pjecalc/engine.js');
  const { IPCA_E_ACUMULADO, SELIC_ACUMULADO } = await import('../src/lib/pjecalc/indices-fallback.js');
  return { analyzePJC, convertPjcToEngineInputs, PjeCalcEngine, IPCA_E_ACUMULADO, SELIC_ACUMULADO };
}

interface ResultadoCaso {
  arquivo: string;
  nome: string;
  pjc_liquido: number;
  pjc_inss: number;
  pjc_ir: number;
  pjc_bruto: number;
  eng_liquido: number;
  eng_inss: number;
  eng_ir: number;
  eng_bruto: number;
  delta_liquido: number;
  delta_inss: number;
  delta_ir: number;
  delta_bruto: number;
  regime: string;
  periodo_meses: number;
  aprovado_5pct: boolean;
  aprovado_10pct: boolean;
  aprovado_20pct: boolean;
  erro?: string;
}

function calcDelta(eng: number, pjc: number): number {
  if (pjc === 0) return 0;
  return ((eng - pjc) / pjc) * 100;
}

function readPjc(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    try { return execSync(`unzip -p "${filePath}"`, { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' }); }
    catch { return buf.toString('latin1'); }
  }
  const t = buf.toString('utf-8');
  return (t.includes('<?xml') || t.includes('<Calculo')) ? t : buf.toString('latin1');
}

// Build indices from fallback
function buildIndicesDB(IPCA_E: Record<string, number>, SELIC_A: Record<string, number>) {
  const rows: { indice: string; competencia: string; valor: number; acumulado: number }[] = [];
  for (const [ym, ac] of Object.entries(IPCA_E)) {
    rows.push({ indice: 'IPCA-E', competencia: ym + '-01', valor: 0, acumulado: ac });
    rows.push({ indice: 'IPCAE', competencia: ym + '-01', valor: 0, acumulado: ac });
    rows.push({ indice: 'IPCA', competencia: ym + '-01', valor: 0, acumulado: ac });
  }
  for (const [ym, ac] of Object.entries(SELIC_A)) {
    rows.push({ indice: 'SELIC', competencia: ym + '-01', valor: 0, acumulado: ac });
  }
  return rows;
}

function buildINSS() {
  const f: { competencia_inicio: string; competencia_fim: string | null; faixa: number; valor_ate: number; aliquota: number }[] = [];
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

async function main() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--dir');
  const searchDirs = dirIdx >= 0 ? [args[dirIdx + 1]] : [
    path.join(__dirname, '../pjc-corpus'),
    path.join(__dirname, '../public/reports'),
    path.join(__dirname, '..'),
  ];

  let pjcFiles: string[] = [];
  for (const d of searchDirs) {
    if (!fs.existsSync(d)) continue;
    const found = fs.readdirSync(d)
      .filter(f => f.toLowerCase().endsWith('.pjc'))
      .map(f => path.join(d, f));
    if (found.length > 0) { pjcFiles = found; console.log(`\nFound ${found.length} .PJC files in: ${d}`); break; }
  }

  if (pjcFiles.length === 0) {
    console.error('\n❌ No .PJC files found.');
    console.error('Create ./pjc-corpus/ and add PJC files, or use: npm run calibrate -- --dir /path');
    process.exit(1);
  }

  console.log('Mode: INDEPENDENT (no GT, no PJC result data)\n');

  const { analyzePJC, convertPjcToEngineInputs, PjeCalcEngine, IPCA_E_ACUMULADO, SELIC_ACUMULADO } = await loadEngine();
  const INDICES = buildIndicesDB(IPCA_E_ACUMULADO, SELIC_ACUMULADO);
  const FAIXAS = buildINSS();

  const casos: ResultadoCaso[] = [];

  for (let i = 0; i < pjcFiles.length; i++) {
    const arq = pjcFiles[i];
    const nome = path.basename(arq);
    process.stdout.write(`[${i + 1}/${pjcFiles.length}] ${nome.slice(0, 50).padEnd(50)} `);

    try {
      const xml = readPjc(arq);
      const analysis = analyzePJC(xml);
      const pjc_liq = analysis.resultado?.liquido_exequente ?? 0;
      if (pjc_liq <= 0) {
        console.log('SKIP (líquido=0)');
        casos.push({ arquivo: nome, nome, pjc_liquido: 0, pjc_inss: 0, pjc_ir: 0, pjc_bruto: 0, eng_liquido: 0, eng_inss: 0, eng_ir: 0, eng_bruto: 0, delta_liquido: 0, delta_inss: 0, delta_ir: 0, delta_bruto: 0, regime: 'SKIP', periodo_meses: 0, aprovado_5pct: false, aprovado_10pct: false, aprovado_20pct: false, erro: 'líquido=0' });
        continue;
      }

      const inputs = convertPjcToEngineInputs(analysis, `cal-${nome}`);
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
      const r = result.resumo;
      const pjc_inss = analysis.resultado.inss_reclamante;
      const pjc_ir = analysis.resultado.imposto_renda;
      const pjc_bruto = pjc_liq + pjc_inss + pjc_ir;

      const dl = calcDelta(r.liquido_reclamante, pjc_liq);
      const badge = Math.abs(dl) <= 5 ? '✅' : Math.abs(dl) <= 10 ? '⚠️' : '❌';
      console.log(`${badge} ${dl > 0 ? '+' : ''}${dl.toFixed(2)}%`);

      const adm = analysis.parametros?.admissao || '';
      const dem = analysis.parametros?.demissao || '';
      const [aA, mA] = (adm.slice(0, 7) || '2020-01').split('-').map(Number);
      const [aD, mD] = (dem.slice(0, 7) || '2024-01').split('-').map(Number);
      const periodo = (aD - aA) * 12 + (mD - mA) + 1;
      const regime = dem.slice(0, 7) <= '2021-11' ? 'PRE_ADC58' : adm.slice(0, 7) >= '2021-11' ? 'POS_ADC58' : 'TRANSICAO';

      casos.push({
        arquivo: nome, nome: analysis.parametros?.beneficiario || nome,
        pjc_liquido: pjc_liq, pjc_inss, pjc_ir, pjc_bruto,
        eng_liquido: r.liquido_reclamante, eng_inss: r.cs_segurado, eng_ir: r.ir_retido,
        eng_bruto: r.liquido_reclamante + r.cs_segurado + r.ir_retido,
        delta_liquido: dl, delta_inss: calcDelta(r.cs_segurado, pjc_inss),
        delta_ir: calcDelta(r.ir_retido, pjc_ir), delta_bruto: calcDelta(r.liquido_reclamante + r.cs_segurado + r.ir_retido, pjc_bruto),
        regime, periodo_meses: periodo,
        aprovado_5pct: Math.abs(dl) <= 5, aprovado_10pct: Math.abs(dl) <= 10, aprovado_20pct: Math.abs(dl) <= 20,
      });
    } catch (err) {
      console.log(`❌ ERROR: ${(err as Error).message.slice(0, 60)}`);
      casos.push({ arquivo: nome, nome, pjc_liquido: 0, pjc_inss: 0, pjc_ir: 0, pjc_bruto: 0, eng_liquido: 0, eng_inss: 0, eng_ir: 0, eng_bruto: 0, delta_liquido: 0, delta_inss: 0, delta_ir: 0, delta_bruto: 0, regime: 'ERRO', periodo_meses: 0, aprovado_5pct: false, aprovado_10pct: false, aprovado_20pct: false, erro: (err as Error).message });
    }
  }

  // Summary
  const validos = casos.filter(c => !c.erro && c.pjc_liquido > 0);
  const n = validos.length || 1;
  const deltas = validos.map(c => c.delta_liquido);
  const avg = deltas.reduce((a, b) => a + b, 0) / n;
  const aprov5 = validos.filter(c => c.aprovado_5pct).length;
  const aprov10 = validos.filter(c => c.aprovado_10pct).length;

  console.log('\n' + '═'.repeat(60));
  console.log('  RELATÓRIO DE CALIBRAÇÃO — MODO INDEPENDENTE');
  console.log('═'.repeat(60));
  console.log(`  Total: ${casos.length} | Válidos: ${validos.length} | Erros: ${casos.length - validos.length}`);
  console.log(`  ±5%:  ${aprov5}/${n} (${((aprov5 / n) * 100).toFixed(0)}%)`);
  console.log(`  ±10%: ${aprov10}/${n} (${((aprov10 / n) * 100).toFixed(0)}%)`);
  console.log(`  Média: ${avg > 0 ? '+' : ''}${avg.toFixed(2)}%`);
  console.log('═'.repeat(60));

  // Save JSON
  const outPath = path.join(__dirname, `../calibration-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ data: new Date().toISOString(), casos, avg, aprov5, aprov10, n }, null, 2));
  console.log(`\nRelatório salvo: ${outPath}`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
