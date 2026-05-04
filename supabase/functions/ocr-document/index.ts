// =====================================================
// ocr-document — versão simplificada (match n8n workflow)
// =====================================================
// Mimics o fluxo do n8n que funciona em produção:
//   1. POST /v1/files (upload PDF/imagem)        → file_id
//   2. GET  /v1/files/{id}/url                   → signed URL Mistral
//   3. POST /v1/ocr  { document_url: ... }       → resultado
//   4. DELETE /v1/files/{id}                     (cleanup, best-effort)
//
// Diferente da versão anterior: SEM splitting, SEM parallel chunks, SEM
// retryWeakPages, SEM native PDF extraction, SEM EdgeRuntime.waitUntil.
// Síncrono — handler não retorna até o OCR completar (Mistral leva 5-15s
// na média; edge timeout é 150s, com folga 10x).
//
// Vantagens:
//   - 1 ponto de falha (chamada Mistral), não 5
//   - Cliente recebe resultado direto, sem polling
//   - Sem background tasks que podem ser killed silenciosamente
//   - Match 1:1 com workflow n8n já comprovado em produção
//
// Limites:
//   - Mistral OCR API aceita até 50MB / 1000 páginas. Limitamos em 30MB
//     pra ter folga no edge runtime payload limit.
//   - PDFs maiores: usuário deve dividir manualmente.
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { ocrBytes, runOcr, type MistralOcrOptions } from "../_shared/mistral-ocr.ts";

const ABSOLUTE_MAX_BYTES = 30 * 1024 * 1024; // 30MB

const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"]);

