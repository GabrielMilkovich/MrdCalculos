/**
 * Painel de Revisão de Extrações
 * UI para revisar/confirmar/rejeitar itens extraídos com evidência
 */

import { useState } from "react";
import Decimal from "decimal.js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check, X, Edit2, Eye, AlertTriangle, FileText,
  ChevronDown, ChevronUp, CheckCircle2,
  Clock, Loader2, Trophy, Scale, Sparkles,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import {
  ordenarPorAuthority,
  nomeDocumento,
  type CampoAutoFill,
  type CandidatoCampo,
  type DocumentoTipo,
} from "@/lib/pjecalc/auto-fill/document-authority";
import {
  aprovarProposta,
  type PropostaPersistida,
} from "@/lib/pjecalc/auto-fill/proposal-engine";

Decimal.set({ precision: 20 });

interface Props {
  caseId: string;
  pipelineId?: string;
  onConfirmAll?: () => void;
}

type ExtractionStatus = Database["public"]["Enums"]["extracao_status"];

interface ExtractionItem {
  id: string;
  pipeline_id: string;
  field_key: string;
  valor: string | null;
  confidence: number | null;
  page: number | null;
  evidence_text: string | null;
  status: ExtractionStatus;
  target_table: string | null;
  target_field: string | null;
  competencia: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  source_doc_id: string | null;
}

interface PipelineRow {
  id: string;
  template_detectado: string | null;
  template_version: string | null;
  empresa_detectada: string | null;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  AUTO: { label: "Auto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  REVISAR: { label: "Revisar", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertTriangle },
  CONFIRMADO: { label: "Confirmado", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 },
  REJEITADO: { label: "Rejeitado", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: X },
};

const TARGET_LABELS: Record<string, string> = {
  pjecalc_rubrica_raw: "Rubrica",
  pjecalc_apuracao_diaria: "Ponto Diário",
  pjecalc_evento_intervalo: "Evento",
  pjecalc_calculos: "Dados Processo",
  pjecalc_hist_salarial: "Histórico",
};

/** Campos auto-fill validos (mantido aqui pra tipagem do mapa de destino). */
const CAMPO_LABELS: Partial<Record<CampoAutoFill, string>> = {
  data_admissao: "Data de Admissão",
  data_demissao: "Data de Demissão",
  data_ajuizamento: "Data de Ajuizamento",
  numero_processo: "Número do Processo",
  tribunal: "Tribunal",
  vara: "Vara",
  reclamante_nome: "Nome do Reclamante",
  reclamante_cpf: "CPF do Reclamante",
  reclamada_nome: "Nome da Reclamada",
  reclamada_cnpj: "CNPJ da Reclamada",
  cargo_funcao: "Cargo / Função",
  salario_base: "Salário Base",
  salario_competencia: "Salário (competência)",
  tipo_demissao: "Tipo de Demissão",
  jornada: "Jornada",
  aviso_previo: "Aviso Prévio",
};

const DESTINO_CAMPO: Partial<Record<CampoAutoFill, { tabela: string; coluna: string }>> = {
  data_admissao:    { tabela: "pjecalc_calculos", coluna: "data_admissao" },
  data_demissao:    { tabela: "pjecalc_calculos", coluna: "data_demissao" },
  data_ajuizamento: { tabela: "pjecalc_calculos", coluna: "data_ajuizamento" },
  numero_processo:  { tabela: "pjecalc_calculos", coluna: "processo_cnj" },
  tribunal:         { tabela: "pjecalc_calculos", coluna: "tribunal" },
  vara:             { tabela: "pjecalc_calculos", coluna: "vara" },
  reclamante_nome:  { tabela: "pjecalc_calculos", coluna: "reclamante_nome" },
  reclamante_cpf:   { tabela: "pjecalc_calculos", coluna: "reclamante_cpf" },
  reclamada_nome:   { tabela: "pjecalc_calculos", coluna: "reclamado_nome" },
  reclamada_cnpj:   { tabela: "pjecalc_calculos", coluna: "reclamado_cnpj" },
  cargo_funcao:     { tabela: "pjecalc_calculos", coluna: "cargo" },
  salario_base:     { tabela: "pjecalc_parametros", coluna: "salario_base" },
  tipo_demissao:    { tabela: "pjecalc_calculos", coluna: "tipo_demissao" },
  jornada:          { tabela: "pjecalc_parametros", coluna: "jornada_contratual" },
};

interface ConflitanteRaw {
  doc_tipo: DocumentoTipo;
  valor: unknown;
  score: number;
}

function isConflitanteArray(v: unknown): v is ConflitanteRaw[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      "doc_tipo" in item &&
      "valor" in item,
  );
}

