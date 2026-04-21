// =====================================================
// AGENTE EXTRATOR COM RAG (ANTI-ALUCINAÇÃO REFORÇADA)
// Usa busca semântica para encontrar chunks relevantes
// e extrai fatos com citação obrigatória do chunk_id
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuthedUser, requireCaseOwnership, authErrorResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tópicos de busca para extração trabalhista
const EXTRACTION_TOPICS = [
  "data de admissão contrato início trabalho",
  "data de demissão rescisão término desligamento",
  "salário base remuneração mensal vencimento",
  "jornada de trabalho horário expediente escala turno",
  "horas extras adicional hora excedente quantidade percentual",
  "adicional insalubridade periculosidade noturno transferência",
  "férias vencidas proporcionais período aquisitivo concessivo gozo abono",
  "décimo terceiro salário gratificação natalina proporcional",
  "FGTS fundo garantia depósito multa rescisória saldo extrato",
  "aviso prévio indenizado trabalhado projetado dias",
  "cargo função atividade exercida promoção alteração",
  "motivo rescisão justa causa pedido demissão acordo mútuo",
  "verbas rescisórias TRCT saldo salário multa",
  "DSR descanso semanal remunerado reflexo",
  "comissão variável prêmio bonificação gratificação",
  "vale transporte vale refeição alimentação benefícios descontados",
  "intervalo intrajornada supressão parcial redução",
  "equiparação salarial paradigma desvio acúmulo função",
  "estabilidade provisória gestante CIPA acidente",
  "acidente trabalho doença ocupacional CAT afastamento INSS",
  "contribuição sindical desconto autorização",
  "banco de horas compensação acordo individual coletivo",
  "local trabalho endereço empresa filial transferência",
  "CNPJ empregador razão social nome fantasia",
  "CPF nome completo empregado dados pessoais",
  "convenção coletiva CCT ACT piso salarial categoria",
  "multa artigo 477 467 CLT atraso pagamento",
  "seguro desemprego guias entrega",
  "PPP perfil profissiográfico aposentadoria especial",
];

// Tool schema para extração com chunk_id obrigatório
const extractFactsTool = {
  type: "function",
  function: {
    name: "extract_facts",
    description: "Extrai fatos jurídicos dos chunks fornecidos com referência obrigatória ao chunk_id de origem",
    parameters: {
      type: "object",
      properties: {
        facts: {
          type: "array",
          description: "Lista de fatos extraídos com chunk_id obrigatório",
          items: {
            type: "object",
            properties: {
              chave: {
                type: "string",
                description: "Identificador do fato (ex: data_admissao, salario_base)"
              },
              valor: {
                type: "string",
                description: "Valor extraído. Use 'NAO_ENCONTRADO' se não estiver nos chunks."
              },
              tipo: {
                type: "string",
                enum: ["data", "moeda", "numero", "texto", "boolean"],
                description: "Tipo do valor"
              },
              confianca: {
                type: "number",
                description: "Confiança de 0.0 a 1.0. Use 0 para não encontrados."
              },
              chunk_id: {
                type: "string",
                description: "OBRIGATÓRIO: ID do chunk onde o fato foi encontrado"
              },
              citacao_literal: {
                type: "string",
                description: "OBRIGATÓRIO: Trecho EXATO copiado do chunk"
              },
              pagina: {
                type: "number",
                description: "Número da página (do metadata do chunk)"
              }
            },
            required: ["chave", "valor", "tipo", "confianca", "chunk_id", "citacao_literal"],
            additionalProperties: false
          }
        },
        fatos_nao_encontrados: {
          type: "array",
          items: { type: "string" },
          description: "Lista de fatos que foram buscados mas NÃO foram encontrados nos chunks"
        },
        alertas: {
          type: "array",
          items: { type: "string" },
          description: "Alertas de inconsistências encontradas"
        }
      },
      required: ["facts", "fatos_nao_encontrados"],
      additionalProperties: false
    }
  }
};

