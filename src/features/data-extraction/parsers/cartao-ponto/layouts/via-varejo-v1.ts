/**
 * Parser determinístico de Cartão de Ponto Via Varejo / Casa Bahia
 * (layout 2011-2016).
 *
 * Diferença para o parser genérico v3: o ano e o mês NÃO ficam na linha
 * do dia — só `dd DiaSemana` aparece nas linhas de batida. A data completa
 * é reconstruída a partir do cabeçalho `Período DD.MM.YYYY A DD.MM.YYYY`.
 *
 * Suporta DOIS formatos de OCR:
 *
 *   Layout A — linha-por-linha (~60% dos cartões)
 *     | 21 TER | 13:45 17:02 | 18:10 22:05 |
 *     | 22 QUA | 13:46 17:12 | 18:21 22:12 |
 *     | 23 FERIADO | 11:54 15:30 | 16:31 |
 *     | 28 TER | | |
 *
 *   Layout B — tabela colapsada (~40% dos cartões)
 *     | 02 QUI         | 10:03 14:02   | 15:10 18:25 |
 *       03 SEX           09:41 14:10     15:14 18:09
 *       04 SAB           09:56 14:38     15:41 18:34
 *       05 D.S.R.        ...             ...
 *
 * Em layout B, a coluna "Dia" lista TODOS os dias do mês (incluindo D.S.R.
 * e dias sem batida), enquanto as colunas de período listam SÓ os dias com
 * batida. O alinhamento é POSICIONAL e o parser filtra dias D.S.R./vazios
 * antes de casar com as batidas — sem chutar quando a contagem não bate.
 *
 * Cortes semânticos obrigatórios: o parser PARA de capturar batidas ao
 * encontrar marcadores como "Resumo do Período", "HORAS TRABALHADAS",
 * "Assinado eletronicamente", etc. Próximo "Período DD.MM.YYYY A DD.MM.YYYY"
 * reinicia.
 */

import type {
  ApuracaoDiaria,
  Marcacao,
  ParseCartaoPontoResult,
} from './generico-v1';
import type {
  DetectarLayoutResult,
  ParseCartaoPontoOptions,
  PeriodoCartao,
} from '../types';

export const PARSER_VERSION = 'cartao-ponto-via-varejo-v1-2026-05-05';

// ============================================================
// Detecção de layout
// ============================================================

const MARCADORES_VIA_VAREJO = [
  /\bNOVA\s+CASA\s+BAHIA\s+S\/?A\b/i,
  /\bVIA\s+VAREJO\s+S\/?A\b/i,
  /\bC\.?G\.?C\.?\.?\s*\n?\s*10\.?757\.?237\/?\d{4}-?\d{2}\b/i, // CGC Casa Bahia
  /\bC\.?G\.?C\.?\.?\s*\n?\s*33\.?041\.?260\/?\d{4}-?\d{2}\b/i, // CGC Via Varejo
  /\bviavarejo\b/i,
];

// `\s+` cobre quebra de linha que o Mistral às vezes insere entre "Período"
// e a data (renderizou cabeçalho como célula multi-linha).
const MARCADOR_PERIODO_VIA_VAREJO =
  /Per[íi]odo\s+(\d{2}\.\d{2}\.\d{4})\s+A\s+(\d{2}\.\d{2}\.\d{4})/i;
const MARCADOR_PERIODO_GLOBAL =
  /Per[íi]odo\s+(\d{2}\.\d{2}\.\d{4})\s+A\s+(\d{2}\.\d{2}\.\d{4})/gi;

