/**
 * Proposal Engine — interface entre o extract-and-fill e auto_fill_proposals.
 *
 * Responsabilidades:
 *  - Receber candidatos extraidos de N documentos (multiplos uploads).
 *  - Para cada campo, chamar resolveCampo() (document-authority.ts) e
 *    decidir vencedor.
 *  - Snapshot do valor anterior (de pjecalc_calculos / pjecalc_parametros).
 *  - INSERT em auto_fill_proposals com status='pendente'.
 *  - UI lista propostas pendentes; usuario aprova → aplicar() faz UPDATE
 *    no destino real e marca proposta como 'aplicada'.
 *
 * Exposto como hook React `useAutoFillProposals(caseId)`.
 */
import { supabase } from '@/integrations/supabase/client';
import { registrarEvento as registrarCalibrationEvento } from './calibration';
import {
  type CampoAutoFill,
  type CandidatoCampo,
  type DocumentoTipo,
  resolveCampo,
  temConflito,
} from './document-authority';

export type StatusProposta = 'pendente' | 'aprovada' | 'rejeitada' | 'aplicada' | 'revertida';

export interface PropostaPersistida {
  id: string;
  case_id: string;
  document_id: string | null;
  campo: CampoAutoFill;
  doc_tipo: DocumentoTipo;
  valor_proposto: unknown;
  valor_anterior: unknown;
  authority_score: number;
  confianca: number;
  score_final: number;
  motivo_resolucao: 'authority' | 'confidence' | 'recency' | 'unico' | null;
  conflitantes: Array<{ doc_tipo: DocumentoTipo; valor: unknown; score: number }>;
  evidencia: string | null;
  status: StatusProposta;
  aplicado_em: string | null;
  aplicado_por: string | null;
  revertido_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

/**
 * Cria propostas de auto-fill para um conjunto de candidatos.
 * Para cada campo, resolve o vencedor e cria 1 proposta na tabela.
 *
 * @returns IDs das propostas criadas.
 */
export async function criarPropostas(
  caseId: string,
  candidatosPorCampo: Map<CampoAutoFill, CandidatoCampo[]>,
  valoresAnteriores: Partial<Record<CampoAutoFill, unknown>> = {},
): Promise<string[]> {
  const ids: string[] = [];

  for (const [campo, candidatos] of candidatosPorCampo) {
    const resolution = resolveCampo(campo, candidatos);
    if (!resolution) continue;

    const valorAnterior = valoresAnteriores[campo] ?? null;

    // Skip se valor anterior == valor proposto (sem mudanca real).
    if (
      valorAnterior !== null &&
      JSON.stringify(valorAnterior) === JSON.stringify(resolution.vencedor.valor)
    ) {
      continue;
    }

    const { data, error } = await supabase
      .from('auto_fill_proposals')
      .insert({
        case_id: caseId,
        document_id: resolution.vencedor.document_id,
        campo,
        doc_tipo: resolution.vencedor.doc_tipo,
        valor_proposto: resolution.vencedor.valor,
        valor_anterior: valorAnterior,
        authority_score: resolution.score_final / Math.max(resolution.vencedor.confianca, 0.001),
        confianca: resolution.vencedor.confianca,
        score_final: resolution.score_final,
        motivo_resolucao: resolution.motivo,
        conflitantes: resolution.perdedores.map(p => ({
          doc_tipo: p.doc_tipo,
          valor: p.valor,
          score: p.confianca,
        })),
        evidencia: resolution.vencedor.evidencia ?? null,
        status: 'pendente',
      })
      .select('id')
      .single();

    if (error) {
      console.warn(`[proposal-engine] erro criando proposta ${campo}:`, error.message);
      continue;
    }
    if (data?.id) ids.push(data.id);
  }

  return ids;
}

/** Lista propostas de um caso, com filtros opcionais. */
export async function listarPropostas(
  caseId: string,
  filtro: { status?: StatusProposta; somenteConflitantes?: boolean } = {},
): Promise<PropostaPersistida[]> {
  let query = supabase
    .from('auto_fill_proposals')
    .select('*')
    .eq('case_id', caseId)
    .order('criado_em', { ascending: false });

  if (filtro.status) query = query.eq('status', filtro.status);

  const { data, error } = await query;
  if (error) {
    console.error('[proposal-engine] listar:', error.message);
    return [];
  }

  let rows = (data ?? []) as PropostaPersistida[];
  if (filtro.somenteConflitantes) {
    rows = rows.filter(p => Array.isArray(p.conflitantes) && p.conflitantes.length > 0);
  }
  return rows;
}

/**
 * Aprova uma proposta — atualiza status e DELEGA o UPDATE real ao orchestrator
 * passando o destino correto (campo → tabela:coluna).
 */
export async function aprovarProposta(
  propostaId: string,
  aplicar: (proposta: PropostaPersistida) => Promise<{ ok: boolean; error?: string }>,
): Promise<boolean> {
  const { data: proposta, error: errFetch } = await supabase
    .from('auto_fill_proposals')
    .select('*')
    .eq('id', propostaId)
    .single();

  if (errFetch || !proposta) {
    console.error('[proposal-engine] aprovar: proposta nao encontrada', propostaId);
    return false;
  }

  // Aplica no destino real (UPDATE em pjecalc_calculos/parametros).
  const result = await aplicar(proposta as PropostaPersistida);
  if (!result.ok) {
    console.error('[proposal-engine] aprovar: aplicar falhou', result.error);
    return false;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { error: errUpdate } = await supabase
    .from('auto_fill_proposals')
    .update({
      status: 'aplicada',
      aplicado_em: new Date().toISOString(),
      aplicado_por: user?.id ?? null,
    })
    .eq('id', propostaId);

  if (errUpdate) {
    console.error('[proposal-engine] aprovar: update status', errUpdate.message);
    return false;
  }

  // Fire-and-forget: registra evento de calibracao (matriz authority empirica).
  // Trigger no banco tambem garante o registro caso este caminho falhe.
  void registrarCalibrationEvento(propostaId, true).catch(err => {
    console.warn('[proposal-engine] calibration event:', err);
  });

  return true;
}

/** Rejeita uma proposta (sem aplicar). */
export async function rejeitarProposta(propostaId: string): Promise<boolean> {
  const { error } = await supabase
    .from('auto_fill_proposals')
    .update({ status: 'rejeitada' })
    .eq('id', propostaId);
  if (error) return false;

  // Fire-and-forget: registra evento de calibracao.
  void registrarCalibrationEvento(propostaId, false).catch(err => {
    console.warn('[proposal-engine] calibration event:', err);
  });

  return true;
}

/**
 * Reverte uma proposta APLICADA — restaura valor_anterior no destino.
 * Usuario delega como aplicar (similar ao aprovarProposta).
 */
export async function reverterProposta(
  propostaId: string,
  reverter: (proposta: PropostaPersistida) => Promise<{ ok: boolean; error?: string }>,
): Promise<boolean> {
  const { data: proposta, error } = await supabase
    .from('auto_fill_proposals')
    .select('*')
    .eq('id', propostaId)
    .eq('status', 'aplicada')
    .single();

  if (error || !proposta) return false;

  const result = await reverter(proposta as PropostaPersistida);
  if (!result.ok) return false;

  const { error: errUpdate } = await supabase
    .from('auto_fill_proposals')
    .update({
      status: 'revertida',
      revertido_em: new Date().toISOString(),
    })
    .eq('id', propostaId);

  return !errUpdate;
}

/**
 * Helper: detecta automaticamente conflitos em propostas (>= 2 candidatos
 * com valores divergentes).
 */
export function temConflitoEntreDocumentos(
  campo: CampoAutoFill,
  candidatos: CandidatoCampo[],
): boolean {
  const tipo = campo.startsWith('data_') ? 'data'
    : campo.includes('salario') || campo.startsWith('fgts') ? 'numero'
    : 'string';
  return temConflito(campo, candidatos, { tipo });
}
