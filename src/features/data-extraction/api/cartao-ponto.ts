/**
 * API CRUD para cartões de ponto extraídos.
 *
 * Schema (migration 20260430200001):
 *   cartoes_ponto_extraidos    (1:1 com document_id)
 *   apuracoes_diarias_extraidas (N por cartão, UNIQUE por cartao_ponto_id+data)
 */
import { fromUntyped } from "@/lib/supabase-untyped";
import type { ApuracaoDiaria, OcorrenciaApuracao } from "../parsers/cartao-ponto";

export type CartaoPontoExtraido = {
  id: string;
  document_id: string;
  case_id: string;
  competencia: string;
  data_inicial: string | null; // ISO yyyy-mm-dd
  data_final: string | null;
};

export type ApuracaoExtraidaRow = {
  id: string;
  cartao_ponto_id: string;
  case_id: string;
  data: string; // ISO
  ocorrencia: OcorrenciaApuracao;
  marcacoes: { e: string; s: string }[];
  observacao: string | null;
};

// =====================================================
// Cartão (header)
// =====================================================

export async function loadCartaoPontoByDocument(
  documentId: string,
): Promise<CartaoPontoExtraido | null> {
  const { data, error } = await fromUntyped("cartoes_ponto_extraidos")
    .select("*")
    .eq("document_id", documentId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CartaoPontoExtraido | null;
}

export async function loadCartoesPontoByCase(
  caseId: string,
): Promise<CartaoPontoExtraido[]> {
  const { data, error } = await fromUntyped("cartoes_ponto_extraidos")
    .select("*")
    .eq("case_id", caseId)
    .order("competencia", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as CartaoPontoExtraido[]);
}

export async function deleteCartaoPontoByDocument(documentId: string): Promise<void> {
  const { error } = await fromUntyped("cartoes_ponto_extraidos")
    .delete()
    .eq("document_id", documentId);
  if (error) throw error;
}

// =====================================================
// Apurações diárias
// =====================================================

export async function loadApuracoesByDocument(
  documentId: string,
): Promise<ApuracaoDiaria[]> {
  const cartao = await loadCartaoPontoByDocument(documentId);
  if (!cartao) return [];
  return loadApuracoesByCartao(cartao.id);
}

export async function loadApuracoesByCartao(
  cartaoPontoId: string,
): Promise<ApuracaoDiaria[]> {
  const { data, error } = await fromUntyped("apuracoes_diarias_extraidas")
    .select("data, ocorrencia, marcacoes, observacao")
    .eq("cartao_ponto_id", cartaoPontoId)
    .order("data", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<{
    data: string;
    ocorrencia: OcorrenciaApuracao;
    marcacoes: { e: string; s: string }[] | null;
    observacao: string | null;
  }>).map((r) => ({
    data: r.data,
    ocorrencia: r.ocorrencia,
    marcacoes: r.marcacoes ?? [],
    observacao: r.observacao,
  }));
}

export async function loadApuracoesByCase(
  caseId: string,
): Promise<Array<{ cartao: CartaoPontoExtraido; apuracoes: ApuracaoDiaria[] }>> {
  const cartoes = await loadCartoesPontoByCase(caseId);
  const out: Array<{ cartao: CartaoPontoExtraido; apuracoes: ApuracaoDiaria[] }> = [];
  for (const c of cartoes) {
    out.push({ cartao: c, apuracoes: await loadApuracoesByCartao(c.id) });
  }
  return out;
}

/**
 * Substitui todas as apurações do cartão (delete + insert em lote).
 *
 * O componente UI passa o vetor canonical (já editado) e a função reconcilia
 * com o banco. Alternativa upsert dia-a-dia foi descartada porque marcadores
 * e ocorrências mudam juntos.
 */
export async function replaceApuracoes(
  cartaoPontoId: string,
  caseId: string,
  apuracoes: ApuracaoDiaria[],
): Promise<void> {
  const { error: delErr } = await fromUntyped("apuracoes_diarias_extraidas")
    .delete()
    .eq("cartao_ponto_id", cartaoPontoId);
  if (delErr) throw delErr;

  if (apuracoes.length === 0) return;

  const rows = apuracoes.map((a) => ({
    cartao_ponto_id: cartaoPontoId,
    case_id: caseId,
    data: a.data,
    ocorrencia: a.ocorrencia,
    marcacoes: a.marcacoes,
    observacao: a.observacao,
  }));

  // Insert em chunks de 500 pra não estourar limites do Postgrest
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await fromUntyped("apuracoes_diarias_extraidas").insert(
      rows.slice(i, i + 500) as never,
    );
    if (error) throw error;
  }
}

/**
 * Cria (se não existir) o cartao_ponto e devolve o ID.
 * Útil quando o usuário cola/edita jornada manualmente sem rodar OCR.
 */
export async function ensureCartaoPonto(
  documentId: string,
  caseId: string,
  competencia: string,
): Promise<string> {
  const existing = await loadCartaoPontoByDocument(documentId);
  if (existing) return existing.id;

  const { data, error } = await fromUntyped("cartoes_ponto_extraidos")
    .insert({
      document_id: documentId,
      case_id: caseId,
      competencia,
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/**
 * Recalcula data_inicial / data_final no header conforme as apurações.
 */
export async function refreshCartaoBounds(
  cartaoPontoId: string,
  apuracoes: ApuracaoDiaria[],
): Promise<void> {
  if (apuracoes.length === 0) {
    const { error } = await fromUntyped("cartoes_ponto_extraidos")
      .update({ data_inicial: null, data_final: null } as never)
      .eq("id", cartaoPontoId);
    if (error) throw error;
    return;
  }
  const sorted = [...apuracoes].sort((a, b) => a.data.localeCompare(b.data));
  const { error } = await fromUntyped("cartoes_ponto_extraidos")
    .update({
      data_inicial: sorted[0].data,
      data_final: sorted[sorted.length - 1].data,
    } as never)
    .eq("id", cartaoPontoId);
  if (error) throw error;
}
