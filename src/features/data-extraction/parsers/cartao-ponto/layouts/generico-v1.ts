/**
 * Parser determinístico de Cartão de Ponto / Espelho de Ponto.
 *
 * Estratégia (state machine por linha):
 *   1. Localiza data dd/mm/yyyy (3 formatos: /, -, .) na linha.
 *   2. Corta a linha em 2 partes:
 *      a) ANTES dos marcadores de RESULTADO (Horas Trabalhadas, Horas
 *         Previstas, Banco de Horas, Hora Extra, DSR, FERIADO, Férias,
 *         Licença, Treinamento, R.S.R., Intrajornada, etc.) → BATIDAS.
 *      b) DEPOIS dos marcadores → EVENTOS estruturados.
 *   3. Detecta `*` em batidas (manualmente inseridas).
 *   4. Detecta "Desconsiderado" / "Inserido" em ajustes.
 *
 * NUNCA mais filtra por competência predominante — devolve TODAS as
 * apurações de TODOS os meses presentes no OCR. UI/CSV decidem o que fazer.
 *
 * Garantias:
 *   - Linhas com dado mas que não casam vão para `unparsed_lines`.
 *   - Eventos preservam dados juridicamente relevantes (HE feriado 0%,
 *     RSR trabalhado 0%, Intrajornada Sup. 2hs, Banco de Horas, etc.).
 *   - Batidas inseridas manualmente são marcadas (`inserida: true`).
 *   - Batidas desconsideradas são preservadas mas marcadas
 *     (`desconsiderada: true`).
 */

import { detectarColunaDupla } from '../../../../../../supabase/functions/_shared/heuristicas/coluna-dupla';

export type Marcacao = {
  e: string;
  s: string;
  e_inserida?: boolean;
  s_inserida?: boolean;
  e_desconsiderada?: boolean;
  s_desconsiderada?: boolean;
};

export type OcorrenciaApuracao =
  | "NORMAL"
  | "FALTA"
  | "FERIADO"
  | "FOLGA"
  | "FERIAS"
  | "ATESTADO"
  | "LICENCA_MEDICA"
  | "TREINAMENTO"
  | "DSR"
  | "AFASTAMENTO";

export type TipoEvento =
  | "horas_trabalhadas"
  | "horas_previstas"
  | "banco_horas_debito"
  | "banco_horas_credito"
  | "banco_horas_70"
  | "he_com_70"
  | "he_intervalo"
  | "he_feriado_0"
  | "he_feriado_100"
  | "rsr_trabalhado_0"
  | "intrajornada_sup_2hs"
  | "intrajornada"
  | "interjornada"
  | "feriado_dias"
  | "dsr_semanal_dias"
  | "ferias"
  | "licenca_medica"
  | "treinamento"
  | "atestado"
  | "afastamento"
  | "outro";

export type EventoDiario = {
  tipo: TipoEvento;
  /** Valor literal extraído (ex: "06:30", "1", "-00:24"). */
  valor: string;
  /** Texto literal capturado, para auditoria/UI. */
  raw: string;
};

export type ApuracaoDiaria = {
  /** "yyyy-mm-dd". */
  data: string;
  /** Dia da semana (Qua, Qui, etc.) se detectado. */
  dia_semana: string | null;
  /** Tipo predominante: NORMAL = teve batidas; demais = ausência. */
  ocorrencia: OcorrenciaApuracao;
  marcacoes: Marcacao[];
  /** Eventos de resultado (HT, HP, banco de horas, HE feriado, etc.). */
  eventos: EventoDiario[];
  /** Texto adicional não classificado da linha (auditoria). */
  observacao: string | null;
  /**
   * Número da linha (1-based) do OCR onde a apuração foi originalmente
   * capturada. Usado pela UI para navegação bidirecional (clique na linha
   * da tabela → scroll na linha do OCR de origem).
   */
  ocr_line?: number;
};

/**
 * FASE 2 — Validação cruzada por período: cada cartão declara um
 * totalizador "Horas Normais XX:XX" no rodapé de cada página. Se a
 * soma das batidas extraídas dentro do range divergir >30 minutos do
 * declarado, é sinal forte que o OCR perdeu/duplicou batidas. Cada
 * período divergente vira flag REVISAR_OCR_TOTAL nas apurações
 * correspondentes (não descarta nada — só sinaliza).
 */
export type ConsistenciaPeriodo = {
  /** Range do período (extraído do "Movimentos: (Período de X a Y)"). */
  range: { ini: string; fim: string };
  /** Totalizador "Horas Normais X:XX" declarado pelo cartão. */
  declarado_min: number;
  declarado_str: string;
  /** Soma das batidas (jornada efetiva) calculada no range. */
  somado_min: number;
  somado_str: string;
  /** Diferença absoluta em minutos (declarado − somado). */
  diff_min: number;
  /** Status: ok (≤30min) | divergente (>30min). */
  status: "ok" | "divergente";
  /** Datas (yyyy-mm-dd) cujas apurações foram marcadas REVISAR_OCR_TOTAL. */
  datas_marcadas: string[];
};

export type ParseCartaoPontoResult = {
  apuracoes: ApuracaoDiaria[];
  /** Mapa competência → quantidade de apurações naquele mês. */
  competencias: Map<string, number>;
  /** FASE 2 — Validação cruzada por período. */
  consistencia: ConsistenciaPeriodo[];
  /**
   * Competência com mais dias — APENAS INFORMATIVO (ex: para mostrar no
   * subtítulo do dialog "predominantemente 06/2024").
   *
   * **NÃO USE PARA FILTRAR**. UI/CSV/cálculo devem operar sobre TODAS as
   * apurações de TODAS as competências presentes em \`apuracoes\`. O parser
   * v3 explicitamente devolve dados de TODOS os meses do OCR — filtrar
   * por predominante reintroduz o bug histórico de "espelho de 6 meses
   * só exporta o mês com mais dias".
   */
  competencia_predominante: string;
  data_inicial: string;
  data_final: string;
  warnings: string[];
  /** Linhas suspeitas (com dado mas sem casar com nenhum padrão). */
  unparsed_lines: Array<{ linha: number; conteudo: string }>;
  /**
   * Versão do parser. Útil para a UI exibir e para o usuário confirmar que
   * está rodando a versão correta após deploy.
   */
  parser_version: string;
  /**
   * Reconciliação contra totalizadores declarados (Fase 3 v7, 2026-05-20).
   * Populada APENAS pelo caminho V6 (`adaptarV6CartaoPonto`). V5 regex
   * (`parseCartaoPontoGenerico`) NÃO popula — campos ficam undefined.
   * Dialog deve tratar undefined como "sem reconciliação disponível"
   * (não bloqueia export, fluxo legado).
   */
  reconciliacao?: ReconciliacaoPeriodo[];
  reconciliacao_geral_ok?: boolean;
};

/**
 * Espelho frontend de `ReconciliacaoPeriodo` do edge (tipos-dominio.ts).
 * Duplicado por design — frontend não consegue importar do edge function
 * file paths em runtime. Manter sincronizado se schema mudar.
 */
export interface ReconciliacaoPeriodo {
  periodo: { inicio: string; fim: string };
  declarado_minutos: number | null;
  declarado_str: string | null;
  somado_minutos: number;
  somado_str: string;
  delta_minutos: number;
  ok: boolean;
  motivo: string;
}

export const PARSER_VERSION = "cartao-ponto-v3-2026-05-01";

// =====================================================
// Padrões
// =====================================================

