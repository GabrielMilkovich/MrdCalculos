// =====================================================
// extract-via-llm
// =====================================================
// Re-extrai um documento (cartão-ponto, férias, faltas, holerite) via LLM
// quando o parser determinístico tem confiança baixa. Usa OpenAI
// gpt-4o-mini com Structured Outputs (response_format json_schema) para
// garantir que o JSON casa com o schema esperado.
//
// Fluxo:
//   1. Auth: JWT do header → user
//   2. Carrega documents row + valida ownership (case ⊂ user)
//   3. Computa SHA-256 do OCR + tipo + model → chave de cache
//   4. Se cache HIT em llm_extractions, devolve direto
//   5. Senão, chama OpenAI com prompt específico do tipo + schema JSON
//   6. Salva no cache (UNIQUE constraint blinda race conditions)
//   7. Devolve { output, cached, usage }
//
// Anti-alucinação: o front valida o output novamente com Zod e aplica
// invariantes (datas ⊆ OCR, etc.) antes de aceitar.
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "gpt-4o";

interface RequestBody {
  document_id: string;
  tipo_doc: "cartao_ponto" | "recibo_ferias" | "registro_faltas" | "holerite";
  ocr_text: string;
  /**
   * "extract" (default): extrai estrutura direto do OCR original.
   * "deep": passa o OCR por uma 1ª etapa de limpeza/normalização (pré-LLM)
   *         antes de extrair. Custa 2× mais tokens, mas reconstrói linhas
   *         multilinha, normaliza dia-da-semana errado e completa buracos
   *         de calendário. Use quando o regex está indo mal.
   */
  mode?: "extract" | "deep";
}

const TIPO_DOC_VALIDOS = new Set([
  "cartao_ponto",
  "recibo_ferias",
  "registro_faltas",
  "holerite",
]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// =====================================================
// JSON Schemas para Structured Outputs
// =====================================================
// Formato: OpenAI Structured Outputs (api.openai.com/v1/chat/completions
// com response_format = { type: "json_schema", json_schema: {...} }).
// Schema é STRICT: extra props não são permitidas.

// OpenAI Structured Outputs (strict): TODAS as props em `properties` precisam
// estar em `required`. Opcionalidade se expressa com type: ["X", "null"].
const SCHEMA_CARTAO_PONTO = {
  name: "ParseCartaoPontoOutput",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["apuracoes"],
    properties: {
      apuracoes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "data",
            "dia_semana",
            "ocorrencia",
            "marcacoes",
            "eventos",
            "observacao",
          ],
          properties: {
            data: { type: "string", description: "yyyy-MM-dd" },
            dia_semana: { type: ["string", "null"] },
            ocorrencia: {
              type: "string",
              enum: [
                "NORMAL",
                "FALTA",
                "FERIADO",
                "FOLGA",
                "FERIAS",
                "ATESTADO",
                "LICENCA_MEDICA",
                "TREINAMENTO",
                "DSR",
                "AFASTAMENTO",
              ],
            },
            marcacoes: {
              type: "array",
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "e",
                  "s",
                  "e_inserida",
                  "s_inserida",
                  "e_desconsiderada",
                  "s_desconsiderada",
                ],
                properties: {
                  e: { type: "string", description: "HH:MM ou vazio" },
                  s: { type: "string", description: "HH:MM ou vazio" },
                  e_inserida: { type: ["boolean", "null"] },
                  s_inserida: { type: ["boolean", "null"] },
                  e_desconsiderada: { type: ["boolean", "null"] },
                  s_desconsiderada: { type: ["boolean", "null"] },
                },
              },
            },
            eventos: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["tipo", "valor", "raw"],
                properties: {
                  // Enum espelha exatamente os tipos aceitos pelo Zod no
                  // front (TipoEvento). Sem enum aqui, o LLM retornaria
                  // strings livres ("Horas Trabalhadas") que o Zod rejeita.
                  tipo: {
                    type: "string",
                    enum: [
                      "horas_trabalhadas",
                      "horas_previstas",
                      "banco_horas_debito",
                      "banco_horas_credito",
                      "banco_horas_70",
                      "he_com_70",
                      "he_intervalo",
                      "he_feriado_0",
                      "he_feriado_100",
                      "rsr_trabalhado_0",
                      "intrajornada_sup_2hs",
                      "intrajornada",
                      "interjornada",
                      "feriado_dias",
                      "dsr_semanal_dias",
                      "ferias",
                      "licenca_medica",
                      "treinamento",
                      "atestado",
                      "afastamento",
                      "outro",
                    ],
                  },
                  valor: { type: "string" },
                  raw: { type: ["string", "null"] },
                },
              },
            },
            observacao: { type: ["string", "null"] },
          },
        },
      },
    },
  },
} as const;

