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
import { detectarAlertas as detectarAlertasFn } from '../heuristicas/alertas-apuracao.ts';
import type { TipoAlertaApuracao } from '../tipos-dominio.ts';

const RE_DATA_BR = /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}\b/;

const PARSER_VERSION = 'cartao-ponto-via-varejo-mapper-v7.3-2026-05-22';

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
//
// O `\.?` entre "Período" e o `:` cobre uma peculiaridade observada no
// PDF do Roque (Via Varejo, fase 6 v7): a string vem como "PERÍODO .:"
// com ponto literal antes do dois-pontos. Causa exata desconhecida —
// pode ser quirk de versão do ADP-Web ou artefato da extração pdfjs
// preservando um caracter que outros extractors normalizariam. É
// defensivo: não introduz falso-positivo significativo. Descoberto em
// 2026-05-20 no diagnóstico V6 end-to-end contra o PDF do Roque.
const RE_PERIODO =
  /Per[íi]odo\s*\.?\s*:?\s+(\d{2})[./](\d{2})[./](\d{4})\s+[Aa]\s+(\d{2})[./](\d{2})[./](\d{4})/i;
const RE_PERIODO_GLOBAL =
  /Per[íi]odo\s*\.?\s*:?\s+(\d{2})[./](\d{2})[./](\d{4})\s+[Aa]\s+(\d{2})[./](\d{2})[./](\d{4})/gi;
