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
//   2. **Structured output via tool_use**: Claude é forçado a chamar a
//      tool `emitir_revisao` (`tool_choice: { type: 'tool', name: ... }`).
//      Anthropic valida o input contra o schema antes de retornar.
//   3. **Score 0..100**: a IA explicita seu próprio nível de confiança.
//      O operador vê o score na UI e decide aplicar.
//   4. **Timeout 40s/lote, 130s global** via AbortController. Operador
//      pode pular a análise se demorar.
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
import { encode as base64Encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  type IAResponseParsed,
  parseAnthropicToolUse,
  type Suggestion,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Timeout por LOTE (não global). Supabase Edge Functions tem hard limit
// de 150s — não dá pra esperar 180s de uma chamada só. Cada lote tem
// 40s; se passar, abortamos e perdemos só esse lote (Promise.allSettled
// engole o erro, demais continuam).
const TIMEOUT_MS = 40_000;
// Budget global pra TODO o batching: 130s (margem de 20s do hard
// limit 150s pra serialização/headers/CORS). Se nos aproximamos do
// budget, paramos de disparar novos lotes e retornamos parcial.
const BUDGET_GLOBAL_MS = 130_000;
const SCORE_MIN = 0;
const SCORE_MAX = 85;
// Claude Sonnet 4.6: 1M context, sem extended thinking por default
// (resposta direta, latência ~3-8s). Reputação anti-alucinação alinha
// com o contrato existente (substring literal, sugestões cirúrgicas).
const MODEL = "claude-sonnet-4-6";
// API version stable (mesmo header usado pelo SDK oficial).
const ANTHROPIC_VERSION = "2023-06-01";

// PDF direto: quando o documento original está disponível no Storage e tem
// ≤ PDF_MAX_PAGES páginas, enviamos o PDF como content block `type: document`
// pra Claude ler o layout visual real em vez de OCR intermediário. Melhora
// precisão em tabelas com colunas alinhadas (holerites ADP Via Varejo).
// Documentos grandes (ex: ROSICLEIA 73 páginas) caem no fallback OCR texto.
const PDF_MAX_PAGES = 20;
const PDF_MAX_BYTES = 30 * 1024 * 1024; // 30MB safety (Anthropic limit ~32MB base64)
const PDF_SIGNED_URL_EXPIRY_SECS = 300; // 5 min

/**
 * Baixa PDF do Supabase Storage e converte pra base64.
 * Retorna null se qualquer step falhar (fallback pro OCR texto).
 */
async function baixarPdfBase64(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  try {
    const buckets = ["juriscalculo-documents", "documents"];
    let signedUrl: string | null = null;
    for (const bucket of buckets) {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, PDF_SIGNED_URL_EXPIRY_SECS);
      if (data?.signedUrl) {
        signedUrl = data.signedUrl;
        break;
      }
    }
    if (!signedUrl) {
      console.warn("[verify-ai] PDF signed URL não gerada — fallback OCR");
      return null;
    }

    const resp = await fetch(signedUrl);
    if (!resp.ok) {
      console.warn(
        `[verify-ai] PDF download falhou (${resp.status}) — fallback OCR`,
      );
      return null;
    }

    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (bytes.length > PDF_MAX_BYTES) {
      console.warn(
        `[verify-ai] PDF muito grande (${(bytes.length / 1024 / 1024).toFixed(1)}MB) — fallback OCR`,
      );
      return null;
    }

    return base64Encode(bytes);
  } catch (err) {
    console.warn("[verify-ai] erro ao baixar PDF:", err);
    return null;
  }
}

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