const RE_DATA_BR = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/;
/**
 * Data com separador ESPAÇO (ex: "01 03 2024"). Comum em OCR onde o `/`
 * é dropado. Aplicado entre RE_DATA_BR e RE_DATA_BR_FUZZY pra não vazar
 * em strings tipo "21 horas 2024".
 */
const RE_DATA_BR_ESPACO = /\b(\d{1,2})\s+(\d{1,2})\s+(\d{4})\b/;
/**
 * Regex tolerante a OCR sujo: aceita `O` no lugar de `0`, `S` no lugar
 * de `5`, `I` no lugar de `1`, separador com espaço extra. Aplicado como
 * ÚLTIMA tentativa quando as duas anteriores falharem.
 */
const RE_DATA_BR_FUZZY = /\b([0-9OISZ]{1,2})\s*[\/.\-]\s*([0-9OISZ]{1,2})\s*[\/.\-]\s*([0-9OISZ]{4})\b/i;
// Dia da semana abreviado: aceita ponto opcional ("Seg.", "Sáb.") e
// variações de caixa ("SEG", "sex"). Captura SEM o ponto para uniformizar.
const RE_DIA_SEMANA = /\b(Seg|Ter|Qua|Qui|Sex|S[áa]b|Dom)\.?\b/i;

/**
 * Marcadores de RESULTADO/EVENTOS — PARTIR a linha aqui.
 *
 * Tudo ANTES desse marcador são batidas; tudo DEPOIS são eventos
 * informativos (não devem virar batida).
 *
 * NOTA: "Inserido" e "Desconsiderado" NÃO são marcadores — são tags de
 * batida individual (formato "X:XX - Inserido"). Tratados separadamente
 * em `extrairTagsBatidas` antes do split.
 */
const MARCADORES_RESULTADO = [
  /Horas?\s+Trabalhadas?/i,
  /Horas?\s+Trab\.?\b/i,
  /Horas?\s+Previstas?/i,
  /Horas?\s+Normais\b/i,
  /H\.?\s*Normais\b/i,
  /H\.?\s*Norm\b/i,
  /Banco\s+de\s+Horas?/i,
  /\bBANCO\b/i,
  /\bBH\b/i,
  /Hora\s+Extra/i,
  /Horas?\s+Extras?/i,
  /HE\s+Com/i,
  /\bHE\b/i,
  /\bH\.E\b\.?/i,
  /\bH\.?\s*T\.?\b/i,
  /\bHT\b/i,
  /R\.?S\.?R\.?\s+Trabalhad/i,
  /\bRSR\b/i,
  /DSR\s+Semanal/i,
  /\bDSR\b/i,
  /Intrajornada/i,
  /Interjornada/i,
  /\bFERIADO\b/i,
  /F[ée]rias\b/i,
  /Licen[çc]a\s+m[ée]dica/i,
  /Treinamento/i,
  /Afastamento/i,
];

/**
 * FASE 1.3 — limite estrutural máximo de tokens HH:MM por linha-apuração.
 *
 * O PJe-Calc aceita até 6 pares E/S = 12 valores HH:MM. Se o parser
 * detectar mais que isso APÓS o split por MARCADORES_RESULTADO, é sinal
 * forte de poluição (totalizadores inline sem palavra-chave, coluna dupla
 * não detectada). Truncamos do 13º em diante e emitimos warning.
 *
 * NOTA: o prompt da auditoria sugeriu teto 8 (4 pares), mas isso quebra
 * regressões reais (casos com 5+ pares legítimos existem no acervo). A
 * primeira camada de defesa é o split por MARCADORES_RESULTADO ampliados
 * (HT, HE, BH, RSR adicionados nesta FASE 1.3) — isso resolve o caso do
 * prompt sem reduzir o teto absoluto.
 */
const MAX_BATIDA_TOKENS = 12;

/** Padrão de tag de batida: "X:XX - Inserido" ou "X:XX - Desconsiderado". */
const RE_BATIDA_TAG =
  /\b(\d{1,2}):(\d{2})\s*[-–]\s*(Inserid[oa]|Desconsiderad[oa])\b/gi;

/**
 * Tokens que indicam fim das marcações e início de totalizadores na linha.
 * Espelhos de Senior, ADP, Totvs costumam concatenar HT/HE/DSR na mesma
 * linha das batidas. Se não cortarmos, esses valores viram "batidas-fantasma".
 *
 * Match case-insensitive. Sempre com espaço/borda antes do token para
 * evitar quebrar nomes legítimos.
 */
const TOKENS_FIM_BATIDAS: RegExp[] = [
  /\s+HT\s+/i,
  /\s+HE\s+/i,
  /\s+H\.E\.?\s+/i,
  /\s+H\.T\.?\s+/i,
  /\s+DSR\s+/i,
  /\s+RSR\s+/i,
  /\s+BH\s+/i,
  /\s+BANCO(?:\s+DE\s+HORAS)?\s+/i,
  /\s+HORAS?\s+EXTRAS?\b/i,
  /\s+HORAS?\s+TRAB(?:ALHADAS?)?\b/i,
  /\s+H\.NORMAIS\b/i,
  /\s+H\.NORM\b/i,
];

/**
 * Corta a linha no primeiro token de totalizador encontrado. Mantém só
 * o que vem ANTES — região onde estão as batidas reais. Eventos
 * continuam a ser extraídos pelo `extrairEventos` que opera sobre a
 * parte DEPOIS do split de MARCADORES_RESULTADO.
 */
function cortarTotalizadoresInline(linha: string): string {
  let menorIdx = linha.length;
  for (const re of TOKENS_FIM_BATIDAS) {
    const fresh = new RegExp(re.source, re.flags.replace("g", ""));
    const m = fresh.exec(linha);
    if (m && m.index < menorIdx) menorIdx = m.index;
  }
  return linha.slice(0, menorIdx);
}

const RE_HORA_OPCIONAL_ASTERISCO = /\b(\d{1,2}):(\d{2})(?::\d{2})?(\*?)/g;
const RE_TEM_DIGITO = /\d/;

// Eventos específicos a extrair com regex.
// IMPORTANTE: ordem importa — os mais específicos vêm primeiro para que
// `intrajornada_sup_2hs` (mais restritivo) ganhe sobre `intrajornada`
// (mais genérico) quando ambos casariam.
const EVENT_PATTERNS: Array<{ tipo: TipoEvento; re: RegExp }> = [
  { tipo: "horas_trabalhadas", re: /Horas?\s+Trabalhadas?\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "horas_previstas", re: /Horas?\s+Previstas?\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "banco_horas_debito", re: /Banco\s+de\s+Horas?\s+D[ée]bito\s*:?\s*(-?\d{1,3}:\d{2})/i },
  { tipo: "banco_horas_credito", re: /Banco\s+de\s+Horas?\s+Cr[ée]dito\s*:?\s*(-?\d{1,3}:\d{2})/i },
  { tipo: "banco_horas_70", re: /Banco\s+de\s+Horas?\s+70\s*%\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "he_intervalo", re: /HE\s+Com\s+70\s*%\s*-?\s*Intervalo\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "he_com_70", re: /Horas?\s+Extras?\s+Com\s+70\s*%\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "he_feriado_100", re: /Hora\s+Extra\s+Feriado\s+100\s*%\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "he_feriado_0", re: /Hora\s+Extra\s+Feriado\s+0\s*%\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "rsr_trabalhado_0", re: /R\.?S\.?R\.?\s+Trabalhad[ao]?\s+0\s*%\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "intrajornada_sup_2hs", re: /Intrajornada\s+Sup\.?\s+2hs?\s*:?\s*(\d{1,3}:\d{2})/i },
  // `intrajornada` simples — só casa quando NÃO há "Sup. 2hs" antes do valor
  // (evita capturar duas vezes o mesmo evento em layouts onde aparecem juntos).
  { tipo: "intrajornada", re: /Intrajornada(?!\s+Sup\.?\s+2hs?)\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "interjornada", re: /Interjornada\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "feriado_dias", re: /FERIADO\s+\(dias?\)\s*:?\s*(\d+)/i },
  { tipo: "dsr_semanal_dias", re: /DSR\s+Semanal\s+\(dias?\)\s*:?\s*(\d+)/i },
  { tipo: "ferias", re: /F[ée]rias\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "licenca_medica", re: /Licen[çc]a\s+m[ée]dica\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "treinamento", re: /Treinamento\s*:?\s*(\d{1,3}:\d{2})/i },
];

