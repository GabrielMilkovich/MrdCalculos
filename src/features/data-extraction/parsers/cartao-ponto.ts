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
};

export type ParseCartaoPontoResult = {
  apuracoes: ApuracaoDiaria[];
  /** Mapa competência → quantidade de apurações naquele mês. */
  competencias: Map<string, number>;
  /** Competência com mais dias (informativo). UI/CSV não devem filtrar por isto. */
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
 * Regex tolerante a OCR sujo: aceita `O` no lugar de `0`, `S` no lugar
 * de `5`, `I` no lugar de `1`, separador com espaço extra. Aplicado como
 * SEGUNDA tentativa quando RE_DATA_BR falha.
 */
const RE_DATA_BR_FUZZY = /\b([0-9OISZ]{1,2})\s*[\/.\-]\s*([0-9OISZ]{1,2})\s*[\/.\-]\s*([0-9OISZ]{4})\b/i;
const RE_DIA_SEMANA = /\b(Seg|Ter|Qua|Qui|Sex|S[áa]b|Dom)\b/i;

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
const EVENT_PATTERNS: Array<{ tipo: TipoEvento; re: RegExp }> = [
  { tipo: "horas_trabalhadas", re: /Horas?\s+Trabalhadas?\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "horas_previstas", re: /Horas?\s+Previstas?\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "banco_horas_debito", re: /Banco\s+de\s+Horas?\s+D[ée]bito\s*:?\s*(-?\d{1,3}:\d{2})/i },
  { tipo: "banco_horas_70", re: /Banco\s+de\s+Horas?\s+70\s*%\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "he_com_70", re: /Horas?\s+Extras?\s+Com\s+70\s*%\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "he_intervalo", re: /HE\s+Com\s+70\s*%\s*-?\s*Intervalo\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "he_feriado_0", re: /Hora\s+Extra\s+Feriado\s+0\s*%\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "rsr_trabalhado_0", re: /R\.?S\.?R\.?\s+Trabalhad[ao]?\s+0\s*%\s*:?\s*(\d{1,3}:\d{2})/i },
  { tipo: "intrajornada_sup_2hs", re: /Intrajornada\s+Sup\.?\s+2hs?\s*:?\s*(\d{1,3}:\d{2})/i },
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
  /\b(ADMISS[ÃA]O|DEMISS[ÃA]O|EMISS[ÃA]O|MATR[ÍI]CULA|PIS|CARGO|DEPARTAMENTO|JUNTAD[OA]\s+EM|ASSINAD[OA]\s+ELETRONICAMENTE|N[ÚU]MERO\s+(?:do\s+)?PROCESSO|N[ÚU]MERO\s+(?:do\s+)?DOCUMENTO|VALIDAD[EO]|RAZ[ÃA]O\s+SOCIAL|CNPJ|CEP|ENDERE[ÇC]O|LOCALIZA[ÇC][ÃA]O|Per[íi]odo\s+\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4}|APROVAD[OA]\b|HOMOLOGAD[OA]\b|REGISTRAD[OA]\s+ELETRONICAMENTE|VALIDAD[OA]\s+(?:PELO|POR|EM)|CONFIRMAD[OA]\s+(?:PELO|POR|EM))\b/i;

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

export function parseCartaoPonto(
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

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const linhaBruta = raw.replace(/\|/g, " ").trim();
    if (linhaBruta.length === 0) continue;
    // Remove tags "X:XX - Inserido/Desconsiderado" antes de qualquer split
    // (Inserido/Desconsiderado NÃO são divisores de batidas/eventos).
    const { inseridas, desconsideradas, texto: linhaSemPipes } =
      extrairTagsBatidas(linhaBruta);

    let dateMatch = linhaSemPipes.match(RE_DATA_BR);
    let dataCorrigida = false;
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
    const semData = parteBatidas
      .replace(RE_DATA_BR, " ")
      .replace(RE_DIA_SEMANA, " ");
    const marcacoes = capturarMarcacoes(semData, inseridas, desconsideradas);

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

    apuracoes.push({
      data,
      dia_semana: diaSemana,
      ocorrencia,
      marcacoes,
      eventos,
      observacao: null,
    });
  }

  // Dedup por data (última prevalece). Avisa se dedupar.
  const dedup = new Map<string, ApuracaoDiaria>();
  let dedupCount = 0;
  for (const a of apuracoes) {
    if (dedup.has(a.data)) dedupCount++;
    dedup.set(a.data, a);
  }
  if (dedupCount > 0) {
    warnings.push(
      `${dedupCount} apuração(ões) com data duplicada — usada a última de cada dia.`,
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
 * Detecção de continuação (regra conservadora):
 *   1. Linha NÃO contém data dd/MM/yyyy.
 *   2. Linha contém ao menos uma hora HH:MM.
 *   3. Linha começa com `|` (formato tabela markdown) — sinal claro de
 *      que o OCR está renderizando uma linha de tabela quebrada.
 *
 * Quando os 3 critérios casam, a linha é concatenada à última linha-âncora
 * encontrada (que tinha data). Outras linhas (ex: header, rodapé,
 * "Estou ciente...") passam intactas para o output.
 */
function mesclarContinuacoes(lines: string[]): string[] {
  const out: string[] = [];
  let ultimaAncoraIdx = -1;
  for (const linha of lines) {
    const limpa = linha.replace(/\|/g, " ").trim();
    const temData = RE_DATA_BR.test(limpa);
    const temHora = /\b\d{1,2}:\d{2}\b/.test(limpa);
    const comecaComPipe = /^\s*\|/.test(linha);

    if (temData) {
      out.push(linha);
      ultimaAncoraIdx = out.length - 1;
      continue;
    }
    if (
      !temData &&
      temHora &&
      comecaComPipe &&
      ultimaAncoraIdx >= 0 &&
      !RE_METADADO_LINHA.test(limpa) &&
      !RE_TIMESTAMP_APROVACAO.test(limpa)
    ) {
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
): Marcacao[] {
  type H = { valor: string; inserida: boolean; desconsiderada: boolean };
  const horarios: H[] = [];
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
    if (horarios.length >= 12) break; // Limite: 6 pares
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
