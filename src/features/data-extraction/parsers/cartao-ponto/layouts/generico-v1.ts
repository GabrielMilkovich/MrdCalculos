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

export type ParseCartaoPontoResult = {
  apuracoes: ApuracaoDiaria[];
  /** Mapa competência → quantidade de apurações naquele mês. */
  competencias: Map<string, number>;
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
};

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
  /Horas?\s+Previstas?/i,
  /Banco\s+de\s+Horas?/i,
  /Hora\s+Extra/i,
  /Horas?\s+Extras?/i,
  /HE\s+Com/i,
  /R\.?S\.?R\.?\s+Trabalhad/i,
  /DSR\s+Semanal/i,
  /Intrajornada/i,
  /Interjornada/i,
  /\bFERIADO\b/i,
  /F[ée]rias\b/i,
  /Licen[çc]a\s+m[ée]dica/i,
  /Treinamento/i,
  /Afastamento/i,
];

/** Padrão de tag de batida: "X:XX - Inserido" ou "X:XX - Desconsiderado". */
const RE_BATIDA_TAG =
  /\b(\d{1,2}):(\d{2})\s*[-–]\s*(Inserid[oa]|Desconsiderad[oa])\b/gi;

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
//
// V6: cobre variantes do OCR sujo (Mistral) em cartões Via Varejo —
// "Admiro:", "Admirado:", "Crachá:" → "Cracha:"/"Coachá:"/"Ciacha:",
// "Empregado:" → "Engenheiro:"/"Empgnegado:", "TRATINO:"/"TRATADO:"/
// "TRATIOS:" (cabeçalho de período), "Cooperência:"/"Cooperativa:" →
// "Competência:", "Estou de pleno acordo" (rodapé de assinatura),
// "Funkeia"/"Fonteis"/"Fickeis" (variantes de "Ficaríamos" no fecho).
//
// Dividimos em dois regex porque `\b` no fim não casa quando o padrão
// termina em `:` (como "Competência:"): `\b` exige transição word/não-word
// e `:` é não-word, então o boundary precisa ser implicito (pelo `:` em si).
const RE_METADADO_PALAVRA =
  /\b(?:ADMISS[ÃA]O|ADMIR(?:O|ADO|ED[OA])|DEMISS[ÃA]O|EMISS[ÃA]O|MATR[ÍI]CULA|PIS|CTPS|CARGO|DEPARTAMENTO|CRACH[AÁ]|CIACH[AÁ]|COACH[AÁ]|CRANK?H[ÃA]|JUNTAD[OA]\s+EM|ASSINAD[OA]\s+ELETRONICAMENTE|N[ÚU]MERO\s+(?:do\s+)?PROCESSO|N[ÚU]MERO\s+(?:do\s+)?DOCUMENTO|VALIDAD[EO]|RAZ[ÃA]O\s+SOCIAL|CNPJ|CEP|ENDERE[ÇC]O|LOCALIZA[ÇC][ÃA]O|APROVAD[OA]|HOMOLOGAD[OA]|REGISTRAD[OA]\s+ELETRONICAMENTE|VALIDAD[OA]\s+(?:PELO|POR|EM)|CONFIRMAD[OA]\s+(?:PELO|POR|EM)|CONFERID[OA]\s+(?:PELO|POR|EM)|Estou\s+de\s+pleno\s+acordo|Funkeia|Fonteis|Fick[oeé]veis|Fickeis|Ficheis|PER[ÍI]ODO\s*:)\b/i;
const RE_METADADO_PREFIXO_DOIS_PONTOS =
  /\b(?:EMPREGADO|ENGENHEIRO|EMPGNEGADO|FUN[ÇC][ÃA]O|TRATIN?O|TRATADO|TRATIOS|COOPER[ÊE]NCIA|COOPERATIVA|COMPET[ÊE]NCIA|ADMISS[ÃA]O|ADMIR(?:O|ADO|ED[OA])|MATR[ÍI]CULA|PIS|FIS|CTPS|CRACH[AÁ]|CIACH[AÁ]|COACH[AÁ]|C\.?\s*R\.?|C\.?\s*B\.?)\s*:/i;