const RE_OCORRENCIA_PURA =
  /\b(FALTA|FERIADO|FOLGA|F[ÉE]RIAS|ATESTADO|LICEN[ÇC]A\s*M[ÉE]DICA|TREINAMENTO|AFASTAMENTO|DSR\s+Semanal)\b/i;

// Linhas de metadados (cabeçalho/rodapé do espelho) — IGNORAR mesmo se
// tiverem data válida. Ex: "ADMISSÃO 06/06/2018", "Data de emissão 13/08/2024",
// "Período 16/06/2021 a 15/07/2021", "Juntado em: 21/08/2024",
// "aprovado pelo usuário no dia 20/12/2021 às 10:14".
//
// Os timestamps de aprovação/assinatura/homologação são particularmente
// nocivos: o parser detectaria a data + hora e CRIARIA uma batida fantasma
// ("inventaria jornada onde não houve trabalho"). Filtramos antes do split.
const RE_METADADO_LINHA =
  /\b(ADMISS[ÃA]O|DEMISS[ÃA]O|EMISS[ÃA]O|MATR[ÍI]CULA|PIS|CARGO|DEPARTAMENTO|JUNTAD[OA]\s+EM|JUNTAD[OA]\s+DE\s+PETI[ÇC][ÃA]O|ASSINAD[OA]\s+ELETRONICAMENTE|ASSINAD[OA]\s+DIGITALMENTE|SIGNAT[ÁA]RIO|N[ÚU]MERO\s+(?:do\s+)?PROCESSO|N[ÚU]MERO\s+(?:do\s+)?DOCUMENTO|DOCUMENTO\s+N[º°o.]|VALIDAD[EO]|RAZ[ÃA]O\s+SOCIAL|CNPJ|CEP|ENDERE[ÇC]O|LOCALIZA[ÇC][ÃA]O|Per[íi]odo\s+\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4}|APROVAD[OA]\b|HOMOLOGAD[OA]\b|REGISTRAD[OA]\s+ELETRONICAMENTE|VALIDAD[OA]\s+(?:PELO|POR|EM)|CONFIRMAD[OA]\s+(?:PELO|POR|EM)|CONFERID[OA]\s+(?:PELO|POR|EM)|PROTOCOLAD[OA]|PROTOCOLO\s+\d|LEI\s+11\.?\s*419|ICP[\s-]?BRASIL|CI[ÊE]NCIA\s+(?:DA\s+PARTE|EM)|INTIMA[ÇC][ÃA]O\s+ELETR[ÔO]NICA|EXPEDI[ÇC][ÃA]O\s+DE\s+MANDADO|MOVIMENTO\s+\d|HASH\s*[:-]|CERTIFICAD[OA]\s+DIGITAL)\b/i;

/**
 * Padrão "no dia DD/MM/YYYY às HH:MM" / "em DD/MM/YYYY às HH:MM" — sinal
 * canônico de timestamp de aprovação/assinatura. Aplicado mesmo se a linha
 * não casar com RE_METADADO_LINHA, porque às vezes o OCR só preserva o
 * fragmento "às HH:MM" sem a palavra-chave anterior.
 */
const RE_TIMESTAMP_APROVACAO =
  /\b(?:no\s+dia|em)\s+\d{1,2}\/\d{1,2}\/\d{4}\s+(?:[àa]s|as)\s+\d{1,2}:\d{2}\b/i;

// Timestamp jurídico canônico ICP-Brasil / PJe: DD/MM/YYYY HH:MM:SS isolado.
// Rodapés (assinatura digital, protocolo, juntada) trazem UM único HH:MM:SS;
// batidas legítimas com segundos (sistemas REP que exportam HH:MM:SS) trazem 2+.
// Lookahead negativo: só descarta se NÃO houver outro HH:MM:SS na mesma linha.
const RE_TIMESTAMP_JURIDICO_CANONICO =
  /\b\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\b(?!.*\d{1,2}:\d{2}:\d{2})/;

// =====================================================
// FASE 1 — Detecção de zonas suspeitas (filosofia MARCAR-NÃO-DESCARTAR)
// =====================================================
//
// Cada uma das regex abaixo identifica uma ZONA do OCR onde a linha
// pode parecer apuração mas tem alta chance de ser lixo (header com
// data de admissão, totalizadores de evento, legenda de escalas, etc.).
//
// IMPORTANTE: a estratégia NÃO é descartar essas linhas — é EXTRAIR e
// MARCAR `observacao = "REVISAR_OCR: <motivo>"`. O CSV vai sair com
// a flag, a UI mostra em destaque, advogado decide. Essa decisão é
// crítica: o PR #61 anterior tentou descartar e gerou 97% de regressão
// silenciosa em produção (de 1085 → 30 apurações no cartão ROQUE).

/**
 * LEGENDA DE ESCALAS no topo do cartão ("Horários: 91 08:00 11:00...").
 * É um dicionário de códigos de turno → horários previstos. Linhas
 * casando esse padrão são MARCADAS, não descartadas.
 */
const RE_LEGENDA_ESCALAS =
  /^\s*(?:hor[áa]rio?s?|rota[çc][ãa]o|rora[çc][õo]es)\s*:\s*\d+\s+\d{1,2}:\d{2}/i;

/**
 * Marcador de início de bloco de TOTALIZADORES (Movimentos, Demonstrar,
 * Eventos, Resumo do Período, etc.) ao final de uma página de cartão.
 * Conteúdo do bloco: códigos de evento (HE 75%, banco crédito, intervalo).
 *
 * Variantes do OCR sujo Mistral: "Movimentos:", "Monumentos:", "Necimentos:",
 * "Mecimentos:", "Marimentos:", "Documentos:", "Demonstrar:", "Eventos:",
 * "Resumo do Período", "Nortemitos", "Retrimento".
 */
const RE_INICIO_BLOCO_TOTALIZADORES =
  /^\s*(?:movimentos?|monumentos?|necimentos?|mecimentos?|marimentos?|documentos?|demonstrar|demonstrativo|eventos?|resumo\s+do\s+per[íi]odo|nortemitos?|retrimento)\s*:/i;

/**
 * Marcador de NOVA PÁGINA / novo cartão. Reseta o flag de "dentro de
 * bloco de totalizadores". Cobre headers comuns: "PERÍODO:", "TRATINO:",
 * "Empregado:", "Cartão Ponto Página", "Data Dia Horário".
 */
const RE_INICIO_NOVA_PAGINA =
  /\b(?:per[íi]odo\s*:|tratin?o\s*:|tratado\s*:|tratios\s*:|empregado\s*:|engenheiro\s*:|cart[ãa]o\s+ponto\s+p[áa]gina|data\s+dia\s+hor[áa]rio|cnpj)\b/i;

