/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import { parseFichaFinanceiraDeterministico } from './supabase/functions/_shared/parsers/ficha-financeira-deterministic';
import { classificarRubrica, type GrupoExportCSV } from './src/features/data-extraction/export/per-doc/grupos-planilha-dsr';

const FIXTURES_DIR = path.resolve(process.cwd(), 'supabase/functions/_shared/parsers/_fixtures');

interface RubricaAgg {
  codigo: string;
  denominacao: string; // primeira aparição (canônica)
  denominacoes_observadas: Set<string>;
  classificacoes: Set<string>; // PGTO/DESC
  grupos_atribuidos: Set<GrupoExportCSV>;
  metodos: Set<string>;
  confiancas: Set<string>;
  motivos: Set<string>;
  fixtures: Set<string>;
  anos: Set<number>;
  total_geral: number;
  meses_por_ano: Map<number, Map<string, number>>; // ano -> mm -> total
}

const agg = new Map<string, RubricaAgg>();
const fixtures = fs.readdirSync(FIXTURES_DIR).filter(f => f.startsWith('ficha-') && f.endsWith('.txt'));

console.log(`\n=== Fixtures encontrados (${fixtures.length}) ===`);
for (const f of fixtures) console.log('  -', f);

for (const fixture of fixtures) {
  const fullPath = path.join(FIXTURES_DIR, fixture);
  const texto = fs.readFileSync(fullPath, 'utf-8');
  const parsed = parseFichaFinanceiraDeterministico(texto);
  if (!parsed) {
    console.log(`\n[!] Parser retornou null para ${fixture}`);
    continue;
  }
  console.log(`\n=== ${fixture} (ano=${parsed.ano}, empregado=${parsed.empregado}, rubricas=${parsed.rubricas.length}) ===`);
  console.log(`     meses_detectados: ${parsed._meta.meses_detectados.join(',')}`);
  console.log(`     linhas_processadas=${parsed._meta.linhas_processadas} linhas_filtradas=${parsed._meta.linhas_filtradas}`);

  for (const r of parsed.rubricas) {
    // Classifica usando o grupo do escritório
    const cls = classificarRubrica(r.codigo, r.denominacao);
    const totalRubrica = r.valores_mensais.reduce((s, v) => s + v.valor, 0);
    const mesesStr = r.valores_mensais.map(v => `${v.competencia}=${v.valor.toFixed(2)}`).join(' ');
    console.log(
      `  ${r.codigo} | ${r.denominacao.padEnd(28)} | ${r.classificacao.padEnd(4)} | grupo=${cls.grupo.padEnd(22)} (${cls.metodo}/${cls.confianca}) | total=${totalRubrica.toFixed(2)} | ${mesesStr}`,
    );

    // Agrega
    let entry = agg.get(r.codigo);
    if (!entry) {
      entry = {
        codigo: r.codigo,
        denominacao: r.denominacao,
        denominacoes_observadas: new Set(),
        classificacoes: new Set(),
        grupos_atribuidos: new Set(),
        metodos: new Set(),
        confiancas: new Set(),
        motivos: new Set(),
        fixtures: new Set(),
        anos: new Set(),
        total_geral: 0,
        meses_por_ano: new Map(),
      };
      agg.set(r.codigo, entry);
    }
    entry.denominacoes_observadas.add(r.denominacao);
    entry.classificacoes.add(r.classificacao);
    entry.grupos_atribuidos.add(cls.grupo);
    entry.metodos.add(cls.metodo);
    entry.confiancas.add(cls.confianca);
    entry.motivos.add(cls.motivo);
    entry.fixtures.add(fixture);
    entry.anos.add(parsed.ano);
    entry.total_geral += totalRubrica;
    let mesesAno = entry.meses_por_ano.get(parsed.ano);
    if (!mesesAno) {
      mesesAno = new Map();
      entry.meses_por_ano.set(parsed.ano, mesesAno);
    }
    for (const v of r.valores_mensais) {
      mesesAno.set(v.competencia, (mesesAno.get(v.competencia) ?? 0) + v.valor);
    }
  }
}

