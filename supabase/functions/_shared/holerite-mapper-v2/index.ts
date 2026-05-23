// supabase/functions/_shared/holerite-mapper-v2/index.ts
//
// Mapper de rubricas — fonte única de classificação.
// Roda no edge (Deno), service_role no contexto.
//
// FLUXO DE LOOKUP (em ordem):
//   1. Seed em-memória (96 rubricas + 258 aliases)  → confidence 1.0, source 'seed_v2'
//   2. rubrica_aliases reviewed=true                → confidence persistida
//   3. NAO_CLASSIFICADO                             → confidence 0, source 'unknown'
//
// NUNCA descarta rubrica desconhecida. NAO_CLASSIFICADO é estado válido que
// força UI a decidir antes do "Confirmar e baixar ZIP".

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type {
  ClassificacaoRubrica,
  OntologiaSeedV2,
  CategoriaOntologiaRubricaV2,
} from '../../../../src/features/data-extraction/parsers/holerite/ontologia-rubricas-v2.ts';
import { CATEGORIA_V1_TO_V2 } from '../../../../src/features/data-extraction/parsers/holerite/ontologia-rubricas-v2.ts';
import seedV2 from './ontologia-v2.json' with { type: 'json' };

// =========================================================================
// Index em-memória do seed: normalized_key + cada alias → classificação
// =========================================================================
type ClassificacaoBase = Omit<ClassificacaoRubrica, 'alias_original'>;
const SEED_INDEX: Map<string, ClassificacaoBase> = (() => {
  const m = new Map<string, ClassificacaoBase>();
  const seed = seedV2 as OntologiaSeedV2;
  for (const r of seed.rubricas) {
    const entry: ClassificacaoBase = {
      normalized_key: r.normalized_key,
      categoria: r.categoria,
      tipo_pjecalc: r.tipo_pjecalc,
      base_dsr: r.base_dsr,
      base_13: r.base_13,
      base_ferias: r.base_ferias,
      incluido: r.incluido,
      confidence: r.confidence,
      source: 'seed_v2',
      observacao_juridica: r.observacao_juridica,
      divergencia_juridica: !!r.observacao_juridica,
    };
    m.set(r.normalized_key, entry);
    for (const a of r.aliases) {
      // Aliases auto-gerados não sobrescrevem normalized_key principal.
      if (!m.has(a)) m.set(a, entry);
    }
  }
  return m;
})();

// =========================================================================
// Normalização — DEVE bater 1:1 com o gerador do seed (Python).
// =========================================================================
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// =========================================================================
// Cache de aliases por request (evita N queries quando holerite tem 30 rubricas)
// =========================================================================
type AliasCache = Map<string, ClassificacaoBase>;

export interface MapperContext {
  supabase: SupabaseClient;
  aliasCache?: AliasCache;
}

/**
 * Pré-carrega todos os aliases reviewed do banco para o contexto.
 * Chamar UMA vez no início do processamento do holerite.
 */
export async function prewarmAliasCache(ctx: MapperContext): Promise<void> {
  if (ctx.aliasCache) return;
  ctx.aliasCache = new Map();

  const { data, error } = await ctx.supabase
    .from('rubrica_aliases_ativos')
    .select(
      'normalized_key, categoria, tipo_pjecalc, base_dsr, base_13, base_ferias, incluido, observacao_juridica, confidence',
    );

  if (error) {
    // Falha de leitura ≠ crash. Mapper segue só com seed.
    console.warn('[mapper-v2] falha pre-warm aliases:', error.message);
    return;
  }

  for (const row of data ?? []) {
    const cat = (CATEGORIA_V1_TO_V2[row.categoria] ?? row.categoria) as CategoriaOntologiaRubricaV2;
    ctx.aliasCache.set(row.normalized_key, {
      normalized_key: row.normalized_key,
      categoria: cat,
      tipo_pjecalc: row.tipo_pjecalc,
      base_dsr: row.base_dsr,
      base_13: row.base_13,
      base_ferias: row.base_ferias,
      incluido: row.incluido,
      confidence: Number(row.confidence),
      source: 'user_classification',
      observacao_juridica: row.observacao_juridica ?? undefined,
      divergencia_juridica: !!row.observacao_juridica,
    });
  }
}

/**
 * Classifica uma rubrica. Nunca descarta.
 */
export async function classificarRubrica(
  descricao: string,
  ctx: MapperContext,
): Promise<ClassificacaoRubrica> {
  const normalized_key = normalize(descricao);

  if (!normalized_key) {
    return makeUnknown(descricao, '');
  }

  // 1. Seed em-memória
  const seedHit = SEED_INDEX.get(normalized_key);
  if (seedHit) {
    return { ...seedHit, alias_original: descricao };
  }

  // 2. Aliases aprendidos (cache em-memória, prewarm fez 1 query)
  if (ctx.aliasCache) {
    const aliasHit = ctx.aliasCache.get(normalized_key);
    if (aliasHit) {
      return { ...aliasHit, alias_original: descricao };
    }
  } else {
    // Fallback sem prewarm: query individual (custoso, evitar)
    const { data } = await ctx.supabase
      .from('rubrica_aliases_ativos')
      .select(
        'normalized_key, categoria, tipo_pjecalc, base_dsr, base_13, base_ferias, incluido, observacao_juridica, confidence',
      )
      .eq('normalized_key', normalized_key)
      .maybeSingle();

    if (data) {
      const cat = (CATEGORIA_V1_TO_V2[data.categoria] ?? data.categoria) as CategoriaOntologiaRubricaV2;
      return {
        alias_original: descricao,
        normalized_key,
        categoria: cat,
        tipo_pjecalc: data.tipo_pjecalc,
        base_dsr: data.base_dsr,
        base_13: data.base_13,
        base_ferias: data.base_ferias,
        incluido: data.incluido,
        confidence: Number(data.confidence),
        source: 'user_classification',
        observacao_juridica: data.observacao_juridica ?? undefined,
        divergencia_juridica: !!data.observacao_juridica,
      };
    }
  }

  // 3. Não encontrado — NAO_CLASSIFICADO (jamais descartar)
  return makeUnknown(descricao, normalized_key);
}

function makeUnknown(descricao: string, normalized_key: string): ClassificacaoRubrica {
  return {
    alias_original: descricao,
    normalized_key,
    categoria: 'NAO_CLASSIFICADO',
    tipo_pjecalc: 'INDEFINIDO',
    base_dsr: false,
    base_13: false,
    base_ferias: false,
    incluido: false,
    confidence: 0,
    source: 'unknown',
    divergencia_juridica: false,
  };
}

/**
 * Classifica em lote — única forma recomendada quando há ≥ 5 rubricas.
 * Prewarmae cache automaticamente.
 */
export async function classificarLote(
  descricoes: string[],
  ctx: MapperContext,
): Promise<ClassificacaoRubrica[]> {
  await prewarmAliasCache(ctx);
  const resultados: ClassificacaoRubrica[] = [];
  for (const d of descricoes) {
    resultados.push(await classificarRubrica(d, ctx));
  }
  return resultados;
}