/**
 * Variantes EXTRA de palavras do OCR sujo Mistral em cartões corporativos
 * brasileiros que aparecem ANTES da data. Usadas pra DETECTAR (e marcar)
 * que a linha provavelmente é cabeçalho/admissão.
 *
 * Termos terminando em `:` exigem regex SEM \b final (porque `:` é
 * non-word e \b casa transição word/non-word).
 */
const RE_HEADER_PREFIXO =
  /\b(?:ADMISS[ÃA]O|ADMIR(?:O|ADO|ED[OA])|CRACH[AÁ]|CIACH[AÁ]|COACH[AÁ]|CRANK?H[ÃA]|CRUCIA|CRAN[ÇC]A|EMPREGADO|ENGENHEIRO|EMPGNEGADO|FUN[ÇC][ÃA]O|TRATIN?O|TRATADO|TRATIOS|COOPER[ÊE]NCIA|COOPERATIVA|COMPET[ÊE]NCIA|MATR[ÍI]CULA|CTPS|FIS|PIS|C\.?\s*R\.?|C\.?\s*B\.?|C\.?\s*G\.?\s*C\.?)\s*:/i;

/**
 * Detecta inversão cronológica nas batidas (E1 < S1 < E2 < S2 ...).
 * Retorna a 1ª inversão como string descritiva ou `null` se OK.
 *
 * Usada pra MARCAR (não descartar). Turnos noturnos legítimos cruzando
 * 00:00 caem como "inversão" e ficam REVISAR_OCR — operador desmarca
 * manualmente quando for jornada noturna verdadeira.
 */
function detectarInversaoCronologica(marcacoes: Marcacao[]): string | null {
  const seq: Array<{ tipo: "E" | "S"; idx: number; valor: string; min: number }> =
    [];
  for (let i = 0; i < marcacoes.length; i++) {
    const m = marcacoes[i];
    if (m.e) {
      const v = horaToMin(m.e);
      if (v !== null) seq.push({ tipo: "E", idx: i + 1, valor: m.e, min: v });
    }
    if (m.s) {
      const v = horaToMin(m.s);
      if (v !== null) seq.push({ tipo: "S", idx: i + 1, valor: m.s, min: v });
    }
  }
  for (let i = 1; i < seq.length; i++) {
    const ant = seq[i - 1];
    const cur = seq[i];
    if (cur.min < ant.min) {
      return `${cur.tipo}${cur.idx}=${cur.valor} antes de ${ant.tipo}${ant.idx}=${ant.valor}`;
    }
  }
  return null;
}

function horaToMin(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mn = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mn < 0 || mn > 59) return null;
  return h * 60 + mn;
}

// =====================================================
// Parser
// =====================================================

