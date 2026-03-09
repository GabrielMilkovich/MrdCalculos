import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Search, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Download, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, FileText, History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

const TRTS: Record<string, string> = {
  "TRT1": "Rio de Janeiro", "TRT2": "São Paulo (Capital)", "TRT3": "Minas Gerais",
  "TRT4": "Rio Grande do Sul", "TRT5": "Bahia", "TRT6": "Pernambuco",
  "TRT7": "Ceará", "TRT8": "Pará/Amapá", "TRT9": "Paraná",
  "TRT10": "Distrito Federal/Tocantins", "TRT11": "Amazonas/Roraima",
  "TRT12": "Santa Catarina", "TRT13": "Paraíba", "TRT14": "Rondônia/Acre",
  "TRT15": "Campinas (SP)", "TRT16": "Maranhão", "TRT17": "Espírito Santo",
  "TRT18": "Goiás", "TRT19": "Alagoas", "TRT20": "Sergipe",
  "TRT21": "Rio Grande do Norte", "TRT22": "Piauí", "TRT23": "Mato Grosso",
  "TRT24": "Mato Grosso do Sul",
};

const PAGE_SIZE = 24;

const TABELA_CONFIG: Record<string, { title: string; description: string; slug: string }> = {
  "salario-minimo": { title: "Salário Mínimo", description: "Valores históricos do salário mínimo nacional", slug: "salario_minimo" },
  "pisos-salariais": { title: "Pisos Salariais", description: "Pisos salariais por categoria profissional", slug: "pisos_salariais" },
  "salario-familia": { title: "Salário-família", description: "Tabela de cotas do salário-família", slug: "salario_familia" },
  "seguro-desemprego": { title: "Seguro-desemprego", description: "Faixas de cálculo do seguro-desemprego", slug: "seguro_desemprego" },
  "vale-transporte": { title: "Vale-transporte", description: "Valores de passagens por linha/município", slug: "vale_transporte" },
  "feriados": { title: "Feriados e Pontos Facultativos", description: "Calendário de feriados nacionais, estaduais e municipais", slug: "feriados" },
  "verbas": { title: "Verbas", description: "Cadastro de verbas trabalhistas padrão", slug: "verbas" },
  "contribuicao-social": { title: "Contribuição Social", description: "Tabelas de alíquotas do INSS (segurado e empregador)", slug: "contribuicao_social" },
  "imposto-renda": { title: "Imposto de Renda", description: "Tabela progressiva do IRRF e deduções", slug: "imposto_renda" },
  "custas-judiciais": { title: "Custas Judiciais", description: "Tabelas de custas por tribunal", slug: "custas_judiciais" },
  "correcao-monetaria": { title: "Correção Monetária", description: "Índices IPCA-E, INPC, TR e SELIC", slug: "correcao_monetaria" },
  "juros-mora": { title: "Juros de Mora", description: "Tabelas de juros conforme ADC 58/59 STF", slug: "juros_mora" },
  "atualizacao-indices": { title: "Atualização de Tabelas e Índices", description: "Gestão e importação de séries de índices", slug: "" },
};

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtComp(d: string) {
  if (!d) return "—";
  const [y, m] = d.split("-");
  return `${m}/${y}`;
}
function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ============================================
// Health Dashboard (Painel de Controle)
// ============================================
function HealthDashboard() {
  const qc = useQueryClient();
  const [checkingUrls, setCheckingUrls] = useState(false);
  const [urlResults, setUrlResults] = useState<Record<string, { ok: boolean; error?: string }>>({});

  const { data: registry, isLoading } = useQuery({
    queryKey: ["reference_table_registry"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reference_table_registry" as any).select("*").order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 60_000,
  });

  const { data: importRuns } = useQuery({
    queryKey: ["reference_import_runs_recent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reference_import_runs" as any)
        .select("*").order("started_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 60_000,
  });

  const { data: syncStatuses } = useQuery({
    queryKey: ["sync_status_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sync_status" as any).select("*");
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 30_000,
  });

  const { data: sources } = useQuery({
    queryKey: ["reference_sources_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reference_sources" as any).select("*").order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Derived metrics
  const totalTables = registry?.length || 0;
  const okTables = registry?.filter((r: any) => r.status === 'ok').length || 0;
  const warningTables = registry?.filter((r: any) => r.status === 'warning').length || 0;
  const brokenTables = registry?.filter((r: any) => r.status === 'broken').length || 0;
  const neverImported = registry?.filter((r: any) => !r.last_import_at).length || 0;

  const recentErrors = (importRuns || []).filter((r: any) => r.result === 'error' || r.result === 'failed');
  const last24hRuns = (importRuns || []).filter((r: any) => {
    if (!r.started_at) return false;
    return (Date.now() - new Date(r.started_at).getTime()) < 86_400_000;
  });

  const syncErrors = (syncStatuses || []).filter((s: any) => s.status === 'error');

  // Source URL health check
  const checkSourceUrls = async () => {
    setCheckingUrls(true);
    const results: typeof urlResults = {};
    for (const src of (sources || [])) {
      if (!src.url) continue;
      try {
        await fetch(src.url, { method: 'HEAD', mode: 'no-cors' });
        results[src.id] = { ok: true };
      } catch {
        results[src.id] = { ok: false, error: 'URL inacessível' };
      }
    }
    setUrlResults(results);
    setCheckingUrls(false);
    const failures = Object.values(results).filter(r => !r.ok).length;
    if (failures > 0) {
      toast.error(`${failures} fonte(s) com URL inacessível!`);
    } else {
      toast.success('Todas as fontes estão acessíveis.');
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "ok": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "broken": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ok": return "border-emerald-500/30 bg-emerald-500/5";
      case "warning": return "border-amber-500/30 bg-amber-500/5";
      case "broken": return "border-destructive/30 bg-destructive/5";
      default: return "border-border";
    }
  };

  const resultBadge = (result: string) => {
    switch (result) {
      case "success": return <Badge variant="secondary" className="text-[9px] bg-emerald-500/15 text-emerald-600">Sucesso</Badge>;
      case "error": case "failed": return <Badge variant="destructive" className="text-[9px]">Erro</Badge>;
      case "pending": return <Badge variant="outline" className="text-[9px]">Pendente</Badge>;
      default: return <Badge variant="outline" className="text-[9px]">{result}</Badge>;
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{totalTables}</div>
            <div className="text-[10px] text-muted-foreground">Total de Tabelas</div>
          </CardContent>
        </Card>
        <Card className={okTables === totalTables ? "border-emerald-500/30" : ""}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-500">{okTables}</div>
            <div className="text-[10px] text-muted-foreground">Atualizadas</div>
          </CardContent>
        </Card>
        <Card className={warningTables > 0 ? "border-amber-500/30" : ""}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-500">{warningTables}</div>
            <div className="text-[10px] text-muted-foreground">Com Alerta</div>
          </CardContent>
        </Card>
        <Card className={brokenTables > 0 ? "border-destructive/30" : ""}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{brokenTables}</div>
            <div className="text-[10px] text-muted-foreground">Com Erro</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{last24hRuns.length}</div>
            <div className="text-[10px] text-muted-foreground">Importações 24h</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      {(recentErrors.length > 0 || syncErrors.length > 0 || neverImported > 0) && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {syncErrors.map((s: any) => (
              <div key={s.id} className="flex items-start gap-2 text-xs p-2 rounded bg-background border border-destructive/20">
                <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">{s.serie_nome || `Série ${s.serie_id}`}:</span>{' '}
                  <span className="text-muted-foreground">{s.error_message}</span>
                  {s.last_sync_attempt && (
                    <span className="text-muted-foreground/60 ml-1">
                      ({new Date(s.last_sync_attempt).toLocaleString("pt-BR")})
                    </span>
                  )}
                </div>
              </div>
            ))}
            {recentErrors.slice(0, 5).map((r: any) => (
              <div key={r.id} className="flex items-start gap-2 text-xs p-2 rounded bg-background border border-destructive/20">
                <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">{r.table_slug}:</span>{' '}
                  <span className="text-muted-foreground">
                    Importação falhou em {r.started_at ? new Date(r.started_at).toLocaleString("pt-BR") : "—"}
                  </span>
                  {r.errors && Array.isArray(r.errors) && r.errors.length > 0 && (
                    <span className="text-destructive ml-1">— {(r.errors as string[])[0]}</span>
                  )}
                </div>
              </div>
            ))}
            {neverImported > 0 && (
              <div className="flex items-start gap-2 text-xs p-2 rounded bg-background border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span><span className="font-semibold">{neverImported} tabela(s)</span> nunca foram importadas.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Status (BCB APIs) */}
      {(syncStatuses || []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Sincronização Automática (BCB)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(syncStatuses || []).map((s: any) => (
                <div key={s.id} className={`p-3 rounded border ${s.status === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/20'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{s.serie_nome || `Série ${s.serie_id}`}</span>
                    {s.status === 'ok' ? (
                      <Badge variant="secondary" className="text-[9px] bg-emerald-500/15 text-emerald-600">OK</Badge>
                    ) : s.status === 'error' ? (
                      <Badge variant="destructive" className="text-[9px]">Erro</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">{s.status}</Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <div>Última tentativa: {s.last_sync_attempt ? new Date(s.last_sync_attempt).toLocaleString("pt-BR") : "Nunca"}</div>
                    <div>Último dado: {s.last_processed_date || "—"}</div>
                    {s.error_message && <div className="text-destructive">{s.error_message}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source URLs Health */}
      {(sources || []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Fontes de Dados</CardTitle>
              <Button size="sm" variant="outline" onClick={checkSourceUrls} disabled={checkingUrls}>
                {checkingUrls ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Verificar URLs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(sources || []).map((src: any) => {
                const urlCheck = urlResults[src.id];
                return (
                  <div key={src.id} className={`flex items-center justify-between p-2.5 rounded border text-xs ${
                    urlCheck ? (urlCheck.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-destructive/20 bg-destructive/5') : 'border-border'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {urlCheck ? (
                        urlCheck.ok ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{src.name}</div>
                        {src.url && <div className="text-muted-foreground truncate text-[10px]">{src.url}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant={src.active ? "secondary" : "outline"} className="text-[9px]">
                        {src.active ? "Ativa" : "Inativa"}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">{src.type}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Status Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Status por Tabela</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(registry || []).map((r: any) => {
              const urlKey = Object.entries(TABELA_CONFIG).find(([_, v]) => v.slug === r.slug)?.[0];
              const daysSinceImport = r.last_import_at
                ? Math.floor((Date.now() - new Date(r.last_import_at).getTime()) / 86_400_000)
                : null;

              return (
                <Link
                  key={r.id}
                  to={urlKey ? `/tabelas/${urlKey}` : "#"}
                  className={`block border rounded-lg p-3 transition-all hover:shadow-md ${statusColor(r.status)}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {statusIcon(r.status)}
                    <span className="text-xs font-semibold truncate">{r.name}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <div>Frequência: <span className="font-medium">{r.update_frequency}</span></div>
                    <div className="flex items-center gap-1">
                      Última:{' '}
                      <span className={`font-medium ${daysSinceImport && daysSinceImport > 60 ? 'text-destructive' : ''}`}>
                        {r.last_import_at ? new Date(r.last_import_at).toLocaleDateString("pt-BR") : "Nunca"}
                      </span>
                      {daysSinceImport !== null && daysSinceImport > 30 && (
                        <Badge variant="outline" className="text-[8px] h-3 px-1 text-destructive border-destructive/30">
                          {daysSinceImport}d
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {r.is_auto_importable && <Badge variant="secondary" className="text-[9px] h-4">Auto</Badge>}
                      {r.requires_manual_input && <Badge variant="outline" className="text-[9px] h-4">Manual</Badge>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent import runs - Enhanced */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Histórico de Importações</CardTitle>
            <Badge variant="outline" className="text-[10px]">{(importRuns || []).length} registros</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(importRuns || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma importação registrada.</p>
          ) : (
            <div className="overflow-x-auto border border-border rounded">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-primary/10 border-b border-border">
                    <th className="p-2 font-semibold text-left">Tabela</th>
                    <th className="p-2 font-semibold text-center">Início</th>
                    <th className="p-2 font-semibold text-center">Duração</th>
                    <th className="p-2 font-semibold text-center">Resultado</th>
                    <th className="p-2 font-semibold text-right">Registros</th>
                    <th className="p-2 font-semibold text-center">Trigger</th>
                    <th className="p-2 font-semibold text-center">Erros</th>
                  </tr>
                </thead>
                <tbody>
                  {(importRuns || []).map((r: any, ri: number) => {
                    const duration = r.started_at && r.finished_at
                      ? Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)
                      : null;
                    const hasErrors = r.errors && ((Array.isArray(r.errors) && r.errors.length > 0) || (typeof r.errors === 'object' && Object.keys(r.errors).length > 0));
                    return (
                      <tr key={r.id} className={ri % 2 === 0 ? "bg-muted/20" : "bg-muted/40"}>
                        <td className="p-2 border-b border-border/30 font-medium">{r.table_slug}</td>
                        <td className="p-2 border-b border-border/30 text-center">{r.started_at ? new Date(r.started_at).toLocaleString("pt-BR") : "—"}</td>
                        <td className="p-2 border-b border-border/30 text-center font-mono">{duration !== null ? `${duration}s` : "—"}</td>
                        <td className="p-2 border-b border-border/30 text-center">{resultBadge(r.result)}</td>
                        <td className="p-2 border-b border-border/30 text-right font-mono">{r.stats?.rows_inserted != null ? String(r.stats.rows_inserted) : "—"}</td>
                        <td className="p-2 border-b border-border/30 text-center">
                          <Badge variant="outline" className="text-[9px]">{r.trigger}</Badge>
                        </td>
                        <td className="p-2 border-b border-border/30 text-center">
                          {hasErrors ? (
                            <Badge variant="destructive" className="text-[9px]">
                              {Array.isArray(r.errors) ? r.errors.length : '!'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Auto Import Button
// ============================================
function AutoImportButton({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-reference-table", {
        body: { table_slug: slug, trigger: "manual" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Importação concluída: ${data?.rows_inserted || 0} registros`);
      onDone();
    } catch (err: any) {
      toast.error("Erro na importação: " + (err.message || "Falha"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleImport} disabled={importing}>
      {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
      Importar Auto
    </Button>
  );
}

// ============================================
// Export CSV Button
// ============================================
function ExportCsvButton({ data, filename }: { data: any[]; filename: string }) {
  const handleExport = () => {
    if (!data || data.length === 0) { toast.error("Sem dados para exportar"); return; }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(";"),
      ...data.map(row => headers.map(h => String(row[h] ?? "")).join(";"))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleExport}>
      <FileText className="h-3.5 w-3.5 mr-1" /> CSV
    </Button>
  );
}

// ============================================
// Pagination component
// ============================================
function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  for (let i = Math.max(1, page - 5); i <= Math.min(totalPages, page + 5); i++) pages.push(i);
  return (
    <div className="flex items-center justify-center gap-1 py-3">
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(1)} disabled={page === 1}><ChevronsLeft className="h-3 w-3" /></Button>
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(page - 1)} disabled={page === 1}><ChevronLeft className="h-3 w-3" /></Button>
      {pages.map((p) => (
        <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => onPageChange(p)}>{p}</Button>
      ))}
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}><ChevronRight className="h-3 w-3" /></Button>
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(totalPages)} disabled={page === totalPages}><ChevronsRight className="h-3 w-3" /></Button>
    </div>
  );
}

// ============================================
// CSV Import component
// ============================================
function CsvImporter({ tipo, onImported }: { tipo: string; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("Arquivo CSV deve ter cabeçalho + dados");

      const headers = lines[0].split(";").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const rows = lines.slice(1).map(l => {
        const cols = l.split(";").map(c => c.trim().replace(/"/g, ""));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
        return obj;
      });

      let inserted = 0;

      if (tipo === "salario-minimo") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"] || r["mes_ano"]),
          valor: parseNumBR(r["valor do salário"] || r["valor"] || r["valor_salario"]),
        })).filter(r => r.competencia && r.valor != null);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_salario_minimo" as any).upsert(rec as any, { onConflict: "competencia" });
          if (!error) inserted++;
        }
      } else if (tipo === "salario-familia") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          faixa: parseInt(r["faixa"] || "1"),
          valor_inicial: parseNumBR(r["vl. inicial"] || r["valor_inicial"] || "0"),
          valor_final: parseNumBR(r["vl. final"] || r["valor_final"]),
          valor_cota: parseNumBR(r["vl. do salário"] || r["valor_cota"] || r["valor"]),
        })).filter(r => r.competencia && r.valor_cota != null);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_salario_familia" as any).upsert(rec as any, { onConflict: "competencia,faixa" });
          if (!error) inserted++;
        }
      } else if (tipo === "contribuicao-social") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          tipo: r["tipo"] || "segurado_empregado",
          faixa: parseInt(r["faixa"] || "1"),
          valor_inicial: parseNumBR(r["vl. inicial"] || r["valor_inicial"] || "0"),
          valor_final: parseNumBR(r["vl. final"] || r["valor_final"]),
          aliquota: parseNumBR(r["%"] || r["aliquota"] || r["(%)"] || "0"),
          teto_maximo: parseNumBR(r["teto máx."] || r["teto_maximo"]),
          teto_beneficio: parseNumBR(r["teto ben."] || r["teto_beneficio"]),
        })).filter(r => r.competencia);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_contribuicao_social" as any).upsert(rec as any, { onConflict: "competencia,tipo,faixa" });
          if (!error) inserted++;
        }
      } else if (tipo === "imposto-renda") {
        const compMap = new Map<string, { dep: number; apos: number }>();
        rows.forEach(r => {
          const comp = parseCompetencia(r["mes/ano"] || r["competencia"]);
          if (comp) compMap.set(comp, {
            dep: parseNumBR(r["dedução por dependente"] || r["deducao_dependente"]) || 0,
            apos: parseNumBR(r["dedução por aposentado maior que 65 anos"] || r["deducao_aposentado_65"]) || 0,
          });
        });
        for (const [comp, vals] of compMap) {
          const { error } = await supabase.from("pjecalc_imposto_renda" as any).upsert({
            competencia: comp, deducao_dependente: vals.dep, deducao_aposentado_65: vals.apos,
          } as any, { onConflict: "competencia" });
          if (!error) inserted++;
        }
      } else if (tipo === "custas-judiciais") {
        const records = rows.map(r => ({
          vigencia_inicio: parseDate(r["início"] || r["inicio"] || r["vigencia_inicio"]),
          vigencia_fim: parseDate(r["fim"] || r["vigencia_fim"]) || null,
          atos_oficiais_urbana: parseNumBR(r["atos dos oficiais de justiça zona urbana"] || r["atos_oficiais_urbana"]),
          atos_oficiais_rural: parseNumBR(r["atos dos oficiais de justiça zona rural"] || r["atos_oficiais_rural"]),
          agravo_instrumento: parseNumBR(r["agravo de instrumento"] || r["agravo_instrumento"]),
          agravo_peticao: parseNumBR(r["agravo de petição"] || r["agravo_peticao"]),
          impugnacao_sentenca: parseNumBR(r["impugnação à sentença de liquidação"] || r["impugnacao_sentenca"]),
          recurso_revista: parseNumBR(r["recurso de revista"] || r["recurso_revista"]),
          embargos_arrematacao: parseNumBR(r["embargos à arrematação"] || r["embargos_arrematacao"]),
          embargos_execucao: parseNumBR(r["embargos à execução"] || r["embargos_execucao"]),
          embargos_terceiros: parseNumBR(r["embargos de terceiros"] || r["embargos_terceiros"]),
          piso_custas_conhecimento: parseNumBR(r["piso - custas conhecimento"] || r["piso_custas_conhecimento"]),
          teto_custas_liquidacao: parseNumBR(r["teto - custas liquidação"] || r["teto_custas_liquidacao"]),
          teto_custas_autos: parseNumBR(r["teto - custas de autos"] || r["teto_custas_autos"]),
        })).filter(r => r.vigencia_inicio);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_custas_judiciais" as any).upsert(rec as any, { onConflict: "vigencia_inicio" });
          if (!error) inserted++;
        }
      } else if (tipo === "correcao-monetaria") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          indice: r["índice"] || r["indice"] || r["nome"] || "IPCA-E",
          valor: parseNumBR(r["valor"] || r["indice_valor"]),
          acumulado: parseNumBR(r["acumulado"]),
          fonte: r["fonte"] || null,
        })).filter(r => r.competencia && r.valor != null);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_correcao_monetaria" as any).upsert(rec as any, { onConflict: "competencia,indice" });
          if (!error) inserted++;
        }
      } else if (tipo === "juros-mora") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          tipo: r["tipo"] || "trabalhista",
          taxa_mensal: parseNumBR(r["taxa"] || r["taxa_mensal"] || r["valor"]),
          acumulado: parseNumBR(r["acumulado"]),
        })).filter(r => r.competencia && r.taxa_mensal != null);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_juros_mora" as any).upsert(rec as any, { onConflict: "competencia,tipo" });
          if (!error) inserted++;
        }
      } else if (tipo === "seguro-desemprego") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          valor_piso: parseNumBR(r["vl. piso"] || r["valor_piso"]),
          faixa: parseInt(r["faixa"] || "1"),
          valor_inicial: parseNumBR(r["vl. inicial"] || r["valor_inicial"] || "0"),
          valor_final: parseNumBR(r["vl. final"] || r["valor_final"]),
          percentual: parseNumBR(r["percentual (%)"] || r["percentual"]),
          valor_soma: parseNumBR(r["vl. da soma"] || r["valor_soma"]),
          valor_teto: parseNumBR(r["vl. teto"] || r["valor_teto"]),
        })).filter(r => r.competencia);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_seguro_desemprego" as any).upsert(rec as any, { onConflict: "competencia,faixa" });
          if (!error) inserted++;
        }
      } else if (tipo === "pisos-salariais") {
        const records = rows.map(r => ({
          nome: r["nome"] || r["categoria"],
          uf: r["estado"] || r["uf"],
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          valor: parseNumBR(r["valor"]),
          categoria: r["categoria"] || null,
          sindicato: r["sindicato"] || null,
        })).filter(r => r.competencia && r.nome && r.uf);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_pisos_salariais" as any).insert(rec as any);
          if (!error) inserted++;
        }
      } else if (tipo === "vale-transporte") {
        const records = rows.map(r => ({
          linha: r["linha"] || r["nome"],
          uf: r["estado"] || r["uf"],
          municipio: r["município"] || r["municipio"] || null,
          valor: parseNumBR(r["valor"]),
          vigencia_inicio: parseDate(r["início"] || r["vigencia_inicio"] || r["data"]),
          vigencia_fim: parseDate(r["fim"] || r["vigencia_fim"]) || null,
        })).filter(r => r.linha && r.uf && r.vigencia_inicio);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_vale_transporte" as any).insert(rec as any);
          if (!error) inserted++;
        }
      } else if (tipo === "verbas") {
        const records = rows.map(r => ({
          nome: r["nome"],
          tipo: r["tipo"] || "principal",
          valor_tipo: r["valor"] || "calculado",
          caracteristica: r["característica"] || r["caracteristica"] || "comum",
          ocorrencia_pagamento: r["ocorrência"] || r["ocorrencia_pagamento"] || "mensal",
          incidencia_fgts: r["fgts"]?.toLowerCase() === "sim",
          incidencia_cs: r["cs"]?.toLowerCase() === "sim",
          incidencia_irpf: r["irpf"]?.toLowerCase() === "sim",
        })).filter(r => r.nome);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_verbas_padrao" as any).insert(rec as any);
          if (!error) inserted++;
        }
      } else if (tipo === "feriados") {
        const records = rows.map(r => ({
          data: parseDate(r["data"]),
          nome: r["nome"],
          scope: r["tipo"] || r["scope"] || "national",
          uf: r["uf"] || r["estado"] || null,
          municipio: r["municipio"] || r["município"] || null,
          fonte: r["fonte"] || null,
        })).filter(r => r.data && r.nome);
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_feriados" as any).insert(rec as any);
          if (!error) inserted++;
        }
      }

      // Log import run
      await supabase.from("reference_import_runs" as any).insert({
        table_slug: tipo.replace(/-/g, "_"),
        trigger: "manual",
        result: inserted > 0 ? "success" : "failed",
        stats: { rows_inserted: inserted, source: "csv", filename: file.name },
        finished_at: new Date().toISOString(),
      });

      toast.success(`${inserted} registro(s) importado(s) com sucesso`);
      onImported();
    } catch (err: any) {
      toast.error("Erro na importação: " + (err.message || "Formato inválido"));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [tipo, onImported]);

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
        Importar CSV
      </Button>
    </div>
  );
}

