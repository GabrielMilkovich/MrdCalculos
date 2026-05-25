export const GLOSSARIO_UX = {
  layout: {
    "generico_v1": "Padrão genérico",
    "via_varejo_v1": "Via Varejo (Casas Bahia)",
  },
  tipo: {
    "holerite": "Holerite",
    "ficha_financeira": "Ficha financeira",
    "ctps": "Carteira de trabalho",
    "cartao_ponto": "Cartão de ponto",
    "ferias": "Recibo de férias",
    "faltas": "Registro de faltas",
    "outro": "Outro documento",
  },
  categoria: {
    "NAO_CLASSIFICADO": "Sem categoria",
    "MINIMO_GARANTIDO": "Mínimo garantido",
    "COMISSOES_PRODUTOS": "Comissões (produtos)",
    "COMISSOES_SERVICOS": "Comissões (serviços)",
    "DSR_S_COMISSOES": "DSR sobre comissões",
    "PREMIOS": "Premiações",
    "SALARIO_SUBSTITUICAO": "Salário substituição",
    "DESCONSIDERADAS": "Desconsideradas no cálculo",
  },
  pipelineStatus: {
    "processing": "Processando",
    "indexed": "Pronto para conferência",
    "needs_review": "Conferir",
    "approved": "Conferido",
    "failed": "Não foi possível ler",
    "pending": "Aguardando",
  },
} as const;

export function traduzir(grupo: keyof typeof GLOSSARIO_UX, chave: string): string {
  const dict = GLOSSARIO_UX[grupo] as Record<string, string>;
  return dict[chave] ?? chave;
}

export function scoreToLabel(score: number): { label: string; tone: "ok" | "atencao" | "revisar" } {
  if (score >= 86) return { label: "Pronto para conferência", tone: "ok" };
  if (score >= 60) return { label: "Conferir dados destacados", tone: "atencao" };
  return { label: "Revisão necessária", tone: "revisar" };
}