function formatarValorDivergencia(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") {
    return new Decimal(v).toFixed(2);
  }
  return JSON.stringify(v);
}

export function ExtractionReviewPanel({ caseId, pipelineId, onConfirmAll }: Props) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ExtractionStatus | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sourceModalItem, setSourceModalItem] = useState<ExtractionItem | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  // Load extractions
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["extracao_items", caseId, pipelineId],
    queryFn: async () => {
      let query = supabase
        .from("extracao_item")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });

      if (pipelineId) query = query.eq("pipeline_id", pipelineId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ExtractionItem[];
    },
  });

  // Load pipeline info
  const { data: pipeline } = useQuery({
    queryKey: ["pipeline_info", pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_pipeline")
        .select("*")
        .eq("id", pipelineId!)
        .single();
      return data as PipelineRow | null;
    },
  });

  // Cross-doc divergences: case_controversies pendentes/controvertidas + propostas com conflitantes.
  const { data: divergences = [] } = useQuery({
    queryKey: ["cross_doc_divergences", caseId],
    queryFn: async () => {
      // Busca controversies abertas do caso (status pendente/controvertido).
      const { data: controv, error: errC } = await supabase
        .from("case_controversies")
        .select("id, campo, descricao, status, document_ids")
        .eq("case_id", caseId)
        .in("status", ["pendente", "controvertido"]);
      if (errC) throw errC;

      // Busca propostas pendentes com conflitantes — aqui esta o ranking real.
      const { data: propostas, error: errP } = await supabase
        .from("auto_fill_proposals")
        .select("*")
        .eq("case_id", caseId)
        .eq("status", "pendente");
      if (errP) throw errP;

      const propostasArr = (propostas ?? []) as PropostaPersistida[];
      const controvArr = (controv ?? []) as Array<{
        id: string;
        campo: string | null;
        descricao: string | null;
        status: string | null;
        document_ids: string[] | null;
      }>;

      // Cada divergencia = (controversy + proposta correspondente por campo) OU
      // (proposta com conflitantes >= 1, mesmo sem controversy registrada).
      const camposControv = new Set(
        controvArr.map((c) => c.campo).filter((c): c is string => !!c),
      );

      type DivergenciaUI = {
        id: string;
        campo: CampoAutoFill;
        controversy_id: string | null;
        proposta: PropostaPersistida | null;
        candidatos: CandidatoCampo<unknown>[];
        descricao: string | null;
      };

      const out: DivergenciaUI[] = [];

      for (const p of propostasArr) {
        const conflitantes = isConflitanteArray(p.conflitantes) ? p.conflitantes : [];
        if (conflitantes.length === 0) continue;
        // Reconstroi candidatos (vencedor + perdedores) com authority×confianca.
        const vencedor: CandidatoCampo<unknown> = {
          doc_tipo: p.doc_tipo,
          document_id: p.document_id ?? "",
          valor: p.valor_proposto,
          confianca: Number(p.confianca),
          extraido_em: new Date(p.criado_em),
          evidencia: p.evidencia ?? undefined,
        };
        const perdedores: CandidatoCampo<unknown>[] = conflitantes.map((c) => ({
          doc_tipo: c.doc_tipo,
          document_id: "",
          valor: c.valor,
          // c.score eh confianca (0-1) conforme conversao em proposal-engine.
          confianca: typeof c.score === "number" ? c.score : 0,
          extraido_em: new Date(p.criado_em),
        }));
        const controv = controvArr.find((cv) => cv.campo === p.campo);
        out.push({
          id: `prop-${p.id}`,
          campo: p.campo,
          controversy_id: controv?.id ?? null,
          proposta: p,
          candidatos: [vencedor, ...perdedores],
          descricao: controv?.descricao ?? null,
        });
        if (controv) camposControv.delete(controv.campo as string);
      }

      // Controversies sem proposta correspondente — sem ranking, mas mostra info.
      for (const cv of controvArr) {
        if (!cv.campo || !camposControv.has(cv.campo)) continue;
        // Sem proposta, nao temos candidatos nem score. Skip — UI fica vazia.
        // (Mantemos comportamento existente do ControversyManager para esses.)
      }

      return out;
    },
  });

  // Update mutation
  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExtractionItem> }) => {
      const { error } = await supabase
        .from("extracao_item")
        .update({
          ...updates,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extracao_items", caseId] });
    },
  });

  const [aplicandoDiv, setAplicandoDiv] = useState<string | null>(null);

  const aceitarRecomendacao = async (
    proposta: PropostaPersistida,
    controversyId: string | null,
  ) => {
    setAplicandoDiv(proposta.id);
    try {
      const ok = await aprovarProposta(proposta.id, async (p) => {
        const destino = DESTINO_CAMPO[p.campo];
        if (!destino) {
          return { ok: false, error: `Sem destino mapeado para campo ${p.campo}` };
        }
        const { data: row, error: errSel } = await supabase
          .from(destino.tabela as keyof Database["public"]["Tables"])
          .select("id")
          .eq("case_id", caseId)
          .maybeSingle();
        if (errSel) return { ok: false, error: errSel.message };
        const rowId = (row as { id?: string } | null)?.id;
        if (!rowId) return { ok: false, error: `Sem registro em ${destino.tabela} para o caso` };
        const update: Record<string, unknown> = { [destino.coluna]: p.valor_proposto };
        const { error } = await supabase
          .from(destino.tabela as keyof Database["public"]["Tables"])
          .update(update)
          .eq("id", rowId);
        return { ok: !error, error: error?.message };
      });
      if (!ok) {
        toast.error("Falha ao aplicar a recomendação");
        return;
      }
      toast.success("Recomendação aplicada");
      // Marca controversy como resolvida (se houver).
      if (controversyId) {
        await supabase
          .from("case_controversies")
          .update({
            status: "resolvido",
            valor_escolhido: String(proposta.valor_proposto ?? ""),
            justificativa: `Recomendação aceita via matriz de autoridade (${proposta.doc_tipo}, score ${proposta.score_final.toFixed(1)}).`,
            resolvido_em: new Date().toISOString(),
          })
          .eq("id", controversyId);
      }
      qc.invalidateQueries({ queryKey: ["cross_doc_divergences", caseId] });
    } finally {
      setAplicandoDiv(null);
    }
  };

  const handleConfirm = (id: string) => {
    updateItem.mutate({ id, updates: { status: "CONFIRMADO" } });
  };

  const handleReject = (id: string) => {
    updateItem.mutate({ id, updates: { status: "REJEITADO" } });
  };

  const handleEdit = (item: ExtractionItem) => {
    setEditingId(item.id);
    setEditValue(item.valor || "");
  };

  const handleSaveEdit = (id: string) => {
    updateItem.mutate({
      id,
      updates: { valor: editValue, status: "CONFIRMADO", review_note: "Editado manualmente" },
    });
    setEditingId(null);
  };

  const handleConfirmAll = async () => {
    const pending = filteredItems.filter(i => i.status === "AUTO" || i.status === "REVISAR");
    for (const item of pending) {
      await supabase
        .from("extracao_item")
        .update({ status: "CONFIRMADO", reviewed_at: new Date().toISOString() })
        .eq("id", item.id);
    }
    qc.invalidateQueries({ queryKey: ["extracao_items", caseId] });
    toast.success(`${pending.length} item(ns) confirmado(s)`);
    onConfirmAll?.();
  };

  const filteredItems = filter === "ALL" ? items : items.filter(i => i.status === filter);

  const stats = {
    total: items.length,
    auto: items.filter(i => i.status === "AUTO").length,
    revisar: items.filter(i => i.status === "REVISAR").length,
    confirmado: items.filter(i => i.status === "CONFIRMADO").length,
    rejeitado: items.filter(i => i.status === "REJEITADO").length,
  };

  const fmtConf = (c: number | null) => c ? `${Math.round(c * 100)}%` : "—";

  const getConfidenceIcon = (confidence: number | null) => {
    if (confidence === null || confidence === undefined) return { icon: AlertTriangle, color: 'text-muted-foreground', label: 'Sem dados' };
    if (confidence >= 0.85) return { icon: CheckCircle2, color: 'text-emerald-500', label: 'Alta' };
    if (confidence >= 0.6) return { icon: AlertTriangle, color: 'text-yellow-500', label: 'Média' };
    return { icon: X, color: 'text-destructive', label: 'Requer Revisão' };
  };

  const handleGoToSource = async (item: ExtractionItem) => {
    setSourceModalItem(item);
    setSourceUrl(null);

    if (!item.source_doc_id) {
      // Sem documento de origem registrado — abrimos o modal mostrando apenas o trecho.
      return;
    }

    setSourceLoading(true);
    try {
      // Busca o storage_path do documento e gera signed URL.
      const { data: doc, error } = await supabase
        .from("documents")
        .select("storage_path, file_name")
        .eq("id", item.source_doc_id)
        .maybeSingle();
      if (error) throw error;
      if (!doc?.storage_path) {
        toast.info("Documento de origem sem caminho de armazenamento.");
        return;
      }

      const { data: signed, error: signErr } = await supabase.functions.invoke(
        "get-signed-document-url",
        { body: { storage_path: doc.storage_path } },
      );
      if (signErr) throw signErr;

      const url = signed?.signedUrl || signed?.signed_url;
      if (!url) {
        toast.error("Não foi possível obter URL do documento.");
        return;
      }

      // Anexa #page=N para PDF viewer pular direto à página da evidência.
      const withPage = item.page ? `${url}#page=${item.page}` : url;
      setSourceUrl(withPage);
    } catch (err) {
      toast.error(`Falha ao abrir documento: ${(err as Error).message}`);
    } finally {
      setSourceLoading(false);
    }
  };

  const closeSourceModal = () => {
    setSourceModalItem(null);
    setSourceUrl(null);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">Carregando extrações...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma extração encontrada para este caso.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Faça upload de documentos e execute o detector de template para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pipeline header */}
      {pipeline && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline">{pipeline.template_detectado || "?"}</Badge>
          <Badge variant="secondary">{pipeline.template_version || "?"}</Badge>
          {pipeline.empresa_detectada && (
            <Badge variant="outline" className="font-mono">{pipeline.empresa_detectada}</Badge>
          )}
          <Badge className={
            pipeline.status === "extraido"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          }>
            {pipeline.status}
          </Badge>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px]">{stats.total} total</Badge>
        <button onClick={() => setFilter("AUTO")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "AUTO" ? "bg-blue-200 dark:bg-blue-800" : "bg-muted"}`}>
          {stats.auto} auto
        </button>
        <button onClick={() => setFilter("REVISAR")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "REVISAR" ? "bg-amber-200 dark:bg-amber-800" : "bg-muted"}`}>
          {stats.revisar} revisar
        </button>
        <button onClick={() => setFilter("CONFIRMADO")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "CONFIRMADO" ? "bg-emerald-200 dark:bg-emerald-800" : "bg-muted"}`}>
          {stats.confirmado} ✓
        </button>
        <button onClick={() => setFilter("REJEITADO")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "REJEITADO" ? "bg-red-200 dark:bg-red-800" : "bg-muted"}`}>
          {stats.rejeitado} ✗
        </button>
        <button onClick={() => setFilter("ALL")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "ALL" ? "bg-primary/20" : "bg-muted"}`}>
          Todos
        </button>

        <div className="flex-1" />
        {stats.auto + stats.revisar > 0 && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleConfirmAll}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmar Todos ({stats.auto + stats.revisar})
          </Button>
        )}
      </div>

      {/* Modal de fonte (PDF + trecho destacado) */}
      <Dialog open={!!sourceModalItem} onOpenChange={(open) => !open && closeSourceModal()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Origem da extração — {sourceModalItem?.field_key}
            </DialogTitle>
            <DialogDescription>
              {sourceModalItem?.page
                ? `Página ${sourceModalItem.page} do documento de origem`
                : "Trecho extraído do documento de origem"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden min-h-[400px]">
            {/* Esquerda: trecho destacado */}
            <div className="space-y-2 overflow-y-auto">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Trecho extraído</div>
              {sourceModalItem?.evidence_text ? (
                <div className="p-3 rounded bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-400 font-mono text-xs whitespace-pre-wrap">
                  {sourceModalItem.evidence_text}
                </div>
              ) : (
                <div className="p-3 rounded bg-muted/40 text-xs text-muted-foreground italic">
                  Sem trecho de evidência registrado para este item.
                </div>
              )}
              <div className="text-xs">
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-mono font-medium">{sourceModalItem?.valor || "—"}</span></div>
                {sourceModalItem?.competencia && (
                  <div><span className="text-muted-foreground">Competência:</span> <span className="font-mono">{sourceModalItem.competencia}</span></div>
                )}
                {sourceModalItem?.confidence != null && (
                  <div><span className="text-muted-foreground">Confiança:</span> <span className="font-mono">{fmtConf(sourceModalItem.confidence)}</span></div>
                )}
              </div>
            </div>

            {/* Direita: preview do PDF */}
            <div className="border rounded overflow-hidden bg-muted/30">
              {sourceLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sourceUrl ? (
                <iframe
                  src={sourceUrl}
                  className="w-full h-full min-h-[400px]"
                  title="Documento de origem"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center text-xs">
                  <FileText className="h-8 w-8 mb-2" />
                  {sourceModalItem?.source_doc_id
                    ? "Pré-visualização indisponível."
                    : "Item sem documento de origem vinculado. Apenas o trecho extraído está disponível."}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cross-doc divergences (authority ranking) */}
      {divergences.length > 0 && (
        <Card className="border-amber-300/70 dark:border-amber-700/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4 text-amber-600" />
              Divergências entre Documentos
              <Badge variant="secondary" className="text-[10px]">
                {divergences.length}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Documentos divergem nestes campos. Ranking via matriz de autoridade
              (peso documental × confiança da extração).
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {divergences.map((d) => {
              const ranked = ordenarPorAuthority(d.campo, d.candidatos);
              const winner = ranked[0];
              const campoLabel = CAMPO_LABELS[d.campo] ?? d.campo;
              const proposta = d.proposta;
              return (
                <div
                  key={d.id}
                  className="rounded-md border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{campoLabel}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {d.campo}
                    </Badge>
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {ranked.length} candidatos
                    </Badge>
                    {d.descricao && (
                      <span className="text-[11px] text-muted-foreground italic">
                        {d.descricao}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {ranked.map((cand, idx) => {
                      const score = new Decimal(cand.confianca).times(100).toFixed(0);
                      const isWinner = idx === 0;
                      return (
                        <div
                          key={`${d.id}-${idx}`}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                            isWinner
                              ? "bg-emerald-500/10 border border-emerald-500/30"
                              : "bg-background border border-border/50"
                          }`}
                        >
                          <Badge
                            variant={isWinner ? "default" : "outline"}
                            className="text-[9px] gap-0.5 shrink-0"
                          >
                            {isWinner ? (
                              <>
                                <Trophy className="h-2.5 w-2.5" />#1
                              </>
                            ) : (
                              <>#{idx + 1}</>
                            )}
                          </Badge>
                          <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate max-w-[180px]">
                            {nomeDocumento(cand.doc_tipo)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono truncate max-w-[200px]">
                            {formatarValorDivergencia(cand.valor)}
                          </span>
                          <div className="flex-1" />
                          <Badge variant="outline" className="text-[9px] font-mono">
                            conf {score}%
                          </Badge>
                          {isWinner && (
                            <Badge className="text-[9px] gap-0.5 bg-emerald-600 hover:bg-emerald-700">
                              <Sparkles className="h-2.5 w-2.5" />
                              Recomendado
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {proposta && (
                    <div className="text-[10px] text-muted-foreground">
                      Score final do vencedor: <span className="font-mono">{proposta.score_final.toFixed(1)}</span>
                      {" • "}
                      Resolução: <span className="font-mono">{proposta.motivo_resolucao ?? "—"}</span>
                      {" • "}
                      Vencedor: <span className="font-mono">{nomeDocumento(winner.doc_tipo)}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {proposta && (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => aceitarRecomendacao(proposta, d.controversy_id)}
                        disabled={aplicandoDiv === proposta.id}
                      >
                        {aplicandoDiv === proposta.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Aceitar recomendação
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() =>
                        toast.info(
                          "Use o painel de propostas (aba Cálculo) para escolher manualmente outro documento.",
                        )
                      }
                    >
                      Escolher outro
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Items list */}
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-1.5">
          {filteredItems.map((item) => {
            const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.REVISAR;
            const StatusIcon = sc.icon;
            const isExpanded = expandedId === item.id;
            const isEditing = editingId === item.id;

            return (
              <Card key={item.id} className="border-border/50">
                <CardContent className="p-2.5 space-y-1.5">
                  {/* Main row */}
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] ${sc.color}`}>
                      <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                      {sc.label}
                    </Badge>

                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                      {item.field_key}
                    </span>

                    {item.competencia && (
                      <Badge variant="outline" className="text-[9px] font-mono">{item.competencia}</Badge>
                    )}

                    {item.target_table && (
                      <Badge variant="secondary" className="text-[9px]">
                        {TARGET_LABELS[item.target_table] || item.target_table}
                      </Badge>
                    )}

                    {/* Confidence Icon */}
                    {(() => {
                      const conf = getConfidenceIcon(item.confidence);
                      const ConfIcon = conf.icon;
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`flex items-center gap-0.5 text-[10px] ${conf.color}`}>
                                <ConfIcon className="h-3 w-3" />
                                {fmtConf(item.confidence)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Confiança: {conf.label} ({fmtConf(item.confidence)})</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}

                    <div className="flex-1" />

                    {/* Value */}
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-6 text-[10px] w-32"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleSaveEdit(item.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs font-mono font-medium truncate max-w-[200px] cursor-default">
                              {item.valor?.slice(0, 50) || "—"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent><p className="font-mono text-xs max-w-xs break-all">{item.valor}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Actions */}
                    {item.status !== "CONFIRMADO" && item.status !== "REJEITADO" && !isEditing && (
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-600" onClick={() => handleConfirm(item.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEdit(item)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleReject(item.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>

                  {/* Expanded evidence */}
                  {isExpanded && (
                    <div className="pl-4 space-y-1">
                      <Separator />
                      {item.evidence_text && (
                        <div className="text-[10px] bg-muted/50 p-2 rounded font-mono whitespace-pre-wrap">
                          <Eye className="h-3 w-3 inline mr-1 text-muted-foreground" />
                          {item.evidence_text}
                        </div>
                      )}
                      {(item.page || item.source_doc_id || item.evidence_text) && (
                        <div className="flex items-center gap-2">
                          {item.page && <p className="text-[10px] text-muted-foreground">Página: {item.page}</p>}
                          <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5" onClick={() => handleGoToSource(item)}>
                            <Eye className="h-2.5 w-2.5 mr-0.5" /> Ver Fonte
                          </Button>
                        </div>
                      )}
                      {item.review_note && (
                        <p className="text-[10px] text-muted-foreground italic">Nota: {item.review_note}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
