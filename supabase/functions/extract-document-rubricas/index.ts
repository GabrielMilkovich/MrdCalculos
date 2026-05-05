// =====================================================
// extract-document-rubricas — DEPRECATED (v4 cleanup)
// =====================================================
// Esta Edge Function foi DESATIVADA na v4 (Maio/2026). Ela não é mais
// chamada por nenhum código do frontend.
//
// O modo "Extração de Dados" agora gera CSV/ZIP no próprio browser, lendo
// `documents.ocr_text` diretamente — ver
// `src/features/data-extraction/export/per-doc/`. Sem persistência
// estruturada em `rubricas_extraidas`/etc.
//
// Mantida no repositório por:
//   - histórico de schema/migrations (tabelas continuam existindo)
//   - eventual rollback / reaproveitamento
//
// Se você precisar editar isto: avalie se o consumo está realmente
// reativado no frontend antes de gastar tempo aqui.
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =====================================================
// Parser: Cartão de Ponto (inline, espelho de src/.../parsers/cartao-ponto.ts)
// =====================================================

const RE_DATA = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
const RE_HORA = /\b(\d{1,2}):(\d{2})\b/g;
const RE_OCORRENCIA =
  /\b(FALTA|FERIADO|FOLGA|F[ÉE]RIAS|ATESTADO|LICEN[ÇC]A\s*M[ÉE]DICA)\b/i;

function parseCartaoPontoEdge(ocrText: string, competenciaRef?: string) {
  if (!ocrText || ocrText.trim().length === 0) {
    return { apuracoes: [], competencia: competenciaRef ?? "", data_inicial: "", data_final: "" };
  }

  const lines = ocrText.split(/\r?\n/);
  const apuracoes: Array<{
    data: string;
    ocorrencia: string;
    marcacoes: Array<{ e: string; s: string }>;
  }> = [];
  const competenciaCount = new Map<string, number>();

  for (const line of lines) {
    const dateMatch = line.match(RE_DATA);
    if (!dateMatch) continue;
    const [, dd, mm, yyyy] = dateMatch;
    if (!isValidDate(yyyy, mm, dd)) continue;
    const data = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const competencia = `${mm.padStart(2, "0")}/${yyyy}`;
    competenciaCount.set(competencia, (competenciaCount.get(competencia) ?? 0) + 1);

    let ocorrencia = "NORMAL";
    const ocMatch = line.match(RE_OCORRENCIA);
    if (ocMatch) {
      const found = ocMatch[1].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (found.includes("FALTA")) ocorrencia = "FALTA";
      else if (found === "FERIADO") ocorrencia = "FERIADO";
      else if (found === "FOLGA") ocorrencia = "FOLGA";
      else if (found.includes("FERIAS")) ocorrencia = "FERIAS";
      else if (found === "ATESTADO") ocorrencia = "ATESTADO";
      else if (found.includes("LICENCA")) ocorrencia = "LICENCA_MEDICA";
    }

    const horarios: string[] = [];
    for (const m of line.matchAll(RE_HORA)) {
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        horarios.push(`${m[1].padStart(2, "0")}:${m[2]}`);
      }
    }
    const marcacoes: Array<{ e: string; s: string }> = [];
    let j = 0;
    while (j + 1 < horarios.length && marcacoes.length < 6) {
      marcacoes.push({ e: horarios[j], s: horarios[j + 1] });
      j += 2;
    }

    apuracoes.push({
      data,
      ocorrencia,
      marcacoes: ocorrencia === "NORMAL" ? marcacoes : [],
    });
  }

  // Pred. + filtra
  let competenciaPred = competenciaRef ?? "";
  if (!competenciaPred || !competenciaCount.has(competenciaPred)) {
    let max = 0;
    for (const [k, v] of competenciaCount) if (v > max) { competenciaPred = k; max = v; }
  }
  const filtered = apuracoes.filter((a) => {
    const m = a.data.slice(5, 7);
    const y = a.data.slice(0, 4);
    return `${m}/${y}` === competenciaPred;
  });
  const dedup = new Map<string, typeof filtered[number]>();
  for (const a of filtered) dedup.set(a.data, a);
  const final = [...dedup.values()].sort((a, b) => a.data.localeCompare(b.data));

  return {
    apuracoes: final,
    competencia: competenciaPred,
    data_inicial: final[0]?.data ?? "",
    data_final: final[final.length - 1]?.data ?? "",
  };
}

