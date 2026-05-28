/**
 * Tipos de domínio espelho dos que vivem em
 * `src/features/data-extraction/parsers/*`. Edge functions Deno não
 * conseguem importar de `src/` (resolver Vite vs Deno diverge); a
 * solução pragmática é manter os tipos sincronizados manualmente aqui.
 *
 * Próximo passo (v7+): publicar tipos como pacote JSR/npm consumido
 * pelos dois lados.
 */

export interface MarcacaoDominio {
  e: string;
  s: string;
  e_inserida?: boolean;
  s_inserida?: boolean;
  e_desconsiderada?: boolean;
  s_desconsiderada?: boolean;
}

export type OcorrenciaDominio =
  | 'NORMAL'
  | 'FALTA'
  | 'FERIADO'
  | 'FOLGA'
  | 'FERIAS'
  | 'ATESTADO'
  | 'LICENCA_MEDICA'
  | 'TREINAMENTO'
  | 'DSR'
  | 'AFASTAMENTO';

export interface EventoDominio {
  tipo: string;
  valor: string;
  raw: string;
}

export type TipoAlertaApuracao = 'BATIDAS_IMPARES' | 'RELOGIO_QUEBRADO';

export interface AlertaApuracao {
  tipo: TipoAlertaApuracao;
  severidade: 'warning' | 'info';
  mensagem: string;
  detalhes?: Record<string, unknown>;
}

export interface ApuracaoDominio {
  data: string;
  dia_semana: string | null;
  ocorrencia: OcorrenciaDominio;
  marcacoes: MarcacaoDominio[];
  eventos: EventoDominio[];
  observacao: string | null;
  ocr_line?: number;
  alertas?: AlertaApuracao[];
}

/**
 * Reconciliação entre soma de batidas extraídas e totalizadores declarados
 * no rodapé de cada período do cartão (códigos Via Varejo: 9000 Horas
 * Normais, 9080 Horas Extras 75%, etc).
 *
 * Anexada por mappers V6 quando capazes de detectar totalizadores. Camada
 * de export (Fase 4 v7) decide se bloqueia export baseado em
 * `reconciliacao_geral_ok`. Tolerância: 5 minutos por período, não
 * cumulativa.
 *
 * `declarado_minutos: null` significa "totalizador ausente no rodapé —
 * não foi possível validar" (não é erro, é "sem dado pra confrontar").
 * Nesse caso `ok=true` por convenção (não bloquear export por ausência
 * de dado pra validar).
 */
export interface ReconciliacaoPeriodo {
  /** Período do bloco (yyyy-mm-dd). */
  periodo: { inicio: string; fim: string };
  /** Soma minutos declarada no totalizador (9000 + 9080 se ambos). null = ausente. */
  declarado_minutos: number | null;
  /** Representação legível, ex: "183:20" ou null. */
  declarado_str: string | null;
  /** Soma minutos computada dos pares (saída-entrada) das batidas extraídas. */
  somado_minutos: number;
  /** Representação legível, ex: "182:55". */
  somado_str: string;
  /** Diferença signed (somado - declarado). Em minutos. 0 se declarado=null. */
  delta_minutos: number;
  /** true quando |delta| ≤ 5min OU totalizador ausente. */
  ok: boolean;
  /** Explicação humana. Sempre presente. */
  motivo: string;
}

