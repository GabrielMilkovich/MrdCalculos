import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkflowStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  completed?: boolean;
  active?: boolean;
  count?: number;
  disabled?: boolean;
  tooltip?: string;
}

interface CaseWorkspaceProps {
  cliente: string;
  numeroProcesso?: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  activeTab: string;
  onTabChange: (tab: string) => void;
  workflowSteps: WorkflowStep[];
  children: ReactNode;
  totalBruto?: number | null;
  /** Botões/ações a renderizar no header (ex: Importar .PJC, Exportar, etc.) */
  headerActions?: ReactNode;
}

const statusConfig = {
  rascunho: { label: "Rascunho", className: "status-rascunho" },
  em_analise: { label: "Em Análise", className: "status-em_analise" },
  calculado: { label: "Calculado", className: "status-calculado" },
  revisado: { label: "Revisado", className: "status-revisado" },
};

export function CaseWorkspace({
  cliente,
  numeroProcesso,
  status,
  activeTab,
  onTabChange,
  workflowSteps,
  children,
  totalBruto,
  headerActions,
}: CaseWorkspaceProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Compact Case Header */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
              {cliente}
            </h1>
            <Badge className={cn("flex-shrink-0", (statusConfig[status] || statusConfig.rascunho).className)}>
              {(statusConfig[status] || statusConfig.rascunho).label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {numeroProcesso || "Sem número de processo"}
          </p>
        </div>
        {headerActions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerActions}
          </div>
        )}
        {totalBruto && totalBruto > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-muted-foreground">Valor Bruto</div>
            <div className="text-lg font-bold text-foreground">
              R$ {totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>

      {/* Horizontal Tab Navigation */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg overflow-x-auto custom-scrollbar">
          {workflowSteps.map((step, idx) => {
            const isLast = idx === workflowSteps.length - 1;
            
            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !step.disabled && onTabChange(step.id)}
                    disabled={step.disabled}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 text-xs font-medium whitespace-nowrap",
                      step.active && "bg-card text-foreground shadow-sm",
                      !step.active && !step.disabled && "text-muted-foreground hover:text-foreground hover:bg-card/50",
                      step.disabled && "opacity-40 cursor-not-allowed",
                      step.completed && !step.active && "text-[hsl(var(--success))]"
                    )}
                  >
                    {step.completed && !step.active ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <step.icon className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                    {step.count !== undefined && step.count > 0 && (
                      <Badge 
                        variant={step.active ? "default" : "secondary"} 
                        className="text-[10px] h-4 px-1.5"
                      >
                        {step.count}
                      </Badge>
                    )}
                  </button>
                </TooltipTrigger>
                {step.tooltip && (
                  <TooltipContent side="bottom" className="text-xs">
                    {step.tooltip}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Content */}
      <div className="animate-fade-in">
        {children}
      </div>
    </div>
  );
}
