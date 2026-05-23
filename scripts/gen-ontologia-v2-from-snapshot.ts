// scripts/gen-ontologia-v2-from-snapshot.ts
//
// Regenera supabase/functions/_shared/holerite-mapper-v2/ontologia-v2.json
// a partir de duas fontes (ambas build-time, fora do runtime):
//   1. scripts/ontologia-v1-snapshot.ts — curadoria histórica do escritório
//      (145 sinônimos) congelada como dado. Pra adicionar rubrica nova
//      (XLSX atualizada), editar este snapshot adicionando entry no mesmo
//      formato (texto_canonico + sinonimos + categoria + observacao_juridica?).
//   2. scripts/ontologia-v2-overrides.json — renames V1→V2, regras por
//      categoria (tipo_pjecalc, base_*), extra_aliases pra cobrir casos
//      descobertos em prod fora da curadoria original.
//
// USO:
//   npm run gen:ontologia      → regenera o JSON
//   npm run validate:ontologia → valida o JSON regenerado
//
// Idempotente. Roda do zero a cada chamada. Aprendizado contínuo
// (rubrica_aliases em banco) NÃO é afetado — vive no banco, não no seed.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ONTOLOGIA,
  type RubricaCanonica,
} from './ontologia-v1-snapshot.ts';

// ──────────────────────────────────────────────────────────────────────────
// Paths
// ──────────────────────────────────────────────────────────────────────────
const ROOT = process.cwd();
const OVERRIDES_PATH = resolve(ROOT, 'scripts/ontologia-v2-overrides.json');
const OUT_PATH = resolve(
  ROOT,
  'supabase/functions/_shared/holerite-mapper-v2/ontologia-v2.json',
);

// ──────────────────────────────────────────────────────────────────────────
// normalize() — DEVE bater 1:1 com o do mapper edge (holerite-mapper-v2)
// ──────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────
// Tipos do overrides (paralelos ao ontologia-v2-overrides.json)
// ──────────────────────────────────────────────────────────────────────────
interface CategoriaRule {
  tipo_pjecalc: string;
  base_dsr: boolean;
  base_13: boolean;
  base_ferias: boolean;
  incluido: boolean;
  placeholder: boolean;
}

interface ExtraAliasEntry {
  alias: string;
  fonte: string;
  razao: string;
}

interface Overrides {
  category_renames: Record<string, string>;
  categoria_rules: Record<string, CategoriaRule>;
  extra_aliases: Record<string, ExtraAliasEntry[] | { $comment?: string }>;
}

function loadOverrides(): Overrides {
  const raw = readFileSync(OVERRIDES_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  return {
    category_renames: parsed.category_renames,
    categoria_rules: parsed.categoria_rules,
    extra_aliases: parsed.extra_aliases ?? {},
  };
}

function extractExtraAliases(
  raw: ExtraAliasEntry[] | { $comment?: string } | undefined,
): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => e.alias);
}

// ──────────────────────────────────────────────────────────────────────────
// Core: V1 → V2
// ──────────────────────────────────────────────────────────────────────────
interface RubricaSeedOut {
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
  observacao_juridica?: string;
}

