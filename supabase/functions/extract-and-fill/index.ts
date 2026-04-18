// =====================================================
// EDGE FUNCTION: EXTRACT-AND-FILL
// OCR via Mistral API + Extração Estruturada via OpenAI
// Auto-Preenchimento PJe-Calc
// =====================================================
// IMPROVEMENTS v2:
// 1. Native PDF text extraction (skip OCR for digital PDFs)
// 2. Deterministic regex parsers before AI
// 3. Template cache by CNPJ/empresa
// 4. Cross-document validation
// 5. Post-extraction completeness check
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ocrBytes } from "../_shared/mistral-ocr.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// =====================================================
// IMPROVEMENT #1: NATIVE PDF TEXT EXTRACTION
// Detect digital PDFs and extract text without OCR
// =====================================================

async function tryNativePdfExtraction(pdfBytes: Uint8Array): Promise<{
  text: string;
  method: "native" | "ocr-needed";
  quality: "good" | "poor";
  pageCount: number;
}> {
  try {
    // Simple PDF text extraction: look for text streams in the PDF
    // This works for digitally-created PDFs (not scanned)
    const pdfStr = new TextDecoder("latin1").decode(pdfBytes);
    
    // Count pages
    const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g) || [];
    const pageCount = Math.max(pageMatches.length, 1);
    
    // Extract text between BT/ET markers (text objects in PDF)
    const textObjects: string[] = [];
    const btEtRegex = /BT\s([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(pdfStr)) !== null) {
      const block = match[1];
      // Extract text from Tj, TJ, and ' operators
      const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
      const tjArrMatches = block.match(/\[([^\]]*)\]\s*TJ/gi) || [];
      
      for (const tj of tjMatches) {
        const textMatch = tj.match(/\(([^)]*)\)/);
        if (textMatch) textObjects.push(textMatch[1]);
      }
      for (const tjArr of tjArrMatches) {
        const innerTexts = tjArr.match(/\(([^)]*)\)/g) || [];
        for (const it of innerTexts) {
          const m = it.match(/\(([^)]*)\)/);
          if (m) textObjects.push(m[1]);
        }
      }
    }
    
    // Also try to extract from stream content
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch;
    while ((streamMatch = streamRegex.exec(pdfStr)) !== null) {
      const content = streamMatch[1];
      // Look for readable text in uncompressed streams
      if (content.length < 50000) {
        const readableText = content.match(/\(([^)]{2,})\)/g) || [];
        for (const rt of readableText) {
          const m = rt.match(/\(([^)]+)\)/);
          if (m && /[a-zA-ZÀ-ú]/.test(m[1])) textObjects.push(m[1]);
        }
      }
    }
    
    const extractedText = textObjects.join(" ").replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
    
    // Quality check: good text has letters, numbers, and reasonable length
    const letterCount = (extractedText.match(/[a-zA-ZÀ-ú]/g) || []).length;
    const hasGoodText = extractedText.length > 500 && letterCount > 100;
    
    // Check for common labor document keywords
    const laborKeywords = ["salário", "salario", "admissão", "admissao", "demissão", "demissao", 
      "CTPS", "FGTS", "INSS", "remuneração", "remuneracao", "férias", "ferias",
      "contrato", "empregado", "empregador", "CLT", "rescisão", "rescisao"];
    const hasLaborContent = laborKeywords.some(kw => extractedText.toLowerCase().includes(kw.toLowerCase()));
    
    if (hasGoodText && hasLaborContent) {
      console.log(`[NATIVE-PDF] SUCCESS: ${extractedText.length} chars, ${letterCount} letters, ${pageCount} pages`);
      return { text: extractedText, method: "native", quality: "good", pageCount };
    }
    
    if (hasGoodText) {
      console.log(`[NATIVE-PDF] Partial: ${extractedText.length} chars but no labor keywords detected`);
      return { text: extractedText, method: "native", quality: "good", pageCount };
    }
    
    console.log(`[NATIVE-PDF] Poor quality: ${extractedText.length} chars, ${letterCount} letters — needs OCR`);
    return { text: extractedText, method: "ocr-needed", quality: "poor", pageCount };
    
  } catch (err) {
    console.warn(`[NATIVE-PDF] Extraction failed:`, err);
    return { text: "", method: "ocr-needed", quality: "poor", pageCount: 1 };
  }
}

// =====================================================
// IMPROVEMENT #2: DETERMINISTIC REGEX PARSERS
// Extract structured data from text without AI when possible
// =====================================================

interface RegexExtractionResult {
  tipo_documento?: string;
  dados_processo?: any;
  reclamante?: any;
  reclamada?: any;
  contrato?: any;
  rubricas?: any[];
  confianca_geral?: number;
  _regex_fields: string[];
}

function tryRegexExtraction(text: string): RegexExtractionResult {
  const fields: string[] = [];
  const result: RegexExtractionResult = { _regex_fields: fields };

  // CPF patterns
  const cpfMatch = text.match(/CPF[:\s]*(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2})/i);
  if (cpfMatch) {
    result.reclamante = result.reclamante || {};
    result.reclamante.cpf = cpfMatch[1].replace(/\s/g, '');
    fields.push("cpf");
  }

  // CNPJ patterns
  const cnpjMatch = text.match(/CNPJ[:\s]*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-.\s]?\d{2})/i);
  if (cnpjMatch) {
    result.reclamada = result.reclamada || {};
    result.reclamada.cnpj = cnpjMatch[1].replace(/\s/g, '');
    fields.push("cnpj");
  }

  // Processo number (CNJ format)
  const processoMatch = text.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
  if (processoMatch) {
    result.dados_processo = result.dados_processo || {};
    result.dados_processo.numero_processo = processoMatch[1];
    fields.push("numero_processo");
  }

  // Data de admissão
  const admissaoPatterns = [
    /admiss[ãa]o[:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})/i,
    /data\s*de\s*admiss[ãa]o[:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})/i,
    /admitido\s*em[:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})/i,
  ];
  for (const pat of admissaoPatterns) {
    const m = text.match(pat);
    if (m) {
      result.contrato = result.contrato || {};
      const parts = m[1].split(/[/.-]/);
      result.contrato.data_admissao = `${parts[2]}-${parts[1]}-${parts[0]}`;
      fields.push("data_admissao");
      break;
    }
  }

  // Data de demissão/rescisão
  const demissaoPatterns = [
    /demiss[ãa]o[:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})/i,
    /rescis[ãa]o[:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})/i,
    /desligamento[:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})/i,
    /afastamento[:\s]*(\d{2}[/.-]\d{2}[/.-]\d{4})/i,
  ];
  for (const pat of demissaoPatterns) {
    const m = text.match(pat);
    if (m) {
      result.contrato = result.contrato || {};
      const parts = m[1].split(/[/.-]/);
      result.contrato.data_demissao = `${parts[2]}-${parts[1]}-${parts[0]}`;
      fields.push("data_demissao");
      break;
    }
  }

  // Salário base
  const salarioPatterns = [
    /sal[áa]rio\s*(?:base|contratual|mensal)?[:\s]*R?\$?\s*([\d.,]+)/i,
    /remunera[çc][ãa]o[:\s]*R?\$?\s*([\d.,]+)/i,
  ];
  for (const pat of salarioPatterns) {
    const m = text.match(pat);
    if (m) {
      result.contrato = result.contrato || {};
      result.contrato.salario_base = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
      fields.push("salario_base");
      break;
    }
  }

  // Cargo/Função
  const cargoPatterns = [
    /(?:cargo|fun[çc][ãa]o|profiss[ãa]o)[:\s]*([A-ZÀ-Ú][a-zà-ú\s]+(?:[A-ZÀ-Ú][a-zà-ú\s]*)*)/i,
  ];
  for (const pat of cargoPatterns) {
    const m = text.match(pat);
    if (m && m[1].trim().length > 2 && m[1].trim().length < 80) {
      result.contrato = result.contrato || {};
      result.contrato.cargo_funcao = m[1].trim();
      fields.push("cargo");
      break;
    }
  }

  // Document type detection
  if (/TRCT|Termo\s*de\s*Rescis[ãa]o/i.test(text)) {
    result.tipo_documento = "trct";
  } else if (/Carteira\s*de\s*Trabalho|CTPS/i.test(text)) {
    result.tipo_documento = "ctps";
  } else if (/CART[ÃA]O\s*DE\s*PONTO|REGISTRO\s*DE\s*PONTO|FREQU[ÊE]NCIA/i.test(text)) {
    result.tipo_documento = "cartao_ponto";
  } else if (/DEMONSTRATIVO\s*DE\s*PAGAMENTO|HOLERITE|CONTRACHEQUE/i.test(text)) {
    result.tipo_documento = "holerite";
  } else if (/FICHA\s*FINANCEIRA/i.test(text)) {
    result.tipo_documento = "ficha_financeira";
  } else if (/EXTRATO\s*(DE\s*)?FGTS|FUNDO\s*DE\s*GARANTIA/i.test(text)) {
    result.tipo_documento = "extrato_fgts";
  } else if (/SENTEN[ÇC]A|AC[ÓO]RD[ÃA]O|DECIS[ÃA]O/i.test(text)) {
    result.tipo_documento = "sentenca";
  }

  // Extract monetary values from tables (holerite/ficha financeira patterns)
  if (result.tipo_documento === "holerite" || result.tipo_documento === "ficha_financeira") {
    const rubricaRegex = /(\d{3,5})\s*[-|]\s*([A-ZÀ-Ú][A-ZÀ-Ú\s./]+?)\s+(\d[\d.,]*)/g;
    const rubricas: any[] = [];
    let rubMatch;
    while ((rubMatch = rubricaRegex.exec(text)) !== null) {
      const valor = parseFloat(rubMatch[3].replace(/\./g, '').replace(',', '.'));
      if (valor > 0 && valor < 999999) {
        rubricas.push({
          codigo: rubMatch[1],
          denominacao: rubMatch[2].trim(),
          tipo: "vencimento",
          valores_mensais: [{ competencia: new Date().toISOString().slice(0, 7), valor }]
        });
      }
    }
    if (rubricas.length > 0) {
      result.rubricas = rubricas;
      fields.push(`rubricas_regex(${rubricas.length})`);
    }
  }

  if (fields.length > 0) {
    result.confianca_geral = Math.min(0.95, 0.7 + fields.length * 0.03);
  }

  return result;
}

