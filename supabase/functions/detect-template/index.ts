// =====================================================
// EDGE FUNCTION: DETECTOR DE TEMPLATE + PARSER VERSIONADO
// Detecta layout do documento e extrai dados estruturados
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Template signatures for detection
const TEMPLATE_SIGNATURES: Record<string, { patterns: RegExp[]; version: string; type: string }[]> = {
  FICHA_FINANCEIRA: [
    { patterns: [/Ficha\s+Financeira/i, /Clas\.\s*=\s*PGTO/i, /Competência/i], version: "v3", type: "ficha_financeira_v3" },
    { patterns: [/Ficha\s+Financeira/i, /PGTO|PAGO|Vencimentos/i], version: "v2", type: "ficha_financeira_v2" },
    { patterns: [/Ficha\s+Financeira/i], version: "v1", type: "ficha_financeira_v1" },
  ],
  CONTRACHEQUE: [
    { patterns: [/Demonstrativo\s+de\s+Pagamento/i, /Vencimentos|Proventos/i, /Descontos/i], version: "v2", type: "contracheque_v2" },
    { patterns: [/Contra[- ]?cheque|Recibo\s+de\s+Pagamento|Holerite/i], version: "v1", type: "contracheque_v1" },
  ],
  CARTAO_PONTO: [
    { patterns: [/Cart[aã]o\s+de\s+Ponto/i, /Entrada|Sa[ií]da|Intervalo/i], version: "v2", type: "cartao_ponto_v2" },
    { patterns: [/Frequ[eê]ncia|Jornada|Ponto/i, /Entrada|Sa[ií]da/i], version: "v1", type: "cartao_ponto_v1" },
  ],
  CTPS: [
    { patterns: [/CTPS|Carteira\s+de\s+Trabalho/i, /Admiss[aã]o|Contrato/i], version: "v1", type: "ctps_v1" },
  ],
};

interface DetectionResult {
  pipeline_type: string;
  template_detected: string;
  template_version: string;
  confidence: number;
  empresa_detectada: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
}

function detectTemplate(text: string): DetectionResult {
  let bestMatch: DetectionResult = {
    pipeline_type: "DESCONHECIDO",
    template_detected: "unknown",
    template_version: "v0",
    confidence: 0,
    empresa_detectada: null,
    periodo_inicio: null,
    periodo_fim: null,
  };

  for (const [pipeType, templates] of Object.entries(TEMPLATE_SIGNATURES)) {
    for (const tmpl of templates) {
      const matched = tmpl.patterns.filter(p => p.test(text)).length;
      const conf = matched / tmpl.patterns.length;
      if (conf > bestMatch.confidence) {
        bestMatch = {
          pipeline_type: pipeType,
          template_detected: tmpl.type,
          template_version: tmpl.version,
          confidence: conf,
          empresa_detectada: null,
          periodo_inicio: null,
          periodo_fim: null,
        };
      }
    }
  }

  // Extract empresa (CNPJ pattern)
  const cnpjMatch = text.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
  if (cnpjMatch) bestMatch.empresa_detectada = cnpjMatch[1];

  // Extract period (common date patterns)
  const dateMatches = text.match(/(\d{2}\/\d{2}\/\d{4})/g) || [];
  if (dateMatches.length >= 2) {
    const dates = dateMatches.map(d => {
      const [dd, mm, yyyy] = d.split("/");
      return `${yyyy}-${mm}-${dd}`;
    }).sort();
    bestMatch.periodo_inicio = dates[0];
    bestMatch.periodo_fim = dates[dates.length - 1];
  }

  // Also try YYYY-MM format
  const compMatches = text.match(/(\d{4}[-\/]\d{2})/g) || [];
  if (compMatches.length > 0) {
    const comps = compMatches.map(c => c.replace("/", "-")).sort();
    if (!bestMatch.periodo_inicio) bestMatch.periodo_inicio = comps[0] + "-01";
    if (!bestMatch.periodo_fim) bestMatch.periodo_fim = comps[comps.length - 1] + "-01";
  }

  return bestMatch;
}

// =====================================================
// PARSERS VERSIONADOS
// =====================================================

interface ParsedItem {
  field_key: string;
  valor: string;
  confidence: number;
  page?: number;
  evidence_text: string;
  competencia?: string;
  target_table?: string;
  target_field?: string;
}