// Aceita 2 formatos de linha de dia (duas regex separadas pra preservar
// a INFORMAÇÃO COMPLETA da data quando disponível):
//
//   1. pdfjs V6 (text-native):   "16/02/2016 TER 162 N 10:26 13:00 ..."
//      → m[1]=dd m[2]=mm m[3]=yyyy m[4]=dia-semana
//      → data reconstruída direto do texto (não precisa do período pra inferir mês)
//
//   2. OCR Mistral V5 (legado):  "16 TER 08:00 12:00 ..."
//      → m[1]=dd m[2]=dia-semana
//      → data reconstruída via `reconstruirData(dia, periodo)` (heurística antiga)
//
// `(?:^|\s)` substitui o `\b` antigo: mais determinístico, exige
// início-de-linha OU whitespace antes do dígito. Evita backtrack que
// pegava dígitos espúrios em "9000", "183:20", etc.
//
// Por que DUAS regex em vez de uma com grupo opcional: descoberto em
// 2026-05-20 que regex `\d{1,2}(?:/MM/YYYY)?\s+DIA-SEMANA` joga fora a
// info de mês quando a data está completa — `reconstruirData(11, periodo)`
// volta com 11/01 mesmo quando o texto dizia 11/02 (período "11/01 A
// 15/02" tem dois candidatos válidos pro dia 11). A solução é usar
// `dataPontoToUtc(dd, mm, yyyy)` direto quando o pdfjs nos deu tudo.
const RE_LINHA_DIA_PDFJS =
  /(?:^|\s)(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\s+(SEG|TER|QUA|QUI|SEX|SAB|DOM|D\.?S\.?R\.?|FERIADO|FER\.?\s*DESC\.?)\b/i;
const RE_LINHA_DIA_OCR =
  /(?:^|\s)(\d{1,2})\s+(SEG|TER|QUA|QUI|SEX|SAB|DOM|D\.?S\.?R\.?|FERIADO|FER\.?\s*DESC\.?)\b/i;
const RE_HORA = /\b(\d{1,2}):(\d{2})\b/g;

const MARCADORES_FIM = [
  /^\s*Resumo\s+do\s+Per[íi]odo/i,
  /^\s*HORAS\s+TRABALHADAS/i,
  /^\s*D\.?S\.?R\.?\s+PAGOS/i,
  /^\s*Afastamentos\s+do\s+Per[íi]odo/i,
  /^\s*Assinado\s+eletronicamente/i,
  /^\s*N[úu]mero\s+do\s+processo:/i,
  // pdfjs V6 do PDF Via Varejo coloca "Movimentos: (Período de DD/MM/YYYY a
  // DD/MM/YYYY)" antes do bloco de totalizadores (códigos 38XX/73XX/9XXX).
  // Marcador defensivo: hoje as linhas de totalizador não casam RE_LINHA_DIA,
  // mas se algum totalizador novo casar acidentalmente, esse fim corta antes.
  // Descoberto em 2026-05-20 (Fase 6 v7).
  /^\s*Movimentos:\s*\(Per[íi]odo/i,
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

/**
 * Classifica o motivo de um afastamento (linha "AFAST X X" no pdfjs) em
 * uma das categorias estruturadas. Cobre os casos observados no PDF do
 * Roque (Fase 6 v7, 2026-05-20):
 *   - "Férias" → FERIAS
 *   - "Suspensão Contrato de Trabalho" → SUSPENSAO_CONTRATO (MP 936/Lei 14.020)
 *   - "Atestado Médico" (variantes) → ATESTADO_MEDICO
 *   - "Falta Justificada" → FALTA_JUSTIFICADA
 *   - "Falta" (sem qualifier) → FALTA_INJUSTIFICADA
 *   - qualquer outro → OUTRO (texto raw preservado em `motivo` no caller)
 *
 * Retorna também `textoBruto` — o que veio do PDF, em "Title Case" pra UI
 * humana ("Suspensão Contrato de Trabalho" e não "SUSPENSÃO CONTRATO DE TRABALHO").
 */
function classificarAfastamento(trechoAposLabel: string): {
  categoria:
    | 'FERIAS'
    | 'SUSPENSAO_CONTRATO'
    | 'ATESTADO_MEDICO'
    | 'FALTA_JUSTIFICADA'
    | 'FALTA_INJUSTIFICADA'
    | 'OUTRO';
  textoBruto: string;
} {
  // Captura o texto após "AFAST" até o fim da linha ou repetição.
  // pdfjs costuma duplicar o motivo ("AFAST Férias Férias") — pegamos
  // a primeira ocorrência limpando duplicatas adjacentes.
  const afastMatch = trechoAposLabel.match(
    /\bAFAST\b\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s\/\.\-]+?)(?=\s{2,}|\s*$|\s+\d{1,2}:\d{2}|\s+AFAST\b)/i,
  );
  let textoBruto = afastMatch ? afastMatch[1].trim() : 'AFAST (motivo não identificado)';
  // pdfjs duplica: "Férias Férias" → "Férias". Detecta e remove duplicação adjacente.
  const meio = Math.floor(textoBruto.length / 2);
  const primeiraMetade = textoBruto.slice(0, meio).trim();
  const segundaMetade = textoBruto.slice(meio).trim();
  if (primeiraMetade && primeiraMetade.toLowerCase() === segundaMetade.toLowerCase()) {
    textoBruto = primeiraMetade;
  }

  const lower = textoBruto.toLowerCase();
  if (/\bf[ée]rias\b/i.test(lower)) return { categoria: 'FERIAS', textoBruto };
  if (/suspens[ãa]o.*contrato/i.test(lower)) return { categoria: 'SUSPENSAO_CONTRATO', textoBruto };
  if (/atestado.*m[ée]dico/i.test(lower)) return { categoria: 'ATESTADO_MEDICO', textoBruto };
  if (/falta.*justificad/i.test(lower)) return { categoria: 'FALTA_JUSTIFICADA', textoBruto };
  if (/falta/i.test(lower)) return { categoria: 'FALTA_INJUSTIFICADA', textoBruto };
  return { categoria: 'OUTRO', textoBruto };
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

// Marcadores que separam Registrado da Escala numa linha do PDF Via Varejo.
// Quando aparecem ENTRE dois horários, indicam fim do "Horário Registrado"
// e início do "Horário de Trabalho" (escala teórica, descartar).
//
// Sprint 3 (2026-05-22): expandido com marcadores observados em PDFs
// Jefferson antigo (ADP-Web) que faziam escala vazar como batida quando
// apareciam no INÍCIO da linha (sem batidas reais antes):
//   - `ABONO AUTORIZADO` (CAPS — distingue do "Abono Autorizado" do
//     layout NOVO; o layout antigo usa caixa-alta no rótulo)
//   - `AFAST` (CAPS standalone) — prefixa "Férias Férias" e
//     "Atestado Médico Atestado Médico" no antigo
//   - `Falta Injustificada` (i)
//
// Sprint 3 Fase 4 (2026-05-22) — calibração contra PDF Izabela detectou
// que `DSR DSR` e `FERIADO FERIADO` (totalizadores) precisam ser markers
// da camada 1 (qualquer posição), não só camada 2.5 (após 4 batidas).
// Casos reais que falhavam:
//   - "09:10 11:13 DSR DSR 2:03" (3 batidas, 1 totalizador no meio)
//     Antes: camada 2.5 não disparava (len=3, não 5), camada 3 retornava 3 horas
//     Agora: camada 1 corta em "09:10 11:13", retorna 2 horas ✓
//   - "DSR DSR 7:20" (sem batidas, só totalizador)
//     Antes: camada 3 retornava 1 hora; Agora: camada 1 corta em "", retorna 0 ✓
// Camada 2.5 mantida como defesa-em-profundidade pro caso len=5.
//
// `Treinamento` e `Problemas Relogio` foram MOVIDOS pra camada 0 (regex
// `RE_MARCADOR_PRE_BATIDAS` abaixo) porque podem aparecer no meio da
// linha em outros contextos (cabeçalho de seção, histórico) — só são
// markers válidos quando precedem todas as batidas.
//
// O termo `\bAfast(?:amento)?\s+Abonado\b` continua existindo separadamente
// e é diferente de `\bAFAST\b` standalone — manter ambos.
const RE_MARCADOR_COLUNA_DUPLA =
  /\b(?:D[ée]bito|Cr[eé]dito)\s+Banco\s+de\s+horas\b|\bAtraso\s+Abonado\b|\bSa[íi]da\s+Antecipada\b|\bAfast(?:amento)?\s+Abonado\b|ABONO\s+AUTORIZADO|\bAFAST\b|\bFalta\s+Injustificada\b|\bDSR\s+DSR\b|\bFERIADO\s+FERIADO\b/i;

// Sprint 3 (2026-05-22) — Camada 0: marcadores cujo significado depende
// de POSIÇÃO (só são markers quando precedem qualquer batida).
// "Treinamento" e "Problemas Relogio" podem aparecer em contextos legítimos
// no meio/fim da linha (ex: "Histórico de Treinamentos", "...evento 'Treinamento'
// registrado"). Pra evitar descartar batida real nesses casos, esses dois
// só viram marker se NÃO houver HH:MM antes deles no trechoBatidas.
const RE_MARCADOR_PRE_BATIDAS = /\b(?:Treinamento|Problemas\s+Relogio)\b/i;

/**
 * Extrai pares E/S em layout coluna-dupla "Registrado vs Escala".
 *
 * Bug fechado em 2026-05-21 (auditoria Roque, PDF Via Varejo 2016-2021):
 *
 *   Camada anterior usava `slice(0, N)` baseado em contagem total,
 *   falhando em variações reais:
 *
 *   A) Reg vazio + 4hh Escala  → CSV mostrava 2 pares fictícios
 *   B) Reg 2hh + Débito + 4hh Escala → CSV mostrava par real + 1 escala
 *   C) Reg 4hh + 4hh Escala (sem marcador) → CSV mostrava 4 pares
 *   D) Reg 4hh + 4hh Escala + 1hh HExt → 9 hh totais, fallback mantinha tudo
 *   E) Reg 4hh + 4hh Escala + 2hh (HExt+AdNot) → 10 hh totais, idem
 *
 * Estratégia robusta em 3 camadas:
 *
 *   1) MARCADOR SEMÂNTICO: detecta separadores textuais conhecidos
 *      ("Débito Banco de horas", "Atraso Abonado", etc). Tudo antes
 *      do marcador = Registrado; tudo depois = Escala+extras (descartar).
 *
 *   2) JANELA DESLIZANTE SOBRE ESCALAS: procura SEQUÊNCIA DE 4HH
 *      consecutivos batendo EXATAMENTE com uma escala conhecida
 *      (extraída do cabeçalho do bloco). A primeira posição que
 *      casar é a fronteira: matches[0..i-1] = Registrado, matches[i..]
 *      descartado (escala + qualquer HExt/AdNot/BDeb/Abono depois).
 *
 *      Resolve casos A (i=0 → Reg vazio), B (i=2 → 1 par), C (i=4 →
 *      2 pares), D/E (i=4, extras após escala descartados).
 *
 *   3) FALLBACK: nenhuma escala casou. Assume jornada coluna-dupla
 *      simétrica (4 Reg + 4 Escala). Se total=8, primeiros 4 = Reg.
 *      Caso contrário, mantém tudo (heurística de segurança — não
 *      perder batida real em formato desconhecido).
 */
function extrairParesColunaDupla(
  s: string,
  escalasConhecidas: Set<string>,
): MarcacaoDominio[] {
  RE_HORA.lastIndex = 0;
  const matches: Array<{ h: string; idx: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = RE_HORA.exec(s)) !== null) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    matches.push({
      h: `${m[1].padStart(2, '0')}:${m[2]}`,
      idx: m.index,
      end: m.index + m[0].length,
    });
  }
  if (matches.length === 0) return [];

  // Camada 0 (Sprint 3, 2026-05-22): markers cuja semântica depende de
  // POSIÇÃO. "Treinamento" e "Problemas Relogio" só são markers válidos
  // se aparecem ANTES de qualquer batida (HH:MM). Defesa contra falso
  // positivo em linhas onde a palavra aparece em outro contexto.
  const mPre = RE_MARCADOR_PRE_BATIDAS.exec(s);
  if (mPre) {
    const trechoAntes = s.substring(0, mPre.index);
    if (!/\b\d{1,2}:\d{2}\b/.test(trechoAntes)) {
      return [];
    }
  }

  // Camada 1: marcador semântico ("Débito Banco de horas" etc.)
  const mMarc = RE_MARCADOR_COLUNA_DUPLA.exec(s);
  if (mMarc) {
    const corte = mMarc.index;
    const registrado = matches.filter(x => x.end <= corte).map(x => x.h);
    return paresFromHoras(registrado);
  }

  // Camada 2: janela deslizante — primeira sequência de 4hh consecutivos
  // casando uma escala conhecida = fronteira Registrado|Escala.
  //
  // Sprint 3 (2026-05-22) — fix: quando i===0 (primeiros 4hh batem com a
  // escala teórica), o comportamento anterior retornava `[]` (interpretava
  // como "linha só com escala"). Mas se a linha tem 8+ horas no total, os
  // primeiros 4 são batidas reais que coincidentemente são iguais à escala
  // (funcionário cumpriu jornada exata). Os 4 seguintes são a repetição
  // teórica. Detectamos esse caso e mantemos os 4 primeiros como Registrado.
  if (escalasConhecidas.size > 0 && matches.length >= 4) {
    for (let i = 0; i <= matches.length - 4; i++) {
      const janela = `${matches[i].h}|${matches[i + 1].h}|${matches[i + 2].h}|${matches[i + 3].h}`;
      if (escalasConhecidas.has(janela)) {
        if (i === 0 && matches.length >= 8) {
          // Batidas reais coincidem com escala — 4 primeiras são batidas
          // reais, 4 seguintes (e qualquer extra) são repetição da escala.
          const registrado = matches.slice(0, 4).map(x => x.h);
          return paresFromHoras(registrado);
        }
        const registrado = matches.slice(0, i).map(x => x.h);
        return paresFromHoras(registrado);
      }
    }
  }

  // Sprint 3 (2026-05-22) — Camada 2.5: FERIADO/DSR trabalhados com
  // totalizador final. Padrão observado em PDFs reais Jefferson antigo:
  //   "10:34 14:27 15:32 18:47 FERIADO FERIADO 7:08"
  //   "13:10 16:00 17:05 21:51 DSR DSR 7:36"
  // As 4 primeiras horas são batidas reais; a 5ª é totalizador de horas
  // extras de feriado/DSR (NÃO é batida). Sem este tratamento, camada 3
  // (fallback) com 5 matches retornaria 3 pares (último com saída vazia).
  //
  // GUARD APERTADO: exige que "DSR DSR" ou "FERIADO FERIADO" apareça
  // DEPOIS da 4ª hora. Defesa contra caso patológico: 5 batidas reais
  // numa linha que tem "DSR Semanal" ou similar concatenado por quirk
  // OCR no início — antes do aperto, descartava a 5ª batida real
  // silenciosamente. Risco raro mas catastrófico.
  if (matches.length === 5) {
    const trechoAposQuartaHora = s.substring(matches[3].end);
    if (/\b(?:DSR\s+DSR|FERIADO\s+FERIADO)\b/.test(trechoAposQuartaHora)) {
      const registrado = matches.slice(0, 4).map(x => x.h);
      return paresFromHoras(registrado);
    }
  }

  // Camada 3: fallback. Total=8 sem escala detectada → assume 4+4
  // (jornada coluna-dupla padrão sem cabeçalho de escalas casado).
  // Demais quantidades → mantém tudo (preserva batida real em formato
  // desconhecido; melhor um falso-positivo de escala que descartar
  // batida verdadeira).
  if (matches.length === 8) {
    const registrado = matches.slice(0, 4).map(x => x.h);
    return paresFromHoras(registrado);
  }
  return paresFromHoras(matches.map(x => x.h));
}

