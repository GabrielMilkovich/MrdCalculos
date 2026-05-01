/**
 * Importer XML → PjcCalculoData (inverso de buildPjcXml).
 *
 * Útil para:
 *   - Round-trip test (Data → XML → Data invariância).
 *   - Edição: usuário cola um .pjc gerado, ajusta e re-baixa.
 *   - Validação: confirmar que estrutura externa é compatível.
 *
 * Implementação: parser regex/walker próprio. Não usamos lib externa porque:
 *   - O formato é rígido (gerado pelo nosso builder).
 *   - Trata "null" literal e ISO-8859-1 sem surpresa.
 *   - 1 dependência a menos.
 *
 * Limitação: este importer NÃO é genérico — assume estrutura produzida por
 * `buildPjcXml` (ordem dos elementos, nomes exatos). Para .pjc de origem
 * desconhecida, usar com cautela.
 */

import type {
  PjcCalculoData,
  PjcCartaoPonto,
  PjcFalta,
  PjcFerias,
  PjcGozo,
  PjcHistoricoSalarial,
  PjcMeta,
  PjcOcorrenciaHistorico,
} from "./builder";

// =====================================================
// Public API
// =====================================================

export function parsePjcXml(xml: string): PjcCalculoData {
  // Strip declaration
  const body = xml.replace(/^<\?xml[^?]*\?>/, "");
  const calculo = extractElement(body, "Calculo");
  if (!calculo) throw new Error("Elemento <Calculo> não encontrado.");

  const meta = parseMeta(calculo);
  const historicosSalariais = parseHistoricos(calculo);
  const ferias = parseFerias(calculo, meta.data_admissao);
  const faltas = parseFaltas(calculo);
  const cartoesDePonto = parseCartoes(calculo);

  return { meta, historicosSalariais, ferias, faltas, cartoesDePonto };
}

// =====================================================
// Section parsers
// =====================================================

function parseMeta(calculo: string): PjcMeta {
  return {
    nome_beneficiario: getText(calculo, "nomeDoBeneficiario") ?? "",
    cpf: getText(calculo, "cpfDoBeneficiario") ?? "",
    data_admissao: epochToIso(getText(calculo, "dataAdmissao")),
    data_demissao: epochToIsoOrNull(getText(calculo, "dataDemissao")),
    data_inicio_calculo: epochToIso(getText(calculo, "dataInicioCalculo")),
    data_termino_calculo: epochToIso(getText(calculo, "dataTerminoCalculo")),
    data_ajuizamento: epochToIsoOrNull(getText(calculo, "dataAjuizamento")),
    numero_processo: getText(calculo, "numeroDoProcesso") ?? "",
  };
}

function parseHistoricos(calculo: string): PjcHistoricoSalarial[] {
  const wrap = extractElement(calculo, "historicosSalariais");
  if (!wrap) return [];
  const set = extractElement(wrap, "Set");
  if (!set) return [];
  return extractAllElements(set, "HistoricoSalarial").map((hs) => ({
    nome: getText(hs, "nome") ?? "",
    incidenciaFGTS: getBool(hs, "incidenciaFGTS"),
    incidenciaINSS: getBool(hs, "incidenciaINSS"),
    aplicarProporcionalidadeFGTS: getBool(hs, "aplicarProporcionalidadeFGTS"),
    aplicarProporcionalidadeINSS: getBool(hs, "aplicarProporcionalidadeINSS"),
    ocorrencias: parseOcorrencias(hs),
  }));
}

function parseOcorrencias(hs: string): PjcOcorrenciaHistorico[] {
  const wrap = extractElement(hs, "ocorrencias");
  if (!wrap) return [];
  const list = extractElement(wrap, "List");
  if (!list) return [];
  return extractAllElements(list, "OcorrenciaDoHistoricoSalarial").map((oc) => ({
    competencia: epochToCompetencia(getText(oc, "dataOcorrencia")),
    valor: parseFloat(getText(oc, "valor") ?? "0") || 0,
    recolhidoFGTS: getBool(oc, "recolhidoFGTS"),
    recolhidoINSS: getBool(oc, "recolhidoINSS"),
  }));
}

