import { CheckCircle2, AlertCircle, XCircle, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type StatusDoc = "processando" | "conferir" | "conferido" | "erro" | "ignorado";

interface Props {
  status: StatusDoc;
  detalhe?: string;
}

const STATUS_CONFIG: Record<StatusDoc, { label: string; tone: string; Icon: React.ComponentType<{className?: string}> }> = {
  processando: {
    label: "Processando",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Loader2,
  },
  conferir: {
    label: "Conferir",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
    Icon: AlertCircle,
  },
  conferido: {
    label: "Conferido",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    Icon: CheckCircle2,
  },
  erro: {
    label: "Não foi possível ler",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    Icon: XCircle,
  },
  ignorado: {
    label: "Ignorado",
    tone: "bg-slate-50 text-slate-600 border-slate-200",
    Icon: Clock,
  },
};

export function StatusDocumento({ status, detalhe }: Props) {
  const { label, tone, Icon } = STATUS_CONFIG[status];
  const isAnimated = status === "processando";

  return (
    <Badge variant="outline" className={`gap-1.5 font-normal ${tone}`}>
      <Icon className={`h-3 w-3 ${isAnimated ? "animate-spin" : ""}`} />
      <span>{label}</span>
      {detalhe && <span className="opacity-70 ml-1">· {detalhe}</span>}
    </Badge>
  );
}
