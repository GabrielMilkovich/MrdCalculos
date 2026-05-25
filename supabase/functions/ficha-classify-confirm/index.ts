import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClassificacaoInput {
  codigo: string;
  empregador: string;
  denominacao: string;
  categoria_pje: string;
  classe_documento: string;
  incide_fgts?: boolean;
  incide_inss?: boolean;
  incide_ir?: boolean;
  natureza_indenizatoria?: boolean;
  justificativa?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header obrigatório" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rl = await checkRateLimit(
      supabase, user.id, "ficha-classify-confirm", 100, 3600,
    );
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit excedido",
          used: rl.used,
          limit: rl.limit,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const codigos: ClassificacaoInput[] = body.codigos;

    if (!Array.isArray(codigos) || codigos.length === 0) {
      return new Response(
        JSON.stringify({ error: "codigos[] obrigatório e não-vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let salvas = 0;
    const conflitos: Array<{ codigo: string; motivo: string }> = [];

    for (const c of codigos) {
      const { data: existing } = await supabase
        .from("rubrica_catalogo")
        .select("id, revisado")
        .eq("empregador", c.empregador)
        .eq("codigo", c.codigo)
        .maybeSingle();

      if (existing?.revisado) {
        conflitos.push({
          codigo: c.codigo,
          motivo: `Código ${c.codigo} já revisado por admin — não sobrescrito`,
        });
        continue;
      }

      const upsertData = {
        empregador: c.empregador,
        codigo: c.codigo,
        denominacao_canonica: c.denominacao,
        categoria_pje: c.categoria_pje,
        classe_documento: c.classe_documento || "PGTO",
        incide_fgts: c.incide_fgts ?? true,
        incide_inss: c.incide_inss ?? true,
        incide_ir: c.incide_ir ?? true,
        natureza_indenizatoria: c.natureza_indenizatoria ?? false,
        origem: "manual" as const,
        confianca: "media" as const,
        revisado: false,
        adicionado_por: user.id,
        adicionado_em: new Date().toISOString(),
        justificativa: c.justificativa || null,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("rubrica_catalogo")
        .upsert(upsertData, {
          onConflict: "empregador,codigo",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        conflitos.push({
          codigo: c.codigo,
          motivo: `Erro ao salvar: ${upsertError.message}`,
        });
      } else {
        salvas++;
      }
    }

    console.log(
      `[ficha-classify-confirm] user=${user.id} salvas=${salvas} conflitos=${conflitos.length}`,
    );

    return new Response(
      JSON.stringify({ salvas, conflitos }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[ficha-classify-confirm] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
