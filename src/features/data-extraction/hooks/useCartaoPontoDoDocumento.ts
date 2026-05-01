/**
 * useCartaoPontoDoDocumento — hook de CRUD para cartão de ponto + apurações
 * de um documento. Espelha o padrão de useRubricasDoDocumento.
 *
 * Lê o cartão (header) e suas apurações via React Query. Expõe ações
 * `replaceAll`, `validate`, `reject`, `reextract`, `saveCompetencia`.
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  ensureCartaoPonto,
  loadApuracoesByDocument,
  loadCartaoPontoByDocument,
  refreshCartaoBounds,
  replaceApuracoes,
  type CartaoPontoExtraido,
} from "../api/cartao-ponto";
import {
  extractDocument,
  setCompetenciaReferencia,
  markValidationStatus,
} from "../api/extract";
import type { ApuracaoDiaria } from "../parsers/cartao-ponto";
import type { TipoExtracao } from "../types";

export type ExtractResultStatus = "success" | "failed";

export function useCartaoPontoDoDocumento(
  documentId: string | null,
  caseId: string,
) {
  const qc = useQueryClient();

  const { data: cartao } = useQuery({
    queryKey: ["cartao-ponto-header", documentId],
    queryFn: (): Promise<CartaoPontoExtraido | null> =>
      documentId ? loadCartaoPontoByDocument(documentId) : Promise.resolve(null),
    enabled: !!documentId,
  });

  const { data: apuracoes = [], isLoading } = useQuery({
    queryKey: ["cartao-ponto-apuracoes", documentId],
    queryFn: (): Promise<ApuracaoDiaria[]> =>
      documentId ? loadApuracoesByDocument(documentId) : Promise.resolve([]),
    enabled: !!documentId,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["cartao-ponto-header", documentId] });
    qc.invalidateQueries({ queryKey: ["cartao-ponto-apuracoes", documentId] });
    qc.invalidateQueries({ queryKey: ["documents-extraction", caseId] });
  }, [qc, documentId, caseId]);

  /**
   * Substitui o vetor de apurações (delete-all + bulk-insert).
   * Cria o header se não existir ainda.
   */
  const replaceAll = useCallback(
    async (next: ApuracaoDiaria[], competencia: string): Promise<boolean> => {
      if (!documentId) return false;
      try {
        const cartaoId = await ensureCartaoPonto(documentId, caseId, competencia);
        await replaceApuracoes(cartaoId, caseId, next);
        await refreshCartaoBounds(cartaoId, next);
        invalidate();
        return true;
      } catch (e) {
        toast.error(`Erro: ${(e as Error).message}`);
        return false;
      }
    },
    [documentId, caseId, invalidate],
  );

  const saveCompetencia = useCallback(
    async (newComp: string): Promise<boolean> => {
      if (!documentId) return false;
      if (!/^\d{2}\/\d{4}$/.test(newComp)) {
        toast.error("Formato MM/yyyy esperado");
        return false;
      }
      try {
        await setCompetenciaReferencia(documentId, newComp);
        invalidate();
        return true;
      } catch (e) {
        toast.error(`Erro: ${(e as Error).message}`);
        return false;
      }
    },
    [documentId, invalidate],
  );

  const validate = useCallback(async () => {
    if (!documentId) return;
    if (apuracoes.length === 0) {
      toast.error("Nenhuma apuração registrada. Edite ou re-extraia antes de validar.");
      return;
    }
    try {
      await markValidationStatus(documentId, "validated");
      logger.info("cartao_ponto_validated", {
        caseId,
        documentId,
        apuracoes_total: apuracoes.length,
      });
      invalidate();
      toast.success("Cartão de ponto validado.");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  }, [documentId, apuracoes.length, caseId, invalidate]);

  const reject = useCallback(async () => {
    if (!documentId) return;
    try {
      await markValidationStatus(documentId, "rejected");
      invalidate();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  }, [documentId, invalidate]);

  const reextract = useCallback(
    async (
      tipo: Exclude<TipoExtracao, "nao_extrair">,
    ): Promise<ExtractResultStatus> => {
      if (!documentId) return "failed";
      const result = await extractDocument(documentId, tipo);
      invalidate();
      if (result.ok) {
        toast.success(`Extraídas ${result.count} apurações.`);
        return "success";
      }
      toast.error(`Falha: ${result.error}`);
      return "failed";
    },
    [documentId, invalidate],
  );

  return {
    cartao,
    apuracoes,
    isLoading,
    replaceAll,
    saveCompetencia,
    validate,
    reject,
    reextract,
  };
}