function parseFerias(calculo: string, dataAdmissaoBase: string): PjcFerias[] {
  const wrap = extractElement(calculo, "listaDeFerias");
  if (!wrap) return [];
  const set = extractElement(wrap, "Set");
  if (!set) return [];
  return extractAllElements(set, "Ferias").map((f) => ({
    relativa: getText(f, "relativa") ?? "",
    prazo: parseInt(getText(f, "prazo") ?? "0", 10) || 0,
    situacao: (getText(f, "situacao") as PjcFerias["situacao"]) ?? "GOZADAS",
    dobraGeral: getBool(f, "dobraGeral"),
    abono: getBool(f, "abono"),
    diasAbono: parseInt(getText(f, "quantidadeDiasAbono") ?? "0", 10) || 0,
    gozo1: parseGozo(f, "1"),
    gozo2: parseGozo(f, "2"),
    gozo3: parseGozo(f, "3"),
    dataAdmissaoBase,
  }));
}

function parseGozo(f: string, idx: "1" | "2" | "3"): PjcGozo | null {
  const ini = getText(f, `dataInicialDoPeriodoDeGozo${idx}`);
  const fim = getText(f, `dataFinalDoPeriodoDeGozo${idx}`);
  if (!ini || ini === "null" || !fim || fim === "null") return null;
  return {
    inicio: epochToBR(ini),
    fim: epochToBR(fim),
    dobra: getBool(f, `dobraDoPeriodoDeGozo${idx}`),
  };
}

function parseFaltas(calculo: string): PjcFalta[] {
  const wrap = extractElement(calculo, "faltas");
  if (!wrap) return [];
  const set = extractElement(wrap, "Set");
  if (!set) return [];
  return extractAllElements(set, "Falta").map((f) => ({
    data_inicial: epochToIso(getText(f, "dataInicial")),
    data_final: epochToIso(getText(f, "dataFinal")),
    justificada: getBool(f, "justificada"),
    reiniciaPeriodoAquisitivo: getBool(f, "reiniciaPeriodoAquisitivo"),
    justificativa: nullableText(getText(f, "justificativa")),
  }));
}

function parseCartoes(calculo: string): PjcCartaoPonto[] {
  const cpWrap = extractElement(calculo, "cartoesDePonto");
  const apWrap = extractElement(calculo, "apuracoesDiariasCartaoDePonto");
  if (!cpWrap) return [];
  const cpSet = extractElement(cpWrap, "Set");
  if (!cpSet) return [];
  const cpItems = extractAllElements(cpSet, "CartaoDePonto");

  // Mapeia ID interno -> apurações do cartão
  const apuracoesPorCartao = new Map<string, PjcCartaoPonto["apuracoes"]>();
  if (apWrap) {
    const apSet = extractElement(apWrap, "Set");
    if (apSet) {
      for (const ap of extractAllElements(apSet, "ApuracaoDiariaCartao")) {
        const cartaoRefWrap = extractElement(ap, "cartaoDePonto");
        const cartaoRefInner = cartaoRefWrap
          ? extractElement(cartaoRefWrap, "CartaoDePonto")
          : null;
        const refId = cartaoRefInner ? getText(cartaoRefInner, "internalRef") : null;
        if (!refId) continue;
        const list = apuracoesPorCartao.get(refId) ?? [];
        list.push({
          data: epochToIso(getText(ap, "data")),
          ocorrencia:
            (getText(ap, "ocorrencia") as PjcCartaoPonto["apuracoes"][0]["ocorrencia"]) ??
            "NORMAL",
          marcacoes: parseJornada(ap),
        });
        apuracoesPorCartao.set(refId, list);
      }
    }
  }

  return cpItems.map((cp) => {
    const id = getText(cp, "id") ?? "";
    return {
      nome: getText(cp, "nome") ?? "",
      apuracoes: (apuracoesPorCartao.get(id) ?? []).sort((a, b) =>
        a.data.localeCompare(b.data),
      ),
    };
  });
}

function parseJornada(ap: string): PjcCartaoPonto["apuracoes"][0]["marcacoes"] {
  const wrap = extractElement(ap, "jornadaCumprida");
  if (!wrap) return [];
  const list = extractElement(wrap, "List");
  if (!list) return [];
  return extractAllElements(list, "Jornada").map((j) => ({
    e: getText(j, "inicio") ?? "",
    s: getText(j, "fim") ?? "",
  }));
}

