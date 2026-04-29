/**
 * Phase 4, Item 9: Logs de Auditoria e Trilha de Alterações
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { History, FileText, AlertTriangle, Edit, Trash2, Plus, RefreshCw, Lock } from "lucide-react";

interface Props { caseId: string; }

const ACAO_ICONS: Record<string, any> = {
  criacao: Plus, edicao: Edit, exclusao: Trash2,
  liquidacao: RefreshCw, fechamento: Lock, importacao: FileText,
};

const ACAO_COLORS: Record<string, string> = {
  criacao: "text-[hsl(var(--success))]",
  edicao: "text-primary",
  exclusao: "text-destructive",
  liquidacao: "text-[hsl(var(--warning))]",
  fechamento: "text-muted-foreground",
  importacao: "text-primary",
};

export function AuditLog({ caseId }: Props) {
  const { data: logs = [] } = useQuery({
    queryKey: ["pjecalc_audit_log", caseId],
    queryFn: async () => {
      const { data } = await fromUntyped("pjecalc_audit_log")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as unknown[];
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        Trilha de Auditoria
        <Badge variant="secondary" className="text-xs ml-auto">{logs.length} registros</Badge>
      </h2>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            Nenhum evento registrado ainda. Alterações em parâmetros, verbas e liquidações serão rastreadas automaticamente.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-1">
            {logs.map((log: any) => {
              const Icon = ACAO_ICONS[log.acao] || FileText;
              const color = ACAO_COLORS[log.acao] || "text-muted-foreground";
              return (
                <div key={log.id} className="flex items-start gap-3 py-2 px-3 rounded hover:bg-muted/30 transition-colors">
                  <Icon className={`h-3.5 w-3.5 mt-0.5 ${color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px]">{log.modulo}</Badge>
                      <span className="font-medium">{log.acao}</span>
                      {log.campo && <span className="text-muted-foreground">• {log.campo}</span>}
                    </div>
                    {(log.valor_anterior || log.valor_novo) && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {log.valor_anterior && <span className="line-through text-destructive/60">{log.valor_anterior}</span>}
                        {log.valor_anterior && log.valor_novo && <span className="mx-1">→</span>}
                        {log.valor_novo && <span className="text-[hsl(var(--success))]">{log.valor_novo}</span>}
                      </div>
                    )}
                    {log.justificativa && (
                      <div className="text-[10px] text-muted-foreground italic mt-0.5">"{log.justificativa}"</div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// Utility to log an audit event from anywhere
export async function registrarAuditLog(
  caseId: string,
  modulo: string,
  acao: string,
  opts?: { campo?: string; valorAnterior?: string; valorNovo?: string; justificativa?: string; metadata?: any }
) {
  const { data: { user } } = await supabase.auth.getUser();
  await fromUntyped("pjecalc_audit_log").insert({
    case_id: caseId,
    user_id: user?.id,
    modulo,
    acao,
    campo: opts?.campo,
    valor_anterior: opts?.valorAnterior,
    valor_novo: opts?.valorNovo,
    justificativa: opts?.justificativa,
    metadata: opts?.metadata || {},
  });
}
