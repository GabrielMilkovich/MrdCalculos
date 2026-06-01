/**
 * =====================================================
 * usePjeCalculator — Hook centralizado para PjeCalcPage
 * =====================================================
 *
 * Concentra TODA lógica de busca, persistência e mutações
 * para a página PjeCalcPage.tsx. Nenhuma chamada direta
 * ao supabase.from() deve existir na página.
 *
 * Garante:
 * - Tipagem estrita (sem `any` nos contratos)
 * - Cache unificado via React Query
 * - Tratamento de erro com toast
 * - Acesso via user_id (RLS garante multi-tenancy)
 */

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import * as svc from "@/lib/pjecalc/service";
import { executarLiquidacao, type OrchestratorResult } from "@/lib/pjecalc/orchestrator";
import { calcularCompletude } from "@/lib/pjecalc/completude";
import { registrarAuditLog } from "@/components/cases/pjecalc/AuditLog";
import type {
  PjecalcParametrosInsert,
  PjecalcFaltaInsert,
  PjecalcFeriasInsert,
  PjecalcVerbaInsert,
  PjecalcHistoricoSalarialInsert,
  PjecalcFaltaRow,
  PjecalcFeriasRow,
  PjecalcVerbaRow,
  PjecalcHistoricoSalarialRow,
  PjecalcLiquidacaoResultadoRow,
} from "@/lib/pjecalc/types";

// =====================================================
// RESULT TYPES — Estritamente tipados
// =====================================================

export interface PjeCalculationResult {
  total_bruto: number;
  total_liquido: number;
  inss_segurado: number;
  irrf: number;
  inss_patronal: number;
  honorarios: number;
  custas: number;
  fgts_depositar: number;
  fgts_multa_40: number;
  total_reclamante: number;
  total_reclamado: number;
  resultado: Record<string, unknown> | null;
  engine_version: string | null;
  status: string | null;
  data_liquidacao: string | null;
}