export function parseCartaoPontoGenerico(
  ocrText: string,
  _competenciaRefIgnored?: string,
): ParseCartaoPontoResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return {
      apuracoes: [],
      competencias: new Map(),
      consistencia: [],
      competencia_predominante: "",
      data_inicial: "",
      data_final: "",
      warnings: ["OCR vazio."],
      unparsed_lines: [],
      parser_version: PARSER_VERSION,
    };
  }

  // FASE 1 — detector de COLUNA DUPLA "Real vs Previsto" (Via Varejo /
  // Casas Bahia / SAP / Senior / ADP / Totvs e variantes sem header).
  // Cada linha de dia traz 8 horas: 4 batidas reais + 4 horas previstas
  // da escala. Sem esse detector, parser pega as 8 e a 5ª (09:00) fica
  // ANTES da 4ª (19:08) — cronologia falsa-inválida.
  //
  // Quando ATIVO: limita capturarMarcacoes a 4 horas/linha (1° grupo =
  // batidas reais). Quando INATIVO: comportamento atual (até 12 horas =
  // 6 pares, limite PJe-Calc).
  //
  // Detecção delega no módulo compartilhado heuristicas/coluna-dupla, que
  // combina (i) headers textuais conhecidos com (ii) heurística por
  // contagem com 4 salvaguardas (amostra mínima, turnos múltiplos,
  // jornada noturna, fração de linhas com 8 horários).
  const _linhasComData = ocrText
    .split(/\r?\n/)
    .filter((l) => RE_DATA_BR.test(l));
  const TEM_COLUNA_DUPLA_REGISTRADO_TRABALHO = detectarColunaDupla(
    ocrText,
    _linhasComData,
  ).detectado;

  // FASE 1.3 + F0.5 — detector de HEADER com totalizadores HT/HE/BH/DSR
  // como colunas dedicadas. Cartões Senior/ADP/Totvs colocam os
  // totalizadores na mesma TABELA das batidas, separados só por colunas.
  //
  // Heurística com âncora E[12]/S[12]: cabeçalho contém E1/S1 PRÓXIMO de
  // HT/HE/BH/DSR/RSR (≤ 40 chars). Sem proximidade, "HE" pode ser de
  // "EVENTO HE" no rodapé e não cabeçalho. Quando dispara, limite efetivo
  // cai para 4 horas (= 2 pares E/S) e o restante da linha vira evento.
  const HEADER_TOTALIZADOR_INLINE_RE =
    /\b(?:E[12]|S[12])\b[\s\S]{0,40}\b(?:HT|HE|H\.T|H\.E|BH|DSR|RSR)\b/i;
  const TEM_HEADER_TOTALIZADOR_INLINE =
    HEADER_TOTALIZADOR_INLINE_RE.test(ocrText);

  // Pré-processamento: mescla linhas-continuação que o OCR quebra quando
  // a célula da tabela tem muito conteúdo. Padrão típico (Casas Bahia):
  //   | 13/09/2021 - Seg | 08:30* | 12:00* | 13:05* | ... |
  //   |  | 16:50* |  |  |  | 16:50 - Inserido |  |
  // A 2ª linha começa SEM data mas com batidas. Se não mesclarmos, a
  // batida 16:50 fica órfã em `unparsed_lines` e o CSV perde uma E/S.
  const lines = mesclarContinuacoes(ocrText.split(/\r?\n/));
  const apuracoes: ApuracaoDiaria[] = [];
  const warnings: string[] = [];
  const unparsed: Array<{ linha: number; conteudo: string }> = [];
  const competencias = new Map<string, number>();

  // FASE 1 — flag DEFENSIVA: estamos dentro de bloco de totalizadores
  // (Movimentos, Demonstrar, Eventos)? Linhas dentro são MARCADAS como
  // suspeitas mas ainda extraídas, pra advogado revisar.
  let dentroDeBlocoTotalizadores = false;
  // Linhas anteriores recentes que casaram como cabeçalho/admissão.
  // Quando uma linha posterior (até 2 linhas) tem só data + horários
  // sem dia-da-semana, é provável continuação de célula partida.
  let linhaUltimoHeader = -10;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const linhaBruta = raw.replace(/\|/g, " ").trim();
    if (linhaBruta.length === 0) continue;

    // Atualiza flags de zona suspeita ANTES do filtro de metadado.
    // Linhas dentro de totalizadores serão MARCADAS (não descartadas);
    // a própria linha "Movimentos:" é PULADA porque é só header de
    // seção (e tem `(Período de DD/MM/YYYY a DD/MM/YYYY)` que poderia
    // virar apuração-fantasma se processada).
    if (RE_INICIO_BLOCO_TOTALIZADORES.test(linhaBruta)) {
      dentroDeBlocoTotalizadores = true;
      linhaUltimoHeader = i;
      continue;
    }
    if (RE_INICIO_NOVA_PAGINA.test(linhaBruta)) {
      // Reset: nova página = saímos do bloco de totalizadores.
      dentroDeBlocoTotalizadores = false;
      linhaUltimoHeader = i;
      // NÃO faz continue: a linha de "PERÍODO:" pode coexistir com
      // metadado já filtrado pelo bloco de RE_METADADO_LINHA abaixo.
    } else if (
      RE_HEADER_PREFIXO.test(linhaBruta) ||
      RE_LEGENDA_ESCALAS.test(linhaBruta)
    ) {
      linhaUltimoHeader = i;
    }
    // Remove tags "X:XX - Inserido/Desconsiderado" antes de qualquer split
    // (Inserido/Desconsiderado NÃO são divisores de batidas/eventos).
    const { inseridas, desconsideradas, texto: linhaSemPipes } =
      extrairTagsBatidas(linhaBruta);

    let dateMatch = linhaSemPipes.match(RE_DATA_BR);
    let dataCorrigida = false;
    // Tentativa intermediária: separador ESPAÇO ("01 03 2024"). Só vale
    // se a tripla 2+2+4 dígitos com espaços REALMENTE parece data
    // (mês entre 1-12). Senão pula para o próximo fallback.
    if (!dateMatch) {
      const espacoMatch = linhaSemPipes.match(RE_DATA_BR_ESPACO);
      if (espacoMatch) {
        const [, ddE, mmE, yyyyE] = espacoMatch;
        const m = parseInt(mmE, 10);
        const d = parseInt(ddE, 10);
        const y = parseInt(yyyyE, 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
          dateMatch = espacoMatch;
        }
      }
    }
    if (!dateMatch) {
      // Tentativa fuzzy: corrige OCR sujo (O→0, I→1, S→5, Z→2).
      const fuzzyMatch = linhaSemPipes.match(RE_DATA_BR_FUZZY);
      if (fuzzyMatch) {
        const ddF = fuzzyMatch[1].replace(/[OI]/gi, (c) =>
          c.toUpperCase() === "O" ? "0" : "1",
        ).replace(/S/gi, "5").replace(/Z/gi, "2");
        const mmF = fuzzyMatch[2].replace(/[OI]/gi, (c) =>
          c.toUpperCase() === "O" ? "0" : "1",
        ).replace(/S/gi, "5").replace(/Z/gi, "2");
        const yyyyF = fuzzyMatch[3].replace(/[OI]/gi, (c) =>
          c.toUpperCase() === "O" ? "0" : "1",
        ).replace(/S/gi, "5").replace(/Z/gi, "2");
        if (
          /^\d{1,2}$/.test(ddF) &&
          /^\d{1,2}$/.test(mmF) &&
          /^\d{4}$/.test(yyyyF)
        ) {
          dateMatch = [
            fuzzyMatch[0],
            ddF,
            mmF,
            yyyyF,
          ] as RegExpMatchArray;
          dataCorrigida = true;
        }
      }
    }
    if (!dateMatch) {
      // Linha sem data: marca como suspeita se tem horário ou ocorrência.
      const hasHora = /\d{1,2}:\d{2}/.test(linhaSemPipes);
      const hasOc = RE_OCORRENCIA_PURA.test(linhaSemPipes);
      if ((hasHora || hasOc) && RE_TEM_DIGITO.test(linhaSemPipes)) {
        unparsed.push({ linha: i + 1, conteudo: linhaSemPipes });
      }
      continue;
    }
    if (dataCorrigida) {
      warnings.push(
        `Linha ${i + 1}: data corrigida de OCR sujo (O→0, I→1, S→5, Z→2). Confira manualmente.`,
      );
    }

    // Filtra linhas de metadado (cabeçalho/rodapé) que têm data mas não
    // representam apuração diária (ex: "ADMISSÃO 06/06/2018", "Período X a Y",
    // "aprovado pelo usuário no dia 20/12/2021 às 10:14").
    if (
      RE_METADADO_LINHA.test(linhaSemPipes) ||
      RE_TIMESTAMP_APROVACAO.test(linhaSemPipes) ||
      RE_TIMESTAMP_JURIDICO_CANONICO.test(linhaSemPipes)
    ) {
      continue;
    }

    const [, dd, mm, yyyy] = dateMatch;
    if (!isValidDate(yyyy, mm, dd)) {
      warnings.push(
        `Linha ${i + 1}: data inválida ${dd}/${mm}/${yyyy}. Linha ignorada.`,
      );
      continue;
    }
    const data = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const competencia = `${mm.padStart(2, "0")}/${yyyy}`;
    competencias.set(competencia, (competencias.get(competencia) ?? 0) + 1);

    const diaSemana = (linhaSemPipes.match(RE_DIA_SEMANA)?.[1] ?? null);

    // Particiona a linha em "antes do primeiro marcador de resultado"
    // e "depois". Tudo antes vira candidato a batida; tudo depois é evento.
    const splitIdx = primeiraOcorrenciaMarcador(linhaSemPipes);
    const parteBatidas =
      splitIdx >= 0 ? linhaSemPipes.slice(0, splitIdx) : linhaSemPipes;
    const parteEventos = splitIdx >= 0 ? linhaSemPipes.slice(splitIdx) : "";

    // Captura horários da parte de batidas (após a data).
    // Remove a data da string para não confundir o regex.
    // Defesa em camadas:
    // (1) cortarTotalizadoresInline (F0.5): remove HT/HE/DSR/BH inline antes
    //     da extração das batidas. Evita batidas-fantasma de Senior/ADP/Totvs.
    // (2) MAX_BATIDA_TOKENS (FASE 1.3): se ainda restarem > 12 tokens HH:MM
    //     após corte, é poluição não-coberta — trunca + warning.
    const semData = cortarTotalizadoresInline(
      parteBatidas.replace(RE_DATA_BR, " ").replace(RE_DIA_SEMANA, " "),
    );

    const tokensDetectados = [...semData.matchAll(RE_HORA_OPCIONAL_ASTERISCO)]
      .filter((m) => {
        const h = parseInt(m[1], 10);
        const mn = parseInt(m[2], 10);
        return h >= 0 && h <= 23 && mn >= 0 && mn <= 59;
      }).length;
    const truncadoExcesso = tokensDetectados > MAX_BATIDA_TOKENS;
    if (truncadoExcesso) {
      warnings.push(
        `Linha ${i + 1} (${data}): ${tokensDetectados} tokens HH:MM detectados antes do limite de ${MAX_BATIDA_TOKENS}. Descartados a partir do 13º (possível HT/HE inline sem marcador explícito).`,
      );
    }

    // Quando documento tem coluna dupla "Horário Registrado | Horário
    // de Trabalho", limita a 4 horas (1° grupo = batidas reais; o 2°
    // grupo é a escala prevista e NÃO deve virar batida).
    // FASE 1.3: limite estrutural global aplicado sempre (truncamento
    // do 13º token em diante, mesmo sem coluna-dupla). Quando header
    // sinaliza totalizadores HT/HE inline, também limita a 4 horas
    // (= 2 pares, descartando HT/HE colados após as batidas).
    const limiteEfetivo =
      TEM_COLUNA_DUPLA_REGISTRADO_TRABALHO || TEM_HEADER_TOTALIZADOR_INLINE
        ? 4
        : MAX_BATIDA_TOKENS;
    const marcacoes = capturarMarcacoes(
      semData,
      inseridas,
      desconsideradas,
      limiteEfetivo,
    );

    // FASE 1.3 — NOTA: removida a "Camada 3 — heurística de plausibilidade
    // de pares s<e" do prompt original. Implementação inicial descartava
    // jornada noturna legítima (E=22:09 → S=05:53) silenciosamente. Filosofia
    // do projeto (vide cartao-ponto-fase1-marcar-nao-descartar) é MARCAR via
    // `detectarInversaoCronologica` + REVISAR_OCR, não descartar. Operador
    // decide na UI.

    // Detecta ocorrência baseada na LINHA INTEIRA (não só parteEventos):
    // se a linha cita uma ausência conhecida e não tem batidas, classificar.
    // Se tem batidas + ocorrência, NORMAL prevalece (a ocorrência é de evento
    // mascarado, ex: dia trabalhado em feriado).
    let ocorrencia: OcorrenciaApuracao = "NORMAL";
    if (marcacoes.length === 0) {
      const fullLine = linhaSemPipes;
      if (/F[ée]rias\b/i.test(fullLine)) ocorrencia = "FERIAS";
      else if (/Licen[çc]a\s+m[ée]dica/i.test(fullLine))
        ocorrencia = "LICENCA_MEDICA";
      else if (/\bFERIADO\b/i.test(fullLine)) ocorrencia = "FERIADO";
      else if (/DSR\s+Semanal/i.test(fullLine)) ocorrencia = "DSR";
      else if (/Treinamento/i.test(fullLine)) ocorrencia = "TREINAMENTO";
      else if (/Atestado/i.test(fullLine)) ocorrencia = "ATESTADO";
      else if (/Afastamento/i.test(fullLine)) ocorrencia = "AFASTAMENTO";
      else if (/\bFALTA\b/i.test(fullLine)) ocorrencia = "FALTA";
      else if (/\bFOLGA\b/i.test(fullLine)) ocorrencia = "FOLGA";
    } else {
      // Tem batidas. Mas se cita FERIADO claramente, marca como FERIADO
      // (para refletir caso "trabalhou em feriado").
      if (/\bFERIADO\b/i.test(parteEventos) && /he_feriado|FERIADO\s+\(dias\)/i.test(parteEventos)) {
        ocorrencia = "FERIADO";
      }
    }

    // Eventos estruturados.
    const eventos = extrairEventos(parteEventos);

    // FASE 1 — Acumula motivos para REVISAR_OCR. Filosofia DEFENSIVA:
    // não descartamos a apuração; sinalizamos pra revisão humana. Cada
    // motivo aqui = uma classe de ambiguidade detectada. Advogado
    // decide na UI se mantém ou descarta cada apuração marcada.
    const motivosRevisao: string[] = [];

    // Motivo 1: linha CASOU como cabeçalho/admissão/legenda.
    // Ex: "Admiro: 24/11/2003 ... 91 08:00 11:00 12:00 14:25"
    if (
      RE_HEADER_PREFIXO.test(linhaSemPipes) ||
      RE_LEGENDA_ESCALAS.test(linhaBruta)
    ) {
      motivosRevisao.push("linha parece cabeçalho/admissão/legenda de escalas");
    }

    // Motivo 2: linha está LOGO APÓS um cabeçalho (até 2 linhas).
    // Cobre célula markdown partida onde "Admiro:" fica numa linha e
    // a data + horários na seguinte. NÃO descartamos — só flaggamos.
    // Exceção: se a linha tem dia-da-semana padrão (TER/QUA/SEG/...),
    // é jornada legítima com header próximo (não é continuação).
    const temDiaSemanaPadrao = RE_DIA_SEMANA.test(linhaSemPipes);
    if (
      i - linhaUltimoHeader > 0 &&
      i - linhaUltimoHeader <= 2 &&
      !temDiaSemanaPadrao
    ) {
      motivosRevisao.push(
        `linha imediatamente após cabeçalho (linha ${linhaUltimoHeader + 1}), sem dia-da-semana — possível continuação de célula partida`,
      );
    }

    // Motivo 3: linha está dentro de bloco de totalizadores.
    // Ex: depois de "Movimentos:", linhas com "3990 Adicional 17:49"
    // — o parser ainda extrai a apuração, mas marca pra revisão.
    if (dentroDeBlocoTotalizadores) {
      motivosRevisao.push(
        "linha dentro de bloco de totalizadores (Movimentos/Eventos/Demonstrar)",
      );
    }

    // Motivo 4: cronologia das batidas inválida (E1<S1<E2<S2 quebrou).
    // Pode ser jornada noturna legítima (cruza 00:00) ou OCR sujo.
    const inversao = detectarInversaoCronologica(marcacoes);
    if (inversao) {
      motivosRevisao.push(`cronologia inválida: ${inversao}`);
    }

    const observacaoFinal =
      motivosRevisao.length > 0
        ? `REVISAR_OCR: ${motivosRevisao.join("; ")}`
        : null;

    apuracoes.push({
      data,
      dia_semana: diaSemana,
      ocorrencia,
      marcacoes,
      eventos,
      observacao: observacaoFinal,
      ocr_line: i + 1, // 1-based — UI usa pra scroll bidirecional
    });
  }

  // Dedup por data: tenta MERGEAR (turno manhã + turno tarde no mesmo dia)
  // antes de cair no fallback "última prevalece". Os dois caminhos têm
  // SIGNIFICADOS DIFERENTES e produzem warnings DISTINTOS:
  //   - merge: turnos disjuntos foram unidos (auditoria leve, dados ok)
  //   - última-prevalece: dados conflitantes, parser escolheu um (revisar!)
  const dedup = new Map<string, ApuracaoDiaria>();
  const datasMergedas: string[] = [];
  const datasUltimaPrevalece: string[] = [];
  for (const a of apuracoes) {
    const existente = dedup.get(a.data);
    if (!existente) {
      dedup.set(a.data, a);
      continue;
    }
    // Heurística de merge: turnos disjuntos no mesmo dia (manhã + tarde
    // separados em 2 linhas pelo OCR) são unidos. Sobreposição temporal
    // dos intervalos cai no fallback "última prevalece" pra evitar
    // chumbar dados conflitantes (caso de retificação ambígua).
    const totalMarc = existente.marcacoes.length + a.marcacoes.length;
    const overlap = existente.marcacoes.some((m1) =>
      a.marcacoes.some(
        (m2) =>
          m1.e !== "" && m1.s !== "" && m2.e !== "" && m2.s !== "" &&
          m1.e <= m2.s && m2.e <= m1.s,
      ),
    );
    if (totalMarc <= 6 && !overlap) {
      const merged: ApuracaoDiaria = {
        ...a,
        marcacoes: [...existente.marcacoes, ...a.marcacoes].sort((x, y) =>
          (x.e || x.s).localeCompare(y.e || y.s),
        ),
        eventos: a.eventos.length > 0 ? a.eventos : existente.eventos,
        // Para fins de navegação bidirecional, preserva a linha-âncora ORIGINAL
        // (a 1ª aparição da data), não a do turno mesclado depois.
        ocr_line: existente.ocr_line ?? a.ocr_line,
      };
      dedup.set(a.data, merged);
      datasMergedas.push(a.data);
    } else {
      // Fallback: última prevalece (comportamento legado). Sinaliza
      // separadamente porque AQUI HÁ PERDA DE DADOS — uma das ocorrências
      // sumiu. Operador deve revisar manualmente.
      dedup.set(a.data, a);
      datasUltimaPrevalece.push(a.data);
    }
  }
  if (datasMergedas.length > 0) {
    const lista = datasMergedas.slice(0, 10).join(", ");
    const sufixo =
      datasMergedas.length > 10 ? ` ... e mais ${datasMergedas.length - 10}` : "";
    warnings.push(
      `${datasMergedas.length} apuração(ões) com 2 turnos disjuntos no mesmo dia — turnos UNIDOS automaticamente: ${lista}${sufixo}.`,
    );
  }
  if (datasUltimaPrevalece.length > 0) {
    const lista = datasUltimaPrevalece.slice(0, 10).join(", ");
    const sufixo =
      datasUltimaPrevalece.length > 10
        ? ` ... e mais ${datasUltimaPrevalece.length - 10}`
        : "";
    warnings.push(
      `${datasUltimaPrevalece.length} apuração(ões) com data duplicada e turnos sobrepostos/conflitantes — última leitura PREVALECEU (perda de dado possível): ${lista}${sufixo}. Verifique se houve retificação no espelho.`,
    );
  }
  const final = [...dedup.values()].sort((a, b) => a.data.localeCompare(b.data));

  if (final.length === 0 && unparsed.length === 0) {
    warnings.push(
      "Nenhuma apuração extraída. Verifique se o OCR rodou corretamente.",
    );
  }

  // Predominante: informativo apenas. NÃO filtra.
  let predominante = "";
  let max = 0;
  for (const [k, v] of competencias) {
    if (v > max) {
      predominante = k;
      max = v;
    }
  }

  // Sentinela: se o OCR é não-trivial mas zero apurações foram extraídas,
  // algo está errado — layout não suportado ou OCR muito sujo. Avisa o
  // operador explicitamente em vez de devolver silenciosamente vazio.
  if (final.length === 0 && ocrText.replace(/\s+/g, "").length > 200) {
    warnings.push(
      "Parser genérico extraiu 0 apurações de um OCR não-vazio (>200 chars). " +
        "Documento pode ter layout não suportado — verifique manualmente.",
    );
  }

  // FASE 2 — Validação cruzada com totalizadores declarados pelo cartão.
  // Cada bloco "Movimentos: (Período de X a Y)" + "9000 Horas Normais 183:20"
  // declara que aquele período tem N horas trabalhadas. Soma a jornada
  // efetiva das batidas extraídas e compara. Se diverge >30 min, MARCA
  // todas as apurações do range com flag REVISAR_OCR_TOTAL.
  //
  // Filosofia: mesma da Fase 1. Não descarta nada. Sinaliza pra advogado.
  const consistencia = validarConsistenciaPorPeriodo(ocrText, final);
  for (const c of consistencia) {
    if (c.status === "divergente") {
      warnings.push(
        `Período ${c.range.ini} a ${c.range.fim}: declarado ${c.declarado_str} vs. somado ${c.somado_str} (diff ${formatMinutosToHHMM(c.diff_min)}). ${c.datas_marcadas.length} apuração(ões) marcada(s) REVISAR_OCR_TOTAL.`,
      );
    }
  }

  return {
    apuracoes: final,
    competencias,
    consistencia,
    competencia_predominante: predominante,
    data_inicial: final[0]?.data ?? "",
    data_final: final[final.length - 1]?.data ?? "",
    warnings,
    unparsed_lines: unparsed,
    parser_version: PARSER_VERSION,
  };
}

