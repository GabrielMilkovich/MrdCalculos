export const DISCREPANCIA_PROPERTIES = {
  tipo: {
    type: "string" as const,
    enum: ["valor_divergente", "sem_evidencia_no_pdf", "ausente_no_csv", "metadado_errado", "data_divergente", "horario_divergente"],
  },
  severidade: { type: "string" as const, enum: ["critica", "alta", "media", "baixa"] },
  field_path: { type: "string" as const },
  competencia: { type: "string" as const },
  current: {},
  suggested: {},
  delta_pct: { type: "number" as const },
  motivo: { type: "string" as const },
  evidencia_pdf: { type: "string" as const },
  ai_confidence: { type: "integer" as const, minimum: 0, maximum: 100 },
};

export const TOOL_BASE = {
  name: "emitir_paridade_forense",
  description: "Emite relatório de paridade forense entre PDF original e dados extraídos",
  input_schema: {
    type: "object" as const,
    required: ["paridade_geral", "discrepancias", "resumo_executivo", "ai_confidence_geral"],
    properties: {
      paridade_geral: { type: "string" as const, enum: ["completa", "parcial", "falhou"] },
      discrepancias: {
        type: "array" as const,
        items: {
          type: "object" as const,
          required: ["tipo", "severidade", "field_path", "motivo", "ai_confidence"],
          properties: DISCREPANCIA_PROPERTIES,
        },
      },
      totais_por_competencia: {
        type: "array" as const,
        items: {
          type: "object" as const,
          required: ["competencia", "soma_csv", "status"],
          properties: {
            competencia: { type: "string" as const },
            soma_csv: { type: "number" as const },
            total_pdf: { type: ["number", "null"] as const },
            delta_pct: { type: "number" as const },
            status: { type: "string" as const, enum: ["ok", "divergente", "pdf_ausente"] },
          },
        },
      },
      resumo_executivo: { type: "string" as const, maxLength: 500 },
      ai_confidence_geral: { type: "integer" as const, minimum: 0, maximum: 100 },
    },
  },
};