// =====================================================
// Parser: Férias (inline)
// =====================================================

const RE_RELATIVA_FERIAS = /\b(20\d{2})\s*\/\s*(20\d{2})\b/;
const RE_GOZO = /\bper[íi]odo\s+(?:de\s+)?gozo\s*:?\s*(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/gi;
const RE_ABONO_DIAS = /\babono\s+(?:pecuni[áa]rio)?\s*:?\s*(\d+)\s*dias?\b/i;
const RE_PRAZO_FERIAS = /\b(\d{1,3})\s*dias\s+de\s+f[ée]rias\b/i;
const RE_INDENIZADAS = /\bindenizad[ao]s?\b/i;
const RE_NAO_GOZADAS = /\bn[ãa]o\s*gozadas?\b/i;
const RE_PERDIDAS = /\bperdidas?\b/i;
const RE_BLOCO_FERIAS = /\b(recibo|aviso|comunicado|termo)\s+de\s+f[ée]rias\b/gi;

function parseFeriasEdge(ocrText: string) {
  if (!ocrText) return [];
  const blocos = splitFerias(ocrText);
  const ferias: Array<Record<string, unknown>> = [];

  for (const b of blocos) {
    const rel = b.match(RE_RELATIVA_FERIAS);
    if (!rel) continue;
    const relativa = `${rel[1]}/${rel[2]}`;
    const prazoM = b.match(RE_PRAZO_FERIAS);
    const prazo = prazoM ? parseInt(prazoM[1], 10) : 30;
    const gozos = [...b.matchAll(RE_GOZO)].slice(0, 3);
    const gozo1 = gozos[0] ? { inicio: gozos[0][1], fim: gozos[0][2], dobra: false } : null;
    const gozo2 = gozos[1] ? { inicio: gozos[1][1], fim: gozos[1][2], dobra: false } : null;
    const gozo3 = gozos[2] ? { inicio: gozos[2][1], fim: gozos[2][2], dobra: false } : null;

    let situacao = "NG";
    if (RE_INDENIZADAS.test(b)) situacao = "I";
    else if (RE_PERDIDAS.test(b)) situacao = "P";
    else if (gozo1) situacao = "G";
    else if (RE_NAO_GOZADAS.test(b)) situacao = "NG";

    const abonoM = b.match(RE_ABONO_DIAS);
    ferias.push({
      relativa,
      prazo,
      situacao,
      dobra_geral: false,
      abono: !!abonoM,
      dias_abono: abonoM ? parseInt(abonoM[1], 10) : 0,
      gozo1,
      gozo2,
      gozo3,
    });
  }
  return ferias;
}

function splitFerias(text: string): string[] {
  const matches = [...text.matchAll(RE_BLOCO_FERIAS)];
  if (matches.length === 0) return [text];
  const blocks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = matches[i + 1]?.index ?? text.length;
    blocks.push(text.slice(start, end));
  }
  return blocks;
}

// =====================================================
// Parser: Faltas (inline)
// =====================================================

const RE_INTERVALO_DATA =
  /\b(\d{2})\/(\d{2})\/(\d{4})\s*(?:a|até|-|–)\s*(\d{2})\/(\d{2})\/(\d{4})\b/i;
const RE_LINHA_FALTA = /\b(?:falta|aus[êe]ncia|n[ãa]o\s*compareceu)\b/i;
const RE_JUSTIFICATIVA = /\b(atestado|m[ée]dico|cid[\s:-]+[a-z]\d{2}|licen[çc]a)\b/i;
const RE_INJUSTIFICADA = /\b(injustificada|sem\s+justificativa|n[ãa]o\s+justificada)\b/i;
const RE_REINICIA = /\breinicia\s+(?:o\s+)?per[íi]odo\s+aquisitivo\b/i;