function gerarRubricaV2(
  v1: RubricaCanonica,
  overrides: Overrides,
): RubricaSeedOut {
  const categoriaV1 = v1.categoria;
  const categoriaV2 = overrides.category_renames[categoriaV1];
  if (!categoriaV2) {
    throw new Error(
      `category_renames sem entrada para '${categoriaV1}' (rubrica '${v1.texto_canonico}'). Atualizar overrides.`,
    );
  }

  const rule = overrides.categoria_rules[categoriaV2];
  if (!rule) {
    throw new Error(
      `categoria_rules sem entrada para '${categoriaV2}' (rubrica '${v1.texto_canonico}'). Atualizar overrides.`,
    );
  }

  const normalized_key = normalize(v1.texto_canonico);

  // Aliases = dedup(normalized_key, normalize(sinonimos[]), extras do overrides).
  const aliasSet = new Set<string>();
  aliasSet.add(normalized_key);
  for (const s of v1.sinonimos) {
    const n = normalize(s);
    if (n) aliasSet.add(n);
  }
  const extras = extractExtraAliases(overrides.extra_aliases[normalized_key]);
  for (const a of extras) aliasSet.add(normalize(a));

  const out: RubricaSeedOut = {
    alias_original: v1.texto_canonico,
    normalized_key,
    aliases: [...aliasSet].sort(),
    categoria: categoriaV2,
    tipo_pjecalc: rule.tipo_pjecalc,
    base_dsr: rule.base_dsr,
    base_13: rule.base_13,
    base_ferias: rule.base_ferias,
    incluido: rule.incluido,
    confidence: 1.0,
    source: 'seed_v2',
  };
  if (v1.observacao_juridica) {
    out.observacao_juridica = v1.observacao_juridica;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// Validações pós-build (fail-fast antes de escrever)
// ──────────────────────────────────────────────────────────────────────────
function validarNenhumExtraAliasOrfao(
  overrides: Overrides,
  keys: Set<string>,
): void {
  const orfaos: string[] = [];
  for (const k of Object.keys(overrides.extra_aliases)) {
    if (k === '$comment') continue;
    if (!keys.has(k)) orfaos.push(k);
  }
  if (orfaos.length > 0) {
    throw new Error(
      `extra_aliases referenciam normalized_keys que não existem em V1:\n` +
        orfaos.map((k) => `  - ${k}`).join('\n') +
        `\n\nOu a rubrica V1 mudou de nome (atualizar overrides), ou typo na chave.`,
    );
  }
}

function validarColisaoCrossCategoria(rubricas: RubricaSeedOut[]): void {
  const aliasOwners = new Map<string, Set<string>>();
  for (const r of rubricas) {
    for (const a of r.aliases) {
      const owners = aliasOwners.get(a) ?? new Set<string>();
      owners.add(r.categoria);
      aliasOwners.set(a, owners);
    }
  }
  const colisoes: string[] = [];
  for (const [alias, owners] of aliasOwners) {
    if (owners.size > 1) {
      colisoes.push(`  '${alias}' → ${[...owners].join(', ')}`);
    }
  }
  if (colisoes.length > 0) {
    throw new Error(
      `Colisão cross-categoria em aliases:\n${colisoes.join('\n')}\n\n` +
        `Investigar: V1 tem sinônimo que mapeia 2 categorias diferentes (improvável — diagnosticamos zero antes), ` +
        `ou extra_aliases criou conflito.`,
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
function main(): void {
  console.log('Regenerando ontologia-v2.json a partir de V1 + overrides...\n');

  const overrides = loadOverrides();
  console.log(
    `Overrides: ${Object.keys(overrides.categoria_rules).length} categorias, ` +
      `${Object.keys(overrides.category_renames).length} renames, ` +
      `${Object.keys(overrides.extra_aliases).filter((k) => k !== '$comment').length} extras`,
  );

  // Gera rubricas a partir do V1
  const rubricas: RubricaSeedOut[] = ONTOLOGIA.map((v1) =>
    gerarRubricaV2(v1, overrides),
  );

  // Validações
  const keysSet = new Set(rubricas.map((r) => r.normalized_key));
  validarNenhumExtraAliasOrfao(overrides, keysSet);
  validarColisaoCrossCategoria(rubricas);

  // Monta o objeto categorias (inclui placeholders)
  const categorias: Record<
    string,
    Pick<CategoriaRule, 'tipo_pjecalc' | 'base_dsr' | 'base_13' | 'base_ferias' | 'incluido'>
  > = {};
  for (const [cat, rule] of Object.entries(overrides.categoria_rules)) {
    categorias[cat] = {
      tipo_pjecalc: rule.tipo_pjecalc,
      base_dsr: rule.base_dsr,
      base_13: rule.base_13,
      base_ferias: rule.base_ferias,
      incluido: rule.incluido,
    };
  }

  const seed = {
    version: '2.0.0',
    generated_at: new Date().toISOString(),
    source:
      'scripts/gen-ontologia-v2-from-snapshot.ts a partir de scripts/ontologia-v1-snapshot.ts + scripts/ontologia-v2-overrides.json',
    categorias,
    rubricas: rubricas.sort((a, b) => a.normalized_key.localeCompare(b.normalized_key)),
  };

  // Stats
  const totalAliases = new Set<string>();
  for (const r of rubricas) for (const a of r.aliases) totalAliases.add(a);
  const comObs = rubricas.filter((r) => r.observacao_juridica).length;
  const placeholders = Object.entries(overrides.categoria_rules)
    .filter(([, r]) => r.placeholder)
    .map(([c]) => c);

  console.log(`\nResultado:`);
  console.log(`  ${rubricas.length} rubricas (V1 ONTOLOGIA = ${ONTOLOGIA.length})`);
  console.log(`  ${totalAliases.size} aliases únicos`);
  console.log(`  ${comObs} rubricas com observacao_juridica`);
  console.log(`  ${placeholders.length} categorias placeholder (sem rubrica V1): ${placeholders.join(', ') || '(nenhuma)'}`);

  // Escreve o JSON
  writeFileSync(OUT_PATH, JSON.stringify(seed, null, 2) + '\n', 'utf-8');
  console.log(`\n✅ Escrito em ${OUT_PATH}`);
}

main();
