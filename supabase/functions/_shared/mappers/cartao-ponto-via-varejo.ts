/**
 * Mapper: Cartão de Ponto Via Varejo / Casa Bahia.
 *
 * Consome `DocumentoTabular` (texto + coordenadas) e produz
 * `ParseCartaoPontoResultDominio`. Diferença chave para o parser regex
 * v5: aqui o texto vem ORDENADO (top-down/left-right) pela clusterização
 * geométrica do extrator. Não precisamos mais da heurística complexa de
 * "Layout B colapsado com alinhamento posicional incerto" — a ordem
 * natural do PDF preserva a relação dia↔batidas.
 *
 * Baseado na heurística do parser v5
 * (`src/features/data-extraction/parsers/cartao-ponto/layouts/via-varejo-v1.ts`)
 * mas drasticamente mais simples.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type {
  ApuracaoDominio,
  MarcacaoDominio,
  OcorrenciaDominio,
  ParseCartaoPontoResultDominio,
  ReconciliacaoPeriodo,
} from '../tipos-dominio.ts';
import { detectarColunaDupla } from '../heuristicas/coluna-dupla.ts';

const RE_DATA_BR = /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}\b/;

const PARSER_VERSION = 'cartao-ponto-via-varejo-mapper-v6-2026-05-06';

// Aceita 2 formatos de cabeçalho de período:
//   1. ANTIGO (Via Varejo 2011-2016): "Período 11.01.2016 A 15.02.2016"
//      (separator = ponto, "A" maiúsculo, sem ":")
//   2. MODERNO (Via Varejo / Casas Bahia 2018+): "PERÍODO: 11/01/2016 A 15/02/2016"
//      ou "Período 11/01/2016 a 15/02/2016" (separator = barra, ":" opcional,
//      "A" maiúsculo ou minúsculo).
//
// Separator `[./]` cobre ambos. `\s*:?\s+` cobre "Período:" do layout novo.
// `[Aa]` cobre case-insensitive "A entre dia inicial e final".
//
// Capture groups: m[1..3] = dd, mm, yyyy de início; m[4..6] = dd, mm, yyyy de fim.
// `dataPontoToUtc(dd, mm, yyyy)` é format-agnostic (parseInt em strings
// numéricas separadas) — não importa qual separator no input original.
//
// O nome "dataPontoToUtc" preserva legado (era só dots antes da relaxação
// de 2026-05-20). Função em si não usa pontos — apenas dá nome ao bind.
const RE_PERIODO =
  /Per[íi]odo\s*:?\s+(\d{2})[./](\d{2})[./](\d{4})\s+[Aa]\s+(\d{2})[./](\d{2})[./](\d{4})/i;
const RE_PERIODO_GLOBAL =
  /Per[íi]odo\s*:?\s+(\d{2})[./](\d{2})[./](\d{4})\s+[Aa]\s+(\d{2})[./](\d{2})[./](\d{4})/gi;
const RE_LINHA_DIA =
  /\b(\d{1,2})\s+(SEG|TER|QUA|QUI|SEX|SAB|DOM|D\.?S\.?R\.?|FERIADO|FER\.?\s*DESC\.?)\b/i;
const RE_HORA = /\b(\d{1,2}):(\d{2})\b/g;

const MARCADORES_FIM = [
  /^\s*Resumo\s+do\s+Per[íi]odo/i,
  /^\s*HORAS\s+TRABALHADAS/i,
  /^\s*D\.?S\.?R\.?\s+PAGOS/i,
  /^\s*Afastamentos\s+do\s+Per[íi]odo/i,
  /^\s*Assinado\s+eletronicamente/i,
  /^\s*N[úu]mero\s+do\s+processo:/i,
];

function eFimDeTabela(linha: string): boolean {
  return MARCADORES_FIM.some((re) => re.test(linha));
}

function classificarTipoDia(token: string): {
  tipo: 'normal' | 'dsr' | 'feriado' | 'fer_desc';
  diaSemana: string;
} {
  const t = token.replace(/\s+/g, '').toUpperCase();
  if (/^D\.?S\.?R\.?$/.test(t)) return { tipo: 'dsr', diaSemana: 'D.S.R.' };
  if (t === 'FERIADO') return { tipo: 'feriado', diaSemana: 'FERIADO' };
  if (/^FER\.?DESC\.?$/.test(t)) return { tipo: 'fer_desc', diaSemana: 'FER.DESC.' };
  return { tipo: 'normal', diaSemana: token.toUpperCase() };
}

interface PeriodoDetectado {
  inicio: Date;
  fim: Date;
  textoOriginal: string;
}

// =====================================================
// NOTA — NOME LEGADO. Função recebe (dd, mm, yyyy) como strings numéricas
// SEPARADAS via parseInt. NÃO depende de "pontos" como separator no input
// original. O nome "dataPontoToUtc" preserva história (era estritamente
// formato dots antes da relaxação de 2026-05-20 que adicionou suporte a
// barras). Não renomeei pra não expandir escopo — se vir esse nome no
// futuro, lê esse comentário antes de assumir que dots são exigidos.
// =====================================================
function dataPontoToUtc(dd: string, mm: string, yyyy: string): Date {
  return new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)));
}

/**
 * Reconstrói data a partir do dia (1-31) e do período do cabeçalho.
 * Retorna null para dias inválidos.
 */
