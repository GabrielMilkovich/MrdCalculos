import { createClient } from "npm:@supabase/supabase-js@2";

const JASPER_URL = Deno.env.get("JASPER_URL");
const JASPER_API_KEY = Deno.env.get("JASPER_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RenderRequest {
  template: string;
  params?: Record<string, unknown>;
  data: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!JASPER_URL || !JASPER_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "Jasper renderer não configurado. Defina JASPER_URL e JASPER_API_KEY.",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Authorization obrigatória" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: RenderRequest = await req.json();

    if (!body.template) {
      return new Response(
        JSON.stringify({ error: "campo 'template' é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const jasperPayload = {
      template: body.template,
      params: body.params ?? {},
      data:
        typeof body.data === "string"
          ? body.data
          : JSON.stringify(body.data),
    };

    const jasperResp = await fetch(`${JASPER_URL}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": JASPER_API_KEY,
      },
      body: JSON.stringify(jasperPayload),
    });

    if (!jasperResp.ok) {
      const errText = await jasperResp.text();
      console.error(
        `Jasper render failed: status=${jasperResp.status} body=${errText}`,
      );
      return new Response(
        JSON.stringify({ error: `Jasper falhou (${jasperResp.status}): ${errText}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const pdf = await jasperResp.arrayBuffer();

    return new Response(pdf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${body.template.replace(/\//g, "_")}.pdf"`,
      },
    });
  } catch (e) {
    console.error("render-pdf error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
