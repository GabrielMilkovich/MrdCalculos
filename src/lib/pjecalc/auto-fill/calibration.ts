/**
 * Authority Calibration — coleta e analise empirica da matriz authority.
 *
 * Fluxo:
 *  1. Cada vez que aprovarProposta()/rejeitarProposta() rodar, chamar
 *     registrarEvento() (fire-and-forget) para gravar o desfecho.
 *  2. Periodicamente (admin), agregarMetricas() compila taxa de acerto por
 *     campo+doc_tipo.
 *  3. sugerirAjustes() propoe deltas (+/-10pts) para entradas com volume
 *     suficiente (>= 20 amostras) e taxa fora da banda saudavel (50-90%).
 *
 * IMPORTANTE: nada altera AUTHORITY_MATRIX automaticamente. Sugestoes sao
 * humano-mediadas (admin revisa relatorio e abre PR alterando a matriz).
 */

import Decimal from 'decimal.js';
import { supabase } from '@/integrations/supabase/client';
import type { CampoAutoFill, DocumentoTipo } from './document-authority';

Decimal.set({ precision: 20 });

/** Limites para gerar sugestao de ajuste. */
export const CALIBRATION_THRESHOLDS = {
  MIN_AMOSTRAS: 20,
  TAXA_BAIXA: new Decimal('0.50'),   // < 50% → reduzir score
  TAXA_ALTA: new Decimal('0.90'),    // > 90% e score < 90 → aumentar score
  DELTA_AJUSTE: 10,                  // pontos para mover na matriz
  SCORE_MAX: 100,
  SCORE_MIN: 0,
} as const;

export interface CalibrationEvent {
  id: string;
  case_id: string | null;
  proposta_id: string | null;
  campo: CampoAutoFill;
  doc_tipo_vencedor: DocumentoTipo;
  valor_vencedor: unknown;
  doc_tipo_perdedores: DocumentoTipo[];
  authority_score: number | null;
  confianca: number | null;
  usuario_aceitou: boolean;
  criado_em: string;
}

export interface MetricaAgregada {
  campo: CampoAutoFill;
  doc_tipo: DocumentoTipo;
  aceitos: number;
  rejeitados: number;
  total: number;
  /** Taxa de acerto, 0-1, com precisao Decimal. */
  taxa_acerto: Decimal;
}

export interface SugestaoAjuste {
  campo: CampoAutoFill;
  doc_tipo: DocumentoTipo;
  score_atual: number;
  score_sugerido: number;
  delta: number;
  amostras: number;
  taxa_acerto: number;
  motivo: string;
}

/** Chave canonica campo+doc_tipo para mapas de agregacao. */
export function chaveMetrica(campo: CampoAutoFill, doc_tipo: DocumentoTipo): string {
  return `${campo}::${doc_tipo}`;
}

/**
 * Registra um evento de calibracao no banco. Fire-and-forget — falhas sao
 * logadas mas nao propagadas (nao queremos quebrar aprovarProposta por
 * problema na coleta de metricas).
 */
export async function registrarEvento(
  propostaId: string,
  aceito: boolean,
): Promise<{ ok: boolean; error?: string }> {
  // Busca dados da proposta para snapshot (campo, doc_tipo, scores, perdedores).
  const { data: proposta, error: errFetch } = await supabase
    .from('auto_fill_proposals')
    .select('id, case_id, campo, doc_tipo, valor_proposto, conflitantes, authority_score, confianca')
    .eq('id', propostaId)
    .single();

  if (errFetch || !proposta) {
    return { ok: false, error: errFetch?.message ?? 'proposta nao encontrada' };
  }

  const conflitantes = (proposta.conflitantes ?? []) as Array<{ doc_tipo?: string }>;
  const perdedores: string[] = conflitantes
    .map(c => c?.doc_tipo)
    .filter((t): t is string => typeof t === 'string');

  const { error: errInsert } = await supabase
    .from('authority_calibration_events')
    .insert({
      case_id: proposta.case_id,
      proposta_id: proposta.id,
      campo: proposta.campo,
      doc_tipo_vencedor: proposta.doc_tipo,
      valor_vencedor: proposta.valor_proposto,
      doc_tipo_perdedores: perdedores,
      authority_score: proposta.authority_score,
      confianca: proposta.confianca,
      usuario_aceitou: aceito,
    });

  if (errInsert) {
    return { ok: false, error: errInsert.message };
  }
  return { ok: true };
}

/**
 * Agrega eventos puros em metricas por (campo, doc_tipo).
 * Funcao pura — testavel sem mock de Supabase.
 */
export function agregarMetricasFromEvents(
  eventos: ReadonlyArray<Pick<CalibrationEvent, 'campo' | 'doc_tipo_vencedor' | 'usuario_aceitou'>>,
): Map<string, MetricaAgregada> {
  const acc = new Map<string, MetricaAgregada>();

  for (const ev of eventos) {
    const key = chaveMetrica(ev.campo, ev.doc_tipo_vencedor);
    const atual = acc.get(key) ?? {
      campo: ev.campo,
      doc_tipo: ev.doc_tipo_vencedor,
      aceitos: 0,
      rejeitados: 0,
      total: 0,
      taxa_acerto: new Decimal(0),
    };
    if (ev.usuario_aceitou) atual.aceitos += 1;
    else atual.rejeitados += 1;
    atual.total = atual.aceitos + atual.rejeitados;
    atual.taxa_acerto = atual.total > 0
      ? new Decimal(atual.aceitos).div(atual.total)
      : new Decimal(0);
    acc.set(key, atual);
  }

  return acc;
}

