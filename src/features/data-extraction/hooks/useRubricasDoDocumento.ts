/**
 * useRubricasDoDocumento — hook que encapsula CRUD + reclassificação
 * de rubricas de um documento, com auto-refetch via React Query.
 *
 * Extraído de DocumentExtractionCard.tsx pra ser reusado em RubricasGrid
 * (split view de extração) sem duplicar lógica.
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import {
  loadRubricasByDocument,
  reclassificarRubrica,
  insertManualRubrica,
  updateRubricaValor,
  deleteRubrica,
  setCompetenciaReferencia,
  markValidationStatus,
  extractDocument,
  type RubricaExtraida,
  type TipoExtracao,
} from "@/features/data-extraction";

export type ExtractResultStatus = "success" | "failed";

export function useRubricasDoDocumento(documentId: string | null, caseId: string) {
  const qc = useQueryClient();

  const {
    data: rubricas = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["rubricas", documentId],
    queryFn: () => (documentId ? loadRubricasByDocument(documentId) : Promise.resolve([])),
    enabled: !!documentId,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["rubricas", documentId] });
    qc.invalidateQueries({ queryKey: ["documents-extraction", caseId] });
  }, [qc, documentId, caseId]);

  const reclassify = useCallback(
    async (rubrica: RubricaExtraida, novaCategoriaId: string | null) => {
      const result = await reclassificarRubrica(rubrica, novaCategoriaId, supabase);
      if (!result.ok) {
        toast.error(`Erro: ${result.error}`);
        return;
      }
      if (result.afetadas > 0) {
        toast.success(`Classificação aplicada em ${result.afetadas} outras rubricas do caso.`);
      }
      invalidate();
    },
    [invalidate],
  );

  const saveValor = useCallback(
    async (id: string, raw: string | number) => {
      const numeric = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
      if (!Number.isFinite(numeric) || numeric < 0) {
        toast.error("Valor inválido");
        return false;
      }
      try {
        await updateRubricaValor(id, numeric);
        invalidate();
        return true;
      } catch (e) {
        toast.error(`Erro: ${(e as Error).message}`);
        return false;
      }
    },
    [invalidate],
  );

  const addManual = useCallback(
    async (input: {
      codigo: string | null;
      nome: string;
      valor: number;
      categoria_id: string | null;
      competencia: string;
    }) => {
      if (!documentId) return;
      try {
        await insertManualRubrica({
          document_id: documentId,
          case_id: caseId,
          competencia: input.competencia,
          codigo: input.codigo,
          nome: input.nome,
          valor: input.valor,
          categoria_id: input.categoria_id,
        });
        toast.success("Rubrica adicionada.");
        invalidate();
      } catch (e) {
        toast.error(`Erro: ${(e as Error).message}`);
      }
    },
    [documentId, caseId, invalidate],
  );

  const removeRubrica = useCallback(
    async (id: string) => {
      try {
        await deleteRubrica(id);
        invalidate();
      } catch (e) {
        toast.error(`Erro: ${(e as Error).message}`);
      }
    },
    [invalidate],
  );

  const saveCompetencia = useCallback(
    async (newComp: string) => {
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
    // Bloqueia se houver rubrica com valor>0, sem categoria, e sem decisão consciente
    // (manual/hint). Se foi hint de "ignorar" (origem='hint' + categoria_id null),
    // tratamos como decisão consciente e deixamos passar.
    const pending = rubricas.filter(
      (r) =>
        Number(r.valor) > 0 &&
        r.categoria_id === null &&
        r.classificacao_origem !== "manual" &&
        r.classificacao_origem !== "hint",
    );
    if (pending.length > 0) {
      toast.error(
        `${pending.length} rubrica(s) sem decisão. Classifique ou marque como "Ignorar".`,
      );
      return;
    }
    try {
      await markValidationStatus(documentId, "validated");
      // Telemetria (spec §6.5): contagem de modificações humanas pra
      // calibrar threshold de confiança em iterações futuras.
      const reclassificadas = rubricas.filter(
        (r) => r.classificacao_origem === "manual",
      ).length;
      const manuais = rubricas.filter((r) => r.origem === "manual").length;
      logger.info("auto_extraction_validated", {
        caseId,
        documentId,
        rubricas_total: rubricas.length,
        rubricas_reclassificadas: reclassificadas,
        rubricas_manuais_adicionadas: manuais,
      });
      invalidate();
      toast.success("Documento validado.");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  }, [documentId, rubricas, caseId, invalidate]);

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
    async (tipo: Exclude<TipoExtracao, "nao_extrair">): Promise<ExtractResultStatus> => {
      if (!documentId) return "failed";
      const result = await extractDocument(documentId, tipo);
      invalidate();
      if (result.ok) {
        toast.success(`Extraídas ${result.count} linhas.`);
        return "success";
      }
      toast.error(`Falha: ${result.error}`);
      return "failed";
    },
    [documentId, invalidate],
  );

  return {
    rubricas,
    isLoading,
    refetch,
    reclassify,
    saveValor,
    addManual,
    removeRubrica,
    saveCompetencia,
    validate,
    reject,
    reextract,
  };
}
