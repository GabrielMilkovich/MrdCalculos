// =====================================================
// ocr-document — versão simplificada (match n8n workflow)
// =====================================================
// Pipeline atual (pós-Fase 2 v7, 2026-05-20):
//   0. **V6 geométrico (tentado ANTES do Mistral pra PDF)**:
//      - extrairGeometrico (unpdf + pdfjs)
//      - escolherMapper (Via Varejo / Genérico / outros)
//      - Se mapper sucesso → persiste parsed jsonb + retorna SEM Mistral
//      - Se mapper falha → telemetria gravada em metadata.v6_*, cai pro Mistral
//   1. POST /v1/files (upload PDF/imagem)        → file_id
//   2. GET  /v1/files/{id}/url                   → signed URL Mistral
//   3. POST /v1/ocr  { document_url: ... }       → resultado
//   4. DELETE /v1/files/{id}                     (cleanup, best-effort)
//
// Diferente da versão anterior: SEM splitting, SEM parallel chunks, SEM
// retryWeakPages, **COM V6 native PDF extraction (integrada 2026-05-20)**,
// SEM EdgeRuntime.waitUntil.
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

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { ocrBytes, runOcr, type MistralOcrOptions } from "../_shared/mistral-ocr.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { tentarV6, metadataV6, type V6Tentativa } from "../_shared/v6-pipeline.ts";
import { parseFichaFinanceiraDeterministico } from "../_shared/parsers/ficha-financeira-deterministic.ts";
import { mapperFichaFinanceiraViaVarejo } from "../_shared/mappers/ficha-financeira-via-varejo.ts";

// Audit-fix S3 — limite GLOBAL por usuário (Mistral API é paga).
// 100 chamadas/h é folgado para uso real (~3 docs/min sustained) e segura
// contra farming. Complementa o per-case existente (AUTO_EXTRACTION_RATE_LIMIT_PER_CASE).
const OCR_DOCUMENT_RATE_LIMIT = 100;
const OCR_DOCUMENT_RATE_WINDOW_SEC = 3600;

const ABSOLUTE_MAX_BYTES = 30 * 1024 * 1024; // 30MB

const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"]);

