// =====================================================
// EDGE FUNCTION: extract-document-data
// =====================================================
// Recebe documento_id + categoria, lê documents.ocr_text, chama OpenAI
// gpt-4o-mini com prompt da categoria, parseia JSON estruturado,
// persiste em document_extracted_data (UPSERT por document_id).
//
// Ownership: valida que o caller (JWT) é dono do `cases.criado_por`
// associado ao documento. Sem fallback service_role.
//
// Errors:
//   400 — body inválido / categoria desconhecida
//   401 — sem JWT ou JWT inválido (verify_jwt do gateway)
//   403 — usuário não dono do caso
//   404 — documento não encontrado / sem ocr_text
//   500 — falha LLM ou JSON parse
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_TEMPERATURE = 0.1;
const MAX_OCR_LEN = 60_000;

type Category = "historico_salarial" | "ferias" | "faltas";

const HISTORICO_SALARIAL_SYSTEM = `Você extrai dados de holerites/contracheques brasileiros para um sistema de cálculo trabalhista.
Retorne EXCLUSIVAMENTE um JSON válido (array de objetos), sem markdown, sem comentário, sem prefixo.

Schema:
[{"competencia": "MM/yyyy", "valor": <number>, "incideFgts": <bool>, "fgtsRecolhido": <bool>, "incideInss": <bool>, "inssRecolhido": <bool>}]

Regras:
- Uma linha por competência (mês/ano de referência da folha).
- "valor" = salário BRUTO (vencimentos totais antes dos descontos), em decimal com ponto (ex: 3500.50).
- Defaults para flags quando não há evidência contrária: incideFgts=true, fgtsRecolhido=true, incideInss=true, inssRecolhido=true.
- Marque flag como false APENAS se o documento explicitamente indicar não-incidência ou não-recolhimento.
- Se não conseguir identificar a competência ou o valor, OMITA a linha.
- Se o documento não for um holerite/ficha financeira, retorne [].`;

const FERIAS_SYSTEM = `Você extrai dados de períodos de férias de documentos trabalhistas brasileiros.
Retorne EXCLUSIVAMENTE um JSON válido (array de objetos), sem markdown.

Schema:
[{
  "relativa": "<aaaa/aaaa>",
  "prazo": <number>,
  "situacao": "<G|GP|NG|I|P>",
  "dobraGeral": <bool>,
  "abono": <bool>,
  "diasAbono": <number>,
  "gozo1": {"inicio":"dd/MM/yyyy","fim":"dd/MM/yyyy","dobra":<bool>} | null,
  "gozo2": {...} | null,
  "gozo3": {...} | null
}]

Regras:
- "relativa" = período aquisitivo (ex: "2022/2023" ou "2023/2024").
- "situacao": G=Gozadas, GP=Gozadas Parcialmente, NG=Não Gozadas, I=Indenizadas, P=Perdidas.
- "prazo" = dias do período de férias (geralmente 30).
- Se houver abono pecuniário, abono=true, diasAbono>0.
- Períodos de gozo são opcionais; até 3 períodos por relativa.
- Datas SEMPRE em dd/MM/yyyy.
- Se não conseguir identificar a relativa, OMITA a linha.
- Se o documento não menciona férias, retorne [].`;

const FALTAS_SYSTEM = `Você extrai registros de faltas (ausências) de documentos trabalhistas brasileiros.
Retorne EXCLUSIVAMENTE um JSON válido (array de objetos), sem markdown.

Schema:
[{
  "dataInicio": "dd/MM/yyyy",
  "dataFim": "dd/MM/yyyy",
  "justificada": <bool>,
  "reiniciarPeriodoAquisitivo": <bool>,
  "justificativa": "<string opcional>"
}]

Regras:
- Cada linha = um período de falta (pode ser 1 dia: dataInicio == dataFim).
- justificada=true se há atestado/declaração; false se ausência injustificada.
- reiniciarPeriodoAquisitivo: true APENAS se o documento explicitamente indicar reinício do período aquisitivo de férias por excesso de faltas.
- justificativa: texto curto (max 200 chars). NÃO USE ponto-e-vírgula, quebra de linha ou aspas.
- Se não houver datas claras, OMITA a linha.
- Se o documento não menciona faltas, retorne [].`;

