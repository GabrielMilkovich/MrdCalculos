/**
 * Audit de paridade: parser ADP × mapeamento grupos planilha MRD.
 *
 * Lê todos os fixtures ficha-*.txt, roda o parser determinístico e
 * classifica cada rubrica nos grupos da planilha.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFichaFinanceiraDeterministico } from './supabase/functions/_shared/parsers/ficha-financeira-deterministic';
import { classificarRubrica, CODIGO_PARA_GRUPO, type GrupoExportCSV } from './src/features/data-extraction/export/per-doc/grupos-planilha-dsr';

const FIXTURES_DIR = path.resolve(process.cwd(), 'supabase/functions/_shared/parsers/_fixtures');

interface RubricaAcumulada {
  codigo: string;
  denominacoes: Set<string>;
  classificacoes: Set<string>; // PGTO/DESC
  grupos: Set<GrupoExportCSV>;
  metodos: Set<string>;
  confiancas: Set<string>;
  motivos: Set<string>;
  anos: Set<number>;
  fixtures: Set<string>;
  valor_total_por_ano: Map<number, number>;
}

const acumulado = new Map<string, RubricaAcumulada>();

const fixtures = fs.readdirSync(FIXTURES_DIR)
  .filter(f => f.startsWith('ficha-') && f.endsWith('.txt'))
  .sort();

console.log(`\n=== FIXTURES ENCONTRADOS: ${fixtures.length} ===`);
fixtures.forEach(f => console.log(`  - ${f}`));

for (const fixture of fixtures) {
  const fullPath = path.join(FIXTURES_DIR, fixture);
  const text = fs.readFileSync(fullPath, 'utf8');
  const result = parseFichaFinanceiraDeterministico(text);

  console.log(`\n===========================================================`);
  console.log(`FIXTURE: ${fixture}`);
  console.log(`===========================================================`);

  if (!result) {
    console.log('  (parser retornou null)');
    continue;
  }

  console.log(`Ano: ${result.ano}, Empresa: ${result.empresa}, Empregado: ${result.empregado}`);
  console.log(`Rubricas: ${result.rubricas.length}`);
  console.log(`Meta: ${JSON.stringify(result._meta)}`);
  console.log();
  console.log('codigo | classif | grupo                 | met/conf  | denominacao                              | total_ano');
  console.log('-------+---------+-----------------------+-----------+------------------------------------------+----------');

  for (const r of result.rubricas) {
    // só consideramos PGTO/DESC; o parser já filtra BASE/ENCAR/OUTRO/PROV/INFO
    const cls = classificarRubrica(r.codigo, r.denominacao);
    const total = r.valores_mensais.reduce((s, v) => s + v.valor, 0);

    console.log(
      `${r.codigo.padEnd(6)} | ${r.classificacao.padEnd(7)} | ${cls.grupo.padEnd(21)} | ${cls.metodo.padEnd(5)}/${cls.confianca.padEnd(3)} | ${r.denominacao.slice(0, 40).padEnd(40)} | ${total.toFixed(2)}`
    );

    let acc = acumulado.get(r.codigo);
    if (!acc) {
      acc = {
        codigo: r.codigo,
        denominacoes: new Set(),
        classificacoes: new Set(),
        grupos: new Set(),
        metodos: new Set(),
        confiancas: new Set(),
        motivos: new Set(),
        anos: new Set(),
        fixtures: new Set(),
        valor_total_por_ano: new Map(),
      };
      acumulado.set(r.codigo, acc);
    }
    acc.denominacoes.add(r.denominacao);
    acc.classificacoes.add(r.classificacao);
    acc.grupos.add(cls.grupo);
    acc.metodos.add(cls.metodo);
    acc.confiancas.add(cls.confianca);
    acc.motivos.add(cls.motivo);
    acc.anos.add(result.ano);
    acc.fixtures.add(fixture);
    acc.valor_total_por_ano.set(
      result.ano,
      (acc.valor_total_por_ano.get(result.ano) ?? 0) + total
    );
  }
}

// ── Consolidado ──
console.log('\n\n===========================================================');
console.log('TABELA CONSOLIDADA (por código)');
console.log('===========================================================\n');
console.log('codigo | classif       | grupo                 | met       | conf  | anos        | denominacao                                                  | mapeado_direto?');
console.log('-------+---------------+-----------------------+-----------+-------+-------------+--------------------------------------------------------------+----------------');

const sortedCodes = [...acumulado.keys()].sort();
for (const codigo of sortedCodes) {
  const a = acumulado.get(codigo)!;
  const anos = [...a.anos].sort().join(',');
  const denom = [...a.denominacoes].join(' | ').slice(0, 60);
  const classifs = [...a.classificacoes].join('/');
  const grupos = [...a.grupos].join('/');
  const metodos = [...a.metodos].join('/');
  const confs = [...a.confiancas].join('/');
  const mapeadoDireto = CODIGO_PARA_GRUPO[codigo] ? `SIM(${CODIGO_PARA_GRUPO[codigo]})` : 'NAO';
  console.log(
    `${codigo.padEnd(6)} | ${classifs.padEnd(13)} | ${grupos.padEnd(21)} | ${metodos.padEnd(9)} | ${confs.padEnd(5)} | ${anos.padEnd(11)} | ${denom.padEnd(60)} | ${mapeadoDireto}`
  );
}

// ── Análise: rubricas suspeitas ──
console.log('\n\n===========================================================');
console.log('ANÁLISE: SUSPEITAS DE MIS-CLASSIFICAÇÃO');
console.log('===========================================================\n');

const suspeitas: Array<{ codigo: string; motivo: string; denominacao: string; grupo_atual: string }> = [];

for (const codigo of sortedCodes) {
  const a = acumulado.get(codigo)!;
  const denom = [...a.denominacoes][0];
  const grupos = [...a.grupos];
  const metodos = [...a.metodos];
  const confs = [...a.confiancas];
  const classifs = [...a.classificacoes];

  // Caso 1: PGTO classificado como desconsiderado via fallback (sem código mapeado e sem nome batendo)
  if (classifs.includes('PGTO') && grupos.includes('desconsiderado') && metodos.includes('fallback')) {
    suspeitas.push({
      codigo,
      motivo: 'PGTO virou desconsiderado por FALLBACK (sem código direto, sem nome bater).',
      denominacao: denom,
      grupo_atual: grupos.join('/'),
    });
  }

  // Caso 2: PGTO classificado como desconsiderado por código direto — pode estar OK (13º, férias, etc) ou não
  if (classifs.includes('PGTO') && grupos.includes('desconsiderado') && metodos.includes('codigo')) {
    // Só destaca se o nome NÃO sugere desconsiderado
    const denomLow = denom.toLowerCase();
    const looksDesc = /13|f[eé]rias|ferias|aviso|prev|m[eé]dia|abono|aux[ií]lio|noturn|extra|hora|inss|ir|fgts|adto|adiantamento|insufic|carn[eê]|estab|reemb|seguro|odonto|alimenta|sind|empr[eé]stimo|unimed|plr|particip|conv[eê]nio|saude|estabili|sindic|matern|patern/i.test(denomLow);
    if (!looksDesc) {
      suspeitas.push({
        codigo,
        motivo: 'PGTO desconsiderado por código direto, mas nome não parece descartável.',
        denominacao: denom,
        grupo_atual: grupos.join('/'),
      });
    }
  }

  // Caso 3: classificação por nome_fuzzy (confiança baixa) — vale revisar
  if (metodos.includes('nome_fuzzy')) {
    suspeitas.push({
      codigo,
      motivo: 'Classificado por FUZZY (Levenshtein, confiança baixa).',
      denominacao: denom,
      grupo_atual: grupos.join('/'),
    });
  }

  // Caso 4: classificação por substring (confiança média) — vale destacar pra revisão
  if (metodos.includes('nome_substring') && !metodos.includes('codigo')) {
    suspeitas.push({
      codigo,
      motivo: 'Classificado por SUBSTRING (confiança média, sem código direto).',
      denominacao: denom,
      grupo_atual: grupos.join('/'),
    });
  }
}

for (const s of suspeitas) {
  console.log(`[${s.codigo}] ${s.denominacao} → ${s.grupo_atual}`);
  console.log(`   ${s.motivo}`);
}

console.log(`\nTotal suspeitas: ${suspeitas.length}`);

// ── Análise: distribuição final ──
console.log('\n\n===========================================================');
console.log('DISTRIBUIÇÃO FINAL POR GRUPO');
console.log('===========================================================\n');

const porGrupo = new Map<string, string[]>();
for (const codigo of sortedCodes) {
  const a = acumulado.get(codigo)!;
  for (const g of a.grupos) {
    if (!porGrupo.has(g)) porGrupo.set(g, []);
    porGrupo.get(g)!.push(`${codigo} - ${[...a.denominacoes][0].slice(0, 50)}`);
  }
}

for (const [g, rubs] of [...porGrupo.entries()].sort()) {
  console.log(`\n--- ${g} (${rubs.length} rubricas) ---`);
  rubs.forEach(r => console.log(`  ${r}`));
}

console.log('\n=== FIM ===\n');
