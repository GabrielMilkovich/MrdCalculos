import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, Calendar, ChevronRight, Clock, CheckCircle2,
  AlertCircle, FileStack, Sparkles, Calculator,
  MoreVertical, Archive, ArchiveRestore, Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface CaseCardProps {
  id: string;
  cliente: string;
  numeroProcesso?: string | null;
  tribunal?: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  criadoEm: string;
  documentCount?: number;
  factCount?: number;
  confirmedFactCount?: number;
  snapshotCount?: number;
  totalBruto?: number | null;
  arquivado?: boolean;
  onArchive?: () => void;
  onDelete?: () => void;
}

const statusConfig = {
  rascunho: { label: "Rascunho", icon: Clock, step: 0 },
  em_analise: { label: "Em Análise", icon: Sparkles, step: 1 },
  calculado: { label: "Calculado", icon: Calculator, step: 2 },
  revisado: { label: "Revisado", icon: CheckCircle2, step: 3 },
} as const;

const DEFAULT_STATUS_CFG = statusConfig.rascunho;

export function CaseCard({
  id, cliente, numeroProcesso, tribunal, status, criadoEm,
  documentCount = 0, factCount = 0, confirmedFactCount = 0,
  snapshotCount = 0, totalBruto,
  arquivado = false, onArchive, onDelete,
}: CaseCardProps) {
  const cfg = (status && statusConfig[status]) || DEFAULT_STATUS_CFG;
  const progressPercent = Math.min(100, ((cfg.step + 1) / 4) * 100);
  const StatusIcon = cfg.icon;
  const effectiveStatus = (status && statusConfig[status]) ? status : "rascunho";
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Para que o clique no menu/dropdown não dispare o Link.
  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div className="relative group">
      <Link to={`/casos/${id}`} className="block">
        <Card className={cn("card-interactive overflow-hidden", arquivado && "opacity-70")}>
          {/* Progress bar top accent */}
          <div className="h-1 w-full bg-muted">
            <div
              className={cn(
                "h-full transition-all duration-500 rounded-r-full",
                effectiveStatus === "rascunho" && "bg-muted-foreground/30",
                effectiveStatus === "em_analise" && "bg-accent",
                effectiveStatus === "calculado" && "bg-[hsl(var(--success))]",
                effectiveStatus === "revisado" && "bg-primary",
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {cliente}
                </h3>
                {numeroProcesso && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {numeroProcesso}
                  </p>
                )}
                {tribunal && !numeroProcesso && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {tribunal}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {arquivado && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                    <Archive className="h-3 w-3" /> Arquivado
                  </span>
                )}
                <span className={`status-badge status-${effectiveStatus} gap-1`}>
                  <StatusIcon className="h-3 w-3" />
                  {cfg.label}
                </span>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1" title="Documentos">
                <FileStack className="h-3 w-3" />
                {documentCount}
              </span>
              <span className="flex items-center gap-1" title="Fatos extraídos">
                <Sparkles className="h-3 w-3" />
                {factCount}
              </span>
              {confirmedFactCount > 0 && (
                <span className="flex items-center gap-1 text-[hsl(var(--success))]" title="Fatos confirmados">
                  <CheckCircle2 className="h-3 w-3" />
                  {confirmedFactCount}
                </span>
              )}
              {snapshotCount > 0 && (
                <span className="flex items-center gap-1" title="Snapshots de cálculo">
                  <Calculator className="h-3 w-3" />
                  {snapshotCount}
                </span>
              )}
            </div>

            {/* Value + Date */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              {totalBruto && totalBruto > 0 ? (
                <span className="text-xs font-semibold text-foreground">
                  R$ {totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">Sem cálculo</span>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(criadoEm), { addSuffix: true, locale: ptBR })}
                <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary ml-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Dropdown de ações — fora do Link para evitar navegação ao clicar */}
      {(onArchive || onDelete) && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-card/90 hover:bg-card shadow-sm"
                onClick={stop}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={stop}>
              {onArchive && (
                <DropdownMenuItem onClick={(e) => { stop(e); onArchive(); }}>
                  {arquivado ? (
                    <><ArchiveRestore className="h-4 w-4 mr-2" /> Desarquivar</>
                  ) : (
                    <><Archive className="h-4 w-4 mr-2" /> Arquivar</>
                  )}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { stop(e); setConfirmDelete(true); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Diálogo de confirmação de exclusão */}
      {onDelete && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent onClick={stop}>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir este caso?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é permanente. O caso <strong>{cliente}</strong> e todos os seus
                documentos, fatos e cálculos serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => { setConfirmDelete(false); onDelete(); }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
