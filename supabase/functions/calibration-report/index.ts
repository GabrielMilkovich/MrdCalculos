// =====================================================
// CALIBRATION REPORT — admin-only relatorio de ajuste empirico da matriz authority
// =====================================================
// GET /functions/v1/calibration-report?desde=YYYY-MM-DD&ate=YYYY-MM-DD
// Retorna { metricas: [...], sugestoes: [...] }.
//
// Acesso restrito: exige usuario autenticado COM role 'admin' (via has_role).
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Espelho da matriz hardcoded em src/lib/pjecalc/auto-fill/document-authority.ts.
// Mantido aqui para o report calcular score_atual sem depender do bundle frontend.
// Se a matriz mudar, atualizar nos dois lugares (proximo passo: extrair para SQL/JSON).
const AUTHORITY_MATRIX: Record<string, Record<string, number>> = {
  data_admissao: { CTPS: 100, TRCT: 90, CONTRATO_TRABALHO: 95, HOLERITE: 60, SENTENCA: 95, ACORDAO: 95, PETICAO_INICIAL: 30, CONTESTACAO: 30, TERMO_AUDIENCIA: 70 },
  data_demissao: { CTPS: 95, TRCT: 100, HOLERITE: 70, SENTENCA: 90, PETICAO_INICIAL: 40, CONTESTACAO: 40, TERMO_AUDIENCIA: 70 },
  data_ajuizamento: { PETICAO_INICIAL: 100, SENTENCA: 90, ACORDAO: 90, TERMO_AUDIENCIA: 80 },
  numero_processo: { PETICAO_INICIAL: 100, SENTENCA: 100, ACORDAO: 100, TERMO_AUDIENCIA: 100 },
  tribunal: { PETICAO_INICIAL: 95, SENTENCA: 100, ACORDAO: 100, TERMO_AUDIENCIA: 100 },
  vara: { PETICAO_INICIAL: 95, SENTENCA: 100, ACORDAO: 100, TERMO_AUDIENCIA: 100 },
  reclamante_nome: { CTPS: 100, TRCT: 90, CONTRATO_TRABALHO: 95, HOLERITE: 80, PETICAO_INICIAL: 90, SENTENCA: 90 },
  reclamante_cpf: { CTPS: 100, TRCT: 95, HOLERITE: 90, PETICAO_INICIAL: 85 },
  reclamada_nome: { CTPS: 95, TRCT: 100, HOLERITE: 95, CONTRATO_TRABALHO: 100, PETICAO_INICIAL: 80, SENTENCA: 90 },
  reclamada_cnpj: { CTPS: 95, TRCT: 100, HOLERITE: 100, CONTRATO_TRABALHO: 100, GUIA_FGTS: 100 },
  cargo_funcao: { CTPS: 100, TRCT: 80, CONTRATO_TRABALHO: 95, HOLERITE: 70, PETICAO_INICIAL: 50 },
  salario_base: { CTPS: 90, TRCT: 100, CONTRATO_TRABALHO: 95, HOLERITE: 90, FICHA_FINANCEIRA: 95, PETICAO_INICIAL: 40 },
  salario_competencia: { HOLERITE: 100, FICHA_FINANCEIRA: 100, TRCT: 60, PETICAO_INICIAL: 30 },
  tipo_demissao: { TRCT: 100, CTPS: 70, SENTENCA: 95, PETICAO_INICIAL: 50, CONTESTACAO: 60 },
  jornada: { CONTRATO_TRABALHO: 100, CTPS: 80, HOLERITE: 70, CARTAO_PONTO: 60, PETICAO_INICIAL: 40 },
  aviso_previo: { TRCT: 100, CTPS: 70, PETICAO_INICIAL: 50 },
  fgts_saldo: { EXTRATO_FGTS: 100, GUIA_FGTS: 95, TRCT: 80 },
  fgts_multa_40: { TRCT: 100, EXTRATO_FGTS: 80 },
  ferias_periodos: { RECIBO_FERIAS: 100, CTPS: 90, HOLERITE: 60, FICHA_FINANCEIRA: 80 },
  cartao_ponto_diario: { CARTAO_PONTO: 100 },
  rubrica_mensal: { HOLERITE: 100, FICHA_FINANCEIRA: 100, RECIBO_PAGAMENTO: 90 },
  verba_rescisoria: { TRCT: 100, SENTENCA: 95, PETICAO_INICIAL: 30 },
};