export function detectarLayoutViaVarejo(ocrText: string): DetectarLayoutResult {
  const motivos: string[] = [];
  let acertos = 0;

  for (const re of MARCADORES_VIA_VAREJO) {
    if (re.test(ocrText)) {
      acertos++;
      motivos.push(re.source);
    }
  }

  // O formato de período "Período DD.MM.YYYY A DD.MM.YYYY" (com pontos
  // separadores e "A" maiúsculo) é o sinal MAIS DISTINTIVO do layout
  // 2011-2016. Sem ele, o documento NÃO é Via Varejo antigo, mesmo que
  // mencione "VIA VAREJO" ou tenha CGC 33.041.260 em algum lugar.
  // Ex: espelho de ponto Casas Bahia novo usa "Período DD/MM/YYYY a DD/MM/YYYY".
  const temFormatoPeriodoAntigo = MARCADOR_PERIODO_VIA_VAREJO.test(ocrText);
  if (temFormatoPeriodoAntigo) {
    acertos += 2;
    motivos.push('formato Período DD.MM.YYYY A DD.MM.YYYY');
  }

  // Decisão MAIS ESTRITA: o formato de período antigo é OBRIGATÓRIO para
  // classificar como via_varejo_v1. Sem ele, o documento pode ter qualquer
  // razão social ou CGC — ainda assim NÃO é o layout 2011-2016.
  // Citações soltas a "VIA VAREJO" em footers fiscais NÃO devem disparar
  // o parser específico (era o bug do caso ROSICLEIA / Casas Bahia 2021+).
  if (!temFormatoPeriodoAntigo) {
    return {
      layout: 'generico_v1',
      confianca: 'alta',
      motivos: [
        'sem formato "Período DD.MM.YYYY A DD.MM.YYYY" — não é layout Via Varejo 2011-2016',
        ...motivos.map((m) => `(ignorado) ${m}`),
      ],
    };
  }

  if (acertos >= 4) return { layout: 'via_varejo_v1', confianca: 'alta', motivos };
  if (acertos >= 2) return { layout: 'via_varejo_v1', confianca: 'media', motivos };
  // Caso teórico (formato de período antigo casa mas zero outros marcadores) —
  // ainda assim, manda pro genérico por segurança.
  return {
    layout: 'generico_v1',
    confianca: 'alta',
    motivos: ['formato de período antigo isolado, sem outros sinais Via Varejo'],
  };
}

// ============================================================
// Cortes semânticos — onde parar de capturar batidas
// ============================================================

const MARCADORES_FIM_DE_TABELA = [
  /\bResumo\s+do\s+Per[íi]odo\b/i,
  /\bHORAS\s+TRABALHADAS\b/i,
  /\bD\.?S\.?R\.?\s+PAGOS\b/i,
  /\bAfastamentos\s+do\s+Per[íi]odo\b/i,
  /\bAssinado\s+eletronicamente\b/i,
  /\bN[úu]mero\s+do\s+processo:/i,
  /^\s*---\s*PAGE\s+\d+\s*---\s*$/i,
  /\bID\.\s+\w+\s+-\s+P[áa]g\.\b/i,
];

function temMarcadorFimTabela(linha: string): boolean {
  return MARCADORES_FIM_DE_TABELA.some((re) => re.test(linha));
}

// ============================================================
// Reconstrução de data
// ============================================================

function dataPontoToUtc(s: string): Date {
  // "DD.MM.YYYY" → Date UTC midnight.
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) throw new Error(`Data malformada: "${s}"`);
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

/**
 * Dado um dia (1-31) e o período do cabeçalho (que pode atravessar virada
 * de mês, como 21.05 a 20.06), retorna a Date UTC midnight correspondente.
 *
 * Estratégia: tenta o mês inicial; se cai dentro do período, devolve. Senão
 * tenta o mês final. Se nenhum cai dentro, é dia inválido (ex: dia 31 num
 * período onde o mês inicial só tem 30 dias).
 */
export function reconstruirData(dia: number, periodo: PeriodoCartao): Date | null {
  if (dia < 1 || dia > 31) return null;
  const candidatos: Date[] = [
    new Date(
      Date.UTC(
        periodo.inicio.getUTCFullYear(),
        periodo.inicio.getUTCMonth(),
        dia,
      ),
    ),
    new Date(
      Date.UTC(periodo.fim.getUTCFullYear(), periodo.fim.getUTCMonth(), dia),
    ),
  ];
  for (const c of candidatos) {
    if (
      // Garante que a Date é válida (Date.UTC com dia 31 em mês de 30 estoura
      // pra dia 1 do mês seguinte — checamos getUTCDate).
      c.getUTCDate() === dia &&
      c >= periodo.inicio &&
      c <= periodo.fim
    ) {
      return c;
    }
  }
  return null;
}

