/**
 * =====================================================
 * PJeCalcService — CAMADA DE SERVIÇO ÚNICA
 * =====================================================
 * 
 * Toda interação entre a UI e o banco de dados pjecalc_* passa por aqui.
 * Nenhum componente React deve acessar supabase.from('pjecalc_*') diretamente.
 * 
 * Responsabilidades:
 * - CRUD tipado para todas as views pjecalc_*
 * - Orquestração do PjeCalcEngine
 * - Persistência de resultados
 * - Snapshot com fingerprint de execução
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  PjecalcParametrosRow, PjecalcParametrosInsert,
  PjecalcDadosProcessoRow, PjecalcDadosProcessoInsert,
  PjecalcFaltaRow, PjecalcFaltaInsert,
  PjecalcFeriasRow, PjecalcFeriasInsert,
  PjecalcHistoricoSalarialRow, PjecalcHistoricoSalarialInsert,
  PjecalcHistoricoOcorrenciaRow, PjecalcHistoricoOcorrenciaInsert,
  PjecalcVerbaRow, PjecalcVerbaInsert,
  PjecalcOcorrenciaRow, PjecalcOcorrenciaInsert,
  PjecalcLiquidacaoResultadoRow, PjecalcLiquidacaoResultadoInsert,
  PjecalcCartaoPontoRow,
  PjecalcFgtsConfigRow, PjecalcFgtsConfigInsert,
  PjecalcCsConfigRow, PjecalcCsConfigInsert,
  PjecalcIrConfigRow, PjecalcIrConfigInsert,
  PjecalcCorrecaoConfigRow, PjecalcCorrecaoConfigInsert,
  PjecalcHonorariosRow, PjecalcHonorariosInsert,
  PjecalcCustasConfigRow, PjecalcCustasConfigInsert,
  PjecalcMultasConfigRow,
  CompletionInput,
} from './types';

// =====================================================
// HELPER: typed query wrapper (avoids `as any` everywhere)
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromView(name: string): any {
  return supabase.from(name as any);
}

// =====================================================
// PARAMETROS
// =====================================================

export async function getParametros(caseId: string): Promise<PjecalcParametrosRow | null> {
  const { data, error } = await fromView('pjecalc_parametros')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  if (error) throw error;
  return data as PjecalcParametrosRow | null;
}

export async function upsertParametros(payload: PjecalcParametrosInsert): Promise<void> {
  const existing = await getParametros(payload.case_id);
  if (existing) {
    const { error } = await fromView('pjecalc_parametros')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await fromView('pjecalc_parametros').insert(payload);
    if (error) throw error;
  }
}

// =====================================================
// DADOS DO PROCESSO
// =====================================================

export async function getDadosProcesso(caseId: string): Promise<PjecalcDadosProcessoRow | null> {
  const { data, error } = await fromView('pjecalc_dados_processo')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  if (error) throw error;
  return data as PjecalcDadosProcessoRow | null;
}

export async function upsertDadosProcesso(payload: PjecalcDadosProcessoInsert): Promise<void> {
  const existing = await getDadosProcesso(payload.case_id);
  if (existing) {
    const { error } = await fromView('pjecalc_dados_processo')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await fromView('pjecalc_dados_processo').insert(payload);
    if (error) throw error;
  }
}

// =====================================================
// FALTAS
// =====================================================

export async function getFaltas(caseId: string): Promise<PjecalcFaltaRow[]> {
  const { data, error } = await fromView('pjecalc_faltas')
    .select('*')
    .eq('case_id', caseId)
    .order('data_inicial');
  if (error) throw error;
  return (data || []) as PjecalcFaltaRow[];
}

export async function insertFalta(payload: PjecalcFaltaInsert): Promise<void> {
  const { error } = await fromView('pjecalc_faltas').insert(payload);
  if (error) throw error;
}

export async function deleteFalta(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_faltas').delete().eq('id', id);
  if (error) throw error;
}

export async function updateFalta(id: string, updates: Partial<PjecalcFaltaInsert>): Promise<void> {
  const { error } = await fromView('pjecalc_faltas').update(updates).eq('id', id);
  if (error) throw error;
}

// =====================================================
// FÉRIAS
// =====================================================

export async function getFerias(caseId: string): Promise<PjecalcFeriasRow[]> {
  const { data, error } = await fromView('pjecalc_ferias')
    .select('*')
    .eq('case_id', caseId)
    .order('periodo_aquisitivo_inicio');
  if (error) throw error;
  return (data || []) as PjecalcFeriasRow[];
}

export async function insertFerias(payload: PjecalcFeriasInsert): Promise<void> {
  const { error } = await fromView('pjecalc_ferias').insert(payload);
  if (error) throw error;
}

export async function deleteFerias(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_ferias').delete().eq('id', id);
  if (error) throw error;
}

export async function updateFerias(id: string, updates: Partial<PjecalcFeriasInsert & { periodos_gozo?: unknown[]; prazo_dias?: number; relativas?: string }>): Promise<void> {
  const { error } = await fromView('pjecalc_ferias').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteFeriasByCaseId(caseId: string): Promise<void> {
  const { error } = await fromView('pjecalc_ferias').delete().eq('case_id', caseId);
  if (error) throw error;
}

export async function insertFeriasBatch(payloads: PjecalcFeriasInsert[]): Promise<void> {
  if (payloads.length === 0) return;
  const { error } = await fromView('pjecalc_ferias').insert(payloads);
  if (error) throw error;
}

// =====================================================
// HISTÓRICO SALARIAL
// =====================================================

export async function getHistoricoSalarial(caseId: string): Promise<PjecalcHistoricoSalarialRow[]> {
  const { data, error } = await fromView('pjecalc_historico_salarial')
    .select('*')
    .eq('case_id', caseId)
    .order('periodo_inicio');
  if (error) throw error;
  return (data || []) as PjecalcHistoricoSalarialRow[];
}

export async function insertHistoricoSalarial(payload: PjecalcHistoricoSalarialInsert): Promise<void> {
  const { error } = await fromView('pjecalc_historico_salarial').insert(payload);
  if (error) throw error;
}

export async function deleteHistoricoSalarial(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_historico_salarial').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================
// HISTÓRICO OCORRÊNCIAS (mensal)
// =====================================================

export async function getHistoricoOcorrencias(caseId: string): Promise<PjecalcHistoricoOcorrenciaRow[]> {
  const { data, error } = await fromView('pjecalc_historico_ocorrencias')
    .select('*')
    .eq('case_id', caseId)
    .order('competencia');
  if (error) throw error;
  return (data || []) as PjecalcHistoricoOcorrenciaRow[];
}

export async function insertHistoricoOcorrencia(payload: PjecalcHistoricoOcorrenciaInsert): Promise<void> {
  const { error } = await fromView('pjecalc_historico_ocorrencias').insert(payload);
  if (error) throw error;
}

// =====================================================
// VERBAS
// =====================================================

export async function getVerbas(caseId: string): Promise<PjecalcVerbaRow[]> {
  const { data, error } = await fromView('pjecalc_verbas')
    .select('*')
    .eq('case_id', caseId)
    .order('ordem');
  if (error) throw error;
  return (data || []) as PjecalcVerbaRow[];
}

export async function insertVerba(payload: PjecalcVerbaInsert): Promise<{ id: string }> {
  const { data, error } = await fromView('pjecalc_verbas')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function deleteVerba(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_verbas').delete().eq('id', id);
  if (error) throw error;
}

export async function insertVerbasBatch(payloads: PjecalcVerbaInsert[]): Promise<void> {
  if (payloads.length === 0) return;
  for (const p of payloads) {
    const { error } = await fromView('pjecalc_verbas').insert(p);
    if (error) throw error;
  }
}

export async function getCaseBasic(caseId: string): Promise<{ id: string; cliente: string; numero_processo: string | null; status: string; tags: string[] | null } | null> {
  const { data, error } = await supabase.from('cases').select('id, cliente, numero_processo, status, tags').eq('id', caseId).maybeSingle();
  if (error) throw error;
  return data;
}

// =====================================================
// OCORRÊNCIAS
// =====================================================

export async function getOcorrencias(caseId: string, verbaId?: string): Promise<PjecalcOcorrenciaRow[]> {
  let query = fromView('pjecalc_ocorrencias')
    .select('*')
    .eq('case_id', caseId)
    .order('competencia');
  if (verbaId) {
    query = query.eq('verba_id', verbaId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PjecalcOcorrenciaRow[];
}

export async function insertOcorrencia(payload: PjecalcOcorrenciaInsert): Promise<void> {
  const { error } = await fromView('pjecalc_ocorrencias').insert(payload);
  if (error) throw error;
}

export async function deleteOcorrencias(caseId: string, verbaId?: string): Promise<void> {
  let query = fromView('pjecalc_ocorrencias').delete().eq('case_id', caseId);
  if (verbaId) {
    query = query.eq('verba_id', verbaId);
  }
  const { error } = await query;
  if (error) throw error;
}

// =====================================================
// RESULTADO DA LIQUIDAÇÃO
// =====================================================

export async function getResultado(caseId: string): Promise<PjecalcLiquidacaoResultadoRow | null> {
  const { data, error } = await fromView('pjecalc_liquidacao_resultado')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PjecalcLiquidacaoResultadoRow | null;
}

export async function upsertResultado(payload: PjecalcLiquidacaoResultadoInsert): Promise<void> {
  const { error } = await fromView('pjecalc_liquidacao_resultado').insert(payload);
  if (error) throw error;
}

// =====================================================
// CARTÃO DE PONTO
// =====================================================

export async function getCartaoPonto(caseId: string): Promise<PjecalcCartaoPontoRow[]> {
  const { data, error } = await fromView('pjecalc_cartao_ponto')
    .select('*')
    .eq('case_id', caseId)
    .order('competencia');
  if (error) throw error;
  return (data || []) as PjecalcCartaoPontoRow[];
}

export async function insertCartaoPontoBatch(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await fromView('pjecalc_cartao_ponto').insert(rows);
  if (error) throw error;
}

export async function updateCartaoPonto(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await fromView('pjecalc_cartao_ponto').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteCartaoPonto(caseId: string): Promise<void> {
  const { error } = await fromView('pjecalc_cartao_ponto').delete().eq('case_id', caseId);
  if (error) throw error;
}

export async function deleteCartaoPontoById(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_cartao_ponto').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================
// CONFIG MODULES
// =====================================================

export async function getFgtsConfig(caseId: string): Promise<PjecalcFgtsConfigRow | null> {
  const { data, error } = await fromView('pjecalc_fgts_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcFgtsConfigRow | null;
}

export async function upsertFgtsConfig(payload: PjecalcFgtsConfigInsert): Promise<void> {
  const existing = await getFgtsConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_fgts_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_fgts_config').insert(payload);
  }
}

export async function getCsConfig(caseId: string): Promise<PjecalcCsConfigRow | null> {
  const { data, error } = await fromView('pjecalc_cs_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcCsConfigRow | null;
}

export async function upsertCsConfig(payload: PjecalcCsConfigInsert): Promise<void> {
  const existing = await getCsConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_cs_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_cs_config').insert(payload);
  }
}

export async function getIrConfig(caseId: string): Promise<PjecalcIrConfigRow | null> {
  const { data, error } = await fromView('pjecalc_ir_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcIrConfigRow | null;
}

export async function upsertIrConfig(payload: PjecalcIrConfigInsert): Promise<void> {
  const existing = await getIrConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_ir_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_ir_config').insert(payload);
  }
}

export async function getCorrecaoConfig(caseId: string): Promise<PjecalcCorrecaoConfigRow | null> {
  const { data, error } = await fromView('pjecalc_correcao_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcCorrecaoConfigRow | null;
}

export async function upsertCorrecaoConfig(payload: PjecalcCorrecaoConfigInsert): Promise<void> {
  const existing = await getCorrecaoConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_correcao_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_correcao_config').insert(payload);
  }
}

export async function getHonorarios(caseId: string): Promise<PjecalcHonorariosRow | null> {
  const { data, error } = await fromView('pjecalc_honorarios')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcHonorariosRow | null;
}

export async function upsertHonorarios(payload: PjecalcHonorariosInsert): Promise<void> {
  const existing = await getHonorarios(payload.case_id);
  if (existing) {
    await fromView('pjecalc_honorarios').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_honorarios').insert(payload);
  }
}

export async function getCustasConfig(caseId: string): Promise<PjecalcCustasConfigRow | null> {
  const { data, error } = await fromView('pjecalc_custas_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcCustasConfigRow | null;
}

export async function upsertCustasConfig(payload: PjecalcCustasConfigInsert): Promise<void> {
  const existing = await getCustasConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_custas_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_custas_config').insert(payload);
  }
}

export async function getMultasConfig(caseId: string): Promise<PjecalcMultasConfigRow | null> {
  try {
    const { data, error } = await fromView('pjecalc_multas_config')
      .select('*').eq('case_id', caseId).maybeSingle();
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) return null;
      console.error('[PjeCalcService] Erro inesperado em getMultasConfig:', error);
      throw error;
    }
    return data as PjecalcMultasConfigRow | null;
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return null;
    console.error('[PjeCalcService] Erro inesperado em getMultasConfig:', err);
    throw err;
  }
}

export async function upsertMultasConfig(caseId: string, payload: Record<string, unknown>): Promise<void> {
  const existing = await getMultasConfig(caseId);
  const full = { case_id: caseId, ...payload };
  if (existing) {
    await fromView('pjecalc_multas_config').update(full).eq('id', existing.id);
  } else {
    await fromView('pjecalc_multas_config').insert(full);
  }
}

// =====================================================
// PENSÃO ALIMENTÍCIA
// =====================================================

export async function getPensaoConfig(caseId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await fromView('pjecalc_pensao_config')
      .select('*').eq('case_id', caseId).maybeSingle();
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) return null;
      console.error('[PjeCalcService] Erro inesperado em getPensaoConfig:', error);
      throw error;
    }
    return data as Record<string, unknown> | null;
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return null;
    console.error('[PjeCalcService] Erro inesperado em getPensaoConfig:', err);
    throw err;
  }
}

export async function upsertPensaoConfig(caseId: string, payload: Record<string, unknown>): Promise<void> {
  const existing = await getPensaoConfig(caseId);
  const full = { case_id: caseId, ...payload };
  if (existing && existing.id) {
    await fromView('pjecalc_pensao_config').update(full).eq('id', existing.id);
  } else {
    await fromView('pjecalc_pensao_config').insert(full);
  }
}

// =====================================================
// PREVIDÊNCIA PRIVADA
// =====================================================

export async function getPrevPrivConfig(caseId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await fromView('pjecalc_previdencia_privada_config')
      .select('*').eq('case_id', caseId).maybeSingle();
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) return null;
      console.error('[PjeCalcService] Erro inesperado em getPrevPrivConfig:', error);
      throw error;
    }
    return data as Record<string, unknown> | null;
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return null;
    console.error('[PjeCalcService] Erro inesperado em getPrevPrivConfig:', err);
    throw err;
  }
}

export async function upsertPrevPrivConfig(caseId: string, payload: Record<string, unknown>): Promise<void> {
  const existing = await getPrevPrivConfig(caseId);
  const full = { case_id: caseId, ...payload };
  if (existing && existing.id) {
    await fromView('pjecalc_previdencia_privada_config').update(full).eq('id', existing.id);
  } else {
    await fromView('pjecalc_previdencia_privada_config').insert(full);
  }
}

// =====================================================
// SALÁRIO-FAMÍLIA
// =====================================================

export async function getSalarioFamiliaConfig(caseId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await fromView('pjecalc_salario_familia_config')
      .select('*').eq('case_id', caseId).maybeSingle();
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) return null;
      console.error('[PjeCalcService] Erro inesperado em getSalarioFamiliaConfig:', error);
      throw error;
    }
    return data as Record<string, unknown> | null;
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return null;
    console.error('[PjeCalcService] Erro inesperado em getSalarioFamiliaConfig:', err);
    throw err;
  }
}

export async function upsertSalarioFamiliaConfig(caseId: string, payload: Record<string, unknown>): Promise<void> {
  const existing = await getSalarioFamiliaConfig(caseId);
  const full = { case_id: caseId, ...payload };
  if (existing && existing.id) {
    await fromView('pjecalc_salario_familia_config').update(full).eq('id', existing.id);
  } else {
    await fromView('pjecalc_salario_familia_config').insert(full);
  }
}

// =====================================================
// SEGURO-DESEMPREGO
// =====================================================

export async function getSeguroConfig(caseId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await fromView('pjecalc_seguro_config')
      .select('*').eq('case_id', caseId).maybeSingle();
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) return null;
      console.error('[PjeCalcService] Erro inesperado em getSeguroConfig:', error);
      throw error;
    }
    return data as Record<string, unknown> | null;
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return null;
    console.error('[PjeCalcService] Erro inesperado em getSeguroConfig:', err);
    throw err;
  }
}

export async function upsertSeguroConfig(caseId: string, payload: Record<string, unknown>): Promise<void> {
  const existing = await getSeguroConfig(caseId);
  const full = { case_id: caseId, ...payload };
  if (existing && existing.id) {
    await fromView('pjecalc_seguro_config').update(full).eq('id', existing.id);
  } else {
    await fromView('pjecalc_seguro_config').insert(full);
  }
}

// =====================================================
// OCORRÊNCIAS — operações para grades editáveis
// =====================================================

export async function getOcorrenciasByCalculo(calculoId: string, verbaId?: string): Promise<PjecalcOcorrenciaRow[]> {
  let query = fromView('pjecalc_ocorrencias').select('*').eq('calculo_id', calculoId).order('competencia');
  if (verbaId) query = query.eq('verba_id', verbaId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PjecalcOcorrenciaRow[];
}

export async function updateOcorrencia(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await fromView('pjecalc_ocorrencias').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteOcorrenciaById(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_ocorrencias').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteOcorrenciasByCalculo(calculoId: string, verbaId: string, origem?: string): Promise<void> {
  let query = fromView('pjecalc_ocorrencias').delete().eq('calculo_id', calculoId).eq('verba_id', verbaId);
  if (origem) query = query.eq('origem', origem);
  const { error } = await query;
  if (error) throw error;
}

export async function insertOcorrenciasBatch(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await fromView('pjecalc_ocorrencias').insert(rows);
  if (error) throw error;
}

// =====================================================
// FGTS OCORRÊNCIAS
// =====================================================

export async function getFgtsOcorrencias(calculoId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await fromView('pjecalc_fgts_ocorrencias').select('*').eq('calculo_id', calculoId).order('competencia');
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

export async function updateFgtsOcorrencia(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await fromView('pjecalc_fgts_ocorrencias').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteFgtsOcorrencias(calculoId: string, origem?: string): Promise<void> {
  let query = fromView('pjecalc_fgts_ocorrencias').delete().eq('calculo_id', calculoId);
  if (origem) query = query.eq('origem', origem);
  const { error } = await query;
  if (error) throw error;
}

export async function insertFgtsOcorrenciasBatch(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await fromView('pjecalc_fgts_ocorrencias').insert(rows);
  if (error) throw error;
}

// =====================================================
// CS OCORRÊNCIAS
// =====================================================

export async function getCsOcorrencias(calculoId: string, aba: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await fromView('pjecalc_cs_ocorrencias').select('*').eq('calculo_id', calculoId).eq('aba', aba).order('competencia');
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

export async function updateCsOcorrencia(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await fromView('pjecalc_cs_ocorrencias').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteCsOcorrencias(calculoId: string, aba: string, origem?: string): Promise<void> {
  let query = fromView('pjecalc_cs_ocorrencias').delete().eq('calculo_id', calculoId).eq('aba', aba);
  if (origem) query = query.eq('origem', origem);
  const { error } = await query;
  if (error) throw error;
}

export async function insertCsOcorrenciasBatch(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await fromView('pjecalc_cs_ocorrencias').insert(rows);
  if (error) throw error;
}

// =====================================================
// FGTS SALDOS/SAQUES
// =====================================================

export async function getFgtsSaldosSaques(caseId: string): Promise<Record<string, unknown>[]> {
  try {
    const { data, error } = await fromView('pjecalc_fgts_saldos_saques').select('*').eq('case_id', caseId).order('data');
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) return [];
      console.error('[PjeCalcService] Erro inesperado em getFgtsSaldosSaques:', error);
      throw error;
    }
    return (data || []) as Record<string, unknown>[];
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return [];
    console.error('[PjeCalcService] Erro inesperado em getFgtsSaldosSaques:', err);
    throw err;
  }
}

export async function insertFgtsSaldoSaque(payload: Record<string, unknown>): Promise<void> {
  const { error } = await fromView('pjecalc_fgts_saldos_saques').insert(payload);
  if (error) throw error;
}

export async function updateFgtsSaldoSaque(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await fromView('pjecalc_fgts_saldos_saques').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteFgtsSaldoSaque(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_fgts_saldos_saques').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================
// BATCH: Carregar todos os dados de um caso
// =====================================================

export interface PjecalcAtualizacaoConfigRow {
  id: string;
  calculo_id: string;
  tipo: string; // 'correcao' | 'juros'
  regime_padrao: string | null;
  regimes: Record<string, unknown> | null;
  combinacoes_indice: string | null; // JSON string
  combinacoes_juros: string | null; // JSON string
}

export interface PjecalcCaseData {
  params: PjecalcParametrosRow | null;
  dadosProcesso: PjecalcDadosProcessoRow | null;
  faltas: PjecalcFaltaRow[];
  ferias: PjecalcFeriasRow[];
  historicos: PjecalcHistoricoSalarialRow[];
  verbas: PjecalcVerbaRow[];
  cartaoPonto: PjecalcCartaoPontoRow[];
  resultado: PjecalcLiquidacaoResultadoRow | null;
  fgtsConfig: PjecalcFgtsConfigRow | null;
  csConfig: PjecalcCsConfigRow | null;
  irConfig: PjecalcIrConfigRow | null;
  correcaoConfig: PjecalcCorrecaoConfigRow | null;
  honorarios: PjecalcHonorariosRow | null;
  custasConfig: PjecalcCustasConfigRow | null;
  multasConfig: PjecalcMultasConfigRow | null;
  atualizacaoConfig: PjecalcAtualizacaoConfigRow[];
}

export async function getAtualizacaoConfig(caseId: string): Promise<PjecalcAtualizacaoConfigRow[]> {
  try {
    // Get calculo_id first
    const calculoId = await getCalculoId(caseId);
    if (!calculoId) return [];
    const { data, error } = await fromView('pjecalc_atualizacao_config')
      .select('*')
      .eq('calculo_id', calculoId);
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) return [];
      console.error('[PjeCalcService] Erro inesperado em getAtualizacaoConfig:', error);
      throw error;
    }
    return (data || []) as PjecalcAtualizacaoConfigRow[];
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return [];
    console.error('[PjeCalcService] Erro inesperado em getAtualizacaoConfig:', err);
    throw err;
  }
}

export async function loadCaseData(caseId: string): Promise<PjecalcCaseData> {
  const [
    params, dadosProcesso, faltas, ferias, historicos, verbas,
    cartaoPonto, resultado, fgtsConfig, csConfig, irConfig,
    correcaoConfig, honorarios, custasConfig, multasConfig,
    atualizacaoConfig,
  ] = await Promise.all([
    getParametros(caseId),
    getDadosProcesso(caseId),
    getFaltas(caseId),
    getFerias(caseId),
    getHistoricoSalarial(caseId),
    getVerbas(caseId),
    getCartaoPonto(caseId),
    getResultado(caseId),
    getFgtsConfig(caseId),
    getCsConfig(caseId),
    getIrConfig(caseId),
    getCorrecaoConfig(caseId),
    getHonorarios(caseId),
    getCustasConfig(caseId),
    getMultasConfig(caseId),
    getAtualizacaoConfig(caseId),
  ]);

  return {
    params, dadosProcesso, faltas, ferias, historicos, verbas,
    cartaoPonto, resultado, fgtsConfig, csConfig, irConfig,
    correcaoConfig, honorarios, custasConfig, multasConfig,
    atualizacaoConfig,
  };
}

// =====================================================
// NUKE: Limpar todos os dados de um caso
// =====================================================

export async function nukeCaseData(caseId: string): Promise<void> {
  // Get calculo IDs
  const { data: calcData } = await fromView('pjecalc_calculos')
    .select('id')
    .eq('case_id', caseId);

  const calculoIds = (calcData || []).map((c: { id: string }) => c.id);

  // Delete from base tables in reverse FK order
  const baseTablesToNuke = [
    'pjecalc_audit_log', 'pjecalc_resultado', 'pjecalc_ocorrencia_calculo',
    'pjecalc_reflexo_base_verba', 'pjecalc_reflexo', 'pjecalc_verba_base',
    'pjecalc_hist_salarial_mes', 'pjecalc_hist_salarial',
    'pjecalc_evento_intervalo', 'pjecalc_apuracao_diaria', 'pjecalc_atualizacao_config',
  ];

  for (const table of baseTablesToNuke) {
    for (const cid of calculoIds) {
      await fromView(table).delete().eq('calculo_id', cid);
    }
    await fromView(table).delete().eq('case_id', caseId);
  }

  // Delete calculo itself
  if (calculoIds.length > 0) {
    await fromView('pjecalc_calculos').delete().eq('case_id', caseId);
  }

  // Clear views that might have orphan data
  const viewsToClear = [
    'pjecalc_liquidacao_resultado', 'pjecalc_ocorrencias', 'pjecalc_verbas',
    'pjecalc_historico_ocorrencias', 'pjecalc_historico_salarial',
    'pjecalc_faltas', 'pjecalc_ferias', 'pjecalc_cartao_ponto',
    'pjecalc_correcao_config', 'pjecalc_honorarios', 'pjecalc_custas_config',
    'pjecalc_cs_config', 'pjecalc_ir_config', 'pjecalc_fgts_config',
    'pjecalc_dados_processo', 'pjecalc_parametros',
  ];

  for (const v of viewsToClear) {
    await fromView(v).delete().eq('case_id', caseId);
  }
}

// =====================================================
// COMPLETUDE — Gerar input tipado para cálculo de completude
// =====================================================

export function toCompletionInput(data: PjecalcCaseData): CompletionInput {
  return {
    params: data.params,
    faltas: data.faltas,
    ferias: data.ferias,
    historicos: data.historicos,
    verbas: data.verbas,
    cartaoPonto: data.cartaoPonto,
    resultado: data.resultado,
    fgtsConfig: data.fgtsConfig,
    csConfig: data.csConfig,
    irConfig: data.irConfig,
    correcaoConfig: data.correcaoConfig,
  };
}

// =====================================================
// OBSERVAÇÕES TÉCNICAS
// =====================================================

export interface PjecalcObservacaoRow {
  id: string;
  case_id: string;
  modulo: string;
  tipo: string;
  texto: string;
  created_by: string | null;
  created_at: string;
}

export async function getObservacoes(caseId: string, modulo: string): Promise<PjecalcObservacaoRow[]> {
  try {
    const { data, error } = await fromView('pjecalc_observacoes')
      .select('*')
      .eq('case_id', caseId)
      .eq('modulo', modulo)
      .order('created_at', { ascending: false });
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) return [];
      console.error('[PjeCalcService] Erro inesperado em getObservacoes:', error);
      throw error;
    }
    return (data || []) as PjecalcObservacaoRow[];
  } catch (err: any) {
    if (err?.code === 'PGRST116' || err?.message?.includes('not found')) return [];
    console.error('[PjeCalcService] Erro inesperado em getObservacoes:', err);
    throw err;
  }
}

export async function insertObservacao(payload: { case_id: string; modulo: string; tipo: string; texto: string; created_by?: string }): Promise<void> {
  const { error } = await fromView('pjecalc_observacoes').insert(payload);
  if (error) throw error;
}

export async function deleteObservacao(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_observacoes').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================
// TABELAS DE REFERÊNCIA (reference_table_registry, etc.)
// =====================================================

export async function getReferenceTableRegistry(): Promise<Record<string, unknown>[]> {
  const { data, error } = await fromView('reference_table_registry').select('*').order('name');
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

export async function getRecentImportRuns(limit = 20): Promise<Record<string, unknown>[]> {
  const { data, error } = await fromView('reference_import_runs').select('*').order('started_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

export async function upsertReferenceTable(tableName: string, record: Record<string, unknown>, onConflict?: string): Promise<boolean> {
  const query = onConflict
    ? fromView(tableName).upsert(record, { onConflict })
    : fromView(tableName).insert(record);
  const { error } = await query;
  return !error;
}

// =====================================================
// LIQUIDAÇÕES (múltiplas para comparação)
// =====================================================

export async function getLiquidacoes(caseId: string, limit = 10): Promise<PjecalcLiquidacaoResultadoRow[]> {
  const { data, error } = await fromView('pjecalc_liquidacao_resultado')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as PjecalcLiquidacaoResultadoRow[];
}

// =====================================================
// SÉRIES HISTÓRICAS (correção, INSS, IR, feriados)
// =====================================================

export async function getIndicesCorrecao(): Promise<Record<string, unknown>[]> {
  const { data, error } = await fromView('pjecalc_correcao_monetaria').select('*').order('competencia');
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

export async function getInssFaixas(): Promise<Record<string, unknown>[]> {
  try {
    const { data, error } = await fromView('pjecalc_inss_faixas').select('*').order('competencia_inicio,faixa');
    if (error) {
      console.error('[PjeCalcService] Falha ao carregar pjecalc_inss_faixas:', error);
      throw error;
    }
    return (data || []) as Record<string, unknown>[];
  } catch (err) {
    console.error('[PjeCalcService] Falha ao carregar pjecalc_inss_faixas:', err);
    throw err;
  }
}

export async function getIrFaixas(): Promise<Record<string, unknown>[]> {
  try {
    const { data, error } = await fromView('pjecalc_ir_faixas').select('*').order('competencia_inicio,faixa');
    if (error) {
      console.error('[PjeCalcService] Falha ao carregar pjecalc_ir_faixas:', error);
      throw error;
    }
    return (data || []) as Record<string, unknown>[];
  } catch (err) {
    console.error('[PjeCalcService] Falha ao carregar pjecalc_ir_faixas:', err);
    throw err;
  }
}

export async function getFeriados(): Promise<Record<string, unknown>[]> {
  try {
    const { data, error } = await fromView('pjecalc_feriados').select('*');
    if (error) {
      console.error('[PjeCalcService] Falha ao carregar pjecalc_feriados:', error);
      throw error;
    }
    return (data || []) as Record<string, unknown>[];
  } catch (err) {
    console.error('[PjeCalcService] Falha ao carregar pjecalc_feriados:', err);
    throw err;
  }
}

// =====================================================
// TABELAS REAIS (acesso direto para persistência de resultado)
// =====================================================

export async function getCalculoId(caseId: string): Promise<string | null> {
  const { data } = await supabase.from('pjecalc_calculos').select('id').eq('case_id', caseId).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function deleteResultadoReal(calculoId: string): Promise<void> {
  await fromView('pjecalc_resultado').delete().eq('calculo_id', calculoId);
}

export async function insertResultadoReal(payload: Record<string, unknown>): Promise<void> {
  const { error } = await fromView('pjecalc_resultado').insert(payload);
  if (error) console.error("Erro ao persistir resultado:", error);
}

export async function deleteOcorrenciasReais(calculoId: string, origem: string): Promise<void> {
  await fromView('pjecalc_ocorrencia_calculo').delete().eq('calculo_id', calculoId).eq('origem', origem);
}

export async function insertOcorrenciasReaisBatch(rows: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await fromView('pjecalc_ocorrencia_calculo').insert(rows.slice(i, i + 500));
    if (error) console.error("Erro ao persistir ocorrências:", error);
  }
}

// =====================================================
// HISTORICO OCORRENCIAS (por IDs)
// =====================================================

export async function getHistoricoOcorrenciasByIds(histIds: string[]): Promise<Record<string, unknown>[]> {
  if (histIds.length === 0) return [];
  const { data, error } = await fromView('pjecalc_historico_ocorrencias')
    .select('*')
    .in('historico_id', histIds)
    .order('competencia');
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}
