// Tipos do módulo "Modo Extração de Dados v4".
// Após a simplificação radical (cleanup v3 → v4), o módulo gira em torno de:
//   - 5 tipos de extração por documento (TipoExtracao)
//   - 6 categorias de rubrica para holerite (CategoriaSlug)
//   - Geração de CSV/ZIP por documento (sem composição entre docs)
//
// Tabelas Supabase de extração estruturada (rubricas_extraidas, etc.)
// permanecem no banco mas não são mais escritas pelo frontend.

export type CaseMode = 'calculation' | 'data_extraction';

export type TipoExtracao =
  | 'nao_extrair'
  | 'holerite'
  | 'recibo_ferias'
  | 'registro_faltas'
  | 'cartao_ponto';

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

// ---------- Classification ----------

export type HintResult =
  | { tipo: 'sugerir_categoria'; slug: CategoriaSlug; motivo: string }
  | { tipo: 'sugerir_ignorar'; motivo: string }
  | null;

// ---------- CSV builders inputs ----------

/** Linha agregada de Histórico Salarial (1 competência + 1 valor somado). */
export type LinhaHistoricoSalarial = {
  competencia: string; // "MM/yyyy"
  valor: number;
};

/** Flags de incidência usadas pelo CSV de Histórico Salarial. */
export type IncidenciaFlags = {
  incide_fgts: boolean;
  fgts_recolhido: boolean;
  incide_inss: boolean;
  inss_recolhido: boolean;
  natureza_indenizatoria: boolean;
};
