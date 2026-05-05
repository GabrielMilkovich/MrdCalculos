/**
 * Mapper: Cartão de Ponto genérico (fallback).
 *
 * Aplica-se quando o doc tem indicadores de cartão de ponto (data
 * dd/mm/yyyy + horários múltiplos por linha) mas não bate com nenhum
 * mapper específico de empregador. Reaproveita a heurística do parser
 * v3 (`parseCartaoPontoGenerico` no client) operando agora sobre texto
 * NATIVO ordenado pelo extrator geométrico.
 *
 * Score sempre menor que mappers específicos para garantir precedência.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type {
  ApuracaoDominio,
  MarcacaoDominio,
  OcorrenciaDominio,
  ParseCartaoPontoResultDominio,
} from '../tipos-dominio.ts';

const PARSER_VERSION = 'cartao-ponto-generico-mapper-v6-2026-05-06';

const RE_DATA_BR = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/;
const RE_HORA_GLOBAL = /\b(\d{1,2}):(\d{2})\b/g;
const RE_DIA_SEMANA = /\b(Seg|Ter|Qua|Qui|Sex|S[áa]b|Dom)\.?\b/i;

const MARCADORES_OCORRENCIA: Array<[RegExp, OcorrenciaDominio]> = [
  [/\bF[ée]rias\b/i, 'FERIAS'],
  [/\bLicen[çc]a\s+m[ée]dica/i, 'LICENCA_MEDICA'],
  [/\bFERIADO\b/i, 'FERIADO'],
  [/\bDSR\s+Semanal/i, 'DSR'],
  [/\bTreinamento/i, 'TREINAMENTO'],
  [/\bAtestado/i, 'ATESTADO'],
  [/\bAfastamento/i, 'AFASTAMENTO'],
  [/\bFALTA\b/i, 'FALTA'],
  [/\bFOLGA\b/i, 'FOLGA'],
];

function detectarOcorrencia(linha: string, temBatidas: boolean): OcorrenciaDominio {
  if (temBatidas) return 'NORMAL';
  for (const [re, oc] of MARCADORES_OCORRENCIA) {
    if (re.test(linha)) return oc;
  }
  return 'NORMAL';
}

function extrairHoras(s: string): string[] {
  const out: string[] = [];
  RE_HORA_GLOBAL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_HORA_GLOBAL.exec(s)) !== null) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    out.push(`${m[1].padStart(2, '0')}:${m[2]}`);
  }
  return out;
}

function pares(horas: string[]): MarcacaoDominio[] {
  const out: MarcacaoDominio[] = [];
  for (let i = 0; i < horas.length; i += 2) {
    out.push({ e: horas[i], s: horas[i + 1] ?? '' });
  }
  return out.slice(0, 6);
}

export const mapperCartaoGenerico: Mapper<ParseCartaoPontoResultDominio> = {
  slug: 'cartao_generico_v1',
  nome: 'Cartão de Ponto genérico (fallback)',
  tipoDocumento: 'cartao_ponto',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const motivos: string[] = [];
    let acertos = 0;
    const t = doc.textoCompleto;
    if (/CART[ÃA]O\s+DE\s+PONTO|ESPELHO\s+DE\s+PONTO/i.test(t)) {
      acertos += 2;
      motivos.push('título Cartão/Espelho de Ponto');
    }
    if (/JORNADA\s+DE\s+TRABALHO/i.test(t)) {
      acertos++;
      motivos.push('cabeçalho jornada de trabalho');
    }
    // Data dd/mm/yyyy + 4+ horários na mesma linha = forte indicação.
    const linhas = t.split(/\r?\n/);
    let linhasComBatidas = 0;
    for (const l of linhas) {
      if (RE_DATA_BR.test(l) && extrairHoras(l).length >= 2) linhasComBatidas++;
    }
    if (linhasComBatidas >= 5) {
      acertos += 2;
      motivos.push(`${linhasComBatidas} linhas com data + horários`);
    }
    return {
      aplica: acertos >= 2,
      // Cap em 0.6 — mappers específicos vencem.
      score: Math.min((acertos / 5) * 0.6, 0.6),
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): ParseCartaoPontoResultDominio | null {
    const warnings: string[] = [];
    const apuracoes: ApuracaoDominio[] = [];
    const competencias = new Map<string, number>();
    const linhas = doc.textoCompleto.split(/\r?\n/);

    for (const linha of linhas) {
      const md = linha.match(RE_DATA_BR);
      if (!md) continue;
      const dd = md[1].padStart(2, '0');
      const mm = md[2].padStart(2, '0');
      const yyyy = md[3];
      // Validação básica
      const m = parseInt(mm, 10);
      const d = parseInt(dd, 10);
      const y = parseInt(yyyy, 10);
      if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) continue;
      // Remove a data da linha pra não contaminar extração de horas
      const semData = linha.replace(RE_DATA_BR, ' ');
      const horas = extrairHoras(semData);
      const marcacoes = pares(horas);
      const diaSemanaMatch = linha.match(RE_DIA_SEMANA);
      const diaSemana = diaSemanaMatch ? diaSemanaMatch[1] : null;
      const ocorrencia = detectarOcorrencia(linha, marcacoes.length > 0);
      // Se não tem batida e nem ocorrência marcada, pula
      if (marcacoes.length === 0 && ocorrencia === 'NORMAL') continue;

      const dataIso = `${yyyy}-${mm}-${dd}`;
      apuracoes.push({
        data: dataIso,
        dia_semana: diaSemana,
        ocorrencia,
        marcacoes,
        eventos: [],
        observacao: null,
      });
      const k = `${mm}/${yyyy}`;
      competencias.set(k, (competencias.get(k) ?? 0) + 1);
    }

    if (apuracoes.length === 0) return null;

    // Dedup
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