function paresFromHoras(horas: string[]): MarcacaoDominio[] {
  const out: MarcacaoDominio[] = [];
  for (let i = 0; i < horas.length; i += 2) {
    out.push({ e: horas[i], s: horas[i + 1] ?? '' });
  }
  return out;
}

/**
 * Extrai escalas conhecidas do cabeçalho do bloco. PDF Via Varejo lista
 * as escalas vigentes no topo:
 *   `Horários ..: 91 08:00 11:00 12:05 16:25 | 162 09:00 12:00 13:05 17:25 | ...`
 *
 * Cada escala = sequência de 4hh consecutivos (precedidos por código numérico,
 * não capturado). Limitamos a busca ao CABEÇALHO (texto antes da primeira
 * linha de dia DD/MM/YYYY) — sem isso, regex global no trecho inteiro de
 * 70KB+ trava o Deno runtime (546 worker limit).
 *
 * Retorna Set de strings "HH:MM|HH:MM|HH:MM|HH:MM" — comparação O(1) com
 * os "últimos 4" de uma linha de dia.
 */
function extrairEscalasConhecidas(trechoBloco: string): Set<string> {
  const escalas = new Set<string>();
  // Corta no início da primeira LINHA DE DIA (DD/MM/YYYY + dia-semana
  // SEG/TER/QUA/etc). Datas isoladas como impressão "25/06/2021 Programa de
  // detalhe" ou "Admissão ..: 24/11/2003" NÃO marcam fim do cabeçalho —
  // só a primeira linha de jornada real. Sem isso, o corte é prematuro
  // e as escalas listadas após "Horários ..:" ficam de fora.
  const mPrimeiraLinhaDia =
    /\b\d{2}\/\d{2}\/\d{4}\s+(?:SEG|TER|QUA|QUI|SEX|SAB|DOM)\b/i.exec(trechoBloco);
  const cabecalho = mPrimeiraLinhaDia
    ? trechoBloco.slice(0, mPrimeiraLinhaDia.index)
    : trechoBloco.slice(0, 2000);
  // 4 HH:MM consecutivos (separados por whitespace) = uma escala. Sem
  // captura do código (pode ser 1-4 dígitos OU símbolo | OU vazio).
  const RE_ESCALA = /(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = RE_ESCALA.exec(cabecalho)) !== null) {
    const padded = [m[1], m[2], m[3], m[4]].map(h => {
      const [hh, mm] = h.split(':');
      return `${hh.padStart(2, '0')}:${mm}`;
    });
    escalas.add(padded.join('|'));
  }
  return escalas;
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
 *
 * `diasDescartados` é populado quando DSR/feriado é VISTO mas tem batidas
 * vazias — exporter downstream não precisa dessas linhas, mas precisamos
 * registrar que o parser as enxergou pra distinguir "ausente legítimo" de
 * "ausente por bug". Ver `ParseCartaoPontoResultDominio.dias_classificados_descartados`.
 */
