// =====================================================
// EDGE FUNCTION: VERIFY-EXTRACTION-AI (F2 — anti-alucinação)
// =====================================================
// Análise IA de uma extração quando score está em 50–85 (faixa
// "média/topo da baixa" — alta tem score >= 90 e dispensa IA, baixa <50
// requer revisão manual obrigatória).
//
// CONTRATO ANTI-ALUCINAÇÃO (jurídico-grave):
//   1. **Substring literal**: TODO valor sugerido pela IA (texto, número
//      formatado BR, data) DEVE existir LITERALMENTE no `ocr_text`. Caso
//      contrário, é descartado e listado em `discarded_hallucinations`.
//      Não aceita "interpretação" — se o operador não consegue achar o
//      valor no documento original com Ctrl+F, IA inventou.
//   2. **Structured output strict**: response_format=json_schema strict=true.
//      Schema permite só campos pré-definidos por builder; qualquer
//      desvio (campo extra, tipo errado, valor null indevido) gera erro
//      400 antes mesmo do fetch retornar.
//   3. **Score 0..100**: a IA explicita seu próprio nível de confiança.
//      O operador vê o score na UI e decide aplicar.
//   4. **Timeout 30s** via AbortController. Operador pode pular a análise
//      se demorar.
//
// Body:
//   {
//     document_id: string,
//     builder: 'holerite' | 'cartao_ponto' | 'ferias' | 'faltas' | 'ctps',
//     parsed: object,        // estrutura atual (rubricas, apuracoes, etc.)
//     ocr_text: string,      // texto cru extraído (V6 ou V5)
//     score: number,         // 0..100; só processa se 50<=score<=85
//   }
//
// Response success:
//   {
//     suggestions: Array<{ field: string; current: any; suggested: any; reason: string }>,
//     discarded_hallucinations: Array<{ field: string; suggested: string; reason: string }>,
//     ai_confidence: number, // 0..100
//     model: string,
//     duration_ms: number,
//   }
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TIMEOUT_MS = 30_000;
const SCORE_MIN = 50;
const SCORE_MAX = 85;
const MODEL = "gpt-5";

type Builder = "holerite" | "cartao_ponto" | "ferias" | "faltas" | "ctps";
const BUILDERS_VALIDOS: Builder[] = [
  "holerite",
  "cartao_ponto",
  "ferias",
  "faltas",
  "ctps",
];

const SYSTEM_PROMPT =
  `Você é assistente de revisão de extração de documentos trabalhistas brasileiros (holerites, cartões de ponto, recibos de férias, registros de faltas, CTPS). Seu trabalho é VERIFICAR se a estrutura extraída por um parser determinístico bate com o texto OCR original e SUGERIR ajustes pontuais.

REGRAS RÍGIDAS — NÃO QUEBRE NENHUMA:

1. **NUNCA invente valores.** Todo valor sugerido (número, data, texto) DEVE estar LITERALMENTE no OCR. Se você não consegue ver o valor exato no OCR, NÃO o sugira. Se a estrutura está faltando algo mas você não acha no OCR, deixe como está e mencione em "reason".

2. **Sugestões cirúrgicas.** Não reescreva a estrutura inteira. Sugira só os campos onde tem CERTEZA que houve erro de parsing — campo errado, valor cortado, dia trocado.

3. **Formato BR.** Valores monetários: vírgula decimal e ponto milhar (ex: "1.234,56"). Datas: DD/MM/AAAA. Competência: MM/AAAA.

4. **Não classifique rubricas.** Categorização (Salário Fixo / Comissões / etc.) é responsabilidade do operador — você só verifica DADOS, não SEMÂNTICA.

5. **Confidence honesto.** Se você está certo de quase tudo, score alto (80-100). Se há ambiguidade ou o OCR está borrado, score baixo (20-50). Se você não tem nada útil pra sugerir, retorne suggestions=[] com confidence baseado em quão bem a extração existente bate com o OCR.

6. **Anti-alucinação self-check.** Antes de incluir uma sugestão, pergunte-se: "Eu consigo APONTAR para esse valor exato no OCR?" Se não, descarte.

Responda APENAS no schema JSON definido. Nada mais.`;

interface Suggestion {
  field: string;
  current: unknown;
  suggested: unknown;
  reason: string;
}

interface DiscardedHallucination {
  field: string;
  suggested: string;
  reason: string;
}

