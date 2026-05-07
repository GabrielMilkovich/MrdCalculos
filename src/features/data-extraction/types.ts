// Tipos do módulo "Modo Extração de Dados v4".
// Após a simplificação radical (cleanup v3 → v4), o módulo gira em torno de:
//   - 5 tipos de extração por documento (TipoExtracao)
//   - 6 categorias de rubrica para holerite (CategoriaSlug)
//   - Geração de CSV/ZIP por documento (sem composição entre docs)
//
// Tabelas Supabase de extração estruturada (rubricas_extraidas, etc.)
// permanecem no banco mas não são mais escritas pelo frontend.

export type CaseMode = 'calculation' | 'data_extraction';

/**
 * Tipos de extração suportados.
 *
 * F1.3: `recibo_ferias` e `registro_faltas` foram unificados em `ctps`.
 * Hoje o tipo `ctps` cobre 3 casos:
 *   - Recibo de férias avulso
 *   - Registro de faltas avulso
 *   - CTPS / espelho que contém ambos
 *
 * Quando classificado como `ctps`, o pipeline aciona os 2 parsers
 * (ferias + faltas) sobre o mesmo OCR. Quando um deles fica vazio, o
 * CSV correspondente sai header-only no ZIP — operador audita.
 *
 * Migration `20260510000000_f13_unificar_ferias_faltas_em_ctps.sql`
 * já migrou docs antigos e a CHECK constraint só aceita os 4 tipos
 * abaixo.
 */
export type TipoExtracao =
  | 'nao_extrair'
  | 'holerite'
  | 'cartao_ponto'
  | 'ctps';

export type ValidationStatus = 'pending' | 'validated' | 'rejected';
export type ExtracaoStatus = 'pending' | 'running' | 'done' | 'failed';

export type CategoriaSlug =
  | 'salario_fixo'
  | 'comissao'
  | 'dsr'
  | 'premiacao'
  | 'minimo_garantido'
  | 'salario_familia';

export type GozoPeriodo = {
  inicio: string; // dd/MM/yyyy
  fim: string;
  dobra: boolean;
};

export type SituacaoFerias = 'G' | 'GP' | 'NG' | 'I' | 'P';

/** Nível de confiança da auto-detecção de tipo de extração. */
export type ConfiancaAuto = 'alta' | 'media' | 'baixa';

// ---------- Classification ----------

export type HintResult =
  | { tipo: 'sugerir_categoria'; slug: CategoriaSlug; motivo: string }
  | { tipo: 'sugerir_ignorar'; motivo: string }
  | null;

// ---------- CSV builders inputs ----------

/** Linha agregada de Histórico Salarial (1 competência + 1 valor somado). */
export type LinhaHistoricoSalarial = {
  competencia: string; // "MM/yyyy"
  /** Valor monetário. Aceita `Decimal` (preferido) ou `number` (legado). */
  valor: import('decimal.js').default | number;
};

/** Flags de incidência usadas pelo CSV de Histórico Salarial. */
export type IncidenciaFlags = {
  incide_fgts: boolean;
  fgts_recolhido: boolean;
  incide_inss: boolean;
  inss_recolhido: boolean;
  natureza_indenizatoria: boolean;
};
