// =====================================================
// Edge Function: extract-document-rubricas (v2)
// =====================================================
// Lê documents.ocr_text, chama OpenAI gpt-4o-mini com prompt apropriado,
// valida resposta JSON, persiste em rubricas_extraidas / ferias_extraidas /
// faltas_extraidas. Para holerite, aplica memo + hints automaticamente.
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildPromptUser,
  FALTAS_SYSTEM,
  FERIAS_SYSTEM,
  HOLERITE_SYSTEM,
} from './prompts.ts';
import {
  parseFaltas,
  parseFerias,
  parseHolerite,
  type FaltaRow,
  type FeriasRow,
  type HoleriteRow,
} from './schemas.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TipoExtracao = 'holerite' | 'recibo_ferias' | 'registro_faltas';
type Body = { document_id: string; tipo_extracao: TipoExtracao };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    if (!body.document_id || !body.tipo_extracao) {
      return json(400, { ok: false, error: 'document_id e tipo_extracao obrigatórios' });
    }
    if (!['holerite', 'recibo_ferias', 'registro_faltas'].includes(body.tipo_extracao)) {
      return json(400, { ok: false, error: 'tipo_extracao inválido' });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return json(500, { ok: false, error: 'OPENAI_API_KEY não configurada' });
    }

    // Validação de ownership: cliente com auth do usuário (RLS aplica)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { ok: false, error: 'Sem authorization header' });

    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json(401, { ok: false, error: 'Token inválido' });

    // Service role para escrita (bypassa RLS após valida ownership)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Carrega documento + checa ownership via cases.criado_por
    const { data: doc, error: docErr } = await admin
      .from('documents')
      .select('id, case_id, ocr_text, file_name')
      .eq('id', body.document_id)
      .single();
    if (docErr || !doc) return json(404, { ok: false, error: 'Documento não encontrado' });

    const { data: caseRow } = await admin
      .from('cases')
      .select('id, criado_por')
      .eq('id', doc.case_id)
      .single();
    if (!caseRow || caseRow.criado_por !== userData.user.id) {
      return json(403, { ok: false, error: 'Sem permissão para este documento' });
    }

    if (!doc.ocr_text || doc.ocr_text.trim().length === 0) {
      await markFailed(admin, body.document_id, 'OCR ainda não disponível');
      return json(400, { ok: false, error: 'OCR ainda não disponível para este documento' });
    }

    // Marca running
    await admin
      .from('documents')
      .update({ extracao_status: 'running', extracao_error: null })
      .eq('id', body.document_id);

    // System prompt por tipo
    const systemPrompt =
      body.tipo_extracao === 'holerite'
        ? HOLERITE_SYSTEM
        : body.tipo_extracao === 'recibo_ferias'
          ? FERIAS_SYSTEM
          : FALTAS_SYSTEM;

    // OpenAI
    const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildPromptUser(doc.ocr_text) },
        ],
      }),
    });

    if (!oaiRes.ok) {
      const txt = await oaiRes.text();
      await markFailed(admin, body.document_id, `OpenAI: ${oaiRes.status} ${txt.slice(0, 300)}`);
      return json(502, { ok: false, error: 'Falha na chamada OpenAI' });
    }

    const oaiJson = await oaiRes.json();
    const rawContent: string = oaiJson?.choices?.[0]?.message?.content ?? '';
    const parsed = safeJSONParse(rawContent);

    if (parsed === null) {
      await markFailed(admin, body.document_id, 'Resposta da LLM não é JSON válido');
      return json(422, { ok: false, error: 'Resposta da LLM não é JSON válido' });
    }

    // Roteia por tipo
    if (body.tipo_extracao === 'holerite') {
      const validated = parseHolerite(parsed);
      if (!validated) {
        await markFailed(admin, body.document_id, 'Schema de holerite não bate');
        return json(422, { ok: false, error: 'Schema de holerite não bate' });
      }
      const count = await persistHolerite(admin, doc.case_id, body.document_id, validated.competencia, validated.rubricas);
      await admin
        .from('documents')
        .update({
          extracao_status: 'done',
          competencia_referencia: validated.competencia,
        })
        .eq('id', body.document_id);
      return json(200, { ok: true, count, competencia: validated.competencia });
    }

    if (body.tipo_extracao === 'recibo_ferias') {
      const validated = parseFerias(parsed);
      if (!validated) {
        await markFailed(admin, body.document_id, 'Schema de férias não bate');
        return json(422, { ok: false, error: 'Schema de férias não bate' });
      }
      const count = await persistFerias(admin, doc.case_id, body.document_id, validated.ferias);
      await admin
        .from('documents')
        .update({ extracao_status: 'done' })
        .eq('id', body.document_id);
      return json(200, { ok: true, count });
    }

    if (body.tipo_extracao === 'registro_faltas') {
      const validated = parseFaltas(parsed);
      if (!validated) {
        await markFailed(admin, body.document_id, 'Schema de faltas não bate');
        return json(422, { ok: false, error: 'Schema de faltas não bate' });
      }
      const count = await persistFaltas(admin, doc.case_id, body.document_id, validated.faltas);
      await admin
        .from('documents')
        .update({ extracao_status: 'done' })
        .eq('id', body.document_id);
      return json(200, { ok: true, count });
    }

    return json(400, { ok: false, error: 'tipo_extracao inválido' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json(500, { ok: false, error: msg });
  }
});

