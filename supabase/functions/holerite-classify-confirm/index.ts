// supabase/functions/holerite-classify-confirm/index.ts
//
// Edge function: PROMOVE tentativas de um case para rubrica_aliases canônico.
// Invocada no clique "Confirmar e baixar ZIP".
//
// Garantias:
//   - Atômico por linha (cada upsert é uma transação implícita).
//   - Conflito (alias já classificado diferente) vira `conflict_rejected` no
//     audit trail. UI mostra fila pra escritório resolver.
//   - Sem conflito → tentativa apagada após promover.
//
// verify_jwt = true (default). Usuário precisa estar logado.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

interface ConfirmRequest {
  case_id: string;
}

interface ConflitoAlias {
  tentativa_id: string;
  alias_original: string;
  normalized_key: string;
  motivo: 'conflict_existing' | 'observacao_juridica_changed';
  categoria_tentativa: string;
  categoria_existente: string;
  obs_anterior?: string | null;
  obs_tentativa?: string | null;
}

interface ConfirmResponse {
  promovidos: number;
  conflitos: ConflitoAlias[];
}

// CORS — allowlist apertada
const ALLOWED_ORIGINS = new Set([
  'https://mrdcalc.com.br',
  'https://www.mrdcalc.com.br',
  'http://localhost:5173',
  'http://localhost:3000',
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const isVercelPreview = origin?.endsWith('.vercel.app') ?? false;
  const ok = origin && (ALLOWED_ORIGINS.has(origin) || isVercelPreview);
  return {
    'Access-Control-Allow-Origin': ok ? origin! : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Vary': 'Origin',
  };
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });
  }

  try {
    const { case_id } = (await req.json()) as ConfirmRequest;
    if (!case_id) {
      return new Response(JSON.stringify({ error: 'case_id_required' }), { status: 400, headers });
    }

    // Cliente com JWT do usuário (autoriza ações via RLS)
    const userJwt = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!userJwt) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verifica que o usuário é o dono das tentativas (RLS já garante leitura)
    const { data: tentativas, error: errTent } = await userClient
      .from('rubrica_aliases_tentativa')
      .select('*')
      .eq('case_id', case_id);

    if (errTent) throw errTent;
    if (!tentativas || tentativas.length === 0) {
      const empty: ConfirmResponse = { promovidos: 0, conflitos: [] };
      return new Response(JSON.stringify(empty), { headers });
    }

    const { data: userData } = await userClient.auth.getUser();
    const actor = userData?.user?.id ?? null;

    const conflitos: ConflitoAlias[] = [];
    const promovidos_ids: string[] = [];

    for (const t of tentativas) {
      const result = await promoverUma(adminClient, t, actor, case_id);
      if (result.kind === 'ok') {
        promovidos_ids.push(t.id);
      } else if (result.kind === 'conflict') {
        conflitos.push(result.conflito);
      } else {
        // erro inesperado: logar e abortar
        throw new Error(`promote_failed: ${result.error}`);
      }
    }

    // Limpa tentativas promovidas
    if (promovidos_ids.length > 0) {
      const { error: errDel } = await adminClient
        .from('rubrica_aliases_tentativa')
        .delete()
        .in('id', promovidos_ids);
      if (errDel) throw errDel;
    }

    const response: ConfirmResponse = {
      promovidos: promovidos_ids.length,
      conflitos,
    };
    return new Response(JSON.stringify(response), { headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'internal', detail: msg }), { status: 500, headers });
  }
});

interface Tentativa {
  id: string;
  case_id: string;
  alias_original: string;
  normalized_key: string;
  categoria: string;
  tipo_pjecalc: string;
  base_dsr: boolean | null;
  base_13: boolean | null;
  base_ferias: boolean | null;
  incluido: boolean | null;
  observacao_juridica: string | null;
  criado_por: string;
}

/**
 * Normaliza observacao_juridica: trim e converte string vazia/whitespace
 * pra null. Garante que CHECK constraint do banco (`length(trim(obs)) > 0`)
 * passa e que comparação de igualdade (entre tentativa e existente) é
 * direta sem `?? ''` shim.
 */
