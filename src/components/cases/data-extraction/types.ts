/**
 * Tipos UI compartilhados pelos componentes do modo data_extraction.
 * (Tipos de domínio puros estão em @/features/data-extraction/types.)
 */
import type { TipoExtracao } from "@/features/data-extraction";

export type DocSummary = {
  id: string;
  case_id: string;
  file_name: string | null;
  tipo_extracao: TipoExtracao;
  extracao_status: "pending" | "running" | "done" | "failed";
  extracao_error: string | null;
  competencia_referencia: string | null;
  validation_status: "pending" | "validated" | "rejected";
};
