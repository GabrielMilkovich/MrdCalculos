// =====================================================
// EDGE FUNCTION: GERADOR DE PETIÇÃO INICIAL (MÓDULO 5B)
// Transforma fatos e cálculos em peça jurídica estruturada
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tipos de pedidos trabalhistas
interface Pedido {
  codigo: string;
  descricao: string;
  fundamentacao: string;
  valor_estimado: number;
  reflexos?: string[];
  observacao?: string;
}

interface PetitionSections {
  qualificacao_partes: string;
  narrativa_fatos: string;
  fundamentacao_juridica: string;
  pedidos: Pedido[];
  valor_causa: number;
  ressalvas: string;
  requerimentos_finais: string;
}

interface GenerationResult {
  success: boolean;
  petition_id: string;
  sections: PetitionSections;
  memoria_calculo_html: string;
  conteudo_completo: string;
  warnings: string[];
}

// Formatar valor monetário
function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Gerar tabela HTML da memória de cálculo
function generateMemoriaCalculoHTML(auditLines: any[]): string {
  if (!auditLines || auditLines.length === 0) {
    return "<p>Memória de cálculo não disponível.</p>";
  }

  let html = `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Linha</th>
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Calculadora</th>
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Competência</th>
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Descrição</th>
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Valor Bruto</th>
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Valor Líquido</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const line of auditLines) {
    html += `
      <tr>
        <td style="border: 1px solid #d1d5db; padding: 8px;">${line.linha || "-"}</td>
        <td style="border: 1px solid #d1d5db; padding: 8px;">${line.calculadora || "-"}</td>
        <td style="border: 1px solid #d1d5db; padding: 8px;">${line.competencia || "-"}</td>
        <td style="border: 1px solid #d1d5db; padding: 8px;">${line.descricao || "-"}</td>
        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${
          line.valor_bruto ? formatMoney(line.valor_bruto) : "-"
        }</td>
        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${
          line.valor_liquido ? formatMoney(line.valor_liquido) : "-"
        }</td>
      </tr>
    `;
  }

  html += `
      </tbody>
    </table>
  `;

  return html;
}

// Gerar ressalvas padrão baseadas nos fatos faltantes
function generateRessalvas(notFoundFacts: string[], warnings: any[]): string {
  const ressalvas: string[] = [];

  ressalvas.push(
    "Os valores ora apresentados são ESTIMATIVAS calculadas com base nos documentos e informações disponíveis nos autos."
  );

  if (notFoundFacts.length > 0) {
    ressalvas.push(
      `Ressalva-se que não foram localizados nos documentos analisados: ${notFoundFacts.join(", ")}. ` +
        "Referidos valores poderão ser apurados em liquidação de sentença mediante perícia contábil."
    );
  }

  if (warnings.some((w) => w.tipo === "atencao")) {
    ressalvas.push(
      "Alguns valores foram estimados com base em médias ou projeções, conforme indicado na memória de cálculo anexa."
    );
  }

  ressalvas.push(
    "Todos os valores estão sujeitos à atualização monetária e incidência de juros legais até a data do efetivo pagamento."
  );

  return ressalvas.join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      case_id, 
      calculation_run_id,
      theses = [],
      include_memoria = true,
      template_id = "inicial_trabalhista_v1"
    } = await req.json();

    if (!case_id) {
      return new Response(
        JSON.stringify({ error: "case_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const startTime = Date.now();

    console.log(`[PETITION] Starting generation for case ${case_id}`);

    // 1. Buscar dados do caso
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", case_id)
      .single();

    if (caseError || !caseData) {
      throw new Error("Case not found");
    }

    // 2. Verificar permissão
    if (caseData.criado_por !== user.id) {
      return new Response(
        JSON.stringify({ error: "Access denied to this case" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Buscar fatos confirmados
    const { data: facts } = await supabase
      .from("facts")
      .select("*")
      .eq("case_id", case_id)
      .eq("confirmado", true);

    // 4. Buscar evidências
    const { data: evidences } = await supabase
      .from("fact_evidences")
      .select("*")
      .eq("case_id", case_id);

    // 5. Buscar resultado do cálculo (mais recente ou específico)
    let calculationRun: any = null;
    let auditLines: any[] = [];

    if (calculation_run_id) {
      const { data: run } = await supabase
        .from("calculation_runs")
        .select("*")
        .eq("id", calculation_run_id)
        .single();
      calculationRun = run;
    } else {
      const { data: runs } = await supabase
        .from("calculation_runs")
        .select("*")
        .eq("case_id", case_id)
        .order("started_at", { ascending: false })
        .limit(1);
      calculationRun = runs?.[0];
    }

    if (calculationRun) {
      const { data: lines } = await supabase
        .from("audit_lines")
        .select("*")
        .eq("run_id", calculationRun.id)
        .order("linha", { ascending: true });
      auditLines = lines || [];
    }

    // 6. Preparar contexto para IA
    const factsMap = facts?.reduce((acc, f) => {
      acc[f.chave] = { 
        valor: f.valor, 
        tipo: f.tipo,
        citacao: f.citacao,
        pagina: f.pagina 
      };
      return acc;
    }, {} as Record<string, any>) || {};

    const resultado_bruto = calculationRun?.resultado_bruto || {};
    const resultado_liquido = calculationRun?.resultado_liquido || {};
    const warnings = calculationRun?.warnings || [];

    // Identificar fatos não encontrados
    const expectedFacts = [
      "data_admissao", "data_demissao", "salario_base", "cargo", 
      "empregador", "jornada", "intervalo_refeicao"
    ];
    const notFoundFacts = expectedFacts.filter(f => !factsMap[f]);

    // 7. Gerar seções via IA
    console.log(`[PETITION] Generating sections via AI...`);

    const systemPrompt = `Você é um advogado trabalhista experiente redator de petições iniciais.

Sua tarefa é gerar seções de uma PETIÇÃO INICIAL TRABALHISTA seguindo rigorosamente:

1. NARRATIVA DOS FATOS: 
   - Baseie-se EXCLUSIVAMENTE nos fatos fornecidos
   - Cite as páginas dos documentos quando disponíveis
   - Use linguagem formal jurídica
   - Organize cronologicamente

2. FUNDAMENTAÇÃO JURÍDICA:
   - Cite artigos da CLT, Constituição e Súmulas do TST
   - Relacione cada tese com os fatos do caso
   - Use as teses sugeridas se fornecidas

3. PEDIDOS:
   - Liste cada verba com seu fundamento legal
   - Inclua os valores estimados (Art. 840, §1º, CLT)
   - Indique reflexos quando aplicável

4. RESSALVAS:
   - Mencione documentos faltantes
   - Reserve valores para apuração em liquidação

FORMATO DE SAÍDA (JSON):
{
  "qualificacao_partes": "texto com qualificação...",
  "narrativa_fatos": "texto dos fatos...",
  "fundamentacao_juridica": "texto do direito...",
  "pedidos": [
    {
      "codigo": "horas_extras",
      "descricao": "Horas extras laboradas além da 8ª diária",
      "fundamentacao": "Art. 59 da CLT c/c Súmula 264 do TST",
      "valor_estimado": 12345.67,
      "reflexos": ["13º salário", "Férias + 1/3", "FGTS + 40%"],
      "observacao": "Valor a ser apurado em liquidação"
    }
  ],
  "valor_causa": 99999.99,
  "ressalvas": "texto das ressalvas...",
  "requerimentos_finais": "texto dos requerimentos..."
}`;

    const factsForAI = facts?.map(f => ({
      chave: f.chave,
      valor: f.valor,
      tipo: f.tipo,
      citacao: f.citacao,
      pagina: f.pagina
    })) || [];

    const calculationSummary = resultado_bruto.total ? {
      bruto: resultado_bruto.total,
      liquido: resultado_liquido.total,
      verbas: Object.entries(resultado_bruto.por_verba || {}).map(([codigo, data]: [string, any]) => ({
        codigo,
        descricao: data.descricao,
        valor: data.valor
      }))
    } : null;

    const userPrompt = `Gere uma PETIÇÃO INICIAL TRABALHISTA com base nos seguintes dados:

DADOS DO CASO:
- Número: ${caseData.numero || "Não informado"}
- Título: ${caseData.titulo || "Reclamação Trabalhista"}

FATOS CONFIRMADOS:
${JSON.stringify(factsForAI, null, 2)}

${calculationSummary ? `RESULTADO DO CÁLCULO:
- Valor Bruto Total: ${formatMoney(calculationSummary.bruto)}
- Valor Líquido Total: ${formatMoney(calculationSummary.liquido)}

VERBAS CALCULADAS:
${calculationSummary.verbas.map(v => `- ${v.descricao}: ${formatMoney(v.valor)}`).join("\n")}
` : "CÁLCULO: Não realizado ainda"}

${theses.length > 0 ? `TESES SELECIONADAS:
${theses.map((t: string) => `- ${t}`).join("\n")}` : ""}

${warnings.length > 0 ? `ALERTAS:
${warnings.map((w: any) => `- ${w.tipo}: ${w.mensagem}`).join("\n")}` : ""}

FATOS NÃO ENCONTRADOS (reservar para liquidação):
${notFoundFacts.length > 0 ? notFoundFacts.join(", ") : "Nenhum"}

Responda APENAS com o JSON no formato especificado.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "{}";
    
    let sections: PetitionSections;
    try {
      sections = JSON.parse(aiContent);
    } catch {
      console.error("[PETITION] Failed to parse AI response:", aiContent);
      throw new Error("Failed to parse AI-generated content");
    }

    // 8. Gerar memória de cálculo HTML
    const memoriaCalculoHtml = include_memoria 
      ? generateMemoriaCalculoHTML(auditLines)
      : "";

    // 9. Montar petição completa
    const conteudoCompleto = `
# EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DO TRABALHO DA ___ª VARA DO TRABALHO DE ___________

${sections.qualificacao_partes || ""}

## DOS FATOS

${sections.narrativa_fatos || ""}

## DO DIREITO

${sections.fundamentacao_juridica || ""}

## DOS PEDIDOS

Diante do exposto, requer:

${(sections.pedidos || []).map((p: Pedido, i: number) => 
  `${i + 1}. **${p.descricao}** (${p.fundamentacao}): ${formatMoney(p.valor_estimado)}${
    p.reflexos?.length ? ` - com reflexos em: ${p.reflexos.join(", ")}` : ""
  }${p.observacao ? ` (${p.observacao})` : ""}`
).join("\n\n")}

### VALOR DA CAUSA

Para os efeitos do art. 840, §1º, da CLT, atribui-se à causa o valor de **${formatMoney(sections.valor_causa || 0)}**.

## DAS RESSALVAS

${sections.ressalvas || generateRessalvas(notFoundFacts, warnings)}

## REQUERIMENTOS FINAIS

${sections.requerimentos_finais || `
Requer, ainda:

a) A citação da Reclamada para, querendo, apresentar defesa;
b) A condenação ao pagamento das verbas supra especificadas, acrescidas de atualização monetária e juros legais;
c) A condenação ao pagamento de honorários advocatícios sucumbenciais;
d) A produção de todas as provas em direito admitidas, especialmente documental, testemunhal e pericial;
e) Os benefícios da Justiça Gratuita, declarando sob as penas da lei que não possui condições de arcar com as custas processuais sem prejuízo do próprio sustento.

