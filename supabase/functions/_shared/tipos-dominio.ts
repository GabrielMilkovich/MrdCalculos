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

export interface ParseCartaoPontoResultDominio {
  apuracoes: ApuracaoDominio[];
  competencias: Map<string, number>;
  competencia_predominante: string;
  data_inicial: string;
  data_final: string;
  warnings: string[];
  unparsed_lines: Array<{ linha: number; conteudo: string }>;
  parser_version: string;
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