export interface PeriodoFiltro {
  desde?: Date;
  ate?: Date;
}

/**
 * Carrega eventos do banco (admin-only via RLS) e agrega.
 */
export async function agregarMetricas(
  periodo: PeriodoFiltro = {},
): Promise<Map<string, MetricaAgregada>> {
  let query = supabase
    .from('authority_calibration_events')
    .select('campo, doc_tipo_vencedor, usuario_aceitou, criado_em');

  if (periodo.desde) query = query.gte('criado_em', periodo.desde.toISOString());
  if (periodo.ate) query = query.lte('criado_em', periodo.ate.toISOString());

  const { data, error } = await query;
  if (error) {
    console.error('[calibration] agregarMetricas:', error.message);
    return new Map();
  }

  // Cast controlado: campo/doc_tipo no banco sao TEXT, mas semanticamente
  // sao CampoAutoFill/DocumentoTipo (validados pela camada que escreveu).
  const tipados = (data ?? []) as Array<{
    campo: CampoAutoFill;
    doc_tipo_vencedor: DocumentoTipo;
    usuario_aceitou: boolean;
  }>;

  return agregarMetricasFromEvents(tipados);
}

/**
 * Funcao pura: dadas metricas + matriz atual, retorna lista de sugestoes.
 *
 * Heuristica:
 *  - taxa_acerto < TAXA_BAIXA com >= MIN_AMOSTRAS → reduzir score em DELTA_AJUSTE
 *  - taxa_acerto > TAXA_ALTA com >= MIN_AMOSTRAS E score atual < 90 → aumentar
 *  - amostras < MIN_AMOSTRAS → sem sugestao
 *  - score atual ausente (campo/tipo nao mapeado) → sem sugestao
 */
export function sugerirAjustesFromMetricas(
  metricas: Map<string, MetricaAgregada>,
  matrizAtual: Record<CampoAutoFill, Partial<Record<DocumentoTipo, number>>>,
): SugestaoAjuste[] {
  const sugestoes: SugestaoAjuste[] = [];

  for (const m of metricas.values()) {
    if (m.total < CALIBRATION_THRESHOLDS.MIN_AMOSTRAS) continue;

    const scoreAtual = matrizAtual[m.campo]?.[m.doc_tipo];
    if (scoreAtual === undefined || scoreAtual === 0) continue;

    const taxa = m.taxa_acerto;

    if (taxa.lt(CALIBRATION_THRESHOLDS.TAXA_BAIXA)) {
      const sugerido = Math.max(
        CALIBRATION_THRESHOLDS.SCORE_MIN,
        scoreAtual - CALIBRATION_THRESHOLDS.DELTA_AJUSTE,
      );
      if (sugerido !== scoreAtual) {
        sugestoes.push({
          campo: m.campo,
          doc_tipo: m.doc_tipo,
          score_atual: scoreAtual,
          score_sugerido: sugerido,
          delta: sugerido - scoreAtual,
          amostras: m.total,
          taxa_acerto: taxa.toNumber(),
          motivo: `taxa de acerto ${taxa.times(100).toFixed(1)}% < 50% em ${m.total} amostras — reduzir score`,
        });
      }
    } else if (taxa.gt(CALIBRATION_THRESHOLDS.TAXA_ALTA) && scoreAtual < 90) {
      const sugerido = Math.min(
        CALIBRATION_THRESHOLDS.SCORE_MAX,
        scoreAtual + CALIBRATION_THRESHOLDS.DELTA_AJUSTE,
      );
      if (sugerido !== scoreAtual) {
        sugestoes.push({
          campo: m.campo,
          doc_tipo: m.doc_tipo,
          score_atual: scoreAtual,
          score_sugerido: sugerido,
          delta: sugerido - scoreAtual,
          amostras: m.total,
          taxa_acerto: taxa.toNumber(),
          motivo: `taxa de acerto ${taxa.times(100).toFixed(1)}% > 90% em ${m.total} amostras — score atual ${scoreAtual} subdimensionado`,
        });
      }
    }
  }

  // Ordena pela magnitude do delta (mais impactantes primeiro).
  sugestoes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return sugestoes;
}

/**
 * Composta: agrega metricas do banco + propoe ajustes contra a matriz atual.
 */
export async function sugerirAjustes(
  matrizAtual: Record<CampoAutoFill, Partial<Record<DocumentoTipo, number>>>,
  periodo: PeriodoFiltro = {},
): Promise<SugestaoAjuste[]> {
  const metricas = await agregarMetricas(periodo);
  return sugerirAjustesFromMetricas(metricas, matrizAtual);
}
