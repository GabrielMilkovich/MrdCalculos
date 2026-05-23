// src/features/data-extraction/parsers/holerite/ontologia-rubricas-v2.ts
// Tipos compartilhados entre edge (Deno) e frontend (Vite/React).
// Mantém paridade 1:1 com schema da tabela `rubrica_aliases`.

export type CategoriaOntologiaRubricaV2 =
  | 'MINIMO_GARANTIDO'
  | 'SALARIO_SUBSTITUICAO'
  | 'COMISSOES_PRODUTOS'
  | 'COMISSOES_SERVICOS'
  | 'DSR_S_COMISSOES'
  | 'PREMIOS'
  | 'DESCONSIDERADAS'
  | 'NAO_CLASSIFICADO'; // estado válido — UI obriga classificação antes do ZIP

export type TipoPjeCalc =
  | 'SALARIO'
  | 'SALARIO_SUBSTITUICAO'
  | 'COMISSAO'
  | 'DSR'
  | 'PREMIO'
  | 'DESCONSIDERAR'
  | 'INDEFINIDO';

export type FonteClassificacao =
  | 'seed_v2'
  | 'planilha_v1'
  | 'user_classification'
  | 'unknown';

export interface ClassificacaoRubrica {
  alias_original: string;
  normalized_key: string;
  categoria: CategoriaOntologiaRubricaV2;
  tipo_pjecalc: TipoPjeCalc;
  base_dsr: boolean;
  base_13: boolean;
  base_ferias: boolean;
  incluido: boolean;
  confidence: number; // 0..1
  source: FonteClassificacao;
  // Texto livre: decisão do escritório + súmula TST + razão jurídica.
  // Editar exige reaprovação (handler trata como conflict_rejected).
  observacao_juridica?: string;
  // Derivado: !!observacao_juridica. Preserva contrato V1 do banner
  // (RubricaClassificadaDominio.divergencia_juridica) sem refactor extra.
  divergencia_juridica: boolean;
}

export interface RegrasCategoria {
  tipo_pjecalc: TipoPjeCalc;
  base_dsr: boolean;
  base_13: boolean;
  base_ferias: boolean;
  incluido: boolean;
}

export interface RubricaSeed {
  alias_original: string;
  normalized_key: string;
  aliases: string[];
  categoria: CategoriaOntologiaRubricaV2;
  tipo_pjecalc: TipoPjeCalc;
  base_dsr: boolean;
  base_13: boolean;
  base_ferias: boolean;
  incluido: boolean;
  confidence: number;
  source: FonteClassificacao;
  // Texto curado do V1 (observacao_juridica). Quando presente, marca
  // a rubrica como sujeita a divergência jurídica conhecida.
  observacao_juridica?: string;
}

export interface OntologiaSeedV2 {
  version: string;
  generated_at: string;
  source: string;
  categorias: Record<string, RegrasCategoria>;
  rubricas: RubricaSeed[];
}

// Mapa de coexistência V1 → V2 usado pelo shim de leitura durante 1 sprint.
// Remover em conjunto com a migration SQL hard-cut (20260524000001).
//
// FONTE: SQL real em prod (medido em 23/05/2026), não tabela teórica do plano.
// Categorias V1 com volume no JSONB: COMISSAO_PRODUTOS, COMISSAO_SERVICOS,
// PREMIO, DSR_PAGO, DESCONSIDERAR, MINIMO_GARANTIDO, NAO_CLASSIFICADO.
// Renames: as 5 primeiras. MINIMO_GARANTIDO e NAO_CLASSIFICADO são idênticas V1=V2.
export const CATEGORIA_V1_TO_V2: Record<string, CategoriaOntologiaRubricaV2> = {
  COMISSAO_PRODUTOS: 'COMISSOES_PRODUTOS',
  COMISSAO_SERVICOS: 'COMISSOES_SERVICOS',
  PREMIO: 'PREMIOS',
  DSR_PAGO: 'DSR_S_COMISSOES',
  DESCONSIDERAR: 'DESCONSIDERADAS',
};