/**
 * Schema JSON strict para response_format. OpenAI valida ANTES de mandar.
 *
 * Os tipos `current` e `suggested` aceitam string|number|null pra cobrir
 * os 3 casos comuns: texto, valor monetário (sempre formatado como string
 * "1.234,56" pra não perder precisão), null (campo ausente).
 */
const RESPONSE_SCHEMA = {
  name: "VerifyExtractionResult",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["suggestions", "ai_confidence", "summary"],
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["field", "current", "suggested", "reason"],
          properties: {
            field: { type: "string" },
            current: { type: ["string", "number", "null"] },
            suggested: { type: ["string", "number", "null"] },
            reason: { type: "string" },
          },
        },
      },
      ai_confidence: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      summary: { type: "string" },
    },
  },
} as const;

/**
 * Anti-alucinação: confere se `valor` aparece literalmente no OCR.
 * Usa busca case-insensitive + tolerância pra espaços/quebras.
 */
function valorAparecemNoOcr(valor: unknown, ocr: string): boolean {
  if (valor === null || valor === undefined) return true; // null = remover, sempre OK
  const s = String(valor).trim();
  if (s === "") return true;
  // Normaliza ocr e valor: lowercase, espaços colapsados.
  const norm = (x: string) => x.toLowerCase().replace(/\s+/g, " ");
  const ocrN = norm(ocr);
  const vN = norm(s);
  if (ocrN.includes(vN)) return true;
  // Caso valor é número formatado BR ("1.234,56"), tenta variações comuns
  // que o OCR pode trazer ("1234,56", "R$ 1.234,56", "R$1.234,56").
  if (/^-?\d{1,3}(\.\d{3})*,\d{2}$/.test(s)) {
    const semMilhar = s.replace(/\./g, "");
    if (ocrN.includes(norm(semMilhar))) return true;
    if (ocrN.includes(`r$ ${vN}`) || ocrN.includes(`r$${vN}`)) return true;
  }
  // Datas DD/MM/AAAA podem aparecer como DD-MM-AAAA, DD.MM.AAAA.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const variantes = [s.replace(/\//g, "-"), s.replace(/\//g, ".")];
    if (variantes.some((v) => ocrN.includes(v))) return true;
  }
  return false;
}

interface IAResponseParsed {
  suggestions: Suggestion[];
  ai_confidence: number;
  summary: string;
}