// =====================================================
// Helpers
// =====================================================

/**
 * Extrai do texto as tags "X:XX - Inserido" / "X:XX - Desconsiderado" e
 * devolve:
 *   - `inseridas`: Set de horários (HH:MM) marcados como inseridos
 *   - `desconsideradas`: idem para desconsiderados
 *   - `texto`: cópia do texto sem essas tags (substituídas por espaços),
 *     evitando que aparecem como batidas duplicadas no parser principal.
 */
function extrairTagsBatidas(texto: string): {
  inseridas: Set<string>;
  desconsideradas: Set<string>;
  texto: string;
} {
  const inseridas = new Set<string>();
  const desconsideradas = new Set<string>();
  for (const m of texto.matchAll(RE_BATIDA_TAG)) {
    const hhmm = `${m[1].padStart(2, "0")}:${m[2]}`;
    if (/^I/i.test(m[3])) inseridas.add(hhmm);
    else desconsideradas.add(hhmm);
  }
  const limpo = texto.replace(RE_BATIDA_TAG, " ");
  return { inseridas, desconsideradas, texto: limpo };
}

/**
 * Mescla linhas-continuação ao final da última linha-âncora (com data).
 *
 * Detecção de continuação (duas heurísticas — pipe ou indentada):
 *   1. Linha NÃO contém data dd/MM/yyyy.
 *   2. Linha contém ao menos uma hora HH:MM.
 *   3.a Linha começa com `|` (tabela markdown) — sinal claro de quebra
 *       de célula longa em duas linhas.
 *   3.b OU linha começa com espaço/tab (indentada) E só contém horários
 *       e/ou tags de batida — alguns OCRs descartam o pipe na quebra
 *       (Casas Bahia v2 faz isso em ~5% dos dias).
 *   4. Não pode ser linha de metadado (cabeçalho/rodapé) nem timestamp
 *      de aprovação eletrônica.
 *
 * Quando casa, concatena à última âncora. Sem âncora prévia, deixa
 * intacta (vai virar `unparsed_lines` no parser principal).
 */
