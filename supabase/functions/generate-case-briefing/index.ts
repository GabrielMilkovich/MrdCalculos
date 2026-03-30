// =====================================================
// AGENTE 5: ROTEIRO COMPLETO DO CASO PARA O ADVOGADO
// Analisa fatos, documentos, cálculos, alertas e controvérsias
// para gerar um briefing executivo completo
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      facts, 
      documents, 
      calculation_result, 
      audit_lines, 
      warnings, 
      controversies,
      case_info,
      contract_info,
      document_chunks,
    } = await req.json();

    if (!facts && !document_chunks) {
      return new Response(
        JSON.stringify({ error: "facts or document_chunks are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // ── Build comprehensive context ──

    const factsText = (facts || []).map((f: any) => 
      `- **${f.chave}**: ${f.valor} (confiança: ${f.confianca ?? 'N/A'}%, confirmado: ${f.confirmado ? 'SIM' : 'NÃO'}, origem: ${f.origem})`
    ).join("\n");

    const docsText = (documents || []).map((d: any) => 
      `- ${d.file_name || d.tipo || 'Documento'} (tipo: ${d.tipo}, status: ${d.status}, OCR: ${d.ocr_confidence ?? 'N/A'}%)`
    ).join("\n") || "Nenhum documento listado.";

    const calcResult = calculation_result || { resultado_bruto: { total: 0, por_verba: {} }, resultado_liquido: { total: 0, por_verba: {} } };

    const resultText = `
Total Bruto: R$ ${calcResult.resultado_bruto?.total?.toFixed(2) || '0.00'}
Total Líquido: R$ ${calcResult.resultado_liquido?.total?.toFixed(2) || '0.00'}
Diferença (descontos): R$ ${((calcResult.resultado_bruto?.total || 0) - (calcResult.resultado_liquido?.total || 0)).toFixed(2)}

Verbas calculadas:
${Object.entries(calcResult.resultado_bruto?.por_verba || {}).map(([codigo, data]: [string, any]) => 
  `  - ${data.descricao || codigo}: R$ ${data.valor?.toFixed(2) || '0.00'}`
).join("\n")}
`;

    const auditSummary = (audit_lines || []).slice(0, 30).map((line: any) => 
      `  [${line.calculadora}] ${line.descricao}: R$ ${line.valor_bruto?.toFixed(2) || '0.00'} ${line.formula ? `(${line.formula})` : ''}`
    ).join("\n") || "Sem linhas de auditoria.";

    const warningsText = (warnings || []).map((w: any) => 
      `  ⚠️ [${w.codigo || w.tipo}] ${w.mensagem}${w.sugestao ? ` → ${w.sugestao}` : ''}`
    ).join("\n") || "Nenhum alerta.";

    const controversiesText = (controversies || []).map((c: any) =>
      `  - ${c.campo}: ${c.descricao} (status: ${c.status}, prioridade: ${c.prioridade || 'media'})`
    ).join("\n") || "Nenhuma controvérsia registrada.";

    const caseText = case_info ? 
      `Cliente: ${case_info.cliente}\nProcesso: ${case_info.numero_processo || 'Não informado'}\nTribunal: ${case_info.tribunal || 'Não informado'}\nStatus: ${case_info.status}` : "";

    const contractText = contract_info ?
      `Admissão: ${contract_info.data_admissao}\nDemissão: ${contract_info.data_demissao || 'Em aberto'}\nTipo demissão: ${contract_info.tipo_demissao || 'Não informado'}\nSalário inicial: R$ ${contract_info.salario_inicial || 'N/A'}\nFunção: ${contract_info.funcao || 'N/A'}` : "";

    // Build raw document text from chunks
    const chunksText = (document_chunks || []).map((c: any, i: number) =>
      `--- Chunk ${i + 1} (Doc: ${c.doc_type || 'desconhecido'}, Pág: ${c.page_number || '?'}) ---\n${c.content}`
    ).join("\n\n") || "Nenhum texto de documento disponível.";

    const systemPrompt = `Você é um assistente jurídico trabalhista sênior que atua EXCLUSIVAMENTE na defesa dos interesses do RECLAMANTE (trabalhador). Toda sua análise deve ser orientada a maximizar os direitos e verbas devidas ao reclamante.

Sua tarefa é produzir um ROTEIRO COMPLETO E DETALHADO do caso para que o advogado DO RECLAMANTE entenda absolutamente tudo antes de ir a uma audiência ou redigir peças processuais.

IMPORTANTE: Você receberá tanto fatos estruturados já extraídos quanto o TEXTO BRUTO dos documentos (OCR). 
Você DEVE analisar AMBOS. Muitas informações cruciais podem estar apenas no texto bruto e não nos fatos extraídos.
Leia cada chunk de documento com atenção e extraia TODAS as informações relevantes que encontrar.

O roteiro deve ser estruturado nas seguintes seções (use Markdown com headers ##):

## 1. RESUMO EXECUTIVO
- Síntese do caso em 3-5 linhas: quem é o reclamante, contra quem, qual o período, qual o valor total apurado.

## 2. DADOS DO VÍNCULO EMPREGATÍCIO
- Datas, função, salário, tipo de rescisão, jornada.
- CNPJ do empregador, CPF do empregado se disponíveis.
- Destaque qualquer inconsistência ou dado faltante.

## 3. DOCUMENTOS ANALISADOS
- Liste cada documento, seu tipo e qualidade (OCR).
- Indique documentos ausentes que seriam importantes.
- Resuma os principais dados encontrados em CADA documento.

## 4. FATOS EXTRAÍDOS E VALIDADOS
- Liste TODOS os fatos críticos e se estão confirmados ou não.
- Destaque fatos com baixa confiança ou divergência entre fontes.
- Inclua fatos que você encontrou no texto bruto mas NÃO estavam nos fatos estruturados.

## 5. INFORMAÇÕES ADICIONAIS DOS DOCUMENTOS
- Analise o texto bruto dos documentos e liste QUALQUER informação relevante que não foi capturada nos fatos estruturados.
- Verbas de holerites, valores de TRCT, depósitos FGTS, marcações de ponto, cláusulas contratuais, etc.
- Esta seção é CRÍTICA — o advogado precisa de TUDO.

## 6. CONTROVÉRSIAS IDENTIFICADAS
- Liste cada controvérsia, sua implicação financeira e recomendação.

## 7. RESULTADO DO CÁLCULO
- Apresente cada verba calculada de forma clara e didática.
- Explique a lógica de cada verba de forma resumida.
- Se não houver cálculo, indique que o cálculo ainda não foi realizado.

## 8. ALERTAS E RISCOS
- Liste todos os alertas do sistema.
- Classifique cada risco (baixo/médio/alto) e sugira mitigações.
- Inclua riscos que você identificou na leitura dos documentos.

## 9. PONTOS DE ATENÇÃO PARA O ADVOGADO DO RECLAMANTE
- Fragilidades probatórias e como superá-las.
- Teses que a reclamada pode usar para contestar e como rebater.
- Documentos que deveriam ser solicitados à reclamada via exibição judicial.
- Estratégias processuais recomendadas para maximizar os direitos do reclamante.
- Verbas que podem estar sendo pagas a menor ou não pagas.
- Diferenças entre o que consta nos documentos e o que foi calculado — sempre a favor do trabalhador.
- Pedidos adicionais que podem ser incluídos na petição (multas, indenizações, dano moral se cabível).

## 10. CRONOLOGIA DOS EVENTOS
- Monte uma linha do tempo com todas as datas relevantes encontradas nos documentos e fatos.

## 11. TESES JURÍDICAS FAVORÁVEIS AO RECLAMANTE
- Liste as teses jurídicas mais fortes para o caso.
- Indique súmulas, OJs e jurisprudência que favorecem o reclamante.
- Sugira argumentos para cada verba pleiteada.

## 12. RECOMENDAÇÕES FINAIS
- Valor MÍNIMO aceitável de acordo (considerando o risco da reclamada).
- Valor IDEAL a ser pleiteado na inicial.
- Próximos passos concretos.
- Documentos adicionais a solicitar.
- Testemunhas que seriam úteis com base nos fatos.

REGRAS:
- Seja PRECISO: use apenas os dados fornecidos, não invente bases legais.
- Seja EXAUSTIVO: analise CADA chunk de documento, CADA fato, CADA número.
- Seja ESTRATÉGICO: toda análise deve buscar o MELHOR RESULTADO para o reclamante.
- Seja DIDÁTICO: o advogado pode ser júnior.
- Use linguagem jurídica mas acessível.
- Quando dados estiverem faltando, diga EXPLICITAMENTE o que falta e como isso pode beneficiar o reclamante (ex: ausência de cartão de ponto = presunção de jornada alegada).
- NÃO recalcule nada. Narre e analise o que foi calculado.
- Se encontrar dados nos documentos que contradizem os fatos estruturados, DESTAQUE isso.
- Sempre que houver dúvida interpretativa, adote a interpretação MAIS FAVORÁVEL ao trabalhador (princípio in dubio pro operario).`;

    const userPrompt = `Analise o seguinte caso trabalhista e produza o roteiro completo. LEIA ATENTAMENTE todo o texto bruto dos documentos — ele contém informações que podem não estar nos fatos estruturados.

═══ DADOS DO CASO ═══
${caseText}

═══ CONTRATO DE TRABALHO ═══
${contractText}

═══ DOCUMENTOS DO CASO ═══
${docsText}

═══ FATOS EXTRAÍDOS (ESTRUTURADOS) ═══
${factsText}

═══ CONTROVÉRSIAS ═══
${controversiesText}

═══ RESULTADO DO CÁLCULO ═══
${resultText}

═══ MEMÓRIA DE CÁLCULO (resumo das 30 primeiras linhas) ═══
${auditSummary}

═══ ALERTAS DO SISTEMA ═══
${warningsText}

═══ TEXTO BRUTO DOS DOCUMENTOS (OCR) — ANALISE TUDO ═══
${chunksText}

Produza o roteiro completo, exaustivo e detalhado para o advogado. Não omita NENHUMA informação dos documentos.`;

    console.log("Calling OpenAI for case briefing...");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        stream: true,
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

    // Stream the response back
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("generate-case-briefing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
