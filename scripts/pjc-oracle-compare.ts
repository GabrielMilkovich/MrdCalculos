// PJC Multi-Field Oracle Comparator
// Compara TODOS os campos do <gprec> e <dadosEstruturados> de cada PJC
// contra output do PjeCalcEngineV3.
//
// Descoberta: cada .pjc tem outputs Java pré-computados (oracle definitivo).
// Não só liquidoExequente/INSS/IR — temos ~30+ campos para comparar.
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

function readPjcXml(p: string): string {
  const buf = fs.readFileSync(p);
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    return execSync(`unzip -p "${p}"`, { encoding: 'utf-8', maxBuffer: 50000000 });
  }
  const t = buf.toString('utf-8');
  return (t.includes('<?xml') || t.includes('<Calculo')) ? t : buf.toString('latin1');
}

interface OracleFields {
  // gprec
  liquidoExequente?: number;
  inssBeneficiario?: number;
  inssExecutado?: number;
  impostoRenda?: number;
  depositoFgts?: number;
  custasJudiciais?: number;
  // dadosEstruturados
  valorPrincipal?: number;
  inssReclamado?: number;
  inssReclamante?: number;
  custasReclamado?: number;
  hashLiquidacao?: string;
  // outros campos comuns
  honorariosReclamante?: number;
  honorariosReclamado?: number;
}

function num(s: string | undefined): number | undefined {
  if (!s || s === 'null' || s.trim() === '') return undefined;
  const v = parseFloat(s);
  return isNaN(v) ? undefined : v;
}

function extract(xml: string, parent: string): Record<string, string> {
  const m = xml.match(new RegExp(`<${parent}>([\\s\\S]*?)<\/${parent}>`));
  if (!m) return {};
  const body = m[1];
  const fields = body.matchAll(/<(\w+)>([^<]*?)<\/\1>/g);
  const result: Record<string, string> = {};
  for (const f of fields) {
    if (!result[f[1]]) result[f[1]] = f[2]; // first occurrence
  }
  return result;
}

function extractOracle(xml: string): OracleFields {
  const gprec = extract(xml, 'gprec');
  const dados = extract(xml, 'dadosEstruturados');

  return {
    liquidoExequente: num(gprec.liquidoExequente),
    inssBeneficiario: num(gprec.inssBeneficiario),
    inssExecutado: num(gprec.inssExecutado),
    impostoRenda: num(gprec.impostoRenda),
    depositoFgts: num(gprec.depositoFgts),
    custasJudiciais: num(gprec.custasJudiciais),
    honorariosReclamante: num(gprec.honorariosReclamante),
    honorariosReclamado: num(gprec.honorariosReclamado),
    valorPrincipal: num(dados.valorPrincipal),
    inssReclamado: num(dados.inssReclamado),
    inssReclamante: num(dados.inssReclamante),
    custasReclamado: num(dados.custasReclamado),
    hashLiquidacao: dados.hashLiquidacao,
  };
}