// =====================================================
// IMPROVEMENT #3: TEMPLATE CACHE BY CNPJ
// Reuse validated mappings for same company
// =====================================================

async function tryTemplateCacheExtraction(
  supabase: any,
  cnpj: string | null,
  ocrText: string
): Promise<any | null> {
  if (!cnpj) return null;
  
  try {
    // Look for cached template mapping for this CNPJ
    const { data: cached } = await supabase
      .from("rubrica_map" as any)
      .select("*")
      .eq("empresa_cnpj", cnpj.replace(/[^\d]/g, ''))
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (!cached || cached.length === 0) return null;
    
    console.log(`[TEMPLATE-CACHE] Found ${cached.length} cached mappings for CNPJ ${cnpj}`);
    
    // Use cached rubrica mappings to extract from text
    const extractedRubricas: any[] = [];
    
    for (const mapping of cached) {
      const regex = new RegExp(mapping.regex_pattern || mapping.codigo_origem, 'gi');
      const matches = ocrText.match(regex);
      if (matches) {
        // Find value near the match
        const idx = ocrText.indexOf(matches[0]);
        const context = ocrText.substring(idx, idx + 200);
        const valorMatch = context.match(/(\d[\d.,]*\d)/);
        if (valorMatch) {
          const valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
          if (valor > 0 && valor < 999999) {
            extractedRubricas.push({
              codigo: mapping.codigo_origem,
              denominacao: mapping.nome_padronizado || mapping.nome_origem,
              tipo: mapping.tipo || "vencimento",
              categoria: mapping.categoria || "outros",
              valores_mensais: [{ competencia: new Date().toISOString().slice(0, 7), valor }]
            });
          }
        }
      }
    }
    
    if (extractedRubricas.length > 3) {
      console.log(`[TEMPLATE-CACHE] Extracted ${extractedRubricas.length} rubricas from cache`);
      return { rubricas: extractedRubricas, _from_cache: true };
    }
    
    return null;
  } catch (err) {
    console.warn("[TEMPLATE-CACHE] Error:", err);
    return null;
  }
}

// Save successful extraction as template for future use
async function saveTemplateCache(
  supabase: any,
  cnpj: string | null,
  extracted: any
) {
  if (!cnpj || !extracted.rubricas?.length) return;
  
  try {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    
    for (const rub of extracted.rubricas) {
      if (!rub.codigo || !rub.denominacao) continue;
      
      await supabase.from("rubrica_map" as any).upsert({
        empresa_cnpj: cleanCnpj,
        codigo_origem: rub.codigo,
        nome_origem: rub.denominacao,
        nome_padronizado: rub.denominacao,
        tipo: rub.tipo || "vencimento",
        categoria: rub.categoria || "outros",
        ativo: true,
      }, { onConflict: 'empresa_cnpj,codigo_origem' }).then(({ error }: any) => {
        if (error) console.warn("[TEMPLATE-CACHE] Save error:", error.message);
      });
    }
    
    console.log(`[TEMPLATE-CACHE] Saved ${extracted.rubricas.length} mappings for CNPJ ${cleanCnpj}`);
  } catch (err) {
    console.warn("[TEMPLATE-CACHE] Save failed:", err);
  }
}

// =====================================================
// IMPROVEMENT #4: CROSS-DOCUMENT VALIDATION
// Compare extracted data across documents in same case
// =====================================================

async function crossValidateExtraction(
  supabase: any,
  caseId: string,
  extracted: any,
  documentId: string
): Promise<{ warnings: string[]; conflicts: any[] }> {
  const warnings: string[] = [];
  const conflicts: any[] = [];
  
  try {
    // Get existing facts for this case
    const { data: existingFacts } = await supabase
      .from("facts")
      .select("chave, valor, origem, confianca")
      .eq("case_id", caseId);
    
    if (!existingFacts || existingFacts.length === 0) return { warnings, conflicts };
    
    const factMap = new Map(existingFacts.map((f: any) => [f.chave, f]));
    
    // Cross-validate critical fields
    const checks = [
      { key: "data_admissao", newVal: extracted.contrato?.data_admissao, label: "Data de Admissão" },
      { key: "data_demissao", newVal: extracted.contrato?.data_demissao, label: "Data de Demissão" },
      { key: "salario_base", newVal: extracted.contrato?.salario_base?.toString(), label: "Salário Base" },
      { key: "reclamante", newVal: extracted.reclamante?.nome, label: "Nome do Reclamante" },
      { key: "cnpj_reclamada", newVal: extracted.reclamada?.cnpj, label: "CNPJ da Reclamada" },
      { key: "cargo", newVal: extracted.contrato?.cargo_funcao, label: "Cargo/Função" },
    ];
    
    for (const check of checks) {
      if (!check.newVal) continue;
      const existing = factMap.get(check.key);
      if (!existing) continue;
      
      const existingVal = (existing as any).valor?.toString().trim().toLowerCase();
      const newVal = check.newVal.toString().trim().toLowerCase();
      
      if (existingVal && newVal && existingVal !== newVal) {
        // Check for date format differences
        if (check.key.startsWith("data_")) {
          const existDate = existingVal.replace(/[^\d]/g, '');
          const newDate = newVal.replace(/[^\d]/g, '');
          if (existDate === newDate) continue; // same date, different format
        }
        
        // Check for monetary value tolerance (< 1%)
        if (check.key === "salario_base") {
          const existNum = parseFloat(existingVal.replace(/[^\d.,]/g, '').replace(',', '.'));
          const newNum = parseFloat(newVal.replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(existNum) && !isNaN(newNum)) {
            const diff = Math.abs(existNum - newNum) / Math.max(existNum, newNum);
            if (diff < 0.01) continue; // within 1% tolerance
          }
        }
        
        const warning = `CONFLITO: ${check.label} — anterior: "${(existing as any).valor}" vs novo: "${check.newVal}"`;
        warnings.push(warning);
        conflicts.push({
          campo: check.key,
          valor_anterior: (existing as any).valor,
          valor_novo: check.newVal,
          descricao: warning,
          document_id: documentId,
        });
        console.warn(`[CROSS-VALIDATE] ${warning}`);
      }
    }
    
    // Cross-validate salary history: check for duplicate competencias with different values
    if (extracted.rubricas?.length > 0) {
      const { data: existingHist } = await supabase
        .from("pjecalc_hist_salarial_mes")
        .select("competencia, valor, hist_salarial_id")
        .eq("calculo_id", (await supabase.from("pjecalc_calculos").select("id").eq("case_id", caseId).maybeSingle())?.data?.id)
        .limit(500);
      
      if (existingHist?.length > 0) {
        const histMap = new Map<string, number>();
        for (const h of existingHist) {
          histMap.set(h.competencia, Number(h.valor));
        }
        
        for (const rub of extracted.rubricas) {
          if (!rub.valores_mensais) continue;
          for (const vm of rub.valores_mensais) {
            const comp = vm.competencia?.length === 7 ? vm.competencia + "-01" : vm.competencia;
            const existing = histMap.get(comp);
            if (existing !== undefined && Math.abs(existing - vm.valor) > 1) {
              warnings.push(`Salário ${rub.denominacao} comp ${vm.competencia}: existente R$ ${existing.toFixed(2)} vs novo R$ ${vm.valor.toFixed(2)}`);
            }
          }
        }
      }
    }
    
    // Store conflicts in case_controversies
    for (const conflict of conflicts) {
      await supabase.from("case_controversies").insert({
        case_id: caseId,
        campo: conflict.campo,
        descricao: conflict.descricao,
        status: "pendente",
        document_ids: [documentId],
        prioridade: "alta",
      }).then(({ error }: any) => {
        if (error) console.warn("[CROSS-VALIDATE] Insert conflict:", error.message);
      });
    }
    
  } catch (err) {
    console.warn("[CROSS-VALIDATE] Error:", err);
  }
  
  return { warnings, conflicts };
}

// =====================================================
// IMPROVEMENT #5: POST-EXTRACTION COMPLETENESS CHECK
// Verify all required data is present
// =====================================================

interface CompletenessResult {
  score: number; // 0-100
  missing: string[];
  warnings: string[];
  ready_for_liquidation: boolean;
}