/** Helper inline pra evitar import pesado de pdf-utils. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// =====================================================
// Detector de origem do empregador (PR 4 v5)
// =====================================================
// Espelha src/features/data-extraction/classification/origem-empregador.ts
// — Magazine Luiza fora de escopo nesta versão. Sinalizamos PÓS-OCR para
// marcar o documento e mostrar mensagem ao operador. Pré-OCR (peek de
// texto nativo PDF) seria ideal para economizar cota Mistral, mas requer
// extração nativa de PDF que não está disponível neste edge function.
// =====================================================

const MARCADORES_MAGAZINE_LUIZA = [
  /\bMAGAZINE\s+LUIZA\b/i,
  /\bMAGAZ\s*LUIZA\b/i,
  /\bMAGALU\b/i,
  /\bLUIZALABS\b/i,
  /\bC\.?N\.?P\.?J\.?\.?:?\s*47\.?960\.?950\//i,
];
const MARCADORES_VV_CB = [
  /\bNOVA\s+CASA\s+BAHIA\s+S\/?A\b/i,
  /\bVIA\s+VAREJO\s+S\/?A\b/i,
  /\bC\.?G\.?C\.?\.?\s*\n?\s*10\.?757\.?237\/?\d{4}-?\d{2}\b/i,
  /\bC\.?G\.?C\.?\.?\s*\n?\s*33\.?041\.?260\/?\d{4}-?\d{2}\b/i,
  /\bviavarejo\b/i,
];

const MENSAGEM_BLOQUEIO_MAGALU =
  "Este documento parece ser Magazine Luiza/Magalu. " +
  "O sistema atual processa apenas documentos Via Varejo / Casa Bahia. " +
  "Magazine Luiza está planejado para versão futura. Por favor, lance manualmente.";

function detectarMagaluPostOcr(ocrText: string): { bloqueado: boolean; motivos: string[] } {
  const motivosVV: string[] = [];
  for (const re of MARCADORES_VV_CB) if (re.test(ocrText)) motivosVV.push(re.source);
  if (motivosVV.length > 0) return { bloqueado: false, motivos: [] };
  const motivosMagalu: string[] = [];
  for (const re of MARCADORES_MAGAZINE_LUIZA) if (re.test(ocrText)) motivosMagalu.push(re.source);
  return { bloqueado: motivosMagalu.length > 0, motivos: motivosMagalu };
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
    | "ficha_financeira"
    | "recibo_ferias"
    | "registro_faltas"
    | "cartao_ponto"
    | "ctps";
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
  const SINAIS_FICHA_FINANCEIRA: Array<{ pattern: RegExp; pontos: number; motivo: string }> = [
    { pattern: /\bficha\s+financeira\b/i, pontos: 10, motivo: "título 'Ficha Financeira'" },
    { pattern: /\bano\s+compet[eê]ncia\s*:\s*\d{4}\b/i, pontos: 8, motivo: "header 'Ano Competência: YYYY'" },
    { pattern: /janeiro.*fevereiro.*mar[çc]o.*abril/is, pontos: 6, motivo: "colunas com 4+ meses distintos" },
    { pattern: /\bpgto\b[\s\S]{0,200}?\bdesc\b/i, pontos: 4, motivo: "classificações PGTO/DESC no corpo" },
    { pattern: /\b\d{4}\s+[A-ZÀ-ÚÇ][\wÀ-úÇç\s/.]+\s*\|\s*(PGTO|DESC|BASE|ENCAR)/i, pontos: 6, motivo: "linha com código 4 dígitos + classificação ADP" },
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
  // Sinais de CTPS (Carteira de Trabalho) — quando combinados com sinais
  // de férias OU faltas, classificamos como `ctps` em vez de obrigar o
  // operador a escolher entre férias OU faltas (perdendo metade).
  const SINAIS_CTPS_CABECALHO: Array<{ pattern: RegExp; pontos: number; motivo: string }> = [
    { pattern: /\bcarteira\s+de\s+trabalho(\s+e\s+previd[êe]ncia\s+social)?\b/i, pontos: 10, motivo: "cabeçalho 'Carteira de Trabalho'" },
    { pattern: /\bCTPS\b/i, pontos: 6, motivo: "sigla CTPS" },
    { pattern: /\b(anota[çc][õo]es?\s+gerais|altera[çc][õo]es?\s+de\s+sal[áa]rio)\b/i, pontos: 4, motivo: "campos típicos de CTPS" },
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
    ficha_financeira: score(SINAIS_FICHA_FINANCEIRA),
    recibo_ferias: score(SINAIS_FERIAS),
    registro_faltas: score(SINAIS_FALTAS),
    cartao_ponto: score(SINAIS_CARTAO_PONTO),
  };

  // CTPS — caso especial: documento contém férias + faltas. Detecta cabeçalho
  // forte de CTPS + qualquer evidência de férias OU faltas.
  const ctpsCabecalho = score(SINAIS_CTPS_CABECALHO);
  const temFeriasOuFaltas =
    scores.recibo_ferias.pontos >= 4 || scores.registro_faltas.pontos >= 4;
  if (ctpsCabecalho.pontos >= 6 && temFeriasOuFaltas) {
    const motivos = [
      ...ctpsCabecalho.motivos,
      ...scores.recibo_ferias.motivos.slice(0, 2),
      ...scores.registro_faltas.motivos.slice(0, 2),
    ];
    const total =
      ctpsCabecalho.pontos +
      scores.recibo_ferias.pontos +
      scores.registro_faltas.pontos;
    return {
      tipo: "ctps",
      confianca: total >= 12 ? "alta" : "media",
      motivos,
    };
  }

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

Deno.serve(async (req) => {
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

    // Audit-fix S3: rate-limit global por usuário (Mistral API paga).
    const rl = await checkRateLimit(
      supabase,
      user.id,
      "ocr-document",
      OCR_DOCUMENT_RATE_LIMIT,
      OCR_DOCUMENT_RATE_WINDOW_SEC,
    );
    if (!rl.allowed) {
      return jsonResponse(
        {
          error: "Rate limit excedido",
          hint: `Limite de ${rl.limit} OCRs/hora atingido. Tente novamente em ~${Math.round(rl.retryAfterSec / 60)} min.`,
          used: rl.used,
          limit: rl.limit,
        },
        429,
      );
    }

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

    // Idempotência V6/Mistral (Fase 2 v7 — adicionado 2026-05-20):
    // Se o documento já foi processado uma vez (`parsed_by` populado),
    // re-invocações ficam cached. Evita reprocessar PDF de 63 pgs (30-60s)
    // quando operador re-clica OCR. Padrão espelha process-document-mistral.
    //
    // Não retorna o resultado completo (parsed jsonb pode ser grande) — só
    // o sinal de "já feito + qual provider". Consumers que precisam do
    // resultado leem da tabela direto.
    //
    // Pra forçar reprocessamento (admin), usar reprocess-v6 (que tem auth
    // separada). Não há gate aqui pra "force_reprocess" deliberadamente —
    // operador comum não deve reprocessar à toa.
    if (document.parsed_by) {
      console.log(
        `[ocr-document] doc ${document_id}: idempotência — parsed_by=${document.parsed_by}, ocr_provider=${document.ocr_provider}, skip V6+Mistral`,
      );
      return jsonResponse({
        success: true,
        cached: true,
        provider: document.ocr_provider,
        parsed_by: document.parsed_by,
        message: `Documento já processado (${document.parsed_by}) — re-OCR pulado.`,
      });
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
        // TTL 30min (1800s): OCR via Mistral pode demorar — meio termo entre
        // 15min (recomendado) e 2h (anterior). URL só viva durante a função.
        const { data } = await supabase.storage.from(b).createSignedUrl(document.storage_path, 1800);
        if (data?.signedUrl) {
          fileUrl = data.signedUrl;
          break;
        }
      }
    }
    if (!fileUrl) fileUrl = (document.arquivo_url as string | null) ?? null;
    if (!fileUrl) return jsonResponse({ error: "Sem URL de download para o documento" }, 400);

    // Lock anti-race (Fase 2 v7 — adicionado 2026-05-20):
    // Marca `status='ocr_running' + processing_started_at` ANTES de qualquer
    // trabalho expensive (V6 ou Mistral). Invocações concorrentes (ex:
    // DocumentsManager.tsx:332 auto-fire + clique manual do operador) que
    // carregarem o documento APÓS este update verão o lock no check de
    // `ocr_running` acima e bouncerão 409. Janela de race ainda existe
    // (entre load do document e este update) mas reduz drasticamente o
    // cenário comum de 2 invocações em paralelo.
    //
    // Pra Mistral isso já existia (era depois do bloco V6 antes do download).
    // Movido pra cá pra proteger V6 também — sem isso, 2 V6s em paralelo
    // produziriam 2 parsed jsonb (last-write-wins) que podem ter pequena
    // variação por causa de não-determinismo do pdfjs em alguns PDFs.
    await supabase
      .from("documents")
      .update({
        status: "ocr_running",
        processing_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", document_id);

    // =====================================================
    // V6 GEOMETRIC PATH (integrado 2026-05-20 — Fase 2 v7)
    // =====================================================
    // Tenta extração geométrica nativa via pdfjs ANTES do Mistral OCR.
    //   - Sucesso: persiste `parsed` jsonb + retorna sem chamar Mistral
    //     (economiza cota Mistral + zero latência da API externa).
    //   - Falha: telemetria gravada em `metadata.v6_*`, fluxo Mistral
    //     abaixo roda exatamente como antes (zero regressão).
    //
    // Antes desta integração, 91% dos uploads (42/46 dos últimos 90 dias)
    // pulavam V6 e iam direto pro Mistral, gerando CSVs ruins em
    // documentos text-native como o do Roque Guerreiro (Via Varejo
    // pós-2018). Diagnóstico empírico no banco confirmou.
    //
    // TODO 2026-05-20 (Risco 3 da Fase 0): ImportadorFichaFinanceira.tsx:96
    // e CTPSUploader.tsx:72 chamam esta função com body `{ storage_path,
    // mime_type }` em vez de `{ document_id }`. Investigação empírica
    // (paths característicos no banco) confirma que esses 2 callers NÃO
    // produzem rows em `documents` hoje. Duas leituras possíveis:
    //   (a) Componentes BROKEN — sempre 400 silenciosamente, operador
    //       desiste e usa DocumentsManager (caminho com document_id).
    //   (b) Componentes DESIGN DIFERENTE — fazem upload → OCR → consomem
    //       texto direto pra parse-ficha-financeira → removem arquivo,
    //       sem nunca persistir em `documents`. Nesse cenário, é um
    //       CAMINHO DE OCR SEM TELEMETRIA V6 — buraco de qualidade
    //       silencioso, NÃO bug funcional. Vale issue separada.
    // Em ambos: a Fase 2 NÃO preserva storage_path (não produz valor
    // mensurável hoje). Refinamento pertence a backlog separado.
    let v6: V6Tentativa | null = null;
    if (document.mime_type === "application/pdf") {
      v6 = await tentarV6(document, fileUrl, supabase);
      console.log(
        `[ocr-document] doc ${document_id}: V6 outcome=${v6.outcome}` +
          (v6.mapper ? ` mapper=${v6.mapper}` : "") +
          (v6.score !== undefined ? ` score=${v6.score.toFixed(2)}` : ""),
      );

      // V6 success: persiste resultado completo + retorna SEM chamar Mistral.
      // Update único (não 2-step) pra evitar race com consumers que leem
      // entre os writes. Mesmo padrão de columns que process-document-mistral
      // (incluindo extracao_status='done').
      if (v6.outcome === "success" && v6.parsedJson && v6.textoCompleto) {
        await supabase
          .from("documents")
          .update({
            status: "ocr_done",
            extracao_status: "done",
            ocr_provider: "pdfjs_geometric",
            parsed: v6.parsedJson,
            parsed_by: v6.mapper,
            ocr_text: v6.textoCompleto,
            ocr_validated: true,
            ocr_confidence: v6.score ?? null,
            metadata: { ...(document.metadata ?? {}), ...metadataV6(v6) },
            updated_at: new Date().toISOString(),
          })
          .eq("id", document_id);
        console.log(
          `[ocr-document] doc ${document_id} extraído via V6 (${v6.mapper}, ${v6.pageCount} pg) — Mistral pulado`,
        );
        return jsonResponse({
          success: true,
          provider: "pdfjs_geometric",
          mapper: v6.mapper,
          score: v6.score,
          pages: v6.pageCount,
          message: `Processado via extração geométrica nativa (V6 — ${v6.mapper}) — sem Mistral OCR.`,
        });
      }

      // CTPS V2: extrator ok, sem mapper — grava texto geométrico e pula Mistral.
      if (v6.outcome === "no_mapper_matched" && v6.textoCompleto && document.tipo_extracao === "ctps") {
        await supabase
          .from("documents")
          .update({
            parsed: null,
            parsed_by: "ctps-v2-text",
            ocr_provider: "pdfjs_geometric",
            ocr_text: v6.textoCompleto,
            ocr_validated: true,
            status: "ocr_done",
            extracao_status: "done",
            updated_at: new Date().toISOString(),
            metadata: {
              ...(document.metadata ?? {}),
              ...metadataV6(v6),
              v6_ctps_text_only: true,
            },
          })
          .eq("id", document_id);
        console.log(
          `[ocr-document] doc ${document_id} CTPS: texto geométrico gravado (${v6.pageCount} pg) — Mistral pulado`,
        );
        return jsonResponse({
          success: true,
          provider: "pdfjs_geometric",
          mapper: "ctps-v2-text",
          score: v6.score,
          pages: v6.pageCount,
          message: `CTPS processado via extração geométrica — parser V2 roda no cliente.`,
        });
      }

      // Ficha Financeira — fallback dedicado pra evitar Mistral OCR.
      // Quando o pdfjs extrai texto (qualquer outcome com textoCompleto),
      // tentamos o parser determinístico direto. Motivo: o detector do
      // mapper Via Varejo tem regex estrita (/Código/i) que falha quando
      // o pdfjs separa caracteres ou usa abreviações. O parser em si é
      // robusto — funciona em texto extraído mesmo sem bater detector.
      //
      // Cenários cobertos:
      //  - no_mapper_matched: detector negou, parser ainda funciona
      //  - mapper_returned_null: detector ok, mapper falhou no extra-work
      //  - score_below_threshold: pdfjs achou qualidade baixa mas texto existe
      const fichaFinanceiraComTexto =
        document.tipo_extracao === "ficha_financeira" &&
        (v6.outcome === "no_mapper_matched" ||
          v6.outcome === "mapper_returned_null" ||
          v6.outcome === "score_below_threshold") &&
        v6.textoCompleto;

      if (fichaFinanceiraComTexto) {
        try {
          const parseResult = parseFichaFinanceiraDeterministico(v6.textoCompleto);
          if (parseResult && parseResult.rubricas.length > 0) {
            // Reusa o serializer do mapper pra padronizar estrutura parsed.
            const dominio = mapperFichaFinanceiraViaVarejo.mapear({
              textoCompleto: v6.textoCompleto,
            } as Parameters<typeof mapperFichaFinanceiraViaVarejo.mapear>[0]);
            if (dominio) {
              await supabase
                .from("documents")
                .update({
                  status: "ocr_done",
                  extracao_status: "done",
                  ocr_provider: "pdfjs_geometric",
                  parsed: dominio,
                  parsed_by: "ficha-financeira-fallback-determinist",
                  ocr_text: v6.textoCompleto,
                  ocr_validated: true,
                  ocr_confidence: v6.score ?? 0.75,
                  metadata: {
                    ...(document.metadata ?? {}),
                    ...metadataV6(v6),
                    v6_fallback_ficha_financeira: true,
                    v6_fallback_motivo: v6.outcome,
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq("id", document_id);
              console.log(
                `[ocr-document] doc ${document_id} ficha_financeira: fallback determinístico (${parseResult.rubricas.length} rubricas) — Mistral pulado`,
              );
              return jsonResponse({
                success: true,
                provider: "pdfjs_geometric",
                mapper: "ficha-financeira-fallback-determinist",
                pages: v6.pageCount,
                message: `Ficha Financeira processada via parser determinístico (fallback após ${v6.outcome}).`,
              });
            }
          }
        } catch (err) {
          console.error(
            `[ocr-document] doc ${document_id} ficha_financeira fallback exception:`,
            err,
          );
        }
      }

      // V6 falhou: grava só telemetria + cai pro Mistral abaixo. Telemetria
      // gravada SEMPRE — resolve bug histórico de `metadata.v6_*` null em
      // 91% dos rows. Status NÃO muda (Mistral cuida disso adiante).
      await supabase
        .from("documents")
        .update({
          metadata: { ...(document.metadata ?? {}), ...metadataV6(v6) },
          updated_at: new Date().toISOString(),
        })
        .eq("id", document_id);
    } else {
      // Não-PDF (imagem, etc): registra outcome explícito pra telemetria
      // consistente. Mistral roda como sempre abaixo.
      v6 = { outcome: "not_pdf" };
      await supabase
        .from("documents")
        .update({
          metadata: { ...(document.metadata ?? {}), ...metadataV6(v6) },
          updated_at: new Date().toISOString(),
        })
        .eq("id", document_id);
    }
    console.log(
      `[ocr-document] doc ${document_id}: caminho Mistral — V6 outcome=${v6?.outcome ?? "skipped"}`,
    );

    // Inicializa contadores de chunks pro Mistral (status já está
    // 'ocr_running' do lock anti-race acima — não re-escreve pra evitar
    // perder o processing_started_at que outras consultas usam pra calcular
    // STALE_AFTER_MS).
    await supabase
      .from("documents")
      .update({
        ocr_chunks_total: 1,
        ocr_chunks_done: 0,
        updated_at: new Date().toISOString(),
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

      // AUDIT #4/#24: Mistral OCR não retorna confidence — antes fixávamos
      // 1.0, deixando a UI mostrar "100%" sempre. Agora derivamos um score
      // heurístico real a partir do texto extraído. Sinais:
      //   - taxa de caracteres alfanuméricos vs lixo (controle, símbolos)
      //   - presença de placeholders típicos de OCR ruim
      //   - razão de chars úteis por página
      // Score 0..1, com 0.7 como limiar "ok" (alinhado ao extrator V6).
      const totalChars = markdown.length;
      const alnumChars = (markdown.match(/[a-zA-Z0-9À-ÿ]/g) || []).length;
      const numericChars = (markdown.match(/[0-9]/g) || []).length;
      const placeholderCount =
        (markdown.match(/\[\?\?\?\]|\[ilegível\]|\?{3,}|�+/gi) || []).length;
      const pageCountSafe = Math.max(1, result.pages.length);
      const charsPerPage = totalChars / pageCountSafe;
      const alnumRatio = totalChars > 0 ? alnumChars / totalChars : 0;
      // Penaliza placeholders (0.03 por ocorrência, cap em 0.4) e premia
      // densidade de caracteres alfanuméricos. Mantém score conservador
      // (0.4..0.95) para nunca dar 1.0 sem ter como verificar.
      let ocrScore = 0.4 + alnumRatio * 0.5;
      // Bônus por densidade plausível (>1500 chars/página para holerite/CTPS).
      if (charsPerPage >= 500) ocrScore += 0.05;
      if (numericChars > 50) ocrScore += 0.05; // doc com tabela tem números
      ocrScore -= Math.min(0.4, placeholderCount * 0.03);
      ocrScore = Math.max(0.2, Math.min(0.95, ocrScore));

      await supabase
        .from("documents")
        .update({
          status: "ocr_done",
          ...(shouldAutoSetTipo ? { tipo: docType } : {}),
          page_count: result.pages.length,
          ocr_confidence: +ocrScore.toFixed(2),
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
        // PR 4 v5: bloqueio pós-OCR de documentos Magazine Luiza.
        // Antes de auto-detectar tipo, verifica se é Magalu — se for,
        // marca tipo_extracao=nao_extrair com motivo claro e pula o
        // auto-disparo de extração estruturada (operador trata manualmente).
        const magaluCheck = detectarMagaluPostOcr(markdown);
        if (magaluCheck.bloqueado) {
          console.log(
            `[ocr] doc ${document_id} bloqueado como Magazine Luiza — motivos: ${magaluCheck.motivos.join(", ")}`,
          );
          await supabase
            .from("documents")
            .update({
              tipo_extracao: "nao_extrair",
              tipo_extracao_origem: "auto",
              tipo_extracao_confianca: "alta",
              tipo_extracao_motivos: [
                "magazine_luiza_fora_de_escopo",
                MENSAGEM_BLOQUEIO_MAGALU,
                ...magaluCheck.motivos.slice(0, 3),
              ],
              extracao_skipped_reason: "magazine_luiza_fora_de_escopo",
            })
            .eq("id", document_id);
          throw new Error("__MAGALU_BLOQUEADO__"); // sinaliza pro catch externo só logar e pular
        }

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
            // Marca origem='auto' apenas. NÃO invoca mais extract-document-rubricas
            // (deprecated v5 — a extração estruturada agora vive 100% no client
            // via generateExportForDocument(documentId), que é chamada quando
            // o usuário clica em "Revisar e baixar" no Review Dialog).
            //
            // O auto-disparo aqui só sinaliza pra UI que o doc está pronto pra
            // extração (extracao_origem='auto' permite badge "sugerido" sem
            // exigir clique manual no select de tipo).
            await supabase
              .from("documents")
              .update({ extracao_origem: "auto" })
              .eq("id", document_id);
            console.log(
              `[ocr] doc ${document_id} pronto pra extração (tipo=${detect.tipo}, origem=auto). Cliente deve chamar generateExportForDocument quando o operador clicar em Revisar.`,
            );
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
        // Auto-detect/disparo NUNCA bloqueia o sucesso do OCR.
        // Magalu bloqueado é um caminho esperado, não erro real.
        const msg = autoErr instanceof Error ? autoErr.message : String(autoErr);
        if (msg === "__MAGALU_BLOQUEADO__") {
          console.log(`[ocr] doc ${document_id}: tipo_extracao=nao_extrair (Magalu).`);
        } else {
          console.warn(`[ocr] auto-detect/disparo falhou pra doc ${document_id}:`, autoErr);
        }
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
