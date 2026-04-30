/**
 * Constantes do modo "Extração de Dados".
 *
 * Refs do parser oficial PJe-Calc Cidadão (TRT-8 v2.5.4+):
 *   br.jus.trt8.pjecalc.negocio.servicos.AbstractServicoDeParsing
 *   - Encoding: UTF-8 sem BOM
 *   - Delimitador: `;`
 *   - Quebra: \n
 *   - Booleanos: S/N
 *   - Decimal: vírgula BR sem separador de milhar
 *   - Datas: dd/MM/yyyy ou MM/yyyy (competência)
 *   - 1ª linha = header (descartada pelo parser)
 *   - `;` `\n` `\r` `"` proibidos em campos texto (parser remove `"`)
 */

import type { ExtractionCategory, SituacaoFerias } from './types';

/** Limite de chars do servidor PJe-Calc para `justificativa` de falta. */
export const MAX_JUSTIFICATIVA_LEN = 200;

/** Limite defensivo para `relativa` de férias (sem max documentado). */
export const MAX_RELATIVA_LEN = 50;

/** Set de chars que o parser PJe-Calc rejeita ou maltrata em texto. */
export const INVALID_TEXT_CHARS = /[;\n\r"]/g;

/** Nome do label legível por categoria (UI). */
export const CATEGORY_LABEL: Record<ExtractionCategory, string> = {
  historico_salarial: 'Histórico Salarial',
  ferias: 'Férias',
  faltas: 'Faltas',
};

/** Nome do arquivo CSV gerado por categoria. */
export const CATEGORY_CSV_FILENAME: Record<ExtractionCategory, string> = {
  historico_salarial: 'historico_salarial.csv',
  ferias: 'ferias.csv',
  faltas: 'faltas.csv',
};

/** Label legível das situações de férias (UI). */
export const SITUACAO_FERIAS_LABEL: Record<SituacaoFerias, string> = {
  G: 'Gozadas',
  GP: 'Gozadas Parcialmente',
  NG: 'Não Gozadas',
  I: 'Indenizadas',
  P: 'Perdidas',
};

/** Modelo OpenAI usado pela edge function de extração. */
export const EXTRACTION_MODEL = 'gpt-4o-mini';

/** Temperatura baixa — extração estruturada exige determinismo. */
export const EXTRACTION_TEMPERATURE = 0.1;

/**
 * Headers CSV (linha 1). O parser PJe-Calc IGNORA a primeira linha,
 * mas o header é útil pra usuário que abre o arquivo no Excel.
 */
export const CSV_HEADERS: Record<ExtractionCategory, string> = {
  historico_salarial: 'Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido',
  ferias: 'Relativa;Prazo;Situacao;DobraGeral;Abono;DiasAbono;DtIniGozo1;DtFimGozo1;DobraGozo1;DtIniGozo2;DtFimGozo2;DobraGozo2;DtIniGozo3;DtFimGozo3;DobraGozo3',
  faltas: 'DataInicio;DataFim;Justificada;ReiniciarPeriodoAquisitivo;Justificativa',
};
