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
} from '../tipos-dominio.ts';
import { detectarColunaDupla } from '../heuristicas/coluna-dupla.ts';
import { cortarTotalizadores } from '../heuristicas/totalizadores-cartao-ponto.ts';

const RE_DATA_BR = /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}\b/;

const PARSER_VERSION = 'cartao-ponto-via-varejo-mapper-v6-2026-05-06';

const RE_PERIODO =
  /Per[íi]odo\s+(\d{2})\.(\d{2})\.(\d{4})\s+A\s+(\d{2})\.(\d{2})\.(\d{4})/i;
const RE_PERIODO_GLOBAL =
  /Per[íi]odo\s+(\d{2})\.(\d{2})\.(\d{4})\s+A\s+(\d{2})\.(\d{2})\.(\d{4})/gi;
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
        textoOriginal: `${m[1]}.${m[2]}.${m[3]} A ${m[4]}.${m[5]}.${m[6]}`,
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
    // cortarTotalizadores aplicado antes do extrairPares descarta a
    // parteTotalizadores (BCre/BDeb/HExt inline). extrairPares permanece
    // função pura.
    const idxLabel = linha.search(RE_LINHA_DIA);
    const trechoBatidas = idxLabel >= 0 ? linha.slice(idxLabel) : linha;
    const cortado = cortarTotalizadores(trechoBatidas);
    const todasMarcacoes = extrairPares(cortado.parteBatidas);
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

export const mapperCartaoViaVarejo: Mapper<ParseCartaoPontoResultDominio> = {
  slug: 'cartao_via_varejo_v1',
  nome: 'Cartão de Ponto Via Varejo / Casa Bahia',
  tipoDocumento: 'cartao_ponto',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const motivos: string[] = [];
    let acertos = 0;
    const t = doc.textoCompleto;
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
    for (const bloco of blocos) {
      for (const ap of processarBloco(bloco, warnings, colunaDupla)) {
        apuracoes.push(ap);
        const [yyyy, mm] = ap.data.split('-');
        const k = `${mm}/${yyyy}`;
        competencias.set(k, (competencias.get(k) ?? 0) + 1);
      }
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
  },
};