// =====================================================
// Persistência
// =====================================================

async function persistHolerite(
  admin: ReturnType<typeof createClient>,
  caseId: string,
  documentId: string,
  competencia: string,
  rubricas: HoleriteRow[],
): Promise<number> {
  // Limpa extrações anteriores do mesmo doc (re-extração)
  await admin.from('rubricas_extraidas').delete().eq('document_id', documentId);

  // Carrega memos do caso (1 query, evita N+1)
  const { data: memos } = await admin
    .from('classificacoes_rubrica_memo')
    .select('codigo, nome_normalizado, categoria_id')
    .eq('case_id', caseId);

  const memoMap = new Map<string, string>();
  for (const m of (memos ?? []) as Array<{
    codigo: string | null;
    nome_normalizado: string;
    categoria_id: string;
  }>) {
    memoMap.set(`${m.codigo ?? ''}::${m.nome_normalizado}`, m.categoria_id);
  }

  // Carrega categorias do escritório (slug → id)
  const { data: categorias } = await admin
    .from('categorias_rubrica')
    .select('id, slug');
  const slugToId = new Map<string, string>();
  for (const c of (categorias ?? []) as Array<{ id: string; slug: string }>) {
    slugToId.set(c.slug, c.id);
  }

  // Monta rows aplicando memo → hint → none
  const rows = rubricas
    .map((r, idx) => {
      const valor = r.valor_vencimento ?? r.valor_desconto ?? 0;
      if (!Number.isFinite(valor)) return null;
      const nome_normalizado = normalize(r.nome);
      const memoCat = memoMap.get(`${r.codigo ?? ''}::${nome_normalizado}`);
      let categoria_id: string | null = null;
      let classificacao_origem: 'none' | 'memo' | 'hint' | 'manual' = 'none';

      if (memoCat) {
        categoria_id = memoCat;
        classificacao_origem = 'memo';
      } else {
        const hint = getDefaultHintEdge(r.nome);
        if (hint && hint.tipo === 'sugerir_categoria') {
          const id = slugToId.get(hint.slug);
          if (id) {
            categoria_id = id;
            classificacao_origem = 'hint';
          }
        } else if (hint && hint.tipo === 'sugerir_ignorar') {
          // "ignorar" persiste como NULL — usuário ainda pode mover pra
          // categoria. Distinguimos via classificacao_origem='hint' + null.
          // Ao validar o doc, "ignorar" é tratado como decisão consciente.
          // Para sinalizar que houve hint de ignorar, marcamos origem='hint'
          // mantendo categoria_id=null. UI mostra ícone ⓘ.
          classificacao_origem = 'hint';
        }
      }

      return {
        document_id: documentId,
        case_id: caseId,
        competencia,
        codigo: r.codigo,
        nome: r.nome,
        nome_normalizado,
        valor: Math.abs(valor),
        quantidade: r.quantidade,
        desconto: r.valor_desconto,
        categoria_id,
        classificacao_origem,
        origem: 'ocr_ai' as const,
        ordem_no_documento: idx,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (rows.length > 0) {
    const { error } = await admin.from('rubricas_extraidas').insert(rows);
    if (error) throw error;
  }
  return rows.length;
}

async function persistFerias(
  admin: ReturnType<typeof createClient>,
  caseId: string,
  documentId: string,
  ferias: FeriasRow[],
): Promise<number> {
  await admin.from('ferias_extraidas').delete().eq('document_id', documentId);
  if (ferias.length === 0) return 0;
  const rows = ferias.map((f) => ({
    document_id: documentId,
    case_id: caseId,
    relativa: f.relativa,
    prazo: f.prazo,
    situacao: f.situacao,
    dobra_geral: f.dobra_geral,
    abono: f.abono,
    dias_abono: f.dias_abono,
    gozo1: f.gozo1,
    gozo2: f.gozo2,
    gozo3: f.gozo3,
    incluir: true,
  }));
  const { error } = await admin.from('ferias_extraidas').insert(rows);
  if (error) throw error;
  return rows.length;
}

async function persistFaltas(
  admin: ReturnType<typeof createClient>,
  caseId: string,
  documentId: string,
  faltas: FaltaRow[],
): Promise<number> {
  await admin.from('faltas_extraidas').delete().eq('document_id', documentId);
  if (faltas.length === 0) return 0;
  const rows = faltas.map((f) => ({
    document_id: documentId,
    case_id: caseId,
    data_inicio: brToISO(f.data_inicio),
    data_fim: brToISO(f.data_fim),
    justificada: f.justificada,
    reiniciar_periodo_aquisitivo: f.reiniciar_periodo_aquisitivo,
    justificativa: f.justificativa ?? null,
    incluir: true,
  }));
  const { error } = await admin.from('faltas_extraidas').insert(rows);
  if (error) throw error;
  return rows.length;
}

async function markFailed(
  admin: ReturnType<typeof createClient>,
  documentId: string,
  msg: string,
): Promise<void> {
  await admin
    .from('documents')
    .update({ extracao_status: 'failed', extracao_error: msg.slice(0, 500) })
    .eq('id', documentId);
}

// =====================================================
// Helpers — duplicados do lib client (Deno não importa src/)
// =====================================================

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function brToISO(br: string): string {
  // dd/MM/yyyy → yyyy-MM-dd
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '1970-01-01';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

type EdgeHint =
  | { tipo: 'sugerir_categoria'; slug: 'salario_fixo' | 'comissao' | 'dsr' | 'premiacao' }
  | { tipo: 'sugerir_ignorar' }
  | null;

// Mesma lógica de hints (resumida — o motivo ficou só no client).
const HINTS_DSR: RegExp[] = [
  /\bdsr\s*\(?\s*comissoes?\s*\)?/i,
  /\bint\.?\s*premio\s+no\s+dsr\b/i,
  /\bdsr\b(?!.*\b(?:h\.?\s*ext|horas?\s*ext|hora\s*ext|hr\s*ext))/i,
];
const HINTS_IGNORAR: RegExp[] = [
  /\b(horas?\s*ext\w*|h\.?\s*ext\w*|hr\s*ext\w*)\b/i,
  /\b(inss|irrf|irpf|imposto\s+de\s+renda)\b/i,
  /\b(vale\s*transporte|vt)\b/i,
  /\b(vale\s*alimentacao|va|vale\s*refeicao|vr|cesta\s*basica)\b/i,
  /\b(adiant\w*|emprestimo|prestacao\s+(de\s+)?carne)\b/i,
  /\b(intermedica|unimed|amil|hapvida|bradesco\s*saude|seguro\s*saude|plano\s*de\s*saude|segvida|multich)\b/i,
  /\b(contrib\w*\s*(sindical|confederativa|associativa)|mensalidade\s*sindical)\b/i,
  /\bdesp\w*\s*(med|hosp)|\bdesp\.?med\b/i,
];
const HINTS_COMISSAO: RegExp[] = [
  /\bcomissoes?\b/i,
  /\bcom\.?\s*(garantia|seguros?|vendas?)\b/i,
  /\bcompl\.?\s*vendedor\b/i,
];
const HINTS_PREMIACAO: RegExp[] = [
  /\bpremio\b/i,
  /\bcampanha\b/i,
  /\bbonificacao\b/i,
];

function getDefaultHintEdge(nome: string): EdgeHint {
  const n = normalize(nome);
  for (const r of HINTS_DSR) if (r.test(n)) return { tipo: 'sugerir_categoria', slug: 'dsr' };
  for (const r of HINTS_IGNORAR) if (r.test(n)) return { tipo: 'sugerir_ignorar' };
  for (const r of HINTS_COMISSAO) if (r.test(n)) return { tipo: 'sugerir_categoria', slug: 'comissao' };
  for (const r of HINTS_PREMIACAO) if (r.test(n)) return { tipo: 'sugerir_categoria', slug: 'premiacao' };
  return null;
}

function safeJSONParse(s: string): unknown {
  if (typeof s !== 'string') return null;
  // Remove cercas markdown se presentes
  let cleaned = s.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