async function chamarOpenAI(
  apiKey: string,
  ocrText: string,
  parsedJson: unknown,
  builder: Builder,
): Promise<{ raw: IAResponseParsed; durationMs: number; status: number }> {
  // OCR pode ser longo; limitamos a 12k caracteres pra controlar custo
  // (gpt-5 tem 400k de contexto, mas custo escala com tokens). Operador
  // foi avisado pelo score que a extração já é parcial — IA aqui só
  // revisa, não substitui.
  const ocrTrimmed = ocrText.length > 12000
    ? ocrText.slice(0, 12000) + "\n[...OCR truncado pra economia de tokens...]"
    : ocrText;

  // `parsed` em cartão de ponto com 700+ apurações cheias (marcações,
  // eventos, observações) chegava facilmente a 200k+ tokens. gpt-5 tem
  // 400k de contexto — cabe — mas o custo por chamada disparava. Mantemos
  // a estratégia em 2 camadas pra economia:
  //   1. JSON.stringify SEM indent (corta ~50% do volume só pelo whitespace).
  //   2. Truncamento defensivo em 60k chars (~15k tokens). Junto com OCR
  //      12k chars, system prompt ~1.5k e schema ~0.5k, ficamos em
  //      30-40k tokens — quantidade saudável de input pra reasoning.
  // Documento muito grande perde fidelidade no que sobrou de fora; é trade-off
  // explícito documentado pra IA, que vê a marca e sabe que parsed foi cortado.
  const PARSED_MAX_CHARS = 60000;
  let parsedString = JSON.stringify(parsedJson);
  if (parsedString.length > PARSED_MAX_CHARS) {
    parsedString = parsedString.slice(0, PARSED_MAX_CHARS) +
      "\n[...parsed JSON truncado pra economia de tokens — documento muito grande...]";
  }

  const userPrompt =
    `Documento tipo: ${builder}

OCR ORIGINAL (pode estar truncado a 12k chars):
${ocrTrimmed}

ESTRUTURA EXTRAÍDA pelo parser determinístico (parsed JSON, pode estar truncada):
${parsedString}

Verifique e sugira ajustes pontuais. Lembre-se: TODO valor sugerido DEVE estar LITERALMENTE no OCR acima. Não invente. Responda apenas no schema.`;

  const ctrl = new AbortController();
  const t0 = Date.now();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        // gpt-5 ignora temperature e top_p (usa reasoning interno).
        // reasoning_effort=low é rápido e suficiente pra revisão cirúrgica
        // (operador já fez triagem). seed mantido pra determinismo (P4).
        reasoning_effort: "low",
        seed: 42,
        response_format: {
          type: "json_schema",
          json_schema: RESPONSE_SCHEMA,
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    const durationMs = Date.now() - t0;
    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`OpenAI retornou ${resp.status}: ${errBody.slice(0, 500)}`);
    }
    const json = await resp.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("OpenAI retornou content vazio");
    const parsed = JSON.parse(content) as IAResponseParsed;
    return { raw: parsed, durationMs, status: resp.status };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return jsonResponse(
        { error: "OPENAI_API_KEY não configurada no projeto" },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header required" }, 401);
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );
    if (authError || !user) {
      return jsonResponse({ error: "Invalid authorization token" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "JSON body required" }, 400);
    }

    const document_id =
      typeof body.document_id === "string" ? body.document_id : null;
    const builder = body.builder as Builder | undefined;
    const parsed = body.parsed;
    const ocr_text = typeof body.ocr_text === "string" ? body.ocr_text : "";
    const score = typeof body.score === "number" ? body.score : -1;

    if (!builder || !BUILDERS_VALIDOS.includes(builder)) {
      return jsonResponse(
        { error: `builder inválido. Aceitos: ${BUILDERS_VALIDOS.join(", ")}` },
        400,
      );
    }
    if (!parsed || typeof parsed !== "object") {
      return jsonResponse({ error: "parsed (objeto) obrigatório" }, 400);
    }
    if (ocr_text.length < 100) {
      return jsonResponse(
        { error: "ocr_text muito curto (< 100 chars) — não há o que verificar" },
        400,
      );
    }
    if (score < SCORE_MIN || score > SCORE_MAX) {
      return jsonResponse(
        {
          error:
            `score=${score} fora da faixa permitida [${SCORE_MIN}, ${SCORE_MAX}]. ` +
            `Score >= ${SCORE_MAX + 1}: extração já é confiável, IA dispensável. ` +
            `Score < ${SCORE_MIN}: revisão manual obrigatória, IA pode mascarar problemas.`,
        },
        400,
      );
    }

    // Ownership check (defense in depth — ai_invoked é audit trail).
    if (document_id) {
      const { data: docCheck } = await supabase
        .from("documents")
        .select("id, cases!inner(criado_por)")
        .eq("id", document_id)
        .single();
      if (
        !docCheck ||
        // deno-lint-ignore no-explicit-any
        (docCheck as any).cases?.criado_por !== user.id
      ) {
        return jsonResponse(
          { error: "Documento não encontrado ou sem permissão" },
          403,
        );
      }
    }

    const { raw, durationMs } = await chamarOpenAI(
      OPENAI_API_KEY,
      ocr_text,
      parsed,
      builder,
    );

    // Anti-alucinação: filtra sugestões cujo `suggested` não aparece no OCR.
    const suggestionsAceitas: Suggestion[] = [];
    const discarded: DiscardedHallucination[] = [];
    for (const s of raw.suggestions) {
      if (valorAparecemNoOcr(s.suggested, ocr_text)) {
        suggestionsAceitas.push(s);
      } else {
        discarded.push({
          field: s.field,
          suggested: String(s.suggested ?? ""),
          reason:
            "Valor sugerido não foi encontrado literalmente no OCR — provável alucinação. " +
            `IA disse: "${s.reason}".`,
        });
      }
    }

    // Penaliza confidence se houve descartes — sinal de IA chutando.
    const confidenceFinal = discarded.length > 0
      ? Math.max(0, raw.ai_confidence - discarded.length * 10)
      : raw.ai_confidence;

    return jsonResponse({
      suggestions: suggestionsAceitas,
      discarded_hallucinations: discarded,
      ai_confidence: confidenceFinal,
      ai_confidence_raw: raw.ai_confidence,
      summary: raw.summary,
      model: MODEL,
      duration_ms: durationMs,
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    if (isAbort) {
      return jsonResponse(
        {
          error: "timeout_30s",
          message:
            "OpenAI demorou mais de 30s. Operador pode tentar novamente OU pular a análise.",
        },
        504,
      );
    }
    console.error("verify-extraction-ai error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