function processarBloco(
  bloco: { periodo: PeriodoDetectado; trecho: string },
  warnings: string[],
  diasDescartados: NonNullable<ParseCartaoPontoResultDominio['dias_classificados_descartados']>,
  colunaDupla: boolean,
): ApuracaoDominio[] {
  const apuracoes: ApuracaoDominio[] = [];
  // Escalas do cabeçalho do bloco — usadas pela heurística "últimos 4
  // batem com escala conhecida → descartar" em extrairParesColunaDupla.
  // Fix bug Roque (2026-05-21): linhas com Registrado vazio ou parcial
  // estavam absorvendo a escala como se fosse batida real.
  const escalasConhecidas = colunaDupla
    ? extrairEscalasConhecidas(bloco.trecho)
    : new Set<string>();
  const linhas = bloco.trecho.split(/\r?\n/);
  for (const linha of linhas) {
    if (eFimDeTabela(linha)) break;

    // Tenta pdfjs primeiro (preserva mês/ano do texto). Cai pra OCR V5 só
    // quando a linha não tem a data completa.
    const mPdfjs = linha.match(RE_LINHA_DIA_PDFJS);
    const mOcr = !mPdfjs ? linha.match(RE_LINHA_DIA_OCR) : null;
    const m = mPdfjs ?? mOcr;
    if (!m) continue;

    let dia: number;
    let labelDS: string;
    let data: Date | null;

    if (mPdfjs) {
      // Formato pdfjs: usa a data COMPLETA do texto.
      // m[1]=dd m[2]=mm m[3]=yyyy m[4]=dia-semana
      dia = parseInt(mPdfjs[1], 10);
      labelDS = mPdfjs[4];
      data = dataPontoToUtc(mPdfjs[1], mPdfjs[2], mPdfjs[3]);
      // Sanidade: garante que a data está dentro do período do bloco.
      if (data < bloco.periodo.inicio || data > bloco.periodo.fim) {
        warnings.push(
          `Data ${isoFromUtc(data)} fora do período ${bloco.periodo.textoOriginal} — linha ignorada.`,
        );
        continue;
      }
    } else {
      // Formato OCR V5: reconstrói data via heurística do período.
      // m[1]=dia m[2]=dia-semana
      dia = parseInt(mOcr![1], 10);
      labelDS = mOcr![2];
      data = reconstruirData(dia, bloco.periodo);
      if (!data) {
        warnings.push(
          `Dia ${dia} fora do período ${bloco.periodo.textoOriginal} — linha ignorada.`,
        );
        continue;
      }
    }

    // tipoInfo é let — pode ser sobrescrito quando o pdfjs entrega o
    // dia-semana (ex: "DOM") como label mas a ocorrência real (DSR/FERIADO)
    // aparece como TOKEN SEPARADO no resto da linha (ex: "21/02/2016 DOM
    // 999 N DSR DSR"). Sobrescrita acontece só quando: tipo inicial=normal,
    // sem batidas, e token DSR/FERIADO aparece após o label.
    let tipoInfo = classificarTipoDia(labelDS);
    if (tipoInfo.tipo === 'fer_desc') continue; // férias descansadas — não vira jornada

    // Extrai horários DEPOIS do label do dia (texto antes do label pode ser
    // rodapé do cartão anterior na mesma linha — caso extremo).
    const idxLabel = mPdfjs ? linha.search(RE_LINHA_DIA_PDFJS) : linha.search(RE_LINHA_DIA_OCR);
    const trechoBatidas = idxLabel >= 0 ? linha.slice(idxLabel) : linha;
    // Coluna dupla "Registrado vs Escala": detecta fronteira por gap de
    // espaços (ver extrairParesColunaDupla). Antes usava slice(0,2) que
    // misturava escala quando Registrado tinha <4 horários (bug Roque
    // 09/11/2017 etc.: 2hh Registrado + 4hh Escala virava 4hh ficticios).
    const marcacoes = colunaDupla
      ? extrairParesColunaDupla(trechoBatidas, escalasConhecidas)
      : extrairPares(trechoBatidas);

    // Sobrescrita pdfjs V6: linha "21/02/2016 DOM 999 N DSR DSR" captura
    // "DOM" (dia-semana) como label, mas a ocorrência real é DSR (token
    // presente no resto da linha). Só sobrescreve quando não há batidas
    // (linha de jornada normal nunca tem token "DSR"/"FERIADO" pendurado).
    const trechoAposLabel = idxLabel >= 0 ? linha.slice(idxLabel + m[0].length) : '';
    if (tipoInfo.tipo === 'normal' && marcacoes.length === 0) {
      if (/\bD\.?S\.?R\.?\b/i.test(trechoAposLabel)) {
        tipoInfo = { tipo: 'dsr', diaSemana: tipoInfo.diaSemana };
      } else if (/\bFERIADO\b/i.test(trechoAposLabel)) {
        tipoInfo = { tipo: 'feriado', diaSemana: tipoInfo.diaSemana };
      }
    }

    if ((tipoInfo.tipo === 'dsr' || tipoInfo.tipo === 'feriado') && marcacoes.length === 0) {
      // Design intencional: CSV PJe-Calc não precisa de DSR/feriado vazio.
      // Mas registramos como "visto e classificado" pra distinguir de bug.
      diasDescartados.push({
        data: isoFromUtc(data),
        dia_semana: tipoInfo.diaSemana,
        ocorrencia: tipoInfo.tipo === 'dsr' ? 'DSR' : 'FERIADO',
        motivo: `${tipoInfo.tipo === 'dsr' ? 'DSR' : 'Feriado'} sem batida — não exportado.`,
      });
      continue;
    }

    // Afastamentos (Férias, MP 936/Lei 14.020, Atestado, Falta) — pdfjs
    // entrega linhas tipo "30/04/2020 QUI 997 N AFAST Suspensão Contrato
    // de Trabalho Suspensão Contrato de Trabalho". Têm o token "AFAST" e
    // o motivo (Férias/Suspensão/Atestado) no resto da linha. Sem batida
    // pra exportar, mas precisam de rastro estruturado (PJe-Calc trata
    // cada tipo de afastamento de forma diferente — suspensão MP 936 ≠
    // férias ≠ atestado ≠ falta).
    if (tipoInfo.tipo === 'normal' && marcacoes.length === 0 && /\bAFAST\b/i.test(trechoAposLabel)) {
      const motivoAfastamento = classificarAfastamento(trechoAposLabel);
      diasDescartados.push({
        data: isoFromUtc(data),
        dia_semana: tipoInfo.diaSemana,
        ocorrencia: 'AFASTAMENTO',
        motivo: `Afastamento: ${motivoAfastamento.textoBruto}`,
        motivo_afastamento: motivoAfastamento.categoria,
      });
      continue;
    }

    if (tipoInfo.tipo === 'normal' && marcacoes.length === 0) continue;

    let ocorrencia: OcorrenciaDominio = 'NORMAL';
    if (tipoInfo.tipo === 'feriado') ocorrencia = 'FERIADO';
    if (tipoInfo.tipo === 'dsr') ocorrencia = 'DSR';

    const apuracao: ApuracaoDominio = {
      data: isoFromUtc(data),
      dia_semana: tipoInfo.diaSemana,
      ocorrencia,
      marcacoes: marcacoes.slice(0, 6),
      eventos: [],
      observacao: null,
    };
    const alertasDetectados = detectarAlertasFn(apuracao.marcacoes, [trechoAposLabel]);
    if (alertasDetectados.length > 0) apuracao.alertas = alertasDetectados;
    apuracoes.push(apuracao);
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
 *
 * EXPANSÃO 2 — 2026-05-20 (Fase 6 v7, pós-diagnóstico Roque): adicionados
 * 3 códigos que aparecem nos rodapés com tempo bruto trabalhado em casos
 * fora da jornada padrão. Sem eles, 7 períodos do Roque tinham delta >10h
 * (parser somava batidas reais, mas declarado=9000+9080 não cobria as
 * horas extras especiais):
 *   - `3884 Horas Trabalhadas Feriado/DS` — horas BRUTAS em feriado/DSR
 *     (não confundir com `8865 FERIADO/DSR` que é o benefício pago, não
 *     o tempo trabalhado).
 *   - `7338 HORAS EXTRAS 75% - INTERVALO` — HE por intrajornada não
 *     respeitada.
 *   - `7358 Horas Extras DSR/Feriado 0%` — HE em DSR/feriado SEM
 *     adicional (já compensado via banco de horas).
 *
 * NÃO inclui (por design — não são tempo trabalhado):
 *   - `3960 Adicional Sábado 25%` — adicional percentual, não tempo bruto
 *   - `8865 FERIADO/DSR` — feriado pago sem trabalho
 *   - `7863/7864 Quantid` — quantidades (dias), não tempo
 *   - `7361/7489/7490 Saldo Banco` — saldos do banco de horas, não tempo
 *     trabalhado naquele período
 *   - `8875 DIAS TRABALHADOS - SABADOS` — quantidade de dias, não tempo
 *
 * Char class do label expandido pra `\/` (cobre "DSR/Feriado") e `-`
 * (cobre "75% - INTERVALO").
 */
const RE_TOTALIZADOR_TEMPO =
  /\b(9000|908[0-9]|3884|7338|7358)\s+([A-Za-zÀ-ÿ0-9%\.\s\/\-]+?)\s+(\d{1,4}):(\d{2})(?=\s|$)/g;

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

    // DELEGAÇÃO PRO MAPPER MINHA (Sprint 3, 2026-05-22):
    // PDFs SÓ-NOVO ("ESPELHO DE PONTO" sem "CARTÃO DE PONTO") são responsabilidade
    // do mapper `cartao_via_varejo_minha_v1`. Este mapper antigo continua sendo
    // o owner do layout "Cartão de Ponto" tradicional (ADP-Web/Via Varejo
    // pré-2018). PDFs híbridos (caso Izabela: transição 16/06/2021) acionam
    // AMBOS via dispatcher.escolherMappersCartaoPonto, e os resultados são
    // mesclados por data com regra "prevalece quem tem mais batidas reais".
    //
    // Histórico do veto que existia aqui (removido nesta sprint):
    // Antes, esse if abaixo retornava aplica:false pra PDFs só-ESPELHO,
    // mas o erro de motivo "fora do escopo" induzia o operador a achar que
    // o PDF era inválido. Agora retornamos aplica:false com motivo neutro
    // ("delegado ao mapper Minha") e o dispatcher acha o mapper certo.
    if (/ESPELHO\s+DE\s+PONTO/i.test(t) && !/CART[ÃA]O\s+(?:DE\s+)?PONTO/i.test(t)) {
      return {
        aplica: false,
        score: 0,
        motivos: ['layout só ESPELHO DE PONTO — delegado ao mapper Minha (cartao_via_varejo_minha_v1)'],
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
    // O "de" é opcional porque PDFs Via Varejo extraídos via pdfjs vêm
    // como "Cartão Ponto" (sem "de") no header — observado no PDF do
    // Roque, 2026-05-20. Sem o opcional, o detector perdia esse acerto
    // e podia cair pro mapper genérico.
    if (/CART[ÃA]O\s+(?:DE\s+)?PONTO/i.test(t)) {
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
    // Rastro Fase 6 v7: DSR/feriado sem batida que viu e descartou.
    const diasDescartados: NonNullable<
      ParseCartaoPontoResultDominio['dias_classificados_descartados']
    > = [];

    for (const bloco of blocos) {
      const apuracoesNesseBloco = processarBloco(bloco, warnings, diasDescartados, colunaDupla);
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

    if (final.length === 0 && diasDescartados.length === 0) {
      warnings.push(
        `Detectados ${blocos.length} blocos Via Varejo mas nenhuma apuração nem descarte extraídos.`,
      );
      return null;
    }
    // Quando só há descartes (período inteiro de férias/afastamento), retorna
    // resultado válido com apuracoes=[] — caller decide o que fazer.

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
      // Dívida técnica explícita (Fase 6 v7): períodos com divergência >10h
      // que a expansão de família de totalizadores não conseguiu fechar.
      // 600 min = 10h. Limiar deliberadamente alto pra distinguir de ruído
      // de arredondamento (<5min) e de pequenas divergências mensais (5-60min).
      reconciliacao_residuais: (() => {
        const grandes = reconciliacao.filter((r) => Math.abs(r.delta_minutos) > 600);
        if (grandes.length === 0) return undefined;
        return grandes.map((r) => ({
          periodo: r.periodo,
          delta_minutos: r.delta_minutos,
          delta_str: minToHhmm(r.delta_minutos),
          motivo:
            'Divergência grande (>10h) não explicada pelos totalizadores capturados (9000/908x/3884/7338/7358). Investigação manual recomendada — possíveis causas: pares E→S inválidos sendo somados; totalizador em código/formato fora da família atual; intrajornada dupla-contada.',
        }));
      })(),
      dias_classificados_descartados: diasDescartados.length > 0 ? diasDescartados : undefined,
      alertas_summary: agregarAlertas(final),
    };
  },
};

function agregarAlertas(apuracoes: ApuracaoDominio[]) {
  let total = 0;
  const porTipo: Record<TipoAlertaApuracao, number> = { BATIDAS_IMPARES: 0, RELOGIO_QUEBRADO: 0 };
  for (const a of apuracoes) {
    if (!a.alertas || a.alertas.length === 0) continue;
    total++;
    for (const al of a.alertas) porTipo[al.tipo]++;
  }
  return total === 0 ? undefined : { total_apuracoes_com_alerta: total, por_tipo: porTipo };
}