const RE_METADADO_LINHA = {
  test(s: string): boolean {
    return (
      RE_METADADO_PALAVRA.test(s) ||
      RE_METADADO_PREFIXO_DOIS_PONTOS.test(s) ||
      // Range com data + a + data (forma frequente em rodapés de Movimentos).
      /Per[íi]odo\s+\d{1,2}\/\d{1,2}\/\d{4}\s+[Aa]\s+\d{1,2}\/\d{1,2}\/\d{4}/i.test(
        s,
      )
    );
  },
};

/**
 * Marcador de início de bloco de Movimentos/Eventos/Demonstrativo/Resumo.
 * Tudo entre esse marcador e a próxima nova página (ou EOF) contém
 * totalizadores (HE 75%, banco crédito, intervalo, adicional sábado,
 * salário banco, atestado, etc.) — são CÓDIGOS DE EVENTO, NÃO batidas.
 *
 * Sem esse guard, valores como "Adicional Sábado 25% 17:49" eram
 * interpretados como "17:49" → batida fantasma na linha do dia anterior
 * ou solta como apuração de uma data que vazou do header do bloco.
 *
 * Variantes do OCR sujo: "Movimentos:", "Monumentos:", "Necimentos:",
 * "Mecimentos:", "Marimentos:", "Documento:", "Demonstrar:".
 */
const RE_INICIO_BLOCO_EVENTOS =
  /^\s*(?:movimentos|monumentos|necimentos|mecimentos|marimentos|documentos?|demonstrar|demonstrativo|eventos?|resumo\s+do\s+per[íi]odo|nortemitos|retrimento)\s*:/i;

/**
 * Marcador de NOVA PÁGINA / novo cartão. Reseta o flag de "dentro de
 * bloco de movimentos". Inclui cabeçalhos comuns de cartão de ponto:
 * "PERÍODO:", "TRATINO:", "Empregado:", "Cartão Ponto Página", "Data Dia".
 */
const RE_INICIO_NOVA_PAGINA =
  /\b(?:per[íi]odo\s*:|tratin?o\s*:|tratado\s*:|tratios\s*:|empregado\s*:|engenheiro\s*:|cart[ãa]o\s+ponto\s+p[áa]gina|data\s+dia\s+hor[áa]rio|cnpj)\b/i;

/**
 * Linha de LEGENDA DE ESCALAS no topo do cartão Via Varejo / similar:
 *   "Horários: 91 08:00 11:00 12:00 14:25 162 09:00 12:00 13:00 17:25 ..."
 *   "Rotação: 91 08:00 11:00 12:00 14:25 ..."
 *
 * É uma tabela de códigos de turno → horários previstos. NÃO é apuração
 * diária. Sem esse filtro, o parser pegava cada bloco "162 09:00 12:00..."
 * como pseudo-batida e a inflava em jornada inexistente.
 *
 * O regex casa quando a linha começa (após whitespace) com "Horários:"
 * ou "Rotação:" seguido de qualquer dígito. Variantes do OCR Mistral
 * incluem "Horario:" (sem acento), "Rorações:" (sujo).
 */
const RE_LEGENDA_ESCALAS =
  /^\s*(?:hor[áa]rio?s?|rota[çc][ãa]o|rora[çc][õo]es)\s*:\s*\d/i;

/**
 * Padrão "no dia DD/MM/YYYY às HH:MM" / "em DD/MM/YYYY às HH:MM" — sinal
 * canônico de timestamp de aprovação/assinatura. Aplicado mesmo se a linha
 * não casar com RE_METADADO_LINHA, porque às vezes o OCR só preserva o
 * fragmento "às HH:MM" sem a palavra-chave anterior.
 */
