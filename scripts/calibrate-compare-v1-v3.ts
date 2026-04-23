/**
 * =====================================================
 * CALIBRATE COMPARE — V1 vs V3 (vs PJC)
 * =====================================================
 * Lê os outputs JSON dos dois pipelines de calibração
 * (V1 legado e V3 ativo) e produz tabela comparativa
 * per-caso e agregados, com foco em "quem está mais
 * perto de PJC" (não "V3 vs V1" isoladamente).
 *
 * Uso:
 *   npm run calibrate:compare
 *   (assume que os 2 JSONs mais recentes existem na raiz:
 *    calibration-YYYY-MM-DD.json e calibration-v3-YYYY-MM-DD.json)
 *
 *   npm run calibrate:compare -- --v1 /path/v1.json --v3 /path/v3.json
 * =====================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Caso {
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

interface Relatorio {
  data: string;
  n: number;
  aprov5: number;
  aprov10: number;
  avg: number;
  casos: Caso[];
}

function parseArgs(): { v1Path: string; v3Path: string } {
  const args = process.argv.slice(2);
  const v1Idx = args.indexOf('--v1');
  const v3Idx = args.indexOf('--v3');
  const repoRoot = path.join(__dirname, '..');

  const findLatest = (prefix: string): string => {
    const files = fs.readdirSync(repoRoot)
      .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
      .sort()
      .reverse();
    if (files.length === 0) {
      throw new Error(`Nenhum arquivo ${prefix}*.json encontrado em ${repoRoot}. Rode calibrate primeiro.`);
    }
    return path.join(repoRoot, files[0]);
  };

  const v1Path = v1Idx >= 0 ? args[v1Idx + 1] : findLatest('calibration-2');
  const v3Path = v3Idx >= 0 ? args[v3Idx + 1] : findLatest('calibration-v3-');

  return { v1Path, v3Path };
}

function shortName(nome: string, arquivo: string): string {
  // Prefere nome legível do XML; cai para basename do arquivo.
  if (nome && nome.trim().length > 0 && !/^pyter-gabriel/i.test(nome)) {
    const parts = nome.trim().split(/\s+/);
    // Primeiro + último (até 30 chars)
    return (parts[0] + (parts.length > 1 ? ' ' + parts[parts.length - 1] : '')).slice(0, 30);
  }
  return arquivo.replace(/\.pjc$/i, '').slice(0, 30);
}

function classify(delta: number): '✅' | '⚠️' | '❌' {
  // Meta do escritório: [-1%, +5%]
  if (delta >= -1 && delta <= 5) return '✅';
  if (delta >= -10 && delta <= 10) return '⚠️';
  return '❌';
}

function fmtPct(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function vencedor(v1Delta: number, v3Delta: number, threshold = 0.5): 'V3' | 'V1' | 'empate' {
  const a1 = Math.abs(v1Delta);
  const a3 = Math.abs(v3Delta);
  if (Math.abs(a1 - a3) < threshold) return 'empate';
  return a3 < a1 ? 'V3' : 'V1';
}

function main() {
  const { v1Path, v3Path } = parseArgs();

  console.log(`\nLendo:\n  V1: ${v1Path}\n  V3: ${v3Path}\n`);

  const v1: Relatorio = JSON.parse(fs.readFileSync(v1Path, 'utf-8'));
  const v3: Relatorio = JSON.parse(fs.readFileSync(v3Path, 'utf-8'));

  // Index por arquivo
  const v3ByArq = new Map(v3.casos.map((c) => [c.arquivo, c]));

  // Casos válidos (ambos lados, sem erro, pjc_liquido > 0)
  const validos = v1.casos.filter((c1) => {
    if (c1.erro) return false;
    if (c1.pjc_liquido <= 0) return false;
    const c3 = v3ByArq.get(c1.arquivo);
    return c3 && !c3.erro && c3.pjc_liquido > 0;
  });

  // ─── Agregados ───
  const v1_delta_abs = validos.map((c) => Math.abs(c.delta_liquido));
  const v3_delta_abs = validos.map((c) => {
    const c3 = v3ByArq.get(c.arquivo)!;
    return Math.abs(c3.delta_liquido);
  });

  const v1MedAbs = v1_delta_abs.reduce((a, b) => a + b, 0) / v1_delta_abs.length;
  const v3MedAbs = v3_delta_abs.reduce((a, b) => a + b, 0) / v3_delta_abs.length;

  const v1_5 = validos.filter((c) => Math.abs(c.delta_liquido) <= 5).length;
  const v1_10 = validos.filter((c) => Math.abs(c.delta_liquido) <= 10).length;
  const v3_5 = validos.filter((c) => {
    const c3 = v3ByArq.get(c.arquivo)!;
    return Math.abs(c3.delta_liquido) <= 5;
  }).length;
  const v3_10 = validos.filter((c) => {
    const c3 = v3ByArq.get(c.arquivo)!;
    return Math.abs(c3.delta_liquido) <= 10;
  }).length;
  const v3_meta = validos.filter((c) => {
    const c3 = v3ByArq.get(c.arquivo)!;
    return c3.delta_liquido >= -1 && c3.delta_liquido <= 5;
  }).length;

  let v3Win = 0, v1Win = 0, empates = 0;
  for (const c1 of validos) {
    const c3 = v3ByArq.get(c1.arquivo)!;
    const r = vencedor(c1.delta_liquido, c3.delta_liquido);
    if (r === 'V3') v3Win++;
    else if (r === 'V1') v1Win++;
    else empates++;
  }

  // ─── Output ───
  console.log('═'.repeat(78));
  console.log('  COMPARATIVO V1 vs V3 (vs PJC)');
  console.log('═'.repeat(78));
  console.log(`  Casos válidos (ambos motores): ${validos.length}`);
  console.log('');
  console.log(`  V1 — delta médio absoluto:   ${v1MedAbs.toFixed(2)}%`);
  console.log(`  V3 — delta médio absoluto:   ${v3MedAbs.toFixed(2)}%`);
  console.log('');
  console.log('  Bandas (|delta_liquido|):');
  console.log(`    ≤5%:                         V1 ${v1_5}/${validos.length}   V3 ${v3_5}/${validos.length}`);
  console.log(`    ≤10%:                        V1 ${v1_10}/${validos.length}   V3 ${v3_10}/${validos.length}`);
  console.log(`  Na meta escritório [-1%,+5%]:  V3 ${v3_meta}/${validos.length}`);
  console.log('');
  console.log('  Quem está mais próximo de PJC (|delta| menor; empate = Δ<0.5pp):');
  console.log(`    V3 vence:                    ${v3Win}/${validos.length}`);
  console.log(`    V1 vence:                    ${v1Win}/${validos.length}`);
  console.log(`    empate:                      ${empates}/${validos.length}`);
  console.log('');

  // ─── Tabela per-caso ───
  console.log('─'.repeat(78));
  console.log('  # | caso                          | PJC_liq    | V1 δ%     | V3 δ%     | vencedor | meta');
  console.log('─'.repeat(78));
  validos.forEach((c1, i) => {
    const c3 = v3ByArq.get(c1.arquivo)!;
    const v = vencedor(c1.delta_liquido, c3.delta_liquido);
    const m = classify(c3.delta_liquido);
    const nome = shortName(c1.nome, c1.arquivo).padEnd(30);
    console.log(
      `  ${String(i + 1).padStart(2)} | ${nome} | ${c1.pjc_liquido.toFixed(2).padStart(10)} | ${fmtPct(c1.delta_liquido).padStart(9)} | ${fmtPct(c3.delta_liquido).padStart(9)} | ${v.padEnd(8)} | ${m}`,
    );
  });
  console.log('─'.repeat(78));
  console.log('');

  // ─── Breakdown componente ───
  console.log('  COMPONENTES (delta% médio absoluto):');
  const comp = ['bruto', 'inss', 'ir'] as const;
  for (const k of comp) {
    const v1Avg = validos.map((c) => Math.abs((c as any)[`delta_${k}`])).reduce((a, b) => a + b, 0) / validos.length;
    const v3Avg = validos.map((c) => Math.abs((v3ByArq.get(c.arquivo)! as any)[`delta_${k}`])).reduce((a, b) => a + b, 0) / validos.length;
    console.log(`    ${k.padEnd(6)}:   V1 ${v1Avg.toFixed(2)}%   V3 ${v3Avg.toFixed(2)}%`);
  }
  console.log('');

  // Structured JSON p/ Commit 3 consumo programático
  const outJson = {
    data: new Date().toISOString(),
    v1_path: v1Path,
    v3_path: v3Path,
    n_validos: validos.length,
    v1: { delta_medio_abs: v1MedAbs, em_5pct: v1_5, em_10pct: v1_10 },
    v3: { delta_medio_abs: v3MedAbs, em_5pct: v3_5, em_10pct: v3_10, em_meta_escritorio: v3_meta },
    vs_pjc: { v3_vence: v3Win, v1_vence: v1Win, empates },
    casos: validos.map((c1) => {
      const c3 = v3ByArq.get(c1.arquivo)!;
      return {
        arquivo: c1.arquivo,
        nome_curto: shortName(c1.nome, c1.arquivo),
        pjc_liquido: c1.pjc_liquido,
        v1_delta_liquido: c1.delta_liquido,
        v3_delta_liquido: c3.delta_liquido,
        v1_delta_inss: c1.delta_inss,
        v3_delta_inss: c3.delta_inss,
        v1_delta_ir: c1.delta_ir,
        v3_delta_ir: c3.delta_ir,
        vencedor_vs_pjc: vencedor(c1.delta_liquido, c3.delta_liquido),
        v3_meta_escritorio: c3.delta_liquido >= -1 && c3.delta_liquido <= 5 ? '✅' : (c3.delta_liquido >= -10 && c3.delta_liquido <= 10 ? '⚠️' : '❌'),
        regime: c1.regime,
        periodo_meses: c1.periodo_meses,
      };
    }),
  };

  const outPath = path.join(path.dirname(v1Path), 'calibrate-compare.json');
  fs.writeFileSync(outPath, JSON.stringify(outJson, null, 2));
  console.log(`JSON estruturado salvo em: ${outPath}`);
}

main();