function parseFichaFinanceiraV3(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = text.split("\n");
  
  // Detect competencias from header row
  const competencias: string[] = [];
  const compRegex = /(?:Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)[\s\/]?\d{2,4}/gi;
  const yearRegex = /20\d{2}/;
  
  for (const line of lines.slice(0, 10)) {
    const matches = line.match(compRegex);
    if (matches && matches.length >= 3) {
      const yearMatch = text.match(yearRegex);
      const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
      const monthMap: Record<string, string> = {
        jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
        jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
      };
      for (const m of matches) {
        const mo = m.slice(0, 3).toLowerCase();
        if (monthMap[mo]) competencias.push(`${year}-${monthMap[mo]}`);
      }
      break;
    }
  }
  
  // Parse rubrica lines: Código | Descrição | Clas. | valores...
  const rubricaRegex = /^(\d{3,5})\s+(.+?)\s+(PGTO|DESC|BASE|ENCAR)\s+([\d.,\s]+)/;
  
  for (const line of lines) {
    const match = line.match(rubricaRegex);
    if (!match) continue;
    
    const [, codigo, descricao, clas, valoresStr] = match;
    const valores = valoresStr.trim().split(/\s+/).map(v => parseFloat(v.replace(/\./g, "").replace(",", ".")));
    
    for (let i = 0; i < valores.length && i < competencias.length; i++) {
      if (isNaN(valores[i]) || valores[i] === 0) continue;
      
      items.push({
        field_key: `rubrica_${codigo}_${competencias[i]}`,
        valor: String(valores[i]),
        confidence: clas === "PGTO" ? 0.95 : 0.85,
        evidence_text: line.trim().slice(0, 200),
        competencia: competencias[i],
        target_table: "pjecalc_rubrica_raw",
        target_field: clas === "PGTO" ? "valor_pgto" : `valor_${clas.toLowerCase()}`,
      });
    }
  }
  
  return items;
}

function parseContrachequeV1(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  
  // Extract competencia from header
  const compMatch = text.match(/(?:Ref(?:erência)?|Competência|Mês)[:\s]*(\d{2})[\/\-](\d{4})/i);
  const competencia = compMatch ? `${compMatch[2]}-${compMatch[1]}` : null;
  
  // Parse vencimentos section
  const venLines = text.split("\n");
  let inVencimentos = false;
  
  for (const line of venLines) {
    if (/Vencimentos|Proventos/i.test(line)) { inVencimentos = true; continue; }
    if (/Descontos|Líquido/i.test(line)) { inVencimentos = false; continue; }
    
    if (inVencimentos) {
      // Pattern: codigo descricao valor OR descricao valor
      const match = line.match(/^(\d{3,5})?\s*(.+?)\s+([\d.,]+)\s*$/);
      if (match) {
        const [, codigo, descricao, valorStr] = match;
        const valor = parseFloat(valorStr.replace(/\./g, "").replace(",", "."));
        if (!isNaN(valor) && valor > 0) {
          items.push({
            field_key: `vencimento_${(codigo || "0000").trim()}_${competencia || "unknown"}`,
            valor: String(valor),
            confidence: 0.80,
            evidence_text: line.trim().slice(0, 200),
            competencia: competencia || undefined,
            target_table: "pjecalc_rubrica_raw",
            target_field: "valor_pgto",
          });
        }
      }
    }
  }
  
  return items;
}

function parseCartaoPontoV1(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  
  // Extract dates and times
  // Common format: DD/MM/YYYY HH:MM HH:MM HH:MM HH:MM
  const dayRegex = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+([\d:]+)\s+([\d:]+)(?:\s+([\d:]+)\s+([\d:]+))?/g;
  let match;
  
  while ((match = dayRegex.exec(text)) !== null) {
    const [fullMatch, dd, mm, yyyy, entrada, saida_int, retorno_int, saida_final] = match;
    const dataISO = `${yyyy}-${mm}-${dd}`;
    
    let freq = `${entrada}-${saida_int || saida_int}`;
    if (retorno_int && saida_final) {
      freq = `${entrada}-${saida_int}\n${retorno_int}-${saida_final}`;
    }
    
    items.push({
      field_key: `ponto_${dataISO}`,
      valor: freq,
      confidence: 0.85,
      evidence_text: fullMatch.trim().slice(0, 200),
      competencia: `${yyyy}-${mm}`,
      target_table: "pjecalc_apuracao_diaria",
      target_field: "frequencia_str",
    });
  }
  
  return items;
}

