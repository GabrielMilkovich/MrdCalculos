import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { parseFichaFinanceiraDeterministico } from "../_shared/parsers/ficha-financeira-deterministic.ts";
import { validarFichaFinanceira } from "../_shared/validators/ficha-financeira-validator.ts";
import { extrairGeometrico, linhaParaTextoPlano } from "../_shared/extrator-geometrico.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PARSE_FICHA_RATE_LIMIT = 60;
const PARSE_FICHA_RATE_WINDOW_SEC = 3600;
const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const PDF_MAX_BYTES = 30 * 1024 * 1024;

// Códigos internos de RH Via Varejo / ADP que NÃO entram em cálculo
// trabalhista. Provisões, bases, encargos patronais, totalizadores.
const CODIGOS_BLOCKLIST = new Set([
  // Provisões RH (6xxx)
  ...Array.from({ length: 600 }, (_, i) => String(6000 + i).padStart(4, "0")),
  // Bases de cálculo (5xxx — INSS, IR, FGTS são informativos)
  ...Array.from({ length: 200 }, (_, i) => String(5000 + i).padStart(4, "0")),
  // Encargos patronais (8xxx, 9xxx)
  ...Array.from({ length: 200 }, (_, i) => String(8000 + i).padStart(4, "0")),
  ...Array.from({ length: 100 }, (_, i) => String(9900 + i).padStart(4, "0")),
  // Totalizadores 13º
  "0509", "0517", "0521",
]);

const DENOMINACAO_BLOCKLIST_PATTERNS = [
  /^prov\b/i,
  /^base\s+(fgts|inss|ir)\b/i,
  /^total\s+de\b/i,
  /^fgts\s*(emp|patr)/i,
  /^encargo/i,
];

function deveIgnorar(codigo: string | null, denominacao: string): boolean {
  if (codigo && CODIGOS_BLOCKLIST.has(codigo.padStart(4, "0"))) return true;
  return DENOMINACAO_BLOCKLIST_PATTERNS.some((re) => re.test(denominacao.trim()));
}

async function baixarPdfBase64(
  supabase: SupabaseClient,
  storagePath: string,
  storageBucket: string,
): Promise<string | null> {
  try {
    const { data } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(storagePath, 300);
    if (!data?.signedUrl) {
      console.warn("[parse-ficha] signed URL falhou — fallback OCR");
      return null;
    }

    const resp = await fetch(data.signedUrl);
    if (!resp.ok) {
      console.warn(`[parse-ficha] PDF download ${resp.status} — fallback OCR`);
      return null;
    }

    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (bytes.length > PDF_MAX_BYTES) {
      console.warn("[parse-ficha] PDF grande demais — fallback OCR");
      return null;
    }

    return encodeBase64(bytes);
  } catch (err) {
    console.warn("[parse-ficha] erro ao baixar PDF:", err);
    return null;
  }
}

function buildSystemPrompt(tipoLabel: string, anoRef: string): string {
  return `Você é um perito contábil trabalhista. Analise o ${tipoLabel} e extraia TODAS as rubricas de PAGAMENTO (classificação "PGTO") com valores mensais.

REGRAS RÍGIDAS:

1. **APENAS PGTO.** Ignore linhas com classificação DESC (desconto), BASE, ENCAR (encargo patronal), OUTRO, PROV (provisão), INFO.
   A classificação está na coluna "Clas." ou "Cl." — geralmente a 3ª coluna da tabela.

2. **Código numérico obrigatório.** Cada rubrica tem código de 4 dígitos (ex: 0620, 0501, 3290).
   Se você vê o código no documento, INCLUA-O. Se não vê, use string vazia "".

3. **Colunas = meses.** Cada coluna numérica após a classificação representa um mês (Jan, Fev, ..., Dez, 13º, Total).
   Mapeie cada coluna pra ${anoRef}-MM. Coluna "13º" vira ${anoRef}-13.
   NÃO confunda a data de impressão do documento (cabeçalho) com competência das rubricas.

4. **Formato monetário BR.** Ponto = milhar, vírgula = decimal (1.234,56). Converta pra decimal: 1234.56.

5. **Ignora provisões.** Rubricas com código 6xxx (6000-6999) são provisões internas de RH. NÃO inclua.
   Idem pra códigos 5xxx (bases), 8xxx (encargos), 9xxx (FGTS patronal).

6. **Totalizadores.** Linhas "Total de..." são somas. NÃO inclua como rubrica.

CATEGORIZAÇÃO:
| Padrão | Categoria |
|---|---|
| Comissão, Comissões, COM., cod 0620 | comissao |
| DSR, Repouso, cod 0501/0502 | dsr |
| Prêmio, Premio, Gratificação, cod 2377/3290/4101 | premio |
| Adicional Noturno, cod 1800 | adicional_noturno |
| Hora Extra, H.Extra, cod 4001/4013 | hora_extra |
| Salário Base, Mínimo Garantido, cod 0040/0712 | salario_base |
| Qualquer outro PGTO | outros |

EXTRAIA TUDO que for PGTO. Se há 20 rubricas PGTO, retorne as 20.
Valores em branco ou zero = mês sem pagamento, OMITA-OS.

Responda APENAS via a tool extrair_dados_financeiros.`;
}