const THRESHOLDS = {
  MIN_AMOSTRAS: 20,
  TAXA_BAIXA: 0.5,
  TAXA_ALTA: 0.9,
  DELTA: 10,
};

interface CalEvent {
  campo: string;
  doc_tipo_vencedor: string;
  usuario_aceitou: boolean;
}

interface MetricaOut {
  campo: string;
  doc_tipo: string;
  aceitos: number;
  rejeitados: number;
  total: number;
  taxa_acerto: number;
}

interface SugestaoOut {
  campo: string;
  doc_tipo: string;
  score_atual: number;
  score_sugerido: number;
  delta: number;
  amostras: number;
  taxa_acerto: number;
  motivo: string;
}

function agregar(eventos: CalEvent[]): MetricaOut[] {
  const acc = new Map<string, MetricaOut>();
  for (const ev of eventos) {
    const key = `${ev.campo}::${ev.doc_tipo_vencedor}`;
    const cur = acc.get(key) ?? {
      campo: ev.campo,
      doc_tipo: ev.doc_tipo_vencedor,
      aceitos: 0,
      rejeitados: 0,
      total: 0,
      taxa_acerto: 0,
    };
    if (ev.usuario_aceitou) cur.aceitos += 1;
    else cur.rejeitados += 1;
    cur.total = cur.aceitos + cur.rejeitados;
    cur.taxa_acerto = cur.total > 0 ? cur.aceitos / cur.total : 0;
    acc.set(key, cur);
  }
  return Array.from(acc.values());
}

function sugerir(metricas: MetricaOut[]): SugestaoOut[] {
  const out: SugestaoOut[] = [];
  for (const m of metricas) {
    if (m.total < THRESHOLDS.MIN_AMOSTRAS) continue;
    const scoreAtual = AUTHORITY_MATRIX[m.campo]?.[m.doc_tipo];
    if (scoreAtual === undefined || scoreAtual === 0) continue;

    if (m.taxa_acerto < THRESHOLDS.TAXA_BAIXA) {
      const sugerido = Math.max(0, scoreAtual - THRESHOLDS.DELTA);
      if (sugerido !== scoreAtual) {
        out.push({
          campo: m.campo,
          doc_tipo: m.doc_tipo,
          score_atual: scoreAtual,
          score_sugerido: sugerido,
          delta: sugerido - scoreAtual,
          amostras: m.total,
          taxa_acerto: m.taxa_acerto,
          motivo: `taxa de acerto ${(m.taxa_acerto * 100).toFixed(1)}% < 50% em ${m.total} amostras — reduzir score`,
        });
      }
    } else if (m.taxa_acerto > THRESHOLDS.TAXA_ALTA && scoreAtual < 90) {
      const sugerido = Math.min(100, scoreAtual + THRESHOLDS.DELTA);
      if (sugerido !== scoreAtual) {
        out.push({
          campo: m.campo,
          doc_tipo: m.doc_tipo,
          score_atual: scoreAtual,
          score_sugerido: sugerido,
          delta: sugerido - scoreAtual,
          amostras: m.total,
          taxa_acerto: m.taxa_acerto,
          motivo: `taxa de acerto ${(m.taxa_acerto * 100).toFixed(1)}% > 90% em ${m.total} amostras — score atual ${scoreAtual} subdimensionado`,
        });
      }
    }
  }
  out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return out;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "missing bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "supabase env missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Cliente com JWT do usuario — RLS garante que apenas admins leem a tabela.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Confirma que o caller eh admin (defesa-em-profundidade alem do RLS).
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: isAdminData, error: roleErr } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr || !isAdminData) {
    return new Response(JSON.stringify({ error: "forbidden — admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const desde = url.searchParams.get("desde");
  const ate = url.searchParams.get("ate");

  let query = supabase
    .from("authority_calibration_events")
    .select("campo, doc_tipo_vencedor, usuario_aceitou, criado_em");

  if (desde) query = query.gte("criado_em", desde);
  if (ate) query = query.lte("criado_em", ate);

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventos = (data ?? []) as CalEvent[];
  const metricas = agregar(eventos);
  const sugestoes = sugerir(metricas);

  return new Response(
    JSON.stringify({
      periodo: { desde, ate },
      total_eventos: eventos.length,
      metricas,
      sugestoes,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