// =====================================================
// XML helpers (regex-based; ok p/ formato controlado)
// =====================================================

/** Extrai o primeiro <tag>...</tag> ou <tag/> e devolve o INNER (sem as tags). */
function extractElement(xml: string, tag: string): string | null {
  // Self-closing: <tag/>
  const selfRe = new RegExp(`<${escapeTag(tag)}\\s*/>`);
  const selfMatch = xml.match(selfRe);
  if (selfMatch) return "";
  // Pair: <tag>...</tag> — cuidado com aninhamento de mesma tag
  const openRe = new RegExp(`<${escapeTag(tag)}>`, "g");
  const closeTag = `</${tag}>`;
  const openMatch = openRe.exec(xml);
  if (!openMatch) return null;
  const start = openMatch.index + openMatch[0].length;
  // Caminha contando pares de mesma tag
  let depth = 1;
  let i = start;
  const openLit = `<${tag}>`;
  while (i < xml.length && depth > 0) {
    const nextOpen = xml.indexOf(openLit, i);
    const nextClose = xml.indexOf(closeTag, i);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + openLit.length;
    } else {
      depth--;
      if (depth === 0) return xml.substring(start, nextClose);
      i = nextClose + closeTag.length;
    }
  }
  return null;
}

/** Extrai todos os <tag>...</tag> (irmãos no nível atual) e devolve cada inner. */
function extractAllElements(xml: string, tag: string): string[] {
  const out: string[] = [];
  let cursor = 0;
  while (cursor < xml.length) {
    const slice = xml.substring(cursor);
    const inner = extractElement(slice, tag);
    if (inner === null) break;
    // Avança cursor até depois do </tag> consumido
    const openLit = `<${tag}>`;
    const selfLit = `<${tag}/>`;
    const start = slice.indexOf(openLit);
    const startSelf = slice.indexOf(selfLit);
    if (
      startSelf !== -1 &&
      (start === -1 || startSelf < start)
    ) {
      cursor = cursor + startSelf + selfLit.length;
      out.push("");
      continue;
    }
    if (start === -1) break;
    // Encontra o </tag> correspondente respeitando aninhamento
    let depth = 1;
    let i = start + openLit.length;
    const closeLit = `</${tag}>`;
    while (i < slice.length && depth > 0) {
      const nextOpen = slice.indexOf(openLit, i);
      const nextClose = slice.indexOf(closeLit, i);
      if (nextClose === -1) return out;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + openLit.length;
      } else {
        depth--;
        if (depth === 0) {
          out.push(inner);
          cursor = cursor + nextClose + closeLit.length;
          break;
        }
        i = nextClose + closeLit.length;
      }
    }
    if (depth > 0) break;
  }
  return out;
}

/** Pega texto direto de um filho simples (não-aninhado). Retorna `null` se ausente. */
function getText(xml: string, tag: string): string | null {
  // Procura pares no nível "raso" (sem subir DOM). Funciona porque
  // os campos de texto que nos interessam não têm filhos.
  const re = new RegExp(`<${escapeTag(tag)}>([\\s\\S]*?)</${escapeTag(tag)}>`);
  const m = xml.match(re);
  if (!m) return null;
  return decodeXmlEntities(m[1]);
}

function getBool(xml: string, tag: string): boolean {
  return getText(xml, tag) === "true";
}

function nullableText(s: string | null): string | null {
  if (s === null || s === "null") return null;
  return s;
}

function escapeTag(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// =====================================================
// Conversores epoch ↔ data
// =====================================================

function epochToIso(s: string | null): string {
  if (!s || s === "null" || s === "0") return "";
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n === 0) return "";
  // Construímos a data em UTC a partir do epoch e devolvemos só yyyy-mm-dd.
  // Como o builder usa BRT 00:00 = UTC 03:00, em UTC o yyyy-mm-dd bate.
  const d = new Date(n);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function epochToIsoOrNull(s: string | null): string | null {
  if (!s || s === "null") return null;
  const iso = epochToIso(s);
  return iso === "" ? null : iso;
}

function epochToCompetencia(s: string | null): string {
  const iso = epochToIso(s);
  if (!iso) return "00/0000";
  const [y, m] = iso.split("-");
  return `${m}/${y}`;
}

function epochToBR(s: string | null): string {
  const iso = epochToIso(s);
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