function checkExtractedCompleteness(extracted: any): CompletenessResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  let maxScore = 0;
  let score = 0;
  
  // Critical fields (high weight)
  const criticalFields = [
    { key: "contrato.data_admissao", label: "Data de Admissão", weight: 15 },
    { key: "contrato.data_demissao", label: "Data de Demissão", weight: 10 },
    { key: "contrato.salario_base", label: "Salário Base", weight: 15 },
    { key: "reclamante.nome", label: "Nome do Reclamante", weight: 10 },
    { key: "reclamada.cnpj", label: "CNPJ da Reclamada", weight: 5 },
  ];
  
  // Important fields (medium weight)
  const importantFields = [
    { key: "contrato.cargo_funcao", label: "Cargo/Função", weight: 5 },
    { key: "reclamada.nome", label: "Nome da Reclamada", weight: 5 },
    { key: "dados_processo.numero_processo", label: "Número do Processo", weight: 5 },
    { key: "rubricas", label: "Histórico Salarial (Rubricas)", weight: 15, isArray: true },
  ];
  
  // Data quality checks
  const qualityFields = [
    { key: "ferias", label: "Férias", weight: 5, isArray: true },
    { key: "cartao_ponto.registros", label: "Cartão de Ponto", weight: 5, isArray: true },
    { key: "fgts", label: "Dados de FGTS", weight: 5, isObject: true },
  ];
  
  const allFields = [...criticalFields, ...importantFields, ...qualityFields];
  
  for (const field of allFields) {
    maxScore += field.weight;
    const value = getNestedValue(extracted, field.key);
    
    if ((field as any).isArray) {
      if (Array.isArray(value) && value.length > 0) {
        score += field.weight;
      } else {
        missing.push(field.label);
      }
    } else if ((field as any).isObject) {
      if (value && typeof value === 'object') {
        score += field.weight;
      } else {
        missing.push(field.label);
      }
    } else {
      if (value && value !== '' && value !== null && value !== undefined) {
        score += field.weight;
      } else {
        missing.push(field.label);
      }
    }
  }
  
  // Check period continuity if we have salary history
  if (extracted.rubricas?.length > 0) {
    const allCompetencias = new Set<string>();
    for (const rub of extracted.rubricas) {
      for (const vm of (rub.valores_mensais || [])) {
        if (vm.competencia) allCompetencias.add(vm.competencia);
      }
    }
    
    if (allCompetencias.size > 1) {
      const sorted = [...allCompetencias].sort();
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      
      // Check for gaps
      const [fy, fm] = first.split('-').map(Number);
      const [ly, lm] = last.split('-').map(Number);
      const expectedMonths = (ly - fy) * 12 + (lm - fm) + 1;
      
      if (allCompetencias.size < expectedMonths * 0.8) {
        warnings.push(`Período salarial com lacunas: ${allCompetencias.size} de ${expectedMonths} meses esperados (${first} a ${last})`);
      }
    }
  }
  
  // Check confidence level
  if (extracted.confianca_geral && extracted.confianca_geral < 0.7) {
    warnings.push(`Confiança geral baixa: ${(extracted.confianca_geral * 100).toFixed(0)}% — revisão manual recomendada`);
  }
  
  const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  
  return {
    score: finalScore,
    missing,
    warnings,
    ready_for_liquidation: finalScore >= 60 && missing.filter(m => 
      ["Data de Admissão", "Salário Base", "Nome do Reclamante"].includes(m)
    ).length === 0,
  };
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

// =====================================================
// TOOL DEFINITIONS — Structured extraction schemas
// =====================================================

const EXTRACTION_TOOLS = [
  {
    type: "function",
    function: {
      name: "extrair_dados_documento",
      description: "Extrai TODOS os dados estruturados de um documento trabalhista brasileiro (holerite, CTPS, TRCT, cartão de ponto, ficha financeira, contrato, sentença, petição). Preenche todos os campos encontrados.",
      parameters: {
        type: "object",
        properties: {
          tipo_documento: {
            type: "string",
            enum: ["holerite", "ctps", "trct", "cartao_ponto", "ficha_financeira", "contrato", "sentenca", "peticao", "extrato_fgts", "outro"],
            description: "Tipo do documento identificado"
          },
          confianca_geral: {
            type: "number",
            description: "Confiança geral da extração (0 a 1)"
          },
          // DADOS DO PROCESSO
          dados_processo: {
            type: "object",
            properties: {
              numero_processo: { type: "string", description: "Número CNJ do processo (NNNNNNN-NN.NNNN.N.NN.NNNN)" },
              vara: { type: "string" },
              tribunal: { type: "string" },
              juiz: { type: "string" },
              data_ajuizamento: { type: "string", description: "YYYY-MM-DD" },
              data_sentenca: { type: "string", description: "YYYY-MM-DD" },
            }
          },
          // DADOS DAS PARTES
          reclamante: {
            type: "object",
            properties: {
              nome: { type: "string" },
              cpf: { type: "string" },
              pis_pasep: { type: "string" },
              ctps_numero: { type: "string" },
              ctps_serie: { type: "string" },
            }
          },
          reclamada: {
            type: "object",
            properties: {
              nome: { type: "string" },
              cnpj: { type: "string" },
              razao_social: { type: "string" },
            }
          },
          // DADOS DO CONTRATO
          contrato: {
            type: "object",
            properties: {
              data_admissao: { type: "string", description: "YYYY-MM-DD" },
              data_demissao: { type: "string", description: "YYYY-MM-DD" },
              cargo_funcao: { type: "string" },
              salario_base: { type: "number", description: "Último salário base em reais" },
              tipo_demissao: { type: "string", enum: ["sem_justa_causa", "com_justa_causa", "pedido_demissao", "acordo", "outro"] },
              jornada: { type: "string", description: "Ex: 08:00 às 17:48, seg a sex" },
              carga_horaria_mensal: { type: "number", description: "Ex: 220" },
            }
          },
          // RUBRICAS / VERBAS (holerites, fichas financeiras)
          rubricas: {
            type: "array",
            description: "Todas as rubricas de pagamento encontradas",
            items: {
              type: "object",
              properties: {
                codigo: { type: "string", description: "Código da rubrica" },
                denominacao: { type: "string", description: "Nome/descrição da rubrica" },
                tipo: { type: "string", enum: ["vencimento", "desconto", "base", "informativo"] },
                categoria: {
                  type: "string",
                  enum: ["salario_base", "comissao", "hora_extra", "adicional_noturno", "dsr", "premio", "gratificacao", "periculosidade", "insalubridade", "ferias", "decimo_terceiro", "fgts", "inss", "irrf", "vale_transporte", "vale_refeicao", "outros"],
                },
                valores_mensais: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      competencia: { type: "string", description: "YYYY-MM" },
                      valor: { type: "number" },
                      referencia: { type: "string", description: "Ex: 30d, 220h, 50%" },
                    },
                    required: ["competencia", "valor"]
                  }
                }
              },
              required: ["denominacao", "tipo", "valores_mensais"]
            }
          },
          // TRCT
          trct: {
            type: "object",
            properties: {
              data_aviso_previo: { type: "string", description: "YYYY-MM-DD" },
              aviso_previo_tipo: { type: "string", enum: ["trabalhado", "indenizado", "nao_aplicavel"] },
              aviso_previo_dias: { type: "number" },
              saldo_salario_dias: { type: "number" },
              saldo_salario_valor: { type: "number" },
              decimo_terceiro_proporcional: { type: "number" },
              ferias_vencidas: { type: "number" },
              ferias_proporcionais: { type: "number" },
              terco_ferias: { type: "number" },
              fgts_mes_anterior: { type: "number" },
              fgts_mes_rescisao: { type: "number" },
              fgts_multa_40: { type: "number" },
              total_bruto: { type: "number" },
              total_descontos: { type: "number" },
              total_liquido: { type: "number" },
              verbas_rescisorias: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    codigo: { type: "string" },
                    descricao: { type: "string" },
                    valor: { type: "number" },
                    tipo: { type: "string", enum: ["vencimento", "desconto"] }
                  },
                  required: ["descricao", "valor", "tipo"]
                }
              }
            }
          },
          // CARTÃO DE PONTO
          cartao_ponto: {
            type: "object",
            properties: {
              periodo: { type: "string", description: "Ex: 01/2023 a 12/2023" },
              registros: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    data: { type: "string", description: "YYYY-MM-DD" },
                    entrada1: { type: "string", description: "HH:MM" },
                    saida1: { type: "string", description: "HH:MM" },
                    entrada2: { type: "string", description: "HH:MM" },
                    saida2: { type: "string", description: "HH:MM" },
                    entrada3: { type: "string", description: "HH:MM (se houver)" },
                    saida3: { type: "string", description: "HH:MM (se houver)" },
                    horas_normais: { type: "string" },
                    horas_extras: { type: "string" },
                    horas_noturnas: { type: "string" },
                    observacao: { type: "string", description: "Ex: FALTA, ATESTADO, FÉRIAS, FOLGA" },
                  },
                  required: ["data"]
                }
              }
            }
          },
          // FÉRIAS
          ferias: {
            type: "array",
            items: {
              type: "object",
              properties: {
                periodo_aquisitivo_inicio: { type: "string", description: "YYYY-MM-DD" },
                periodo_aquisitivo_fim: { type: "string", description: "YYYY-MM-DD" },
                gozo_inicio: { type: "string", description: "YYYY-MM-DD" },
                gozo_fim: { type: "string", description: "YYYY-MM-DD" },
                dias: { type: "number" },
                abono_pecuniario: { type: "boolean" },
                dias_abono: { type: "number" },
                situacao: { type: "string", enum: ["GOZADAS", "VENCIDAS", "PROPORCIONAIS", "INDENIZADAS"] },
              },
              required: ["periodo_aquisitivo_inicio", "periodo_aquisitivo_fim"]
            }
          },
          // FGTS
          fgts: {
            type: "object",
            properties: {
              saldo_total: { type: "number" },
              depositos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    competencia: { type: "string", description: "YYYY-MM" },
                    valor_deposito: { type: "number" },
                    saldo_apos: { type: "number" },
                  },
                  required: ["competencia", "valor_deposito"]
                }
              }
            }
          },
          // SENTENÇA — pedidos deferidos/indeferidos
          sentenca: {
            type: "object",
            properties: {
              pedidos_deferidos: {
                type: "array",
                items: { type: "string" }
              },
              pedidos_indeferidos: {
                type: "array",
                items: { type: "string" }
              },
              parametros_liquidacao: {
                type: "object",
                properties: {
                  indice_correcao: { type: "string" },
                  juros: { type: "string" },
                  data_inicio_juros: { type: "string", description: "YYYY-MM-DD" },
                  honorarios_percentual: { type: "number" },
                  custas_processuais: { type: "number" },
                }
              }
            }
          },
          // TEXTO OCR COMPLETO (para referência e chunks)
          paginas_detectadas: { type: "number" },
        },
        required: ["tipo_documento", "confianca_geral"]
      }
    }
  }
];

