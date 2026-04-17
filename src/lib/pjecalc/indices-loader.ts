/**
 * =====================================================
 * INDICES LOADER — Supabase com fallback offline
 * =====================================================
 * Carrega séries mensais de índices (IPCA-E, SELIC, TR, INPC)
 * a partir da tabela `pjecalc_correcao_monetaria` do Supabase.
 * Quando o DB retorna vazio/erro, cai para as tabelas hardcoded
 * em `indices-fallback.ts` (séries oficiais 2015 → hoje).
 *
 * Uso:
 *   const ipca = await loadIndices('IPCA-E', '2020-01', '2024-12');
 *   // → Record<'YYYY-MM', acumulado base 100 em 2014-12>
 * =====================================================
 */
import {
  IPCA_E_ACUMULADO,
  SELIC_ACUMULADO,
  TR_ACUMULADO,
} from './indices-fallback';

export type IndiceNome = 'IPCA-E' | 'SELIC' | 'TR' | 'INPC';

/**
 * Interface mínima que o loader exige do cliente — compatível com
 * `SupabaseClient`, mas evita import do módulo real (que depende de
 * `localStorage` no carregamento). Permite injetar mocks nos testes.
 */
export interface IndicesSupabaseClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        gte: (col: string, val: string) => {
          lte: (col: string, val: string) => Promise<{
            data: Array<{ competencia: string; acumulado: number | null; valor: number }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
}

export interface LoadIndicesOptions {
  /** cliente supabase customizado (para testes ou ambientes headless) */
  client?: IndicesSupabaseClient;
  /** desabilita log de warning (para testes silenciosos) */
  silent?: boolean;
}

interface DbRow {
  competencia: string;    // ISO date (YYYY-MM-DD)
  acumulado: number | null;
  valor: number;
}

const FALLBACK_MAP: Record<IndiceNome, Record<string, number>> = {
  'IPCA-E': IPCA_E_ACUMULADO,
  'SELIC': SELIC_ACUMULADO,
  'TR': TR_ACUMULADO,
  // INPC não tem série dedicada no fallback → usa IPCA-E como melhor aproximação
  'INPC': IPCA_E_ACUMULADO,
};

function ymFromCompetencia(comp: string): string {
  // aceita "YYYY-MM-DD" ou "YYYY-MM"
  return comp.slice(0, 7);
}

function inRange(ym: string, from: string, to: string): boolean {
  return ym >= from && ym <= to;
}

function sliceFallback(
  indice: IndiceNome,
  from: string,
  to: string,
): Record<string, number> {
  const src = FALLBACK_MAP[indice];
  const out: Record<string, number> = {};
  for (const [ym, acum] of Object.entries(src)) {
    if (inRange(ym, from, to)) out[ym] = acum;
  }
  return out;
}

function logWarn(silent: boolean | undefined, msg: string): void {
  if (silent) return;
  // eslint-disable-next-line no-console
  console.warn(`[indices-loader] ${msg}`);
}

/**
 * Carrega índices acumulados do DB; cai para fallback se necessário.
 *
 * - Quando o DB retorna todos os meses do intervalo → usa DB.
 * - Quando vazio → fallback integral, warning.
 * - Quando parcial → mescla (DB tem prioridade, fallback preenche lacunas).
 * - Erro de rede/DB → fallback integral, warning.
 */
async function getDefaultClient(): Promise<IndicesSupabaseClient> {
  // Import dinâmico evita que o módulo Supabase (dependente de
  // `localStorage`) seja carregado em ambientes Node puros.
  const mod = await import('@/integrations/supabase/client');
  return mod.supabase as unknown as IndicesSupabaseClient;
}

export async function loadIndices(
  indice: IndiceNome,
  from: string,
  to: string,
  options: LoadIndicesOptions = {},
): Promise<Record<string, number>> {
  const { silent } = options;
  const client = options.client ?? (await getDefaultClient());
  const fromDate = `${from}-01`;
  // último dia do mês "to" — usa 31 para capturar qualquer fim de mês
  const [y, m] = to.split('-').map(Number);
  const toDate = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

  const fallback = sliceFallback(indice, from, to);

  let dbRows: DbRow[] = [];
  try {
    const { data, error } = await client
      .from('pjecalc_correcao_monetaria')
      .select('competencia, acumulado, valor')
      .eq('indice', indice)
      .gte('competencia', fromDate)
      .lte('competencia', toDate);
    if (error) {
      logWarn(silent, `erro DB "${indice}": ${error.message} → usando fallback`);
      return fallback;
    }
    dbRows = (data ?? []) as DbRow[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logWarn(silent, `exceção DB "${indice}": ${msg} → usando fallback`);
    return fallback;
  }

  if (dbRows.length === 0) {
    logWarn(silent, `DB vazio para "${indice}" em ${from}..${to} → usando fallback`);
    return { ...fallback };
  }

  // Mescla DB + fallback; DB tem prioridade. Só usa linhas com `acumulado` populado.
  const out: Record<string, number> = { ...fallback };
  let dbUsed = 0;
  for (const row of dbRows) {
    const ym = ymFromCompetencia(row.competencia);
    if (!inRange(ym, from, to)) continue;
    if (row.acumulado == null || !Number.isFinite(row.acumulado)) continue;
    out[ym] = row.acumulado;
    dbUsed += 1;
  }

  if (dbUsed === 0) {
    logWarn(silent, `DB sem "acumulado" populado para "${indice}" → usando fallback`);
    return fallback;
  }

  // detectar parcialidade
  const fallbackMonths = Object.keys(fallback).length;
  if (dbUsed < fallbackMonths) {
    logWarn(
      silent,
      `DB parcial para "${indice}" (${dbUsed}/${fallbackMonths}) → mesclado com fallback`,
    );
  }

  return out;
}
