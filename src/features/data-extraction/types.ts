// Tipos do módulo "Modo Extração de Dados v2".
// Toda a feature gira em torno de rubricas individuais classificadas em 4
// categorias (salário fixo, comissões, DSR, premiações), exportadas como
// múltiplos CSVs no formato PJe-Calc Cidadão 2.5.4+.

export type CaseMode = 'calculation' | 'data_extraction';

export type TipoExtracao =
  | 'nao_extrair'
  | 'holerite'
  | 'recibo_ferias'
  | 'registro_faltas'
  | 'cartao_ponto';

export type ValidationStatus = 'pending' | 'validated' | 'rejected';
export type ExtracaoStatus = 'pending' | 'running' | 'done' | 'failed';

export type ClassificacaoOrigem = 'none' | 'memo' | 'hint' | 'manual';

export type Origem = 'manual' | 'auto';
export type ConfiancaAuto = 'alta' | 'media' | 'baixa';

export type CategoriaSlug = 'salario_fixo' | 'comissao' | 'dsr' | 'premiacao';

export type Categoria = {
  id: string;
  slug: CategoriaSlug;
  nome_exibicao: string;
  nome_pjecalc: string;
  ordem: number;
  default_incide_fgts: boolean;
  default_fgts_recolhido: boolean;
  default_incide_inss: boolean;
  default_inss_recolhido: boolean;
};

export type RubricaExtraida = {
  id: string;
  document_id: string;
  case_id: string;
  competencia: string;
  codigo: string | null;
  nome: string;
  nome_normalizado: string;
  valor: number;
  quantidade: number | null;
  desconto: number | null;
  categoria_id: string | null;
  classificacao_origem: ClassificacaoOrigem;
  origem: 'ocr_ai' | 'manual';
  ordem_no_documento: number;
};

export type CategoriaIncidenciaConfig = {
  case_id: string;
  categoria_id: string;
  incide_fgts: boolean;
  fgts_recolhido: boolean;
  incide_inss: boolean;
  inss_recolhido: boolean;
  natureza_indenizatoria: boolean;
};

export type GozoPeriodo = {
  inicio: string; // dd/MM/yyyy
  fim: string;
  dobra: boolean;
};

export type SituacaoFerias = 'G' | 'GP' | 'NG' | 'I' | 'P';

export type FeriasExtraida = {
  id: string;
  document_id: string;
  case_id: string;
  relativa: string; // aaaa/aaaa
  prazo: number;
  situacao: SituacaoFerias;
  dobra_geral: boolean;
  abono: boolean;
  dias_abono: number;
  gozo1: GozoPeriodo | null;
  gozo2: GozoPeriodo | null;
  gozo3: GozoPeriodo | null;
  incluir: boolean;
};

export type FaltaExtraida = {
  id: string;
  document_id: string;
  case_id: string;
  data_inicio: string; // ISO yyyy-mm-dd no banco; converter para dd/MM/yyyy no CSV
  data_fim: string;
  justificada: boolean;
  reiniciar_periodo_aquisitivo: boolean;
  justificativa: string | null;
  incluir: boolean;
};

// ---------- Classification ----------

export type HintResult =
  | { tipo: 'sugerir_categoria'; slug: CategoriaSlug; motivo: string }
  | { tipo: 'sugerir_ignorar'; motivo: string }
  | null;

// ---------- Composer (Etapa B) ----------

export type DocumentoOrigem = {
  document_id: string;
  document_name: string;
  rubricas: RubricaExtraida[];
};

export type LinhaHistoricoSalarial = {
  competencia: string;
  valor: number;
  documentos_origem: DocumentoOrigem[];
};

export type CandidatoConflito = {
  document_id: string;
  document_name: string;
  valor_total: number;
  rubricas: RubricaExtraida[];
};

export type ConflitoHistoricoSalarial = {
  competencia: string;
  candidatos: CandidatoConflito[];
};

export type ResolucaoConflito = {
  competencia: string;
  document_id_escolhido: string;
};

export type ComposicaoHistorico = {
  linhas: LinhaHistoricoSalarial[];
  conflitos: ConflitoHistoricoSalarial[];
};

export type ConflitoFerias = {
  relativa: string;
  candidatos: FeriasExtraida[];
};

export type ResolucaoFerias = {
  relativa: string;
  registro_id: string;
};

export type ComposicaoFerias = {
  linhas: FeriasExtraida[];
  conflitos: ConflitoFerias[];
};

export type ConflitoFaltas = {
  chave: string; // "data_inicio|data_fim"
  data_inicio: string;
  data_fim: string;
  candidatos: FaltaExtraida[];
};

export type ResolucaoFaltas = {
  chave: string;
  registro_id: string;
};

export type ComposicaoFaltas = {
  linhas: FaltaExtraida[];
  conflitos: ConflitoFaltas[];
};

// ---------- Export ZIP payload ----------

export type HistoricoCsvPayload = {
  slug: CategoriaSlug;
  nomePjecalc: string;
  csv: string;
  config: CategoriaIncidenciaConfig;
  linhas: number;
};

export type ZipExportPayload = {
  caseSlug: string;
  numeroProcesso: string | null;
  historicoSalarialCSVs: HistoricoCsvPayload[];
  feriasCsv: { csv: string; linhas: number } | null;
  faltasCsv: { csv: string; linhas: number } | null;
};