export interface ParseCartaoPontoResultDominio {
  apuracoes: ApuracaoDominio[];
  competencias: Map<string, number>;
  competencia_predominante: string;
  data_inicial: string;
  data_final: string;
  warnings: string[];
  unparsed_lines: Array<{ linha: number; conteudo: string }>;
  parser_version: string;
  /**
   * Reconciliação contra totalizadores declarados (Fase 3 v7, 2026-05-20).
   * Populada apenas por mappers que detectam totalizadores no rodapé. Mapper
   * genérico atualmente não popula (TODO — deixa array vazio).
   * Camada de export decide se bloqueia baseado em reconciliacao_geral_ok.
   */
  reconciliacao?: ReconciliacaoPeriodo[];
  /** true quando TODOS os períodos têm ok=true. Default true se array vazio. */
  reconciliacao_geral_ok?: boolean;
  /**
   * Subconjunto de `reconciliacao` com divergências GRANDES (|delta| > 10h)
   * que NÃO foram explicadas pelos totalizadores capturados pelo parser.
   * Fase 6 v7 (2026-05-20): dívida técnica conhecida — Roque tem 3 períodos
   * desse tipo. UI deve sinalizar pro operador "esses meses precisam de
   * revisão manual antes de confiar nos números". Hipóteses pra investigar
   * em sessão futura: pares E→S inválidos sendo somados; totalizador com
   * código/formato fora da família atual; intrajornada sendo dupla-contada.
   */
  reconciliacao_residuais?: Array<{
    periodo: { inicio: string; fim: string };
    delta_minutos: number;
    delta_str: string;
    motivo: string;
  }>;
  /**
   * Rastro de dias VISTOS pelo parser mas DESCARTADOS do `apuracoes`
   * (Fase 6 v7, 2026-05-20). Hoje só inclui DSR/Feriado sem batida — esses
   * NÃO viram apuração exportável (CSV PJe-Calc não precisa), mas o parser
   * precisa registrar que os enxergou pra distinguir "ausente legítimo"
   * (foi visto e classificado como DSR/FERIADO) de "ausente por bug"
   * (linha não casou regex e sumiu sem rastro).
   *
   * Populado por mappers que reconhecem o token DSR/FERIADO. Mapper
   * genérico não popula (deixa undefined). Camada de export ignora.
   */
  dias_classificados_descartados?: Array<{
    data: string;
    dia_semana: string;
    ocorrencia: 'DSR' | 'FERIADO' | 'AFASTAMENTO';
    /**
     * Texto humano do motivo (ex: "DSR sem batida — não exportado",
     * "Afastamento: Férias", "Afastamento: Suspensão Contrato de Trabalho").
     */
    motivo: string;
    /**
     * Subcategoria estruturada quando ocorrencia='AFASTAMENTO'. Permite UI
     * resumir "X dias de férias, Y dias suspensão MP 936" sem regex sobre
     * texto livre. undefined pra DSR/FERIADO. 'OUTRO' quando o texto do PDF
     * não casa nenhum dos padrões conhecidos (capturamos o texto raw em
     * `motivo` pra futura calibração).
     */
    motivo_afastamento?:
      | 'FERIAS'
      | 'SUSPENSAO_CONTRATO'
      | 'ATESTADO_MEDICO'
      | 'FALTA_JUSTIFICADA'
      | 'FALTA_INJUSTIFICADA'
      | 'OUTRO';
  }>;
}

export interface RubricaDominio {
  codigo: string | null;
  nome: string;
  valor_vencimento: number | null;
  valor_desconto: number | null;
  quantidade: number | null;
  ordem: number;
}

export interface HoleriteResultDominio {
  competencia: string;
  rubricas: RubricaDominio[];
  layout_usado: string;
  warnings: string[];
  /**
   * Classificação ontológica das rubricas contra a planilha do escritório
   * (Sprint 2 / Fase 3, 2026-05-21). Populada pelos mappers de holerite
   * após `rubricas` ser extraída. Co-existe com o bucket-mapper de
   * `src/features/rubrica-mapping/` (responsabilidades distintas — este
   * alimenta cálculo de DSR sobre comissões; aquele alimenta export ZIP
   * pra PJe-Calc).
   *
   * Ausência = mapper antigo (pré-Sprint-2) ou rubricas vazias.
   */
  rubricas_classificadas?: RubricaClassificadaDominio[];
  resumo_classificacao?: ResumoClassificacaoHolerite;
}

/**
 * Categoria atribuída pela ontologia V2 (Sprint 3, 2026-05-23).
 *
 * IMPORTANTE: este tipo descreve o slug ESCRITO por mapper novo no JSONB
 * `documents.parsed.rubricas_classificadas[].categoria`. JSONB legado tem
 * slugs V1 (`COMISSAO_PRODUTOS`, `PREMIO`, `DSR_PAGO`, `DESCONSIDERAR`)
 * — leitor que aceita ambos deve aplicar `CATEGORIA_V1_TO_V2` do
 * `ontologia-rubricas-v2.ts`. Migration #2 (`20260524000001_*`) faz o
 * hard-cut em prod.
 */
export type CategoriaRubricaDominio =
  | 'MINIMO_GARANTIDO'
  | 'SALARIO_SUBSTITUICAO'
  | 'COMISSOES_PRODUTOS'
  | 'COMISSOES_SERVICOS'
  | 'DSR_S_COMISSOES'
  | 'PREMIOS'
  | 'DESCONSIDERADAS'
  | 'NAO_CLASSIFICADO';

