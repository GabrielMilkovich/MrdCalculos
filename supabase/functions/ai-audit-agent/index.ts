import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuthedUser, requireCaseOwnership, authErrorResponse } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =====================================================
// SUB-AGENT PROMPTS
// =====================================================

const SYSTEM_PROMPTS: Record<string, string> = {
  ai_case_input_auditor: `Você é um auditor técnico de cálculos trabalhistas (perito judicial).
Analise os insumos do caso e produza um diagnóstico de completude e coerência.
REGRAS:
- NUNCA invente dados ausentes
- NUNCA infira datas críticas sem marcar como inferência
- NUNCA substitua tabela histórica
- Toda inferência deve ter confidence, source_basis, reason, risk, requires_human_confirmation
- Responda APENAS em JSON válido seguindo o schema fornecido`,

  ai_legal_criteria_interpreter: `Você é um interpretador jurídico-operacional especializado em direito trabalhista brasileiro.
Analise os critérios jurídicos do caso (sentença, acórdão, parâmetros) e verifique coerência.
Identifique conflitos entre fontes.
REGRAS:
- Foco em verbas deferidas, reflexos, critérios de base/divisor/quantidade
- Identifique regime monetário (IPCA-E, SELIC, ADC 58)
- Verifique coerência de incidências tributárias
- Responda APENAS em JSON válido`,

  ai_monetary_regime_auditor: `Você é um auditor especializado em regimes de correção monetária e juros de mora trabalhistas.
Verifique:
- Coerência do regime (IPCA-E vs SELIC vs ADC 58)
- Datas de transição
- SELIC não deve ter juros autônomos
- Combinações por data
- Taxas negativas
Responda APENAS em JSON válido`,

  ai_rubric_mapping_auditor: `Você é um especialista em mapeamento de rubricas trabalhistas.
Analise equivalências entre rubricas do PJe-Calc e do MRDcalc.
Detecte:
- Rubricas com nomes diferentes mas mesma natureza
- Rubricas agrupadas vs separadas
- Incidências divergentes
- Naturezas incompatíveis
Responda APENAS em JSON válido`,

  ai_timecard_auditor: `Você é um auditor especializado em jornada de trabalho.
Verifique:
- Coerência dos cartões de ponto com o período do contrato
- HE, DSR, intrajornada, noturno
- Lacunas na jornada
- Agregação excessiva que destrói lógica diária
Responda APENAS em JSON válido`,

  ai_post_calculation_auditor: `Você é um auditor de resultados de cálculo trabalhista.
Analise o resultado da liquidação e verifique:
- Coerência bruto vs líquido
- Encargos vs base tributável
- Reflexos sem verba-mãe
- Juros vs regime informado
- FGTS vs verbas salariais
- Fechamento completo
NÃO altere valores calculados. Apenas audite.
Responda APENAS em JSON válido`,

  ai_pje_reconciliation_agent: `Você é um reconciliador técnico MRDcalc vs PJe-Calc.
Compare os dois cálculos e para cada divergência:
- Identifique a causa provável
- Classifique o módulo responsável
- Estime o impacto financeiro
- Sugira a prioridade de correção
NÃO invente números. Use apenas os dados fornecidos.
Responda APENAS em JSON válido`,
};

// =====================================================
// RESPONSE SCHEMAS FOR TOOL CALLING
// =====================================================

const AUDIT_RESPONSE_SCHEMA = {
  type: "function" as const,
  function: {
    name: "audit_response",
    description: "Structured audit response",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["APTO", "APTO_COM_WARNINGS", "BAIXA_CONFIABILIDADE", "BLOQUEADO", "DIVERGENTE_DO_PJE"] },
        confidence: { type: "number", description: "0.0 to 1.0" },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string" },
              severity: { type: "string", enum: ["critical", "high", "medium", "low", "info"] },
              module: { type: "string" },
              field: { type: "string" },
              title: { type: "string" },
              technical_message: { type: "string" },
              user_message: { type: "string" },
              recommended_action: { type: "string" },
              confidence: { type: "number" },
              source_basis: { type: "string" },
              requires_human_confirmation: { type: "boolean" },
            },
            required: ["code", "severity", "module", "title", "technical_message", "user_message"],
          },
        },
        blocking_issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string" },
              title: { type: "string" },
              technical_message: { type: "string" },
              user_message: { type: "string" },
              severity: { type: "string" },
              module: { type: "string" },
              recommended_action: { type: "string" },
            },
            required: ["code", "title", "module"],
          },
        },
        module_scores: {
          type: "array",
          items: {
            type: "object",
            properties: {
              module: { type: "string" },
              label: { type: "string" },
              score: { type: "number" },
              issues_count: { type: "number" },
              status: { type: "string" },
            },
            required: ["module", "score"],
          },
        },
        summary: { type: "string" },
      },
      required: ["status", "confidence", "findings"],
    },
  },
};

