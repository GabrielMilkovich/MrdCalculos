// =====================================================
// EDGE FUNCTION: OCR DE DOCUMENTOS (HARDENED)
// Extrai texto usando Vision AI com retry, validação
// e fallback de modelos para ZERO falhas
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Modelos em ordem de prioridade (fallback automático)
const AI_MODELS = [
  "openai/gpt-5-mini",
  "openai/gpt-5",
  "openai/gpt-5-nano",
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const OCR_PROMPT = `Você é um sistema de OCR de altíssima precisão para documentos trabalhistas brasileiros.

TAREFA CRÍTICA: Extraia ABSOLUTAMENTE TODO o texto deste documento. A precisão é OBRIGATÓRIA — este dado será usado em cálculos judiciais.

REGRAS INVIOLÁVEIS:
1. Mantenha EXATAMENTE a formatação original (parágrafos, listas, tabelas, cabeçalhos)
2. Para documentos com múltiplas páginas: marque "--- PÁGINA X ---" antes de cada página
3. Para tabelas: use formato markdown com | para colunas. EXTRAIA TODOS os valores numéricos de TODAS as colunas e linhas
4. Para texto manuscrito: transcreva e marque com [manuscrito: texto]
5. Para carimbos/assinaturas: marque [carimbo] ou [assinatura]
6. Para valores monetários: mantenha formatação brasileira (R$ 1.234,56) — NUNCA arredonde
7. Para datas: mantenha formato brasileiro (DD/MM/AAAA)
8. NÃO resuma, interprete ou omita NADA
9. Se algum texto estiver ilegível: marque [ilegível] e tente uma segunda leitura
10. Extraia TODOS os números, mesmo de tabelas complexas com muitas colunas
11. Para holerites: extraia TODAS as verbas (código, descrição, referência, vencimentos, descontos)
12. Para cartões de ponto: extraia TODAS as marcações de TODOS os dias
13. Para TRCT: extraia TODOS os campos incluindo bases de cálculo, médias e totais
14. Para contracheques: extraia cabeçalho completo (empresa, CNPJ, funcionário, CPF, cargo, admissão, competência)

CAMPOS CRÍTICOS QUE NUNCA PODEM FALTAR (quando presentes no documento):
- Nome completo do empregado e empregador
- CPF/CNPJ
- Data de admissão e demissão
- Cargo/Função
- Salário base e remuneração total
- Todos os códigos e valores de verbas
- Período de referência
- Jornada de trabalho
- FGTS depositado e saldo
- Férias (períodos aquisitivo e concessivo)

Após o texto, adicione OBRIGATORIAMENTE:
---METADADOS---
páginas_detectadas: N
confiança_ocr: 0.XX (sua estimativa de 0 a 1, seja HONESTO)
tipo_documento: (holerite/ctps/contrato/ponto/fgts/trct/peticao/sentenca/extrato/outro)
campos_extraidos: lista dos campos principais encontrados separados por vírgula
texto_ilegivel: sim/não
qualidade_imagem: boa/media/ruim

Responda APENAS com o texto extraído e metadados, sem explicações adicionais.`;

// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para converter ArrayBuffer para base64 de forma segura
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Processar em chunks para evitar stack overflow em arquivos grandes
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// Validação do resultado do OCR
function validateOcrResult(text: string, mimeType: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!text || text.trim().length < 20) {
    issues.push("Texto extraído muito curto (menos de 20 caracteres)");
  }
  
  // Se for PDF/imagem de documento trabalhista, deve ter dados mínimos
  if (text.length > 0 && text.length < 100) {
    issues.push("Texto suspeitamente curto para um documento");
  }
  
  // Verificar se não é resposta do modelo em vez de OCR
  const aiPhrases = ["como posso ajudar", "não consigo", "sou um modelo", "desculpe"];
  for (const phrase of aiPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      issues.push(`Resposta do modelo detectada em vez de OCR: "${phrase}"`);
    }
  }
  
  return { valid: issues.length === 0, issues };
}