function reconstruirData(dia: number, periodo: PeriodoDetectado): Date | null {
  if (dia < 1 || dia > 31) return null;
  const candidatos = [
    new Date(Date.UTC(periodo.inicio.getUTCFullYear(), periodo.inicio.getUTCMonth(), dia)),
    new Date(Date.UTC(periodo.fim.getUTCFullYear(), periodo.fim.getUTCMonth(), dia)),
  ];
  for (const c of candidatos) {
    if (c.getUTCDate() === dia && c >= periodo.inicio && c <= periodo.fim) return c;
  }
  return null;
}

function isoFromUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Extrai pares E/S de uma string. Aceita ímpares — último horário sem par
 * vira `{e: 'X', s: ''}`. Função pura — caller decide truncamento.
 */
function extrairPares(s: string): MarcacaoDominio[] {
  const horas: string[] = [];
  RE_HORA.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_HORA.exec(s)) !== null) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    horas.push(`${m[1].padStart(2, '0')}:${m[2]}`);
  }
  const out: MarcacaoDominio[] = [];
  for (let i = 0; i < horas.length; i += 2) {
    out.push({ e: horas[i], s: horas[i + 1] ?? '' });
  }
  return out;
}

/**
 * Quebra o textoCompleto em blocos por período e processa cada bloco.
 * Resiliente a layout (texto plano já vem ordenado pelo extrator).
 */
function quebrarEmBlocos(texto: string): Array<{
  periodo: PeriodoDetectado;
  trecho: string;
}> {
  RE_PERIODO_GLOBAL.lastIndex = 0;
  const matches: Array<{ idx: number; periodo: PeriodoDetectado }> = [];
  let m: RegExpExecArray | null;
  while ((m = RE_PERIODO_GLOBAL.exec(texto)) !== null) {
    matches.push({
      idx: m.index + m[0].length,
      periodo: {
        inicio: dataPontoToUtc(m[1], m[2], m[3]),
        fim: dataPontoToUtc(m[4], m[5], m[6]),
        // Preserva o separador real do match (./) e case do "A/a" — evita
        // que warnings/observações reportem formato dots quando o input usou
        // barras (era cosmético antes da relaxação, vale registrar agora).
        textoOriginal: m[0],
      },
    });
  }
  const blocos: Array<{ periodo: PeriodoDetectado; trecho: string }> = [];
  for (let i = 0; i < matches.length; i++) {
    const inicio = matches[i].idx;
    const fim = i + 1 < matches.length ? matches[i + 1].idx - 1 : texto.length;
    blocos.push({ periodo: matches[i].periodo, trecho: texto.slice(inicio, fim) });
  }
  return blocos;
}

/**
 * Processa um bloco linha-a-linha. Para no primeiro marcador de fim.
 * Cada linha que casa RE_LINHA_DIA + tem horários vira uma apuração.
 */
