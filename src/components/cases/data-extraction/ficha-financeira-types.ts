import type { RubricaEnriquecida } from '@/features/data-extraction/enrichment/enrich-ficha-financeira';
import type { GrupoExportCSV } from '@/features/data-extraction/export/per-doc/grupos-planilha-dsr';

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
  // Opcional: fichas extraídas pelo pipeline V6 geométrico (mapper Via
  // Varejo / fallback determinístico) NÃO trazem bloco de validação — só o
  // caminho `parse-ficha-financeira` (que compara total extraído vs total
  // impresso no PDF) o produz. Consumidores DEVEM tratar ausência.
  validacao?: {
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
    // Multi-ano: PDFs ADP podem conter múltiplas fichas anuais juntas.
    // anos_disponiveis lista todos detectados; ano_processado é qual foi extraído.
    // Quando length > 1, UI mostra select pro operador escolher.
    anos_disponiveis?: number[];
    ano_processado?: number;
  };
}

// Categoria da UI espelha exatamente os 7 grupos da planilha do escritório
// (definidos em features/.../grupos-planilha-dsr.ts). Reusamos o tipo para
// garantir que o que o operador edita aqui é o mesmo grupo que vai pro CSV
// no momento da exportação.
export type FichaCategoriaSlug = GrupoExportCSV;

// Mapa de categorias do parser/catálogo (categoria_pje em snake_case) para
// os grupos da planilha. Fonte de verdade: planilha "Planilha_Comissão_DSR".
// Cobre as principais saídas dos parsers ADP / ontologia V2.
export const CATEGORIA_PJE_TO_SLUG: Record<string, FichaCategoriaSlug> = {
  // Mínimo Garantido (col 1)
  minimo_garantido: 'minimo_garantido',
  horas_justificadas: 'minimo_garantido',
  // Comissões s/ Produtos (col 2)
  comissao: 'comissao_produtos',
  comissoes: 'comissao_produtos',
  adto_quinzenal: 'comissao_produtos',
  adiantamento: 'comissao_produtos',
  ajuste: 'comissao_produtos',
  // DSR s/ Comissões (col 3)
  dsr_comissao: 'dsr_comissao',
  // Comissões s/ Serviços (col 4)
  comissao_servicos: 'comissao_servicos',
  comissao_garantia: 'comissao_servicos',
  comissao_seguros: 'comissao_servicos',
  comissao_frete: 'comissao_servicos',
  comissao_montagem: 'comissao_servicos',
  campanha: 'comissao_servicos',
  // Prêmios (col 5)
  premio: 'premios',
  premio_meta: 'premios',
  premio_estimulo: 'premios',
  // Salário Substituição (col 6)
  salario_substituicao: 'salario_substituicao',
  // Desconsiderados (col 7) — descontos, encargos, bases, médias, 13º, férias, PLR, etc.
  salario_base: 'desconsiderado',
  salario_familia: 'desconsiderado',
  horas_extras_75: 'desconsiderado',
  horas_extras_70: 'desconsiderado',
  adicional_sabado: 'desconsiderado',
  adicional_noturno: 'desconsiderado',
  insuf_saldo: 'desconsiderado',
  desconto: 'desconsiderado',
  desconto_ir: 'desconsiderado',
  desconto_inss: 'desconsiderado',
  dsr_he: 'desconsiderado',
  base: 'desconsiderado',
  totalizador: 'desconsiderado',
  plr: 'desconsiderado',
  decimo_terceiro: 'desconsiderado',
  decimo_terceiro_adto: 'desconsiderado',
  ferias_terco: 'desconsiderado',
  ferias_media: 'desconsiderado',
};

export const CATEGORIA_LABELS: Record<FichaCategoriaSlug, string> = {
  minimo_garantido: 'Mínimo Garantido',
  comissao_produtos: 'Comissões s/ Produtos',
  dsr_comissao: 'DSR s/ Comissões',
  comissao_servicos: 'Comissões s/ Serviços',
  premios: 'Prêmios',
  salario_substituicao: 'Salário Substituição',
  desconsiderado: 'Desconsiderado',
};

export function mapCategoriaPjeToSlug(categoriaPje: string | null): FichaCategoriaSlug | null {
  if (!categoriaPje) return null;
  return CATEGORIA_PJE_TO_SLUG[categoriaPje] ?? null;
}