// Extração de metadados estruturados do resultado
function parseOcrMetadata(extractedContent: string): {
  text: string;
  pageCount: number;
  confidence: number;
  docType: string;
  fieldsExtracted: string[];
  imageQuality: string;
} {
  const metadataSplit = extractedContent.split("---METADADOS---");
  const text = metadataSplit[0].trim();
  const metadataText = metadataSplit[1] || "";
  
  // Contagem de páginas
  const pageMatches = text.match(/---\s*PÁGINA\s*\d+\s*---/gi) || [];
  let pageCount = pageMatches.length;
  const paginasMatch = metadataText.match(/páginas_detectadas:\s*(\d+)/i);
  if (paginasMatch) {
    pageCount = Math.max(pageCount, parseInt(paginasMatch[1], 10));
  }
  pageCount = Math.max(pageCount, 1);
  
  // Confiança
  let confidence = 0.85;
  const confiancaMatch = metadataText.match(/confiança_ocr:\s*([\d.]+)/i);
  if (confiancaMatch) {
    confidence = parseFloat(confiancaMatch[1]);
  }
  
  // Tipo de documento
  let docType = "outro";
  const tipoMatch = metadataText.match(/tipo_documento:\s*(\S+)/i);
  if (tipoMatch) {
    docType = tipoMatch[1].trim();
  }
  
  // Campos extraídos
  let fieldsExtracted: string[] = [];
  const camposMatch = metadataText.match(/campos_extraidos:\s*(.+)/i);
  if (camposMatch) {
    fieldsExtracted = camposMatch[1].split(",").map(s => s.trim()).filter(Boolean);
  }
  
  // Qualidade da imagem
  let imageQuality = "media";
  const qualidadeMatch = metadataText.match(/qualidade_imagem:\s*(\S+)/i);
  if (qualidadeMatch) {
    imageQuality = qualidadeMatch[1].trim();
  }
  
  return { text, pageCount, confidence, docType, fieldsExtracted, imageQuality };
}

