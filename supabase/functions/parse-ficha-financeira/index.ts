import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { parseFichaFinanceiraDeterministico } from "../_shared/parsers/ficha-financeira-deterministic.ts";
import { enriquecerViaCatalogo } from "../_shared/enrichment/enrich-from-catalogo.ts";
import { validarFichaFinanceira } from "../_shared/validators/ficha-financeira-validator.ts";

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

    return base64Encode(bytes);
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

serve(async (req) => {
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

    // FAST PATH: parser determinístico pra layouts conhecidos (ADP/Via Varejo).
    // Sem chamada LLM — rápido, grátis, determinístico. Funciona sobre output
    // do extrator geométrico pdfjs (tabela markdown com | separadores).
    // Se layout não reconhecido → retorna null → cai no Claude fallback abaixo.
    if (texto_documento && tipo_documento !== "contracheque") {
      const deterministico = parseFichaFinanceiraDeterministico(texto_documento);
      if (deterministico && deterministico.rubricas.length >= 3) {
        console.log(
          `[parse-ficha] DETERMINISTIC: ${deterministico.rubricas.length} rubricas ` +
            `extraídas, ${deterministico._meta.linhas_filtradas} filtradas, ` +
            `parser=${deterministico._meta.parser}`,
        );

        const empregador = deterministico.empresa
          ? detectarEmpregadorSlug(deterministico.empresa)
          : "GENERICO";

        const enriquecimento = await enriquecerViaCatalogo(
          supabase,
          deterministico.rubricas,
          empregador,
        );

        const totaisPorMes: Record<string, number> = {};
        for (const r of deterministico.resumo_mensal) {
          totaisPorMes[r.competencia] = r.total_vencimentos;
        }

        const validacao = validarFichaFinanceira(
          enriquecimento.rubricas,
          totaisPorMes,
        );

        console.log(
          `[parse-ficha] ENRICH: ${enriquecimento.resumo.enriquecidas_catalogo}/${enriquecimento.resumo.total_rubricas} via catálogo, ` +
            `${enriquecimento.resumo.nao_encontradas} sem match. ` +
            `VALIDATE: ${validacao.ok ? "OK" : "FALHOU"} ` +
            `(${validacao.resumo.competencias_ok} ok, ${validacao.resumo.competencias_fora} fora, ` +
            `pior delta ${validacao.resumo.pior_delta_pct.toFixed(2)}%)`,
        );

        return new Response(
          JSON.stringify({
            ...deterministico,
            rubricas: enriquecimento.rubricas,
            enriquecimento: enriquecimento.resumo,
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

    // FALLBACK: Claude Sonnet + PDF source pra layouts não reconhecidos
    // ou quando parser determinístico encontra < 3 rubricas (suspeito).
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

      const enrichResult = await enriquecerViaCatalogo(
        supabase,
        (extracted.rubricas || []).map((r) => ({
          ...r,
          classificacao: r.classificacao || "PGTO",
        })),
        empregadorFallback,
      );

      const totaisFallback: Record<string, number> = {};
      for (const r of extracted.resumo_mensal || []) {
        totaisFallback[r.competencia] = r.total_vencimentos;
      }
      const validacaoFallback = validarFichaFinanceira(
        enrichResult.rubricas,
        totaisFallback,
      );

      console.log(
        `[parse-ficha] ENRICH (Claude): ${enrichResult.resumo.enriquecidas_catalogo}/${enrichResult.resumo.total_rubricas} via catálogo. ` +
          `VALIDATE: ${validacaoFallback.ok ? "OK" : "FALHOU"}`,
      );

      return new Response(
        JSON.stringify({
          ...extracted,
          rubricas: enrichResult.rubricas,
          enriquecimento: enrichResult.resumo,
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