function normalizeObs(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

type PromoteResult =
  | { kind: 'ok' }
  | { kind: 'conflict'; conflito: ConflitoAlias }
  | { kind: 'error'; error: string };

async function promoverUma(
  admin: SupabaseClient,
  t: Tentativa,
  actor: string | null,
  case_id: string,
): Promise<PromoteResult> {
  // 1. Verifica existência prévia (rejeita NAO_CLASSIFICADO — operador esqueceu de classificar)
  if (t.categoria === 'NAO_CLASSIFICADO') {
    return {
      kind: 'conflict',
      conflito: {
        tentativa_id: t.id,
        alias_original: t.alias_original,
        normalized_key: t.normalized_key,
        motivo: 'conflict_existing',
        categoria_tentativa: 'NAO_CLASSIFICADO',
        categoria_existente: 'NAO_CLASSIFICADO',
      },
    };
  }

  const { data: existente } = await admin
    .from('rubrica_aliases')
    .select('id, categoria, observacao_juridica')
    .eq('normalized_key', t.normalized_key)
    .maybeSingle();

  const obsTentativa = normalizeObs(t.observacao_juridica);

  if (existente && existente.categoria !== t.categoria) {
    // Conflito de categoria: já existe com OUTRA categoria. NÃO sobrescrever.
    await admin.from('rubrica_aliases_history').insert({
      rubrica_alias_id: existente.id,
      action: 'conflict_rejected',
      payload: { tentativa: t, existente, motivo: 'conflict_existing' },
      actor,
      case_id,
    });
    return {
      kind: 'conflict',
      conflito: {
        tentativa_id: t.id,
        alias_original: t.alias_original,
        normalized_key: t.normalized_key,
        motivo: 'conflict_existing',
        categoria_tentativa: t.categoria,
        categoria_existente: existente.categoria,
      },
    };
  }

  if (existente) {
    const obsExistente = normalizeObs(existente.observacao_juridica);
    if (obsExistente !== obsTentativa) {
      // Conflito de observação jurídica: categoria é a mesma, mas observação
      // mudou. Decisão jurídica não deve ser sobrescrita silenciosamente —
      // mudança requer reaprovação. Audit grava ambas, retorna conflito.
      await admin.from('rubrica_aliases_history').insert({
        rubrica_alias_id: existente.id,
        action: 'conflict_rejected',
        payload: {
          tentativa: t,
          existente,
          motivo: 'observacao_juridica_changed',
          obs_anterior: obsExistente,
          obs_tentativa: obsTentativa,
        },
        actor,
        case_id,
      });
      return {
        kind: 'conflict',
        conflito: {
          tentativa_id: t.id,
          alias_original: t.alias_original,
          normalized_key: t.normalized_key,
          motivo: 'observacao_juridica_changed',
          categoria_tentativa: t.categoria,
          categoria_existente: existente.categoria,
          obs_anterior: obsExistente,
          obs_tentativa: obsTentativa,
        },
      };
    }
  }

  // 2. Upsert (insert se novo, ignora se já é mesma categoria + mesma obs)
  const { data: inserted, error: errIns } = await admin
    .from('rubrica_aliases')
    .upsert(
      {
        alias_original: t.alias_original,
        normalized_key: t.normalized_key,
        categoria: t.categoria,
        tipo_pjecalc: t.tipo_pjecalc,
        base_dsr: t.base_dsr ?? false,
        base_13: t.base_13 ?? false,
        base_ferias: t.base_ferias ?? false,
        incluido: t.incluido ?? true,
        observacao_juridica: obsTentativa,
        source: 'user_classification',
        confidence: 0.8, // user_classification começa em 0.8
        criado_por: t.criado_por,
        reviewed: true,
      },
      { onConflict: 'normalized_key', ignoreDuplicates: false },
    )
    .select('id')
    .single();

  if (errIns) {
    return { kind: 'error', error: errIns.message };
  }

  // 3. Audit
  await admin.from('rubrica_aliases_history').insert({
    rubrica_alias_id: inserted?.id,
    action: existente ? 'updated' : 'promoted_from_tentativa',
    payload: t,
    actor,
    case_id,
  });

  return { kind: 'ok' };
}