const RE_TIMESTAMP_APROVACAO =
  /\b(?:no\s+dia|em)\s+\d{1,2}\/\d{1,2}\/\d{4}\s+(?:[àa]s|as)\s+\d{1,2}:\d{2}\b/i;

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
      competencia_predominante: "",
      data_inicial: "",
      data_final: "",
      warnings: ["OCR vazio."],
      unparsed_lines: [],
      parser_version: PARSER_VERSION,
    };
  }

  // Detector global: documento tem layout "Horário Registrado | Horário
  // de Trabalho" (cartões Via Varejo/Casa Bahia/SAP/similares onde cada
  // linha de dia traz 8 horas — 4 batidas reais + 4 horas previstas/escala).
  // Quando ativo, o splitDeBatidas pega só os 4 primeiros pares por dia;
  // os demais são descartados como escala (NÃO são jornada real).
  //
  // Detecção é POR DOCUMENTO inteiro, não por linha — assim funciona
  // mesmo quando o OCR perde o cabeçalho da tabela em algumas páginas.
  const TEM_COLUNA_DUPLA_REGISTRADO_TRABALHO =
    /Hor[áa]rio\s+Registrado/i.test(ocrText) &&
    /Hor[áa]rio\s+(?:de\s+)?Trabalho|Hor[áa]rio\s+Previsto/i.test(ocrText);

  // Detector de PERÍODOS declarados pelo documento. Cartões corporativos
  // sempre declaram o range em algum header — "PERÍODO: DD/MM/YYYY A
  // DD/MM/YYYY", "Período DD.MM.YYYY A DD.MM.YYYY", "TRATINO: DD/MM/YYYY
  // A DD/MM/YYYY", "Competência: MES/ANO". Datas FORA de TODOS os ranges
  // detectados são quase sempre vazamento de cabeçalho (admissão, data
  // de emissão, validade, juntada) ou rodapé (assinatura, homologação).
  //
  // Quando há ao menos 1 range declarado, apurações fora são descartadas.
  // Quando NÃO há range declarado, comportamento atual preservado.
  const rangesDocumento = extrairRangesDeclarados(ocrText);
  const temRangeDeclarado = rangesDocumento.length > 0;

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

  // Janela de "blocos contaminados": índices de linha onde encontramos
  // headers de metadado (Admissão, Crachá, PIS, CTPS, etc.). Quando uma
  // linha posterior em até 2 linhas começa com uma data, consideramos
  // que ela é continuação da CÉLULA do header (markdown-table partido)
  // e descartamos como apuração. Cobre o caso V4 reportado em produção:
  //   |  Admiro:                |
  //   |  24/11/2003  | 91 08:00 | ← OCR quebrou a célula em 2 linhas
  let ultimoMetadadoLinha = -10;

  // Janela de "bloco de eventos/movimentos": após "Movimentos:",
  // "Demonstrar:", "Eventos:", "Resumo do Período" tudo até a próxima
  // página/cabeçalho é totalizador (HE 75%, banco crédito, intervalo,
  // adicional sábado, etc.) — NÃO são batidas. Linhas com horários ali
  // dentro NÃO podem virar apuração.
  let dentroDeBlocoMovimentos = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const linhaBruta = raw.replace(/\|/g, " ").trim();
    if (linhaBruta.length === 0) continue;
    // Pré-filtro: linha de LEGENDA DE ESCALAS no topo do cartão
    // ("Horários: 91 08:00 11:00..."). Tem várias datas/horas mas NÃO é
    // apuração diária — é dicionário de códigos de turno → horários
    // previstos. Sem esse filtro, o parser inflava jornada inexistente
    // a partir desse cabeçalho.
    if (RE_LEGENDA_ESCALAS.test(linhaBruta)) {
      // Legenda de escalas marca início do cabeçalho — qualquer data
      // próxima é vazamento de header.
      ultimoMetadadoLinha = i;
      continue;
    }
    // Detecta entrada de bloco de Movimentos/Eventos/Demonstrar/Resumo.
    // Linhas dentro NÃO geram apuração mesmo que tenham data + horários.
    // Saída do bloco: encontrar nova linha que começa com data (DD/MM)
    // E não é continuação de totalizador. Implementado abaixo.
    if (RE_INICIO_BLOCO_EVENTOS.test(linhaBruta)) {
      dentroDeBlocoMovimentos = true;
      ultimoMetadadoLinha = i;
      continue;
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
      RE_TIMESTAMP_APROVACAO.test(linhaSemPipes)
    ) {
      ultimoMetadadoLinha = i;
      continue;
    }

    // GUARD V2: célula de tabela quebrada em duas linhas.
    // Quando o OCR Mistral renderiza uma tabela markdown, ele pode
    // separar header e dados em linhas diferentes:
    //   linha N    → "|  Admiro:                |"
    //   linha N+1  → "|  24/11/2003  | 91 08:00 |"
    // O filtro RE_METADADO_LINHA é POR LINHA, então N+1 escapa.
    //
    // Heurística: só descartamos quando a linha NÃO parece apuração
    // diária. Apuração real sempre tem `DD/MM/YYYY <DIA_SEMANA_3LETRAS>`
    // ou um código de escala (3 dígitos) + horários. Linhas órfãs vindas
    // de continuação de header/footer NÃO têm dia-da-semana.
    const linhaAposMetadadoProximo = i - ultimoMetadadoLinha <= 2;
    const pareceApuracaoDiaria =
      RE_DIA_SEMANA.test(linhaSemPipes) ||
      /\b\d{1,2}:\d{2}\s+\d{1,2}:\d{2}\s+\d{1,2}:\d{2}\s+\d{1,2}:\d{2}\b/.test(
        linhaSemPipes,
      );
    if (linhaAposMetadadoProximo && !pareceApuracaoDiaria) {
      continue;
    }

    // GUARD V3: bloco de Movimentos/Eventos/Demonstrar/Resumo do Período.
    // Esses blocos têm horários (HE 75%, banco crédito, intervalo, etc.)
    // que NÃO são batidas. Linhas dentro são descartadas mesmo se tiverem
    // data válida. Saída do bloco: nova página detectada (header de
    // PERÍODO/Competência/empresa).
    if (dentroDeBlocoMovimentos) {
      // Reset quando aparece nova página/cabeçalho.
      if (RE_INICIO_NOVA_PAGINA.test(linhaSemPipes)) {
        dentroDeBlocoMovimentos = false;
      } else {
        continue;
      }
    }

    const [, dd, mm, yyyy] = dateMatch;
    if (!isValidDate(yyyy, mm, dd)) {
      warnings.push(
        `Linha ${i + 1}: data inválida ${dd}/${mm}/${yyyy}. Linha ignorada.`,
      );
      continue;
    }

    // GUARD V4: data fora dos ranges declarados pelo documento.
    // Cartões corporativos sempre declaram um header "PERÍODO: X A Y"
    // ou "Competência: MES/ANO". Datas fora de TODOS os ranges são
    // vazamento de cabeçalho/rodapé (admissão, emissão, validade,
    // assinatura). Quando o documento NÃO declara range, comportamento
    // atual preservado.
    if (temRangeDeclarado) {
      const dataIso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      if (!estaEmAlgumRange(dataIso, rangesDocumento)) {
        warnings.push(
          `Linha ${i + 1}: data ${dd}/${mm}/${yyyy} fora do(s) período(s) declarado(s) pelo documento — descartada como vazamento de cabeçalho/rodapé.`,
        );
        continue;
      }
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
    const semData = parteBatidas
      .replace(RE_DATA_BR, " ")
      .replace(RE_DIA_SEMANA, " ");
    // Quando o documento tem layout coluna-dupla "Horário Registrado |
    // Horário de Trabalho", limitamos a 4 horas (1° grupo = batidas reais);
    // o resto da linha são horários previstos/escala que NÃO são jornada.
    const marcacoes = capturarMarcacoes(
      semData,
      inseridas,
      desconsideradas,
      TEM_COLUNA_DUPLA_REGISTRADO_TRABALHO ? 4 : undefined,
    );

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

    // GUARD V5: validação cronológica das batidas.
    // Marcações reais sempre seguem E1 < S1 < E2 < S2 < E3 < S3...
    // Quando a sequência tem inversão (ex.: S2=15:30 < E2=15:37), isso
    // indica OCR sujo — provavelmente concatenou batidas reais com horas
    // de escala/eventos, ou OCR-izou um dígito errado. Marcamos a
    // observação para o operador revisar manualmente; NÃO descartamos a
    // apuração pra preservar o que veio do OCR (decisão é humana).
    const inversao = detectarInversaoCronologica(marcacoes);
    const observacaoAuto = inversao
      ? `REVISAR_OCR: cronologia das batidas inválida (${inversao}).`
      : null;

    apuracoes.push({
      data,
      dia_semana: diaSemana,
      ocorrencia,
      marcacoes,
      eventos,
      observacao: observacaoAuto,
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

  return {
    apuracoes: final,
    competencias,
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
  // Layout coluna-dupla (Via Varejo etc.): 4 horas = 2 pares (1° grupo).
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
 * Extrai todos os ranges de datas declarados no documento. Procura:
 *   - "PERÍODO: DD/MM/YYYY A DD/MM/YYYY"
 *   - "Período DD.MM.YYYY A DD.MM.YYYY" (Via Varejo antigo)
 *   - "TRATINO: DD/MM/YYYY A DD/MM/YYYY" (variante OCR sujo)
 *   - "Período de DD/MM/YYYY a DD/MM/YYYY"
 *   - "Competência: MES/AAAA" → range = mês inteiro
 *
 * Retorna array de ranges em ISO. Datas inválidas no OCR (ex.: 14/30/2016)
 * são silenciosamente ignoradas — o range só conta se ambos os endpoints
 * são datas válidas.
 *
 * Quando não acha nenhum, retorna [] e o parser cai em modo permissivo
 * (comportamento atual preservado para layouts não-corporativos).
 */
function extrairRangesDeclarados(texto: string): Array<{ ini: string; fim: string }> {
  const ranges: Array<{ ini: string; fim: string }> = [];

  // Range explícito: DD/MM/YYYY A DD/MM/YYYY ou DD.MM.YYYY A DD.MM.YYYY
  const RE_RANGE_EXPLICITO =
    /(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\s+[Aa]\s+(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/g;
  for (const m of texto.matchAll(RE_RANGE_EXPLICITO)) {
    if (
      isValidDate(m[3], m[2], m[1]) &&
      isValidDate(m[6], m[5], m[4])
    ) {
      const ini = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      const fim = `${m[6]}-${m[5].padStart(2, "0")}-${m[4].padStart(2, "0")}`;
      if (ini <= fim) ranges.push({ ini, fim });
    }
  }

  // Competência mensal: "Competência: 03/2016" → range do mês inteiro.
  // Útil em cartões que NÃO declaram período explícito mas declaram a
  // competência mensal.
  const RE_COMPETENCIA =
    /Compet[êe]ncia\s*:?\s*(\d{1,2})[\/.](\d{4})\b/gi;
  for (const m of texto.matchAll(RE_COMPETENCIA)) {
    const mm = m[1].padStart(2, "0");
    const yyyy = m[2];
    const mNum = parseInt(mm, 10);
    if (mNum < 1 || mNum > 12) continue;
    const ultimoDia = new Date(parseInt(yyyy, 10), mNum, 0).getDate();
    ranges.push({
      ini: `${yyyy}-${mm}-01`,
      fim: `${yyyy}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
    });
  }

  return ranges;
}

/**
 * Verifica se uma data ISO está dentro de pelo menos um dos ranges
 * declarados. Os ranges incluem ±1 dia de tolerância para cobrir
 * cartões cujo "período" começa no dia 16 do mês anterior (ex.:
 * Via Varejo: período 16/02 a 15/03 = competência março).
 */
function estaEmAlgumRange(
  dataIso: string,
  ranges: Array<{ ini: string; fim: string }>,
): boolean {
  for (const r of ranges) {
    // Tolerância de ±1 dia em cada borda para acomodar cartões com
    // viradas de período não-canônicas (16-15, 21-20 etc.).
    const iniTol = somarDias(r.ini, -1);
    const fimTol = somarDias(r.fim, 1);
    if (dataIso >= iniTol && dataIso <= fimTol) return true;
  }
  return false;
}

function somarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Verifica se as marcações de um dia estão em ordem cronológica:
 * E1 < S1 < E2 < S2 < E3 < S3 ... Retorna a primeira inversão como
 * string descritiva (ex.: "S2=15:30 < E2=15:37") ou `null` se a
 * sequência é válida.
 *
 * Aceita pares parciais (só E ou só S) — ignora vazios na comparação.
 * Não trata virada de meia-noite explicitamente: jornadas que cruzam
 * 00:00 (turno noturno) caem como "inversão" e são marcadas como
 * REVISAR_OCR. Operador desmarca manualmente quando for legítimo.
 */
function detectarInversaoCronologica(marcacoes: Marcacao[]): string | null {
  const seq: Array<{ tipo: "E" | "S"; idx: number; valor: string; min: number }> = [];
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
      return `${cur.tipo}${cur.idx}=${cur.valor} < ${ant.tipo}${ant.idx}=${ant.valor}`;
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
