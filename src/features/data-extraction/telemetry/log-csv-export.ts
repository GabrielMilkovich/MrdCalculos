/**
 * Telemetria de fidelidade extração→CSV.
 *
 * Cada `Confirmar e baixar` no dialog → 1 linha em `csv_export_telemetry`.
 * Permite calcular KPI "% de downloads sem rejeição" e diagnosticar
 * regressões em mappers/parsers.
 *
 * Filosofia: nunca bloqueia o download. Falha de log é silenciosa
 * (toast de aviso só em modo dev).
 */
import { supabase } from '@/integrations/supabase/client';
import type { BuildReport } from '../export/validation';

export type BuilderTelemetria =
  | 'cartao_ponto'
  | 'holerite'
  | 'ferias'
  | 'faltas'
  | 'ctps';

export interface LogCsvExportInput {
  builder: BuilderTelemetria;
  report: BuildReport;
  documentId?: string | null;
  caseId?: string | null;
  /** True quando operador autorizou download apesar de linhasRejeitadas. */
  baixadoComPerdas: boolean;
  /**
   * F0.4 — true quando operador marcou checkbox override "Confirmo que revisei
   * manualmente cada divergência acima" para baixar CSV apesar de
   * divergências sinalizadas (linhas rejeitadas / score baixo / warnings
   * críticos). Audit trail jurídico — diferente de `baixadoComPerdas`
   * que captura existência de rejeições mas não a decisão consciente.
   */
  bloqueioBurlado?: boolean;
  /** F2 — operador clicou "Verificar com IA" no review dialog (score 50-85). */
  aiInvoked?: boolean;
  /** F2 — campos modificados pela IA E aceitos pelo operador. */
  aiChangedFields?: string[];
  /** F2 — score 0..100 retornado pela IA na resposta structured. */
  aiConfidence?: number;
  /** F2 — quando operador clicou "Pular análise", razão capturada. */
  aiSkippedReason?: string;
  /**
   * Slug do parser/mapper que originou os dados. Ex: 'cartao_via_varejo_v1',
   * 'cartao_generico_v1', 'regex_v5_via_varejo', 'regex_v5_holerite'.
   */
  parserOrigem?: string | null;
  /** FASE 3.4 — extract-rubricas-ai foi chamada nesse export? */
  llmInvoked?: boolean;
  /** FASE 3.4 — confiança autoreportada pela IA (0..100). */
  llmAiConfidence?: number | null;
  /** FASE 3.4 — taxa de concordância parser × IA (0.000..1.000). */
  llmParserConcordancia?: number | null;
  /** FASE 3.4 — status da chamada IA. */
  llmStatus?: 'ok' | 'unavailable' | 'timeout' | 'rate_limit' | 'error' | 'not_attempted' | null;
}

/**
 * Registra um download de CSV. Nunca lança — falha de log é apenas
 * logada no console (não bloqueia download). O dialog SEMPRE chama
 * isto APÓS `triggerBlobDownload`.
 */
export async function logCsvExport(input: LogCsvExportInput): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Sem usuário autenticado, não loga (RLS bloqueia mesmo).
      return;
    }
    const { error } = await supabase.from('csv_export_telemetry').insert({
      builder: input.builder,
      case_id: input.caseId ?? null,
      document_id: input.documentId ?? null,
      linhas_geradas: input.report.linhasGeradas,
      linhas_rejeitadas: input.report.linhasRejeitadas.length,
      linhas_ajustadas: input.report.linhasAjustadas.length,
      warnings: input.report.warnings.length,
      baixado_com_perdas: input.baixadoComPerdas,
      bloqueio_burlado: input.bloqueioBurlado ?? false,
      ai_invoked: input.aiInvoked ?? false,
      ai_changed_fields: input.aiChangedFields ?? null,
      ai_confidence: input.aiConfidence ?? null,
      ai_skipped_reason: input.aiSkippedReason ?? null,
      report: input.report as unknown as Record<string, unknown>,
      campos_nao_exportados: input.report.camposNaoExportados ?? [],
      parser_origem: input.parserOrigem ?? null,
      // FASE 3.4 — shadow check parser × LLM.
      llm_invoked: input.llmInvoked ?? false,
      llm_ai_confidence: input.llmAiConfidence ?? null,
      llm_parser_concordancia: input.llmParserConcordancia ?? null,
      llm_status: input.llmStatus ?? null,
      criado_por: user.id,
    });
    if (error) {
      console.warn('[telemetria] insert csv_export_telemetry falhou:', error);
    }
  } catch (err) {
    console.warn('[telemetria] logCsvExport throw:', err);
  }
}
