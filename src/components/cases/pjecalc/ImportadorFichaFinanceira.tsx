import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { Upload, FileText, Loader2, Check, AlertTriangle, Download, Eye } from "lucide-react";
import { logger } from "@/lib/logger";

interface RubricaExtraida {
  codigo: string;
  denominacao: string;
  classificacao?: string;
  categoria: string;
  valores_mensais: { competencia: string; valor: number }[];
}

interface DadosExtraidos {
  ano: number;
  empregado?: string;
  empresa?: string;
  rubricas: RubricaExtraida[];
  resumo_mensal?: { competencia: string; total_vencimentos: number }[];
}

interface Props {
  caseId: string;
  onImported?: () => void;
}

const CATEGORIA_LABELS: Record<string, string> = {
  comissao: "Comissão",
  dsr: "DSR",
  premio: "Prêmio",
  adicional_noturno: "Adic. Noturno",
  hora_extra: "Hora Extra",
  salario_base: "Salário Base",
  outros: "Outros",
};

const CATEGORIA_COLORS: Record<string, string> = {
  comissao: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  dsr: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  premio: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  adicional_noturno: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  hora_extra: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  salario_base: "bg-primary/10 text-primary",
  outros: "bg-muted text-muted-foreground",
};

export function ImportadorFichaFinanceira({ caseId, onImported }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "analyzing" | "review" | "importing">("upload");
  const [tipoDoc, setTipoDoc] = useState<"ficha_financeira" | "contracheque">("ficha_financeira");
  const [dados, setDados] = useState<DadosExtraidos | null>(null);
  const [selectedRubricas, setSelectedRubricas] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState<"historico" | "ocorrencias">("historico");
  const [fileName, setFileName] = useState("");

  const resetState = () => {
    setStep("upload");
    setDados(null);
    setSelectedRubricas(new Set());
    setFileName("");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStep("analyzing");

    try {
      let texto = "";
      let tempStoragePath: string | null = null;

      if (file.type === "text/plain" || file.type === "text/csv") {
        texto = await file.text();
      } else if (file.type === "application/pdf") {
        // Upload to storage — Claude lê o PDF direto quando disponível
        // (muito mais preciso que OCR pra tabelas fixed-width ADP/Via Varejo)
        const path = `temp/ficha_${caseId}_${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from("case-documents").upload(path, file);
        if (upErr) throw new Error("Erro no upload: " + upErr.message);
        tempStoragePath = path;

        // OCR como fallback — texto continua útil se PDF source falhar
        const { data: ocrData, error: ocrErr } = await supabase.functions.invoke("ocr-document", {
          body: { storage_path: path, mime_type: "application/pdf" },
        });
        if (ocrErr) throw new Error("Erro no OCR: " + ocrErr.message);
        texto = ocrData?.text || ocrData?.texto || "";
      } else {
        texto = await file.text();
      }

      if (!texto || texto.length < 50) {
        throw new Error("Não foi possível extrair texto do documento. Verifique se é um PDF válido.");
      }

      // Send to AI parser — Claude lê PDF direto quando storage_path
      // disponível, fallback pro OCR texto se download falhar.
      const { data: parsed, error: parseErr } = await supabase.functions.invoke("parse-ficha-financeira", {
        body: {
          texto_documento: texto.slice(0, 80000),
          tipo_documento: tipoDoc,
          ano_referencia: new Date().getFullYear(),
          storage_path: tempStoragePath,
          storage_bucket: "case-documents",
        },
      });

      // Cleanup temp file DEPOIS do parse (antes deletava antes — Claude
      // não conseguia baixar o PDF porque já não existia)
      if (tempStoragePath) {
        await supabase.storage.from("case-documents").remove([tempStoragePath]);
      }

      if (parseErr) throw new Error("Erro na análise: " + parseErr.message);
      if (parsed?.error) throw new Error(parsed.error);

      // Persist to document_pipeline + extracao_item for audit
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id || 'anonymous';
        
        // Create pipeline record
        const { data: pipeline } = await supabase.from("document_pipeline").insert({
          case_id: caseId,
          document_id: crypto.randomUUID(),
          user_id: userId,
          pipeline_type: tipoDoc === "contracheque" ? "CONTRACHEQUE" : "FICHA_FINANCEIRA",
          template_detectado: tipoDoc,
          empresa_detectada: parsed.empresa || null,
          status: "extraido",
        } as Record<string, unknown>).select("id").single();

        // Create extracao_items for each rubrica
        if (pipeline?.id && parsed.rubricas) {
          const items = parsed.rubricas.flatMap((rub: any, ri: number) =>
            (rub.valores_mensais || []).map((vm: any) => ({
              case_id: caseId,
              pipeline_id: pipeline.id,
              field_key: `rubrica_${rub.codigo}_${vm.competencia}`,
              valor: String(vm.valor),
              confidence: 0.85,
              competencia: vm.competencia,
              target_table: "pjecalc_hist_salarial",
              target_field: rub.categoria || "outros",
              evidence_text: `${rub.codigo} ${rub.denominacao} [${rub.classificacao || 'PGTO'}]`,
              status: "AUTO",
            }))
          );
          if (items.length > 0) {
            await supabase.from("extracao_item").insert(items);
          }
        }
      } catch (pipeErr) {
        logger.warn("Pipeline audit persistence failed (non-blocking)", { error: pipeErr });
      }

      setDados(parsed);
      // Select all rubricas by default
      setSelectedRubricas(new Set(parsed.rubricas.map((_: any, i: number) => String(i))));
      setStep("review");

    } catch (err) {
      toast.error((err as Error).message);
      setStep("upload");
    }

    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (!dados) return;
    setStep("importing");

    try {
      const rubricasSelecionadas = dados.rubricas.filter((_, i) => selectedRubricas.has(String(i)));
      let importedCount = 0;
      let errorCount = 0;

      if (importMode === "historico") {
        for (const rub of rubricasSelecionadas) {
          if (rub.valores_mensais.length === 0) continue;

          const sorted = [...rub.valores_mensais].sort((a, b) => a.competencia.localeCompare(b.competencia));
          const inicio = sorted[0].competencia + "-01";
          const lastComp = sorted[sorted.length - 1].competencia;
          const [y, m] = lastComp.split("-").map(Number);
          const lastDay = new Date(y, m, 0).getDate();
          const fim = `${lastComp}-${String(lastDay).padStart(2, "0")}`;

          // Average value for the historico header
          const avg = sorted.reduce((s, v) => s + v.valor, 0) / sorted.length;

          // Insert into the view (triggers pjecalc_hist_ioi → pjecalc_hist_salarial)
          const { data: inserted, error } = await fromUntyped("pjecalc_historico_salarial")
            .insert({
              case_id: caseId,
              nome: `${rub.denominacao} (${CATEGORIA_LABELS[rub.categoria] || rub.categoria})`,
              periodo_inicio: inicio,
              periodo_fim: fim,
              tipo_valor: rub.categoria === 'salario_base' ? 'FIXO' : 'VARIAVEL',
              valor_informado: Math.round(avg * 100) / 100,
              incidencia_fgts: true,
              incidencia_cs: true,
            })
            .select("id")
            .single();

          if (error) {
            logger.error("Insert historico error", error);
            errorCount++;
            continue;
          }

          // Insert monthly occurrences via view (triggers → pjecalc_hist_salarial_mes)
          if ((inserted as Record<string, unknown>)?.id) {
            const ocorrencias = sorted.map((v) => ({
              historico_id: (inserted as Record<string, unknown>).id,
              case_id: caseId,
              competencia: v.competencia,
              valor: v.valor,
              tipo: "informado",
            }));

            const { error: ocorrErr } = await fromUntyped("pjecalc_historico_ocorrencias")
              .insert(ocorrencias);
            
            if (ocorrErr) {
              logger.error("Insert ocorrencias error", ocorrErr);
              errorCount++;
            } else {
              importedCount++;
            }
          }
        }
      } else {
        toast.info("Importação como ocorrências será implementada em breve.");
      }

      // Invalidate all related queries
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] }),
        qc.invalidateQueries({ queryKey: ["pjecalc_historico_ocorrencias"] }),
      ]);

      if (errorCount > 0) {
        toast.warning(`${importedCount} rubrica(s) importada(s), ${errorCount} com erro.`);
      } else {
        toast.success(`${importedCount} rubrica(s) importada(s).`);
      }
      onImported?.();
      setOpen(false);
      resetState();

    } catch (err) {
      toast.error("Erro na importação: " + (err as Error).message);
      setStep("review");
    }
  };

  const totalValores = dados?.rubricas
    .filter((_, i) => selectedRubricas.has(String(i)))
    .reduce((sum, r) => sum + r.valores_mensais.reduce((s, v) => s + v.valor, 0), 0) || 0;

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtComp = (c: string) => {
    const [y, m] = c.split("-");
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${meses[parseInt(m) - 1]}/${y}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-1" />
          Importar Ficha Financeira
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Importador de Ficha Financeira / Contracheque
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Documento</Label>
              <Select value={tipoDoc} onValueChange={(v: any) => setTipoDoc(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ficha_financeira">Ficha Financeira</SelectItem>
                  <SelectItem value="contracheque">Demonstrativo de Pagamento (Contracheque)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
              <CardContent className="p-8 text-center space-y-3">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Clique para selecionar o arquivo</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, TXT ou CSV</p>
                </div>
              </CardContent>
            </Card>

            <input ref={fileRef} type="file" accept=".pdf,.txt,.csv" className="hidden" onChange={handleFileSelect} />

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium">Regras de Extração:</p>
              {tipoDoc === "ficha_financeira" ? (
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>Apenas linhas com <strong>Clas. = PGTO</strong> serão consideradas</li>
                  <li>Cada coluna mensal será mapeada para uma competência</li>
                  <li>Valores categorizados: Comissões, DSR, Prêmios, Adic. Noturno, HE</li>
                </ul>
              ) : (
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>Apenas valores na coluna <strong>VENCIMENTOS</strong> serão considerados</li>
                  <li>Referência do mês extraída do cabeçalho</li>
                  <li>Descontos serão ignorados</li>
                </ul>
              )}
            </div>
          </div>
        )}

        {step === "analyzing" && (
          <div className="p-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <div>
              <p className="text-sm font-medium">Analisando documento...</p>
              <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
              <p className="text-[10px] text-muted-foreground mt-2">
                A IA está extraindo rubricas, classificações e valores mensais
              </p>
            </div>
          </div>
        )}

        {step === "review" && dados && (
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-4 p-1">
              {/* Summary header */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline">Ano: {dados.ano}</Badge>
                {dados.empregado && <Badge variant="secondary">{dados.empregado}</Badge>}
                {dados.empresa && <Badge variant="secondary">{dados.empresa}</Badge>}
                <Badge className="bg-primary/10 text-primary">{dados.rubricas.length} rubrica(s)</Badge>
              </div>

              <Separator />

              {/* Import mode */}
              <div className="flex items-center gap-4">
                <Label className="text-xs font-medium">Destino:</Label>
                <Select value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                  <SelectTrigger className="h-8 text-xs w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="historico">Histórico Salarial (com ocorrências mensais)</SelectItem>
                    <SelectItem value="ocorrencias">Ocorrências de Verbas existentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rubricas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Rubricas Extraídas</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setSelectedRubricas(new Set(dados.rubricas.map((_, i) => String(i))))}>
                      Selecionar Todas
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setSelectedRubricas(new Set())}>
                      Desmarcar
                    </Button>
                  </div>
                </div>

                {dados.rubricas.map((rub, idx) => {
                  const selected = selectedRubricas.has(String(idx));
                  const totalRub = rub.valores_mensais.reduce((s, v) => s + v.valor, 0);

                  return (
                    <Card key={idx} className={selected ? "border-primary/50 bg-primary/5" : "opacity-60"}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(v) => {
                              const next = new Set(selectedRubricas);
                              if (v) next.add(String(idx)); else next.delete(String(idx));
                              setSelectedRubricas(next);
                            }}
                          />
                          <Badge variant="outline" className="text-[10px] font-mono">{rub.codigo}</Badge>
                          <span className="text-xs font-medium flex-1">{rub.denominacao}</span>
                          <Badge className={`text-[10px] ${CATEGORIA_COLORS[rub.categoria] || CATEGORIA_COLORS.outros}`}>
                            {CATEGORIA_LABELS[rub.categoria] || rub.categoria}
                          </Badge>
                          <span className="text-xs font-mono font-medium">{fmtBRL(totalRub)}</span>
                        </div>

                        {selected && (
                          <div className="flex flex-wrap gap-1 pl-8">
                            {rub.valores_mensais.map((v, vi) => (
                              <div key={vi} className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">
                                {fmtComp(v.competencia)}: {fmtBRL(v.valor)}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Monthly summary */}
              {dados.resumo_mensal && dados.resumo_mensal.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Resumo Mensal (Total Vencimentos)</Label>
                    <div className="flex flex-wrap gap-1">
                      {dados.resumo_mensal.map((r, i) => (
                        <div key={i} className="text-[10px] bg-muted/50 px-2 py-0.5 rounded font-mono">
                          {fmtComp(r.competencia)}: {fmtBRL(r.total_vencimentos)}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {selectedRubricas.size} rubrica(s) selecionada(s) · Total: <strong>{fmtBRL(totalValores)}</strong>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { resetState(); }}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleImport} disabled={selectedRubricas.size === 0}>
                    <Download className="h-4 w-4 mr-1" />
                    Importar {selectedRubricas.size} Rubrica(s)
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {step === "importing" && (
          <div className="p-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">Importando dados...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