export interface CaseBasicInfo {
  id: string;
  cliente: string;
  numero_processo: string | null;
  status: string;
  tags: string[] | null;
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function usePjeCalculator(caseId: string | undefined) {
  const queryClient = useQueryClient();
  const safeCaseId = caseId || '';
  const cacheKey = ['pjecalc_full', safeCaseId] as const;

  // =====================================================
  // CASE BASIC INFO (from cases table)
  // =====================================================
  const {
    data: caseData,
    isLoading: caseLoading,
  } = useQuery({
    queryKey: ['pjecalc_case_info', safeCaseId],
    queryFn: async (): Promise<CaseBasicInfo | null> => {
      try {
        return await svc.getCaseBasic(safeCaseId);
      } catch (e) {
        toast.error("Erro ao carregar caso: " + (e as Error).message);
        return null;
      }
    },
    enabled: !!safeCaseId,
    staleTime: 60_000,
  });

  // =====================================================
  // ALL PJECALC DATA — single batch query
  // =====================================================
  const {
    data: pjeData,
    isLoading: dataLoading,
    refetch,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      try {
        return await svc.loadCaseData(safeCaseId);
      } catch (e) {
        toast.error("Erro ao carregar dados PJe-Calc: " + (e as Error).message);
        throw e;
      }
    },
    enabled: !!safeCaseId,
    staleTime: 30_000,
  });

  // Completude
  const completude = pjeData
    ? calcularCompletude(svc.toCompletionInput(pjeData))
    : {};

  // =====================================================
  // INVALIDATION HELPER
  // =====================================================
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: cacheKey });
  };

  // =====================================================
  // PARÂMETROS
  // =====================================================

  const saveParams = useMutation({
    mutationFn: async (payload: PjecalcParametrosInsert) => {
      try {
        await svc.upsertParametros(payload);
        registrarAuditLog(safeCaseId, 'Parâmetros', pjeData?.params ? 'edicao' : 'criacao');
      } catch (e) {
        throw e;
      }
    },
    onSuccess: () => { invalidate(); toast.success("Parâmetros salvos!"); },
    onError: (e: Error) => toast.error("Erro ao salvar parâmetros: " + e.message),
  });

  // =====================================================
  // FALTAS
  // =====================================================

  const addFalta = useMutation({
    mutationFn: async (payload: PjecalcFaltaInsert) => {
      await svc.insertFalta(payload);
      registrarAuditLog(safeCaseId, 'Faltas', 'criacao');
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao adicionar falta: " + e.message),
  });

  const updateFalta = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PjecalcFaltaInsert> }) => {
      await svc.updateFalta(id, updates);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao atualizar falta: " + e.message),
  });

  const removeFalta = useMutation({
    mutationFn: async (id: string) => { await svc.deleteFalta(id); },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao remover falta: " + e.message),
  });

  // =====================================================
  // FÉRIAS
  // =====================================================

  const addFerias = useMutation({
    mutationFn: async (payload: PjecalcFeriasInsert) => { await svc.insertFerias(payload); },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao adicionar férias: " + e.message),
  });

  const updateFerias = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PjecalcFeriasInsert & { periodos_gozo?: unknown[]; prazo_dias?: number; relativas?: string }> }) => {
      await svc.updateFerias(id, updates);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao atualizar férias: " + e.message),
  });

  const removeFerias = useMutation({
    mutationFn: async (id: string) => { await svc.deleteFerias(id); },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao remover férias: " + e.message),
  });

  const generateFeriasAuto = useMutation({
    mutationFn: async ({ dataAdmissao, dataDemissao, regimeTrabalho }: {
      dataAdmissao: string;
      dataDemissao: string;
      regimeTrabalho: string;
    }) => {
      if (!dataAdmissao || !dataDemissao) throw new Error("Preencha as datas de admissão e demissão.");
      
      // Delete existing
      await svc.deleteFeriasByCaseId(safeCaseId);

      const adm = new Date(dataAdmissao);
      const dem = new Date(dataDemissao);
      const periodos: PjecalcFeriasInsert[] = [];
      let aqInicio = new Date(adm);

      while (aqInicio < dem) {
        const aqFim = new Date(aqInicio);
        aqFim.setFullYear(aqFim.getFullYear() + 1);
        aqFim.setDate(aqFim.getDate() - 1);
        const concInicio = new Date(aqFim);
        concInicio.setDate(concInicio.getDate() + 1);
        const concFim = new Date(concInicio);
        concFim.setFullYear(concFim.getFullYear() + 1);
        concFim.setDate(concFim.getDate() - 1);
        const situacao = concFim <= dem ? 'gozadas' : 'indenizadas';

        periodos.push({
          case_id: safeCaseId,
          periodo_aquisitivo_inicio: aqInicio.toISOString().slice(0, 10),
          periodo_aquisitivo_fim: aqFim > dem ? dem.toISOString().slice(0, 10) : aqFim.toISOString().slice(0, 10),
          periodo_concessivo_inicio: concInicio.toISOString().slice(0, 10),
          periodo_concessivo_fim: concFim.toISOString().slice(0, 10),
          dias: regimeTrabalho === 'tempo_integral' ? 30 : 18,
          situacao,
          dobra: situacao !== 'indenizadas' && concFim > dem,
        });

        aqInicio = new Date(aqFim);
        aqInicio.setDate(aqInicio.getDate() + 1);
      }

      if (periodos.length > 0) {
        await svc.insertFeriasBatch(periodos);
      }
      registrarAuditLog(safeCaseId, 'Férias', 'criacao', { valorNovo: `${periodos.length} períodos` });
      return periodos.length;
    },
    onSuccess: (count) => { invalidate(); toast.success(`${count} período(s) gerado(s)`); },
    onError: (e: Error) => toast.error("Erro ao gerar férias: " + e.message),
  });

  // =====================================================
  // HISTÓRICO SALARIAL
  // =====================================================

  const addHistorico = useMutation({
    mutationFn: async (payload: PjecalcHistoricoSalarialInsert) => {
      await svc.insertHistoricoSalarial(payload);
      registrarAuditLog(safeCaseId, 'Histórico', 'criacao');
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao adicionar histórico: " + e.message),
  });

  const removeHistorico = useMutation({
    mutationFn: async (id: string) => { await svc.deleteHistoricoSalarial(id); },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao remover histórico: " + e.message),
  });

  // =====================================================
  // VERBAS
  // =====================================================

  const addVerba = useMutation({
    mutationFn: async (payload: PjecalcVerbaInsert) => {
      await svc.insertVerba(payload);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao adicionar verba: " + e.message),
  });

  const addVerbasBatch = useMutation({
    mutationFn: async (payloads: PjecalcVerbaInsert[]) => {
      await svc.insertVerbasBatch(payloads);
      registrarAuditLog(safeCaseId, 'Verbas', 'criacao', { valorNovo: `${payloads.length} verbas` });
    },
    onSuccess: () => { invalidate(); toast.success("Verbas adicionadas!"); },
    onError: (e: Error) => toast.error("Erro ao adicionar verbas: " + e.message),
  });

  const removeVerba = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome?: string }) => {
      await svc.deleteVerba(id);
      registrarAuditLog(safeCaseId, 'Verbas', 'exclusao', { valorAnterior: nome });
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Erro ao remover verba: " + e.message),
  });

  // =====================================================
  // LIQUIDAÇÃO
  // =====================================================

  const liquidar = useMutation({
    mutationFn: async (): Promise<OrchestratorResult> => {
      return await executarLiquidacao(safeCaseId, 'manual');
    },
    onSuccess: (res) => {
      invalidate();
      toast.success(`Liquidação concluída! Total: R$ ${res.result.resumo.liquido_reclamante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    },
    onError: (e: Error) => toast.error("Erro na liquidação: " + e.message),
  });

  // =====================================================
  // TYPED ACCESSORS
  // =====================================================

  const resultado: PjeCalculationResult | null = pjeData?.resultado
    ? {
        total_bruto: pjeData.resultado.total_bruto,
        total_liquido: pjeData.resultado.total_liquido,
        // Lê os nomes REAIS da view (`desconto_*`); antes lia `inss_segurado`
        // etc. (tabela antiga) → undefined. Mantém as chaves do shape de display.
        inss_segurado: pjeData.resultado.desconto_inss_reclamante,
        irrf: pjeData.resultado.desconto_ir,
        inss_patronal: pjeData.resultado.desconto_inss_reclamado,
        honorarios: pjeData.resultado.honorarios,
        custas: pjeData.resultado.custas,
        fgts_depositar: pjeData.resultado.fgts_depositar,
        fgts_multa_40: pjeData.resultado.fgts_multa_40,
        total_reclamante: pjeData.resultado.total_reclamante,
        total_reclamado: pjeData.resultado.total_reclamado,
        resultado: pjeData.resultado.resultado,
        engine_version: pjeData.resultado.engine_version,
        status: pjeData.resultado.status,
        data_liquidacao: pjeData.resultado.data_liquidacao,
      }
    : null;

  return {
    // Case info
    caseData,
    caseLoading,

    // PJe-Calc data (typed)
    params: pjeData?.params ?? null,
    faltas: (pjeData?.faltas ?? []) as PjecalcFaltaRow[],
    ferias: (pjeData?.ferias ?? []) as PjecalcFeriasRow[],
    historicos: (pjeData?.historicos ?? []) as PjecalcHistoricoSalarialRow[],
    verbas: (pjeData?.verbas ?? []) as PjecalcVerbaRow[],
    cartaoPonto: pjeData?.cartaoPonto ?? [],
    resultado,
    rawResultado: pjeData?.resultado ?? null,
    fgtsConfig: pjeData?.fgtsConfig ?? null,
    csConfig: pjeData?.csConfig ?? null,
    irConfig: pjeData?.irConfig ?? null,
    correcaoConfig: pjeData?.correcaoConfig ?? null,
    honorarios: pjeData?.honorarios ?? null,
    custasConfig: pjeData?.custasConfig ?? null,
    multasConfig: pjeData?.multasConfig ?? null,

    // State
    isLoading: caseLoading || dataLoading,
    completude,

    // Actions
    refetch,
    invalidate,
    saveParams,
    addFalta,
    updateFalta,
    removeFalta,
    addFerias,
    updateFerias,
    removeFerias,
    generateFeriasAuto,
    addHistorico,
    removeHistorico,
    addVerba,
    addVerbasBatch,
    removeVerba,
    liquidar,
  };
}