// ============================================================
// Parser principal
// ============================================================

const RE_LINHA_DIA_LAYOUT_A =
  /^\|\s*(\d{1,2})\s+(SEG|TER|QUA|QUI|SEX|SAB|DOM|D\.?S\.?R\.?|FERIADO|FER\.?\s*DESC\.?)\b/i;

const RE_HHMM_PAR = /(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/g;
const RE_HHMM_SOLO = /\b(\d{1,2}):(\d{2})\b/g;

const RE_DIA_TIPO_LINHA =
  /^\s*(\d{1,2})\s+(SEG|TER|QUA|QUI|SEX|SAB|DOM|D\.?S\.?R\.?|FERIADO|FER\.?\s*DESC\.?)\s*$/i;

interface BlocoCartao {
  periodo: PeriodoCartao;
  linhas: string[]; // linhas da tabela (entre o cabeçalho e o "Resumo do Período")
}

/**
 * Quebra o OCR em blocos de cartão.
 *
 * O Mistral OCR às vezes renderiza "Período" e a data em LINHAS DIFERENTES
 * (cabeçalho como célula multi-linha do markdown table). Por isso o match
 * dos períodos é feito sobre o OCR INTEIRO com regex global; depois o
 * conteúdo entre 2 períodos consecutivos é tratado como uma janela e
 * nessa janela buscamos os marcadores de fim de tabela.
 */
function quebrarEmBlocos(ocrText: string): BlocoCartao[] {
  const matches: Array<{ inicio: Date; fim: Date; textoOriginal: string; idx: number }> = [];
  let m: RegExpExecArray | null;
  MARCADOR_PERIODO_GLOBAL.lastIndex = 0;
  while ((m = MARCADOR_PERIODO_GLOBAL.exec(ocrText)) !== null) {
    try {
      matches.push({
        inicio: dataPontoToUtc(m[1]),
        fim: dataPontoToUtc(m[2]),
        textoOriginal: `${m[1]} A ${m[2]}`,
        idx: m.index + m[0].length,
      });
    } catch {
      // ignore — período malformado
    }
  }
  if (matches.length === 0) return [];

  const blocos: BlocoCartao[] = [];
  for (let i = 0; i < matches.length; i++) {
    const inicio = matches[i].idx;
    const fim = i + 1 < matches.length ? matches[i + 1].idx - 1 : ocrText.length;
    const trecho = ocrText.slice(inicio, fim);
    // Dentro do trecho, corta no PRIMEIRO marcador de fim de tabela.
    const linhas = trecho.split(/\r?\n/);
    const linhasUteis: string[] = [];
    for (const l of linhas) {
      if (temMarcadorFimTabela(l)) break;
      linhasUteis.push(l);
    }
    blocos.push({
      periodo: {
        inicio: matches[i].inicio,
        fim: matches[i].fim,
        textoOriginal: matches[i].textoOriginal,
      },
      linhas: linhasUteis,
    });
  }
  return blocos;
}

/**
 * Extrai pares E/S de uma string (ex: "10:03 14:02 15:10 18:25").
 * Aceita ímpares: o último horário sem par vira `{ e: 'X', s: '' }`.
 */
function extrairPares(s: string): Marcacao[] {
  const horas: string[] = [];
  let m: RegExpExecArray | null;
  RE_HHMM_SOLO.lastIndex = 0;
  while ((m = RE_HHMM_SOLO.exec(s)) !== null) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    horas.push(`${m[1].padStart(2, '0')}:${m[2]}`);
  }
  const out: Marcacao[] = [];
  for (let i = 0; i < horas.length; i += 2) {
    out.push({ e: horas[i], s: horas[i + 1] ?? '' });
  }
  return out;
}