const SYSTEM_PROMPT = `Você é o mais preciso sistema de OCR e extração de dados para documentos trabalhistas brasileiros.

SUA MISSÃO: Extrair ABSOLUTAMENTE TODOS os dados do documento com 100% de precisão.

REGRAS DE OURO:
1. VALORES MONETÁRIOS: Use formato numérico decimal (1234.56, NÃO 1.234,56). Nunca arredonde.
2. DATAS: Sempre no formato YYYY-MM-DD (ex: 2023-01-15)
3. COMPETÊNCIAS: Sempre YYYY-MM (ex: 2023-01)
4. CPF: Mantenha formatação XXX.XXX.XXX-XX
5. CNPJ: Mantenha formatação XX.XXX.XXX/XXXX-XX
6. COMPLETUDE: Extraia TUDO. Se o documento tem 50 rubricas, retorne as 50. Se tem 365 dias de ponto, retorne os 365.
7. TABELAS: Leia TODAS as colunas e linhas sem exceção
8. TEXTO ILEGÍVEL: Marque como null, nunca invente valores
9. MÚLTIPLAS PÁGINAS: Combine dados de todas as páginas em uma estrutura única
10. CLASSIFICAÇÃO DE RUBRICAS: Identifique corretamente vencimentos vs descontos

IDENTIFICAÇÃO DE TIPO DE DOCUMENTO:
- Holerite/Contracheque: tem rubricas com códigos, vencimentos e descontos, competência mensal
- CTPS: páginas com dados do contrato, anotações gerais
- TRCT: Termo de Rescisão, com verbas rescisórias detalhadas
- Cartão de Ponto: registros diários de entrada/saída
- Ficha Financeira: tabela anual com rubricas por mês
- Extrato FGTS: movimentações de depósitos/saques
- Sentença/Acórdão: decisão judicial com pedidos deferidos
- Petição: petição inicial ou contestação

PARA HOLERITES E FICHAS FINANCEIRAS:
- Extraia TODAS as rubricas de PAGAMENTO (vencimentos)
- Extraia TODAS as rubricas de DESCONTO separadamente  
- Identifique salário base, comissões, hora extra, adicional noturno, DSR
- Para cada rubrica, extraia código, denominação, referência e valor

PARA TRCT:
- Extraia TODAS as verbas rescisórias com código e valor
- Identifique: saldo de salário, aviso prévio, 13º proporcional, férias + 1/3, FGTS
- Capture total bruto, total descontos e líquido

PARA CARTÃO DE PONTO:
- Extraia TODOS os registros diários (entrada/saída de cada período)
- Identifique dias com falta, atestado, férias, folga
- Calcule horas quando possível

O campo texto_ocr_completo DEVE conter o texto integral do documento.`;

// =====================================================
// STAGE 1: Mistral OCR
// =====================================================

async function mistralOcrPdfFromBytes(
  pdfBytes: Uint8Array,
  mistralApiKey: string,
  filename: string = "document.pdf"
): Promise<string> {
  // Pipeline Mistral OCR (padrão comprovado em produção n8n):
  //   1. POST /v1/files purpose=ocr  → file_id
  //   2. GET  /v1/files/{id}/url      → signed URL do Mistral (expiry=1h)
  //   3. POST /v1/ocr document_url    → pages markdown
  //   4. DELETE /v1/files/{id}        (cleanup async)
  //
  // NÃO passa document_url apontando para Supabase — Mistral teria de baixar
  // da Supabase a cada call, somando latência de TLS+download remoto.
  if (pdfBytes.byteLength === 0) throw new Error("PDF vazio");
  if (pdfBytes.byteLength > 50 * 1024 * 1024) {
    throw new Error(`PDF muito grande: ${(pdfBytes.byteLength / 1024 / 1024).toFixed(1)}MB (limite Mistral: 50MB)`);
  }

  const result = await ocrBytes(pdfBytes, filename, {
    apiKey: mistralApiKey,
    model: "mistral-ocr-latest",
    timeoutMs: 180_000,
    maxRetries: 3,
    retryBaseMs: 1500,
  });
  console.log(`[OCR] Mistral retornou ${result.pages.length} páginas`);

  const fullText = result.pages
    .map((p) => p.markdown || "")
    .join("\n\n---PAGE BREAK---\n\n");
  if (fullText.length < 50) {
    throw new Error(`OCR retornou pouco texto (${fullText.length} chars)`);
  }
  return fullText;
}

async function mistralOcrImage(
  base64Data: string,
  mimeType: string,
  mistralApiKey: string
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[OCR] Mistral chat attempt ${attempt} (image)`);
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mistralApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Extraia TODO o texto deste documento trabalhista brasileiro. Preserve a formatação de tabelas, valores monetários e datas exatamente como aparecem. Inclua TODAS as linhas, colunas e dados sem omitir nada. Retorne apenas o texto extraído, sem comentários." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
          }],
          max_tokens: 16000,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[OCR] Mistral ${response.status}:`, errText.substring(0, 200));
        if (response.status === 429) { await delay(RETRY_DELAY_MS * attempt * 3); continue; }
        lastError = new Error(`Mistral OCR ${response.status}`);
        if (response.status >= 500) { await delay(RETRY_DELAY_MS * attempt); continue; }
        break;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text.length > 50) {
        console.log(`[OCR] Mistral success: ${text.length} chars`);
        return text;
      }
      lastError = new Error("OCR returned too little text");
      continue;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await delay(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error(`Mistral OCR failed: ${lastError?.message}`);
}

// =====================================================
// STAGE 2: AI Structured extraction
// =====================================================

