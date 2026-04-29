/**
 * Sprint 2C — breakdown completo do liquido_reclamante para PROCESSO_00008567.
 *
 * Imprime TODOS os componentes (engine TS) lado a lado com oracle Java
 * (extraido do <gprec> e <dadosEstruturados>) para identificar qual
 * componente carrega o gap de R$ 9.947 (engine R$ 78.539 vs oracle R$ 88.486).
 *
 * Sprint 2A e 2B refutaram hipoteses anteriores (FGTS regime, EC 113 SELIC,
 * verbas reflexas espalhadas). Esta sprint olha diretamente os agregadores.
 */
import * as fs from 'fs';
import { execSync } from 'child_process';

const PJC = 'docs/PROCESSO_00008567620255170005_CALCULO_4483_DATA_09072025_HORA_155016.PJC';

function readPjcXml(p: string): string {
  const buf = fs.readFileSync(p);
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    return execSync(`unzip -p "${p}"`, { encoding: 'utf-8', maxBuffer: 50_000_000 });
  }
  const t = buf.toString('utf-8');
  return (t.includes('<?xml') || t.includes('<Calculo')) ? t : buf.toString('latin1');
}

function num(s: string | undefined): number {
  if (!s || s === 'null' || s.trim() === '') return 0;
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

function extract(xml: string, parent: string): Record<string, string> {
  const m = xml.match(new RegExp(`<${parent}>([\\s\\S]*?)<\\/${parent}>`));
  if (!m) return {};
  const body = m[1];
  const fields = body.matchAll(/<(\w+)>([^<]*?)<\/\1>/g);
  const result: Record<string, string> = {};
  for (const f of fields) {
    if (!result[f[1]]) result[f[1]] = f[2];
  }
  return result;
}

async function main() {
  console.log(`\n=== Sprint 2C breakdown — PROCESSO_00008567 ===\n`);

  const xml = readPjcXml(PJC);
  const gprec = extract(xml, 'gprec');
  const dados = extract(xml, 'dadosEstruturados');

  const oracle = {
    liquido: num(gprec.liquidoExequente) || num(dados.valorPrincipal),
    inssBeneficiario: num(gprec.inssBeneficiario),
    inssExecutado: num(gprec.inssExecutado),
    inssReclamado: num(dados.inssReclamado),
    inssReclamante: num(dados.inssReclamante),
    impostoRenda: num(gprec.impostoRenda),
    depositoFgts: num(gprec.depositoFgts),
    custas: num(gprec.custasJudiciais),
    honorariosReclamado: num(gprec.honorariosReclamado),
    honorariosReclamante: num(gprec.honorariosReclamante),
    valorPrincipal: num(dados.valorPrincipal),
  };

  // Extra fields do dadosEstruturados
  const extraFields = ['valorBruto', 'principalBruto', 'principalCorrigido',
    'juros', 'jurosMora', 'multas', 'multa523', 'multa467', 'multa477',
    'pensaoAlimenticia', 'previdenciaPrivada', 'salarioFamilia', 'seguroDesemprego'];
  const oracleExtras: Record<string, number> = {};
  for (const f of extraFields) {
    oracleExtras[f] = num(dados[f] ?? gprec[f]);
  }

  // Roda engine v3
  const { analyzePJC } = await import('/home/user/MrdCalculos/src/lib/pjecalc/pjc-analyzer.js');
  const { convertPjcToEngineInputs } = await import('/home/user/MrdCalculos/src/lib/pjecalc/pjc-to-engine.js');
  const { PjeCalcEngineV3 } = await import('/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.js');

  const a: any = analyzePJC(xml);
  const inputs = convertPjcToEngineInputs(a, 'diag-08567');
  inputs.params.modo_calculo = 'independent';
  if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
  if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;
  if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;

  function buildINSSFaixas() {
    return [
      { competencia_inicio: '2019-01-01', competencia_fim: '2019-12-01', faixa: 1, valor_ate: 1751.81, aliquota: 0.08 },
      { competencia_inicio: '2019-01-01', competencia_fim: '2019-12-01', faixa: 2, valor_ate: 2919.72, aliquota: 0.09 },
      { competencia_inicio: '2019-01-01', competencia_fim: '2019-12-01', faixa: 3, valor_ate: 5839.45, aliquota: 0.11 },
      { competencia_inicio: '2020-03-01', competencia_fim: '2020-12-01', faixa: 1, valor_ate: 1045, aliquota: 0.075 },
      { competencia_inicio: '2020-03-01', competencia_fim: '2020-12-01', faixa: 2, valor_ate: 2089.60, aliquota: 0.09 },
      { competencia_inicio: '2020-03-01', competencia_fim: '2020-12-01', faixa: 3, valor_ate: 3134.40, aliquota: 0.12 },
      { competencia_inicio: '2020-03-01', competencia_fim: '2020-12-01', faixa: 4, valor_ate: 6101.06, aliquota: 0.14 },
      { competencia_inicio: '2021-01-01', competencia_fim: '2021-12-01', faixa: 1, valor_ate: 1100, aliquota: 0.075 },
      { competencia_inicio: '2021-01-01', competencia_fim: '2021-12-01', faixa: 2, valor_ate: 2203.48, aliquota: 0.09 },
      { competencia_inicio: '2021-01-01', competencia_fim: '2021-12-01', faixa: 3, valor_ate: 3305.22, aliquota: 0.12 },
      { competencia_inicio: '2021-01-01', competencia_fim: '2021-12-01', faixa: 4, valor_ate: 6433.57, aliquota: 0.14 },
      { competencia_inicio: '2022-01-01', competencia_fim: '2022-12-01', faixa: 1, valor_ate: 1212, aliquota: 0.075 },
      { competencia_inicio: '2022-01-01', competencia_fim: '2022-12-01', faixa: 2, valor_ate: 2427.35, aliquota: 0.09 },
      { competencia_inicio: '2022-01-01', competencia_fim: '2022-12-01', faixa: 3, valor_ate: 3641.03, aliquota: 0.12 },
      { competencia_inicio: '2022-01-01', competencia_fim: '2022-12-01', faixa: 4, valor_ate: 7087.22, aliquota: 0.14 },
    ];
  }

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

  console.log(`\n${'CAMPO'.padEnd(35)} | ${'ENGINE'.padStart(12)} | ${'ORACLE'.padStart(12)} | ${'GAP'.padStart(12)}`);
  console.log('-'.repeat(80));
  function row(label: string, eng: number, ora: number) {
    const gap = eng - ora;
    const pct = ora !== 0 ? `(${(gap / ora * 100).toFixed(1)}%)` : '';
    const flag = Math.abs(gap) < 1 ? '✅' : Math.abs(gap) < 100 ? '⚠️ ' : '❌';
    console.log(`${label.padEnd(35)} | ${eng.toFixed(2).padStart(12)} | ${ora.toFixed(2).padStart(12)} | ${gap.toFixed(2).padStart(12)} ${pct} ${flag}`);
  }

  row('liquido_reclamante', r.liquido_reclamante, oracle.liquido);
  console.log('-'.repeat(80));
  row('principal_bruto', r.principal_bruto, oracleExtras.principalBruto);
  row('principal_corrigido', r.principal_corrigido, oracleExtras.principalCorrigido);
  row('juros_mora', r.juros_mora, oracleExtras.juros || oracleExtras.jurosMora);
  row('total_reclamada (princ+juros+fgts)', r.total_reclamada, 0);
  console.log('-'.repeat(80));
  row('cs_segurado (INSS empregado)', r.cs_segurado, oracle.inssReclamante);
  row('cs_empregador (INSS reclamado)', r.cs_empregador, oracle.inssReclamado);
  row('ir_retido', r.ir_retido, oracle.impostoRenda);
  console.log('-'.repeat(80));
  row('fgts_total', r.fgts_total, oracle.depositoFgts);
  row('multa_523', r.multa_523, oracleExtras.multa523);
  row('multa_467', r.multa_467, oracleExtras.multa467);
  row('multa_477', r.multa_477, oracleExtras.multa477);
  console.log('-'.repeat(80));
  row('honorarios_sucumbenciais', r.honorarios_sucumbenciais, oracle.honorariosReclamado);
  row('honorarios_contratuais', r.honorarios_contratuais, oracle.honorariosReclamante);
  row('custas', r.custas, oracle.custas);
  console.log('-'.repeat(80));
  row('pensao_total', r.pensao_total, oracleExtras.pensaoAlimenticia);
  row('previdencia_privada', r.previdencia_privada, oracleExtras.previdenciaPrivada);
  row('salario_familia', r.salario_familia, oracleExtras.salarioFamilia);
  row('seguro_desemprego', r.seguro_desemprego, oracleExtras.seguroDesemprego);
  console.log('-'.repeat(80));

  // Calcula reconstrucao do liquido a partir dos componentes
  const reconstrucao =
    r.principal_corrigido + r.juros_mora + r.fgts_total + r.multa_523 + r.multa_467 + r.multa_477
    - r.cs_segurado - r.ir_retido - r.pensao_total
    + r.honorarios_sucumbenciais
    - r.honorarios_contratuais
    - r.custas;
  console.log(`\nReconstrucao engine (princ_corr + juros + fgts + multas - cs - ir - pensao + hsuc - hcontr - custas):`);
  console.log(`  ${reconstrucao.toFixed(2)} (engine reportou ${r.liquido_reclamante.toFixed(2)})`);
  console.log(`  diff: ${(reconstrucao - r.liquido_reclamante).toFixed(2)}`);

  console.log(`\nGAP TOTAL liquido: ${(r.liquido_reclamante - oracle.liquido).toFixed(2)} = R$ ${(oracle.liquido - r.liquido_reclamante).toFixed(2)} faltam no engine`);

  // Print all dados Estruturados keys for inspection
  console.log(`\n=== ORACLE dadosEstruturados (todos os campos) ===`);
  for (const k of Object.keys(dados).sort()) {
    if (dados[k] && dados[k] !== 'null' && dados[k] !== '0' && dados[k] !== '0.00') {
      console.log(`  ${k.padEnd(40)}: ${dados[k]}`);
    }
  }
  console.log(`\n=== ORACLE gprec (todos os campos) ===`);
  for (const k of Object.keys(gprec).sort()) {
    if (gprec[k] && gprec[k] !== 'null' && gprec[k] !== '0' && gprec[k] !== '0.00') {
      console.log(`  ${k.padEnd(40)}: ${gprec[k]}`);
    }
  }
}

main().catch(e => console.error(e.stack || e.message));
