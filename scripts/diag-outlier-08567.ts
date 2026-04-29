// Sprint 2A — Diagnóstico instrumentado PROCESSO_00008567 (delta -11.24%)
// Objetivo: identificar EXATAMENTE qual segmento (correção monetária OU juros mora)
// gera o gap de R$ 9.947 entre engine TS e oracle Java.
//
// Estratégia:
//   1. Roda engine TS sobre o PJC com modo independente.
//   2. Lê <ApuracaoDeJuros> do PJC (oracle: valor_corrigido + taxa_juros por competência).
//   3. Soma valor_corrigido das ocorrências TS por competência.
//   4. Reconstrói "valor_corrigido oracle" e "juros oracle" por competência.
//   5. Imprime tabela comparando.
//
// Output: tabela competência × (eng_corrigido, oracle_corrigido, eng_juros, oracle_juros)
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

function readPjcXml(p: string): string {
  const buf = fs.readFileSync(p);
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    return execSync(`unzip -p "${p}"`, { encoding: 'utf-8', maxBuffer: 50_000_000 });
  }
  const t = buf.toString('utf-8');
  return (t.includes('<?xml') || t.includes('<Calculo')) ? t : buf.toString('latin1');
}

function buildINSSFaixas() {
  const f: any[] = [];
  const add = (i: string, e: string | null, b: [number, number][]) =>
    b.forEach(([v, a], idx) => f.push({
      competencia_inicio: i, competencia_fim: e, faixa: idx + 1, valor_ate: v, aliquota: a,
    }));
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

const PJC_PATH = '/home/user/MrdCalculos/docs/PROCESSO_00008567620255170005_CALCULO_4483_DATA_09072025_HORA_155016.PJC';

async function main() {
  const xml = readPjcXml(PJC_PATH);
  const { analyzePJC } = await import('/home/user/MrdCalculos/src/lib/pjecalc/pjc-analyzer.js');
  const { convertPjcToEngineInputs } = await import('/home/user/MrdCalculos/src/lib/pjecalc/pjc-to-engine.js');
  const { PjeCalcEngineV3 } = await import('/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.js');

  const a: any = analyzePJC(xml);
  const inputs = convertPjcToEngineInputs(a, 'diag-08567');
  inputs.params.modo_calculo = 'independent';
  if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
  if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;
  if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('PROCESSO_00008567 — DIAGNÓSTICO SPRINT 2A');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('Admissão:    ', inputs.params.data_admissao);
  console.log('Demissão:    ', inputs.params.data_demissao);
  console.log('Ajuizamento: ', inputs.params.data_ajuizamento);
  console.log('Liquidação:  ', inputs.correcaoConfig.data_liquidacao);
  console.log('Índice base: ', inputs.correcaoConfig.indice);
  console.log('combinacoes_indice:', JSON.stringify(inputs.correcaoConfig.combinacoes_indice));
  console.log('combinacoes_juros: ', JSON.stringify(inputs.correcaoConfig.combinacoes_juros));
  console.log('juros_inicio:      ', inputs.correcaoConfig.juros_inicio);
  console.log('juros_pre_judicial:', inputs.correcaoConfig.juros_pre_judicial);
  console.log('base_de_juros:     ', inputs.correcaoConfig.base_de_juros_das_verbas);
  console.log('═══════════════════════════════════════════════════════════════════════════');

  const engine = new PjeCalcEngineV3(
    inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
    inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
    inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
    inputs.custasConfig, inputs.seguroConfig, {} as any, buildINSSFaixas() as any,
    [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
    inputs.pensaoConfig, inputs.salarioFamiliaConfig,
  );
  const result: any = engine.liquidar();

  // Agrupar engine por competência, somando todas verbas
  const engPorComp = new Map<string, { dif: number; corrigido: number; juros: number; verbas: string[] }>();
  for (const v of (result.verbas || [])) {
    for (const oc of (v.ocorrencias || [])) {
      if (!oc.competencia) continue;
      const k = oc.competencia;
      const cur = engPorComp.get(k) || { dif: 0, corrigido: 0, juros: 0, verbas: [] };
      cur.dif += oc.diferenca || 0;
      cur.corrigido += oc.valor_corrigido || 0;
      cur.juros += oc.juros || 0;
      if (!cur.verbas.includes(v.nome)) cur.verbas.push(v.nome);
      engPorComp.set(k, cur);
    }
  }

  // Oracle: <ApuracaoDeJuros> consolida POR COMPETÊNCIA
  // valor_corrigido = principal corrigido na liquidação
  // taxa_juros = % juros acumulado a partir de dataInicial
  // juros_oracle = valor_corrigido × (taxa_juros / 100)  ← conforme Java ApuracaoDeJuros.getJuros
  const oraclePorComp = new Map<string, { valor_corrigido: number; taxa_juros: number; juros: number; cs_normal: number; cs_13: number }>();
  for (const ap of (a.apuracao_juros || [])) {
    const d = new Date(ap.competencia);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    // Java: juros = (valor_corrigido - cs_normal - cs_13) × taxa_juros / 100
    // (base de juros é DIFERENÇA-INSS, conforme base_de_juros_das_verbas=VERBA_INSS)
    const jurosBase = ap.valor_corrigido - (ap.cs_normal || 0) - (ap.cs_13 || 0);
    const juros = jurosBase * (ap.taxa_juros || 0) / 100;
    oraclePorComp.set(k, {
      valor_corrigido: ap.valor_corrigido,
      taxa_juros: ap.taxa_juros || 0,
      juros: juros,
      cs_normal: ap.cs_normal || 0,
      cs_13: ap.cs_13 || 0,
    });
  }

  // Tabela
  const todasComps = new Set<string>([...engPorComp.keys(), ...oraclePorComp.keys()]);
  const compsOrdenadas = [...todasComps].sort();

  console.log('\n═══════ TABELA POR COMPETÊNCIA (todas) ═══════');
  console.log('COMP    | ENG_DIF    ENG_CORR    ENG_JUROS  | ORACLE_CORR   ORC_TAXA%   ORC_JUROS  | DIFF_CORR    DIFF_JUROS');
  console.log('-'.repeat(130));

  let totalEngDif = 0, totalEngCorr = 0, totalEngJuros = 0;
  let totalOrcCorr = 0, totalOrcJuros = 0;
  let primeiroDivergente = '';

  for (const c of compsOrdenadas) {
    const e = engPorComp.get(c) || { dif: 0, corrigido: 0, juros: 0, verbas: [] };
    const o = oraclePorComp.get(c) || { valor_corrigido: 0, taxa_juros: 0, juros: 0, cs_normal: 0, cs_13: 0 };
    totalEngDif += e.dif;
    totalEngCorr += e.corrigido;
    totalEngJuros += e.juros;
    totalOrcCorr += o.valor_corrigido;
    totalOrcJuros += o.juros;
    const dCorr = e.corrigido - o.valor_corrigido;
    const dJur = e.juros - o.juros;
    const pctDivCorr = o.valor_corrigido > 0 ? Math.abs(dCorr / o.valor_corrigido) : 0;
    const pctDivJur = o.juros > 0 ? Math.abs(dJur / o.juros) : 0;
    if (!primeiroDivergente && (pctDivCorr > 0.01 || pctDivJur > 0.01)) primeiroDivergente = c;
    const tag = (pctDivCorr > 0.05 || pctDivJur > 0.05) ? 'X' :
                (pctDivCorr > 0.01 || pctDivJur > 0.01) ? '!' : ' ';
    console.log(
      `${c} | ${e.dif.toFixed(2).padStart(9)} ${e.corrigido.toFixed(2).padStart(11)} ${e.juros.toFixed(2).padStart(10)}` +
      ` | ${o.valor_corrigido.toFixed(2).padStart(11)} ${o.taxa_juros.toFixed(4).padStart(11)} ${o.juros.toFixed(2).padStart(10)}` +
      ` | ${dCorr.toFixed(2).padStart(10)} ${dJur.toFixed(2).padStart(10)} ${tag}`
    );
  }

  console.log('-'.repeat(130));
  console.log(
    `TOTAL   | ${totalEngDif.toFixed(2).padStart(9)} ${totalEngCorr.toFixed(2).padStart(11)} ${totalEngJuros.toFixed(2).padStart(10)}` +
    ` | ${totalOrcCorr.toFixed(2).padStart(11)} ${'      n/a   '} ${totalOrcJuros.toFixed(2).padStart(10)}` +
    ` | ${(totalEngCorr - totalOrcCorr).toFixed(2).padStart(10)} ${(totalEngJuros - totalOrcJuros).toFixed(2).padStart(10)}`
  );

  console.log('\n═══════ DIAGNÓSTICO FINAL ═══════');
  console.log(`ENG  total corrigido:  R$ ${totalEngCorr.toFixed(2)}`);
  console.log(`ORC  total corrigido:  R$ ${totalOrcCorr.toFixed(2)}`);
  console.log(`GAP  CORREÇÃO:         R$ ${(totalEngCorr - totalOrcCorr).toFixed(2)} (${((totalEngCorr - totalOrcCorr)/totalOrcCorr*100).toFixed(2)}%)`);
  console.log('');
  console.log(`ENG  total juros:      R$ ${totalEngJuros.toFixed(2)}`);
  console.log(`ORC  total juros:      R$ ${totalOrcJuros.toFixed(2)}`);
  console.log(`GAP  JUROS:            R$ ${(totalEngJuros - totalOrcJuros).toFixed(2)} (${((totalEngJuros - totalOrcJuros)/Math.max(totalOrcJuros,1)*100).toFixed(2)}%)`);
  console.log('');
  console.log(`PRIMEIRA COMPETÊNCIA DIVERGENTE (>1%): ${primeiroDivergente || '(nenhuma)'}`);

  // Métricas finais do engine vs oracle gprec (sanity check)
  console.log('\n═══════ SANITY (resumo) ═══════');
  const r = result.resumo;
  console.log(`Engine  liquido_reclamante: R$ ${r.liquido_reclamante.toFixed(2)}`);
  console.log(`Engine  cs_segurado:        R$ ${r.cs_segurado.toFixed(2)}`);
  console.log(`Engine  cs_empregador:      R$ ${r.cs_empregador.toFixed(2)}`);
  console.log(`Engine  ir_retido:          R$ ${r.ir_retido.toFixed(2)}`);

  // Comparação valor_corrigido por verba (top 10)
  console.log('\n═══════ TOP COMPETÊNCIAS COM MAIOR DIFF JUROS (abs) ═══════');
  const ranked = compsOrdenadas.map(c => {
    const e = engPorComp.get(c) || { dif: 0, corrigido: 0, juros: 0, verbas: [] };
    const o = oraclePorComp.get(c) || { valor_corrigido: 0, taxa_juros: 0, juros: 0, cs_normal: 0, cs_13: 0 };
    return {
      c,
      diffJuros: e.juros - o.juros,
      diffCorr: e.corrigido - o.valor_corrigido,
      eng_corr: e.corrigido, orc_corr: o.valor_corrigido,
      eng_jur: e.juros, orc_jur: o.juros, taxa: o.taxa_juros,
      verbas: e.verbas.join(', '),
    };
  }).sort((x, y) => Math.abs(y.diffJuros) - Math.abs(x.diffJuros)).slice(0, 10);

  for (const x of ranked) {
    console.log(
      `${x.c} | dCorr=${x.diffCorr.toFixed(2).padStart(9)} dJur=${x.diffJuros.toFixed(2).padStart(9)} | ` +
      `engC=${x.eng_corr.toFixed(0).padStart(7)} orcC=${x.orc_corr.toFixed(0).padStart(7)} ` +
      `engJ=${x.eng_jur.toFixed(2).padStart(8)} orcJ=${x.orc_jur.toFixed(2).padStart(8)} taxa=${x.taxa.toFixed(2)}% | ${x.verbas}`
    );
  }
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
