// scripts/validate-ontologia-v2.ts
//
// Validador do seed JSON. Roda no CI/pre-commit.
// FALHA o build se:
//   - duplicate normalized_key entre rubricas
//   - alias auto-gerado colidindo entre categorias diferentes
//   - categoria fora do enum
//   - flags base_dsr/base_13/base_ferias incoerentes com tipo_pjecalc
//
// NOTA (Sprint 3c — cutover V1→V2): a versão anterior continha um gate
// "cobertura V1→V2" que importava `ONTOLOGIA` de `_shared/ontologia-rubricas/`
// V1. Com a deleção do V1 neste commit, a fonte sumiu e o gate junto.
// O snapshot atual do `ontologia-v2.json` é a verdade canônica. Regeneração
// futura (a partir de XLSX nova ou edição manual) precisa de novo gate
// específico se quiser proteção semelhante.
//
// Uso:
//   npx tsx scripts/validate-ontologia-v2.ts
//   npm run validate:ontologia

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SEED_PATH = resolve(
  process.cwd(),
  'supabase/functions/_shared/holerite-mapper-v2/ontologia-v2.json',
);

const CATEGORIAS_VALIDAS = new Set([
  'MINIMO_GARANTIDO',
  'SALARIO_SUBSTITUICAO',
  'COMISSOES_PRODUTOS',
  'COMISSOES_SERVICOS',
  'DSR_S_COMISSOES',
  'PREMIOS',
  'DESCONSIDERADAS',
]);

const TIPOS_VALIDOS = new Set([
  'SALARIO',
  'SALARIO_SUBSTITUICAO',
  'COMISSAO',
  'DSR',
  'PREMIO',
  'DESCONSIDERAR',
]);

interface Rubrica {
  alias_original: string;
  normalized_key: string;
  aliases: string[];
  categoria: string;
  tipo_pjecalc: string;
  base_dsr: boolean;
  base_13: boolean;
  base_ferias: boolean;
  incluido: boolean;
  confidence: number;
  source: string;
}

interface Seed {
  version: string;
  rubricas: Rubrica[];
}

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function main() {
  const raw = readFileSync(SEED_PATH, 'utf-8');
  const seed = JSON.parse(raw) as Seed;

  console.log(`Validando seed v${seed.version} — ${seed.rubricas.length} rubricas...`);

  // 1. Categoria + tipo válidos
  for (const r of seed.rubricas) {
    if (!CATEGORIAS_VALIDAS.has(r.categoria)) {
      fail(`Categoria inválida em '${r.alias_original}': ${r.categoria}`);
    }
    if (!TIPOS_VALIDOS.has(r.tipo_pjecalc)) {
      fail(`tipo_pjecalc inválido em '${r.alias_original}': ${r.tipo_pjecalc}`);
    }
    if (r.confidence < 0 || r.confidence > 1) {
      fail(`Confidence fora [0,1] em '${r.alias_original}': ${r.confidence}`);
    }
  }

  // 2. normalized_key único
  const byKey = new Map<string, Rubrica[]>();
  for (const r of seed.rubricas) {
    const arr = byKey.get(r.normalized_key) ?? [];
    arr.push(r);
    byKey.set(r.normalized_key, arr);
  }
  const dups = [...byKey.entries()].filter(([, arr]) => arr.length > 1);
  if (dups.length > 0) {
    for (const [k, arr] of dups) {
      console.error(`  duplicate normalized_key='${k}':`);
      for (const r of arr) console.error(`    - '${r.alias_original}' → ${r.categoria}`);
    }
    fail(`${dups.length} duplicate normalized_key(s) — resolver na planilha ou no gerador`);
  }

  // 3. Aliases NÃO colidem cross-categoria
  const aliasIndex = new Map<string, Set<string>>();
  for (const r of seed.rubricas) {
    for (const a of r.aliases) {
      const set = aliasIndex.get(a) ?? new Set<string>();
      set.add(r.categoria);
      aliasIndex.set(a, set);
    }
  }
  const cross = [...aliasIndex.entries()].filter(([, cats]) => cats.size > 1);
  if (cross.length > 0) {
    for (const [a, cats] of cross) {
      console.error(`  alias '${a}' aponta para múltiplas categorias: ${[...cats].join(', ')}`);
    }
    fail(`${cross.length} alias(es) cross-categoria — ajustar gerador de abreviações`);
  }

  // 4. Coerência semântica: DESCONSIDERADAS não pode ter incluido=true
  for (const r of seed.rubricas) {
    if (r.categoria === 'DESCONSIDERADAS' && r.incluido) {
      fail(`Coerência: '${r.alias_original}' é DESCONSIDERADAS mas incluido=true`);
    }
    if (r.tipo_pjecalc === 'DESCONSIDERAR' && r.incluido) {
      fail(`Coerência: '${r.alias_original}' tem tipo DESCONSIDERAR mas incluido=true`);
    }
  }

  // 5. (removido em Sprint 3c) gate de cobertura V1→V2.
  // V1 (_shared/ontologia-rubricas/) foi deletado neste commit; sem fonte,
  // o gate ficaria vazio. Seed V2 é a verdade canônica agora.

  console.log(`✅ Validação OK`);
  console.log(`   ${seed.rubricas.length} rubricas, ${aliasIndex.size} aliases únicos`);
  console.log(`   Categorias: ${[...new Set(seed.rubricas.map((r) => r.categoria))].join(', ')}`);
}

main();