function parseFaltasEdge(ocrText: string) {
  if (!ocrText) return [];
  const lines = ocrText.split(/\r?\n/);
  const faltas: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    const isFalta = RE_LINHA_FALTA.test(line) || /\bfalt/i.test(line);
    let dataInicio: string | null = null;
    let dataFim: string | null = null;

    const intervaloM = line.match(RE_INTERVALO_DATA);
    if (intervaloM) {
      const [, dd1, mm1, yyyy1, dd2, mm2, yyyy2] = intervaloM;
      if (!isValidDate(yyyy1, mm1, dd1) || !isValidDate(yyyy2, mm2, dd2)) continue;
      dataInicio = `${yyyy1}-${mm1}-${dd1}`;
      dataFim = `${yyyy2}-${mm2}-${dd2}`;
    } else if (isFalta) {
      const dM = line.match(RE_DATA);
      if (!dM) continue;
      const [, dd, mm, yyyy] = dM;
      if (!isValidDate(yyyy, mm, dd)) continue;
      dataInicio = `${yyyy}-${mm}-${dd}`;
      dataFim = dataInicio;
    } else continue;

    if (!dataInicio || !dataFim) continue;
    let justificada = false;
    if (RE_INJUSTIFICADA.test(line)) justificada = false;
    else if (RE_JUSTIFICATIVA.test(line)) justificada = true;

    faltas.push({
      data_inicio: dataInicio,
      data_fim: dataFim,
      justificada,
      reiniciar_periodo_aquisitivo: RE_REINICIA.test(line),
      justificativa: RE_JUSTIFICATIVA.test(line) ? line.slice(0, 200) : null,
      incluir: true,
    });
  }
  // Dedup
  const dedup = new Map<string, typeof faltas[number]>();
  for (const f of faltas) dedup.set(`${f.data_inicio}|${f.data_fim}`, f);
  return [...dedup.values()].sort((a, b) =>
    String(a.data_inicio).localeCompare(String(b.data_inicio)),
  );
}

// =====================================================
// Parser: Holerite genérico (inline)
// =====================================================

const RE_REFERENCIA_NUM = /\bREFER[ÊE]NCIA\b[^\n]*?\b(\d{2})\s*\/\s*(\d{4})\b/i;
const RE_REFERENCIA_MMM =
  /\bREFER[ÊE]NCIA\b[^\n]*?\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*\/\s*(\d{4})\b/i;
const RE_COMP_INLINE = /\b(\d{2})\/(\d{4})\b/;
const RE_VALOR_BR = /\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/g;
const RE_LINHA_RUBRICA_COD =
  /^(\d{3,5})\s+([\p{L}][\p{L}\s\.\-\(\)\/%]*?)\s+(\d[\d\s.,]*)$/u;

const MESES_PT: Record<string, string> = {
  JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06",
  JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12",
};

function parseHoleriteEdge(ocrText: string) {
  const lines = ocrText.split(/\r?\n/);
  let competencia = "00/0000";

  const m1 = ocrText.match(RE_REFERENCIA_NUM);
  if (m1) competencia = `${m1[1].padStart(2, "0")}/${m1[2]}`;
  else {
    const m2 = ocrText.match(RE_REFERENCIA_MMM);
    if (m2) {
      const mes = MESES_PT[m2[1].toUpperCase()];
      if (mes) competencia = `${mes}/${m2[2]}`;
    } else {
      const m3 = ocrText.slice(0, 800).match(RE_COMP_INLINE);
      if (m3) {
        const mes = parseInt(m3[1], 10);
        if (mes >= 1 && mes <= 12) competencia = `${m3[1].padStart(2, "0")}/${m3[2]}`;
      }
    }
  }

  const rubricas: Array<{
    codigo: string | null;
    nome: string;
    valor_vencimento: number | null;
    valor_desconto: number | null;
    quantidade: number | null;
    ordem: number;
  }> = [];

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (line.length < 5) continue;
    const valores = [...line.matchAll(RE_VALOR_BR)].map((m) => parseBR(m[1]));
    if (valores.length === 0) continue;

    const matchCod = line.match(RE_LINHA_RUBRICA_COD);
    if (matchCod) {
      const [, codigo, nome] = matchCod;
      rubricas.push({
        codigo,
        nome: nome.trim(),
        quantidade: null,
        valor_vencimento: valores[0] ?? null,
        valor_desconto: valores[1] ?? null,
        ordem: rubricas.length,
      });
    }
  }

  return { competencia, rubricas, layout_usado: "generico_v1" };
}