interface RubricaExtraida {
  codigo: string;
  denominacao: string;
  classificacao?: string;
  categoria: string;
  valores_mensais: Array<{ competencia: string; valor: number }>;
}

interface ResultadoExtracao {
  ano: number;
  empregado?: string;
  empresa?: string;
  rubricas: RubricaExtraida[];
  resumo_mensal?: Array<{ competencia: string; total_vencimentos: number }>;
}

const TOOL_SCHEMA = {
  name: "extrair_dados_financeiros",
  description:
    "Extrai dados estruturados de ficha financeira ou contracheque trabalhista. Use APENAS para rubricas classificadas como PGTO.",
  input_schema: {
    type: "object" as const,
    properties: {
      ano: { type: "number" as const, description: "Ano principal de referência" },
      empregado: { type: "string" as const, description: "Nome do empregado" },
      empresa: { type: "string" as const, description: "Nome da empresa/empregador" },
      rubricas: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            codigo: { type: "string" as const, description: "Código numérico 4 dígitos" },
            denominacao: { type: "string" as const, description: "Nome da rubrica" },
            classificacao: { type: "string" as const, description: "PGTO, DESC, etc" },
            categoria: {
              type: "string" as const,
              enum: ["comissao", "dsr", "premio", "adicional_noturno", "hora_extra", "salario_base", "outros"],
            },
            valores_mensais: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  competencia: { type: "string" as const, description: "YYYY-MM" },
                  valor: { type: "number" as const },
                },
                required: ["competencia", "valor"],
              },
            },
          },
          required: ["codigo", "denominacao", "categoria", "valores_mensais"],
        },
      },
      resumo_mensal: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            competencia: { type: "string" as const },
            total_vencimentos: { type: "number" as const },
          },
          required: ["competencia", "total_vencimentos"],
        },
      },
    },
    required: ["ano", "rubricas"],
  },
};