Nestes termos,
Pede deferimento.

[Local], [Data].

_______________________________
Advogado(a) - OAB/XX nº XXXXX
`}

---

## MEMÓRIA DE CÁLCULO (ANEXO)

${memoriaCalculoHtml}
`;

    // 10. Salvar petição no banco
    const { data: petition, error: insertError } = await supabase
      .from("petitions")
      .insert({
        case_id,
        calculation_run_id: calculationRun?.id || null,
        tipo: "inicial",
        status: "completed",
        titulo: `Petição Inicial - ${caseData.titulo || "Reclamação Trabalhista"}`,
        narrativa_fatos: sections.narrativa_fatos,
        fundamentacao_juridica: sections.fundamentacao_juridica,
        pedidos: sections.pedidos,
        ressalvas: sections.ressalvas || generateRessalvas(notFoundFacts, warnings),
        conteudo_completo: conteudoCompleto,
        memoria_calculo_html: memoriaCalculoHtml,
        facts_snapshot: factsMap,
        theses_used: theses,
        template_id,
        generation_config: {
          include_memoria,
          theses_count: theses.length,
          facts_count: facts?.length || 0,
          not_found_facts: notFoundFacts,
        },
        generation_time_ms: Date.now() - startTime,
        ai_model_used: "gpt-4o",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[PETITION] Insert error:", insertError);
      throw insertError;
    }

    console.log(`[PETITION] Generated petition ${petition.id} in ${Date.now() - startTime}ms`);

    const result: GenerationResult = {
      success: true,
      petition_id: petition.id,
      sections,
      memoria_calculo_html: memoriaCalculoHtml,
      conteudo_completo: conteudoCompleto,
      warnings: notFoundFacts.length > 0 
        ? [`Fatos não encontrados: ${notFoundFacts.join(", ")}`]
        : [],
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[PETITION] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