function parseCTPS(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  
  // Admissão
  const admMatch = text.match(/(?:Admiss[ãa]o|Data\s+de\s+Admiss[ãa]o)[:\s]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i);
  if (admMatch) {
    items.push({
      field_key: "data_admissao",
      valor: `${admMatch[3]}-${admMatch[2]}-${admMatch[1]}`,
      confidence: 0.95,
      evidence_text: admMatch[0],
      target_table: "pjecalc_calculos",
      target_field: "data_admissao",
    });
  }
  
  // Demissão
  const demMatch = text.match(/(?:Demiss[ãa]o|Sa[ií]da|Desligamento)[:\s]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i);
  if (demMatch) {
    items.push({
      field_key: "data_demissao",
      valor: `${demMatch[3]}-${demMatch[2]}-${demMatch[1]}`,
      confidence: 0.95,
      evidence_text: demMatch[0],
      target_table: "pjecalc_calculos",
      target_field: "data_demissao",
    });
  }
  
  // Cargo/Função
  const cargoMatch = text.match(/(?:Fun[çc][ãa]o|Cargo)[:\s]*([A-ZÀ-Ú\s]+)/i);
  if (cargoMatch) {
    items.push({
      field_key: "funcao",
      valor: cargoMatch[1].trim(),
      confidence: 0.85,
      evidence_text: cargoMatch[0],
      target_table: "pjecalc_calculos",
      target_field: "funcao",
    });
  }
  
  // Férias (pattern: período aquisitivo + gozo)
  const feriasRegex = /(?:F[ée]rias|Per[íi]odo\s+Aquisitivo)[:\s]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s*(?:a|até|→|-)\s*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/gi;
  let fMatch;
  let fIdx = 0;
  while ((fMatch = feriasRegex.exec(text)) !== null) {
    items.push({
      field_key: `ferias_${fIdx}`,
      valor: JSON.stringify({
        aquisitivo_inicio: `${fMatch[3]}-${fMatch[2]}-${fMatch[1]}`,
        aquisitivo_fim: `${fMatch[6]}-${fMatch[5]}-${fMatch[4]}`,
      }),
      confidence: 0.80,
      evidence_text: fMatch[0],
      target_table: "pjecalc_evento_intervalo",
      target_field: "ferias",
    });
    fIdx++;
  }
  
  // Afastamentos
  const afastRegex = /(?:Afastamento|Licença|Atestado|Suspens[ãa]o)[:\s]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s*(?:a|até|→|-)\s*(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s*(?:[-–]\s*)?([A-ZÀ-Ú\s]+)?/gi;
  let aMatch;
  let aIdx = 0;
  while ((aMatch = afastRegex.exec(text)) !== null) {
    items.push({
      field_key: `afastamento_${aIdx}`,
      valor: JSON.stringify({
        inicio: `${aMatch[3]}-${aMatch[2]}-${aMatch[1]}`,
        fim: `${aMatch[6]}-${aMatch[5]}-${aMatch[4]}`,
        motivo: (aMatch[7] || "").trim(),
      }),
      confidence: 0.80,
      evidence_text: aMatch[0],
      target_table: "pjecalc_evento_intervalo",
      target_field: "afastamento",
    });
    aIdx++;
  }
  
  return items;
}

function runParser(templateType: string, text: string): ParsedItem[] {
  switch (templateType) {
    case "ficha_financeira_v3":
    case "ficha_financeira_v2":
    case "ficha_financeira_v1":
      return parseFichaFinanceiraV3(text);
    case "contracheque_v2":
    case "contracheque_v1":
      return parseContrachequeV1(text);
    case "cartao_ponto_v2":
    case "cartao_ponto_v1":
      return parseCartaoPontoV1(text);
    case "ctps_v1":
      return parseCTPS(text);
    default:
      return [];
  }
}

// =====================================================
// VALIDAÇÕES DETERMINÍSTICAS
// =====================================================

interface ValidationWarning {
  tipo: string;
  mensagem: string;
  severidade: "info" | "warning" | "error";
  campo?: string;
  competencia?: string;
}

function validateExtractions(items: ParsedItem[], templateType: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  // Check for low confidence items
  const lowConf = items.filter(i => i.confidence < 0.7);
  if (lowConf.length > 0) {
    warnings.push({
      tipo: "LOW_CONFIDENCE",
      mensagem: `${lowConf.length} item(ns) com confiança abaixo de 70%`,
      severidade: "warning",
    });
  }
  
  // Check for missing competencias
  const noComp = items.filter(i => !i.competencia && i.target_table === "pjecalc_rubrica_raw");
  if (noComp.length > 0) {
    warnings.push({
      tipo: "MISSING_COMPETENCIA",
      mensagem: `${noComp.length} rubrica(s) sem competência detectada`,
      severidade: "error",
    });
  }
  
  // For ficha financeira: check PGTO sum consistency
  if (templateType.startsWith("ficha_financeira")) {
    const byComp = new Map<string, number>();
    for (const item of items) {
      if (item.target_field === "valor_pgto" && item.competencia) {
        byComp.set(item.competencia, (byComp.get(item.competencia) || 0) + parseFloat(item.valor));
      }
    }
    if (byComp.size === 0) {
      warnings.push({
        tipo: "NO_PGTO",
        mensagem: "Nenhuma rubrica PGTO encontrada. Verifique se o documento está correto.",
        severidade: "error",
      });
    }
  }
  
  // For cartão de ponto: check date continuity
  if (templateType.startsWith("cartao_ponto")) {
    if (items.length === 0) {
      warnings.push({
        tipo: "NO_DAYS",
        mensagem: "Nenhum dia extraído do cartão de ponto",
        severidade: "error",
      });
    }
  }
  
  return warnings;
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, text, case_id, user_id, use_llm_fallback } = await req.json();

    if (!text || !case_id) {
      return new Response(
        JSON.stringify({ error: "text and case_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Detect template
    const detection = detectTemplate(text);
    console.log(`Template detected: ${detection.template_detected} (${detection.confidence})`);

    // 2. Run deterministic parser
    let parsedItems = runParser(detection.template_detected, text);
    
    // 3. If low yield and LLM fallback requested, mark for review
    if (parsedItems.length < 3 && use_llm_fallback) {
      // Items from LLM fallback get lower confidence and REVISAR status
      // The actual LLM call would go through parse-ficha-financeira edge function
      console.log("Low parser yield, marking for LLM fallback");
    }

    // 4. Validate
    const validationWarnings = validateExtractions(parsedItems, detection.template_detected);

    // 5. Create pipeline record
    const { data: pipeline, error: pipeErr } = await supabase
      .from("document_pipeline")
      .insert({
        document_id: document_id || crypto.randomUUID(),
        case_id,
        user_id: user_id || "00000000-0000-0000-0000-000000000000",
        pipeline_type: detection.pipeline_type as any,
        hash: null,
        pages_count: null,
        empresa_detectada: detection.empresa_detectada,
        template_detectado: detection.template_detected,
        template_version: detection.template_version,
        periodo_detectado_inicio: detection.periodo_inicio,
        periodo_detectado_fim: detection.periodo_fim,
        status: validationWarnings.some(w => w.severidade === "error") ? "pendente_revisao" : "extraido",
        validation_warnings: validationWarnings,
      })
      .select("id")
      .single();

    if (pipeErr) {
      console.error("Pipeline insert error:", pipeErr);
      throw new Error("Failed to create pipeline record: " + pipeErr.message);
    }

    // 6. Insert extraction items
    if (parsedItems.length > 0 && pipeline) {
      const extItems = parsedItems.map(item => ({
        pipeline_id: pipeline.id,
        case_id,
        field_key: item.field_key,
        valor: item.valor,
        confidence: item.confidence,
        page: item.page || null,
        evidence_text: item.evidence_text,
        source_doc_id: document_id || null,
        status: item.confidence >= 0.85 ? "AUTO" : "REVISAR",
        target_table: item.target_table || null,
        target_field: item.target_field || null,
        competencia: item.competencia || null,
      }));

      const { error: extErr } = await supabase
        .from("extracao_item")
        .insert(extItems);

      if (extErr) console.error("Extraction items insert error:", extErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pipeline_id: pipeline?.id,
        detection,
        items_count: parsedItems.length,
        items_auto: parsedItems.filter(i => i.confidence >= 0.85).length,
        items_revisar: parsedItems.filter(i => i.confidence < 0.85).length,
        validation_warnings: validationWarnings,
        has_errors: validationWarnings.some(w => w.severidade === "error"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("detect-template error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