const SCHEMA_FERIAS = {
  name: "ParseFeriasOutput",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["ferias"],
    properties: {
      ferias: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "relativa",
            "prazo",
            "situacao",
            "dobra_geral",
            "abono",
            "dias_abono",
            "gozo1",
            "gozo2",
            "gozo3",
          ],
          properties: {
            relativa: { type: "string", description: "aaaa/aaaa" },
            prazo: { type: "integer", minimum: 0, maximum: 60 },
            situacao: { type: "string", enum: ["G", "GP", "NG", "I", "P"] },
            dobra_geral: { type: "boolean" },
            abono: { type: "boolean" },
            dias_abono: { type: "integer", minimum: 0, maximum: 20 },
            gozo1: gozoSchema(),
            gozo2: gozoSchema(),
            gozo3: gozoSchema(),
          },
        },
      },
    },
  },
} as const;

function gozoSchema() {
  return {
    anyOf: [
      { type: "null" },
      {
        type: "object",
        additionalProperties: false,
        required: ["inicio", "fim", "dobra"],
        properties: {
          inicio: { type: "string", description: "dd/MM/yyyy" },
          fim: { type: "string", description: "dd/MM/yyyy" },
          dobra: { type: "boolean" },
        },
      },
    ],
  };
}

const SCHEMA_FALTAS = {
  name: "ParseFaltasOutput",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["faltas"],
    properties: {
      faltas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "data_inicio",
            "data_fim",
            "justificada",
            "reiniciar_periodo_aquisitivo",
            "justificativa",
          ],
          properties: {
            data_inicio: { type: "string", description: "yyyy-MM-dd" },
            data_fim: { type: "string", description: "yyyy-MM-dd" },
            justificada: { type: "boolean" },
            reiniciar_periodo_aquisitivo: { type: "boolean" },
            justificativa: { type: ["string", "null"], maxLength: 200 },
          },
        },
      },
    },
  },
} as const;

const SCHEMA_HOLERITE = {
  name: "ParseHoleriteOutput",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["competencia", "rubricas", "layout_usado"],
    properties: {
      competencia: { type: "string", description: "MM/yyyy" },
      layout_usado: { type: "string" },
      rubricas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "codigo",
            "nome",
            "valor_vencimento",
            "valor_desconto",
            "quantidade",
            "ordem",
          ],
          properties: {
            codigo: { type: ["string", "null"] },
            nome: { type: "string", minLength: 1 },
            valor_vencimento: { type: ["number", "null"] },
            valor_desconto: { type: ["number", "null"] },
            quantidade: { type: ["number", "null"] },
            ordem: { type: "integer", minimum: 0 },
          },
        },
      },
    },
  },
} as const;

const SCHEMAS: Record<RequestBody["tipo_doc"], unknown> = {
  cartao_ponto: SCHEMA_CARTAO_PONTO,
  recibo_ferias: SCHEMA_FERIAS,
  registro_faltas: SCHEMA_FALTAS,
  holerite: SCHEMA_HOLERITE,
};

// =====================================================
// Prompts especializados
// =====================================================

const SYSTEM_PROMPT_BASE = `Você é um extrator estruturado de documentos trabalhistas brasileiros para o sistema PJe-Calc Cidadão. Sua função é converter o texto OCR de um documento em JSON ESTRITAMENTE conforme o schema fornecido.

REGRAS INEGOCIÁVEIS:
1. NUNCA invente dados que não estão no OCR. Se um campo é desconhecido, deixe vazio/nulo conforme o schema permite.
2. NUNCA confunda timestamp de assinatura/aprovação ("aprovado pelo usuário no dia X às Y") com batidas de ponto ou rubricas.
3. Datas no schema usam yyyy-MM-dd (cartão-ponto/faltas) ou dd/MM/yyyy (férias). Respeite o formato.
4. Valores monetários como número decimal (ex: 1234.56), nunca string. Decimal pt-BR no OCR ("1.234,56") vira 1234.56.
5. Em caso de ambiguidade, PREFIRA OMITIR a inventar.`;