export type MetodoMatchDominio =
  | 'exato'
  | 'normalizado'
  | 'sinonimo'
  | 'fuzzy'
  | 'nao_encontrado';

/**
 * Rubrica enriquecida com o resultado da classificação contra a ontologia.
 * `texto_canonico` é null quando o método foi `nao_encontrado`.
 */
export interface RubricaClassificadaDominio {
  rubrica: RubricaDominio;
  categoria: CategoriaRubricaDominio;
  metodo_match: MetodoMatchDominio;
  score_match: number;
  texto_canonico: string | null;
  /** true quando a rubrica canônica tem `observacao_juridica` (divergência de súmula). */
  divergencia_juridica: boolean;
}

/**
 * Agregação por categoria.
 *
 * Valores monetários em centavos inteiros (não float-reais).
 * Conversão: `Math.round(valor_reais * 100)`. Cada valor é arredondado
 * pra inteiro ANTES da soma — sem float-drift, sem dependência de
 * Decimal.js (que seria redundante após `Math.round` colapsar a
 * imprecisão herdada do `parseFloat` upstream).
 *
 * Apenas `valor_vencimento` é considerado nas somas — descontos não
 * entram em base de DSR.
 */
export interface ResumoClassificacaoHolerite {
  total_rubricas: number;
  classificadas: number;
  nao_classificadas: number;
  por_metodo: Record<MetodoMatchDominio, number>;
  /** Base de DSR sobre comissões de produto. */
  base_dsr_comissoes_produtos_centavos: number;
  /** Base de DSR sobre comissões de serviço. */
  base_dsr_comissoes_servicos_centavos: number;
  /** Prêmios integram base de DSR. */
  base_dsr_premios_centavos: number;
  /** DSR já pago pelo empregador — não recalcular. */
  dsr_ja_pago_centavos: number;
  /** Salário base / mínimo garantido / treinamento. */
  minimo_garantido_centavos: number;
  /** Verbas que não entram em base de DSR. */
  desconsiderado_centavos: number;
  /** Soma das rubricas que caíram em NAO_CLASSIFICADO. */
  nao_classificadas_centavos: number;
  /** Nomes (originais) das rubricas não classificadas — input pro banner UI. */
  rubricas_nao_classificadas: string[];
}

export interface FeriasDominio {
  relativa: string;
  prazo: number;
  situacao: 'G' | 'GP' | 'NG' | 'I' | 'P';
  dobra_geral: boolean;
  abono: boolean;
  dias_abono: number;
  gozo1: { inicio: string; fim: string; dobra: boolean } | null;
  gozo2: { inicio: string; fim: string; dobra: boolean } | null;
  gozo3: { inicio: string; fim: string; dobra: boolean } | null;
}

export interface FaltaDominio {
  data_inicio: string;
  data_fim: string;
  justificada: boolean;
  reiniciar_periodo_aquisitivo: boolean;
  justificativa: string | null;
}

export interface CtpsDominioLegacy {
  matricula: string | null;
  admissao: string | null;
  demissao: string | null;
  demissao_com_projecao_aviso: string | null;
  cargo: string | null;
  empregador: string | null;
  cnpj: string | null;
  ferias: FeriasDominio[];
  faltas: FaltaDominio[];
  historico_salarial: CtpsHistoricoSalarialEntry[];
  _meta: {
    parser: string;
    ferias_detectadas: number;
    faltas_detectadas: number;
  };
}

export interface CtpsHistoricoSalarialEntry {
  data_inicio: string;
  data_fim: string;
  descricao: string;
  valor: number;
}

// ============================================================
// CTPS V2 — Ficha de Anotações ADP-Web/SAP (paridade total)
// Schema completo: ~50 campos em 13 seções.
// Mappers Deno e parsers Node compartilham daqui.
// ============================================================

export interface CtpsLocalTrabalho {
  estabelecimento: string;
  matriz_filial: "Matriz" | "Filial" | null;
  cnpj: string;
  inscricao_estadual: string | null;
  endereco_rua: string;
  endereco_numero: string;
  endereco_complemento: string | null;
  endereco_bairro: string;
  endereco_cep: string;
  endereco_telefone: string | null;
  endereco_municipio: string;
  endereco_uf: string;
  endereco_pais: string;
}

