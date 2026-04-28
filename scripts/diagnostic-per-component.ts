/**
 * DIAGNÓSTICO POR COMPONENTE — Caminho A Sessão 1
 *
 * Roda os 13 casos .pjc em public/reports/ e produz tabela detalhada
 * com delta percentual PJC-vs-engine de cada componente:
 *
 *   bruto | INSS | IRPF | correção | juros | honorários | custas | líquido
 *
 * Objetivo: identificar onde o delta -30,68% nasce em cada caso,
 * para guiar a ordem de ataque das próximas 10-12 sessões.
 *
 * Uso:
 *   npx tsx scripts/diagnostic-per-component.ts
 *   npx tsx scripts/diagnostic-per-component.ts --json /tmp/diag.json
 *   npx tsx scripts/diagnostic-per-component.ts --md /tmp/diag.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadEngine() {
  const { analyzePJC } = await import('../src/lib/pjecalc/pjc-analyzer.js');
  const { convertPjcToEngineInputs } = await import('../src/lib/pjecalc/pjc-to-engine.js');
  const { PjeCalcEngine } = await import('../src/lib/pjecalc/engine.js');
  const { IPCA_E_ACUMULADO, SELIC_ACUMULADO } = await import('../src/lib/pjecalc/indices-fallback.js');
  return { analyzePJC, convertPjcToEngineInputs, PjeCalcEngine, IPCA_E_ACUMULADO, SELIC_ACUMULADO };
}

function readPjc(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    try {
      return execSync(`unzip -p "${filePath}"`, { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' });
    } catch {
      return buf.toString('latin1');
    }
  }
  const t = buf.toString('utf-8');
  return (t.includes('<?xml') || t.includes('<Calculo')) ? t : buf.toString('latin1');
}

function calcDelta(eng: number, pjc: number): number {
  if (pjc === 0 && eng === 0) return 0;
  if (pjc === 0) return eng > 0 ? Infinity : -Infinity;
  return ((eng - pjc) / pjc) * 100;
}

function fmtDelta(d: number): string {
  if (!isFinite(d)) return d > 0 ? '+∞%' : '-∞%';
  if (Math.abs(d) < 0.005) return '  0.00%';
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(2)}%`;
}

function fmtReais(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

interface ComponentDelta {
  caso: string;
  periodo_meses: number;
  regime: string;
  tem_cartao: boolean;
  verbas_count: number;
  ocorrencias_count: number;
  ocorrencias_com_dif: number;
  pjc: {
    bruto: number;
    inss: number;
    ir: number;
    juros: number;
    honorarios: number;
    custas: number;
    fgts: number;
    liquido: number;
  };
  eng: {
    bruto: number;
    inss: number;
    ir: number;
    juros: number;
    honorarios: number;
    custas: number;
    fgts: number;
    liquido: number;
    principal_corrigido: number;
  };
  deltas: {
    bruto: number;
    inss: number;
    ir: number;
    juros: number;
    honorarios: number;
    custas: number;
    fgts: number;
    correcao: number; // principal_corrigido - bruto em %
    liquido: number;
  };
  notas: string[];
}

async function main() {
  const searchDir = path.join(__dirname, '../public/reports');
  const pjcFiles = fs.readdirSync(searchDir)
    .filter(f => f.toLowerCase().endsWith('.pjc'))
    .map(f => path.join(searchDir, f))
    .sort();

  if (pjcFiles.length === 0) {
    console.error('Sem arquivos .pjc em public/reports/');
    process.exit(1);
  }

  console.log(`\nProcessando ${pjcFiles.length} casos de public/reports/\n`);

  const { analyzePJC, convertPjcToEngineInputs, PjeCalcEngine, IPCA_E_ACUMULADO, SELIC_ACUMULADO } = await loadEngine();
  const INDICES = buildIndicesDB(IPCA_E_ACUMULADO, SELIC_ACUMULADO);
  const FAIXAS = buildINSS();

  const resultados: ComponentDelta[] = [];

  for (let i = 0; i < pjcFiles.length; i++) {
    const arq = pjcFiles[i];
    const nome = path.basename(arq);
    // Nome curto: limpa prefixo típico dos arquivos
    const nomeCurto = nome
      .replace(/^PROCESSO_/, '')
      .replace(/\.pjc$/i, '')
      .slice(0, 45);
    process.stdout.write(`[${i + 1}/${pjcFiles.length}] ${nomeCurto.padEnd(45)} `);

    try {
      const xml = readPjc(arq);
      const analysis = analyzePJC(xml);
      const pjc_liq = analysis.resultado?.liquido_exequente ?? 0;
      if (pjc_liq <= 0) {
        process.stdout.write(' SKIP (líquido=0)\n');
        continue;
      }

      const inputs = convertPjcToEngineInputs(analysis, `diag-${nome}`);
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

      // Metadados
      const adm = analysis.parametros?.admissao || '';
      const dem = analysis.parametros?.demissao || '';
      const [aA, mA] = (adm.slice(0, 7) || '2020-01').split('-').map(Number);
      const [aD, mD] = (dem.slice(0, 7) || '2024-01').split('-').map(Number);
      const periodo = (aD - aA) * 12 + (mD - mA) + 1;
      const regime = dem.slice(0, 7) <= '2021-11' ? 'PRE_ADC58'
        : adm.slice(0, 7) >= '2021-11' ? 'POS_ADC58' : 'TRANSICAO';
      const temCartao = (inputs.cartaoPonto?.length ?? 0) > 0;
      const verbaResults: any[] = (result.detalhes as any)?.verbaResults || (result as any).verbas || [];
      const totalOcs = verbaResults.reduce((s: number, vr: any) => s + (vr.ocorrencias?.length || 0), 0);
      const ocsComDif = verbaResults.reduce(
        (s: number, vr: any) => s + (vr.ocorrencias?.filter((oc: any) => oc.diferenca > 0).length || 0),
        0,
      );

      // ─────── PJC ───────
      const pjcInss = analysis.resultado.inss_reclamante || 0;
      const pjcIr = analysis.resultado.imposto_renda || 0;
      const pjcJuros = analysis.resultado.juros_mora_persistido ?? 0;
      const pjcHon = (analysis.resultado.honorarios || []).reduce((s, h) => s + (h.valor || 0), 0);
      const pjcCustas = analysis.resultado.custas || 0;
      const pjcFgts = analysis.resultado.fgts_deposito || 0;
      // bruto ≈ liquido + INSS + IR (conforme calibration-pipeline)
      const pjcBruto = pjc_liq + pjcInss + pjcIr;

      // ─────── ENGINE ───────
      const engInss = r.cs_segurado || 0;
      const engIr = r.ir_retido || 0;
      const engJuros = r.juros_mora || 0;
      const engHon = (r.honorarios_sucumbenciais || 0) + (r.honorarios_contratuais || 0);
      const engCustas = r.custas || 0;
      const engFgts = r.fgts_total || 0;
      const engLiq = r.liquido_reclamante || 0;
      const engBrutoNom = r.principal_bruto || 0;
      const engBrutoCorrigido = r.principal_corrigido || 0;
      // bruto comparável ao PJC = liq + INSS + IR + honorários retidos do reclamante
      const engBruto = engLiq + engInss + engIr;

      const d = {
        bruto: calcDelta(engBruto, pjcBruto),
        inss: calcDelta(engInss, pjcInss),
        ir: calcDelta(engIr, pjcIr),
        juros: calcDelta(engJuros, pjcJuros),
        honorarios: calcDelta(engHon, pjcHon),
        custas: calcDelta(engCustas, pjcCustas),
        fgts: calcDelta(engFgts, pjcFgts),
        correcao: calcDelta(engBrutoCorrigido, engBrutoNom), // % de correção aplicada pelo engine
        liquido: calcDelta(engLiq, pjc_liq),
      };

      // ─────── Notas automáticas ───────
      const notas: string[] = [];
      if (pjcJuros === 0) notas.push('juros_PJC=0');
      if (engBrutoCorrigido === engBrutoNom || engBrutoCorrigido === 0) notas.push('eng_sem_correcao');
      if (d.ir === 0 && pjcIr === 0) notas.push('sem_IR');
      if (d.inss === 0 && engInss === 0 && pjcInss === 0) notas.push('sem_INSS');
      if (pjcFgts > 0 && engFgts === 0) notas.push('FGTS_PJC>0_eng=0');
      if (totalOcs > 0 && ocsComDif === 0) notas.push('verbas_sem_diferenca');

      resultados.push({
        caso: nomeCurto,
        periodo_meses: periodo,
        regime,
        tem_cartao: temCartao,
        verbas_count: verbaResults.length,
        ocorrencias_count: totalOcs,
        ocorrencias_com_dif: ocsComDif,
        pjc: {
          bruto: pjcBruto, inss: pjcInss, ir: pjcIr, juros: pjcJuros,
          honorarios: pjcHon, custas: pjcCustas, fgts: pjcFgts, liquido: pjc_liq,
        },
        eng: {
          bruto: engBruto, inss: engInss, ir: engIr, juros: engJuros,
          honorarios: engHon, custas: engCustas, fgts: engFgts, liquido: engLiq,
          principal_corrigido: engBrutoCorrigido,
        },
        deltas: d,
        notas,
      });

      const badge = Math.abs(d.liquido) <= 5 ? '✅' : Math.abs(d.liquido) <= 10 ? '⚠️' : '❌';
      console.log(`${badge} liq:${fmtDelta(d.liquido)} inss:${fmtDelta(d.inss)} ir:${fmtDelta(d.ir)} jur:${fmtDelta(d.juros)} hon:${fmtDelta(d.honorarios)}`);
    } catch (e) {
      console.log(`💥 CRASH: ${(e as Error).message.slice(0, 60)}`);
    }
  }

  // ─────────── Outputs ───────────
  const args = process.argv.slice(2);
  const jsonIdx = args.indexOf('--json');
  const mdIdx = args.indexOf('--md');

  if (jsonIdx >= 0) {
    const outPath = args[jsonIdx + 1];
    fs.writeFileSync(outPath, JSON.stringify(resultados, null, 2));
    console.log(`\nJSON salvo em ${outPath}`);
  }

  // Tabela markdown
  const md: string[] = [];
  md.push('# Diagnóstico por Componente — Caminho A Sessão 1');
  md.push('');
  md.push(`**Arquivos analisados:** ${resultados.length}`);
  md.push('');
  md.push('**Convenção:**');
  md.push('- `delta_X%` = `(engine_X − pjc_X) / pjc_X × 100`');
  md.push('- Negativo = engine subestima; positivo = engine superestima');
  md.push('- Alvo final: cada caso com **delta_liquido ∈ [-1%, +5%]**');
  md.push('');
  md.push('## Tabela principal: delta % por componente');
  md.push('');
  md.push('| # | caso | período | regime | cartão | Δ bruto | Δ INSS | Δ IR | Δ juros | Δ hon | Δ custas | Δ FGTS | Δ correção | Δ LÍQUIDO |');
  md.push('|---|---|---:|---|:---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  resultados.forEach((r, i) => {
    md.push(
      `| ${i + 1} | ${r.caso} | ${r.periodo_meses}m | ${r.regime} | ${r.tem_cartao ? '✓' : '—'} | ${fmtDelta(r.deltas.bruto)} | ${fmtDelta(r.deltas.inss)} | ${fmtDelta(r.deltas.ir)} | ${fmtDelta(r.deltas.juros)} | ${fmtDelta(r.deltas.honorarios)} | ${fmtDelta(r.deltas.custas)} | ${fmtDelta(r.deltas.fgts)} | ${fmtDelta(r.deltas.correcao)} | **${fmtDelta(r.deltas.liquido)}** |`,
    );
  });
  md.push('');

  // Tabela absolutos
  md.push('## Tabela secundária: valores absolutos (R$)');
  md.push('');
  md.push('| # | caso | PJC liq | ENG liq | PJC juros | ENG juros | PJC hon | ENG hon | PJC custas | ENG custas | notas |');
  md.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|');
  resultados.forEach((r, i) => {
    md.push(
      `| ${i + 1} | ${r.caso} | ${fmtReais(r.pjc.liquido)} | ${fmtReais(r.eng.liquido)} | ${fmtReais(r.pjc.juros)} | ${fmtReais(r.eng.juros)} | ${fmtReais(r.pjc.honorarios)} | ${fmtReais(r.eng.honorarios)} | ${fmtReais(r.pjc.custas)} | ${fmtReais(r.eng.custas)} | ${r.notas.join(', ') || '—'} |`,
    );
  });
  md.push('');

  // Agregação: contribuição por componente
  md.push('## Agregação: componente com maior contribuição para delta_liquido');
  md.push('');
  md.push('Para cada caso, identifica qual componente tem |delta| maior (proxy para onde atacar primeiro).');
  md.push('');
  md.push('| # | caso | maior delta | valor |');
  md.push('|---|---|---|---:|');
  resultados.forEach((r, i) => {
    const comps: Array<[string, number]> = [
      ['bruto', r.deltas.bruto],
      ['INSS', r.deltas.inss],
      ['IR', r.deltas.ir],
      ['juros', r.deltas.juros],
      ['honorarios', r.deltas.honorarios],
      ['custas', r.deltas.custas],
      ['FGTS', r.deltas.fgts],
    ];
    const ordenados = comps
      .filter(([, v]) => isFinite(v))
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const top = ordenados[0];
    md.push(`| ${i + 1} | ${r.caso} | **${top?.[0] ?? '-'}** | ${top ? fmtDelta(top[1]) : '-'} |`);
  });
  md.push('');

  // Estatísticas
  const liqDeltas = resultados.map(r => r.deltas.liquido);
  const media = liqDeltas.reduce((a, b) => a + b, 0) / liqDeltas.length;
  const min = Math.min(...liqDeltas);
  const max = Math.max(...liqDeltas);
  md.push('## Estatísticas delta_liquido');
  md.push('');
  md.push(`- **Média:** ${media.toFixed(2)}%`);
  md.push(`- **Range:** ${min.toFixed(2)}% até ${max.toFixed(2)}%`);
  md.push(`- **Casos na meta [-1%, +5%]:** ${liqDeltas.filter(d => d >= -1 && d <= 5).length}/${liqDeltas.length}`);
  md.push('');

  const mdOutput = md.join('\n');

  if (mdIdx >= 0) {
    const outPath = args[mdIdx + 1];
    fs.writeFileSync(outPath, mdOutput);
    console.log(`Markdown salvo em ${outPath}`);
  } else {
    console.log('\n---8<--- Tabela Markdown ---8<---\n');
    console.log(mdOutput);
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
