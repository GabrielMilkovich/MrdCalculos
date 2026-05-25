import type { RubricaEnriquecida } from '@/features/data-extraction/enrichment/enrich-ficha-financeira';

export interface FichaFinanceiraParsed {
  ano: number;
  empregado?: string;
  empresa?: string;
  rubricas: RubricaEnriquecida[];
  resumo_mensal?: Array<{ competencia: string; total_vencimentos: number }>;
  enriquecimento: {
    total_rubricas: number;
    enriquecidas_catalogo: number;
    enriquecidas_parser: number;
    nao_encontradas: number;
    codigos_nao_encontrados: string[];
  };
  validacao: {
    ok: boolean;
    competencias: Array<{
      competencia: string;
      total_extraido: number;
      total_pdf: number | null;
      delta_abs: number;
      delta_pct: number;
      status: 'ok' | 'fora_tolerancia' | 'total_pdf_ausente';
    }>;
    resumo: {
      total_competencias: number;
      competencias_ok: number;
      competencias_fora: number;
      competencias_sem_total: number;
      pior_delta_pct: number;
    };
  };
  _meta: {
    parser?: string;
    model?: string;
    duration_ms?: number;
    pdf_source?: boolean;
    rubricas_pre_filter?: number;
    empregador_detectado?: string;
    linhas_processadas?: number;
    linhas_filtradas?: number;
    meses_detectados?: string[];
  };
}

export type FichaCategoriaSlug =
  | 'salario_fixo'
  | 'comissao'
  | 'dsr'
  | 'premiacao'
  | 'minimo_garantido'
  | 'salario_familia'
  | 'ignorar';

export const CATEGORIA_PJE_TO_SLUG: Record<string, FichaCategoriaSlug> = {
  salario_base: 'salario_fixo',
  minimo_garantido: 'minimo_garantido',
  comissao: 'comissao',
  comissao_garantia: 'comissao',
  comissao_seguros: 'comissao',
  comissao_frete: 'comissao',
  comissao_montagem: 'comissao',
  dsr_comissao: 'dsr',
  dsr_he: 'dsr',
  premio: 'premiacao',
  premio_meta: 'premiacao',
  premio_estimulo: 'premiacao',
  horas_extras_75: 'salario_fixo',
  horas_extras_70: 'salario_fixo',
  adicional_sabado: 'salario_fixo',
  adicional_noturno: 'salario_fixo',
  horas_justificadas: 'salario_fixo',
  insuf_saldo: 'salario_fixo',
  adto_quinzenal: 'salario_fixo',
  adiantamento: 'salario_fixo',
  campanha: 'premiacao',
  desconto: 'ignorar',
  desconto_ir: 'ignorar',
  desconto_inss: 'ignorar',
  base: 'ignorar',
  totalizador: 'ignorar',
  ajuste: 'ignorar',
  plr: 'ignorar',
  decimo_terceiro: 'salario_fixo',
  decimo_terceiro_adto: 'salario_fixo',
  ferias_terco: 'salario_fixo',
  ferias_media: 'salario_fixo',
};

export const CATEGORIA_LABELS: Record<FichaCategoriaSlug, string> = {
  salario_fixo: 'Salário Fixo',
  comissao: 'Comissões',
  dsr: 'DSR',
  premiacao: 'Premiações',
  minimo_garantido: 'Mínimo Garantido',
  salario_familia: 'Salário-família',
  ignorar: 'Ignorar',
};

export function mapCategoriaPjeToSlug(categoriaPje: string | null): FichaCategoriaSlug | null {
  if (!categoriaPje) return null;
  return CATEGORIA_PJE_TO_SLUG[categoriaPje] ?? null;
}