const PROMPT_POR_TIPO: Record<RequestBody["tipo_doc"], string> = {
  cartao_ponto: `${SYSTEM_PROMPT_BASE}

Você está processando um ESPELHO DE PONTO. Para cada dia útil:
- Extraia até 6 pares de batidas (Entrada/Saída) em HH:MM.
- Marque \`e_inserida\` ou \`s_inserida\` true quando o OCR mostrar asterisco ("11:30*") ou frase "X:XX - Inserido".
- Marque \`e_desconsiderada\`/\`s_desconsiderada\` true quando "X:XX - Desconsiderado".
- Se o dia tem 3 horários ímpares (sem par), preserve o último como E sem S (s = "").
- Ocorrência: NORMAL se houve trabalho; FERIADO/FOLGA/FALTA/FERIAS/etc. quando explicitamente mencionado E não houver batidas.
- IGNORAR linhas que mencionem "aprovado pelo usuário", "aprovado pelo colaborador", "homologado", "registrado eletronicamente", "assinado eletronicamente" — são timestamps de aprovação, não jornada.
- Eventos estruturados (Horas Trabalhadas, HE feriado, banco de horas, RSR, intrajornada) devem virar entradas em \`eventos\`. O \`tipo\` deve ser EXATAMENTE um dos valores do enum (snake_case: "horas_trabalhadas", "banco_horas_debito", "he_feriado_100", etc.) — nunca em português livre. O \`valor\` é HH:MM ou número (ex: "06:30", "1", "-00:24").

EDGE CASES CRÍTICOS:
- DIA DA SEMANA: se o OCR diz "21/08/2024 - Ter" mas 21/08/2024 é uma quarta-feira, copie a data correta e DESCARTE o dia-da-semana errado (deixe \`dia_semana\` null). Use o calendário gregoriano padrão para validar.
- PREFIXOS DE BATIDA: linhas como "REC: 08:30", "ATRASO: 09:00", "MANUAL: 18:30" — extraia APENAS o horário (08:30, 09:00, 18:30). O prefixo é metadado de origem, não tipo de evento.
- TRAVESSIA DE MEIA-NOITE: se um par tem S < E (ex: E=22:00 S=02:00), MANTENHA como par E/S na MESMA apuração — o segundo turno encerrou no dia seguinte. NÃO crie apuração no dia seguinte com S sozinho.
- LINHAS-CONTINUAÇÃO: se uma linha começa SEM data (ex: "| | 16:50 | |") logo após uma linha COM data, agregue os horários à apuração da data anterior — o OCR partiu uma linha de tabela longa em duas.
- Verifique sempre a soma E/S vs evento "Horas Trabalhadas" do dia. Se divergir mais que 5 minutos sem motivo claro (intervalos pequenos somam ±10min), priorize as batidas literais sobre o totalizador — o totalizador pode estar arredondado.`,

  recibo_ferias: `${SYSTEM_PROMPT_BASE}

Você está processando um RECIBO DE FÉRIAS. Para cada bloco "Recibo de Férias":
- \`relativa\`: período aquisitivo (aaaa/aaaa).
- \`prazo\`: dias de férias (geralmente 30; máx 60 — capar se OCR diz mais).
- \`situacao\`: G (gozadas), GP (gozadas parcialmente), NG (não gozadas), I (indenizadas), P (perdidas).
- \`dobra_geral\`: true se o RECIBO INTEIRO menciona dobra (art. 137 CLT).
- Cada \`gozoN\` é { inicio, fim, dobra } onde \`dobra\` indica se aquele gozo individual é em dobra ("em dobra", "em dobro" perto da data).
- \`abono\`: true se há abono pecuniário (1/3); \`dias_abono\` é o número de dias.
- Use null em \`gozoN\` quando o gozo não existir.`,

  registro_faltas: `${SYSTEM_PROMPT_BASE}

Você está processando um REGISTRO DE FALTAS. Para cada falta/atestado/ausência:
- \`data_inicio\` e \`data_fim\` em yyyy-MM-dd; quando dia único, ambos iguais.
- \`justificada\`: true se "atestado", "consulta", "licença médica", "doação de sangue"; false se "injustificada" ou sem justificativa explícita.
- \`reiniciar_periodo_aquisitivo\`: true se OCR menciona "reinicia o período aquisitivo".
- \`justificativa\`: motivo, no máximo 200 chars; null se não houver.
- NUNCA duplique a mesma data com mesma justificativa. Faltas com justificativas diferentes no mesmo dia podem coexistir.`,

  holerite: `${SYSTEM_PROMPT_BASE}

Você está processando um HOLERITE/CONTRACHEQUE. Extraia:
- \`competencia\` em MM/yyyy (mês de referência).
- \`layout_usado\`: "llm_v1" (constante).
- Para cada rubrica:
  - \`codigo\`: código numérico (string) se houver, senão null.
  - \`nome\`: descrição da rubrica.
  - \`valor_vencimento\`: valor positivo se for provento, senão null.
  - \`valor_desconto\`: valor positivo se for desconto, senão null.
  - \`quantidade\`: horas/dias se aplicável, senão null.
  - \`ordem\`: índice 0-based na ordem que aparecem no holerite.
- IGNORE totais/subtotais/saldos. Apenas linhas-rubrica.`,
};