/**
 * Extrai apurações de um bloco. Tenta primeiro Layout A (linha-por-linha);
 * se não casar nada, cai pra Layout B (tabela colapsada com colunas multi-linha).
 */
function processarBloco(
  bloco: BlocoCartao,
  warnings: string[],
): ApuracaoDiaria[] {
  const apuracoesA = processarLayoutA(bloco, warnings);
  if (apuracoesA.length > 0) return apuracoesA;
  return processarLayoutB(bloco, warnings);
}

interface DiaParseado {
  dia: number;
  tipo: 'normal' | 'dsr' | 'feriado' | 'fer_desc' | 'vazio';
  diaSemana: string | null;
  marcacoesP1: Marcacao[];
  marcacoesP2: Marcacao[];
  /** Marca o dia como elegível para o CSV (tem batida ou trabalhou em descanso). */
  exportar: boolean;
}

function classificarTipo(token: string): DiaParseado['tipo'] {
  const t = token.replace(/\s+/g, '').toUpperCase();
  if (/^D\.?S\.?R\.?$/.test(t)) return 'dsr';
  if (t === 'FERIADO') return 'feriado';
  if (/^FER\.?DESC\.?$/.test(t)) return 'fer_desc';
  return 'normal';
}

/**
 * Layout A: cada linha tem `| dd DiaSemana | P1 | P2 |`. Casa as células por
 * pipes (`|`) — não depende de regex frágil.
 */
function processarLayoutA(
  bloco: BlocoCartao,
  warnings: string[],
): ApuracaoDiaria[] {
  const out: ApuracaoDiaria[] = [];
  for (const raw of bloco.linhas) {
    if (!raw.trim().startsWith('|')) continue;
    const m = raw.match(RE_LINHA_DIA_LAYOUT_A);
    if (!m) continue;
    const dia = parseInt(m[1], 10);
    const tipo = classificarTipo(m[2]);
    const diaSemana = m[2].toUpperCase();
    const celulas = raw
      .split('|')
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length); // descarta primeira/última vazias
    // Estrutura típica: [dd Dia, P1, P2, ...] OU [dd Dia, P1, X, P2, ...]
    // (alguns OCRs Mistral colocam coluna vazia entre os períodos)
    const celulasComHora = celulas
      .slice(1)
      .filter((c) => /\d{1,2}:\d{2}/.test(c));
    const p1 = celulasComHora[0] ?? '';
    const p2 = celulasComHora[1] ?? '';
    const marcs1 = extrairPares(p1);
    const marcs2 = extrairPares(p2);
    const marcacoes = [...marcs1, ...marcs2];

    const data = reconstruirData(dia, bloco.periodo);
    if (!data) {
      warnings.push(
        `Dia ${dia} fora do período ${bloco.periodo.textoOriginal} (ignorado).`,
      );
      continue;
    }

    // D.S.R./FERIADO sem batida → pula.
    if ((tipo === 'dsr' || tipo === 'feriado' || tipo === 'fer_desc') && marcacoes.length === 0) {
      continue;
    }
    if (tipo === 'fer_desc') {
      // Período de férias descansadas — não exporta linha de jornada.
      continue;
    }
    if (tipo === 'normal' && marcacoes.length === 0) continue;

    out.push(criarApuracao(data, diaSemana, tipo, marcacoes));
  }
  return out;
}

/**
 * Layout B: a célula da coluna "Dia" tem todas as 30 linhas em uma string só
 * (delimitada por `\n`), o mesmo para as colunas P1 e P2. Mistral coloca tudo
 * dentro do mesmo `|...|` lógico.
 *
 * Estratégia: detectar a célula da coluna "Dia" como aquela que tem a maior
 * sequência de tokens `dd DiaSemana`. Outras células com horários são P1/P2.
 */