function parseBR(s: string): number {
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// Hint heuristics (inline — espelho de src/.../classification/hints.ts)
// =====================================================

const HINTS_DSR: RegExp[] = [
  /\bdsr\s*\(?\s*comissoes?\s*\)?/i,
  /\bint\.?\s*premio\s+no\s+dsr\b/i,
  /\bdsr\b(?!.*\b(?:h\.?\s*ext|horas?\s*ext|hora\s*ext|hr\s*ext))/i,
];
const HINTS_IGNORAR: RegExp[] = [
  /\b(horas?\s*ext\w*|h\.?\s*ext\w*|hr\s*ext\w*)\b/i,
  /\b(inss|irrf|irpf|imposto\s+de\s+renda)\b/i,
  /\b(vale\s*transporte|vt)\b/i,
  /\b(vale\s*alimentacao|va|vale\s*refeicao|vr|cesta\s*basica)\b/i,
  /\b(adiant\w*|emprestimo|prestacao\s+(de\s+)?carne)\b/i,
  /\b(intermedica|unimed|amil|hapvida|bradesco\s*saude|seguro\s*saude|plano\s*de\s*saude|segvida|multich)\b/i,
  /\b(contrib\w*\s*(sindical|confederativa|associativa)|mensalidade\s*sindical)\b/i,
  /\bdesp\w*\s*(med|hosp)|\bdesp\.?med\b/i,
];
const HINTS_COMISSAO: RegExp[] = [
  /\bcomissoes?\b/i,
  /\bcom\.?\s*(garantia|seguros?|vendas?)\b/i,
  /\bcompl\.?\s*vendedor\b/i,
];
const HINTS_PREMIACAO: RegExp[] = [
  /\bpremio\b/i,
  /\bcampanha\b/i,
  /\bbonificacao\b/i,
];

function getHintCategoria(nome: string): "dsr" | "comissao" | "premiacao" | "ignorar" | null {
  const n = normalize(nome);
  for (const r of HINTS_DSR) if (r.test(n)) return "dsr";
  for (const r of HINTS_IGNORAR) if (r.test(n)) return "ignorar";
  for (const r of HINTS_COMISSAO) if (r.test(n)) return "comissao";
  for (const r of HINTS_PREMIACAO) if (r.test(n)) return "premiacao";
  return null;
}

// =====================================================
// Handler
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { document_id, tipo_extracao, origem = "manual" } = body as {
      document_id?: string;
      tipo_extracao?: string;
      origem?: "manual" | "auto";
    };

    if (!document_id || !tipo_extracao) {
      return jsonResponse({ ok: false, error: "document_id e tipo_extracao obrigatórios" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ ok: false, error: "Sem authorization" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ ok: false, error: "Token inválido" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: doc, error: docErr } = await admin
      .from("documents")
      .select("id, case_id, ocr_text, file_name, competencia_referencia")
      .eq("id", document_id)
      .single();
    if (docErr || !doc) return jsonResponse({ ok: false, error: "Documento não encontrado" }, 404);

    const { data: caseRow } = await admin
      .from("cases")
      .select("id, criado_por")
      .eq("id", doc.case_id)
      .single();
    if (!caseRow || caseRow.criado_por !== userData.user.id) {
      return jsonResponse({ ok: false, error: "Sem permissão" }, 403);
    }

    if (!doc.ocr_text || doc.ocr_text.trim().length === 0) {
      await admin
        .from("documents")
        .update({ extracao_status: "failed", extracao_error: "OCR ainda não disponível" })
        .eq("id", document_id);
      return jsonResponse({ ok: false, error: "OCR não disponível" }, 400);
    }

    await admin
      .from("documents")
      .update({ extracao_status: "running", extracao_error: null })
      .eq("id", document_id);

    let count = 0;
    let layout: string | null = null;
    let competencia: string | null = null;

    try {
      switch (tipo_extracao) {
        case "holerite": {
          const r = parseHoleriteEdge(doc.ocr_text);
          layout = r.layout_usado;
          competencia = r.competencia;

          // DELETE rubricas anteriores (re-extração)
          await admin.from("rubricas_extraidas").delete().eq("document_id", document_id);

          // Carrega memos + categorias
          const { data: memos } = await admin
            .from("classificacoes_rubrica_memo")
            .select("codigo, nome_normalizado, categoria_id")
            .eq("case_id", doc.case_id);
          const memoMap = new Map<string, string>();
          for (const m of (memos ?? []) as Array<{ codigo: string | null; nome_normalizado: string; categoria_id: string }>) {
            memoMap.set(`${m.codigo ?? ""}::${m.nome_normalizado}`, m.categoria_id);
          }
          const { data: cats } = await admin
            .from("categorias_rubrica")
            .select("id, slug");
          const slugToId = new Map<string, string>();
          for (const c of (cats ?? []) as Array<{ id: string; slug: string }>) {
            slugToId.set(c.slug, c.id);
          }

          // Insere com classificação automática (memo > hint)
          const rows = r.rubricas.map((rub, idx) => {
            const valor = rub.valor_vencimento ?? rub.valor_desconto ?? 0;
            const nome_normalizado = normalize(rub.nome);
            const memoCat = memoMap.get(`${rub.codigo ?? ""}::${nome_normalizado}`);
            let categoria_id: string | null = null;
            let classificacao_origem: "none" | "memo" | "hint" | "manual" = "none";

            if (memoCat) {
              categoria_id = memoCat;
              classificacao_origem = "memo";
            } else {
              const hint = getHintCategoria(rub.nome);
              if (hint && hint !== "ignorar") {
                const id = slugToId.get(hint);
                if (id) {
                  categoria_id = id;
                  classificacao_origem = "hint";
                }
              } else if (hint === "ignorar") {
                classificacao_origem = "hint";
              }
            }

            return {
              document_id,
              case_id: doc.case_id,
              competencia: r.competencia,
              codigo: rub.codigo,
              nome: rub.nome,
              nome_normalizado,
              valor: Math.abs(valor),
              quantidade: rub.quantidade,
              desconto: rub.valor_desconto,
              categoria_id,
              classificacao_origem,
              origem: "ocr_ai" as const,
              ordem_no_documento: idx,
            };
          });

          if (rows.length > 0) {
            const { error: insErr } = await admin.from("rubricas_extraidas").insert(rows);
            if (insErr) throw new Error(`Erro insert rubricas: ${insErr.message}`);
          }
          count = rows.length;
          break;
        }

        case "recibo_ferias": {
          await admin.from("ferias_extraidas").delete().eq("document_id", document_id);
          const ferias = parseFeriasEdge(doc.ocr_text);
          if (ferias.length > 0) {
            const rows = ferias.map((f) => ({
              document_id,
              case_id: doc.case_id,
              ...f,
              incluir: true,
            }));
            const { error: insErr } = await admin.from("ferias_extraidas").insert(rows);
            if (insErr) throw new Error(`Erro insert ferias: ${insErr.message}`);
          }
          count = ferias.length;
          break;
        }

        case "registro_faltas": {
          await admin.from("faltas_extraidas").delete().eq("document_id", document_id);
          const faltas = parseFaltasEdge(doc.ocr_text);
          if (faltas.length > 0) {
            const rows = faltas.map((f) => ({
              document_id,
              case_id: doc.case_id,
              ...f,
            }));
            const { error: insErr } = await admin.from("faltas_extraidas").insert(rows);
            if (insErr) throw new Error(`Erro insert faltas: ${insErr.message}`);
          }
          count = faltas.length;
          break;
        }

        case "cartao_ponto": {
          // DELETE cartão anterior (re-extração)
          const { data: existingCartao } = await admin
            .from("cartoes_ponto_extraidos")
            .select("id")
            .eq("document_id", document_id)
            .maybeSingle();
          if (existingCartao) {
            await admin.from("cartoes_ponto_extraidos").delete().eq("id", existingCartao.id);
            // apurações são removidas via FK ON DELETE CASCADE
          }

          const r = parseCartaoPontoEdge(doc.ocr_text, doc.competencia_referencia ?? undefined);
          competencia = r.competencia;

          if (r.apuracoes.length > 0) {
            const { data: cartao, error: cErr } = await admin
              .from("cartoes_ponto_extraidos")
              .insert({
                document_id,
                case_id: doc.case_id,
                competencia: r.competencia,
                data_inicial: r.data_inicial || null,
                data_final: r.data_final || null,
              })
              .select("id")
              .single();
            if (cErr || !cartao) throw new Error(`Erro insert cartão: ${cErr?.message}`);

            const rows = r.apuracoes.map((a) => ({
              cartao_ponto_id: cartao.id,
              case_id: doc.case_id,
              data: a.data,
              ocorrencia: a.ocorrencia,
              marcacoes: a.marcacoes,
              observacao: null,
            }));
            const { error: aErr } = await admin
              .from("apuracoes_diarias_extraidas")
              .insert(rows);
            if (aErr) throw new Error(`Erro insert apurações: ${aErr.message}`);
            count = rows.length;
          }
          break;
        }

        case "ctps": {
          // CTPS — Carteira de Trabalho. O MESMO OCR alimenta os 2 parsers
          // (férias + faltas). Cada um insere na sua tabela. count = soma.
          await admin.from("ferias_extraidas").delete().eq("document_id", document_id);
          await admin.from("faltas_extraidas").delete().eq("document_id", document_id);

          const ferias = parseFeriasEdge(doc.ocr_text);
          const faltas = parseFaltasEdge(doc.ocr_text);

          if (ferias.length > 0) {
            const rows = ferias.map((f) => ({
              document_id,
              case_id: doc.case_id,
              ...f,
              incluir: true,
            }));
            const { error: insErr } = await admin
              .from("ferias_extraidas")
              .insert(rows);
            if (insErr) throw new Error(`Erro insert ferias (CTPS): ${insErr.message}`);
          }
          if (faltas.length > 0) {
            const rows = faltas.map((f) => ({
              document_id,
              case_id: doc.case_id,
              ...f,
            }));
            const { error: insErr } = await admin
              .from("faltas_extraidas")
              .insert(rows);
            if (insErr) throw new Error(`Erro insert faltas (CTPS): ${insErr.message}`);
          }
          count = ferias.length + faltas.length;
          break;
        }

        default:
          return jsonResponse({ ok: false, error: `tipo_extracao inválido: ${tipo_extracao}` }, 400);
      }

      // Sucesso
      const updatePayload: Record<string, unknown> = {
        extracao_status: "done",
        extracao_origem: origem,
        layout_usado: layout,
      };
      if (competencia) updatePayload.competencia_referencia = competencia;
      await admin.from("documents").update(updatePayload).eq("id", document_id);

      return jsonResponse({
        ok: true,
        count,
        layout,
        competencia,
      });
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`[extract-rubricas] parse falhou:`, parseErr);
      await admin
        .from("documents")
        .update({
          extracao_status: "failed",
          extracao_error: msg.slice(0, 500),
        })
        .eq("id", document_id);
      return jsonResponse({ ok: false, error: msg }, 500);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