// ── Tabela consolidada ──
console.log('\n\n=== TABELA CONSOLIDADA (por código, agregando todos os fixtures) ===\n');
const sorted = [...agg.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
for (const e of sorted) {
  const anosArr = [...e.anos].sort();
  const grupos = [...e.grupos_atribuidos].join('|');
  const denoms = [...e.denominacoes_observadas].join(' / ');
  const clas = [...e.classificacoes].join('|');
  const metodos = [...e.metodos].join('|');
  const confs = [...e.confiancas].join('|');
  console.log(
    `${e.codigo} | ${denoms.padEnd(40)} | clas=${clas.padEnd(9)} | grupo=${grupos.padEnd(22)} | ${metodos}/${confs} | anos=${anosArr.join(',')} | total=${e.total_geral.toFixed(2)}`,
  );
}

// ── Diagnóstico ──
console.log('\n\n=== DIAGNÓSTICO ===\n');

const desconsideradosSuspeitos: RubricaAgg[] = [];
const fallbacks: RubricaAgg[] = [];
const baixaConfianca: RubricaAgg[] = [];
const semCodigoMapeado: RubricaAgg[] = [];
const apenasPGTO: RubricaAgg[] = [];

for (const e of sorted) {
  if (e.classificacoes.has('PGTO')) apenasPGTO.push(e);
  if (e.metodos.has('fallback')) fallbacks.push(e);
  if (!e.metodos.has('codigo')) semCodigoMapeado.push(e);
  if (e.confiancas.has('baixa') || e.confiancas.has('media')) baixaConfianca.push(e);
  if (e.grupos_atribuidos.has('desconsiderado') && e.classificacoes.has('PGTO')) {
    desconsideradosSuspeitos.push(e);
  }
}

console.log(`Total de códigos distintos: ${sorted.length}`);
console.log(`Códigos PGTO presentes:      ${apenasPGTO.length}`);
console.log(`Códigos em fallback:         ${fallbacks.length}`);
console.log(`Códigos SEM mapping direto:  ${semCodigoMapeado.length}`);
console.log(`Códigos confiança baixa/média: ${baixaConfianca.length}`);
console.log(`PGTO classificados como desconsiderado: ${desconsideradosSuspeitos.length}`);

console.log('\n--- Códigos SEM mapping em CODIGO_PARA_GRUPO (cairam em nome_*/fallback) ---');
for (const e of semCodigoMapeado) {
  const anosArr = [...e.anos].sort();
  console.log(
    `  ${e.codigo} | "${[...e.denominacoes_observadas].join(' / ')}" | clas=${[...e.classificacoes].join('|')} | grupo=${[...e.grupos_atribuidos].join('|')} | metodo=${[...e.metodos].join('|')} | anos=${anosArr.join(',')}`,
  );
}

console.log('\n--- Códigos PGTO que caíram em DESCONSIDERADO (revisar) ---');
for (const e of desconsideradosSuspeitos) {
  const anosArr = [...e.anos].sort();
  console.log(
    `  ${e.codigo} | "${[...e.denominacoes_observadas].join(' / ')}" | clas=${[...e.classificacoes].join('|')} | metodo=${[...e.metodos].join('|')} | anos=${anosArr.join(',')} | total=${e.total_geral.toFixed(2)}`,
  );
}

console.log('\n--- Códigos PGTO em FALLBACK puro (sem código + sem nome match) ---');
for (const e of fallbacks) {
  if (!e.classificacoes.has('PGTO')) continue;
  console.log(
    `  ${e.codigo} | "${[...e.denominacoes_observadas].join(' / ')}" | clas=${[...e.classificacoes].join('|')} | motivo=${[...e.motivos].join(' || ')}`,
  );
}

console.log('\n--- Códigos PGTO em confiança BAIXA/MÉDIA (revisar manualmente) ---');
for (const e of baixaConfianca) {
  if (!e.classificacoes.has('PGTO')) continue;
  console.log(
    `  ${e.codigo} | "${[...e.denominacoes_observadas].join(' / ')}" | grupo=${[...e.grupos_atribuidos].join('|')} | metodo=${[...e.metodos].join('|')} | conf=${[...e.confiancas].join('|')} | motivo=${[...e.motivos].join(' || ')}`,
  );
}
