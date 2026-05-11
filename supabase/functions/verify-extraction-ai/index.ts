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
//   4. **Timeout 180s** via AbortController. Operador pode pular a análise
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

const TIMEOUT_MS = 180_000;
const SCORE_MIN = 50;
const SCORE_MAX = 85;
// gpt-5: melhor qualidade de revisão (anti-alucinação reasoning interno).
// Combo pra CONFIANÇA ALTA com inputs grandes:
//   1. reasoning_effort: "low" (raciocínio real, ainda rápido; "minimal"
//      respondia sem pensar e retornava conf<70 mesmo com evidência clara)
//   2. timeout 180s (margem pra reasoning sobre OCR 60k + parsed 120k)
//   3. chunking inteligente: OCR enviado pra IA é o trecho ao redor das
//      apurações REVISAR_OCR (±15 linhas) — não os primeiros chars
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

O OCR vem em TRECHOS — geralmente focados em linhas que o parser marcou REVISAR_OCR. Concentre sua análise nesses trechos; cada trecho é prefixado por "═══ TRECHO @linha X-Y ═══" e cada linha tem o número original prefixado ("N: ...").

REGRAS RÍGIDAS — NÃO QUEBRE NENHUMA:

1. **NUNCA invente valores.** Todo valor sugerido (número, data, texto) DEVE estar LITERALMENTE no OCR. Se você não consegue ver o valor exato no OCR, NÃO o sugira.

2. **Remoção de apuração-fantasma.** Pra REMOVER uma apuração inteira (ex: vazamento de cabeçalho/admissão como "24/11/2003" virando dia trabalhado), use field="apuracoes[N].data" e suggested=null. NÃO use string "vazio" ou "remover" — use o valor null literal. O reason DEVE explicar por que é cabeçalho/admissão/totalizador e não jornada.

3. **Sugestões cirúrgicas.** Não reescreva a estrutura inteira. Só campos onde tem CERTEZA — campo errado, valor cortado, dia trocado. NÃO sugira mudar dia_semana sem ver explicitamente o dia no OCR.

4. **Formato BR.** Valores monetários: vírgula decimal e ponto milhar (ex: "1.234,56"). Datas: DD/MM/AAAA. Competência: MM/AAAA.

5. **Não classifique rubricas.** Categorização (Salário Fixo / Comissões / etc.) é responsabilidade do operador.

6. **Confidence HONESTO (CRÍTICO).** Sua confiança reflete sua certeza REAL:
   - **80-100**: você viu os valores no OCR e tem certeza de cada sugestão.
   - **50-79**: viu parte do contexto mas tem dúvida em alguns pontos.
   - **30-49**: pouco contexto, muito chute. Prefira não sugerir.
   - **0-29**: cego ou OCR ilegível. NÃO SUGIRA NADA — retorne suggestions=[].

   Operador NÃO PODE APLICAR sugestões com confidence<30. Aplicar sem evidência destrói a paridade do cálculo trabalhista. Se está chutando, retorne array vazio com confidence baixo e explique no summary.

7. **Anti-alucinação self-check.** Antes de incluir cada sugestão, pergunte: "Eu consigo APONTAR para esse valor (ou para a evidência da remoção) no OCR enviado?" Se não, descarte.