async function extractStructured(
  ocrText: string,
  openaiApiKey: string
): Promise<any> {
  // Separação de responsabilidades:
  //   - Mistral OCR: apenas OCR (PDF → texto)
  //   - OpenAI Chat: extração estruturada via function calling
  //
  // Cascata: gpt-4o-mini (rápido ~3-5s, custo baixo) → gpt-4o (fallback).
  // gpt-4o-mini resolve >95% dos docs trabalhistas com accuracy comparável
  // ao 4o para extração estruturada via tools.
  let lastError: Error | null = null;
  const models = [
    "gpt-4o-mini",
    "gpt-4o",
  ];
  const MAX_EXTRACT_RETRIES = 2;

  const maxChars = 80000;
  const truncatedOcr = ocrText.length > maxChars
    ? ocrText.substring(0, maxChars) + "\n\n[... TEXTO TRUNCADO ...]"
    : ocrText;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_EXTRACT_RETRIES; attempt++) {
      const t0 = Date.now();
      console.log(`[EXTRACT] ${model} attempt ${attempt}`);
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: `Analise o texto abaixo extraído por OCR de um documento trabalhista e extraia os dados usando a função extrair_dados_documento. NÃO repita o texto OCR na resposta. Para cartão de ponto, extraia no máximo os 60 primeiros registros diários como amostra.\n\n--- TEXTO DO DOCUMENTO ---\n${truncatedOcr}\n--- FIM DO TEXTO ---`
              },
            ],
            tools: EXTRACTION_TOOLS,
            tool_choice: { type: "function", function: { name: "extrair_dados_documento" } },
            max_tokens: 8192,
            temperature: 0.05,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[EXTRACT] ${model} ${response.status}:`, errText.substring(0, 300));
          if (response.status === 401 || response.status === 403) {
            throw new Error(
              `OPENAI_API_KEY inválida ou sem permissão (${response.status}). ` +
              `Verifique em https://platform.openai.com/api-keys — confirme que a key ` +
              `tem acesso a Chat Completions e que há créditos/billing configurado. ` +
              `Detalhe API: ${errText.substring(0, 100)}`
            );
          }
          if (response.status === 402) {
            throw new Error(
              `OpenAI sem créditos/billing (402). ` +
              `Adicione método de pagamento em https://platform.openai.com/settings/organization/billing. ` +
              `Detalhe: ${errText.substring(0, 100)}`
            );
          }
          if (response.status === 429) {
            await delay(RETRY_DELAY_MS * attempt * 3);
            lastError = new Error(`OpenAI 429 rate limit (${model})`);
            continue;
          }
          if (response.status >= 500) {
            await delay(RETRY_DELAY_MS * attempt);
            lastError = new Error(`OpenAI ${response.status} (${model})`);
            continue;
          }
          lastError = new Error(`OpenAI ${response.status}: ${errText.substring(0, 150)}`);
          break;
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall?.function?.arguments) {
          try {
            const extracted = JSON.parse(toolCall.function.arguments);
            extracted.texto_ocr_completo = ocrText;
            console.log(`[EXTRACT] SUCCESS with ${model} in ${Date.now() - t0}ms: tipo=${extracted.tipo_documento}, rubricas=${extracted.rubricas?.length || 0}`);
            return extracted;
          } catch (parseErr) {
            console.error(`[EXTRACT] JSON parse error from ${model}:`, parseErr);
            lastError = new Error("Erro ao interpretar resposta do modelo");
            continue;
          }
        }

        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (!parsed.texto_ocr_completo) parsed.texto_ocr_completo = ocrText;
            console.log(`[EXTRACT] SUCCESS (content fallback) with ${model} in ${Date.now() - t0}ms`);
            return parsed;
          } catch { /* ignore */ }
        }

        lastError = new Error("Modelo não retornou dados estruturados");
        continue;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[EXTRACT] ${model} exception:`, lastError.message);
        // Credencial inválida é fatal — aborta imediatamente.
        if (lastError.message.includes("credencial inválida")) throw lastError;
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
    console.warn(`[EXTRACT] Model ${model} exhausted, trying next...`);
  }
  throw new Error(`Extração falhou em todos os modelos OpenAI. Último erro: ${lastError?.message}`);
}

// =====================================================
// AUTO-FILL: Grava dados extraídos nas tabelas pjecalc
// =====================================================

async function autoFill(supabase: any, caseId: string, extracted: any) {
  const fills: string[] = [];

  async function safeOp(label: string, fn: () => Promise<any>) {
    try {
      const result = await fn();
      if (result?.error) {
        console.error(`[FILL] ${label}:`, result.error.message);
      } else {
        fills.push(label);
      }
    } catch (err) {
      console.error(`[FILL] ${label}:`, err);
    }
  }

  function mapTipoDemissao(val: string | undefined): string | null {
    if (!val) return null;
    const map: Record<string, string> = {
      'com_justa_causa': 'justa_causa',
      'justa_causa': 'justa_causa',
      'sem_justa_causa': 'sem_justa_causa',
      'pedido_demissao': 'pedido_demissao',
      'rescisao_indireta': 'rescisao_indireta',
      'acordo': 'acordo',
    };
    return map[val] || null;
  }

  try {
    // 0. ENSURE pjecalc_calculos exists
    let { data: calcRow } = await supabase
      .from("pjecalc_calculos")
      .select("id")
      .eq("case_id", caseId)
      .maybeSingle();

    if (!calcRow) {
      const { data: caseRow } = await supabase.from("cases").select("criado_por").eq("id", caseId).maybeSingle();
      const userId = caseRow?.criado_por;
      if (userId) {
        const { data: newCalc } = await supabase
          .from("pjecalc_calculos")
          .insert({ case_id: caseId, user_id: userId })
          .select("id")
          .single();
        calcRow = newCalc;
      }
    }

    const calculoId = calcRow?.id;
    if (!calculoId) {
      console.error("[FILL] Cannot get/create pjecalc_calculos — aborting fill");
      return fills;
    }

    // 1. DADOS DO PROCESSO
    if (extracted.dados_processo || extracted.reclamante || extracted.reclamada) {
      const dp = extracted.dados_processo || {};
      const rec = extracted.reclamante || {};
      const rda = extracted.reclamada || {};

      await safeOp("dados_processo", () =>
        supabase.from("pjecalc_calculos").update({
          processo_cnj: dp.numero_processo || undefined,
          vara: dp.vara || undefined,
          tribunal: dp.tribunal || undefined,
          reclamante_nome: rec.nome || undefined,
          reclamante_cpf: rec.cpf || undefined,
          reclamado_nome: rda.nome || rda.razao_social || undefined,
          reclamado_cnpj: rda.cnpj || undefined,
        }).eq("id", calculoId)
      );

      if (rec.nome || dp.numero_processo) {
        await supabase.from("cases").update({
          cliente: rec.nome || undefined,
          numero_processo: dp.numero_processo || undefined,
          tribunal: dp.tribunal || dp.vara || undefined,
        }).eq("id", caseId);
      }
    }

    // 2. PARÂMETROS DO CONTRATO
    if (extracted.contrato) {
      const c = extracted.contrato;
      const dp = extracted.dados_processo || {};

      await safeOp("parametros", () =>
        supabase.from("pjecalc_calculos").update({
          data_admissao: c.data_admissao || undefined,
          data_demissao: c.data_demissao || undefined,
          data_ajuizamento: dp.data_ajuizamento || undefined,
          divisor_horas: c.carga_horaria_mensal || 220,
          tipo_demissao: mapTipoDemissao(c.tipo_demissao),
        }).eq("id", calculoId)
      );

      if (c.data_admissao) {
        await safeOp("contrato_emprego", () =>
          supabase.from("employment_contracts").upsert({
            case_id: caseId,
            data_admissao: c.data_admissao,
            data_demissao: c.data_demissao || null,
            funcao: c.cargo_funcao || null,
            salario_inicial: c.salario_base || null,
            tipo_demissao: mapTipoDemissao(c.tipo_demissao),
            jornada_contratual: c.jornada ? { descricao: c.jornada, carga_mensal: c.carga_horaria_mensal || 220 } : null,
          }, { onConflict: 'case_id' })
        );
      }
    }

    // 3. HISTÓRICO SALARIAL
    if (extracted.rubricas?.length > 0) {
      const vencimentos = extracted.rubricas.filter((r: any) => r.tipo === "vencimento");

      for (const rub of vencimentos) {
        if (!rub.valores_mensais?.length && !rub.denominacao) continue;

        const tipoVar = ["salario_base"].includes(rub.categoria) ? "FIXO" : "VARIAVEL";
        const firstVal = rub.valores_mensais?.[0]?.valor || 0;

        const { data: histData, error: histErr } = await supabase
          .from("pjecalc_hist_salarial")
          .upsert({
            calculo_id: calculoId,
            nome: rub.denominacao,
            tipo_variacao: tipoVar,
            valor_fixo: firstVal,
            incide_fgts: !["vale_transporte", "vale_refeicao"].includes(rub.categoria),
            incide_inss: true,
            observacoes: rub.codigo ? `Código: ${rub.codigo}` : null,
          }, { onConflict: 'calculo_id,nome' })
          .select('id')
          .single();

        if (histErr) {
          console.error("[FILL] historico_salarial:", histErr.message);
          continue;
        }

        const histId = histData?.id;

        if (histId && rub.valores_mensais?.length > 0) {
          for (const vm of rub.valores_mensais) {
            if (!vm.competencia || vm.valor === undefined || vm.valor === null) continue;

            await supabase.from("pjecalc_hist_salarial_mes").upsert({
              calculo_id: calculoId,
              hist_salarial_id: histId,
              competencia: vm.competencia.length === 7 ? vm.competencia + "-01" : vm.competencia,
              valor: vm.valor,
              origem: "informado",
            }, { onConflict: 'hist_salarial_id,competencia' }).then(({ error }: any) => {
              if (error) console.error(`[FILL] hist_mes ${vm.competencia}:`, error.message);
            });
          }
        }
      }

      const totalMensais = vencimentos.reduce((sum: number, r: any) => sum + (r.valores_mensais?.length || 0), 0);
      fills.push(`historico_salarial (${vencimentos.length} rubricas, ${totalMensais} valores mensais)`);
    }

    // 4. VERBAS DO CÁLCULO
    if (extracted.rubricas?.length > 0) {
      const vencimentos = extracted.rubricas.filter((r: any) => r.tipo === "vencimento");

      for (const rub of vencimentos) {
        if (!rub.valores_mensais?.length) continue;

        const competencias = rub.valores_mensais.map((v: any) => v.competencia).sort();
        const periodoInicio = competencias[0] ? competencias[0] + "-01" : null;
        const periodoFim = competencias[competencias.length - 1]
          ? competencias[competencias.length - 1] + "-28"
          : null;

        await supabase.from("pjecalc_verba_base").upsert({
          calculo_id: calculoId,
          nome: rub.denominacao,
          codigo: rub.codigo || null,
          caracteristica: rub.categoria === "salario_base" ? "FIXA" : "COMUM",
          periodicidade: "MENSAL",
          multiplicador: 1,
          divisor: 1,
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          ordem: 0,
          ativa: true,
          hist_salarial_nome: rub.denominacao,
          valor: "calculado",
        }, { onConflict: 'calculo_id,nome' }).then(({ error }: any) => {
          if (error) console.error("[FILL] verbas:", error.message);
        });
      }
      fills.push(`verbas (${vencimentos.length})`);
    }

    // 5. FÉRIAS
    if (extracted.ferias?.length > 0) {
      for (const f of extracted.ferias) {
        await safeOp(`ferias_${f.periodo_aquisitivo_inicio}`, () =>
          supabase.from("pjecalc_ferias").insert({
            case_id: caseId,
            periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio,
            periodo_aquisitivo_fim: f.periodo_aquisitivo_fim,
            gozo_inicio: f.gozo_inicio || null,
            gozo_fim: f.gozo_fim || null,
            dias: f.dias || 30,
            abono: f.abono_pecuniario || false,
            dias_abono: f.dias_abono || 0,
            situacao: f.situacao || "GOZADAS",
          })
        );
      }
      fills.push(`ferias (${extracted.ferias.length})`);
    }

    // 6. CARTÃO DE PONTO
    if (extracted.cartao_ponto?.registros?.length > 0) {
      const registros = extracted.cartao_ponto.registros;
      for (let i = 0; i < registros.length; i += 50) {
        const batch = registros.slice(i, i + 50).map((r: any) => {
          const horasNormais = parseFloat(r.horas_normais) || 0;
          const horasExtras = parseFloat(r.horas_extras) || 0;
          const horasNoturnas = parseFloat(r.horas_noturnas) || 0;
          const isFalta = !r.entrada1 && /falta|ausencia|ausência/i.test(r.observacao || "");
          return {
            calculo_id: calculoId,
            data: r.data,
            frequencia_str: [r.entrada1, r.saida1, r.entrada2, r.saida2, r.entrada3, r.saida3].filter(Boolean).join(" | ") || null,
            horas_trabalhadas: horasNormais,
            horas_extras_diaria: horasExtras,
            horas_noturnas: horasNoturnas,
            minutos_trabalhados: Math.round(horasNormais * 60),
            minutos_extra_diaria: Math.round(horasExtras * 60),
            minutos_noturno: Math.round(horasNoturnas * 60),
            is_falta: isFalta,
            is_dsr: /dsr|domingo|repouso/i.test(r.observacao || ""),
            is_feriado: /feriado/i.test(r.observacao || ""),
            origem: "OCR",
          };
        });

        await supabase.from("pjecalc_apuracao_diaria").insert(batch).then(({ error }: any) => {
          if (error) console.error("[FILL] cartao_ponto batch:", error.message);
        });
      }
      fills.push(`cartao_ponto (${registros.length} dias)`);
    }

    // 7. TRCT
    if (extracted.trct) {
      const trct = extracted.trct;

      if (trct.data_aviso_previo) {
        await supabase.from("pjecalc_calculos").update({
          data_demissao: trct.data_aviso_previo,
        }).eq("id", calculoId);
      }

      if (trct.verbas_rescisorias?.length > 0) {
        for (const verba of trct.verbas_rescisorias) {
          await supabase.from("pjecalc_ocorrencias").insert({
            case_id: caseId,
            verba_nome: verba.descricao,
            competencia: extracted.contrato?.data_demissao || new Date().toISOString().slice(0, 10),
            base_valor: verba.valor || 0,
            multiplicador_valor: 1,
            divisor_valor: 1,
            quantidade_valor: 1,
            dobra: 1,
            devido: verba.tipo === "vencimento" ? verba.valor : 0,
            pago: verba.tipo === "vencimento" ? verba.valor : 0,
            diferenca: 0,
            correcao: 0,
            juros: 0,
            total: 0,
            origem: "TRCT",
            ativa: true,
          }).then(({ error }: any) => {
            if (error) console.error(`[FILL] trct_verba ${verba.descricao}:`, error.message);
          });
        }
        fills.push(`trct_verbas (${trct.verbas_rescisorias.length})`);
      }

      const trctFacts: Array<{chave: string; valor: string}> = [];
      if (trct.total_bruto) trctFacts.push({ chave: "trct_total_bruto", valor: String(trct.total_bruto) });
      if (trct.total_liquido) trctFacts.push({ chave: "trct_total_liquido", valor: String(trct.total_liquido) });
      if (trct.total_descontos) trctFacts.push({ chave: "trct_total_descontos", valor: String(trct.total_descontos) });
      if (trct.fgts_multa_40) trctFacts.push({ chave: "trct_fgts_multa_40", valor: String(trct.fgts_multa_40) });
      if (trct.aviso_previo_tipo) trctFacts.push({ chave: "aviso_previo_tipo", valor: trct.aviso_previo_tipo });
      if (trct.aviso_previo_dias) trctFacts.push({ chave: "aviso_previo_dias", valor: String(trct.aviso_previo_dias) });
      if (trct.saldo_salario_valor) trctFacts.push({ chave: "saldo_salario", valor: String(trct.saldo_salario_valor) });
      if (trct.decimo_terceiro_proporcional) trctFacts.push({ chave: "13_proporcional_trct", valor: String(trct.decimo_terceiro_proporcional) });
      if (trct.ferias_proporcionais) trctFacts.push({ chave: "ferias_proporcionais_trct", valor: String(trct.ferias_proporcionais) });

      for (const fact of trctFacts) {
        await supabase.from("facts").upsert({
          case_id: caseId,
          chave: fact.chave,
          valor: fact.valor,
          tipo: "moeda",
          origem: "ia_extracao",
          confianca: extracted.confianca_geral || 0.9,
        }, { onConflict: 'case_id,chave' }).then(({ error }: any) => {
          if (error) console.error(`[FILL] fact ${fact.chave}:`, error.message);
        });
      }
      if (trctFacts.length > 0) fills.push(`trct_fatos (${trctFacts.length})`);
    }

    // 8. FGTS
    if (extracted.fgts) {
      await safeOp("fgts_config", () =>
        supabase.from("pjecalc_calculos").update({
          multa_477_habilitada: true,
        }).eq("id", calculoId)
      );

      if (extracted.fgts.depositos?.length > 0) {
        for (const dep of extracted.fgts.depositos) {
          await supabase.from("facts").upsert({
            case_id: caseId,
            chave: `fgts_deposito_${dep.competencia}`,
            valor: String(dep.valor_deposito),
            tipo: "moeda",
            origem: "ia_extracao",
            confianca: extracted.confianca_geral || 0.9,
          }, { onConflict: 'case_id,chave' });
        }
        fills.push(`fgts_depositos (${extracted.fgts.depositos.length})`);
      }
      if (extracted.fgts.saldo_total) {
        await supabase.from("facts").upsert({
          case_id: caseId,
          chave: "fgts_saldo_total",
          valor: String(extracted.fgts.saldo_total),
          tipo: "moeda",
          origem: "ia_extracao",
        }, { onConflict: 'case_id,chave' });
      }
    }

    // 9. SENTENÇA
    if (extracted.sentenca) {
      const sent = extracted.sentenca;

      if (sent.pedidos_deferidos?.length > 0) {
        for (let i = 0; i < sent.pedidos_deferidos.length; i++) {
          const pedido = sent.pedidos_deferidos[i];
          await supabase.from("pjecalc_verba_base").upsert({
            calculo_id: calculoId,
            nome: pedido,
            caracteristica: "COMUM",
            periodicidade: "MENSAL",
            multiplicador: 1,
            divisor: 1,
            ordem: i,
            ativa: true,
            valor: "calculado",
            observacoes: "Deferido em sentença",
          }, { onConflict: 'calculo_id,nome' }).then(({ error }: any) => {
            if (error) console.error(`[FILL] verba_sentenca ${pedido.substring(0, 60)}:`, error.message);
          });
        }
        fills.push(`sentenca_pedidos (${sent.pedidos_deferidos.length} deferidos)`);
      }

      if (sent.pedidos_indeferidos?.length > 0) {
        await supabase.from("facts").upsert({
          case_id: caseId,
          chave: "pedidos_indeferidos",
          valor: sent.pedidos_indeferidos.join("; "),
          tipo: "texto",
          origem: "ia_extracao",
        }, { onConflict: 'case_id,chave' });
      }

      if (sent.parametros_liquidacao) {
        const pl = sent.parametros_liquidacao;

        if (pl.honorarios_percentual) {
          await supabase.from("pjecalc_calculos").update({
            honorarios_percentual: pl.honorarios_percentual,
            honorarios_sobre: 'condenacao',
          }).eq("id", calculoId);
          fills.push("honorarios_sentenca");
        }

        if (pl.custas_processuais) {
          await safeOp("custas_sentenca", () =>
            supabase.from("pjecalc_calculos").update({
              custas_percentual: 2,
              custas_limite: pl.custas_processuais,
            }).eq("id", calculoId)
          );
        }

        if (pl.indice_correcao) {
          await supabase.from("facts").upsert({
            case_id: caseId, chave: "indice_correcao", valor: pl.indice_correcao, tipo: "texto", origem: "ia_extracao",
          }, { onConflict: 'case_id,chave' });
        }
        if (pl.juros) {
          await supabase.from("facts").upsert({
            case_id: caseId, chave: "juros_mora", valor: pl.juros, tipo: "texto", origem: "ia_extracao",
          }, { onConflict: 'case_id,chave' });
        }
        if (pl.data_inicio_juros) {
          await supabase.from("facts").upsert({
            case_id: caseId, chave: "data_inicio_juros", valor: pl.data_inicio_juros, tipo: "data", origem: "ia_extracao",
          }, { onConflict: 'case_id,chave' });
        }

        fills.push("sentenca_parametros");
      }
    }

    // 10. FALTAS
    if (extracted.cartao_ponto?.registros?.length > 0) {
      const faltas = extracted.cartao_ponto.registros.filter(
        (r: any) => r.observacao && /falta|ausencia|ausência/i.test(r.observacao) && !r.entrada1
      );
      for (const falta of faltas) {
        await supabase.from("pjecalc_faltas").insert({
          case_id: caseId,
          data_inicial: falta.data,
          data_final: falta.data,
          tipo_falta: "FALTA",
          justificada: /atestado|justificad/i.test(falta.observacao || ""),
          motivo: falta.observacao,
        }).then(({ error }: any) => {
          if (error) console.error(`[FILL] falta ${falta.data}:`, error.message);
        });
      }
      if (faltas.length > 0) fills.push(`faltas (${faltas.length})`);
    }

    // 11. FACTS
    const allFacts: Array<{chave: string; valor: string; tipo: string}> = [];

    const rec = extracted.reclamante || {};
    const rda = extracted.reclamada || {};
    const cont = extracted.contrato || {};
    const dp = extracted.dados_processo || {};

    if (rec.nome) allFacts.push({ chave: "reclamante", valor: rec.nome, tipo: "texto" });
    if (rec.cpf) allFacts.push({ chave: "cpf_reclamante", valor: rec.cpf, tipo: "texto" });
    if (rec.pis_pasep) allFacts.push({ chave: "pis_pasep", valor: rec.pis_pasep, tipo: "texto" });
    if (rec.ctps_numero) allFacts.push({ chave: "ctps_numero", valor: rec.ctps_numero, tipo: "texto" });
    if (rec.ctps_serie) allFacts.push({ chave: "ctps_serie", valor: rec.ctps_serie, tipo: "texto" });
    if (rda.nome || rda.razao_social) allFacts.push({ chave: "reclamada", valor: rda.nome || rda.razao_social, tipo: "texto" });
    if (rda.cnpj) allFacts.push({ chave: "cnpj_reclamada", valor: rda.cnpj, tipo: "texto" });
    if (cont.data_admissao) allFacts.push({ chave: "data_admissao", valor: cont.data_admissao, tipo: "data" });
    if (cont.data_demissao) allFacts.push({ chave: "data_demissao", valor: cont.data_demissao, tipo: "data" });
    if (cont.cargo_funcao) allFacts.push({ chave: "cargo", valor: cont.cargo_funcao, tipo: "texto" });
    if (cont.salario_base) allFacts.push({ chave: "salario_base", valor: String(cont.salario_base), tipo: "moeda" });
    if (cont.jornada) allFacts.push({ chave: "jornada_contratual", valor: cont.jornada, tipo: "texto" });
    if (cont.carga_horaria_mensal) allFacts.push({ chave: "carga_horaria", valor: String(cont.carga_horaria_mensal), tipo: "numero" });
    if (cont.tipo_demissao) allFacts.push({ chave: "tipo_demissao", valor: cont.tipo_demissao, tipo: "texto" });
    if (dp.numero_processo) allFacts.push({ chave: "numero_processo", valor: dp.numero_processo, tipo: "texto" });
    if (dp.vara) allFacts.push({ chave: "vara", valor: dp.vara, tipo: "texto" });
    if (dp.tribunal) allFacts.push({ chave: "tribunal", valor: dp.tribunal, tipo: "texto" });
    if (dp.data_ajuizamento) allFacts.push({ chave: "data_ajuizamento", valor: dp.data_ajuizamento, tipo: "data" });
    if (dp.data_sentenca) allFacts.push({ chave: "data_sentenca", valor: dp.data_sentenca, tipo: "data" });

    if (allFacts.length > 0) {
      for (const fact of allFacts) {
        await supabase.from("facts").upsert({
          case_id: caseId,
          chave: fact.chave,
          valor: fact.valor,
          tipo: fact.tipo as any,
          origem: "ia_extracao",
          confianca: extracted.confianca_geral || 0.9,
          confirmado: true,
        }, { onConflict: 'case_id,chave' }).then(({ error }: any) => {
          if (error) console.error(`[FILL] fact ${fact.chave}:`, error.message);
        });
      }
      fills.push(`facts (${allFacts.length})`);
    }

    // 12. AUTO-CONFIGURE MODULES
    await autoConfigureModules(supabase, caseId, extracted, fills);

  } catch (err) {
    console.error("[FILL] Global error:", err);
  }

  return fills;
}

async function autoConfigureModules(supabase: any, caseId: string, extracted: any, fills: string[]) {
  await new Promise(r => setTimeout(r, 500));

  const { data: calculoRow } = await supabase
    .from("pjecalc_calculos")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();

  if (!calculoRow) return;
  const calcId = calculoRow.id;

  const { error: calcErr } = await supabase.from("pjecalc_calculos").update({
    honorarios_percentual: extracted.sentenca?.parametros_liquidacao?.honorarios_percentual || 15,
    honorarios_sobre: 'condenacao',
    custas_percentual: 2,
    custas_limite: 10.64,
    multa_477_habilitada: true,
    multa_467_habilitada: false,
    data_liquidacao: new Date().toISOString().slice(0, 10),
  }).eq("id", calcId);
  if (calcErr) console.error("[FILL] calculos config:", calcErr.message);
  else fills.push("modulos_config");

  const { data: existCorrecao } = await supabase
    .from("pjecalc_atualizacao_config")
    .select("id, regime_padrao")
    .eq("calculo_id", calcId)
    .eq("tipo", "correcao")
    .maybeSingle();

  if (!existCorrecao) {
    await supabase.from("pjecalc_atualizacao_config").insert({
      calculo_id: calcId,
      tipo: "correcao",
      regime_padrao: "IPCA-E",
    });
  }

  const { data: existJuros } = await supabase
    .from("pjecalc_atualizacao_config")
    .select("id")
    .eq("calculo_id", calcId)
    .eq("tipo", "juros")
    .maybeSingle();

  if (!existJuros) {
    await supabase.from("pjecalc_atualizacao_config").insert({
      calculo_id: calcId,
      tipo: "juros",
      regime_padrao: "simples_mensal",
    });
  }
}

// =====================================================
// ENHANCED BACKGROUND PROCESSING
// Now with: native PDF, regex, template cache, cross-validation, completeness
// =====================================================

async function processDocumentInBackground(
  document_id: string,
  _fileUrl: string,
  doc: any,
  _MISTRAL_API_KEY: string,
  OPENAI_API_KEY: string,
  supabase: any,
  ocrTextOverride?: string,
  markValidated?: boolean,
) {
  try {
    let ocrText: string;
    let extractionMethod = "ocr";
    const tPipeline0 = Date.now();

    // ============ SHORTCUT: OCR texto validado pelo usuário ============
    // Quando vem do split view de validação, já temos o texto finalizado
    // — pula OCR completamente e vai direto pra extração estruturada.
    // Arquitetura simples: extract-and-fill só roda com ocr_text já disponível.
    // O OCR é responsabilidade SEPARADA do `ocr-document`, chamado diretamente
    // pelo frontend (com auth do usuário) antes do split view de validação.
    //
    // Isso evita toda a complexidade de delegação entre edge functions
    // (auth forwarding, scope de variáveis, RLS, etc.) que estava causando
    // cascata de bugs.
    if (ocrTextOverride && ocrTextOverride.trim().length >= 20) {
      console.log(`[EXTRACT] Using validated OCR text from user (${ocrTextOverride.length} chars)`);
      ocrText = ocrTextOverride;
      extractionMethod = "validated_ocr";
    } else if (doc.ocr_text && typeof doc.ocr_text === "string" && doc.ocr_text.length >= 50) {
      console.log(`[EXTRACT] Using persisted ocr_text from documents row (${doc.ocr_text.length} chars)`);
      ocrText = doc.ocr_text;
      extractionMethod = "persisted_ocr";
    } else {
      throw new Error(
        "Documento ainda não tem texto OCR. Rode o OCR primeiro (botão 'Rodar OCR' no split view) e só depois confirme a extração."
      );
    }
    console.log(`[EXTRACT] Text ready: ${ocrText.length} chars via ${extractionMethod}`);

    // ============ IMPROVEMENT #2: Try regex extraction first ============
    const regexResult = tryRegexExtraction(ocrText);
    console.log(`[EXTRACT] Regex pre-extraction: ${regexResult._regex_fields.length} fields found: [${regexResult._regex_fields.join(", ")}]`);

    // ============ IMPROVEMENT #3: Try template cache ============
    const detectedCnpj = regexResult.reclamada?.cnpj || null;
    const cachedResult = await tryTemplateCacheExtraction(supabase, detectedCnpj, ocrText);
    if (cachedResult) {
      console.log(`[EXTRACT] Template cache hit: ${cachedResult.rubricas?.length || 0} rubricas from cache`);
    }

    // Stage 2: AI structured extraction (always run for complete data)
    const fullOcrText = ocrText;
    const tExtract = Date.now();
    const extracted = await extractStructured(ocrText, OPENAI_API_KEY);
    console.log(`[TIMING] extract_structured_total=${Date.now() - tExtract}ms`);
    extracted.texto_ocr_completo = fullOcrText;
    ocrText = "";

    // Merge regex results into extracted (regex wins for fields it found)
    if (regexResult._regex_fields.length > 0) {
      if (regexResult.tipo_documento && !extracted.tipo_documento) {
        extracted.tipo_documento = regexResult.tipo_documento;
      }
      if (regexResult.dados_processo) {
        extracted.dados_processo = { ...(extracted.dados_processo || {}), ...regexResult.dados_processo };
      }
      if (regexResult.reclamante) {
        extracted.reclamante = { ...(extracted.reclamante || {}), ...regexResult.reclamante };
      }
      if (regexResult.reclamada) {
        extracted.reclamada = { ...(extracted.reclamada || {}), ...regexResult.reclamada };
      }
      if (regexResult.contrato) {
        extracted.contrato = { ...(extracted.contrato || {}), ...regexResult.contrato };
      }
    }

    // Pre-create pjecalc_calculos
    let userId = doc.owner_user_id;
    if (!userId) {
      const { data: caseRow } = await supabase.from("cases").select("criado_por").eq("id", doc.case_id).maybeSingle();
      userId = caseRow?.criado_por;
    }
    if (userId) {
      const { data: existingCalc } = await supabase
        .from("pjecalc_calculos")
        .select("id")
        .eq("case_id", doc.case_id)
        .maybeSingle();
      if (!existingCalc) {
        await supabase.from("pjecalc_calculos").insert({
          case_id: doc.case_id,
          user_id: userId,
        });
      }
    }

    // ============ IMPROVEMENT #4: Cross-document validation ============
    const crossValidation = await crossValidateExtraction(supabase, doc.case_id, extracted, document_id);
    if (crossValidation.warnings.length > 0) {
      console.warn(`[EXTRACT] Cross-validation warnings: ${crossValidation.warnings.join(" | ")}`);
    }

    // Auto-fill pjecalc tables
    const tFill = Date.now();
    const fills = await autoFill(supabase, doc.case_id, extracted);
    console.log(`[TIMING] auto_fill=${Date.now() - tFill}ms fills=${fills.length}`);
    console.log(`[TIMING] PIPELINE_TOTAL=${Date.now() - tPipeline0}ms`);

    // ============ IMPROVEMENT #3b: Save template cache ============
    const cnpjForCache = extracted.reclamada?.cnpj || detectedCnpj;
    await saveTemplateCache(supabase, cnpjForCache, extracted);

    // ============ IMPROVEMENT #5: Post-extraction completeness check ============
    const completeness = checkExtractedCompleteness(extracted);
    console.log(`[EXTRACT] Completeness: ${completeness.score}%, missing: [${completeness.missing.join(", ")}], ready: ${completeness.ready_for_liquidation}`);

    const extractedOcrText = extracted.texto_ocr_completo || "";
    const updatePayload: Record<string, unknown> = {
      status: "extracted",
      tipo: extracted.tipo_documento || doc.tipo,
      page_count: extracted.paginas_detectadas || 1,
      ocr_confidence: extracted.confianca_geral || 0.9,
      ocr_confianca: extracted.confianca_geral || 0.9,
      processing_completed_at: new Date().toISOString(),
      error_message: null,
    };
    // Se o usuário mandou ocr_text_override + mark_validated, marca validação
    // (e preserva o texto validado para referência futura).
    if (markValidated) {
      updatePayload.ocr_validated = true;
      updatePayload.ocr_validated_at = new Date().toISOString();
      updatePayload.ocr_validated_by = doc.owner_user_id || null;
    }
    // Se veio texto validado pelo usuário, atualiza ocr_text com a versão final
    // (usuário pode ter editado o texto no split view).
    if (ocrTextOverride) {
      updatePayload.ocr_text = ocrTextOverride.slice(0, 10_000_000);
    }
    await supabase.from("documents").update({
      ...updatePayload,
      metadata: {
        ...(doc.metadata || {}),
        extraction_completed_at: new Date().toISOString(),
        extraction_method: extractionMethod,
        text_length: extractedOcrText.length,
        extracted_text_preview: extractedOcrText.substring(0, 500),
        tipo_detectado: extracted.tipo_documento,
        rubricas_extraidas: extracted.rubricas?.length || 0,
        auto_fill_fields: fills,
        has_contrato: !!extracted.contrato,
        has_trct: !!extracted.trct,
        has_cartao_ponto: !!extracted.cartao_ponto?.registros?.length,
        has_ferias: !!extracted.ferias?.length,
        has_sentenca: !!extracted.sentenca,
        // New v2 metadata
        regex_fields_extracted: regexResult._regex_fields,
        template_cache_used: !!cachedResult,
        cross_validation_warnings: crossValidation.warnings,
        cross_validation_conflicts: crossValidation.conflicts.length,
        completeness_score: completeness.score,
        completeness_missing: completeness.missing,
        completeness_warnings: completeness.warnings,
        ready_for_liquidation: completeness.ready_for_liquidation,
      },
    }).eq("id", document_id);

    // Store extracted text as chunks
    if (extractedOcrText.length > 100) {
      await supabase.from("document_chunks").delete().eq("document_id", document_id);
      await supabase.from("doc_chunks").delete().eq("document_id", document_id);

      const chunkSize = 1000;
      const overlap = 200;
      const chunks: any[] = [];
      let start = 0;
      let idx = 0;

      while (start < extractedOcrText.length) {
        const end = Math.min(start + chunkSize, extractedOcrText.length);
        chunks.push({
          case_id: doc.case_id,
          document_id,
          content: extractedOcrText.substring(start, end),
          page_number: 1,
          chunk_index: idx,
          doc_type: extracted.tipo_documento || doc.tipo || "outro",
          metadata: { index: idx, char_count: end - start },
        });
        idx++;
        start = end - overlap;
        if (start >= extractedOcrText.length) break;
      }

      if (chunks.length > 0) {
        const { error: chunkErr } = await supabase.from("document_chunks").insert(chunks);
        if (chunkErr) console.error("[EXTRACT] Chunk insert error:", chunkErr.message);
      }
    }

    console.log(`[EXTRACT] COMPLETE: tipo=${extracted.tipo_documento}, method=${extractionMethod}, fills=[${fills.join(", ")}], completeness=${completeness.score}%`);

  } catch (extractError) {
    console.error("[EXTRACT] FAILURE:", extractError);
    await supabase.from("documents").update({
      status: "failed",
      error_message: extractError instanceof Error ? extractError.message : "Unknown error",
      processing_completed_at: new Date().toISOString(),
    }).eq("id", document_id);
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const document_id: string | undefined = body?.document_id;
    // Texto OCR validado pelo usuário no split view — quando presente,
    // pula a fase de OCR (já foi feita antes) e usa este texto direto.
    const ocr_text_override: string | undefined = body?.ocr_text;
    // Flag opcional: marcar o documento como validado ao concluir.
    const mark_validated: boolean = body?.mark_validated === true;

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Helper: registra o erro no documento para que a UI veja a causa real
    // mesmo se o cliente supabase-js mostrar só "non-2xx status code".
    const bail400 = async (payload: { error: string; hint?: string }) => {
      await supabase.from("documents").update({
        status: "failed",
        error_message: [payload.error, payload.hint].filter(Boolean).join(" — ").slice(0, 1000),
        processing_completed_at: new Date().toISOString(),
      }).eq("id", document_id);
      return new Response(
        JSON.stringify(payload),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    };

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      return bail400({
        error: "MISTRAL_API_KEY não configurada no Supabase",
        hint: "Adicione a secret MISTRAL_API_KEY (usada para OCR) em Edge Functions → Secrets.",
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return bail400({
        error: "OPENAI_API_KEY não configurada no Supabase",
        hint: "Adicione a secret OPENAI_API_KEY (usada para extração estruturada) em Edge Functions → Secrets. Gere em https://platform.openai.com/api-keys",
      });
    }

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SEMPRE regenera signed URL a partir de storage_path — `arquivo_url` pode
    // estar expirado (URLs assinadas do upload-document têm TTL de 1h).
    // Só usa `arquivo_url` se storage_path estiver ausente.
    let fileUrl: string | null = null;
    if (doc.storage_path) {
      for (const bucket of ["juriscalculo-documents", "case-documents"]) {
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(doc.storage_path, 7200); // 2h para processamento longo
        if (signed?.signedUrl) {
          fileUrl = signed.signedUrl;
          break;
        }
      }
    }
    if (!fileUrl) fileUrl = doc.arquivo_url;

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "No file URL available (storage_path e arquivo_url ambos ausentes)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[EXTRACT] Starting for document ${document_id}: ${doc.file_name}`);

    await supabase.from("documents").update({
      status: "extracting",
      processing_started_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", document_id);

    (globalThis as any).EdgeRuntime?.waitUntil?.(
      processDocumentInBackground(document_id!, fileUrl, doc, MISTRAL_API_KEY, OPENAI_API_KEY, supabase, ocr_text_override, mark_validated)
    ) ?? processDocumentInBackground(document_id!, fileUrl, doc, MISTRAL_API_KEY, OPENAI_API_KEY, supabase, ocr_text_override, mark_validated);

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        status: "processing",
        message: "Extração iniciada em background. Acompanhe pelo status do documento.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[EXTRACT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