function processarBloco(
  bloco: { periodo: PeriodoDetectado; trecho: string },
  warnings: string[],
  colunaDupla: boolean,
): ApuracaoDominio[] {
  const apuracoes: ApuracaoDominio[] = [];
  const linhas = bloco.trecho.split(/\r?\n/);
  for (const linha of linhas) {
    if (eFimDeTabela(linha)) break;
    const m = linha.match(RE_LINHA_DIA);
    if (!m) continue;
    const dia = parseInt(m[1], 10);
    const tipoInfo = classificarTipoDia(m[2]);
    const data = reconstruirData(dia, bloco.periodo);
    if (!data) {
      warnings.push(
        `Dia ${dia} fora do período ${bloco.periodo.textoOriginal} — linha ignorada.`,
      );
      continue;
    }
    if (tipoInfo.tipo === 'fer_desc') continue; // férias descansadas — não vira jornada

    // Extrai horários DEPOIS do label do dia (texto antes do label pode ser
    // rodapé do cartão anterior na mesma linha — caso extremo).
    const idxLabel = linha.search(RE_LINHA_DIA);
    const trechoBatidas = idxLabel >= 0 ? linha.slice(idxLabel) : linha;
    const todasMarcacoes = extrairPares(trechoBatidas);
    // Coluna dupla "Real vs Previsto": mantém apenas o 1° par (4 horas
    // reais = 2 pares); 2° par é escala prevista, descartado.
    // Nota: truncamento aqui é em PARES (slice(0,2)); no mapper genérico
    // o equivalente é em HORAS (slice(0,4)). Mesmo efeito, unidades
    // diferentes — não confundir.
    const marcacoes = colunaDupla
      ? todasMarcacoes.slice(0, 2)
      : todasMarcacoes;

    if ((tipoInfo.tipo === 'dsr' || tipoInfo.tipo === 'feriado') && marcacoes.length === 0) {
      continue; // descanso/feriado sem batida — não exporta
    }
    if (tipoInfo.tipo === 'normal' && marcacoes.length === 0) continue;

    let ocorrencia: OcorrenciaDominio = 'NORMAL';
    if (tipoInfo.tipo === 'feriado') ocorrencia = 'FERIADO';
    if (tipoInfo.tipo === 'dsr') ocorrencia = 'DSR';

    apuracoes.push({
      data: isoFromUtc(data),
      dia_semana: tipoInfo.diaSemana,
      ocorrencia,
      marcacoes: marcacoes.slice(0, 6),
      eventos: [],
      observacao: null,
    });
  }
  return apuracoes;
}

// ============================================================
// Reconciliação contra totalizadores (Fase 3 v7 — 2026-05-20)
// ============================================================

/**
 * Códigos de totalizadores Via Varejo que somam tempo TRABALHADO no período:
 *   - 9000 Horas Normais (jornada regular)
 *   - 9080 Horas Extras 75% (adicional dia útil)
 *   - 9081 Horas Extras 100% (feriado trabalhado, domingo)
 *   - 9082-9089 outras variantes da família 908x (defensivo)
 *
 * Por que NÃO inclui 9024 (Férias), 9012 (Falta Justificada), 9050 (DSR):
 * esses são tempo NÃO-TRABALHADO. Férias/falta/DSR não têm batidas. Somar
 * a `declarado_minutos` produziria falsa divergência em TODO PDF com
 * férias/faltas/DSR no período (declarado=somado_batidas + tempo_off,
 * batidas só somam tempo_worked → delta artificialmente grande).
 *
 * Por que NÃO inclui 9090/9091: códigos sem semântica confirmada pra Via
 * Varejo. Adicionar quando aparecerem em PDF real (Fase 6 com Roque vai
 * sinalizar se tiver).
 *
 * Regex: aceita "9000 Horas Normais 183:20", "9081 Horas Extras 100% 8:00",
 * "9080 Horas Extras 75% 3:00". Label não-greedy entre código e HH:MM.
 *
 * IMPORTANTE: char class do label INCLUI dígitos `0-9` porque "9080 Horas
 * Extras 75% 3:00" tem "75%" no meio. Sem 0-9 na classe, label seria
 * cortada em "Horas Extras " e o regex falharia. Lookahead `(?=\s|$)`
 * depois de HH:MM ancora pra não casar pedaço de número maior.
 *
 * EXPANSÃO 2026-05-20: era `(9000|9080)`. Família 908x foi ampliada após
 * Cérebro humano observar que 9081 (feriado trabalhado) é comum em PDFs
 * ADP-Web Via Varejo reais — sem ele, todo dia de feriado trabalhado vira
 * "batidas > declarado" → falsa divergência → bloqueio de export errado.
 */
