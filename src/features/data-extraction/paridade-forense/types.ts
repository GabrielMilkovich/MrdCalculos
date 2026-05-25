export interface DiscrepanciaForense {
  tipo: 'valor_divergente' | 'sem_evidencia_no_pdf' | 'ausente_no_csv' | 'metadado_errado' | 'data_divergente' | 'horario_divergente';
  severidade: 'critica' | 'alta' | 'media' | 'baixa';
  field_path: string;
  competencia?: string;
  current: unknown;
  suggested: unknown;
  delta_pct?: number;
  motivo: string;
  evidencia_pdf?: string;
  ai_confidence: number;
}

export interface ParidadeForenseResult {
  paridade_geral: 'completa' | 'parcial' | 'falhou';
  resumo: {
    total_itens_csv: number;
    com_evidencia_pdf: number;
    sem_evidencia_pdf: number;
    ausentes_no_csv: number;
    discrepancias_criticas: number;
    discrepancias_altas: number;
    discrepancias_medias: number;
    discrepancias_baixas: number;
  };
  discrepancias: DiscrepanciaForense[];
  discarded_hallucinations: Array<{
    field_path: string;
    suggested: string;
    reason: string;
  }>;
  totais_por_competencia?: Array<{
    competencia: string;
    soma_csv: number;
    total_pdf: number | null;
    delta_pct: number;
    status: 'ok' | 'divergente' | 'pdf_ausente';
  }>;
  resumo_executivo: string;
  ai_confidence_geral: number;
  pdf_consultado: boolean;
  model: string;
  duration_ms: number;
}

export type ParidadeBuilder = 'ficha_financeira' | 'holerite' | 'ctps' | 'cartao_ponto';
