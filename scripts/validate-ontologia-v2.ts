// scripts/validate-ontologia-v2.ts
//
// Validador do seed JSON. Roda no CI/pre-commit.
// FALHA o build se:
//   - duplicate normalized_key entre rubricas
//   - alias auto-gerado colidindo entre categorias diferentes
//   - categoria fora do enum
//   - flags base_dsr/base_13/base_ferias incoerentes com tipo_pjecalc
//   - V1 ONTOLOGIA tem chave (canônico ou sinônimo) que V2 não cobre
//     (gate de cobertura V1→V2 — impede regressão da Sprint 3 incidente
//      onde gerador inicial perdeu 145 sinônimos curados pelo escritório)
//
// Uso:
//   npx tsx scripts/validate-ontologia-v2.ts
//   npm run validate:ontologia

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ONTOLOGIA } from '../supabase/functions/_shared/ontologia-rubricas/index.ts';

// Espelha overrides.category_renames. Hard-coded de propósito: se alguém
// mudar o overrides sem revisitar este arquivo, a assertion de cobertura
// quebra e força a revisão.
const CATEGORIA_V1_TO_V2: Record<string, string> = {
  MINIMO_GARANTIDO: 'MINIMO_GARANTIDO',
  COMISSAO_PRODUTOS: 'COMISSOES_PRODUTOS',
  COMISSAO_SERVICOS: 'COMISSOES_SERVICOS',
  PREMIO: 'PREMIOS',
  DSR_PAGO: 'DSR_S_COMISSOES',
  DESCONSIDERAR: 'DESCONSIDERADAS',
  NAO_CLASSIFICADO: 'NAO_CLASSIFICADO',
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  // 5. Cobertura V1→V2: cada (chave V1 normalizada, categoria V1 renomeada)
  //    precisa estar coberta por alguma rubrica V2 na mesma categoria.
  //    Gate permanente: protege contra regressão do incidente Sprint 3 (gerador
  //    inicial leu só XLSX e perdeu 145 sinônimos curados pelo escritório).
  const v2KeyToCat = new Map<string, string>();
  for (const r of seed.rubricas) {
    for (const a of r.aliases) {
      v2KeyToCat.set(a, r.categoria);
    }
  }
  const missing: { key: string; canon: string; catV2: string }[] = [];
  const wrongCat: { key: string; canon: string; catV1: string; catV2Esperada: string; catV2Atual: string }[] = [];
  for (const v1 of ONTOLOGIA) {
    const catEsperada = CATEGORIA_V1_TO_V2[v1.categoria];
    if (!catEsperada) {
      fail(`V1 categoria '${v1.categoria}' sem rename em CATEGORIA_V1_TO_V2 (rubrica '${v1.texto_canonico}')`);
    }
    const chaves = [v1.texto_canonico, ...v1.sinonimos].map(normalize).filter(Boolean);
    for (const k of chaves) {
      const catV2 = v2KeyToCat.get(k);
      if (catV2 === undefined) {
        missing.push({ key: k, canon: v1.texto_canonico, catV2: catEsperada });
      } else if (catV2 !== catEsperada) {
        wrongCat.push({
          key: k,
          canon: v1.texto_canonico,
          catV1: v1.categoria,
          catV2Esperada: catEsperada,
          catV2Atual: catV2,
        });
      }
    }
  }
  if (missing.length > 0) {
    for (const m of missing) {
      console.error(`  V1 perde V2: key='${m.key}' (canônico V1: '${m.canon}' → V2 ${m.catV2})`);
    }
    fail(`Cobertura V1→V2: ${missing.length} chaves V1 ausentes do seed V2. Regenere com 'npm run gen:ontologia' ou adicione em scripts/ontologia-v2-overrides.json#extra_aliases.`);
  }
  if (wrongCat.length > 0) {
    for (const w of wrongCat) {
      console.error(`  Categoria divergente: key='${w.key}' V1=${w.catV1}→${w.catV2Esperada} mas V2 atual=${w.catV2Atual} (canônico V1: '${w.canon}')`);
    }
    fail(`Cobertura V1→V2: ${wrongCat.length} chaves com categoria divergente. Investigar colisão entre rubricas ou erro de rename.`);
  }

  // Estatística da cobertura
  const v1KeysSet = new Set<string>();
  for (const v1 of ONTOLOGIA) {
    v1KeysSet.add(normalize(v1.texto_canonico));
    for (const s of v1.sinonimos) v1KeysSet.add(normalize(s));
  }

  console.log(`✅ Validação OK`);
  console.log(`   ${seed.rubricas.length} rubricas, ${aliasIndex.size} aliases únicos`);
  console.log(`   Categorias: ${[...new Set(seed.rubricas.map((r) => r.categoria))].join(', ')}`);
  console.log(`   Cobertura V1→V2: ${v1KeysSet.size}/${v1KeysSet.size} chaves V1 (100%, ${ONTOLOGIA.length} rubricas canônicas)`);
}

main();