function detectarEmpregadorSlug(empresa: string): string {
  const e = empresa.toUpperCase();
  if (/VIA\s*VAREJO/.test(e)) return "VIA_VAREJO";
  if (/MAGAZINE\s*LUIZA|MAGALU/.test(e)) return "MAGAZINE_LUIZA";
  if (/CASAS\s*BAHIA/.test(e)) return "CASAS_BAHIA";
  if (/RENNER/.test(e)) return "RENNER";
  if (/CARREFOUR/.test(e)) return "CARREFOUR";
  return "GENERICO";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header obrigatório" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rl = await checkRateLimit(
      supabase, user.id, "parse-ficha-financeira",
      PARSE_FICHA_RATE_LIMIT, PARSE_FICHA_RATE_WINDOW_SEC,
    );
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit excedido",
          hint: `Limite de ${rl.limit} chamadas/hora. Tente em ~${Math.round(rl.retryAfterSec / 60)} min.`,
          used: rl.used, limit: rl.limit,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const {
      texto_documento,
      tipo_documento,
      ano_referencia,
      storage_path,
      storage_bucket,
    } = body;

    if (!texto_documento && !storage_path) {
      return new Response(
        JSON.stringify({ error: "texto_documento ou storage_path obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // V4 PIPELINE: pdfjs_geometric > texto_documento > Claude fallback.
    let textoLimpo: string | null = null;
    let ocr_provider = "unknown";

    // 1. Tenta pdfjs_geometric (texto nativo, zero OCR, grátis)
    if (storage_path) {
      try {
        const { data: signedData } = await supabase.storage
          .from(storage_bucket || "case-documents")
          .createSignedUrl(storage_path, 300);
        if (signedData?.signedUrl) {
          const resp = await fetch(signedData.signedUrl);
          if (resp.ok) {
            const bytes = new Uint8Array(await resp.arrayBuffer());
            const docTabular = await extrairGeometrico(bytes);
            if (docTabular && docTabular.textoCompleto.length > 200) {
              textoLimpo = docTabular.textoCompleto;
              ocr_provider = "pdfjs_geometric";
              console.log(`[parse-ficha] pdfjs_geometric OK: ${textoLimpo.length} chars`);
            }
          }
        }
      } catch (err) {
        console.warn("[parse-ficha] pdfjs_geometric falhou:", err);
      }
    }

    // 2. Fallback: texto_documento do caller
    // BLOQUEIO ADICIONAL (2026-05-29): texto_documento do caller geralmente
    // é o `ocr_text` gravado pelo OCR antigo (Claude/Mistral) e pode estar
    // corrompido (0501 DSR → 0001 CSM). Se chegou aqui é porque pdfjs falhou.
    // Quando o caller é o frontend de ficha financeira, NÃO usamos esse
    // texto como input — preferimos retornar 422 do que produzir dados ruins.
    if (!textoLimpo && texto_documento && tipo_documento === "ficha_financeira") {
      return new Response(
        JSON.stringify({
          error: "pdfjs_geometric falhou ao extrair texto deste PDF. NÃO usamos `texto_documento` do caller para ficha_financeira porque pode estar OCR-corrompido (Claude/Mistral histórico). Suba uma versão do PDF com texto nativo.",
          policy: "deny_caller_text_for_ficha_financeira",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!textoLimpo && texto_documento) {
      textoLimpo = texto_documento;
      ocr_provider = "caller_provided";
      console.warn("[parse-ficha] usando texto_documento do caller (pode estar OCR-corrompido)");
    }

    // 3. Parser determinístico V4
    if (textoLimpo && tipo_documento !== "contracheque") {
      const deterministico = parseFichaFinanceiraDeterministico(textoLimpo);
      if (deterministico && deterministico.rubricas.length >= 3) {
        console.log(
          `[parse-ficha] DETERMINISTIC V4: ${deterministico.rubricas.length} rubricas, ` +
            `ocr=${ocr_provider}, parser=${deterministico._meta.parser}`,
        );

        const empregador = deterministico.empresa
          ? detectarEmpregadorSlug(deterministico.empresa)
          : "GENERICO";

        const totaisPorMes: Record<string, number> = {};
        for (const r of deterministico.resumo_mensal) {
          totaisPorMes[r.competencia] = r.total_vencimentos;
        }

        const validacao = validarFichaFinanceira(
          deterministico.rubricas,
          totaisPorMes,
        );

        return new Response(
          JSON.stringify({
            ...deterministico,
            ocr_provider,
            validacao,
            _meta: {
              ...deterministico._meta,
              empregador_detectado: empregador,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // BLOQUEIO DEFINITIVO (2026-05-29): Claude API estava corrompendo
    // códigos/nomes (0501 DSR → 0001 CSM, JOSELI WANDERLEY → MANDEPLET,
    // Rescisão → Resolvido). Política do escritório: fichas financeiras
    // SÓ saem do parser determinístico (pdfjs + grupos-planilha).
    //
    // Se o parser determinístico não conseguir 3+ rubricas, retornamos
    // erro 422 explícito — operador precisa subir versão com texto nativo.
    // ANTES caía no Claude Sonnet que produzia ZIP com 63% de captura.
    return new Response(
      JSON.stringify({
        error: "Parser determinístico não conseguiu extrair rubricas suficientes (>= 3) deste PDF. Mistral/Claude/IA estão DESABILITADOS para Ficha Financeira porque corrompem códigos. Suba uma versão do PDF com texto nativo (gerado pelo ADP/sistema RH, não escaneado/foto).",
        policy: "ia_disabled_for_ficha_financeira",
        rubricas_determinist_encontradas: textoLimpo
          ? (parseFichaFinanceiraDeterministico(textoLimpo)?.rubricas.length ?? 0)
          : 0,
        ocr_provider,
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

    // CÓDIGO LEGADO ABAIXO (mantido por enquanto pra rollback emergencial).
    // Bloqueio acima impede execução. Pra desabilitar: remover o return e
    // este comentário.
    // eslint-disable-next-line no-unreachable
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tipoLabel = tipo_documento === "contracheque"
      ? "Demonstrativo de Pagamento (Contracheque)"
      : "Ficha Financeira";
    const anoRef = String(ano_referencia || new Date().getFullYear());
    const systemPrompt = buildSystemPrompt(tipoLabel, anoRef);

    // PDF source: quando caller passa storage_path, baixa o PDF e manda
    // pra Claude como document block. Claude vê layout visual real — tabelas
    // fixed-width, colunas de meses, classificação PGTO/DESC. Muito mais
    // preciso que OCR texto que perde alinhamento de colunas.
    let pdfBase64: string | null = null;
    if (storage_path && storage_bucket) {
      pdfBase64 = await baixarPdfBase64(
        supabase,
        storage_path,
        storage_bucket || "case-documents",
      );
      if (pdfBase64) {
        console.log(
          `[parse-ficha] PDF source: ${(pdfBase64.length * 0.75 / 1024 / 1024).toFixed(1)}MB`,
        );
      }
    }

    // Content blocks: PDF quando disponível, OCR texto como fallback
    const userContent: Array<Record<string, unknown>> = [];
    if (pdfBase64) {
      userContent.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
        cache_control: { type: "ephemeral" },
      });
      userContent.push({
        type: "text",
        text: `Analise este ${tipoLabel} (PDF anexo). Extraia TODAS as rubricas PGTO com valores mensais.\n\nAno de referência provável: ${anoRef}.\n\nChame a tool extrair_dados_financeiros com o resultado.`,
      });
    } else {
      const texto = (texto_documento || "").slice(0, 80000);
      userContent.push({
        type: "text",
        text: `Analise o seguinte ${tipoLabel} e extraia TODAS as rubricas PGTO com valores mensais.\n\nAno de referência: ${anoRef}.\n\nDOCUMENTO:\n${texto}\n\nChame a tool extrair_dados_financeiros com o resultado.`,
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
    };
    if (pdfBase64) {
      headers["anthropic-beta"] = "pdfs-2024-09-25";
    }

    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120_000);

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers,
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8192,
          system: systemPrompt,
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "tool", name: "extrair_dados_financeiros" },
          messages: [{ role: "user", content: userContent }],
        }),
      });

      const durationMs = Date.now() - t0;

      if (!resp.ok) {
        if (resp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit Anthropic. Tente em alguns segundos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const errBody = await resp.text();
        console.error("[parse-ficha] Anthropic error:", resp.status, errBody.slice(0, 500));
        throw new Error(`Anthropic ${resp.status}: ${errBody.slice(0, 200)}`);
      }

      const json = await resp.json() as { content?: Array<{ type: string; input?: unknown }> };

      // Extrai tool_use input do response Anthropic
      let extracted: ResultadoExtracao | null = null;
      for (const block of json.content ?? []) {
        if (block.type === "tool_use" && block.input) {
          extracted = block.input as ResultadoExtracao;
          break;
        }
      }
      if (!extracted) {
        throw new Error("Claude não retornou dados via tool. Tente novamente.");
      }

      // Pós-processamento: blocklist + limpeza
      if (extracted.rubricas) {
        const antes = extracted.rubricas.length;
        extracted.rubricas = extracted.rubricas
          // Remove provisões, bases, encargos, totalizadores
          .filter((r) => !deveIgnorar(r.codigo || null, r.denominacao || ""))
          // Remove classificações não-PGTO que Claude pode ter incluído
          .filter((r) =>
            !r.classificacao ||
            r.classificacao.toUpperCase() === "PGTO" ||
            r.classificacao === ""
          )
          // Limpa valores
          .filter((r) => r.valores_mensais && r.valores_mensais.length > 0)
          .map((r) => ({
            ...r,
            valores_mensais: r.valores_mensais
              .filter((v) => v.valor != null && v.valor > 0)
              .map((v) => ({
                competencia: v.competencia,
                valor: typeof v.valor === "string"
                  ? parseFloat(
                      String(v.valor).replace(/[^\d.,-]/g, "").replace(",", "."),
                    )
                  : v.valor,
              }))
              .filter((v) => !isNaN(v.valor) && v.valor > 0),
          }))
          .filter((r) => r.valores_mensais.length > 0);

        const filtrados = antes - extracted.rubricas.length;
        if (filtrados > 0) {
          console.log(
            `[parse-ficha] blocklist filtrou ${filtrados} de ${antes} rubricas`,
          );
        }
      }

      console.log(
        `[parse-ficha] ${extracted.rubricas?.length || 0} rubricas extraídas ` +
          `de ${tipoLabel} (${durationMs}ms, ` +
          `source=${pdfBase64 ? "PDF" : "OCR"}, model=${MODEL})`,
      );

      const empregadorFallback = extracted.empresa
        ? detectarEmpregadorSlug(extracted.empresa)
        : "GENERICO";

      const totaisFallback: Record<string, number> = {};
      for (const r of extracted.resumo_mensal || []) {
        totaisFallback[r.competencia] = r.total_vencimentos;
      }
      const validacaoFallback = validarFichaFinanceira(
        extracted.rubricas || [],
        totaisFallback,
      );

      console.log(
        `[parse-ficha] Claude fallback: ${extracted.rubricas?.length ?? 0} rubricas. ` +
          `VALIDATE: ${validacaoFallback.ok ? "OK" : "FALHOU"}`,
      );

      return new Response(
        JSON.stringify({
          ...extracted,
          ocr_provider: "claude_fallback",
          validacao: validacaoFallback,
          _meta: {
            model: MODEL,
            duration_ms: durationMs,
            pdf_source: !!pdfBase64,
            rubricas_pre_filter: extracted.rubricas?.length,
            empregador_detectado: empregadorFallback,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.error("[parse-ficha-financeira] error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
