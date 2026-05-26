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
import { detectarColunaDupla } from '../heuristicas/coluna-dupla.ts';
import { detectarAlertas as detectarAlertasFn } from '../heuristicas/alertas-apuracao.ts';
import type { TipoAlertaApuracao } from '../tipos-dominio.ts';

const PARSER_VERSION = 'cartao-ponto-generico-mapper-v7-2026-05-20';

const RE_DATA_BR = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/;
const RE_HORA_GLOBAL = /\b(\d{1,2}):(\d{2})\b/g;
const RE_DIA_SEMANA = /\b(Seg|Ter|Qua|Qui|Sex|S[áa]b|Dom)\.?\b/i;

// Filtros de metadado e rodapé jurídico — replicados do parser cliente
// (src/features/data-extraction/parsers/cartao-ponto/layouts/generico-v1.ts)
// para evitar que timestamps PJe (assinatura digital ICP-Brasil, protocolo,
// juntada de petição) vazem como batidas de jornada na Camada 3.
const RE_METADADO_LINHA =
  /\b(ADMISS[ÃA]O|DEMISS[ÃA]O|EMISS[ÃA]O|MATR[ÍI]CULA|PIS|CARGO|DEPARTAMENTO|JUNTAD[OA]\s+EM|JUNTAD[OA]\s+DE\s+PETI[ÇC][ÃA]O|ASSINAD[OA]\s+ELETRONICAMENTE|ASSINAD[OA]\s+DIGITALMENTE|SIGNAT[ÁA]RIO|N[ÚU]MERO\s+(?:do\s+)?PROCESSO|N[ÚU]MERO\s+(?:do\s+)?DOCUMENTO|DOCUMENTO\s+N[º°o.]|VALIDAD[EO]|RAZ[ÃA]O\s+SOCIAL|CNPJ|CEP|ENDERE[ÇC]O|LOCALIZA[ÇC][ÃA]O|Per[íi]odo\s+\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4}|APROVAD[OA]\b|HOMOLOGAD[OA]\b|REGISTRAD[OA]\s+ELETRONICAMENTE|VALIDAD[OA]\s+(?:PELO|POR|EM)|CONFIRMAD[OA]\s+(?:PELO|POR|EM)|CONFERID[OA]\s+(?:PELO|POR|EM)|PROTOCOLAD[OA]|PROTOCOLO\s+\d|LEI\s+11\.?\s*419|ICP[\s-]?BRASIL|CI[ÊE]NCIA\s+(?:DA\s+PARTE|EM)|INTIMA[ÇC][ÃA]O\s+ELETR[ÔO]NICA|EXPEDI[ÇC][ÃA]O\s+DE\s+MANDADO|MOVIMENTO\s+\d|HASH\s*[:-]|CERTIFICAD[OA]\s+DIGITAL)\b/i;
const RE_TIMESTAMP_APROVACAO =
  /\b(?:no\s+dia|em)\s+\d{1,2}\/\d{1,2}\/\d{4}\s+(?:[àa]s|as)\s+\d{1,2}:\d{2}\b/i;
const RE_TIMESTAMP_JURIDICO_CANONICO =
  /\b\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\b(?!.*\d{1,2}:\d{2}:\d{2})/;

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

    // Detecção de coluna dupla "Real vs Previsto" — quando ativa,
    // a 2ª coluna (4 horas previstas da escala) deve ser descartada
    // antes do pareamento.
    const linhasComData = linhas.filter((l) => RE_DATA_BR.test(l));
    const colunaDupla = detectarColunaDupla(
      doc.textoCompleto,
      linhasComData,
    ).detectado;

    for (const linha of linhas) {
      // Descarta linhas de metadado / rodapé jurídico antes de tentar extrair
      // batidas — timestamps de assinatura digital, protocolo PJe e juntada
      // de petição NÃO são jornada e corrompem apurações legítimas.
      if (
        RE_METADADO_LINHA.test(linha) ||
        RE_TIMESTAMP_APROVACAO.test(linha) ||
        RE_TIMESTAMP_JURIDICO_CANONICO.test(linha)
      ) {
        continue;
      }
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
      // Coluna dupla: trunca em 4 horas (1° grupo = batidas reais).
      const horasEfetivas = colunaDupla ? horas.slice(0, 4) : horas;
      const marcacoes = pares(horasEfetivas);
      const diaSemanaMatch = linha.match(RE_DIA_SEMANA);
      const diaSemana = diaSemanaMatch ? diaSemanaMatch[1] : null;
      const ocorrencia = detectarOcorrencia(linha, marcacoes.length > 0);
      // Se não tem batida e nem ocorrência marcada, pula
      if (marcacoes.length === 0 && ocorrencia === 'NORMAL') continue;

      const dataIso = `${yyyy}-${mm}-${dd}`;
      const apGen: ApuracaoDominio = {
        data: dataIso,
        dia_semana: diaSemana,
        ocorrencia,
        marcacoes,
        eventos: [],
        observacao: null,
      };
      const alertasGen = detectarAlertasFn(apGen.marcacoes, [linha]);
      if (alertasGen.length > 0) apGen.alertas = alertasGen;
      apuracoes.push(apGen);
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
      alertas_summary: (() => {
        let total = 0;
        const porTipo: Record<TipoAlertaApuracao, number> = { BATIDAS_IMPARES: 0, RELOGIO_QUEBRADO: 0 };
        for (const a of final) {
          if (!a.alertas || a.alertas.length === 0) continue;
          total++;
          for (const al of a.alertas) porTipo[al.tipo]++;
        }
        return total === 0 ? undefined : { total_apuracoes_com_alerta: total, por_tipo: porTipo };
      })(),
    };
  },
};