// =====================================================
// Limpeza profunda do OCR (modo "deep")
// =====================================================

const PROMPT_LIMPEZA = `Você é um especialista em recuperação de OCR de documentos trabalhistas brasileiros (espelhos de ponto, holerites, recibos de férias, registros de faltas).

Sua tarefa: receber um TEXTO OCR cru (pode ter ruído, linhas quebradas, dia-da-semana errado, dias de calendário pulados) e devolver uma versão LIMPA e NORMALIZADA preservando 100% dos dados originais.

REGRAS:
1. Reconstrua linhas de tabela quebradas em multilinha (quando uma linha começa com '|' mas não tem data, anexe à linha-âncora anterior).
2. Corrija dia-da-semana quando errado pela data (ex: "21/08/2021 - Sim" sendo sábado → corrija para "21/08/2021 - Sáb"). Use calendário gregoriano.
3. Quando detectar buracos de calendário DENTRO do período declarado em "Período X a Y" (ex: pulou 24/08), adicione a linha faltante no formato " | DD/MM/YYYY - Dia | -- |  | [SEM REGISTRO NO OCR ORIGINAL] |".
4. NUNCA invente batidas, ocorrências ou eventos — só reorganize o que JÁ existe no OCR.
5. Mantenha intactos timestamps de aprovação eletrônica ("aprovado pelo usuário no dia X às Y") — eles são metadados, não dados.
6. NÃO traduza nem simplifique nomes de eventos (mantenha "Horas Trabalhadas", "Banco de Horas Debito" etc).
7. Devolva APENAS o OCR limpo, sem comentários, sem markdown, sem cabeçalho. O texto LIMPO deve ser plug-and-play no parser.`;

async function limparOcr(ocr: string, apiKey: string): Promise<{ limpo: string; usage: { prompt_tokens?: number; completion_tokens?: number } }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: PROMPT_LIMPEZA },
        {
          role: "user",
          content: `OCR cru:\n\n${ocr}\n\nDevolva o OCR LIMPO (apenas o texto, sem nada antes ou depois).`,
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI cleanup error ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  const limpo: string = j.choices?.[0]?.message?.content ?? "";
  return { limpo: limpo.trim() || ocr, usage: j.usage ?? {} };
}