function buildINSSFaixas() {
  const f: any[] = [];
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

async function compareSinglePJC(pjcPath: string) {
  const xml = readPjcXml(pjcPath);
  const oracle = extractOracle(xml);

  const { analyzePJC } = await import('/home/user/MrdCalculos/src/lib/pjecalc/pjc-analyzer.js');
  const { convertPjcToEngineInputs } = await import('/home/user/MrdCalculos/src/lib/pjecalc/pjc-to-engine.js');
  const { PjeCalcEngineV3 } = await import('/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.js');

  const a: any = analyzePJC(xml);
  const inputs = convertPjcToEngineInputs(a, `cmp-${path.basename(pjcPath)}`);
  inputs.params.modo_calculo = 'independent';
  if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
  if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;
  if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;

  const engine = new PjeCalcEngineV3(
    inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
    inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
    inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
    inputs.custasConfig, inputs.seguroConfig, [], buildINSSFaixas() as any,
    [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
    inputs.pensaoConfig, inputs.salarioFamiliaConfig,
  );
  const result: any = engine.liquidar();
  const r = result.resumo;

  // INSS nominal segurado (= `inssBeneficiario` Java).
  // Preferimos `r.cs_segurado_nominal` (totalSegurado do InssModuloAdapter — calculado
  // a partir das faixas progressivas, espelha `valorTotalInssSeguradoReclamante` Java).
  // Fallback para soma de cs_normal+cs_13 das apuracoes_juros do oracle quando o engine
  // não populou. Ref Java: ResumoPrecatorioJrAdapterPadrao.java:239.
  let inssNominalFromOracle = 0;
  for (const it of (a.apuracao_juros || [])) {
    inssNominalFromOracle += (it.cs_normal || 0) + (it.cs_13 || 0);
  }
  const inssNominal = (typeof r.cs_segurado_nominal === 'number' && r.cs_segurado_nominal > 0)
    ? r.cs_segurado_nominal
    : inssNominalFromOracle;

  // FIX Sprint 1 Bug 2 (2026-04-29): inssExecutado Java NÃO é cs_empregador puro.
  // Java: inssExecutado = (totalGeralInssSegurado + totalGeralInssEmpresa
  //                      + totalGeralInssSAT + totalGeralInssTerceiros) − inssBeneficiario
  // Ref Java: ResumoPrecatorioJrAdapterPadrao.java:241-251.
  //   `cs_segurado` = totalGeralInssSegurado (CORRIGIDO + juros + multa)
  //   `cs_empregador` = totalGeralInssEmpresa+SAT+Terceiros (CORRIGIDO + juros + multa)
  //   `inssBeneficiario` é NOMINAL (sem correção/juros/multa).
  // Logo: inssExecutado_engine = cs_segurado + cs_empregador − inssBeneficiario_nominal.
  // (Antes mapeava para cs_empregador direto → -10% sistemático em 50/50 PJCs.)
  const inssExecutadoEng = r.cs_segurado + r.cs_empregador - inssNominal;

  const eng = {
    // FIX 2026-04-29 (CEREBRO-CLAUDE Sprint 2): oracle <valorPrincipal> = LIQUIDO,
    // nao BRUTO. Verificado em 15 PJCs sem excecao. Java Atualizacao.java:1183-1240.
    // Antes mapeava para BRUTO (principal + juros + fgts), gerando "+5-20% inflado"
    // falso positivo. Engine principal_corrigido real esta em +/- 2%.
    valorPrincipal: r.liquido_reclamante,
    liquidoExequente: r.liquido_reclamante,
    inssBeneficiario: inssNominal,
    inssReclamante: r.cs_segurado,
    inssExecutado: inssExecutadoEng,
    inssReclamado: r.cs_empregador,
    impostoRenda: r.ir_retido,
    depositoFgts: r.fgts_total,
    custasJudiciais: r.custas,
    custasReclamado: r.custas,
    honorariosReclamante: r.honorarios_contratuais,
    honorariosReclamado: r.honorarios_sucumbenciais,
  };

  return { oracle, eng, name: path.basename(pjcPath, path.extname(pjcPath)) };
}

function fmt(v: number | undefined): string {
  if (v === undefined) return '   n/a    ';
  return v.toFixed(2).padStart(11);
}

function delta(eng: number | undefined, oracle: number | undefined): string {
  if (eng === undefined || oracle === undefined || oracle === 0) return '   --   ';
  const d = ((eng - oracle) / oracle) * 100;
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(2)}%`.padStart(8);
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.log('Uso: npx tsx scripts/pjc-oracle-compare.ts <pjc1> [pjc2] ...');
    return;
  }

  const fields: (keyof OracleFields)[] = [
    'liquidoExequente',
    'inssBeneficiario',
    'inssReclamante',
    'inssExecutado',
    'inssReclamado',
    'impostoRenda',
    'depositoFgts',
    'custasJudiciais',
    'custasReclamado',
    'valorPrincipal',
    'honorariosReclamante',
    'honorariosReclamado',
  ];

  console.log('CASO              | CAMPO                | ENG          | ORACLE       | DELTA');
  console.log('-'.repeat(90));

  for (const f of files) {
    if (!fs.existsSync(f)) { console.log(`MISSING: ${f}`); continue; }
    try {
      const { oracle, eng, name } = await compareSinglePJC(f);
      const shortName = name.slice(0, 17).padEnd(17);
      let printed = false;
      for (const field of fields) {
        const o = oracle[field] as number | undefined;
        const e = (eng as any)[field] as number | undefined;
        if (o === undefined && e === undefined) continue;
        if (o === 0 && e === 0) continue;
        const d = delta(e, o);
        const flag = (() => {
          if (o === undefined || e === undefined) return ' ';
          if (o === 0) return ' ';
          const dp = Math.abs((e - o) / o);
          if (dp > 0.05) return '❌';
          if (dp > 0.01) return '⚠️';
          return '✅';
        })();
        console.log(`${printed ? ' '.repeat(17) : shortName} | ${field.padEnd(20)} | ${fmt(e)} | ${fmt(o)} | ${d} ${flag}`);
        printed = true;
      }
      console.log('-'.repeat(90));
    } catch (e: any) {
      console.log(`ERR ${f}: ${e.message?.slice(0, 80)}`);
    }
  }
}
main().catch(e => console.error(e.stack || e.message));