interface ChunkWithContext {
  id: string;
  texto: string;
  page_number: number | null;
  document_id: string;
  document_type: string;
  similarity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id } = await req.json();

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth + ownership guard (escreve facts/fact_evidences atrelados ao case_id)
    const auth = await requireAuthedUser(req, supabase);
    await requireCaseOwnership(supabase, auth.user.id, case_id);

    console.log(`Starting RAG extraction for case ${case_id}`);

    // 1) Buscar documentos do caso (se existirem)
    // Observação: há cenários onde `document_chunks` existe (chunks gerados)
    // mas a tabela `documents` está vazia/inconsistente para o case_id.
    // Como a extração depende dos chunks, NÃO vamos bloquear a execução por isso.
    // (Nota: a tabela `documents` não possui coluna `processing_status`; usa `status`.)
    const { data: caseDocuments, error: docsErr } = await supabase
      .from("documents")
      .select("id, tipo, status, metadata")
      .eq("case_id", case_id);

    if (docsErr) {
      console.error("Error fetching documents:", docsErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch documents for this case" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!caseDocuments || caseDocuments.length === 0) {
      console.warn(
        `No rows in documents for case ${case_id}. Proceeding using document_chunks only.`
      );
    }

    // Considerar como "processado" quando já foi indexado (status embedded/completed)
    const processedDocs = (caseDocuments ?? []).filter((d: any) =>
      ["embedded", "completed", "embedded_partial"].includes(String(d.status ?? ""))
    );

    // 2) Buscar chunks diretamente (fallback robusto)
    // Motivo: em alguns ambientes, o endpoint de embeddings pode falhar/intermitir.
    // Como este caso tem poucos chunks (ex: 19), é seguro mandar os chunks diretamente para o modelo.
    const { data: rawChunks, error: chunksErr } = await supabase
      .from("document_chunks")
      .select("id, content, page_number, document_id, doc_type, chunk_index")
      .eq("case_id", case_id)
      .order("document_id", { ascending: true })
      .order("chunk_index", { ascending: true })
      .limit(80);

    if (chunksErr) {
      console.error("Error fetching document_chunks:", chunksErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch chunks for this case" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allRelevantChunks: ChunkWithContext[] = (rawChunks || []).map((c: any) => ({
      id: c.id,
      texto: c.content,
      page_number: c.page_number ?? null,
      document_id: c.document_id,
      document_type: c.doc_type || "unknown",
      similarity: 1.0,
    }));

    const seenChunkIds = new Set<string>(allRelevantChunks.map((c) => c.id));

    console.log(`Using ${allRelevantChunks.length} chunks from document_chunks`);

    if (allRelevantChunks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No chunks found for this case. Please run OCR/indexação." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar chunks para o prompt
    const chunksForPrompt = allRelevantChunks
      .slice(0, 60) // Limitar por segurança de contexto
      .map((chunk, index) => `
=== CHUNK ${index + 1} ===
CHUNK_ID: ${chunk.id}
DOCUMENTO: ${chunk.document_type}
PÁGINA: ${chunk.page_number || 'não identificada'}
SIMILARIDADE: ${(chunk.similarity * 100).toFixed(1)}%
TEXTO:
${chunk.texto}
===`)
      .join('\n\n');

    // Prompt anti-alucinação extremo
    const systemPrompt = `### AGENTE EXTRATOR COM RAG - TOLERÂNCIA ZERO PARA ALUCINAÇÃO ###

Você é um agente de extração de fatos jurídicos trabalhistas com as seguintes REGRAS INVIOLÁVEIS:

## REGRA SUPREMA ##
Você SÓ pode extrair informações que estejam LITERALMENTE escritas nos chunks fornecidos.
Se um fato NÃO estiver nos chunks, você DEVE:
1. NÃO incluí-lo na lista de facts
2. Adicioná-lo na lista "fatos_nao_encontrados"

## CITAÇÃO OBRIGATÓRIA ##
Para CADA fato extraído, você DEVE:
1. Fornecer o chunk_id EXATO do chunk onde encontrou
2. Copiar o trecho LITERAL (citacao_literal) - palavra por palavra
3. Nunca parafrasear ou resumir

## O QUE É PROIBIDO ##
❌ Inventar valores que não estão nos chunks
❌ Inferir dados de contexto
❌ Presumir datas não escritas
❌ Usar chunk_id de um chunk diferente do que contém a informação
❌ Preencher horas extras sem quantidade explícita e citação literal de documento de jornada/ponto

## CHAVES ESPERADAS ##
### Dados do Vínculo ###
- data_admissao (YYYY-MM-DD)
- data_demissao (YYYY-MM-DD)
- salario_base (número decimal OU texto "variavel" se for comissão/variável)
- salario_mensal (número decimal - valor médio mensal se disponível)
- jornada_contratual (formato HH:MM-HH:MM ou horas semanais)
- cargo (texto exato)
- local_trabalho (endereço ou cidade)
- cnpj_empregador (texto)
- razao_social_empregador (texto)
- cpf_empregado (texto)
- nome_empregado (texto completo)

### Rescisão ###
- motivo_demissao (justa_causa/sem_justa_causa/pedido_demissao/acordo_mutuo/rescisao_indireta)
- aviso_previo (trabalhado/indenizado/nao_cumprido)
- aviso_previo_dias (número de dias)
- data_aviso_previo (YYYY-MM-DD)
- codigo_afastamento_fgts (letra/código do extrato FGTS, ex: J, I1, I2, K, I5)
- saldo_salario_dias (número de dias)
- multa_art_477 (valor ou "devida"/"paga")
- multa_art_467 (valor ou "devida"/"paga")

### Adicionais ###
- adicional_insalubridade (percentual ou valor)
- adicional_periculosidade (percentual ou valor)
- adicional_noturno (percentual ou valor)
- adicional_transferencia (percentual ou valor)
- comissoes_media (valor médio mensal)

### Jornada ###
- horas_extras_mensais (quantidade mensal explícita; não inferir)
- horas_extras_percentual (50%, 100%, etc.)
- intervalo_intrajornada (tempo concedido, ex: "30min", "1h")
- intervalo_suprimido (sim/nao/parcial)
- banco_horas (sim/nao, saldo se disponível)
- trabalho_noturno (sim/nao, horário)

### FGTS ###
- fgts_depositado (sim/nao/parcial)
- fgts_saldo (valor do saldo)
- multa_fgts_40 (valor ou "devida")

### Férias ###
- ferias_vencidas (número de períodos)
- ferias_proporcionais (fração, ex: "8/12")
- ferias_em_dobro (sim/nao)

### 13º Salário ###
- decimo_terceiro_proporcional (fração, ex: "3/12")

### Verbas TRCT ###
- saldo_salario (valor)
- total_bruto_trct (valor total bruto do TRCT)
- total_liquido_trct (valor total líquido do TRCT)
- total_descontos_trct (valor total de descontos)

### Outros ###
- seguro_desemprego_guias (entregues/nao_entregues)
- piso_salarial_categoria (valor do piso da CCT)
- sindicato_categoria (nome do sindicato)
- equiparacao_salarial_paradigma (nome do paradigma)
- acidente_trabalho (sim/nao, descrição)
- estabilidade_provisoria (tipo e período)
- dsr_sobre_extras (valor ou referência)

## EXTRAÇÃO DE DEPÓSITOS FGTS ##
Se encontrar extrato FGTS com depósitos mensais (ex: "115-DEPOSITO JANEIRO 2024 R$ 200,00"):
- Extraia cada depósito como: deposito_fgts_YYYY_MM (ex: deposito_fgts_2024_01)
- O valor deve ser o número decimal (ex: 200.00)
- Use tipo "moeda"

## CÓDIGO DE AFASTAMENTO FGTS — CRÍTICO ##
Se encontrar no extrato FGTS uma linha com "DATA E CÓDIGO DE AFASTAMENTO" seguida de uma data e código (ex: "01/02/2025-J"):
- Extraia como chave "codigo_afastamento_fgts" com o valor sendo APENAS a letra/código (ex: "J", "I1", "I2", "K", "I5")
- ESTA INFORMAÇÃO TEM PRIORIDADE sobre qualquer outra extração de motivo_demissao
- Códigos conhecidos: I1=Sem Justa Causa, I2=Justa Causa, J=Pedido Demissão, K=Rescisão Indireta, I5=Acordo Mútuo
- Use tipo "texto" e confiança 1.0

## EXTRAÇÃO DE VERBAS DE HOLERITES ##
Se encontrar holerites/contracheques com múltiplas verbas:
- Extraia cada verba significativa como: verba_CODIGO (ex: verba_0001, verba_0040)
- Inclua descrição e valor no campo valor (ex: "Salário Base: R$ 1.500,00")
- Isto é CRÍTICO para que o roteiro do advogado tenha a visão completa

## NÍVEIS DE CONFIANÇA ##
- 1.0: Valor explícito e claro
- 0.8-0.9: Valor presente mas formato ambíguo
- 0.5-0.7: Requer interpretação contextual (LISTAR em alertas)
- 0.0: Não encontrado (NÃO incluir em facts)

## VALIDAÇÕES ##
Se data_demissao existir, deve ser POSTERIOR a data_admissao.
Liste inconsistências em "alertas".`;

    console.log("Calling OpenAI for RAG extraction...");

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
          { 
            role: "user", 
            content: `Analise os chunks abaixo e extraia APENAS os fatos que estão EXPLICITAMENTE presentes. Use a função extract_facts.\n\n${chunksForPrompt}` 
          },
        ],
        tools: [extractFactsTool],
        tool_choice: { type: "function", function: { name: "extract_facts" } },
        temperature: 0.05, // Mínimo para reduzir criatividade
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extrair fatos do tool call
    let facts: Array<{
      chave: string;
      valor: string;
      tipo: string;
      confianca: number;
      chunk_id: string;
      citacao_literal: string;
      pagina?: number;
    }> = [];
    let fatosNaoEncontrados: string[] = [];
    let alertas: string[] = [];

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        facts = parsed.facts || [];
        fatosNaoEncontrados = parsed.fatos_nao_encontrados || [];
        alertas = parsed.alertas || [];
      } catch (parseError) {
        console.error("Failed to parse tool call:", parseError);
      }
    }

    // Filtrar fatos válidos (com chunk_id e confiança > 0)
    const validFacts = facts.filter(f => 
      f.valor !== "NAO_ENCONTRADO" && 
      f.confianca > 0 &&
      f.chunk_id &&
      seenChunkIds.has(f.chunk_id) // Verificar se chunk_id existe
    );

    // Validações server-side
    const serverValidations: string[] = [...alertas];
    
    const dataAdmissao = facts.find(f => f.chave === "data_admissao");
    const dataDemissao = facts.find(f => f.chave === "data_demissao");
    
    if (dataAdmissao && dataDemissao && 
        dataAdmissao.valor !== "NAO_ENCONTRADO" && 
        dataDemissao.valor !== "NAO_ENCONTRADO") {
      const admDate = new Date(dataAdmissao.valor);
      const demDate = new Date(dataDemissao.valor);
      if (demDate <= admDate) {
        serverValidations.push("ERRO CRÍTICO: Data de demissão anterior à admissão");
      }
    }

    // === CÁLCULO AUTOMÁTICO DE SALÁRIO MÉDIO VIA FGTS ===
    // Se salário é variável/comissão, calcula média a partir dos depósitos FGTS
    const salarioBaseFact = validFacts.find(f => f.chave === "salario_base");
    const salarioMensalFact = validFacts.find(f => f.chave === "salario_mensal");
    
    // Detectar se salário é variável (comissão, variável, etc.)
    const isVariableSalary = salarioBaseFact && 
      (typeof salarioBaseFact.valor === "string") &&
      /vari[aá]vel|comiss[aã]o|exclusivamente/i.test(salarioBaseFact.valor);
    
    // Se não tem salario_mensal explícito e tem salário variável, calcular via FGTS
    let calculatedMonthlySalary: {
      valor: number;
      deposits: Array<{ competencia: string; deposit: number; salary: number }>;
      citacao: string;
      chunk_id: string;
    } | null = null;

    if (!salarioMensalFact && isVariableSalary) {
      console.log("Detected variable salary, looking for FGTS deposits...");
      
      // Buscar fatos de depósito FGTS extraídos (deposito_fgts_YYYY_MM)
      const fgtsDeposits = validFacts.filter(f => f.chave.startsWith("deposito_fgts_"));
      
      if (fgtsDeposits.length >= 3) {
        // Calcular salário a partir de cada depósito (FGTS = 8% do salário)
        const salariesFromFGTS = fgtsDeposits.map(dep => {
          const depositValue = parseFloat(String(dep.valor).replace(/[^\d.,]/g, "").replace(",", "."));
          const salary = depositValue / 0.08;
          // Extrair competência do nome da chave (deposito_fgts_2024_01 -> 2024-01)
          const match = dep.chave.match(/deposito_fgts_(\d{4})_(\d{2})/);
          const competencia = match ? `${match[1]}-${match[2]}` : "unknown";
          return { competencia, deposit: depositValue, salary };
        }).filter(s => !isNaN(s.salary) && s.salary > 0);

        if (salariesFromFGTS.length >= 3) {
          // Calcular média
          const avgSalary = salariesFromFGTS.reduce((sum, s) => sum + s.salary, 0) / salariesFromFGTS.length;
          const roundedAvg = Math.round(avgSalary * 100) / 100;
          
          // Usar o chunk_id do primeiro depósito como referência
          const refDeposit = fgtsDeposits[0];
          
          calculatedMonthlySalary = {
            valor: roundedAvg,
            deposits: salariesFromFGTS,
            citacao: `Calculado automaticamente a partir de ${salariesFromFGTS.length} depósitos FGTS (8% do salário). Depósitos: ${salariesFromFGTS.map(s => `${s.competencia}: R$ ${s.deposit.toFixed(2)} → R$ ${s.salary.toFixed(2)}`).join("; ")}`,
            chunk_id: refDeposit.chunk_id,
          };
          
          console.log(`Calculated average monthly salary: R$ ${roundedAvg} from ${salariesFromFGTS.length} FGTS deposits`);
          serverValidations.push(`SALÁRIO MÉDIO CALCULADO: R$ ${roundedAvg.toFixed(2)} (baseado em ${salariesFromFGTS.length} depósitos FGTS)`);
        }
      } else {
        // Tentar extrair depósitos diretamente dos chunks de FGTS
        const fgtsChunks = allRelevantChunks.filter(c => 
          /fgts|115-deposito|depósito/i.test(c.texto)
        );
        
        if (fgtsChunks.length > 0) {
          const depositPattern = /115-DEPOSITO\s+\w+\s+\d{4}\s+R\$\s*([\d.,]+)/gi;
          const extractedDeposits: Array<{ valor: number; match: string }> = [];
          
          for (const chunk of fgtsChunks) {
            let match;
            while ((match = depositPattern.exec(chunk.texto)) !== null) {
              const valor = parseFloat(match[1].replace(".", "").replace(",", "."));
              if (!isNaN(valor) && valor > 0) {
                extractedDeposits.push({ valor, match: match[0] });
              }
            }
          }
          
          if (extractedDeposits.length >= 3) {
            const salaries = extractedDeposits.map(d => d.valor / 0.08);
            const avgSalary = salaries.reduce((sum, s) => sum + s, 0) / salaries.length;
            const roundedAvg = Math.round(avgSalary * 100) / 100;
            
            calculatedMonthlySalary = {
              valor: roundedAvg,
              deposits: extractedDeposits.map((d, i) => ({
                competencia: `dep_${i + 1}`,
                deposit: d.valor,
                salary: d.valor / 0.08,
              })),
              citacao: `Calculado de ${extractedDeposits.length} depósitos FGTS encontrados no extrato. Fórmula: depósito / 0.08 = salário bruto.`,
              chunk_id: fgtsChunks[0].id,
            };
            
            console.log(`Calculated avg salary from raw FGTS text: R$ ${roundedAvg}`);
            serverValidations.push(`SALÁRIO MÉDIO CALCULADO: R$ ${roundedAvg.toFixed(2)} (baseado em ${extractedDeposits.length} depósitos FGTS extraídos do extrato)`);
          }
        }
      }
    }

    console.log(`Extracted ${facts.length} facts, ${validFacts.length} valid`);

    // Preparar fatos para inserção
    const factsToInsert = validFacts.map((fact) => {
      const canonicalKey = fact.chave === "horas_extras" ? "horas_extras_mensais" : fact.chave;

      return {
        case_id,
        chave: canonicalKey,
        valor: fact.valor,
        tipo: fact.tipo === "boolean" ? "boolean" : fact.tipo,
        origem: "ia_extracao" as const,
        confianca: fact.confianca,
        confirmado: false,
        citacao: `CHUNK_ID:${fact.chunk_id}\n${fact.citacao_literal}`,
        pagina: fact.pagina || null,
        chunk_id: null,
      };
    });

    // Adicionar salário mensal calculado se existir
    if (calculatedMonthlySalary) {
      factsToInsert.push({
        case_id,
        chave: "salario_mensal",
        valor: String(calculatedMonthlySalary.valor),
        tipo: "moeda",
        origem: "ia_extracao" as const,
        confianca: 0.85, // Confiança alta mas não 1.0 pois é calculado
        confirmado: false,
        citacao: `CHUNK_ID:${calculatedMonthlySalary.chunk_id}\n${calculatedMonthlySalary.citacao}`,
        pagina: null,
        chunk_id: null,
      });
    }

    // Inserir fatos no banco
    if (factsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("facts")
        .insert(factsToInsert);

      if (insertError) {
        console.error("Error inserting facts:", insertError);
        throw insertError;
      }
    }

     return new Response(
      JSON.stringify({
        success: true,
        extraction_method: "RAG",
        chunks_analyzed: allRelevantChunks.length,
        facts_extracted: facts.length,
        facts_valid: validFacts.length,
        facts_rejected: facts.length - validFacts.length,
        facts: validFacts,
        fatos_nao_encontrados: fatosNaoEncontrados,
        alertas: serverValidations,
        salario_calculado: calculatedMonthlySalary ? {
          valor: calculatedMonthlySalary.valor,
          metodo: "FGTS (depósito / 0.08)",
          depositos_analisados: calculatedMonthlySalary.deposits.length,
          detalhes: calculatedMonthlySalary.deposits,
        } : null,
        documents_used: processedDocs.map((d: any) => ({
          id: d.id,
          tipo: d.tipo,
          chunks: (d.metadata?.chunks_created ?? null),
          status: d.status,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const authResp = authErrorResponse(error, corsHeaders);
    if (authResp) return authResp;
    console.error("extract-facts-rag error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