6. **Confidence é INTEIRO PORCENTAGEM 0–100, NÃO PROBABILIDADE 0–1.**

   Escala: 0 (zero por cento, sem confiança), 50 (cinquenta por cento), 100 (cem por cento, certeza absoluta).

   ❌ ERRADO: ai_confidence=0.91 (isso é interpretado como 0,91% — quase zero)
   ❌ ERRADO: ai_confidence=0.85 (isso é 0,85%, NÃO 85%)
   ✅ CERTO: ai_confidence=91 (significa 91%)
   ✅ CERTO: ai_confidence=85 (significa 85%)

   Faixas de uso correto:
   - **80–100** (inteiro): você viu os valores no OCR e tem certeza.
   - **50–79** (inteiro): viu parte do contexto, dúvida em pontos.
   - **30–49** (inteiro): pouco contexto, muito chute. Prefira não sugerir.
   - **0–29** (inteiro): cego ou OCR ilegível. NÃO SUGIRA NADA.

   Operador NÃO PODE APLICAR sugestões com confidence<30. Aplicar sem evidência destrói a paridade do cálculo trabalhista. Se está chutando, retorne array vazio com confidence baixo e explique no summary.

7. **Anti-alucinação self-check.** Antes de incluir cada sugestão, pergunte: "Eu consigo APONTAR para esse valor (ou para a evidência da remoção) no OCR enviado?" Se não, descarte.