export interface CtpsDadosPessoais {
  nome: string;
  sexo: "Masculino" | "Feminino" | null;
  estado_civil: string | null;
  estudante: boolean | null;
  naturalidade: string | null;
  naturalidade_uf: string | null;
  naturalidade_pais: string | null;
  nascimento: string;
  rg_numero: string | null;
  rg_orgao: string | null;
  ctps_numero: string | null;
  ctps_uf: string | null;
  cpf: string;
  pis_pasep: string | null;
  primeiro_emprego: boolean | null;
  titulo_eleitor: string | null;
  carteira_habilitacao: string | null;
  certificado_reservista: string | null;
  grau_instrucao: string | null;
  pai: string | null;
  mae: string | null;
}

export interface CtpsEnderecoResidencial {
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cep: string;
  telefone: string | null;
  municipio: string;
  uf: string;
  pais: string;
}

export interface CtpsDependente {
  nome: string;
  parentesco: string;
  sexo: "Masculino" | "Feminino" | null;
  nascimento: string;
  irrf: boolean;
  salario_familia: boolean;
}

export interface CtpsDadosEmpregado {
  matricula: string;
  admissao: string;
  vinculo: string;
  registro_mte: string | null;
  data_opcao_fgts: string | null;
  banco_fgts: string | null;
  agencia_fgts: string | null;
  conta_fgts: string | null;
  observacoes_fgts: string | null;
  banco_pagamento: string | null;
  agencia_pagamento: string | null;
  conta_pagamento: string | null;
  tipo_afastamento: string | null;
  data_desligamento: string | null;
  data_desligamento_com_projecao_aviso: string | null;
  observacoes_desligamento: string | null;
  dias_aviso_previo: number | null;
}

export interface CtpsFuncaoAtual {
  funcao: string;
  cargo: string;
  ingresso: string;
  cbo: string | null;
  tipo_salario: string | null;
  salario_tarefa: number;
  situacao: "Ativo" | "Inativo" | null;
}

export interface CtpsInformacoesSindicais {
  sindicato: string;
  cnpj: string;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
}

export interface CtpsHistoricoSalarialItem {
  data_vigencia: string;
  data_historica: string;
  motivo: string;
  sal_tarefa: number;
  perc_reajuste: number;
  min_garantido: number;
  comissao: number | null;
}

export interface CtpsFuncaoExercida {
  data_alteracao: string;
  codigo_cargo: string;
  cargo: string;
  codigo_funcao: string;
  funcao: string;
  motivo: string | null;
  quebra_caixa: boolean;
  insalubre: boolean;
  periculoso: boolean;
}

export interface CtpsLotacao {
  ingresso: string;
  codigo_estabelecimento: string;
  estabelecimento: string;
  cnpj_estabelecimento: string;
  centro_resultado: string;
}

export interface CtpsAfastamento {
  data_inicio: string;
  situacao: string;
  retorno: string | null;
  categoria: "afastamento" | "atestado_medico" | "auxilio_doenca" | "desligamento" | "outros";
}

export interface CtpsHistoricoFeriasItem {
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_gozo_inicio: string;
  periodo_gozo_fim: string;
  dias_gozo: number;
  abono_dias: number;
  observacoes: string | null;
}

export interface CtpsDominioV2 {
  local_trabalho: CtpsLocalTrabalho;
  dados_pessoais: CtpsDadosPessoais;
  endereco_residencial: CtpsEnderecoResidencial;
  dependentes: CtpsDependente[];
  dados_empregado: CtpsDadosEmpregado;
  funcao_atual: CtpsFuncaoAtual;
  informacoes_sindicais: CtpsInformacoesSindicais | null;
  historico_salarial: CtpsHistoricoSalarialItem[];
  funcoes_exercidas: CtpsFuncaoExercida[];
  historico_lotacao: CtpsLotacao[];
  afastamentos: CtpsAfastamento[];
  afastamentos_outros: CtpsAfastamento[];
  historico_ferias: CtpsHistoricoFeriasItem[];
  _meta: {
    parser: string;
    source_emitter: "ADP-Web" | "SAP" | "outro";
    extraction_method: "pdfjs_geometric" | "pdftotext" | "claude_vision" | "mistral_ocr";
    extracted_at: string;
    confidence: number;
  };
}