/** Helper inline pra evitar import pesado de pdf-utils. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function detectMimeFromName(name: string | null | undefined): string {
  if (!name) return "application/pdf";
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/pdf";
}

async function downloadBytes(url: string): Promise<ArrayBuffer> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Falha ao baixar arquivo do storage: ${resp.status} ${resp.statusText}`);
  }
  return resp.arrayBuffer();
}

// =====================================================
// Auto-detect tipo_extracao (espelho de §5 do spec)
// =====================================================
// Inline no edge function porque Deno não importa src/. Mantido em sync
// manualmente com src/features/data-extraction/classification/auto-detect-tipo.ts.
// Tests vivem no client; mudança aqui exige PR matched.
// =====================================================

type EdgeAutoDetectResult = {
  tipo:
    | "nao_extrair"
    | "holerite"
    | "recibo_ferias"
    | "registro_faltas"
    | "cartao_ponto";
  confianca: "alta" | "media" | "baixa";
  motivos: string[];
};

function autoDetectTipoExtracaoEdge(ocrText: string): EdgeAutoDetectResult {
  if (!ocrText || ocrText.trim().length < 50) {
    return { tipo: "nao_extrair", confianca: "baixa", motivos: ["OCR muito curto"] };
  }

  const SINAIS_HOLERITE: Array<{ pattern: RegExp; pontos: number; motivo: string }> = [
    { pattern: /\b(recibo\s+de\s+pagamento|holerite|contracheque|contra-?cheque)\b/i, pontos: 10, motivo: "cabeçalho de holerite" },
    { pattern: /\bvencimentos\b[\s\S]*?\bdescontos\b/i, pontos: 8, motivo: "colunas vencimentos/descontos" },
    { pattern: /\bbase\s+(de\s+)?c[áa]lculo\s+(do\s+)?(inss|fgts|irrf)\b/i, pontos: 6, motivo: "base de cálculo INSS/FGTS" },
    { pattern: /\brefer[êe]ncia\b[\s\S]*?\b\d{2}\/\d{4}\b/i, pontos: 4, motivo: "campo referência MM/AAAA" },
    { pattern: /\b(comiss[õo]es?|dsr|pr[êe]mio)\b/i, pontos: 3, motivo: "rubrica típica de holerite" },
  ];
  const SINAIS_FERIAS: Array<{ pattern: RegExp; pontos: number; motivo: string }> = [
    { pattern: /\b(recibo|aviso|comunicado)\s+de\s+f[ée]rias\b/i, pontos: 10, motivo: "cabeçalho de férias" },
    { pattern: /\bper[íi]odo\s+aquisitivo\b/i, pontos: 8, motivo: "menção a período aquisitivo" },
    { pattern: /\bper[íi]odo\s+de\s+gozo\b/i, pontos: 6, motivo: "menção a período de gozo" },
    { pattern: /\babono\s+pecuni[áa]rio\b/i, pontos: 4, motivo: "abono pecuniário" },
    { pattern: /\b1\/3\s+constitucional\b|\bter[çc]o\s+constitucional\b/i, pontos: 4, motivo: "terço constitucional" },
  ];
  const SINAIS_FALTAS: Array<{ pattern: RegExp; pontos: number; motivo: string }> = [
    { pattern: /\b(folha|registro|controle)\s+de\s+(faltas|frequ[êe]ncia)\b/i, pontos: 10, motivo: "cabeçalho de faltas" },
    { pattern: /\batestado\s+m[ée]dico\b/i, pontos: 8, motivo: "atestado médico" },
    { pattern: /\bcid[\s:-]+[a-z]\d{2}/i, pontos: 6, motivo: "código CID" },
    { pattern: /\baus[êe]ncia\s+(injustificada|justificada)\b/i, pontos: 6, motivo: "ausência justificada/injustificada" },
  ];
  // Sinais de cartão-ponto sincronizados com o client
  // (src/features/data-extraction/classification/auto-detect-tipo.ts).
  const SINAIS_CARTAO_PONTO: Array<{ pattern: RegExp; pontos: number; motivo: string }> = [
    { pattern: /\bcart[ãa]o\s+de\s+ponto\b|\bespelho\s+de\s+ponto\b/i, pontos: 10, motivo: "cabeçalho cartão/espelho de ponto" },
    { pattern: /\bjornada\s+de\s+trabalho\b/i, pontos: 8, motivo: "jornada de trabalho" },
    { pattern: /\bbatidas?\b[\s\S]{0,50}?\b(entrada|sa[íi]da)\b/i, pontos: 6, motivo: "colunas batidas/entrada/saída" },
    { pattern: /\b(entrada)\b[\s\S]{0,40}?\b(sa[íi]da)\b[\s\S]{0,40}?\b(entrada)\b[\s\S]{0,40}?\b(sa[íi]da)\b/i, pontos: 4, motivo: "duplas entrada/saída" },
    { pattern: /\b\d{2}\/\d{2}\/\d{4}\b[\s\S]{0,100}?\b\d{1,2}:\d{2}\b[\s\S]{0,30}?\b\d{1,2}:\d{2}\b/i, pontos: 4, motivo: "data + múltiplos horários" },
  ];

  const score = (sinais: Array<{ pattern: RegExp; pontos: number; motivo: string }>) => {
    let pontos = 0;
    const motivos: string[] = [];
    for (const s of sinais) {
      if (s.pattern.test(ocrText)) {
        pontos += s.pontos;
        motivos.push(s.motivo);
      }
    }
    return { pontos, motivos };
  };

  const scores: Record<string, { pontos: number; motivos: string[] }> = {
    holerite: score(SINAIS_HOLERITE),
    recibo_ferias: score(SINAIS_FERIAS),
    registro_faltas: score(SINAIS_FALTAS),
    cartao_ponto: score(SINAIS_CARTAO_PONTO),
  };

  const ordered = Object.entries(scores).sort((a, b) => b[1].pontos - a[1].pontos);
  const [tipoMelhor, dadoMelhor] = ordered[0];
  const segundo = ordered[1]?.[1].pontos ?? 0;

  if (dadoMelhor.pontos < 6) {
    return { tipo: "nao_extrair", confianca: "baixa", motivos: ["Sinais insuficientes para classificação automática"] };
  }
  if (dadoMelhor.pontos - segundo < 4) {
    return {
      tipo: "nao_extrair",
      confianca: "baixa",
      motivos: [`Empate técnico entre ${tipoMelhor} (${dadoMelhor.pontos}) e segundo lugar (${segundo})`],
    };
  }
  return {
    tipo: tipoMelhor as EdgeAutoDetectResult["tipo"],
    confianca: dadoMelhor.pontos >= 12 ? "alta" : "media",
    motivos: dadoMelhor.motivos,
  };
}

const AUTO_EXTRACTION_RATE_LIMIT_PER_CASE = 30;
const AUTO_EXTRACTION_RATE_WINDOW_MS = 60 * 60 * 1000;

function detectDocType(text: string): string {
  const t = text.toLowerCase().slice(0, 5000);
  if (/cart[ãa]o\s*(de\s*)?ponto|espelho\s*de\s*ponto/.test(t)) return "cartao_ponto";
  if (/holerite|contracheque|recibo\s*de\s*pagamento|sal[áa]rio.*l[íi]quido/.test(t)) return "holerite";
  if (/ficha\s*financeira/.test(t)) return "ficha_financeira";
  if (/ctps|carteira\s*de\s*trabalho/.test(t)) return "ctps";
  if (/contrato\s*de\s*trabalho|contrato\s*individual/.test(t)) return "contrato";
  if (/sentença|senten[çc]a|ac[óo]rd[ãa]o|despacho/.test(t)) return "sentenca";
  if (/conven[çc][ãa]o\s*coletiva|cct|acordo\s*coletivo/.test(t)) return "cct";
  if (/extrato\s*fgts|fgts\s*pf/.test(t)) return "fgts";
  if (/peti[çc][ãa]o\s*inicial|exordial/.test(t)) return "peticao";
  if (/trct|termo\s*de\s*rescis[ãa]o/.test(t)) return "trct";
  return "outro";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const document_id: string | undefined = body?.document_id;
    if (!document_id) return jsonResponse({ error: "document_id obrigatório" }, 400);

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      return jsonResponse({ error: "MISTRAL_API_KEY não configurado nas Edge Function Secrets." }, 500);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization header obrigatório" }, 401);

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Token inválido" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Carrega doc + ownership check
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*, cases!inner(criado_por)")
      .eq("id", document_id)
      .single();
    if (docError || !document) return jsonResponse({ error: "Documento não encontrado" }, 404);
    if (document.cases.criado_por !== user.id) {
      return jsonResponse({ error: "Sem acesso a este documento" }, 403);
    }

    // Idempotência: se já está processando, não duplica.
    if (document.status === "ocr_running") {
      const startedAt = document.processing_started_at
        ? new Date(document.processing_started_at).getTime()
        : 0;
      const elapsedMs = Date.now() - startedAt;
      const STALE_AFTER_MS = 60 * 1000; // 60s — versão simplificada não fica > 30s
      if (elapsedMs < STALE_AFTER_MS) {
        return jsonResponse(
          { error: "OCR já em execução", hint: `Processamento iniciou há ${Math.round(elapsedMs / 1000)}s.` },
          409,
        );
      }
      console.warn(`[ocr] doc ${document_id} 'ocr_running' há ${Math.round(elapsedMs / 1000)}s — recuperando`);
    }

    // Regenera signed URL pra storage (URL salva no upload pode ter expirado).
    let fileUrl: string | null = null;
    if (document.storage_path) {
      const buckets = ["juriscalculo-documents", "case-documents", "documents"];
      for (const b of buckets) {
        const { data } = await supabase.storage.from(b).createSignedUrl(document.storage_path, 7200);
        if (data?.signedUrl) {
          fileUrl = data.signedUrl;
          break;
        }
      }
    }
    if (!fileUrl) fileUrl = (document.arquivo_url as string | null) ?? null;
    if (!fileUrl) return jsonResponse({ error: "Sem URL de download para o documento" }, 400);

    // Marca em processamento
    await supabase
      .from("documents")
      .update({
        status: "ocr_running",
        processing_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null,
        ocr_chunks_total: 1,
        ocr_chunks_done: 0,
      })
      .eq("id", document_id);

    const t0 = Date.now();

    try {
      const buffer = await downloadBytes(fileUrl);
      const sizeBytes = buffer.byteLength;
      if (sizeBytes > ABSOLUTE_MAX_BYTES) {
        throw new Error(
          `Arquivo tem ${(sizeBytes / 1024 / 1024).toFixed(1)}MB, acima do limite de ${(ABSOLUTE_MAX_BYTES / 1024 / 1024).toFixed(0)}MB. Divida o PDF em arquivos menores.`,
        );
      }

      const mimeType = document.mime_type || detectMimeFromName(document.file_name);
      const isImage = IMAGE_MIMES.has(mimeType);
      const mistralOpts: MistralOcrOptions = { apiKey: MISTRAL_API_KEY };

      // Chamada única ao Mistral — sem splitting, sem retry-weak-pages.
      // Para PDF: ocrBytes faz o fluxo files→get-url→ocr→delete (igual n8n).
      // Para imagem: data URL inline.
      let result;
      if (isImage) {
        const base64 = arrayBufferToBase64(buffer);
        result = await runOcr(
          { type: "image_url", image_url: `data:${mimeType};base64,${base64}` },
          mistralOpts,
        );
      } else {
        result = await ocrBytes(new Uint8Array(buffer), document.file_name ?? "documento.pdf", mistralOpts);
      }

      // Validação de continuidade de páginas: o Mistral retorna `index` em cada
      // page (0-based ou 1-based dependendo do tier). Detectamos gaps na sequência
      // — uma página pulada normalmente significa falha no OCR daquela página
      // específica (output vazio que o servidor descartou). Sem isso, o markdown
      // saía com numeração sequencial 1..N sem revelar o buraco.
      const indices = result.pages.map((p) => p.index).sort((a, b) => a - b);
      const paginasFaltando: number[] = [];
      if (indices.length > 0) {
        const minIdx = indices[0];
        const maxIdx = indices[indices.length - 1];
        const presentes = new Set(indices);
        for (let i = minIdx; i <= maxIdx; i++) {
          if (!presentes.has(i)) paginasFaltando.push(i);
        }
      }

      // Página vazia (markdown < 5 chars depois de trim) também é sinal de
      // falha silenciosa do OCR — seguimos mas registramos.
      const paginasVaziasIdx = result.pages
        .filter((p) => (p.markdown ?? "").trim().length < 5)
        .map((p) => p.index);

      const ocrWarnings: string[] = [];
      if (paginasFaltando.length > 0) {
        ocrWarnings.push(
          `OCR retornou ${result.pages.length} páginas mas a sequência tem ${paginasFaltando.length} buraco(s) [índices ${paginasFaltando.slice(0, 10).join(", ")}${paginasFaltando.length > 10 ? "..." : ""}]. Páginas podem ter falhado no servidor de OCR.`,
        );
      }
      if (paginasVaziasIdx.length > 0) {
        ocrWarnings.push(
          `${paginasVaziasIdx.length} página(s) com markdown vazio (índices ${paginasVaziasIdx.slice(0, 5).join(", ")}). Pode ser página em branco do PDF original ou falha de OCR.`,
        );
      }

      // Markdown usa o índice REAL retornado pelo Mistral, não o índice
      // sequencial. Inclui placeholder visível para páginas faltando.
      const markdownChunks: string[] = [];
      if (indices.length > 0) {
        for (let i = indices[0]; i <= indices[indices.length - 1]; i++) {
          const page = result.pages.find((p) => p.index === i);
          if (page) {
            markdownChunks.push(`--- PAGE ${i + 1} ---\n\n${page.markdown}`);
          } else {
            markdownChunks.push(
              `--- PAGE ${i + 1} ---\n\n[PÁGINA AUSENTE NO RETORNO DO OCR]`,
            );
          }
        }
      }
      const markdown = markdownChunks.join("\n\n");

      const docType = detectDocType(markdown);
      const currentTipo = (document as { tipo?: string }).tipo;
      const shouldAutoSetTipo = docType !== "outro" && (!currentTipo || currentTipo === "outro");

      const durationMs = Date.now() - t0;

      await supabase
        .from("documents")
        .update({
          status: "ocr_done",
          ...(shouldAutoSetTipo ? { tipo: docType } : {}),
          page_count: result.pages.length,
          ocr_confidence: 1.0, // Mistral não retorna confidence; assumimos alto
          ocr_chunks_total: 1,
          ocr_chunks_done: 1,
          ocr_chunks_failed: 0,
          ocr_text:
            markdown.length > 10_000_000
              ? markdown.slice(0, 10_000_000) + "\n\n[... truncado ...]"
              : markdown,
          ocr_validated: false,
          ocr_validated_at: null,
          ocr_validated_by: null,
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
          metadata: {
            ...(document.metadata || {}),
            ocr_provider: "mistral-ocr",
            ocr_completed_at: new Date().toISOString(),
            ocr_duration_ms: durationMs,
            ocr_doc_type: docType,
            text_length: markdown.length,
            extracted_text_preview: markdown.slice(0, 500),
            // Telemetria de retry/qualidade do OCR (IMP-4 + IMP-7).
            ocr_retries_used: result.retries_used ?? 0,
            ocr_pages_retornadas: result.pages.length,
            ocr_paginas_faltando: paginasFaltando,
            ocr_paginas_vazias: paginasVaziasIdx,
            ocr_warnings_qualidade: ocrWarnings,
            mistral_model: result.model,
            mistral_usage: result.usage,
          },
        })
        .eq("id", document_id);

      console.log(`[ocr] doc ${document_id} concluído em ${durationMs}ms (${result.pages.length} páginas)`);

      // =====================================================
      // Auto-detect tipo_extracao + auto-disparo extract-document-rubricas
      // (spec §5/§6). Fire-and-forget — falhas não bloqueiam o retorno do OCR.
      // Só dispara quando:
      //   - confiança = 'alta'
      //   - tipo_extracao_origem ainda é default 'manual' (não foi escolhido pelo usuário)
      //   - extracao_status === 'pending' (não foi extraído ainda)
      //   - validation_status === 'pending'
      //   - rate limit do caso não foi batido (30 auto-extrações/h)
      // =====================================================
      try {
        const detect = autoDetectTipoExtracaoEdge(markdown);

        // Lê estado atual do doc pra honrar tipo_extracao_origem='manual'
        // existente. Se usuário já escolheu, NÃO sobrescreve.
        const { data: latest } = await supabase
          .from("documents")
          .select("tipo_extracao_origem, tipo_extracao, validation_status, extracao_status, case_id")
          .eq("id", document_id)
          .single();

        const userOverride = (latest as { tipo_extracao_origem?: string } | null)?.tipo_extracao_origem === "manual"
          && ((latest as { tipo_extracao?: string } | null)?.tipo_extracao ?? "nao_extrair") !== "nao_extrair";

        if (!userOverride) {
          // Atualiza tipo_extracao_origem='auto' + confiança + motivos
          await supabase
            .from("documents")
            .update({
              tipo_extracao: detect.tipo,
              tipo_extracao_origem: "auto",
              tipo_extracao_confianca: detect.confianca,
              tipo_extracao_motivos: detect.motivos,
            })
            .eq("id", document_id);
        }

        // Auto-disparo da extração estruturada
        const podeAutoExtrair =
          !userOverride &&
          detect.tipo !== "nao_extrair" &&
          detect.confianca === "alta" &&
          (latest as { extracao_status?: string } | null)?.extracao_status === "pending" &&
          (latest as { validation_status?: string } | null)?.validation_status === "pending";

        if (podeAutoExtrair) {
          // Rate limit: count auto-extrações deste caso na última hora
          const sinceIso = new Date(Date.now() - AUTO_EXTRACTION_RATE_WINDOW_MS).toISOString();
          const { count: autoCount } = await supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("case_id", document.case_id)
            .eq("extracao_origem", "auto")
            .gte("processing_started_at", sinceIso);

          if ((autoCount ?? 0) < AUTO_EXTRACTION_RATE_LIMIT_PER_CASE) {
            // Marca origem='auto' antes de invocar (evita race com retry humano)
            await supabase
              .from("documents")
              .update({ extracao_origem: "auto" })
              .eq("id", document_id);

            // Fire-and-forget — falha aqui não bloqueia retorno do OCR
            supabase.functions
              .invoke("extract-document-rubricas", {
                body: { document_id, tipo_extracao: detect.tipo, origem: "auto" },
              })
              .then(() => {
                console.log(`[ocr] auto-extração disparada pra doc ${document_id} (tipo=${detect.tipo})`);
              })
              .catch((err: unknown) => {
                console.warn(`[ocr] auto-extração falhou pra doc ${document_id}:`, err);
              });
          } else {
            await supabase
              .from("documents")
              .update({ extracao_skipped_reason: "rate_limit" })
              .eq("id", document_id);
            console.warn(`[ocr] rate limit (${autoCount}) atingido pro caso ${document.case_id}, doc ${document_id} marcado skipped`);
          }
        } else if (
          !userOverride &&
          detect.tipo !== "nao_extrair" &&
          detect.confianca !== "alta"
        ) {
          // Confiança média/baixa — não auto-extrai, marca skipped pra UI saber
          await supabase
            .from("documents")
            .update({ extracao_skipped_reason: "low_confidence" })
            .eq("id", document_id);
        }
      } catch (autoErr) {
        // Auto-detect/disparo NUNCA bloqueia o sucesso do OCR
        console.warn(`[ocr] auto-detect/disparo falhou pra doc ${document_id}:`, autoErr);
      }

      return jsonResponse({
        success: true,
        document_id,
        status: "ocr_done",
        page_count: result.pages.length,
        text_length: markdown.length,
        duration_ms: durationMs,
        doc_type: docType,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ocr] OCR falhou para doc ${document_id}:`, err);

      try {
        await supabase
          .from("documents")
          .update({
            status: "ocr_failed",
            error_message: msg.slice(0, 1000),
            processing_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            retry_count: ((document as { retry_count?: number }).retry_count || 0) + 1,
            metadata: {
              ...(document.metadata || {}),
              ocr_failed_at: new Date().toISOString(),
              ocr_provider: "mistral-ocr",
              ocr_error: msg.slice(0, 1000),
            },
          })
          .eq("id", document_id);
      } catch (updateErr) {
        console.error(`[ocr] falha ao marcar doc como failed:`, updateErr);
      }

      return jsonResponse(
        { success: false, document_id, status: "ocr_failed", error: msg },
        500,
      );
    }
  } catch (err) {
    console.error("[ocr] erro fatal no handler:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
  }
});