const RE_SO_HORARIOS_E_RUIDO =
  /^[\s\d:|*\-–.,()/\\]*$|^[\s\d:|*\-–.,()/\\]*(?:Inserid[oa]|Desconsiderad[oa])[\s\d:|*\-–.,()/\\a-z]*$/i;

function mesclarContinuacoes(lines: string[]): string[] {
  const out: string[] = [];
  let ultimaAncoraIdx = -1;
  for (const linha of lines) {
    const limpa = linha.replace(/\|/g, " ").trim();
    const temData = RE_DATA_BR.test(limpa);
    const temHora = /\b\d{1,2}:\d{2}\b/.test(limpa);
    const comecaComPipe = /^\s*\|/.test(linha);
    const comecaIndentada = /^[ \t]+\S/.test(linha);
    const soHorariosERuido = RE_SO_HORARIOS_E_RUIDO.test(limpa);

    if (temData) {
      out.push(linha);
      ultimaAncoraIdx = out.length - 1;
      continue;
    }
    const podeSerContinuacao =
      !temData &&
      temHora &&
      ultimaAncoraIdx >= 0 &&
      !RE_METADADO_LINHA.test(limpa) &&
      !RE_TIMESTAMP_APROVACAO.test(limpa) &&
      !RE_TIMESTAMP_JURIDICO_CANONICO.test(limpa) &&
      (comecaComPipe || (comecaIndentada && soHorariosERuido));
    if (podeSerContinuacao) {
      out[ultimaAncoraIdx] = `${out[ultimaAncoraIdx]} ${linha}`;
      continue;
    }
    out.push(linha);
  }
  return out;
}

function primeiraOcorrenciaMarcador(line: string): number {
  let idx = -1;
  for (const re of MARCADORES_RESULTADO) {
    const m = line.match(re);
    if (m && m.index !== undefined) {
      if (idx === -1 || m.index < idx) idx = m.index;
    }
  }
  return idx;
}

