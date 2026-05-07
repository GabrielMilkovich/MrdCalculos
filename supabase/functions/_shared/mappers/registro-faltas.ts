/**
 * Mapper: Registro de Faltas (V6 — versão simplificada).
 *
 * Cobre os casos comuns. Quando o layout é exótico/ambíguo, retorna `null`
 * e o pipeline cai pro V5 (parser regex frontend completo).
 *
 * Casos cobertos:
 *   - Cabeçalho "Folha/Registro/Controle de Faltas" ou "Frequência"
 *   - Linhas com data única OU intervalo "DD/MM/AAAA a DD/MM/AAAA"
 *   - Heurística justificada: atestado/médico/CID/licença → true;
 *     injustificada/sem-justifica → false; default → false (segurança).
 *   - Marcador "reinicia período aquisitivo".
 *
 * Decisão jurídica: errar para "injustificada=false" em ambiguidade
 * (mesma do parser V5) — operador deve revisar.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { FaltaDominio } from '../tipos-dominio.ts';

const PARSER_VERSION = 'registro-faltas-mapper-v6.1-2026-05-07';

const RE_INTERVALO_DATA =
  /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\s*(?:a|at[ée]|-|–)\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/i;
const RE_DATA_UNICA = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/;
const RE_LINHA_FALTA =
  /\b(falt\w*|aus[êe]nc\w+|n[ãa]o\s*compareceu|atestado|licen[çc]a|afastamento|abon\w*)\b/i;
const RE_JUSTIFICATIVA =
  /\b(atestado|m[ée]dico|cid[\s:-]+[a-z]\d{2,3}|m[ée]d\.?\s|hospital|interna[çc][ãa]o|cirurgia|gestante|gala|nojo|doa[çc][ãa]o\s+(?:de\s+)?sangue|licen[çc]a\s+(?:m[ée]dica|gestante|paternidade|maternidade|p[ée]ssimo|nojo|gala)|consulta\s+(?:m[ée]dica|odontol[oó]gica|psicol[oó]gica|hospitalar))\b/i;
const RE_INJUSTIFICADA = /\b(injustifica\w*|sem\s+justifica\w*|n[ãa]o\s+justifica\w*)\b/i;
const RE_REINICIA = /\breinicia\s+(?:o\s+)?per[íi]odo\s+aquisitivo\b/i;

const MAX_JUSTIFICATIVA_LEN = 200;

function dataParts(d: string, m: string, y: string): string {
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseLinhaFalta(linha: string): FaltaDominio | null {
  const linhaTrim = linha.trim();
  if (linhaTrim.length === 0) return null;
  if (!RE_LINHA_FALTA.test(linhaTrim)) return null;

  let dataIni: string | null = null;
  let dataFim: string | null = null;

  const mInter = linhaTrim.match(RE_INTERVALO_DATA);
  if (mInter) {
    dataIni = dataParts(mInter[1], mInter[2], mInter[3]);
    dataFim = dataParts(mInter[4], mInter[5], mInter[6]);
  } else {
    const mUnica = linhaTrim.match(RE_DATA_UNICA);
    if (!mUnica) return null;
    dataIni = dataFim = dataParts(mUnica[1], mUnica[2], mUnica[3]);
  }

  // Justificada — regra conservadora.
  let justificada = false;
  if (RE_INJUSTIFICADA.test(linhaTrim)) {
    justificada = false;
  } else if (RE_JUSTIFICATIVA.test(linhaTrim)) {
    justificada = true;
  }

  const reiniciar = RE_REINICIA.test(linhaTrim);

  // Justificativa: trim + cap em 200 chars.
  let justificativa: string | null = null;
  // Tenta extrair texto após "atestado:", "motivo:", "justificativa:" etc.
  const mJustif = linhaTrim.match(/(?:atestado|motivo|justificativa|observa[çc][ãa]o)\s*:?\s*(.{3,200})/i);
  if (mJustif) {
    justificativa = mJustif[1].trim().slice(0, MAX_JUSTIFICATIVA_LEN);
  }

  return {
    data_inicio: dataIni,
    data_fim: dataFim,
    justificada,
    reiniciar_periodo_aquisitivo: reiniciar,
    justificativa,
  };
}

export const mapperRegistroFaltas: Mapper<FaltaDominio[]> = {
  slug: 'registro_faltas_v1',
  nome: 'Registro de Faltas (V6 simplificado)',
  tipoDocumento: 'registro_faltas',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (/(FOLHA|REGISTRO|CONTROLE)\s+DE\s+(FALTAS|FREQU[ÊE]NCIA|AUS[ÊE]NCIAS)/i.test(t)) {
      acertos += 2;
      motivos.push('cabeçalho de faltas');
    }
    if (/ATESTADO\s+M[ÉE]DICO/i.test(t)) {
      acertos++;
      motivos.push('atestado médico');
    }
    if (/CID[\s:-]+[A-Z]\d{2}/i.test(t)) {
      acertos++;
      motivos.push('código CID');
    }
    if (/AUS[ÊE]NCIA\s+(injustificada|justificada)/i.test(t)) {
      acertos++;
      motivos.push('ausência just./injust.');
    }
    return {
      aplica: acertos >= 2,
      score: Math.min(acertos / 5, 0.85),
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): FaltaDominio[] | null {
    const linhas = doc.textoCompleto.split(/\r?\n/);
    const faltas: FaltaDominio[] = [];
    const visto = new Set<string>(); // dedup por (data_inicio|data_fim)

    for (const linha of linhas) {
      const f = parseLinhaFalta(linha);
      if (!f) continue;
      const chave = `${f.data_inicio}|${f.data_fim}`;
      if (visto.has(chave)) continue;
      visto.add(chave);
      faltas.push(f);
    }

    if (faltas.length === 0) return null;
    return faltas;
  },
};

// Helper exportado para uso em mapperCtps (composto).
export function extrairFaltasDoTexto(texto: string): FaltaDominio[] | null {
  const fakeDoc = { textoCompleto: texto } as DocumentoTabular;
  return mapperRegistroFaltas.mapear(fakeDoc);
}

export { PARSER_VERSION as REGISTRO_FALTAS_VERSION };