// ============================================
// Parse helpers
// ============================================
function parseCompetencia(s: string | undefined): string | null {
  if (!s) return null;
  s = s.trim();
  const m1 = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[2]}-${m1[1].padStart(2, "0")}-01`;
  const m2 = s.match(/^(\d{1,2})\/(\d{2})$/);
  if (m2) return `20${m2[2]}-${m2[1].padStart(2, "0")}-01`;
  if (/^\d{4}-\d{2}/.test(s)) return s.length === 7 ? s + "-01" : s;
  return null;
}
function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  s = s.trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
function parseNumBR(s: string | undefined): number | null {
  if (!s) return null;
  s = s.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ============================================
// Table toolbar
// ============================================
function TableToolbar({ tipo, slug, data, onRefresh }: { tipo: string; slug: string; data: any[]; onRefresh: () => void }) {
  const qc = useQueryClient();
  const handleDone = () => { qc.invalidateQueries(); onRefresh(); };
  const registryEntry = TABELA_CONFIG[tipo];
  const isAutoImportable = ["salario_minimo", "contribuicao_social", "imposto_renda", "salario_familia", "seguro_desemprego", "feriados", "correcao_monetaria", "juros_mora"].includes(slug);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isAutoImportable && <AutoImportButton slug={slug} onDone={handleDone} />}
      <CsvImporter tipo={tipo} onImported={handleDone} />
      <ExportCsvButton data={data} filename={`mrdcalc_${slug}_${new Date().toISOString().slice(0,10)}`} />
    </div>
  );
}

// ============================================
// Table-specific renderers
// ============================================

function SalarioMinimoView() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_salario_minimo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_salario_minimo" as any).select("*").order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <TableToolbar tipo="salario-minimo" slug="salario_minimo" data={rows} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_salario_minimo"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "Valor do Salário"]}
            rows={pageRows.map((r: any) => [fmtComp(r.competencia), fmt(r.valor)])}
            aligns={["center", "center"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function SalarioFamiliaView() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_salario_familia"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_salario_familia" as any).select("*").order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Group by competencia, pivot faixas
  const grouped = new Map<string, any>();
  (data || []).forEach((r: any) => {
    if (!grouped.has(r.competencia)) grouped.set(r.competencia, {});
    grouped.get(r.competencia)![`f${r.faixa}`] = r;
  });
  const rows = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <TableToolbar tipo="salario-familia" slug="salario_familia" data={data || []} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_salario_familia"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "F1 Vl. Inicial", "F1 Vl. Final", "F1 Vl. do Salário", "F2 Vl. Inicial", "F2 Vl. Final", "F2 Vl. do Salário"]}
            rows={pageRows.map(([comp, faixas]) => [
              fmtComp(comp),
              fmt(faixas.f1?.valor_inicial), fmt(faixas.f1?.valor_final), fmt(faixas.f1?.valor_cota),
              fmt(faixas.f2?.valor_inicial), fmt(faixas.f2?.valor_final), fmt(faixas.f2?.valor_cota),
            ])}
            aligns={["center", "right", "right", "right", "right", "right", "right"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function SeguroDesempregoView() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_seguro_desemprego"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_seguro_desemprego" as any).select("*").order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const grouped = new Map<string, any>();
  (data || []).forEach((r: any) => {
    if (!grouped.has(r.competencia)) grouped.set(r.competencia, { piso: r.valor_piso, teto: r.valor_teto });
    grouped.get(r.competencia)![`f${r.faixa}`] = r;
  });
  const rows = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <TableToolbar tipo="seguro-desemprego" slug="seguro_desemprego" data={data || []} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_seguro_desemprego"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "Vl. Piso", "F1 Vl. Inicial", "F1 Vl. Final", "F1 Percentual (%)", "F2 Vl. Inicial", "F2 Percentual (%)", "F2 Vl. da Soma", "Vl. Teto"]}
            rows={pageRows.map(([comp, d]) => [
              fmtComp(comp), fmt(d.piso),
              fmt(d.f1?.valor_inicial), fmt(d.f1?.valor_final), fmt(d.f1?.percentual),
              fmt(d.f2?.valor_inicial), fmt(d.f2?.percentual), fmt(d.f2?.valor_soma),
              fmt(d.teto),
            ])}
            aligns={["center", "right", "right", "right", "right", "right", "right", "right", "right"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function ContribuicaoSocialView() {
  const [tab, setTab] = useState("segurado_empregado");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_contribuicao_social", tab],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_contribuicao_social" as any)
        .select("*").eq("tipo", tab).order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const grouped = new Map<string, any>();
  (data || []).forEach((r: any) => {
    if (!grouped.has(r.competencia)) grouped.set(r.competencia, { teto_max: r.teto_maximo, teto_ben: r.teto_beneficio });
    grouped.get(r.competencia)![`f${r.faixa}`] = r;
  });
  const rows = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="segurado_empregado">Segurado Empregado</TabsTrigger>
            <TabsTrigger value="empregado_domestico">Empregado Doméstico</TabsTrigger>
          </TabsList>
        </Tabs>
        <TableToolbar tipo="contribuicao-social" slug="contribuicao_social" data={data || []} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_contribuicao_social"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "F1 Vl. Inicial", "F1 Vl. Final", "F1 (%)", "F2 Vl. Inicial", "F2 Vl. Final", "F2 (%)", "F3 Vl. Inicial", "F3 Vl. Final", "F3 (%)", "Teto Máx.", "Teto Ben."]}
            rows={pageRows.map(([comp, d]) => [
              fmtComp(comp),
              fmt(d.f1?.valor_inicial), fmt(d.f1?.valor_final), fmt(d.f1?.aliquota),
              fmt(d.f2?.valor_inicial), fmt(d.f2?.valor_final), fmt(d.f2?.aliquota),
              fmt(d.f3?.valor_inicial), fmt(d.f3?.valor_final), fmt(d.f3?.aliquota),
              fmt(d.teto_max), fmt(d.teto_ben),
            ])}
            aligns={Array(12).fill("right").map((_, i) => i === 0 ? "center" : "right") as any}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function ImpostoRendaView() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_imposto_renda"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_imposto_renda" as any).select("*").order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <TableToolbar tipo="imposto-renda" slug="imposto_renda" data={rows} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_imposto_renda"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          {pageRows.map((r: any) => (
            <Card key={r.id} className="mb-3">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Competência: {fmtComp(r.competencia)}</span>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Dedução Dependente: <strong>{fmt(r.deducao_dependente)}</strong></span>
                    <span>Dedução Aposentado 65+: <strong>{fmt(r.deducao_aposentado_65)}</strong></span>
                  </div>
                </div>
                {Array.isArray(r.faixas) && r.faixas.length > 0 ? (
                  <DataTable
                    headers={["De", "Até", "Alíquota", "Dedução"]}
                    rows={r.faixas.map((f: any) => [
                      fmt(f.faixa_inicio),
                      f.faixa_fim ? fmt(f.faixa_fim) : "—",
                      `${((f.aliquota || 0) * 100).toFixed(1)}%`,
                      fmt(f.deducao),
                    ])}
                    aligns={["right", "right", "right", "right"]}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Faixas não cadastradas para esta competência.</p>
                )}
              </CardContent>
            </Card>
          ))}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function CustasJudiciaisView() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_custas_judiciais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_custas_judiciais" as any).select("*").order("vigencia_inicio", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  return (
    <div>
      <div className="flex justify-end mb-3">
        <TableToolbar tipo="custas-judiciais" slug="custas_judiciais" data={data || []} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_custas_judiciais"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : (data || []).length === 0 ? <EmptyState /> : (
        <div className="overflow-x-auto">
          <DataTable
            headers={[
              "Início", "Fim", "Atos Of. Urbana", "Atos Of. Rural", "Agravo Instr.", "Agravo Pet.", "Impugn. Sent.", "Rec. Revista", "Emb. Arrem.", "Emb. Exec.", "Emb. Terc.", "Piso Conhec.", "Teto Liq.", "Teto Autos"
            ]}
            rows={(data || []).map((r: any) => [
              fmtDate(r.vigencia_inicio), r.vigencia_fim ? fmtDate(r.vigencia_fim) : "",
              fmt(r.atos_oficiais_urbana), fmt(r.atos_oficiais_rural), fmt(r.agravo_instrumento), fmt(r.agravo_peticao),
              fmt(r.impugnacao_sentenca), fmt(r.recurso_revista), fmt(r.embargos_arrematacao), fmt(r.embargos_execucao),
              fmt(r.embargos_terceiros), fmt(r.piso_custas_conhecimento), fmt(r.teto_custas_liquidacao), fmt(r.teto_custas_autos),
            ])}
            aligns={Array(14).fill("right").map((_, i) => i < 2 ? "center" : "right") as any}
          />
        </div>
      )}
    </div>
  );
}

function CorrecaoMonetariaView() {
  const [indice, setIndice] = useState("IPCA-E");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_correcao_monetaria", indice],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_correcao_monetaria" as any)
        .select("*").eq("indice", indice).order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Índice:</span>
          <Select value={indice} onValueChange={(v) => { setIndice(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["IPCA-E", "INPC", "TR", "SELIC", "IGP-M", "FACDT"].map(i => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <TableToolbar tipo="correcao-monetaria" slug="correcao_monetaria" data={rows} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_correcao_monetaria"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "Índice Mensal", "Acumulado", "Fonte"]}
            rows={pageRows.map((r: any) => [fmtComp(r.competencia), fmt(r.valor), r.acumulado ? fmt(r.acumulado) : "—", r.fonte || "—"])}
            aligns={["center", "right", "right", "center"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function JurosMoraView() {
  const [tipoJuros, setTipoJuros] = useState("trabalhista");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_juros_mora", tipoJuros],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_juros_mora" as any)
        .select("*").eq("tipo", tipoJuros).order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <Select value={tipoJuros} onValueChange={(v) => { setTipoJuros(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="trabalhista">Trabalhista</SelectItem>
            <SelectItem value="selic">SELIC</SelectItem>
            <SelectItem value="civil">Civil</SelectItem>
          </SelectContent>
        </Select>
        <TableToolbar tipo="juros-mora" slug="juros_mora" data={rows} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_juros_mora"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "Taxa Mensal (%)", "Acumulado"]}
            rows={pageRows.map((r: any) => [fmtComp(r.competencia), fmt(r.taxa_mensal), r.acumulado ? fmt(r.acumulado) : "—"])}
            aligns={["center", "right", "right"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function PisosSalariaisView() {
  const [filterNome, setFilterNome] = useState("");
  const [filterUf, setFilterUf] = useState("all");
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pjecalc_pisos_salariais", filterNome, filterUf],
    queryFn: async () => {
      let q = supabase.from("pjecalc_pisos_salariais" as any).select("*").order("competencia", { ascending: false }).limit(500);
      if (filterUf !== "all") q = q.eq("uf", filterUf);
      if (filterNome) q = q.ilike("nome", `%${filterNome}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: searched,
  });

  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Dados da Busca</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={filterNome} onChange={e => setFilterNome(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => { setSearched(true); setPage(1); refetch(); }}><Search className="h-3.5 w-3.5 mr-1" /> Buscar</Button>
            <TableToolbar tipo="pisos-salariais" slug="pisos_salariais" data={rows} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_pisos_salariais"] })} />
          </div>
        </CardContent>
      </Card>
      {isLoading ? <LoadingSpinner /> : searched && rows.length === 0 ? <EmptyState msg="Nenhum piso salarial encontrado." /> : searched ? (
        <>
          <DataTable
            headers={["Mês/Ano", "Nome", "UF", "Valor", "Categoria"]}
            rows={pageRows.map((r: any) => [fmtComp(r.competencia), r.nome, r.uf, fmt(r.valor), r.categoria || "—"])}
            aligns={["center", "left", "center", "right", "left"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

function ValeTransporteView() {
  const [filterLinha, setFilterLinha] = useState("");
  const [filterUf, setFilterUf] = useState("all");
  const [filterMun, setFilterMun] = useState("");
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pjecalc_vale_transporte", filterLinha, filterUf, filterMun],
    queryFn: async () => {
      let q = supabase.from("pjecalc_vale_transporte" as any).select("*").order("vigencia_inicio", { ascending: false }).limit(500);
      if (filterUf !== "all") q = q.eq("uf", filterUf);
      if (filterMun) q = q.ilike("municipio", `%${filterMun}%`);
      if (filterLinha) q = q.ilike("linha", `%${filterLinha}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: searched,
  });

  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Dados da Busca</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Linha</label>
              <Input value={filterLinha} onChange={e => setFilterLinha(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Município</label>
              <Input value={filterMun} onChange={e => setFilterMun(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => { setSearched(true); setPage(1); refetch(); }}><Search className="h-3.5 w-3.5 mr-1" /> Buscar</Button>
            <TableToolbar tipo="vale-transporte" slug="vale_transporte" data={rows} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_vale_transporte"] })} />
          </div>
        </CardContent>
      </Card>
      {isLoading ? <LoadingSpinner /> : searched && rows.length === 0 ? <EmptyState msg="Nenhum registro encontrado." /> : searched ? (
        <>
          <DataTable
            headers={["Linha", "UF", "Município", "Valor", "Vigência Início", "Vigência Fim"]}
            rows={pageRows.map((r: any) => [r.linha, r.uf, r.municipio || "—", fmt(r.valor), fmtDate(r.vigencia_inicio), r.vigencia_fim ? fmtDate(r.vigencia_fim) : "—"])}
            aligns={["left", "center", "left", "right", "center", "center"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

function FeriadosView() {
  const [filterUf, setFilterUf] = useState("all");
  const [filterAno, setFilterAno] = useState(String(new Date().getFullYear()));
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_feriados", filterUf, filterAno],
    queryFn: async () => {
      let q = supabase.from("pjecalc_feriados" as any).select("*")
        .gte("data", `${filterAno}-01-01`).lte("data", `${filterAno}-12-31`)
        .order("data");
      if (filterUf !== "all") q = q.or(`scope.eq.national,uf.eq.${filterUf}`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <Select value={filterAno} onValueChange={setFilterAno}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024, 2023].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterUf} onValueChange={setFilterUf}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="UF" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <TableToolbar tipo="feriados" slug="feriados" data={rows} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_feriados"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState msg="Nenhum feriado cadastrado para o período." /> : (
        <>
          <DataTable
            headers={["Data", "Nome", "Abrangência", "UF", "Município"]}
            rows={pageRows.map((r: any) => [fmtDate(r.data), r.nome, r.scope === "national" ? "Nacional" : r.scope === "state" ? "Estadual" : "Municipal", r.uf || "—", r.municipio || "—"])}
            aligns={["center", "left", "center", "center", "left"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function VerbasView() {
  const [filterNome, setFilterNome] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterValor, setFilterValor] = useState("all");
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pjecalc_verbas_padrao", filterNome, filterTipo, filterValor],
    queryFn: async () => {
      let q = supabase.from("pjecalc_verbas_padrao" as any).select("*").eq("ativo", true).order("nome");
      if (filterNome) q = q.ilike("nome", `%${filterNome}%`);
      if (filterTipo !== "all") q = q.eq("tipo", filterTipo);
      if (filterValor !== "all") q = q.eq("valor_tipo", filterValor);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: searched,
  });

  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Dados da Busca</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={filterNome} onChange={e => setFilterNome(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground">Valor</label>
              <Select value={filterValor} onValueChange={setFilterValor}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="calculado">Calculado</SelectItem>
                  <SelectItem value="informado">Informado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="reflexa">Reflexa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => { setSearched(true); setPage(1); refetch(); }}><Search className="h-3.5 w-3.5 mr-1" /> Buscar</Button>
            <TableToolbar tipo="verbas" slug="verbas" data={rows} onRefresh={() => qc.invalidateQueries({ queryKey: ["pjecalc_verbas_padrao"] })} />
          </div>
        </CardContent>
      </Card>
      {isLoading ? <LoadingSpinner /> : searched && rows.length === 0 ? <EmptyState msg="Nenhuma verba encontrada." /> : searched ? (
        <>
          <DataTable
            headers={["Nome", "Tipo", "Valor", "Característica", "Ocorrência", "FGTS", "CS", "IRPF"]}
            rows={pageRows.map((r: any) => [
              r.nome, r.tipo, r.valor_tipo, r.caracteristica, r.ocorrencia_pagamento,
              r.incidencia_fgts ? "Sim" : "Não", r.incidencia_cs ? "Sim" : "Não", r.incidencia_irpf ? "Sim" : "Não",
            ])}
            aligns={["left", "center", "center", "center", "center", "center", "center", "center"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

function AtualizacaoIndicesView() {
  const [selectedTrt, setSelectedTrt] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [importingAll, setImportingAll] = useState(false);
  const qc = useQueryClient();

  const handleAutoImport = async (trt: string) => {
    setSelectedTrt(trt);
    setSeeding(true);
    setSeedResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("seed-pjecalc-tables", { body: { trt } });
      if (error) throw error;
      setSeedResult(data);
      toast.success(`Tabelas do ${trt} importadas com sucesso! ${data?.total_registros || 0} registros.`);
      qc.invalidateQueries();
    } catch (err: any) {
      toast.error("Erro na importação automática: " + (err.message || "Falha"));
      setSeedResult({ error: err.message });
    } finally {
      setSeeding(false);
    }
  };

  const handleImportAll = async () => {
    setImportingAll(true);
    const slugs = ["salario_minimo", "contribuicao_social", "imposto_renda", "salario_familia", "seguro_desemprego", "feriados", "correcao_monetaria", "juros_mora"];
    let totalRows = 0;
    let errors = 0;

    for (const slug of slugs) {
      try {
        const { data, error } = await supabase.functions.invoke("import-reference-table", { body: { table_slug: slug, trigger: "manual" } });
        if (error) { errors++; continue; }
        totalRows += data?.rows_inserted || 0;
      } catch { errors++; }
    }

    toast.success(`Importação completa: ${totalRows} registros (${errors} erros)`);
    qc.invalidateQueries();
    setImportingAll(false);
  };

  return (
    <div className="space-y-4">
      {/* Bulk import */}
      <Card className="border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Download className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm">Importação Automática Completa</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Importa automaticamente todas as tabelas com fonte oficial: salário mínimo, INSS, IRRF, salário-família, seguro-desemprego, feriados, correção monetária e juros de mora.
          </p>
          <Button onClick={handleImportAll} disabled={importingAll}>
            {importingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Importar Todas as Tabelas
          </Button>
        </CardContent>
      </Card>

      {/* TRT-specific import */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Download className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm">Importação por TRT (Seed PJe-Calc)</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Selecione o TRT para importar tabelas oficiais do PJe-Calc incluindo custas regionais e feriados estaduais.
          </p>

          {seeding && (
            <div className="flex items-center gap-3 mb-4 p-3 rounded bg-primary/5 border border-primary/20">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Importando tabelas do {selectedTrt}...</p>
                <p className="text-xs text-muted-foreground">Aguarde, isso pode levar alguns segundos.</p>
              </div>
            </div>
          )}

          {seedResult && !seedResult.error && (
            <div className="mb-4 p-3 rounded bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-primary">✅ Importação concluída — {seedResult.total_registros} registros</p>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {seedResult.detalhes && Object.entries(seedResult.detalhes).map(([k, v]) => (
                  <div key={k} className="text-[10px] text-muted-foreground">
                    <span className="font-medium">{k.replace(/_/g, " ")}:</span> {String(v)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TRTS).map(([trt, nome]) => (
              <button key={trt} onClick={() => handleAutoImport(trt)} disabled={seeding}
                className="flex items-center gap-2 p-2.5 rounded border border-border/50 text-xs hover:bg-primary/5 hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left">
                <Badge variant={selectedTrt === trt && seedResult && !seedResult.error ? "default" : "secondary"} className="text-[10px] shrink-0">{trt.replace("TRT", "TRT ")}</Badge>
                <span className="text-muted-foreground truncate">{nome}</span>
                {seeding && selectedTrt === trt && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                {selectedTrt === trt && seedResult && !seedResult.error && <span className="ml-auto text-primary">✓</span>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual CSV fallback */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-sm mb-2">Importação Manual (CSV)</h3>
          <p className="text-xs text-muted-foreground mb-4">Para dados específicos não incluídos na importação automática.</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(TABELA_CONFIG).filter(([k]) => k !== "atualizacao-indices").map(([key, config]) => (
              <Card key={key} className="border border-border/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{config.title}</p>
                    <p className="text-[10px] text-muted-foreground">{config.description}</p>
                  </div>
                  <CsvImporter tipo={key} onImported={() => qc.invalidateQueries()} />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Shared components
// ============================================

function DataTable({ headers, rows, aligns }: { headers: string[]; rows: string[][]; aligns?: string[] }) {
  return (
    <div className="overflow-x-auto border border-border rounded">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-primary/10 border-b border-border">
            {headers.map((h, i) => (
              <th key={i} className="p-2 font-semibold text-foreground" style={{ textAlign: (aligns?.[i] || "left") as any }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-muted/20" : "bg-muted/40"}>
              {row.map((cell, ci) => (
                <td key={ci} className="p-2 border-b border-border/30" style={{ textAlign: (aligns?.[ci] || "left") as any }}>
                  <span className="font-medium">{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function EmptyState({ msg }: { msg?: string }) {
  return (
    <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{msg || "Nenhum dado cadastrado. Use os botões acima para importar dados."}</CardContent></Card>
  );
}

// ============================================
// Main component
// ============================================

const VIEW_MAP: Record<string, React.FC> = {
  "salario-minimo": SalarioMinimoView,
  "salario-familia": SalarioFamiliaView,
  "seguro-desemprego": SeguroDesempregoView,
  "contribuicao-social": ContribuicaoSocialView,
  "imposto-renda": ImpostoRendaView,
  "custas-judiciais": CustasJudiciaisView,
  "correcao-monetaria": CorrecaoMonetariaView,
  "juros-mora": JurosMoraView,
  "pisos-salariais": PisosSalariaisView,
  "vale-transporte": ValeTransporteView,
  "feriados": FeriadosView,
  "verbas": VerbasView,
  "atualizacao-indices": AtualizacaoIndicesView,
};

export default function Tabelas() {
  const { tipo } = useParams<{ tipo: string }>();
  const config = tipo ? TABELA_CONFIG[tipo] : null;
  const ViewComponent = tipo ? VIEW_MAP[tipo] : null;

  if (!config || !ViewComponent) {
    return (
      <MainLayoutPremium title="Tabelas" breadcrumbs={[{ label: "Tabelas" }]}>
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold">Visão Geral — Tabelas & Índices</h1>
            <p className="text-sm text-muted-foreground">Status de saúde, última atualização e importações recentes.</p>
          </div>
          <HealthDashboard />
        </div>
      </MainLayoutPremium>
    );
  }

  return (
    <MainLayoutPremium
      title={config.title}
      breadcrumbs={[{ label: "Tabelas" }, { label: config.title }]}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <ViewComponent />
      </div>
    </MainLayoutPremium>
  );
}