Responda APENAS no schema JSON definido.`;

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

/**
 * CHUNKING INTELIGENTE (D): constrói o trecho do OCR que vai pra IA
 * focando nas linhas próximas às apurações marcadas REVISAR_OCR pelo
 * parser determinístico.
 *
 * Estratégia:
 *   - Pra cada apuração com `observacao` começando "REVISAR_OCR" e
 *     `ocr_line` definido, captura ±8 linhas de contexto.
 *   - Deduplica/funde trechos adjacentes (linhas próximas viram um
 *     bloco contíguo, não duplicado).
 *   - Limita ao orçamento total (default 30k chars) — se estourar,
 *     prioriza os primeiros trechos (apurações ordenadas por data).
 *   - Cada trecho ganha marker "═══ TRECHO @linha N ═══" pra IA saber
 *     que pulou OCR entre eles.
 *
 * Fallback: se nada está marcado REVISAR_OCR ou se parsed não tem
 * ocr_line algum, retorna os primeiros 30k chars do OCR (comportamento
 * de truncamento simples).
 */
function construirOcrFocadoEmFlags(
  ocrText: string,
  parsedJson: unknown,
  orcamentoChars: number,
): string {
  const linhas = ocrText.split(/\r?\n/);
  const totalLinhas = linhas.length;

  // Extrai ocr_line das apurações marcadas REVISAR_OCR.
  const ocrLines: number[] = [];
  try {
    const p = parsedJson as {
      apuracoes?: Array<{ observacao?: string | null; ocr_line?: number }>;
    };
    if (p?.apuracoes && Array.isArray(p.apuracoes)) {
      for (const a of p.apuracoes) {
        if (
          a?.observacao &&
          typeof a.observacao === "string" &&
          a.observacao.startsWith("REVISAR_OCR") &&
          typeof a.ocr_line === "number" &&
          a.ocr_line > 0
        ) {
          ocrLines.push(a.ocr_line);
        }
      }
    }
  } catch {
    // parsed fora do shape esperado — cai no fallback.
  }

  if (ocrLines.length === 0) {
    // Sem flags: truncamento simples dos primeiros chars.
    return ocrText.length > orcamentoChars
      ? ocrText.slice(0, orcamentoChars) +
        "\n[...OCR truncado nos primeiros chars; sem flags REVISAR_OCR pra focar...]"
      : ocrText;
  }

  // Ordena e deduplica.
  const linhasOrdenadas = [...new Set(ocrLines)].sort((a, b) => a - b);

  // Funde ranges sobrepostos. Cada range = [iniLinha, fimLinha].
  const CONTEXTO = 15;
  const ranges: Array<[number, number]> = [];
  for (const ln of linhasOrdenadas) {
    const ini = Math.max(1, ln - CONTEXTO);
    const fim = Math.min(totalLinhas, ln + CONTEXTO);
    const ultimo = ranges[ranges.length - 1];
    if (ultimo && ini <= ultimo[1] + 1) {
      // Mescla com range anterior.
      ultimo[1] = Math.max(ultimo[1], fim);
    } else {
      ranges.push([ini, fim]);
    }
  }

  // Constrói o texto consolidado respeitando o orçamento.
  const partes: string[] = [];
  let usado = 0;
  let trechosIncluidos = 0;
  for (const [ini, fim] of ranges) {
    const header = `\n═══ TRECHO @linha ${ini}-${fim} (de ${totalLinhas}) ═══\n`;
    const corpo = linhas
      .slice(ini - 1, fim)
      .map((l, i) => `${ini + i}: ${l}`)
      .join("\n");
    const bloco = header + corpo + "\n";
    if (usado + bloco.length > orcamentoChars) {
      // Tenta incluir só os primeiros chars do bloco que cabem.
      const espaco = orcamentoChars - usado;
      if (espaco > 200) {
        partes.push(bloco.slice(0, espaco) + "\n[...trecho cortado...]");
        trechosIncluidos++;
      }
      break;
    }
    partes.push(bloco);
    usado += bloco.length;
    trechosIncluidos++;
  }

  const sufixo =
    trechosIncluidos < ranges.length
      ? `\n[${ranges.length - trechosIncluidos} trecho(s) adicional(is) não enviados por limite de orçamento.]`
      : "";
  return (
    `(IA recebendo OCR focado nos ${linhasOrdenadas.length} dia(s) marcado(s) REVISAR_OCR — ${trechosIncluidos}/${ranges.length} trechos enviados)\n` +
    partes.join("") +
    sufixo
  );
}

async function chamarOpenAI(
  apiKey: string,
  ocrText: string,
  parsedJson: unknown,
  builder: Builder,
): Promise<{ raw: IAResponseParsed; durationMs: number; status: number }> {
  // CHUNKING INTELIGENTE (D): em vez de cortar os primeiros 30k chars do
  // OCR, focamos nos TRECHOS ao redor das apurações marcadas REVISAR_OCR
  // pelo parser. Isso dá MUITO mais sinal pra IA do que enviar o começo
  // do documento que provavelmente é só cabeçalho.
  //
  // Algoritmo:
  //   1. Extrai `ocr_line` das apurações que têm `observacao` começando
  //      com "REVISAR_OCR" no parsed.
  //   2. Pra cada ocr_line, captura ±8 linhas de contexto.
  //   3. Deduplica overlaps (linhas adjacentes viram um trecho contíguo).
  //   4. Concatena com markers "TRECHO @linha N" e limita ao orçamento
  //      total (30k chars).
  //   5. Se não houver REVISAR_OCR (parser limpo) ou parsed não tiver
  //      ocr_line, cai no truncamento simples dos primeiros 30k chars.
  // CONFIANÇA MAIOR: orçamentos aumentados pra IA ver mais evidência.
  // - OCR focado: 30k → 60k chars (mais trechos de REVISAR_OCR cabem)
  // - parsed JSON: 60k → 120k chars (mais apurações visíveis pra IA cruzar)
  // - contexto por flag: ±8 → ±15 linhas (na função construirOcrFocadoEmFlags)
  // gpt-5 com 400k de contexto e reasoning_effort=low aguenta fácil.
  const ocrTrimmed = construirOcrFocadoEmFlags(ocrText, parsedJson, 60_000);
  const PARSED_MAX_CHARS = 120_000;
  let parsedString = JSON.stringify(parsedJson);
  if (parsedString.length > PARSED_MAX_CHARS) {
    parsedString = parsedString.slice(0, PARSED_MAX_CHARS) +
      "\n[...parsed JSON truncado em 60k chars — documento muito grande...]";
  }

  const userPrompt =
    `Documento tipo: ${builder}

OCR ORIGINAL (focado em trechos próximos às linhas marcadas REVISAR_OCR pelo parser; pode estar truncado em 30k chars):
${ocrTrimmed}

ESTRUTURA EXTRAÍDA pelo parser determinístico (parsed JSON, pode estar truncada em 60k chars):
${parsedString}

INSTRUÇÕES:
1. Verifique e sugira ajustes APENAS para campos onde tem CERTEZA, com base no OCR acima.
2. Pra REMOVER uma apuração inteira (ex: vazamento de cabeçalho/admissão), retorne field="apuracoes[N].data" com suggested=null e reason explicando.
3. Todo valor sugerido (que não seja null) DEVE estar LITERALMENTE no OCR.
4. Se você está chutando por falta de evidência, use ai_confidence baixo (<30) e prefira NÃO sugerir.`;

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
        // gpt-5: ignora temperature/top_p (reasoning interno).
        // reasoning_effort=low: raciocínio real (não chuta como minimal),
        // ainda rápido. Aumenta MUITO a confiança das sugestões em troca
        // de 20-40s a mais. seed=42 mantém determinismo (P4).
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
          error: "timeout_180s",
          message:
            "OpenAI demorou mais de 180s. Operador pode tentar novamente OU pular a análise.",
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