function processarLayoutB(
  bloco: BlocoCartao,
  warnings: string[],
): ApuracaoDiaria[] {
  // Junta linhas em uma string única e re-divide por `|`.
  const texto = bloco.linhas.join('\n');
  // Cada bloco entre `|` é uma "célula".
  const celulas = texto
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  // Identifica a célula da coluna "Dia" — é a que tem mais matches de
  // `dd Tipo` em linhas separadas.
  let celulaDia: string | null = null;
  let melhorScore = 0;
  for (const c of celulas) {
    const score = (c.match(RE_DIA_TIPO_LINHA) ?? []).length;
    if (score > melhorScore) {
      melhorScore = score;
      celulaDia = c;
    }
    // Match na string inteira (multi-linha)
    const linhas = c.split(/\r?\n/);
    let s = 0;
    for (const l of linhas) if (RE_DIA_TIPO_LINHA.test(l)) s++;
    if (s > melhorScore) {
      melhorScore = s;
      celulaDia = c;
    }
  }
  if (!celulaDia || melhorScore < 3) return [];

  const diasParseados: DiaParseado[] = [];
  for (const linha of celulaDia.split(/\r?\n/)) {
    const m = linha.match(RE_DIA_TIPO_LINHA);
    if (!m) continue;
    const dia = parseInt(m[1], 10);
    const tipo = classificarTipo(m[2]);
    diasParseados.push({
      dia,
      tipo,
      diaSemana: m[2].toUpperCase(),
      marcacoesP1: [],
      marcacoesP2: [],
      exportar: tipo === 'normal' || tipo === 'feriado' || tipo === 'dsr',
    });
  }
  if (diasParseados.length === 0) return [];

  // Identifica colunas P1 e P2: são células diferentes da coluna "Dia"
  // que contêm pelo menos N linhas com horários `HH:MM`.
  const candidatosPeriodo: string[][] = [];
  for (const c of celulas) {
    if (c === celulaDia) continue;
    const linhasComHora = c
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /\d{1,2}:\d{2}/.test(l));
    if (linhasComHora.length >= 2) {
      candidatosPeriodo.push(linhasComHora);
    }
  }
  if (candidatosPeriodo.length === 0) return [];

  // Pega os 2 candidatos com mais linhas (P1 e P2).
  candidatosPeriodo.sort((a, b) => b.length - a.length);
  const p1Linhas = candidatosPeriodo[0] ?? [];
  const p2Linhas = candidatosPeriodo[1] ?? [];
  // Filtra linhas que NÃO são horários puros (defesa: marcadores tipo "JOR. 07:2"
  // já foram excluídos pelo corte semântico do bloco).
  const p1Filtradas = p1Linhas.filter((l) => /^\s*(\d{1,2}:\d{2}\s*)+$/.test(l));
  const p2Filtradas = p2Linhas.filter((l) => /^\s*(\d{1,2}:\d{2}\s*)+$/.test(l));
  const dadosP1 = (p1Filtradas.length >= 2 ? p1Filtradas : p1Linhas).map(extrairPares);
  const dadosP2 = (p2Filtradas.length >= 2 ? p2Filtradas : p2Linhas).map(extrairPares);

  // Filtra dias elegíveis (que devem casar com batidas).
  const diasElegiveis = diasParseados.filter((d) => d.exportar);
  const totalP1 = dadosP1.length;
  const totalP2 = dadosP2.length;

  if (diasElegiveis.length !== totalP1) {
    // Alinhamento incerto — alinha o que conseguir, registra warning.
    warnings.push(
      `Bloco ${bloco.periodo.textoOriginal}: ${diasElegiveis.length} dias elegíveis vs ${totalP1} batidas no P1. Alinhamento posicional dos primeiros ${Math.min(diasElegiveis.length, totalP1)} pode estar impreciso — revise.`,
    );
  }

  const out: ApuracaoDiaria[] = [];
  const n = Math.min(diasElegiveis.length, totalP1);
  for (let i = 0; i < n; i++) {
    const d = diasElegiveis[i];
    const data = reconstruirData(d.dia, bloco.periodo);
    if (!data) {
      warnings.push(
        `Dia ${d.dia} fora do período ${bloco.periodo.textoOriginal} (ignorado).`,
      );
      continue;
    }
    const marcs1 = dadosP1[i] ?? [];
    const marcs2 = i < totalP2 ? dadosP2[i] : [];
    const marcacoes = [...marcs1, ...marcs2];
    if (marcacoes.length === 0) continue;
    out.push(criarApuracao(data, d.diaSemana, d.tipo, marcacoes));
  }
  return out;
}