const RE_TOTALIZADOR_TEMPO =
  /\b(9000|908[0-9])\s+([A-Za-zÀ-ÿ0-9%\.\s]+?)\s+(\d{1,4}):(\d{2})(?=\s|$)/g;

function hhmmToMin(h: string, m: string): number {
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function minToHhmm(min: number): string {
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Extrai a soma de minutos declarados em totalizadores de tempo trabalhado
 * (códigos 9000 + 9080) dentro de um trecho de bloco. Retorna null se
 * NENHUM totalizador for encontrado (não validável).
 */
function extrairMinutosDeclarados(trecho: string): {
  total_min: number | null;
  detalhes: Array<{ codigo: string; label: string; min: number }>;
} {
  RE_TOTALIZADOR_TEMPO.lastIndex = 0;
  const detalhes: Array<{ codigo: string; label: string; min: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = RE_TOTALIZADOR_TEMPO.exec(trecho)) !== null) {
    const codigo = m[1];
    const label = m[2].trim();
    const min = hhmmToMin(m[3], m[4]);
    detalhes.push({ codigo, label, min });
  }
  if (detalhes.length === 0) return { total_min: null, detalhes: [] };
  const total = detalhes.reduce((acc, d) => acc + d.min, 0);
  return { total_min: total, detalhes };
}

/**
 * Soma TODOS os pares (saída-entrada) das marcações de um conjunto de
 * apurações. Pares com saída antes da entrada (turno noturno cruzando
 * meia-noite OU artifact de extração) são ignorados.
 *
 * SUPOSIÇÃO TESTÁVEL: Via Varejo cartão antigo é padrão lojista/comercial
 * (jornada 08-18 com intervalo). Jornadas cruzando meia-noite (segurança
 * 22h-06h, limpeza noturna) NÃO são vistas neste mapper. Se aparecer
 * cliente com turno noturno legítimo, a soma fica subdimensionada e a
 * reconciliação flagar divergência sem motivo real — refinamento futuro
 * exige detectar "virada de meia-noite" via flag explícita do parser
 * (similar a `e_inserida` que já existe pro caso de batida manual).
 */
function somarBatidas(apuracoes: readonly ApuracaoDominio[]): number {
  let total = 0;
  for (const ap of apuracoes) {
    for (const par of ap.marcacoes) {
      if (!par.e || !par.s) continue;
      const e = par.e.match(/^(\d{1,2}):(\d{2})$/);
      const s = par.s.match(/^(\d{1,2}):(\d{2})$/);
      if (!e || !s) continue;
      const eMin = hhmmToMin(e[1], e[2]);
      const sMin = hhmmToMin(s[1], s[2]);
      if (sMin <= eMin) continue;
      total += sMin - eMin;
    }
  }
  return total;
}

/**
 * Constrói ReconciliacaoPeriodo pra um bloco com suas apurações.
 * Tolerância: 5 min absoluto (não cumulativo).
 *
 * Quando totalizador ausente: ok=true por convenção ("não foi possível
 * validar" não é motivo pra bloquear export — a Fase 4 distingue via
 * `declarado_minutos === null`).
 */
function reconciliarPeriodo(
  periodoInicio: Date,
  periodoFim: Date,
  trechoBloco: string,
  apuracoesNoPeriodo: readonly ApuracaoDominio[],
): ReconciliacaoPeriodo {
  const { total_min: declarado, detalhes } = extrairMinutosDeclarados(trechoBloco);
  const somado = somarBatidas(apuracoesNoPeriodo);
  const inicioIso = isoFromUtc(periodoInicio);
  const fimIso = isoFromUtc(periodoFim);

  if (declarado === null) {
    return {
      periodo: { inicio: inicioIso, fim: fimIso },
      declarado_minutos: null,
      declarado_str: null,
      somado_minutos: somado,
      somado_str: minToHhmm(somado),
      delta_minutos: 0,
      ok: true,
      motivo: `Totalizadores 9000/9080 ausentes no rodapé — não foi possível validar contra batidas (somado=${minToHhmm(somado)}).`,
    };
  }

  const delta = somado - declarado;
  const ok = Math.abs(delta) <= 5;
  const detalhesStr = detalhes
    .map((d) => `${d.codigo}=${minToHhmm(d.min)}`)
    .join(', ');
  return {
    periodo: { inicio: inicioIso, fim: fimIso },
    declarado_minutos: declarado,
    declarado_str: minToHhmm(declarado),
    somado_minutos: somado,
    somado_str: minToHhmm(somado),
    delta_minutos: delta,
    ok,
    motivo: ok
      ? `Reconciliação OK (delta ${minToHhmm(delta)}, tolerância 5min). Totalizadores: ${detalhesStr}.`
      : `Reconciliação DIVERGENTE: declarado ${minToHhmm(declarado)} (${detalhesStr}), somado das batidas ${minToHhmm(somado)}, delta ${minToHhmm(delta)} excede tolerância 5min.`,
  };
}

export const mapperCartaoViaVarejo: Mapper<ParseCartaoPontoResultDominio> = {
  slug: 'cartao_via_varejo_v1',
  nome: 'Cartão de Ponto Via Varejo / Casa Bahia',
  tipoDocumento: 'cartao_ponto',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const motivos: string[] = [];
    let acertos = 0;
    const t = doc.textoCompleto;

    // VETO ANTI-REGRESSÃO: documentos do layout Casas Bahia pós-2018 usam
    // "ESPELHO DE PONTO" em vez de "Cartão de Ponto". Mesmo que o CGC
    // (33.041.260) ou o formato de período moderno (com barras) case, esse
    // mapper foi calibrado para o layout Via Varejo "Cartão de Ponto" antigo
    // — colunas, marcadores de fim de tabela, RE_LINHA_DIA são todos
    // específicos daquele layout. Rosicleia 2022-2024 (Casas Bahia novo)
    // é o caso de regressão que esse veto previne quando a relaxação de
    // RE_PERIODO (2026-05-20) passou a aceitar barras.
    //
    // O veto exige "ESPELHO DE PONTO" PRESENTE E "CARTÃO DE PONTO" AUSENTE.
    // Documentos híbridos (raros, mas possíveis) seguem fluxo normal.
    //
    // PREMISSA TESTÁVEL: PDFs do layout Via Varejo Cartão antigo SEMPRE têm
    // a string "Cartão de Ponto" em algum lugar do texto extraído (header
    // do PDF ou rodapé fiscal). Se aparecer PDF híbrido com "ESPELHO DE
    // PONTO" no header E "Cartão" só num footer técnico (improvável mas
    // possível em layouts mistos pós-fusão), o veto NÃO dispara — fluxo
    // segue normal e pode causar parse incorreto. Se observar esse caso
    // em produção: refinar veto pra exigir presença de "Cartão" EM
    // proximidade léxica (ex: ±200 chars do início do texto) em vez de
    // qualquer match no documento inteiro.
    if (/ESPELHO\s+DE\s+PONTO/i.test(t) && !/CART[ÃA]O\s+DE\s+PONTO/i.test(t)) {
      return {
        aplica: false,
        score: 0,
        motivos: [
          'ESPELHO DE PONTO sem CARTÃO DE PONTO — layout Casas Bahia pós-2018, fora do escopo deste mapper',
        ],
      };
    }

    if (/NOVA\s+CASA\s+BAHIA\s+S\/?A/i.test(t)) {
      acertos++;
      motivos.push('razão social Nova Casa Bahia');
    }
    if (/VIA\s+VAREJO\s+S\/?A/i.test(t)) {
      acertos++;
      motivos.push('razão social Via Varejo');
    }
    if (/10\.?757\.?237\/?\d{4}-?\d{2}/.test(t)) {
      acertos++;
      motivos.push('CGC Casa Bahia');
    }
    if (/33\.?041\.?260\/?\d{4}-?\d{2}/.test(t)) {
      acertos++;
      motivos.push('CGC Via Varejo');
    }
    if (RE_PERIODO.test(t)) {
      acertos += 2;
      motivos.push('formato Período DD.MM.YYYY');
    }
    if (/CART[ÃA]O\s+DE\s+PONTO/i.test(t)) {
      acertos++;
      motivos.push('título Cartão de Ponto');
    }
    return {
      aplica: acertos >= 3,
      score: Math.min(acertos / 7, 1),
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): ParseCartaoPontoResultDominio | null {
    const warnings: string[] = [];
    const blocos = quebrarEmBlocos(doc.textoCompleto);
    if (blocos.length === 0) return null;

    // Detecção de coluna dupla "Real vs Previsto" no nível do documento.
    const linhasComData = doc.textoCompleto
      .split(/\r?\n/)
      .filter((l) => RE_DATA_BR.test(l));
    const colunaDupla = detectarColunaDupla(
      doc.textoCompleto,
      linhasComData,
    ).detectado;

    const apuracoes: ApuracaoDominio[] = [];
    const competencias = new Map<string, number>();
    // Reconciliação Fase 3 v7: track apurações por bloco pra comparar com
    // totalizadores DAQUELE bloco específico. Sem isso, somaria batidas de
    // todo o documento contra totalizador de um único período.
    const reconciliacao: ReconciliacaoPeriodo[] = [];

    for (const bloco of blocos) {
      const apuracoesNesseBloco = processarBloco(bloco, warnings, colunaDupla);
      for (const ap of apuracoesNesseBloco) {
        apuracoes.push(ap);
        const [yyyy, mm] = ap.data.split('-');
        const k = `${mm}/${yyyy}`;
        competencias.set(k, (competencias.get(k) ?? 0) + 1);
      }
      // Computa reconciliação pra ESTE período antes de passar pro próximo.
      // Trecho usado é o que veio do quebrarEmBlocos (já contém o rodapé do
      // período antes da próxima âncora "Período X").
      reconciliacao.push(
        reconciliarPeriodo(
          bloco.periodo.inicio,
          bloco.periodo.fim,
          bloco.trecho,
          apuracoesNesseBloco,
        ),
      );
    }

    // Dedup por data — defesa em profundidade.
    const dedup = new Map<string, ApuracaoDominio>();
    for (const a of apuracoes) {
      if (!dedup.has(a.data)) dedup.set(a.data, a);
    }
    const final = [...dedup.values()].sort((a, b) => a.data.localeCompare(b.data));

    let predominante = '';
    let max = 0;
    for (const [k, v] of competencias) {
      if (v > max) {
        predominante = k;
        max = v;
      }
    }

    if (final.length === 0) {
      warnings.push(
        `Detectados ${blocos.length} blocos Via Varejo mas nenhuma apuração extraída.`,
      );
      return null;
    }

    // reconciliacao_geral_ok: true se TODOS os períodos têm ok=true.
    // Importante: períodos com declarado=null (totalizador ausente) também
    // têm ok=true por convenção — não bloqueia export por falta de dado
    // pra validar. Apenas divergências CONFIRMADAS bloqueiam (Fase 4).
    const reconciliacao_geral_ok = reconciliacao.every((r) => r.ok);
    if (!reconciliacao_geral_ok) {
      const divergentes = reconciliacao
        .filter((r) => !r.ok)
        .map((r) => `${r.periodo.inicio}↔${r.periodo.fim}: delta ${minToHhmm(r.delta_minutos)}`)
        .join('; ');
      warnings.push(
        `Reconciliação detectou ${reconciliacao.filter((r) => !r.ok).length} período(s) divergente(s) (>5min): ${divergentes}. Export bloqueado pela Fase 4 quando essa flag está false.`,
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
      reconciliacao,
      reconciliacao_geral_ok,
    };
  },
};