Responda APENAS no schema JSON definido.`;

interface DiscardedHallucination {
  field: string;
  suggested: string;
  reason: string;
}

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

/**
 * Versão da `construirOcrFocadoEmFlags` que aceita uma LISTA EXPLÍCITA
 * de ocr_lines pra focar — usada pelo batching, onde cada lote vê só
 * o OCR ao redor das suas apurações.
 */
function construirOcrFocadoEmLinhas(
  ocrText: string,
  ocrLines: number[],
  orcamentoChars: number,
): string {
  const linhas = ocrText.split(/\r?\n/);
  const totalLinhas = linhas.length;
  if (ocrLines.length === 0) {
    return ocrText.length > orcamentoChars
      ? ocrText.slice(0, orcamentoChars) + "\n[...OCR truncado...]"
      : ocrText;
  }
  const linhasOrdenadas = [...new Set(ocrLines)].sort((a, b) => a - b);
  const CONTEXTO = 15;
  const ranges: Array<[number, number]> = [];
  for (const ln of linhasOrdenadas) {
    const ini = Math.max(1, ln - CONTEXTO);
    const fim = Math.min(totalLinhas, ln + CONTEXTO);
    const ultimo = ranges[ranges.length - 1];
    if (ultimo && ini <= ultimo[1] + 1) {
      ultimo[1] = Math.max(ultimo[1], fim);
    } else {
      ranges.push([ini, fim]);
    }
  }
  const partes: string[] = [];
  let usado = 0;
  for (const [ini, fim] of ranges) {
    const header = `\n═══ TRECHO @linha ${ini}-${fim} (de ${totalLinhas}) ═══\n`;
    const corpo = linhas
      .slice(ini - 1, fim)
      .map((l, i) => `${ini + i}: ${l}`)
      .join("\n");
    const bloco = header + corpo + "\n";
    if (usado + bloco.length > orcamentoChars) {
      const espaco = orcamentoChars - usado;
      if (espaco > 200) {
        partes.push(bloco.slice(0, espaco) + "\n[...trecho cortado...]");
      }
      break;
    }
    partes.push(bloco);
    usado += bloco.length;
  }
  return partes.join("");
}

/**
 * Extrai todas as apurações marcadas REVISAR_OCR (com seu ocr_line e
 * índice original no array de apuracoes).
 */
function extrairApuracoesRevisar(parsedJson: unknown): Array<{
  indice: number;
  ocr_line: number;
  observacao: string;
  data: string;
}> {
  const lista: Array<{
    indice: number;
    ocr_line: number;
    observacao: string;
    data: string;
  }> = [];
  try {
    const p = parsedJson as {
      apuracoes?: Array<{
        observacao?: string | null;
        ocr_line?: number;
        data?: string;
      }>;
    };
    if (p?.apuracoes && Array.isArray(p.apuracoes)) {
      for (let i = 0; i < p.apuracoes.length; i++) {
        const a = p.apuracoes[i];
        if (
          a?.observacao &&
          typeof a.observacao === "string" &&
          a.observacao.startsWith("REVISAR_OCR") &&
          typeof a.ocr_line === "number" &&
          a.ocr_line > 0
        ) {
          lista.push({
            indice: i,
            ocr_line: a.ocr_line,
            observacao: a.observacao,
            data: typeof a.data === "string" ? a.data : "",
          });
        }
      }
    }
  } catch {
    // parsed inválido — retorna vazio.
  }
  return lista;
}

/**
 * Chama Anthropic Claude para revisar a extração.
 *
 * Tool use forçado (`tool_choice: { type: 'tool', name: 'emitir_revisao' }`)
 * garante structured output validado server-side pelo Anthropic — Claude
 * é obrigado a chamar a tool com input no schema definido.
 *
 * `discarded_hallucinations` é derivado SERVER-SIDE depois via
 * `valorAparecemNoOcr` — não vem da IA (cobaia honesta não reporta
 * próprias alucinações). Por isso não entra no input_schema do tool.
 *
 * OCR budget: 150k chars/lote (batching), 200k sem batching, parsed
 * 250k. Claude tem 1M context — folga suficiente pra holerites de
 * qualquer tamanho prático.
 */
async function chamarAnthropic(
  apiKey: string,
  ocrText: string,
  parsedJson: unknown,
  builder: Builder,
  apuracoesDoLote?: Array<{
    indice: number;
    ocr_line: number;
    observacao: string;
    data: string;
  }>,
  pdfBase64?: string | null,
): Promise<{ raw: IAResponseParsed; durationMs: number; status: number }> {
  let ocrTrimmed: string;
  let parsedString: string;

  if (apuracoesDoLote && apuracoesDoLote.length > 0) {
    // Batching: OCR focado nas linhas do lote — 150k chars (6x mais que
    // GPT-5). Com 1M context do Claude, sobra contexto pra fluência.
    ocrTrimmed = construirOcrFocadoEmLinhas(
      ocrText,
      apuracoesDoLote.map((a) => a.ocr_line),
      150_000,
    );
    parsedString = JSON.stringify(
      {
        builder,
        apuracoes_deste_lote: apuracoesDoLote.map((a) => ({
          field_path: `apuracoes[${a.indice}].data`,
          indice: a.indice,
          data: a.data,
          motivo_parser: a.observacao,
          ocr_line: a.ocr_line,
        })),
        instrucao:
          "Verifique CADA apuração desta lista. Para cada uma, decida: REMOVER (suggested=null em field_path 'apuracoes[N].data') ou MANTER (não inclua na resposta). Use SOMENTE o OCR enviado como evidência.",
      },
      null,
      0,
    );
  } else {
    // Sem batching: 200k chars de OCR + 250k chars de parsed.
    ocrTrimmed = construirOcrFocadoEmFlags(ocrText, parsedJson, 200_000);
    const PARSED_MAX_CHARS = 250_000;
    parsedString = JSON.stringify(parsedJson);
    if (parsedString.length > PARSED_MAX_CHARS) {
      parsedString = parsedString.slice(0, PARSED_MAX_CHARS) +
        "\n[...parsed JSON truncado em 250k chars...]";
    }
  }

  // Prompt em XML tags — Claude responde melhor a estrutura explícita.
  // Quando PDF disponível, instrui Claude a ler o documento original.
  const sourceDesc = pdfBase64
    ? "Você tem acesso ao PDF original do documento. Leia diretamente o " +
      "conteúdo visual — tabelas, colunas, valores. Não dependa do OCR " +
      "texto abaixo (que serve só como referência secundária e pode conter " +
      "erros de extração). Todo valor sugerido DEVE ser visível no PDF."
    : "Verifique e sugira ajustes com base no OCR texto abaixo.";

  const userPromptText = `<documento>
  <tipo>${builder}</tipo>
  <fonte_primaria>${pdfBase64 ? "PDF original (anexo)" : "OCR texto (abaixo)"}</fonte_primaria>
  <ocr_original descricao="${
    pdfBase64
      ? "referência secundária — PDF é a fonte primária"
      : "focado em trechos próximos às linhas marcadas REVISAR_OCR pelo parser; pode estar truncado"
  }">
