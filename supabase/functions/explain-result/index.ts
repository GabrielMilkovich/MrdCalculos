// =====================================================
// AGENTE 4: EXPLICADOR / NARRADOR JURÍDICO
// =====================================================


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      facts, 
      calculation_result, 
      audit_lines,
      warnings,
      format = "completo" // "completo", "resumido", "tecnico"
    } = await req.json();
    
    if (!facts || !calculation_result) {
      return new Response(
        JSON.stringify({ error: "facts and calculation_result are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Format facts
    const factsText = facts.map((f: any) => 
      `- ${f.chave}: ${f.valor}`
    ).join("\n");

    // Format calculation result
    const resultText = `
Resultado Bruto: R$ ${calculation_result.resultado_bruto?.total?.toFixed(2) || '0.00'}
Resultado Líquido: R$ ${calculation_result.resultado_liquido?.total?.toFixed(2) || '0.00'}

Verbas por tipo:
${Object.entries(calculation_result.resultado_bruto?.por_verba || {}).map(([codigo, data]: [string, any]) => 
  `- ${data.descricao || codigo}: R$ ${data.valor?.toFixed(2) || '0.00'}`
).join("\n")}
`;

    // Format audit lines (summary)
    const auditSummary = audit_lines?.slice(0, 20).map((line: any) => 
      `[${line.calculadora}] ${line.descricao}: R$ ${line.valor_bruto?.toFixed(2) || '0.00'}`
    ).join("\n") || "";

    // Format warnings
    const warningsText = warnings?.map((w: any) => 
      `⚠️ ${w.tipo}: ${w.mensagem}`
    ).join("\n") || "";

    const formatInstructions = {
      completo: "Produza um texto completo e formal, adequado para apresentação em audiência ou petição. Inclua fundamentação legal quando aplicável.",
      resumido: "Produza um resumo executivo de no máximo 3 parágrafos, destacando apenas os pontos principais e o valor final.",
      tecnico: "Produza uma explicação técnica detalhada, linha a linha, explicando cada cálculo e sua base legal."
    };

    const systemPrompt = `Você é um assistente de narrativa jurídica trabalhista.

Sua função é transformar o resultado de um cálculo trabalhista em texto claro e profissional.

Regras:
- NÃO calcule nada. Apenas narre e explique o que foi calculado.
- Explique cada verba de forma didática
- Justifique as teses aplicadas (ex.: "Considerando que o reclamante laborava em jornada superior à contratual...")
- Mencione os alertas e riscos de forma profissional
- Use linguagem jurídica adequada mas acessível

${formatInstructions[format as keyof typeof formatInstructions] || formatInstructions.completo}`;

    console.log("Calling OpenAI for result explanation...");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Narre e explique o seguinte cálculo trabalhista:

FATOS DO CASO:
${factsText}

RESULTADO DO CÁLCULO:
${resultText}

MEMÓRIA DE CÁLCULO (resumo):
${auditSummary}

${warningsText ? `ALERTAS:\n${warningsText}` : ""}

Produza uma narrativa explicando estes resultados.` },
        ],
        temperature: 0.5,
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
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const narrative = aiData.choices?.[0]?.message?.content || "";

    console.log("Narrative generated, length:", narrative.length);

    return new Response(
      JSON.stringify({
        success: true,
        narrative,
        format,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("explain-result error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