// =====================================================
// Handler
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: "OPENAI_API_KEY não configurada" }, 500);
    }

    // Auth via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "missing auth" }, 401);

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) return jsonResponse({ error: "unauthorized" }, 401);

    const body = (await req.json()) as RequestBody;
    if (!body?.document_id || !body?.tipo_doc || typeof body.ocr_text !== "string") {
      return jsonResponse({ error: "document_id, tipo_doc, ocr_text obrigatórios" }, 400);
    }
    if (!TIPO_DOC_VALIDOS.has(body.tipo_doc)) {
      return jsonResponse({ error: `tipo_doc inválido: ${body.tipo_doc}` }, 400);
    }
    if (body.ocr_text.length < 10) {
      return jsonResponse({ error: "ocr_text muito curto" }, 400);
    }

    // Service role para ownership check + cache.
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Ownership: documento pertence a um caso do user.
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .select("id, case_id, cases!inner(criado_por)")
      .eq("id", body.document_id)
      .single();
    if (docErr || !doc) return jsonResponse({ error: "documento não encontrado" }, 404);
    // @ts-ignore — relação inline
    if (doc.cases?.criado_por !== user.id) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const mode = body.mode ?? "extract";
    // Hash inclui mode pra cache não confundir extract vs deep.
    const ocrHash = await sha256Hex(`${mode}::${body.ocr_text}`);

    // Cache lookup
    const { data: cacheHit } = await supabaseAdmin
      .from("llm_extractions")
      .select("output_json, prompt_tokens, completion_tokens, model, criado_em")
      .eq("document_id", body.document_id)
      .eq("ocr_hash", ocrHash)
      .eq("tipo_doc", body.tipo_doc)
      .eq("model", MODEL)
      .maybeSingle();

    if (cacheHit) {
      return jsonResponse({
        output: cacheHit.output_json,
        cached: true,
        model: cacheHit.model,
        usage: {
          prompt_tokens: cacheHit.prompt_tokens,
          completion_tokens: cacheHit.completion_tokens,
        },
      });
    }

    // Trunca OCR muito grande pra evitar custo descontrolado.
    const MAX_OCR_CHARS = 60_000;
    let ocrTrim =
      body.ocr_text.length > MAX_OCR_CHARS
        ? body.ocr_text.slice(0, MAX_OCR_CHARS) +
          "\n[...OCR truncado para limite de contexto...]"
        : body.ocr_text;

    // Modo "deep": passa o OCR por uma 1ª etapa de limpeza/normalização
    // (corrige multilinha, dia-da-semana, sinaliza buracos de calendário)
    // antes da extração estruturada.
    let cleanupUsage: { prompt_tokens?: number; completion_tokens?: number } = {};
    let ocrLimpo: string | null = null;
    if (mode === "deep") {
      try {
        const cleanup = await limparOcr(ocrTrim, OPENAI_API_KEY);
        ocrTrim = cleanup.limpo;
        ocrLimpo = cleanup.limpo;
        cleanupUsage = cleanup.usage;
      } catch (e) {
        console.warn("Cleanup OCR falhou, prosseguindo com OCR cru:", e);
      }
    }

    const systemPrompt = PROMPT_POR_TIPO[body.tipo_doc];
    const schema = SCHEMAS[body.tipo_doc];

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extraia o conteúdo estruturado deste OCR.\n\n=== OCR ===\n${ocrTrim}\n=== fim OCR ===`,
          },
        ],
        response_format: { type: "json_schema", json_schema: schema },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenAI error:", aiRes.status, errText);
      return jsonResponse(
        { error: `OpenAI erro ${aiRes.status}`, detail: errText.slice(0, 500) },
        502,
      );
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content;
    if (!content) {
      return jsonResponse({ error: "resposta sem content" }, 502);
    }

    let output: unknown;
    try {
      output = JSON.parse(content);
    } catch (e) {
      return jsonResponse(
        { error: "resposta não é JSON válido", detail: content.slice(0, 500) },
        502,
      );
    }

    const usage = aiJson.usage ?? {};
    const totalUsage = {
      prompt_tokens:
        (usage.prompt_tokens ?? 0) + (cleanupUsage.prompt_tokens ?? 0),
      completion_tokens:
        (usage.completion_tokens ?? 0) + (cleanupUsage.completion_tokens ?? 0),
    };

    // Cacheia (UNIQUE constraint blinda race em concurrent calls).
    const { error: insertErr } = await supabaseAdmin
      .from("llm_extractions")
      .upsert(
        {
          document_id: body.document_id,
          case_id: doc.case_id,
          ocr_hash: ocrHash,
          tipo_doc: body.tipo_doc,
          model: MODEL,
          output_json: output,
          prompt_tokens: totalUsage.prompt_tokens || null,
          completion_tokens: totalUsage.completion_tokens || null,
        },
        {
          onConflict: "document_id,ocr_hash,tipo_doc,model",
          ignoreDuplicates: false,
        },
      );
    if (insertErr) {
      console.warn("falha ao cachear extração:", insertErr.message);
    }

    return jsonResponse({
      output,
      cached: false,
      mode,
      ocr_limpo: ocrLimpo,
      model: MODEL,
      usage: totalUsage,
    });
  } catch (e) {
    console.error("extract-via-llm error:", e);
    return jsonResponse(
      { error: (e as Error).message ?? String(e) },
      500,
    );
  }
});
