// supabase/functions/_shared/holerite-mapper-v2/sync-mode.ts
//
// API SÍNCRONA do mapper V2 — usada pelos mappers edge (holerite-via-varejo,
// holerite-generico) que implementam `Mapper.mapear(doc): T | null` sync.
//
// FLUXO:
//   1. SEED_INDEX (estático em-memória, build-time)
//   2. ALIAS_CACHE (carregado via prewarmAliasCacheIfStale ANTES do mapper
//      rodar — handler chama awaiteado, mapper consome sync)
//   3. NAO_CLASSIFICADO
//
// Dívida técnica registrada:
//   `Mapper.mapear()` é sync por contrato compartilhado com 5 mappers
//   não-ontologia (cartão-ponto, ctps, etc.). Tornar async cascateia em
//   9+ arquivos. Workaround: cache module-init com TTL 5min, pre-warmed
//   pelo handler. Aliases promovidos via grid podem demorar até 5min
//   pra propagar entre workers. Migrar pra async quando volume justificar
//   (ou push-invalidation via tabela `cache_invalidations`).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type {
  ClassificacaoRubrica,
  OntologiaSeedV2,
  CategoriaOntologiaRubricaV2,
} from '../../../../src/features/data-extraction/parsers/holerite/ontologia-rubricas-v2.ts';
import { CATEGORIA_V1_TO_V2 } from '../../../../src/features/data-extraction/parsers/holerite/ontologia-rubricas-v2.ts';
import seedV2 from './ontologia-v2.json' with { type: 'json' };

// =========================================================================
// Index em-memória do seed: normalized_key + alias → classificação
// =========================================================================
export type ClassificacaoBase = Omit<ClassificacaoRubrica, 'alias_original'>;

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
      if (!m.has(a)) m.set(a, entry);
    }
  }
  return m;
})();

// Index reverso: chave (normalized_key OU alias) → alias_original da rubrica
// canônica. Usado pelo adapter v1-compat pra derivar `texto_canonico` no
// shape antigo.
export const ALIAS_TO_CANONICAL: Map<string, string> = (() => {
  const m = new Map<string, string>();
  const seed = seedV2 as OntologiaSeedV2;
  for (const r of seed.rubricas) {
    m.set(r.normalized_key, r.alias_original);
    for (const a of r.aliases) {
      if (!m.has(a)) m.set(a, r.alias_original);
    }
  }
  return m;
})();

// Index reverso: chave → normalized_key da rubrica canônica. Usado pelo
// adapter pra distinguir match "exato em normalized_key" vs "match via alias".
const ALIAS_TO_NORMALIZED_KEY: Map<string, string> = (() => {
  const m = new Map<string, string>();
  const seed = seedV2 as OntologiaSeedV2;
  for (const r of seed.rubricas) {
    m.set(r.normalized_key, r.normalized_key);
    for (const a of r.aliases) {
      if (!m.has(a)) m.set(a, r.normalized_key);
    }
  }
  return m;
})();

export function canonicalKeyOf(chave: string): string | undefined {
  return ALIAS_TO_NORMALIZED_KEY.get(chave);
}

// =========================================================================
// Normalização (1:1 com gen-ontologia-v2-from-v1.ts e o mapper async)
// =========================================================================
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// =========================================================================
// Cache de aliases aprendidos (module-init, TTL 5min)
// =========================================================================
let ALIAS_CACHE: Map<string, ClassificacaoBase> | null = null;
let ALIAS_CACHE_LOADED_AT = 0;
const ALIAS_CACHE_TTL_MS = 5 * 60 * 1000;

export async function prewarmAliasCacheIfStale(
  supabase: SupabaseClient,
): Promise<void> {
  const now = Date.now();
  if (ALIAS_CACHE && now - ALIAS_CACHE_LOADED_AT < ALIAS_CACHE_TTL_MS) return;

  const { data, error } = await supabase
    .from('rubrica_aliases_ativos')
    .select(
      'normalized_key, categoria, tipo_pjecalc, base_dsr, base_13, base_ferias, incluido, observacao_juridica, confidence',
    );

  if (error) {
    // Falha de leitura ≠ crash. Mapper continua só com seed (mais NAO_CLASSIFICADO
    // mas sem regressão de classificação correta).
    console.warn('[mapper-v2/sync] falha pre-warm aliases:', error.message);
    return;
  }

  const next = new Map<string, ClassificacaoBase>();
  for (const row of data ?? []) {
    const cat = (CATEGORIA_V1_TO_V2[row.categoria] ??
      row.categoria) as CategoriaOntologiaRubricaV2;
    next.set(row.normalized_key, {
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
  ALIAS_CACHE = next;
  ALIAS_CACHE_LOADED_AT = now;
}

/**
 * Invalida o cache. Útil em testes — produção nunca chama isso (TTL natural).
 */
export function _resetAliasCacheForTests(): void {
  ALIAS_CACHE = null;
  ALIAS_CACHE_LOADED_AT = 0;
}

// =========================================================================
// Lookup sync (usado por Mapper.mapear)
// =========================================================================
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

export function classificarRubricaSync(descricao: string): ClassificacaoRubrica {
  const normalized_key = normalize(descricao);
  if (!normalized_key) return makeUnknown(descricao, '');

  const seedHit = SEED_INDEX.get(normalized_key);
  if (seedHit) return { ...seedHit, alias_original: descricao };

  if (ALIAS_CACHE) {
    const aliasHit = ALIAS_CACHE.get(normalized_key);
    if (aliasHit) return { ...aliasHit, alias_original: descricao };
  }

  return makeUnknown(descricao, normalized_key);
}

/**
 * Classifica em lote, modo síncrono — assume que prewarmAliasCacheIfStale()
 * já foi chamado pelo handler antes do mapper invocar mapear(). Sem prewarm,
 * só usa SEED_INDEX (degradação aceitável).
 */
export function classificarLoteSeedOnly(
  descricoes: readonly string[],
): ClassificacaoRubrica[] {
  return descricoes.map(classificarRubricaSync);
}