// Função principal de OCR com retry e fallback de modelos
async function extractTextWithVision(
  fileUrl: string,
  mimeType: string,
  apiKey: string
): Promise<{
  text: string;
  pageCount: number;
  confidence: number;
  docType: string;
  fieldsExtracted: string[];
  imageQuality: string;
  modelUsed: string;
  attempts: number;
}> {
  console.log(`[OCR] Starting extraction for ${mimeType}`);
  
  // Baixar o arquivo com retry
  let fileBuffer: ArrayBuffer | null = null;
  for (let dl = 0; dl < 3; dl++) {
    try {
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Download failed: ${fileResponse.status}`);
      }
      fileBuffer = await fileResponse.arrayBuffer();
      console.log(`[OCR] File downloaded: ${fileBuffer.byteLength} bytes`);
      break;
    } catch (err) {
      console.error(`[OCR] Download attempt ${dl + 1} failed:`, err);
      if (dl === 2) throw new Error(`Failed to download file after 3 attempts: ${err}`);
      await delay(1000);
    }
  }
  
  if (!fileBuffer || fileBuffer.byteLength === 0) {
    throw new Error("Downloaded file is empty");
  }
  
  // Validar tamanho (Gemini aceita até ~20MB em base64)
  if (fileBuffer.byteLength > 20 * 1024 * 1024) {
    console.warn(`[OCR] File is large: ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
  }
  
  const base64Data = arrayBufferToBase64(fileBuffer);
  console.log(`[OCR] Base64 encoded: ${base64Data.length} chars`);
  
  let lastError: Error | null = null;
  let totalAttempts = 0;
  
  // Tentar cada modelo com retries
  for (const model of AI_MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      totalAttempts++;
      console.log(`[OCR] Attempt ${totalAttempts}: model=${model}, retry=${attempt}/${MAX_RETRIES}`);
      
      try {
        const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: OCR_PROMPT },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Data}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 64000,
            temperature: 0.02,
          }),
        });
        
        if (!visionResponse.ok) {
          const errorText = await visionResponse.text();
          console.error(`[OCR] API error ${visionResponse.status}: ${errorText.substring(0, 200)}`);
          
          // Se for rate limit, esperar mais
          if (visionResponse.status === 429) {
            await delay(RETRY_DELAY_MS * attempt * 2);
            continue;
          }
          
          // Se for erro do servidor, tentar de novo
          if (visionResponse.status >= 500) {
            await delay(RETRY_DELAY_MS * attempt);
            continue;
          }
          
          // Erro 4xx diferente de 429 — trocar modelo
          lastError = new Error(`API ${visionResponse.status}: ${errorText.substring(0, 100)}`);
          break;
        }
        
        const visionData = await visionResponse.json();
        const extractedContent = visionData.choices?.[0]?.message?.content || "";
        
        if (!extractedContent) {
          console.warn(`[OCR] Empty response from ${model}`);
          lastError = new Error("Empty response from Vision API");
          await delay(RETRY_DELAY_MS);
          continue;
        }
        
        // Validar resultado
        const metadata = parseOcrMetadata(extractedContent);
        const validation = validateOcrResult(metadata.text, mimeType);
        
        if (!validation.valid) {
          console.warn(`[OCR] Validation failed: ${validation.issues.join("; ")}`);
          lastError = new Error(`Validation: ${validation.issues.join("; ")}`);
          
          // Se texto muito curto, pode ser problema do modelo — tentar outro
          if (metadata.text.length < 20) {
            break; // próximo modelo
          }
          await delay(RETRY_DELAY_MS);
          continue;
        }
        
        console.log(`[OCR] SUCCESS: ${metadata.text.length} chars, ${metadata.pageCount} pages, confidence=${metadata.confidence}, type=${metadata.docType}, model=${model}`);
        
        return {
          ...metadata,
          modelUsed: model,
          attempts: totalAttempts,
        };
        
      } catch (err) {
        console.error(`[OCR] Exception on attempt ${totalAttempts}:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
    
    console.warn(`[OCR] Model ${model} exhausted retries, trying next model...`);
  }
  
  throw new Error(`OCR failed after ${totalAttempts} attempts across ${AI_MODELS.length} models. Last error: ${lastError?.message}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id is required" }),
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

    // Buscar documento
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*, cases!inner(criado_por)")
      .eq("id", document_id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar permissão
    if (document.cases.criado_por !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this document" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obter URL do arquivo (com fallback para signed URL)
    let fileUrl = document.arquivo_url;
    if (!fileUrl && document.storage_path) {
      const { data: signedUrlData } = await supabase.storage
        .from("juriscalculo-documents")
        .createSignedUrl(document.storage_path, 3600);
      fileUrl = signedUrlData?.signedUrl;
    }
    if (!fileUrl && document.storage_path) {
      // Fallback: tentar bucket alternativo
      const { data: signedUrlData2 } = await supabase.storage
        .from("case-documents")
        .createSignedUrl(document.storage_path, 3600);
      fileUrl = signedUrlData2?.signedUrl;
    }

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "No file URL available for this document" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OCR] Starting for document ${document_id}, file: ${document.file_name}`);

    // Atualizar status para em processamento
    await supabase
      .from("documents")
      .update({
        status: "ocr_running",
        processing_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", document_id);

    try {
      // Detectar MIME type com fallback
      let mimeType = document.mime_type || "application/pdf";
      if (!mimeType || mimeType === "application/octet-stream") {
        const fileName = (document.file_name || document.storage_path || "").toLowerCase();
        if (fileName.endsWith(".pdf")) mimeType = "application/pdf";
        else if (fileName.endsWith(".png")) mimeType = "image/png";
        else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) mimeType = "image/jpeg";
        else if (fileName.endsWith(".webp")) mimeType = "image/webp";
        else if (fileName.endsWith(".tiff") || fileName.endsWith(".tif")) mimeType = "image/tiff";
        else mimeType = "application/pdf";
      }

      // Executar OCR blindado
      const result = await extractTextWithVision(fileUrl, mimeType, OPENAI_API_KEY);

      console.log(`[OCR] COMPLETED: ${result.text.length} chars, ${result.pageCount} pages, confidence=${result.confidence}, model=${result.modelUsed}, attempts=${result.attempts}`);

      // Atualizar documento com resultado completo
      await supabase
        .from("documents")
        .update({
          status: "ocr_done",
          page_count: result.pageCount,
          ocr_confidence: result.confidence,
          ocr_confianca: result.confidence,
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
          metadata: {
            ...(document.metadata || {}),
            ocr_completed_at: new Date().toISOString(),
            text_length: result.text.length,
            extracted_text_preview: result.text.substring(0, 500),
            ocr_model_used: result.modelUsed,
            ocr_attempts: result.attempts,
            ocr_doc_type: result.docType,
            ocr_fields_extracted: result.fieldsExtracted,
            ocr_image_quality: result.imageQuality,
          },
        })
        .eq("id", document_id);

      return new Response(
        JSON.stringify({
          success: true,
          document_id,
          status: "ocr_done",
          page_count: result.pageCount,
          text_length: result.text.length,
          confidence: result.confidence,
          doc_type: result.docType,
          fields_extracted: result.fieldsExtracted,
          image_quality: result.imageQuality,
          model_used: result.modelUsed,
          attempts: result.attempts,
          extracted_text: result.text,
          message: "OCR completed successfully. Call chunk-and-embed to continue.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (ocrError) {
      console.error("[OCR] FINAL FAILURE:", ocrError);
      
      const errorMsg = ocrError instanceof Error ? ocrError.message : "OCR failed after all retries";
      
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: errorMsg,
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          retry_count: (document.retry_count || 0) + 1,
          metadata: {
            ...(document.metadata || {}),
            ocr_failed_at: new Date().toISOString(),
            ocr_error: errorMsg,
          },
        })
        .eq("id", document_id);

      throw ocrError;
    }

  } catch (error) {
    console.error("[OCR] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