function criarApuracao(
  data: Date,
  diaSemana: string | null,
  tipo: DiaParseado['tipo'],
  marcacoes: Marcacao[],
): ApuracaoDiaria {
  const yyyy = data.getUTCFullYear();
  const mm = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(data.getUTCDate()).padStart(2, '0');
  const dataIso = `${yyyy}-${mm}-${dd}`;
  let ocorrencia: ApuracaoDiaria['ocorrencia'] = 'NORMAL';
  if (tipo === 'feriado') ocorrencia = 'FERIADO';
  if (tipo === 'dsr') ocorrencia = 'DSR';
  return {
    data: dataIso,
    dia_semana: diaSemana,
    ocorrencia,
    marcacoes: marcacoes.slice(0, 6), // PJe-Calc limita a 6 pares
    eventos: [],
    observacao: null,
  };
}

// ============================================================
// API pública
// ============================================================

export function parseCartaoPontoViaVarejo(
  ocrText: string,
  _opts: ParseCartaoPontoOptions = {},
): ParseCartaoPontoResult {
  const warnings: string[] = [];
  const blocos = quebrarEmBlocos(ocrText);
  const apuracoes: ApuracaoDiaria[] = [];
  const competencias = new Map<string, number>();

  for (const bloco of blocos) {
    const aps = processarBloco(bloco, warnings);
    for (const ap of aps) {
      apuracoes.push(ap);
      const [yyyy, mm] = ap.data.split('-');
      const k = `${mm}/${yyyy}`;
      competencias.set(k, (competencias.get(k) ?? 0) + 1);
    }
  }

  // Dedup por data (defesa em profundidade).
  const dedup = new Map<string, ApuracaoDiaria>();
  for (const a of apuracoes) {
    if (!dedup.has(a.data)) dedup.set(a.data, a);
  }
  const final = [...dedup.values()].sort((a, b) =>
    a.data.localeCompare(b.data),
  );

  let predominante = '';
  let max = 0;
  for (const [k, v] of competencias) {
    if (v > max) {
      predominante = k;
      max = v;
    }
  }

  if (final.length === 0 && blocos.length > 0) {
    warnings.push(
      `Detectados ${blocos.length} blocos de cartão Via Varejo mas nenhuma apuração extraída. Verifique se o OCR contém as colunas de período no formato esperado.`,
    );
  }

  // Sentinela: se o OCR é não-trivial mas zero apurações foram extraídas,
  // algo está muito errado — provavelmente roteamento incorreto. Registra
  // warning explícito pra UI mostrar em vermelho ao operador, em vez de
  // devolver silenciosamente "0 apurações detectadas em 0 competências".
  if (final.length === 0 && ocrText.replace(/\s+/g, '').length > 200) {
    warnings.push(
      'Parser Via Varejo foi invocado mas extraiu 0 apurações de um OCR ' +
        'não-vazio (>200 chars úteis). Layout do documento provavelmente não ' +
        'é Via Varejo 2011-2016. Reprocesse forçando layout genérico ou ' +
        'reporte como bug de roteamento.',
    );
  }

  return {
    apuracoes: final,
    competencias,
    competencia_predominante: predominante,
    data_inicial: final[0]?.data ?? '',
    data_final: final[final.length - 1]?.data ?? '',
    warnings,
    unparsed_lines: [],
    parser_version: PARSER_VERSION,
  };
}
