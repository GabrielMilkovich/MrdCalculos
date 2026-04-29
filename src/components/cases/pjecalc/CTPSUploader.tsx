/**
 * CTPS Uploader — extrai férias, faltas e afastamentos via detect-template
 * Persiste no document_pipeline + extracao_item e popula pjecalc_evento_intervalo
 */

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import {
  Upload, Loader2, CheckCircle2, AlertTriangle,
  FileText, Calendar, X, Check, Edit2
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  caseId: string;
  onExtracted?: () => void;
}

interface EventoExtraido {
  tipo: string;
  data_inicio: string;
  data_fim: string;
  motivo?: string;
  aquisitivo_inicio?: string;
  aquisitivo_fim?: string;
  concessivo_inicio?: string;
  concessivo_fim?: string;
  dias?: number;
  situacao?: string;
  confidence: number;
  evidence?: string;
  status: "AUTO" | "REVISAR" | "CONFIRMADO" | "REJEITADO";
}

export function CTPSUploader({ caseId, onExtracted }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"idle" | "uploading" | "reviewing" | "saving">("idle");
  const [eventos, setEventos] = useState<EventoExtraido[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep("uploading");

    try {
      // 1. Upload to storage
      const path = `${caseId}/ctps_${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("case-documents").upload(path, file);
      if (upErr) throw new Error("Upload falhou: " + upErr.message);

      // 2. Create document record
      const { data: doc, error: docErr } = await supabase.from("documents").insert({
        case_id: caseId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        tipo: "ctps" as any,
        status: "processing",
      }).select("id").single();
      if (docErr) throw docErr;

      // 3. OCR the document
      const { data: ocrData, error: ocrErr } = await supabase.functions.invoke("ocr-document", {
        body: { storage_path: path, mime_type: file.type },
      });
      if (ocrErr) throw new Error("OCR falhou: " + ocrErr.message);
      const texto = ocrData?.text || ocrData?.texto || "";

      // 4. Call detect-template to classify and extract
      const { data: detected, error: dtErr } = await supabase.functions.invoke("detect-template", {
        body: {
          document_id: doc.id,
          case_id: caseId,
          texto_documento: texto.slice(0, 25000),
          tipo_esperado: "CTPS",
        },
      });
      if (dtErr) throw new Error("Detecção falhou: " + dtErr.message);

      // 5. Parse extraction items for CTPS events
      const items = detected?.items || [];
      const eventosExtraidos: EventoExtraido[] = [];

      for (const item of items) {
        if (item.field_key?.startsWith("ferias_")) {
          eventosExtraidos.push({
            tipo: "FERIAS",
            data_inicio: item.valor?.gozo_inicio || item.valor?.aquisitivo_inicio || "",
            data_fim: item.valor?.gozo_fim || item.valor?.aquisitivo_fim || "",
            aquisitivo_inicio: item.valor?.aquisitivo_inicio,
            aquisitivo_fim: item.valor?.aquisitivo_fim,
            concessivo_inicio: item.valor?.concessivo_inicio,
            concessivo_fim: item.valor?.concessivo_fim,
            dias: item.valor?.dias || 30,
            situacao: item.valor?.situacao || "GOZADAS",
            confidence: item.confidence || 0.7,
            evidence: item.evidence_text,
            status: (item.confidence || 0) >= 0.8 ? "AUTO" : "REVISAR",
          });
        } else if (item.field_key?.startsWith("afastamento_") || item.field_key?.startsWith("falta_")) {
          eventosExtraidos.push({
            tipo: item.valor?.tipo || "AFASTAMENTO",
            data_inicio: item.valor?.inicio || "",
            data_fim: item.valor?.fim || "",
            motivo: item.valor?.motivo || "",
            confidence: item.confidence || 0.7,
            evidence: item.evidence_text,
            status: (item.confidence || 0) >= 0.8 ? "AUTO" : "REVISAR",
          });
        } else if (item.field_key === "admissao" || item.field_key === "demissao") {
          // Update dados do processo
          await fromUntyped("pjecalc_parametros").upsert({
            case_id: caseId,
            [item.field_key === "admissao" ? "data_admissao" : "data_demissao"]: item.valor,
          }, { onConflict: "case_id" } as Record<string, unknown>);
        }
      }

      // Update document status
      await supabase.from("documents").update({ status: "processed" }).eq("id", doc.id);

      if (eventosExtraidos.length === 0) {
        toast.info("Nenhum evento de férias/afastamento encontrado no documento.");
        setStep("idle");
        return;
      }

      setEventos(eventosExtraidos);
      setStep("reviewing");

    } catch (err) {
      toast.error((err as Error).message);
      setStep("idle");
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    setStep("saving");
    try {
      const confirmed = eventos.filter(e => e.status !== "REJEITADO");
      
      for (const ev of confirmed) {
        if (ev.tipo === "FERIAS") {
          await fromUntyped("pjecalc_ferias").insert({
            case_id: caseId,
            periodo_aquisitivo_inicio: ev.aquisitivo_inicio || ev.data_inicio,
            periodo_aquisitivo_fim: ev.aquisitivo_fim || ev.data_fim,
            gozo_inicio: ev.data_inicio,
            gozo_fim: ev.data_fim,
            dias: ev.dias || 30,
            situacao: ev.situacao || "GOZADAS",
          });
        } else {
          await fromUntyped("pjecalc_faltas").insert({
            case_id: caseId,
            data_inicial: ev.data_inicio,
            data_final: ev.data_fim,
            tipo_falta: ev.tipo,
            motivo: ev.motivo,
            justificada: ev.tipo === "LICENCA_MATERNIDADE" || ev.tipo === "ATESTADO",
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["pjecalc_ferias", caseId] });
      qc.invalidateQueries({ queryKey: ["pjecalc_faltas", caseId] });
      toast.success(`${confirmed.length} evento(s) importado(s) da CTPS`);
      onExtracted?.();
      setStep("idle");
      setEventos([]);
    } catch (err) {
      toast.error((err as Error).message);
      setStep("reviewing");
    }
  };

  const toggleStatus = (idx: number, status: EventoExtraido["status"]) => {
    setEventos(prev => prev.map((e, i) => i === idx ? { ...e, status } : e));
  };

  const fmtDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return d; }
  };

  if (step === "idle") {
    return (
      <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}>
        <CardContent className="p-6 text-center space-y-2">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm font-medium">Upload CTPS (PDF)</p>
          <p className="text-xs text-muted-foreground">
            Extrair férias, faltas e afastamentos automaticamente
          </p>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
        </CardContent>
      </Card>
    );
  }

  if (step === "uploading") {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium">Processando CTPS...</p>
          <p className="text-xs text-muted-foreground">OCR + detecção de template + extração de eventos</p>
        </CardContent>
      </Card>
    );
  }

  if (step === "saving") {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium">Salvando eventos...</p>
        </CardContent>
      </Card>
    );
  }

  // Reviewing
  const ferias = eventos.filter(e => e.tipo === "FERIAS");
  const afastamentos = eventos.filter(e => e.tipo !== "FERIAS");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Eventos Extraídos da CTPS</span>
          <Badge variant="outline" className="text-[10px]">{eventos.length} encontrado(s)</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setStep("idle"); setEventos([]); }}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-3.5 w-3.5 mr-1" />
            Salvar {eventos.filter(e => e.status !== "REJEITADO").length} evento(s)
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-3">
          {ferias.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Férias ({ferias.length})
              </p>
              {ferias.map((ev, i) => {
                const globalIdx = eventos.indexOf(ev);
                return (
                  <Card key={i} className={`${ev.status === "REJEITADO" ? "opacity-40" : ""}`}>
                    <CardContent className="p-2.5 flex items-center gap-2 flex-wrap">
                      <Badge className={ev.confidence >= 0.8 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[9px]" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[9px]"}>
                        {Math.round(ev.confidence * 100)}%
                      </Badge>
                      <span className="text-xs">
                        Aquis: {fmtDate(ev.aquisitivo_inicio || "")} → {fmtDate(ev.aquisitivo_fim || "")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Gozo: {fmtDate(ev.data_inicio)} → {fmtDate(ev.data_fim)}
                      </span>
                      <Badge variant="secondary" className="text-[9px]">{ev.situacao}</Badge>
                      <div className="flex-1" />
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-600"
                          onClick={() => toggleStatus(globalIdx, "CONFIRMADO")}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                          onClick={() => toggleStatus(globalIdx, "REJEITADO")}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {afastamentos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Faltas/Afastamentos ({afastamentos.length})
              </p>
              {afastamentos.map((ev, i) => {
                const globalIdx = eventos.indexOf(ev);
                return (
                  <Card key={i} className={`${ev.status === "REJEITADO" ? "opacity-40" : ""}`}>
                    <CardContent className="p-2.5 flex items-center gap-2 flex-wrap">
                      <Badge className={ev.confidence >= 0.8 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[9px]" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[9px]"}>
                        {Math.round(ev.confidence * 100)}%
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">{ev.tipo}</Badge>
                      <span className="text-xs">
                        {fmtDate(ev.data_inicio)} → {fmtDate(ev.data_fim)}
                      </span>
                      {ev.motivo && <span className="text-xs text-muted-foreground">{ev.motivo}</span>}
                      <div className="flex-1" />
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-600"
                          onClick={() => toggleStatus(globalIdx, "CONFIRMADO")}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                          onClick={() => toggleStatus(globalIdx, "REJEITADO")}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
