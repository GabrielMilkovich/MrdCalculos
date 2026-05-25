/**
 * V6 Fallback Banner — Fase 5 v7 (2026-05-20)
 *
 * Quando o operador abre o dialog de revisão de um documento cuja
 * extração NÃO usou o caminho V6 geométrico (ou seja, caiu pro Claude
 * OCR + parser regex v5), mostra banner amarelo explicando:
 *   - O caminho usado é menos preciso (Claude pode confundir 19:00↔15:00)
 *   - Motivo da falha V6 (vem de `metadata.v6_outcome`)
 *   - Recomendação: reprocessar via admin button "Re-OCR V6"
 *
 * Quando V6 foi sucesso (`ocr_provider === 'pdfjs_geometric'`), o banner
 * fica OCULTO — não polui UI quando tudo correu bem.
 *
 * SCOPE: cartão de ponto especificamente. Outros tipos de documento
 * (holerite, CTPS, férias, faltas) podem reusar este componente, mas
 * cada caller decide se faz sentido pro seu fluxo. Fora do escopo
 * v7 atual.
 *
 * Estado lido via supabase no mount. Sem cache (toda abertura faz 1
 * SELECT) — aceitável porque dialog é low-traffic.
 */
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  /** ID do row em `documents`. Sem ele, banner não renderiza. */
  documentId: string | null | undefined;
}

interface V6Status {
  /** "pdfjs_geometric" quando V6 sucesso. Outro valor (ou null) = não-V6. */
  ocr_provider: string | null;
  /** Outcome detalhado do V6 quando metadata.v6_outcome populado. */
  v6_outcome: string | null;
  /** Mensagem de erro do V6 quando disponível. */
  v6_error: string | null;
  /** Mapper que tentou (quando aplicável). */
  v6_mapper: string | null;
}

const MENSAGENS_OUTCOME: Record<string, string> = {
  pdf_extraction_failed:
    "pdfjs não conseguiu extrair texto nativo do PDF — pode estar corrompido ou ser uma imagem escaneada.",
  score_below_threshold:
    "Texto extraído tinha qualidade abaixo do threshold (provável scan ruim disfarçado de text-native).",
  no_mapper_matched:
    "Nenhum mapper específico (Via Varejo / Casas Bahia / genérico) reconheceu o layout. Provavelmente fornecedor novo.",
  mapper_returned_null:
    "Mapper específico foi escolhido mas falhou em produzir apurações. Layout esperado pode ter mudado.",
  exception:
    "Erro inesperado no pipeline V6 — log do edge function tem o stack trace.",
  not_pdf: "Documento não é PDF (imagem/scan) — V6 só roda em PDFs text-native.",
};

export function V6FallbackBanner({ documentId }: Props) {
  const [status, setStatus] = useState<V6Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    if (!documentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("documents")
        .select("ocr_provider, metadata")
        .eq("id", documentId)
        .single();
      if (cancelado) return;
      const meta = (data?.metadata ?? {}) as Record<string, unknown>;
      setStatus({
        ocr_provider:
          typeof data?.ocr_provider === "string" ? data.ocr_provider : null,
        v6_outcome:
          typeof meta.v6_outcome === "string" ? (meta.v6_outcome as string) : null,
        v6_error:
          typeof meta.v6_error_message === "string"
            ? (meta.v6_error_message as string)
            : null,
        v6_mapper:
          typeof meta.v6_mapper_tried === "string"
            ? (meta.v6_mapper_tried as string)
            : null,
      });
      setLoading(false);
    })().catch(() => {
      if (!cancelado) setLoading(false);
    });
    return () => {
      cancelado = true;
    };
  }, [documentId]);

  // Estados que NÃO renderizam banner:
  //   - Loading (silencioso pra evitar piscar)
  //   - V6 sucesso (ocr_provider === 'pdfjs_geometric')
  //   - Sem documentId
  if (loading || !documentId || !status) return null;
  if (status.ocr_provider === "pdfjs_geometric") return null;

  const motivoLegivel =
    status.v6_outcome && MENSAGENS_OUTCOME[status.v6_outcome]
      ? MENSAGENS_OUTCOME[status.v6_outcome]
      : status.v6_outcome
        ? `Outcome técnico: ${status.v6_outcome}.`
        : "V6 não foi tentado neste documento (provável upload pré-Fase 2 v7).";

  return (
    <div className="mx-3 mt-2 border border-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded p-2.5 text-xs space-y-1">
      <div className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        Processado com método alternativo (menor precisão)
      </div>
      <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-snug">
        Este documento foi processado com um método alternativo que pode
        conter divergências sutis (ex: horários trocados, dias ausentes,
        cronologia invertida). Confira os dados com atenção.
      </p>
      <p className="text-[11px] text-amber-700 dark:text-amber-300 italic">
        Motivo: {motivoLegivel}
        {status.v6_error && (
          <>
            {" "}
            <span className="text-[10px] font-mono">({status.v6_error})</span>
          </>
        )}
      </p>
      <p className="text-[11px] text-amber-700 dark:text-amber-300">
        <strong>Recomendado:</strong> peça pra um admin acionar "Re-OCR V6"
        em DocumentsManager. Se o V6 falhar de novo (mesmo outcome),{" "}
        {status.v6_outcome === "not_pdf"
          ? "PDF é scan e V6 não se aplica — Claude é o caminho correto."
          : "abre issue separada pra investigar layout do fornecedor."}
      </p>
    </div>
  );
}