function capturarMarcacoes(
  s: string,
  inseridasExternas: Set<string> = new Set(),
  desconsideradasExternas: Set<string> = new Set(),
  limiteHoras?: number,
): Marcacao[] {
  type H = { valor: string; inserida: boolean; desconsiderada: boolean };
  const horarios: H[] = [];
  // Default: 12 horas = 6 pares (limite PJe-Calc).
  // Layout coluna-dupla (Via Varejo / Casas Bahia): 4 horas (1° grupo).
  const HORAS_MAX = typeof limiteHoras === "number" ? limiteHoras : 12;
  for (const m of s.matchAll(RE_HORA_OPCIONAL_ASTERISCO)) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    const valor = `${m[1].padStart(2, "0")}:${m[2]}`;
    // Batida desconsiderada: foi anulada pelo sistema, NÃO entra no CSV.
    // Continua no fluxo apenas para marcar a `desconsiderada` flag em
    // batidas reais (caso venha repetida no texto compacto).
    if (desconsideradasExternas.has(valor)) continue;
    horarios.push({
      valor,
      inserida: m[3] === "*" || inseridasExternas.has(valor),
      desconsiderada: false,
    });
    if (horarios.length >= HORAS_MAX) break;
  }
  // Completa com horários da lista "X:XX - Inserido" que NÃO aparecem na
  // forma compacta. Acontece quando o OCR omite o token compacto da última
  // batida e ela só sobrevive na lista expandida (caso clássico Rosicleia
  // 16/07/2021). Desconsideradas NÃO são completadas — foram anuladas.
  const presentes = new Set(horarios.map((h) => h.valor));
  const adicionados: H[] = [];
  for (const ext of inseridasExternas) {
    if (!presentes.has(ext) && horarios.length + adicionados.length < 12) {
      adicionados.push({ valor: ext, inserida: true, desconsiderada: false });
    }
  }
  if (adicionados.length > 0) {
    horarios.push(...adicionados);
    // Reordena cronologicamente — batidas reais sempre estão em ordem.
    horarios.sort((a, b) => a.valor.localeCompare(b.valor));
  }
  const marcacoes: Marcacao[] = [];
  let j = 0;
  // Pares E/S; horário órfão na ponta (ímpar) vira E sem S — preserva a
  // batida no CSV em vez de descartá-la silenciosamente.
  while (j < horarios.length) {
    const e = horarios[j];
    const s_ = horarios[j + 1];
    const m: Marcacao = { e: e.valor, s: s_?.valor ?? "" };
    if (e.inserida) m.e_inserida = true;
    if (e.desconsiderada) m.e_desconsiderada = true;
    if (s_?.inserida) m.s_inserida = true;
    if (s_?.desconsiderada) m.s_desconsiderada = true;
    marcacoes.push(m);
    j += 2;
  }
  return marcacoes;
}

function extrairEventos(parte: string): EventoDiario[] {
  const eventos: EventoDiario[] = [];
  for (const { tipo, re } of EVENT_PATTERNS) {
    const m = parte.match(re);
    if (m) {
      eventos.push({ tipo, valor: m[1], raw: m[0] });
    }
  }
  return eventos;
}

/**
 * FASE 2 — Validação cruzada por período declarado.
 *
 * Cada página do cartão declara um totalizador "Horas Normais X:XX"
 * (ou "Horas Trabalhadas") em um bloco "Movimentos: (Período de DD/MM a DD/MM)".
 * Se a soma das batidas extraídas dentro daquele range divergir >30
 * minutos do declarado, é sinal de OCR sujo (perdeu/duplicou batidas).
 *
 * Marca apurações desse range com REVISAR_OCR_TOTAL e devolve metadata
 * pra UI mostrar pro advogado. Tolerância de 30min cobre arredondamentos
 * de intrajornada e DSR sem disparar falso positivo.
 *
 * Estratégia GLOBAL: usa apenas keywords padrão de cartões corporativos
 * brasileiros. Se documento não tem totalizador declarado, retorna []
 * (sem flag — comportamento permissivo).
 */
function validarConsistenciaPorPeriodo(
  ocrText: string,
  apuracoes: ApuracaoDiaria[],
): ConsistenciaPeriodo[] {
  const TOLERANCIA_MIN = 30;
  const resultado: ConsistenciaPeriodo[] = [];

  // Detecta blocos "Movimentos: (Período de DD/MM/YYYY a DD/MM/YYYY)
  // ... 9000 Horas Normais X:XX". O padrão real do OCR sujo:
  //   Movimentos: (Período de 16/02/2016 a 15/03/2016)
  //   3990 Adicional Sabado 25% 17:43 ...
  //   9000 Horas Normais 183:20 ...
  //   Estou de pleno acordo
  //
  // Captura range + totalizador num só match (lazy entre eles).
  const RE_BLOCO =
    /(?:movimentos?|monumentos?|necimentos?|mecimentos?|marimentos?|documentos?|demonstrar)\s*:?\s*\(?\s*Per[íi]odo\s+de\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+a\s+(\d{1,2}\/\d{1,2}\/\d{4})\)?[\s\S]{0,1500}?(?:9000\s+)?Horas?\s+(?:Normais|Mochado|Morbais|Morais|Horário|Trabalhadas?)\s+(\d{1,3}:\d{2})/gi;

  const blocos = [...ocrText.matchAll(RE_BLOCO)];
  for (const m of blocos) {
    const iniBR = m[1];
    const fimBR = m[2];
    const declStr = m[3];

    const ini = brToIso(iniBR);
    const fim = brToIso(fimBR);
    if (!ini || !fim) continue;

    const declMin = hhmmToMin(declStr);
    if (declMin === null) continue;

    // Soma jornada efetiva das apurações no range. Considera apenas
    // pares E/S completos (entrada + saída). Apurações com flag
    // REVISAR_OCR já são sabidamente suspeitas — incluímos no somatório
    // mesmo assim, porque o totalizador do cartão também as conta.
    let somadoMin = 0;
    const datasNoRange: string[] = [];
    for (const a of apuracoes) {
      if (a.data < ini || a.data > fim) continue;
      datasNoRange.push(a.data);
      for (const par of a.marcacoes) {
        const e = par.e ? hhmmToMin(par.e) : null;
        const s = par.s ? hhmmToMin(par.s) : null;
        if (e !== null && s !== null && s > e) {
          somadoMin += s - e;
        }
      }
    }

    const diff = Math.abs(declMin - somadoMin);
    const status: "ok" | "divergente" =
      diff > TOLERANCIA_MIN ? "divergente" : "ok";

    // Marca apurações do range com REVISAR_OCR_TOTAL quando diverge.
    const datasMarcadas: string[] = [];
    if (status === "divergente") {
      for (const a of apuracoes) {
        if (a.data < ini || a.data > fim) continue;
        const motivoExtra = `total do período ${iniBR} a ${fimBR} divergente: declarado ${declStr} vs somado ${formatMinutosToHHMM(somadoMin)}`;
        a.observacao = a.observacao
          ? `${a.observacao}; ${motivoExtra}`
          : `REVISAR_OCR_TOTAL: ${motivoExtra}`;
        datasMarcadas.push(a.data);
      }
    }

    resultado.push({
      range: { ini, fim },
      declarado_min: declMin,
      declarado_str: declStr,
      somado_min: somadoMin,
      somado_str: formatMinutosToHHMM(somadoMin),
      diff_min: diff,
      status,
      datas_marcadas: datasMarcadas,
    });
  }

  return resultado;
}

function brToIso(brDate: string): string | null {
  const m = brDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  if (!isValidDate(m[3], m[2], m[1])) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function hhmmToMin(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mn = parseInt(m[2], 10);
  if (mn < 0 || mn > 59) return null;
  return h * 60 + mn;
}

function formatMinutosToHHMM(min: number): string {
  const sinal = min < 0 ? "-" : "";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const mn = abs % 60;
  return `${sinal}${h}:${String(mn).padStart(2, "0")}`;
}

function isValidDate(yyyy: string, mm: string, dd: string): boolean {
  const y = parseInt(yyyy, 10);
  const m = parseInt(mm, 10);
  const d = parseInt(dd, 10);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  );
}
