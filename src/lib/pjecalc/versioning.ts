/**
 * Sistema de Versionamento de Cálculos
 *
 * Permite salvar múltiplas versões de um cálculo (snapshots do
 * `PjeLiquidacaoResult`), listar histórico, e fazer rollback para
 * uma versão anterior criando uma nova versão baseada nela.
 *
 * Os metadados de versionamento (numero da versão, descrição, hash,
 * created_by) são persistidos dentro do próprio JSON `resultado`
 * sob a chave `_versioning`, evitando qualquer necessidade de migration.
 */

import { supabase } from '@/integrations/supabase/client';
import type { PjeLiquidacaoResult } from './engine-types';

export interface CalculoVersao {
  id: string;
  case_id: string;
  versao: number;
  descricao?: string;
  resultado_json: PjeLiquidacaoResult;
  hash: string;
  created_at: string;
  created_by?: string;
}

/**
 * Metadados de versionamento anexados ao JSON `resultado`.
 * Lidos/escritos apenas por este módulo.
 */
interface VersioningMeta {
  versao: number;
  descricao?: string;
  hash: string;
  created_by?: string;
}

interface ResultadoComVersioning {
  _versioning?: VersioningMeta;
  [k: string]: unknown;
}

interface LiquidacaoRow {
  id: string;
  case_id: string;
  resultado: ResultadoComVersioning | null;
  created_at: string;
}

const sb = () => supabase.from('pjecalc_liquidacao_resultado');

/**
 * Normaliza o JSON para hash estável (chaves ordenadas).
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => k !== '_versioning').sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

/**
 * Calcula SHA-256 hex do resultado serializado.
 * Em ambientes sem `crypto.subtle` (Node sem --experimental-fetch),
 * faz fallback para djb2 → marcado com prefixo `djb2-` para transparência.
 */
export async function calcularHash(resultado: PjeLiquidacaoResult): Promise<string> {
  const payload = stableStringify(resultado);
  const g = globalThis as { crypto?: { subtle?: SubtleCrypto } };
  if (g.crypto?.subtle) {
    const bytes = new TextEncoder().encode(payload);
    const digest = await g.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback determinístico
  let h = 5381;
  for (let i = 0; i < payload.length; i++) h = ((h << 5) + h + payload.charCodeAt(i)) | 0;
  return 'djb2-' + (h >>> 0).toString(16);
}

function rowToVersao(row: LiquidacaoRow): CalculoVersao {
  const meta = row.resultado?._versioning;
  const resultadoJson = { ...(row.resultado ?? {}) } as ResultadoComVersioning;
  delete resultadoJson._versioning;
  return {
    id: row.id,
    case_id: row.case_id,
    versao: meta?.versao ?? 1,
    descricao: meta?.descricao,
    resultado_json: resultadoJson as unknown as PjeLiquidacaoResult,
    hash: meta?.hash ?? '',
    created_at: row.created_at,
    created_by: meta?.created_by,
  };
}

async function proximaVersao(caseId: string): Promise<number> {
  const { data, error } = await sb()
    .select('resultado')
    .eq('case_id', caseId);
  if (error) throw error;
  const rows = (data ?? []) as { resultado: ResultadoComVersioning | null }[];
  const max = rows.reduce((m, r) => {
    const v = r.resultado?._versioning?.versao ?? 0;
    return v > m ? v : m;
  }, 0);
  return max + 1;
}

async function getCurrentUserId(): Promise<string | undefined> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? undefined;
}

export async function salvarVersao(
  caseId: string,
  resultado: PjeLiquidacaoResult,
  descricao?: string,
): Promise<CalculoVersao> {
  const versao = await proximaVersao(caseId);
  const hash = await calcularHash(resultado);
  const created_by = await getCurrentUserId();
  const meta: VersioningMeta = { versao, descricao, hash, created_by };
  const payload: ResultadoComVersioning = { ...(resultado as unknown as Record<string, unknown>), _versioning: meta };

  const insert = {
    case_id: caseId,
    resultado: payload,
    total_bruto: resultado.resumo?.principal_bruto,
    total_liquido: resultado.resumo?.liquido_reclamante,
    total_reclamante: resultado.resumo?.liquido_reclamante,
    total_reclamado: resultado.resumo?.total_reclamada,
    inss_segurado: resultado.resumo?.cs_segurado,
    inss_patronal: resultado.resumo?.cs_empregador,
    irrf: resultado.resumo?.ir_retido,
    honorarios: resultado.resumo?.honorarios_sucumbenciais,
    custas: resultado.resumo?.custas,
    fgts_depositar: resultado.resumo?.fgts_total,
  };

  const { data, error } = await sb()
    .insert(insert)
    .select('id, case_id, resultado, created_at')
    .single();
  if (error) throw error;
  return rowToVersao(data as LiquidacaoRow);
}

export async function listarVersoes(caseId: string): Promise<CalculoVersao[]> {
  const { data, error } = await sb()
    .select('id, case_id, resultado, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as LiquidacaoRow[];
  return rows.map(rowToVersao).sort((a, b) => b.versao - a.versao);
}

export async function obterVersao(versaoId: string): Promise<CalculoVersao | null> {
  const { data, error } = await sb()
    .select('id, case_id, resultado, created_at')
    .eq('id', versaoId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToVersao(data as LiquidacaoRow);
}

export async function rollbackParaVersao(
  caseId: string,
  versaoId: string,
): Promise<CalculoVersao> {
  const alvo = await obterVersao(versaoId);
  if (!alvo) throw new Error(`Versão ${versaoId} não encontrada`);
  if (alvo.case_id !== caseId) {
    throw new Error('Versão pertence a outro caso');
  }
  return salvarVersao(caseId, alvo.resultado_json, `rollback da versao ${alvo.versao}`);
}
