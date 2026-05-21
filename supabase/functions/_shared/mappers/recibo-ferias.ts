/**
 * Mapper: Recibo de Férias (V6 — versão simplificada).
 *
 * Cobre os casos comuns. Quando o layout é exótico/ambíguo, retorna `null`
 * e o pipeline cai pro V5 (parser regex frontend completo, ~600 linhas
 * com `splitInBlocks`, `computeGozosWithDobra`, etc.).
 *
 * Casos cobertos:
 *   - Bloco "Recibo de Férias" / "Aviso de Férias" / "Comunicado de Férias"
 *   - Período aquisitivo (relativa) "AAAA/AAAA"
 *   - 1 ou 2 períodos de gozo "DD/MM/AAAA a DD/MM/AAAA"
 *   - Prazo em dias (default 30 se ausente)
 *   - Abono pecuniário (booleano + dias_abono)
 *   - Situação: G (gozadas), GP (gozadas parcialmente), I (indenizadas),
 *     NG (não gozadas), P (perdidas)
 *
 * NÃO cobre (cai pro V5):
 *   - Múltiplos blocos de férias no mesmo doc (CTPS Digital lista N)
 *   - Detecção de "dobra" por proximidade textual
 *   - Casos com prazo > 30 ou < 0 (warnings)
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { FeriasDominio } from '../tipos-dominio.ts';

const PARSER_VERSION = 'recibo-ferias-mapper-v7-2026-05-20';

const RE_RELATIVA = /\b(19\d{2}|20\d{2})\s*\/\s*(19\d{2}|20\d{2})\b/;
const RE_GOZO =
  /\b(?:per[íi]odo\s+(?:de\s+)?gozo|gozo|gozadas?|f[ée]rias)\s*(?:de\s+|no\s+per[íi]odo\s+(?:de\s+)?)?(\d{2}\/\d{2}\/\d{4})\s*(?:a|at[ée]|-|–)\s*(\d{2}\/\d{2}\/\d{4})/gi;
const RE_PRAZO = /\b(\d{1,3})\s*(?:dias\s+de\s+f[ée]rias|dias?\s+\(?prazo)/i;
const RE_ABONO_DIAS =
  /\babono\s+(?:pecuni[áa]rio)?\s*(?:de\s+)?:?\s*(\d+)\s*dias?\b/i;
const RE_ABONO_BOOL = /\babono\s+pecuni[áa]rio\b/i;
const RE_INDENIZADAS = /\bindeniza(?:d[ao]s?|tivas?)\b/i;
const RE_NAO_GOZADAS = /\bn[ãa]o\s*gozadas?\b/i;
const RE_PERDIDAS = /\bperdidas?\b/i;
const RE_GOZADAS_PARC = /\bgozadas?\s*parcialmente\b/i;
const RE_DOBRA = /\b(?:em\s+dobra|em\s+dobro|dobrad[ao]|dobra\s+geral)\b/i;

function dataBRtoISO(dataBR: string): string {
  const [dd, mm, yyyy] = dataBR.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

function detectarSituacao(
  texto: string,
): 'G' | 'GP' | 'NG' | 'I' | 'P' {
  if (RE_PERDIDAS.test(texto)) return 'P';
  if (RE_INDENIZADAS.test(texto)) return 'I';
  if (RE_NAO_GOZADAS.test(texto)) return 'NG';
  if (RE_GOZADAS_PARC.test(texto)) return 'GP';
  return 'G'; // default: gozadas (caso mais comum)
}

export const mapperReciboFerias: Mapper<FeriasDominio[]> = {
  slug: 'recibo_ferias_v1',
  nome: 'Recibo de Férias (V6 simplificado)',
  tipoDocumento: 'recibo_ferias',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (/(RECIBO|AVISO|COMUNICADO|TERMO)\s+DE\s+F[ÉE]RIAS/i.test(t)) {
      acertos += 2;
      motivos.push('cabeçalho de férias');
    }
    if (/PER[ÍI]ODO\s+AQUISITIVO/i.test(t)) {
      acertos++;
      motivos.push('período aquisitivo');
    }
    if (/PER[ÍI]ODO\s+DE\s+GOZO/i.test(t)) {
      acertos++;
      motivos.push('período de gozo');
    }
    if (RE_ABONO_BOOL.test(t)) {
      acertos++;
      motivos.push('abono pecuniário');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min(acertos / 5, 0.85),
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): FeriasDominio[] | null {
    const texto = doc.textoCompleto;

    // Relativa (período aquisitivo).
    const mRel = texto.match(RE_RELATIVA);
    if (!mRel) return null;
    const relativa = `${mRel[1]}/${mRel[2]}`;

    // Gozos (até 3 períodos).
    const matchesGozo = [...texto.matchAll(RE_GOZO)];
    if (matchesGozo.length === 0) return null;

    const gozos = matchesGozo.slice(0, 3).map((m) => {
      // Janela ±60 chars pra detectar "em dobra" por proximidade.
      const idx = m.index ?? 0;
      const janelaIni = Math.max(0, idx - 60);
      const janelaFim = Math.min(texto.length, idx + (m[0]?.length ?? 0) + 60);
      const janela = texto.slice(janelaIni, janelaFim);
      return {
        inicio: dataBRtoISO(m[1]),
        fim: dataBRtoISO(m[2]),
        dobra: RE_DOBRA.test(janela),
      };
    });

    // Prazo (default 30).
    const mPrazo = texto.match(RE_PRAZO);
    let prazo = mPrazo ? parseInt(mPrazo[1], 10) : 30;
    if (!Number.isFinite(prazo) || prazo <= 0) prazo = 30;
    if (prazo > 60) prazo = 60; // cap defensivo

    // Abono.
    const abono = RE_ABONO_BOOL.test(texto);
    const mDias = texto.match(RE_ABONO_DIAS);
    const dias_abono = mDias ? parseInt(mDias[1], 10) : 0;

    // Situação.
    const situacao = detectarSituacao(texto);

    // Dobra geral (header level).
    const dobra_geral = RE_DOBRA.test(texto);

    return [{
      relativa,
      prazo,
      situacao,
      dobra_geral,
      abono,
      dias_abono: Number.isFinite(dias_abono) ? dias_abono : 0,
      gozo1: gozos[0] ?? null,
      gozo2: gozos[1] ?? null,
      gozo3: gozos[2] ?? null,
    }];
  },
};

// Helper exportado para uso em mapperCtps (composto).
export function extrairFeriasDoTexto(texto: string): FeriasDominio[] | null {
  const fakeDoc = { textoCompleto: texto } as DocumentoTabular;
  return mapperReciboFerias.mapear(fakeDoc);
}

// Re-exporta o version pra introspecção.
export { PARSER_VERSION as RECIBO_FERIAS_VERSION };
