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

export interface ApuracaoDominio {
  data: string;
  dia_semana: string | null;
  ocorrencia: OcorrenciaDominio;
  marcacoes: MarcacaoDominio[];
  eventos: EventoDominio[];
  observacao: string | null;
  ocr_line?: number;
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
    ocorrencia: 'DSR' | 'FERIADO';
    motivo: string;
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

export interface CtpsDominio {
  matricula: string | null;
  admissao: string | null;
  demissao: string | null;
  cargo: string | null;
  empregador: string | null;
  cnpj: string | null;
}