${ocrTrimmed}
  </ocr_original>
  <estrutura_extraida descricao="parsed JSON do parser determinístico; pode estar truncado">
${parsedString}
  </estrutura_extraida>
</documento>

<instrucoes>
${sourceDesc}

1. Verifique e sugira ajustes APENAS para campos onde tem CERTEZA, com base ${
    pdfBase64 ? "no PDF original" : "no OCR acima"
  }.
2. Pra REMOVER uma apuração inteira (ex: vazamento de cabeçalho/admissão), retorne field="apuracoes[N].data" com suggested=null e reason explicando.
3. Todo valor sugerido (que não seja null) DEVE estar LITERALMENTE ${
    pdfBase64 ? "visível no PDF" : "no OCR"
  }.
4. Se você está chutando por falta de evidência, use ai_confidence baixo (<30) e prefira NÃO sugerir.

Chame a tool emitir_revisao com sua análise.
</instrucoes>`;

  // Content blocks: quando PDF disponível, envia como `type: document`
  // seguido do prompt texto. Claude processa o PDF nativamente — vê layout
  // visual real, tabelas com colunas alinhadas, valores sem noise de OCR.
  const userContent: Array<Record<string, unknown>> = [];
  if (pdfBase64) {
    userContent.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBase64,
      },
      // Cache control: PDF não muda entre lotes do mesmo request.
      // Anthropic cacheia o processamento do doc se usar prompt caching.
      cache_control: { type: "ephemeral" },
    });
  }
  userContent.push({ type: "text", text: userPromptText });

  const ctrl = new AbortController();
  const t0 = Date.now();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    };
    // Beta header pro PDF support (GA em modelos Claude 4.x mas header
    // pode ser necessário dependendo da versão da API pinada).
    if (pdfBase64) {
      headers["anthropic-beta"] = "pdfs-2024-09-25";
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [
          {
            name: "emitir_revisao",
            description:
              "Emite a revisão da extração com sugestões cirúrgicas. Use field='apuracoes[N].data' com suggested=null para REMOVER apuração-fantasma. Confidence é INTEIRO 0-100 (porcentagem).",
            input_schema: {
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
                  type: "integer",
                  minimum: 0,
                  maximum: 100,
                  description:
                    "Confiança da IA na revisão, como PORCENTAGEM inteira de 0 a 100. NUNCA use decimal entre 0 e 1 — 0.91 não é '91%', é praticamente zero. Use 91 inteiro pra '91%'.",
                },
                summary: { type: "string" },
              },
            },
          },
        ],
        // Força Claude a chamar a tool — Anthropic valida o input
        // contra o schema antes de retornar.
        tool_choice: { type: "tool", name: "emitir_revisao" },
        messages: [
          { role: "user", content: userContent },
        ],
      }),
    });
    const durationMs = Date.now() - t0;
    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(
        `Anthropic retornou ${resp.status}: ${errBody.slice(0, 500)}`,
      );
    }
    const json = await resp.json() as { content?: unknown };
    const parsed = parseAnthropicToolUse(json.content);
    return { raw: parsed, durationMs, status: resp.status };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: "ANTHROPIC_API_KEY não configurada no projeto" },
        500,
      );
    }

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
    // SCORE_MIN=0 (2026-05-23) — IA também roda em scores baixos, onde mais
    // ajuda. Só rejeita quando o score já passou de SCORE_MAX (extração
    // confiável, IA dispensável).
    if (score < SCORE_MIN || score > SCORE_MAX) {
      return jsonResponse(
        {
          error:
            `score=${score} fora da faixa permitida [${SCORE_MIN}, ${SCORE_MAX}]. ` +
            `Score >= ${SCORE_MAX + 1}: extração já é confiável, IA dispensável.`,
        },
        400,
      );
    }

    // Ownership check + metadados pra PDF source.
    let storagePath: string | null = null;
    let pageCount: number | null = null;
    if (document_id) {
      const { data: docCheck } = await supabase
        .from("documents")
        .select("id, storage_path, metadata, cases!inner(criado_por)")
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
      storagePath = (docCheck as { storage_path?: string }).storage_path ?? null;
      const meta = (docCheck as { metadata?: Record<string, unknown> }).metadata;
      const rawPageCount = meta?.v6_page_count;
      pageCount = typeof rawPageCount === "number"
        ? rawPageCount
        : typeof rawPageCount === "string"
        ? parseInt(rawPageCount, 10) || null
        : null;
    }

    // PDF direto: quando disponível e dentro do limite de páginas, Claude
    // lê o layout visual real. Melhora precisão em tabelas com colunas
    // alinhadas (holerites ADP Via Varejo) vs OCR intermediário.
    let pdfBase64: string | null = null;
    const usarPdf = storagePath && pageCount !== null && pageCount <= PDF_MAX_PAGES;
    if (usarPdf) {
      pdfBase64 = await baixarPdfBase64(supabase, storagePath!);
      if (pdfBase64) {
        console.log(
          `[verify-ai] PDF source ativo: ${pageCount} páginas, ` +
            `${(pdfBase64.length * 0.75 / 1024 / 1024).toFixed(1)}MB`,
        );
      }
    }

    // BATCHING — divide as apurações REVISAR_OCR em lotes e roda em
    // paralelo. Calibrado pra caber no hard limit de 150s do Supabase
    // Edge Function:
    //   - Lotes de 50 apurações (em vez de 30) → menos chamadas totais
    //   - 10 concorrentes (em vez de 5) → menos rodadas sequenciais
    //   - Budget global 130s — para de disparar novos lotes quando
    //     aproxima do limite e retorna o que coletou (parcial >> nada)
    //   - Documento ROQUE (628 flags): 13 lotes / 10 concorrentes =
    //     2 rodadas × ~15s/rodada (minimal reasoning) = ~30s ✓
    const t0Global = Date.now();
    const apuracoesRevisar = extrairApuracoesRevisar(parsed);
    const TAMANHO_LOTE = 50;
    const MAX_CONCORRENTES = 10;

    type LoteResult = {
      raw: IAResponseParsed;
      durationMs: number;
    };
    const resultadosLotes: LoteResult[] = [];

    if (apuracoesRevisar.length <= TAMANHO_LOTE) {
      // Documento pequeno: 1 chamada cobre tudo (com ou sem flags).
      // Se PDF disponível, Claude lê o original em vez do OCR texto.
      const r = await chamarAnthropic(
        ANTHROPIC_API_KEY,
        ocr_text,
        parsed,
        builder,
        apuracoesRevisar.length > 0 ? apuracoesRevisar : undefined,
        pdfBase64,
      );
      resultadosLotes.push(r);
    } else {
      // Documento grande: divide e processa em paralelo com semáforo.
      const lotes: Array<typeof apuracoesRevisar> = [];
      for (let i = 0; i < apuracoesRevisar.length; i += TAMANHO_LOTE) {
        lotes.push(apuracoesRevisar.slice(i, i + TAMANHO_LOTE));
      }

      // Semáforo simples: processa em rodadas de MAX_CONCORRENTES.
      // Para de disparar novas rodadas se chegou perto do budget global —
      // operador prefere parcial (X de Y lotes) a um erro total.
      for (let i = 0; i < lotes.length; i += MAX_CONCORRENTES) {
        const elapsed = Date.now() - t0Global;
        // Reserva ~25s pra próxima rodada terminar + serialização.
        if (elapsed > BUDGET_GLOBAL_MS - 25_000) break;
        const grupo = lotes.slice(i, i + MAX_CONCORRENTES);
        const resultsGrupo = await Promise.allSettled(
          grupo.map((lote) =>
            // Batching: cada lote recebe OCR focado nas linhas relevantes.
            // PDF NÃO é passado aqui — mandaria o doc inteiro N vezes
            // (custo x N, sem ganho — Claude já viu o doc no single-shot
            // quando o doc é pequeno o suficiente pra caber em 1 lote).
            chamarAnthropic(ANTHROPIC_API_KEY, ocr_text, parsed, builder, lote),
          ),
        );
        for (const r of resultsGrupo) {
          if (r.status === "fulfilled") {
            resultadosLotes.push(r.value);
          }
          // Lotes que falharem (timeout/erro de API) são silenciados aqui;
          // o operador ainda recebe as sugestões dos lotes OK.
        }
      }
    }

    // Agregação dos resultados: concatena suggestions de todos os lotes,
    // calcula confidence ponderada pela quantidade de sugestões.
    const suggestionsAgregadas: Suggestion[] = [];
    let somaConfPonderada = 0;
    let totalSugestoes = 0;
    const summaries: string[] = [];
    let durationTotal = 0;
    for (const r of resultadosLotes) {
      suggestionsAgregadas.push(...r.raw.suggestions);
      const n = Math.max(1, r.raw.suggestions.length);
      somaConfPonderada += (r.raw.ai_confidence || 0) * n;
      totalSugestoes += n;
      if (r.raw.summary) summaries.push(r.raw.summary);
      durationTotal += r.durationMs;
    }
    const confidenceMedia = totalSugestoes > 0
      ? somaConfPonderada / totalSugestoes
      : resultadosLotes.length > 0
        ? resultadosLotes.reduce((s, r) => s + (r.raw.ai_confidence || 0), 0) /
          resultadosLotes.length
        : 0;

    // Anti-alucinação: filtra sugestões cujo `suggested` não aparece no OCR.
    const suggestionsAceitas: Suggestion[] = [];
    const discarded: DiscardedHallucination[] = [];
    const fieldsVisitados = new Set<string>();
    for (const s of suggestionsAgregadas) {
      // Dedup: se 2 lotes sugerirem o mesmo campo (improvável mas
      // possível em overlap), mantém só a primeira.
      if (fieldsVisitados.has(s.field)) continue;
      fieldsVisitados.add(s.field);
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

    // NORMALIZAÇÃO DEFENSIVA da confiança média.
    let aiConfRaw = typeof confidenceMedia === "number"
      ? confidenceMedia
      : 0;
    if (!Number.isFinite(aiConfRaw)) aiConfRaw = 0;
    if (aiConfRaw > 0 && aiConfRaw <= 1 && !Number.isInteger(aiConfRaw)) {
      aiConfRaw = aiConfRaw * 100;
    }
    aiConfRaw = Math.round(Math.max(0, Math.min(100, aiConfRaw)));

    const confidenceFinal = discarded.length > 0
      ? Math.max(0, aiConfRaw - Math.min(30, discarded.length * 5))
      : aiConfRaw;

    const summaryAgregado =
      apuracoesRevisar.length > TAMANHO_LOTE
        ? `Análise em ${resultadosLotes.length} lote(s) cobrindo ${apuracoesRevisar.length} apuração(ões) marcada(s). ${suggestionsAceitas.length} sugestão(ões) totais. ${summaries.slice(0, 3).join(" / ")}`
        : summaries.join(" ");

    return jsonResponse({
      suggestions: suggestionsAceitas,
      discarded_hallucinations: discarded,
      ai_confidence: confidenceFinal,
      ai_confidence_raw: confidenceMedia,
      summary: summaryAgregado,
      model: MODEL,
      duration_ms: durationTotal,
      lotes_processados: resultadosLotes.length,
      apuracoes_revisar_total: apuracoesRevisar.length,
      // Cobertura informativa: quantas apurações de fato foram vistas
      // pela IA (lotes_processados × TAMANHO_LOTE, sem ultrapassar
      // total). Cliente usa pra mostrar "X de Y analisadas".
      apuracoes_analisadas: Math.min(
        resultadosLotes.length * TAMANHO_LOTE,
        apuracoesRevisar.length,
      ),
      analise_parcial: resultadosLotes.length * TAMANHO_LOTE <
        apuracoesRevisar.length,
      // Indica se a IA leu o PDF original em vez do OCR texto.
      // UI pode mostrar badge "Verificado com documento original".
      pdf_source: !!pdfBase64,
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    if (isAbort) {
      return jsonResponse(
        {
          error: "timeout_180s",
          message:
            "Anthropic demorou mais de 130s. Operador pode tentar novamente OU pular a análise.",
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
