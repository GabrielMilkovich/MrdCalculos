// =====================================================
// SERVIÇO: Legal Basis Resolver
// Busca regras/fontes do banco para anexar ao cálculo
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type { LegalBasisEntry, LegalRule, ReferenceTable } from './types';
import { logger } from '@/lib/logger';

// Cache em memória para sessão
let rulesCache: LegalRule[] | null = null;
let tablesCache: Map<string, ReferenceTable[]> | null = null;

export async function loadLegalRules(): Promise<LegalRule[]> {
  if (rulesCache) return rulesCache;
  
  const { data, error } = await supabase
    .from('legal_rules')
    .select('*')
    .eq('ativo', true)
    .order('prioridade', { ascending: false });
  
  if (error) {
    logger.error('Erro ao carregar regras legais', { error: String(error) });
    return [];
  }
  
  rulesCache = (data ?? []) as unknown as LegalRule[];
  return rulesCache;
}

export async function loadReferenceTables(nome: string, competencia?: string): Promise<ReferenceTable[]> {
  const cacheKey = `${nome}_${competencia || 'all'}`;
  
  if (tablesCache?.has(cacheKey)) {
    return tablesCache.get(cacheKey)!;
  }
  
  let query = supabase
    .from('reference_tables')
    .select('*')
    .eq('nome', nome)
    .eq('ativo', true)
    .order('competencia', { ascending: false });
  
  if (competencia) {
    query = query.lte('competencia', competencia);
  }
  
  const { data, error } = await query.limit(1);
  
  if (error) {
    logger.error('Erro ao carregar tabela de referencia', { error: String(error) });
    return [];
  }
  
  const result = (data ?? []) as unknown as ReferenceTable[];
  
  if (!tablesCache) tablesCache = new Map();
  tablesCache.set(cacheKey, result);
  
  return result;
}

/**
 * Resolve a base legal para um código de rubrica
 */
export function resolveLegalBasis(
  rubricaCodigo: string,
  rules: LegalRule[]
): LegalBasisEntry[] {
  // Mapear código de rubrica para código de regra
  const codeMap: Record<string, string[]> = {
    'HE50': ['R_HORA_EXTRA_50'],
    'HE100': ['R_HORA_EXTRA_100'],
    'DSR_HE': ['R_DSR_HE'],
    'ADIC_NOT': ['R_ADICIONAL_NOTURNO'],
    'REFL_FERIAS': ['R_HORA_EXTRA_50', 'R_DSR_HE'],
    'REFL_13': ['R_13_PROPORCIONAL'],
    'FGTS': ['R_FGTS_DEPOSITO'],
    'MULTA_FGTS': ['R_FGTS_MULTA_40', 'R_FGTS_MULTA_20'],
    'SALDO_SAL': ['R_SALDO_SALARIO'],
    'AVISO_PREVIO': ['R_AVISO_PREVIO'],
    'FERIAS_VENC': ['R_FERIAS_VENCIDAS'],
    'FERIAS_PROP': ['R_FERIAS_PROPORCIONAIS'],
    'DECIMO_PROP': ['R_13_PROPORCIONAL'],
    'PERIC': ['R_PERICULOSIDADE'],
    'INSALUB': ['R_INSALUBRIDADE_MIN', 'R_INSALUBRIDADE_MED', 'R_INSALUBRIDADE_MAX'],
    'INSS': ['R_INSS_PROGRESSIVO'],
    'IRRF': ['R_IRRF'],
    'CORRECAO': ['R_CORRECAO_SELIC'],
    'MULTA_467': ['R_MULTA_467'],
    'MULTA_477': ['R_MULTA_477'],
  };
  
  const targetCodes = codeMap[rubricaCodigo] || [];
  
  return rules
    .filter(r => targetCodes.includes(r.codigo))
    .map(r => ({
      rule_id: r.id,
      codigo: r.codigo,
      titulo: r.titulo,
      referencia: r.referencia || '',
      link_ref: r.link_ref || undefined,
      jurisdicao: r.jurisdicao,
      descricao: r.descricao || undefined,
      formula_texto: r.formula_texto || undefined,
    }));
}

/**
 * Obtém tabela INSS para uma competência
 */
export async function getINSSTable(competencia: string): Promise<{
  faixas: { faixa_inicio: number; faixa_fim: number; aliquota: number }[];
  competencia_ref: string;
} | null> {
  const tables = await loadReferenceTables('INSS_FAIXAS', competencia);
  if (tables.length === 0) return null;
  
  const table = tables[0];
  return {
    faixas: table.dados_json as { faixa_inicio: number; faixa_fim: number; aliquota: number }[],
    competencia_ref: table.competencia,
  };
}

/**
 * Obtém tabela IRRF para uma competência
 */
export async function getIRRFTable(competencia: string): Promise<{
  faixas: { faixa_inicio: number; faixa_fim: number; aliquota: number; deducao: number }[];
  competencia_ref: string;
} | null> {
  const tables = await loadReferenceTables('IRRF_MENSAL', competencia);
  if (tables.length === 0) return null;
  
  const table = tables[0];
  return {
    faixas: table.dados_json as { faixa_inicio: number; faixa_fim: number; aliquota: number; deducao: number }[],
    competencia_ref: table.competencia,
  };
}

/**
 * Obtém salário mínimo para uma competência
 */
export async function getSalarioMinimo(competencia: string): Promise<number | null> {
  const tables = await loadReferenceTables('SALARIO_MINIMO', competencia);
  if (tables.length === 0) return null;
  
  const dados = tables[0].dados_json as { valor: number };
  return dados.valor;
}

/**
 * Invalida cache (chamar ao atualizar regras/tabelas)
 */
export function invalidateLegalCache(): void {
  rulesCache = null;
  tablesCache = null;
}