function systemPromptFor(category: Category): string {
  switch (category) {
    case "historico_salarial": return HISTORICO_SALARIAL_SYSTEM;
    case "ferias": return FERIAS_SYSTEM;
    case "faltas": return FALTAS_SYSTEM;
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Tenta extrair JSON da resposta do LLM. Aceita formato puro
 * (`[...]`) ou markdown wrapping (```json\n[...]\n```).
 */
function parseLlmJson(raw: string): unknown {
  let cleaned = raw.trim();
  // Remove markdown code fence se houver.
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  // Algumas vezes LLM adiciona "Aqui está o JSON:" antes do array.
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart > 0 && arrayEnd > arrayStart) {
    cleaned = cleaned.slice(arrayStart, arrayEnd + 1);
  }
  return JSON.parse(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ===== 1. Validate body =====
    const body = await req.json().catch(() => ({}));
    const document_id = body?.document_id as string | undefined;
    const category = body?.category as Category | undefined;

    if (!document_id || typeof document_id !== "string") {
      return jsonResponse(400, { error: "document_id é obrigatório" });
    }
    if (!category || !["historico_salarial", "ferias", "faltas"].includes(category)) {
      return jsonResponse(400, { error: "category inválida (use historico_salarial|ferias|faltas)" });
    }

    // ===== 2. Auth + ownership =====
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return jsonResponse(500, { error: "OPENAI_API_KEY não configurada no ambiente" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(401, { error: "Authorization header ausente" });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResponse(401, { error: "JWT inválido" });

    // ===== 3. Buscar documento + ocr_text + dono via service_role (RLS-safe) =====
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: doc, error: docErr } = await adminClient
      .from("documents")
      .select("id, file_name, ocr_text, status, case_id, cases:case_id ( criado_por )")
      .eq("id", document_id)
      .maybeSingle();

    if (docErr) return jsonResponse(500, { error: `Erro buscando documento: ${docErr.message}` });
    if (!doc) return jsonResponse(404, { error: "Documento não encontrado" });

    // Ownership check
    const ownerId = (doc.cases as { criado_por?: string } | null)?.criado_por;
    if (!ownerId || ownerId !== user.id) {
      return jsonResponse(403, { error: "Sem permissão para este documento" });
    }

    if (!doc.ocr_text || typeof doc.ocr_text !== "string" || doc.ocr_text.trim().length < 10) {
      return jsonResponse(404, { error: "Documento sem texto OCR. Aguarde OCR concluir." });
    }

    // ===== 4. Marcar extraction_status=running =====
    await adminClient
      .from("document_extracted_data")
      .upsert({
        document_id,
        category,
        rows: [],
        validation_status: "pending",
        extraction_status: "running",
        extraction_error: null,
      }, { onConflict: "document_id" });

    // ===== 5. Chamar OpenAI =====
    const ocrText = doc.ocr_text.length > MAX_OCR_LEN
      ? doc.ocr_text.slice(0, MAX_OCR_LEN) + "\n[...TRUNCADO]"
      : doc.ocr_text;

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: OPENAI_TEMPERATURE,
        messages: [
          { role: "system", content: systemPromptFor(category) },
          { role: "user", content: `Extraia os dados do seguinte texto OCR:\n\n<<<TEXT>>>\n${ocrText}\n<<<END>>>` },
        ],
        response_format: { type: "json_object" }, // força JSON, mas LLM ainda pode retornar { items: [...] }
      }),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      const errMsg = `OpenAI ${openaiResp.status}: ${errText.slice(0, 500)}`;
      await adminClient.from("document_extracted_data").update({
        extraction_status: "failed",
        extraction_error: errMsg,
      }).eq("document_id", document_id);
      return jsonResponse(500, { error: errMsg });
    }

    const openaiData = await openaiResp.json();
    const rawContent = openaiData?.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = parseLlmJson(rawContent);
      // Se response_format=json_object devolveu { items: [...] }, desempacota.
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        const arrayKey = Object.keys(obj).find(k => Array.isArray(obj[k]));
        if (arrayKey) parsed = obj[arrayKey];
      }
      if (!Array.isArray(parsed)) {
        throw new Error("Resposta LLM não é array nem objeto com array");
      }
    } catch (parseErr) {
      const errMsg = `JSON parse falhou: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}. Conteúdo: ${rawContent.slice(0, 300)}`;
      await adminClient.from("document_extracted_data").update({
        extraction_status: "failed",
        extraction_error: errMsg,
      }).eq("document_id", document_id);
      return jsonResponse(500, { error: errMsg });
    }

    // ===== 6. Anexar _source em cada linha (rastreabilidade no merge) =====
    const rowsWithSource = (parsed as Record<string, unknown>[]).map((r) => ({
      ...r,
      _source: {
        documentId: document_id,
        documentName: doc.file_name ?? "documento",
      },
    }));

    // ===== 7. Persistir =====
    const { error: updateErr } = await adminClient
      .from("document_extracted_data")
      .update({
        rows: rowsWithSource,
        extraction_status: "success",
        extraction_error: null,
      })
      .eq("document_id", document_id);

    if (updateErr) {
      return jsonResponse(500, { error: `Erro persistindo: ${updateErr.message}` });
    }

    return jsonResponse(200, {
      ok: true,
      document_id,
      category,
      rows_extracted: rowsWithSource.length,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { error: `Erro interno: ${msg}` });
  }
});
