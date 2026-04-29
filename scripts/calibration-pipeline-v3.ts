/**
 * =====================================================
 * PIPELINE DE CALIBRAÇÃO — V3 (core portado)
 * =====================================================
 * Idêntico a calibration-pipeline.ts exceto pela instanciação:
 * usa PjeCalcEngineV3 (ativo em produção) em vez de PjeCalcEngine
 * (V1 legado em _legacy/).
 *
 * Uso:
 *   npm run calibrate:v3
 *   npm run calibrate:v3 -- --dir ./pjc-corpus
 *
 * Produz relatório JSON: calibration-v3-YYYY-MM-DD.json
 * (nome diferente do calibrate V1 para não sobrescrever).
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
  const { PjeCalcEngineV3 } = await import('../src/lib/pjecalc/engine-v3.js');
  const { IPCA_E_ACUMULADO, SELIC_ACUMULADO } = await import('../src/lib/pjecalc/indices-fallback.js');
  return { analyzePJC, convertPjcToEngineInputs, PjeCalcEngineV3, IPCA_E_ACUMULADO, SELIC_ACUMULADO };
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

  const { analyzePJC, convertPjcToEngineInputs, PjeCalcEngineV3, IPCA_E_ACUMULADO, SELIC_ACUMULADO } = await loadEngine();
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
      // Sprint 3 (2026-04-29): distinguir "PJC sem oracle <gprec>" de "erro real".
      // PJCs em estado intermediário (verbas configuradas mas oracle não gerado pelo
      // Java ainda) nao tem <gprec>. Antes eram contados como erro, distorcendo metrica.
      const hasOracle = xml.includes('<gprec>');
      if (!hasOracle) {
        console.log('SEM_ORACLE (sem <gprec>)');
        casos.push({ arquivo: nome, nome, pjc_liquido: 0, pjc_inss: 0, pjc_ir: 0, pjc_bruto: 0, eng_liquido: 0, eng_inss: 0, eng_ir: 0, eng_bruto: 0, delta_liquido: 0, delta_inss: 0, delta_ir: 0, delta_bruto: 0, regime: 'SEM_ORACLE', periodo_meses: 0, aprovado_5pct: false, aprovado_10pct: false, aprovado_20pct: false, erro: 'sem_oracle' });
        continue;
      }
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

      const engine = new PjeCalcEngineV3(
        inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
        inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
        inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
        inputs.custasConfig, inputs.seguroConfig, INDICES, FAIXAS,
        [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
        inputs.pensaoConfig, inputs.salarioFamiliaConfig,
      );
      // D2 (2026-04-26): overrides do PJC só ativados via env USE_PJC_OVERRIDES.
      // Default: motor autônomo (sem trapaças). Overrides servem como ferramenta
      // de validação/diagnóstico — NÃO devem fechar gap em produção.
      if (process.env.USE_PJC_OVERRIDES === '1') {
        engine.setInssReclamanteCorrigidoPorCompetencia(inputs.inssReclamanteCorrigidoPorCompetencia);
        engine.setInssTaxaJurosPorCompetencia(inputs.inssTaxaJurosPorCompetencia);
        engine.setIrTotalPjcOverride(inputs.irTotalPjc);
      }

      const result = engine.liquidar();
      const r = result.resumo;
      const pjc_inss = analysis.resultado.inss_reclamante;
      const pjc_ir = analysis.resultado.imposto_renda;
      // Comparação BRUTO vs BRUTO (Sprint 4 fix, 2026-04-27):
      // Java BRUTO = LE + INSS_seg_NOMINAL + IR
      //   onde INSS_seg_NOMINAL = Σ cs_normal+cs_13 das apuracao_juros (não corrigido)
      // Engine: total_reclamada = principalCorrigido + jurosMora + fgts (= bruto Java)
      let inssNominal = 0;
      for (const it of (analysis.apuracao_juros || [])) {
        inssNominal += (it.cs_normal || 0) + (it.cs_13 || 0);
      }
      const pjc_bruto = pjc_liq + (inssNominal > 0 ? inssNominal : pjc_inss) + pjc_ir;
      const eng_bruto = r.total_reclamada;

      const dl_bruto = calcDelta(eng_bruto, pjc_bruto);
      const dl_le = calcDelta(r.total_reclamada, pjc_liq); // legado
      const dl = dl_bruto; // métrica primária = bruto vs bruto
      const badge = Math.abs(dl) <= 1 ? '✅' : Math.abs(dl) <= 5 ? '⚠️' : '❌';

      const adm = analysis.parametros?.admissao || '';
      const dem = analysis.parametros?.demissao || '';
      const [aA, mA] = (adm.slice(0, 7) || '2020-01').split('-').map(Number);
      const [aD, mD] = (dem.slice(0, 7) || '2024-01').split('-').map(Number);
      const periodo = (aD - aA) * 12 + (mD - mA) + 1;
      const regime = dem.slice(0, 7) <= '2021-11' ? 'PRE_ADC58' : adm.slice(0, 7) >= '2021-11' ? 'POS_ADC58' : 'TRANSICAO';
      console.log(`${badge} bruto=${dl_bruto > 0 ? '+' : ''}${dl_bruto.toFixed(2)}% | LE=${dl_le > 0 ? '+' : ''}${dl_le.toFixed(2)}% | IR:${calcDelta(r.ir_retido, pjc_ir) > 0 ? '+' : ''}${calcDelta(r.ir_retido, pjc_ir).toFixed(1)}% | INSS:${calcDelta(r.cs_segurado, pjc_inss) > 0 ? '+' : ''}${calcDelta(r.cs_segurado, pjc_inss).toFixed(1)}% | ${regime} | ${periodo}m | PJC:R${pjc_liq.toFixed(0)}`);

      // === DIAGNOSTIC BLOCK (Prompt 17) ===
      const irDelta = calcDelta(r.ir_retido, pjc_ir);
      const inssDelta = calcDelta(r.cs_segurado, pjc_inss);
      const isDebugCase = Math.abs(irDelta) > 100 || Math.abs(dl) > 30 || Math.abs(inssDelta) > 30;
      if (isDebugCase) {
        const verbaResults = result.detalhes?.verbaResults || result.verbas || [];
        const totalOcs = verbaResults.reduce((s: number, vr: any) => s + (vr.ocorrencias?.length || 0), 0);
        const ocsComDiferenca = verbaResults.reduce((s: number, vr: any) => s + (vr.ocorrencias?.filter((oc: any) => oc.diferenca > 0).length || 0), 0);
        console.log('[DIAG] caso:', nome.slice(0, 40));
        console.log('[DIAG]   regime:', regime, 'periodo:', periodo, 'meses');
        console.log('[DIAG]   bruto: PJC=R$' + pjc_bruto.toFixed(0) + ' ENG=R$' + eng_bruto.toFixed(0) + ' delta=' + dl_bruto.toFixed(2) + '%');
        console.log('[DIAG]   LE: PJC=R$' + pjc_liq.toFixed(0) + ' ENG_tr=R$' + r.total_reclamada.toFixed(0) + ' delta=' + dl_le.toFixed(2) + '% (legado)');
        console.log('[DIAG]   inss: PJC=R$' + pjc_inss.toFixed(0) + ' ENG=R$' + r.cs_segurado.toFixed(0) + ' delta=' + inssDelta.toFixed(1) + '%');
        console.log('[DIAG]   ir: PJC=R$' + pjc_ir.toFixed(0) + ' ENG=R$' + r.ir_retido.toFixed(0) + ' delta=' + irDelta.toFixed(1) + '%');
        // INSS-DEBUG: Show GT data for INSS diagnosis
        const gtEntries: { cs_normal?: number; cs_base_normal?: number }[] = analysis.apuracao_juros || [];
        const gtCSNormalTotal = gtEntries.reduce((s, e) => s + (e.cs_normal || 0), 0);
        const gtCSBaseTotal = gtEntries.reduce((s, e) => s + (e.cs_base_normal || 0), 0);
        const hasPrecomputedCS = gtEntries.some(e => (e.cs_normal || 0) > 0);
        console.log('[INSS-DEBUG] hasPrecomputed=' + hasPrecomputedCS + ' cs_normal_total=' + gtCSNormalTotal.toFixed(0) + ' cs_base_normal_total=' + gtCSBaseTotal.toFixed(0) + ' eng_inss=' + r.cs_segurado.toFixed(0));
        console.log('[DIAG]   irConfig.apurar:', inputs.irConfig.apurar, 'csConfig.apurar:', inputs.csConfig.apurar_segurado);
        console.log('[DIAG]   irConfig.incidir_sobre_juros:', inputs.irConfig.incidir_sobre_juros);
        console.log('[DIAG]   irConfig.dependentes:', inputs.irConfig.dependentes);
        console.log('[DIAG]   csConfig.base_cs_segurado:', inputs.csConfig.base_cs_segurado);
        console.log('[DIAG]   total ocorrencias:', totalOcs, '| com diferenca>0:', ocsComDiferenca);
        console.log('[DIAG]   mesesRRA from result:', result.ir?.meses_rra, 'irMetodo:', result.ir?.metodo);
        console.log('[DIAG]   admissao:', analysis.parametros?.admissao, 'demissao:', analysis.parametros?.demissao);
        console.log('[DIAG]   data_liquidacao:', inputs.correcaoConfig.data_liquidacao);
        console.log('[DIAG]   combinacoes_indice:', JSON.stringify(inputs.correcaoConfig.combinacoes_indice?.slice(0,3)));
      }
      // === END DIAGNOSTIC ===

      casos.push({
        arquivo: nome, nome: analysis.parametros?.beneficiario || nome,
        pjc_liquido: pjc_liq, pjc_inss, pjc_ir, pjc_bruto,
        eng_liquido: r.liquido_reclamante, eng_inss: r.cs_segurado, eng_ir: r.ir_retido,
        eng_bruto,
        // delta_liquido = comparação pré-deduções (semanticamente correta — total_reclamada vs liquidoExequente)
        delta_liquido: dl, delta_inss: calcDelta(r.cs_segurado, pjc_inss),
        delta_ir: calcDelta(r.ir_retido, pjc_ir), delta_bruto: calcDelta(eng_bruto, pjc_bruto),
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
  const semOracle = casos.filter(c => c.erro === 'sem_oracle');
  const erros = casos.filter(c => c.erro && c.erro !== 'sem_oracle' && c.erro !== 'líquido=0');
  const n = validos.length || 1;
  const deltas = validos.map(c => c.delta_liquido);
  const avg = deltas.reduce((a, b) => a + b, 0) / n;
  const aprov5 = validos.filter(c => c.aprovado_5pct).length;
  const aprov10 = validos.filter(c => c.aprovado_10pct).length;

  console.log('\n' + '═'.repeat(60));
  console.log('  RELATÓRIO DE CALIBRAÇÃO V3 — MODO INDEPENDENTE');
  console.log('═'.repeat(60));
  console.log(`  Total: ${casos.length} | Válidos: ${validos.length} | Sem oracle: ${semOracle.length} | Erros: ${erros.length}`);
  console.log(`  ±5%:  ${aprov5}/${n} (${((aprov5 / n) * 100).toFixed(0)}%)`);
  console.log(`  ±10%: ${aprov10}/${n} (${((aprov10 / n) * 100).toFixed(0)}%)`);
  console.log(`  Média: ${avg > 0 ? '+' : ''}${avg.toFixed(2)}%`);
  console.log('═'.repeat(60));

  // Save JSON
  const outPath = path.join(__dirname, `../calibration-v3-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ data: new Date().toISOString(), casos, avg, aprov5, aprov10, n }, null, 2));
  console.log(`\nRelatório salvo: ${outPath}`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