// =====================================================
// AI GATEWAY CALL
// =====================================================

async function callAI(
  agentName: string,
  userPrompt: string,
  apiKey: string,
): Promise<any> {
  const systemPrompt = SYSTEM_PROMPTS[agentName] || SYSTEM_PROMPTS.ai_case_input_auditor;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [AUDIT_RESPONSE_SCHEMA],
      tool_choice: { type: "function", function: { name: "audit_response" } },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const text = await response.text();
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI gateway error [${status}]: ${text}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      return { status: "BLOQUEADO", confidence: 0, findings: [{ code: "AI_PARSE_ERROR", severity: "critical", module: "system", title: "Erro ao parsear resposta da IA", technical_message: toolCall.function.arguments, user_message: "Erro interno do agente de IA" }] };
    }
  }

  // Fallback: try to parse content as JSON
  const content = data.choices?.[0]?.message?.content;
  if (content) {
    try {
      return JSON.parse(content);
    } catch {
      return { status: "APTO_COM_WARNINGS", confidence: 0.5, findings: [], summary: content };
    }
  }

  return { status: "BLOQUEADO", confidence: 0, findings: [{ code: "AI_NO_RESPONSE", severity: "critical", module: "system", title: "Sem resposta da IA", technical_message: "No response from AI", user_message: "O agente de IA não retornou resposta" }] };
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth + ownership guard ANTES de qualquer mutação
    const auth = await requireAuthedUser(req, supabase);

    const { action, case_id, calculo_id, agents, context } = await req.json();
    await requireCaseOwnership(supabase, auth.user.id, case_id);

    // Rate limit: 10 auditorias/hora (endpoint caro — LLM calls em cascata)
    await checkRateLimit(supabase, {
      userId: auth.user.id,
      bucket: "ai-audit-agent",
      maxRequests: 10,
      windowSeconds: 3600,
    });

    const startTime = Date.now();

    // Create audit run
    const { data: run, error: runErr } = await supabase
      .from("ai_audit_runs")
      .insert({
        case_id,
        calculo_id: calculo_id || null,
        run_type: action || "full",
        status: "running",
        model_used: "google/gemini-2.5-flash",
        prompt_version: "v1.0",
      })
      .select("id")
      .single();

    if (runErr) throw new Error(`Failed to create audit run: ${runErr.message}`);
    const runId = run.id;

    // Gather case data
    const [
      { data: caseData },
      { data: calculoData },
      { data: verbas },
      { data: historicos },
      { data: ferias },
      { data: faltas },
      { data: resultado },
    ] = await Promise.all([
      supabase.from("cases").select("*").eq("id", case_id).single(),
      supabase.from("pjecalc_calculos").select("*").eq("case_id", case_id).limit(1).single(),
      supabase.from("pjecalc_verba_base").select("*").eq("calculo_id", calculo_id || "00000000-0000-0000-0000-000000000000"),
      supabase.from("pjecalc_hist_salarial").select("*").eq("calculo_id", calculo_id || "00000000-0000-0000-0000-000000000000"),
      supabase.from("pjecalc_evento_intervalo").select("*").eq("calculo_id", calculo_id || "00000000-0000-0000-0000-000000000000").eq("tipo", "FERIAS"),
      supabase.from("pjecalc_evento_intervalo").select("*").eq("calculo_id", calculo_id || "00000000-0000-0000-0000-000000000000").in("tipo", ["FALTA", "LICENCA"]),
      supabase.from("pjecalc_resultado").select("*").eq("calculo_id", calculo_id || "00000000-0000-0000-0000-000000000000").limit(1).single(),
    ]);

    // Build context for AI
    const caseContext = {
      case: caseData,
      calculo: calculoData,
      verbas: verbas || [],
      historicos: historicos || [],
      ferias: ferias || [],
      faltas: faltas || [],
      resultado: resultado || null,
      ...(context || {}),
    };

    const contextStr = JSON.stringify(caseContext, null, 2);

    // Run selected agents
    const agentsToRun = agents || (
      action === "pre_calculo" ? ["ai_case_input_auditor", "ai_legal_criteria_interpreter", "ai_monetary_regime_auditor"]
      : action === "pos_calculo" ? ["ai_post_calculation_auditor"]
      : action === "reconciliacao" ? ["ai_pje_reconciliation_agent", "ai_rubric_mapping_auditor"]
      : ["ai_case_input_auditor", "ai_monetary_regime_auditor", "ai_post_calculation_auditor"]
    );

    const allFindings: any[] = [];
    const allModuleScores: any[] = [];
    let worstStatus = "APTO";
    let lowestConfidence = 1.0;
    const statusPriority: Record<string, number> = { APTO: 0, APTO_COM_WARNINGS: 1, BAIXA_CONFIABILIDADE: 2, DIVERGENTE_DO_PJE: 3, BLOQUEADO: 4 };

    for (const agentName of agentsToRun) {
      const agentStart = Date.now();
      try {
        const prompt = `Analise os seguintes dados do caso trabalhista e produza sua auditoria:\n\n${contextStr}`;
        const result = await callAI(agentName, prompt, OPENAI_API_KEY);

        // Store agent log
        await supabase.from("ai_agent_logs").insert({
          run_id: runId,
          agent_name: agentName,
          step: "analysis",
          input_summary: { context_length: contextStr.length, agent: agentName },
          output_summary: { status: result.status, findings_count: result.findings?.length || 0 },
          duration_ms: Date.now() - agentStart,
        });

        // Collect findings
        if (result.findings) {
          for (const f of result.findings) {
            allFindings.push({ ...f, agent_name: agentName });
          }
        }
        if (result.blocking_issues) {
          for (const b of result.blocking_issues) {
            allFindings.push({ ...b, agent_name: agentName, finding_type: "blocker", severity: "critical" });
          }
        }
        if (result.module_scores) {
          allModuleScores.push(...result.module_scores);
        }

        // Track worst status
        if (result.status && (statusPriority[result.status] || 0) > (statusPriority[worstStatus] || 0)) {
          worstStatus = result.status;
        }
        if (result.confidence != null && result.confidence < lowestConfidence) {
          lowestConfidence = result.confidence;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await supabase.from("ai_agent_logs").insert({
          run_id: runId,
          agent_name: agentName,
          step: "error",
          error: errMsg,
          duration_ms: Date.now() - agentStart,
        });

        if (errMsg === "RATE_LIMITED") {
          return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente em alguns segundos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (errMsg === "PAYMENT_REQUIRED") {
          return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Persist findings
    if (allFindings.length > 0) {
      const findingsToInsert = allFindings.map(f => ({
        run_id: runId,
        agent_name: f.agent_name,
        finding_type: f.finding_type || (f.severity === "critical" ? "blocker" : f.severity === "high" ? "warning" : "info"),
        severity: f.severity || "medium",
        module: f.module || "general",
        field: f.field || null,
        code: f.code || "UNKNOWN",
        title: f.title || f.code || "Finding",
        technical_message: f.technical_message || "",
        user_message: f.user_message || f.title || "",
        recommended_action: f.recommended_action || null,
        confidence: f.confidence || 1.0,
        source_basis: f.source_basis || null,
        requires_human_confirmation: f.requires_human_confirmation || false,
        metadata: {},
      }));
      await supabase.from("ai_audit_findings").insert(findingsToInsert);
    }

    // Persist module scores
    if (allModuleScores.length > 0) {
      const scoresToInsert = allModuleScores.map(s => ({
        run_id: runId,
        module: s.module,
        label: s.label || s.module,
        score: s.score || 0,
        field_count: s.field_count || 0,
        resolved_count: s.resolved_count || 0,
        inferred_count: s.inferred_count || 0,
        absent_count: s.absent_count || 0,
        blocker_count: s.blocker_count || 0,
      }));
      await supabase.from("ai_confidence_scores").insert(scoresToInsert);
    }

    // Persist canonical input snapshot
    await supabase.from("ai_canonical_inputs").insert({
      run_id: runId,
      case_id,
      input_snapshot: caseContext,
      input_hash: String(contextStr.length),
    });

    // Update run as completed
    const executionTime = Date.now() - startTime;
    await supabase.from("ai_audit_runs").update({
      status: "completed",
      overall_confidence: Math.round(lowestConfidence * 100),
      overall_status: worstStatus,
      execution_time_ms: executionTime,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);

    return new Response(JSON.stringify({
      run_id: runId,
      status: worstStatus,
      confidence: Math.round(lowestConfidence * 100),
      findings_count: allFindings.length,
      blockers: allFindings.filter(f => f.severity === "critical").length,
      warnings: allFindings.filter(f => f.severity === "high" || f.severity === "medium").length,
      execution_time_ms: executionTime,
      agents_run: agentsToRun,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const authResp = authErrorResponse(e, corsHeaders);
    if (authResp) return authResp;
    console.error("ai-audit-agent error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
