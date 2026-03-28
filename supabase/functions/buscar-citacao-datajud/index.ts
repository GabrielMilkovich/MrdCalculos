/**
 * Edge Function: buscar-citacao-datajud
 *
 * Consulta a API Pública Datajud (CNJ) para obter a data de citação
 * de um processo trabalhista a partir do número do processo.
 *
 * Retorna: { data_citacao: string | null, fonte: string, erro?: string }
 *
 * Referência: https://datajud-wiki.cnj.jus.br/api-publica/
 * Código de movimento 22 = Citação (tabela de movimentos CNJ TPU)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Datajud public API key (published in CNJ documentation — safe to use in edge fn)
const DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendFbXNpZnRGdGRGZFdoUVJiNWhkaVhVajRHa0gxRFVqSVpmVlk=";

// Parse tribunal number from process number (NNNNNNN-NN.AAAA.J.TT.OOOO)
// For Justiça do Trabalho: J=5, TT = number of TRT (01-24)
function parseTribunalFromProcesso(numeroProcesso: string): number | null {
  // Remove formatting chars, normalize
  const clean = numeroProcesso.replace(/[^0-9.]/g, "");
  // Pattern: digits dash digits dot year dot J dot TT dot OOOO
  const match = clean.match(/\d{7}[\-.]?\d{2}\.(\d{4})\.(\d)\.(\d{2})\.\d{4}/);
  if (!match) return null;
  const [, , justica, tribunal] = match;
  if (justica !== "5") return null; // Not Justiça do Trabalho
  return parseInt(tribunal, 10);
}

// Normalize process number to CNJ format NNNNNNN-NN.AAAA.J.TT.OOOO
function normalizarNumeroProcesso(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (digits.length === 20) {
    return `${digits.slice(0,7)}-${digits.slice(7,9)}.${digits.slice(9,13)}.${digits.slice(13,14)}.${digits.slice(14,16)}.${digits.slice(16,20)}`;
  }
  return n.trim();
}

// Find citação date from Datajud process hit
function extrairDataCitacao(hit: any): string | null {
  // Try movimentos array for movimento code 22 (Citação)
  const movimentos: any[] = hit._source?.movimentos ?? [];

  // Sort by dataHora ascending to get first citação
  const sorted = [...movimentos].sort((a, b) =>
    (a.dataHora ?? "").localeCompare(b.dataHora ?? "")
  );

  for (const mov of sorted) {
    const codigo = mov.codigo ?? mov.movimento?.codigo;
    // Code 22 = Citação in CNJ TPU movement table
    // Also check for "citacao" or "citação" in nome/descricao
    const nome = (mov.nome ?? mov.movimento?.nome ?? "").toLowerCase();
    if (codigo === 22 || codigo === "22" || nome.includes("cita")) {
      // dataHora format: "2020-06-15T00:00:00.000Z" or "2020-06-15"
      if (mov.dataHora) {
        return mov.dataHora.slice(0, 10);
      }
    }
  }

  // Fallback: look in assuntos or complementosTabelados for citação info
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { numero_processo } = body as { numero_processo?: string };

    if (!numero_processo?.trim()) {
      return new Response(
        JSON.stringify({ data_citacao: null, fonte: "datajud", erro: "numero_processo não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numeroNorm = normalizarNumeroProcesso(numero_processo);
    const tribunalNum = parseTribunalFromProcesso(numero_processo);

    if (tribunalNum === null || tribunalNum < 1 || tribunalNum > 24) {
      return new Response(
        JSON.stringify({
          data_citacao: null,
          fonte: "datajud",
          erro: `Não foi possível identificar o TRT a partir do número: ${numero_processo}. Use o formato NNNNNNN-NN.AAAA.5.TT.OOOO`
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tribunal = `trt${tribunalNum}`;
    const apiUrl = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;

    const searchBody = {
      query: {
        match: { numeroProcesso: numeroNorm }
      },
      _source: ["numeroProcesso", "movimentos", "dataAjuizamento", "classe", "assuntos"],
      size: 1,
    };

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `ApiKey ${DATAJUD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({
          data_citacao: null,
          fonte: "datajud",
          erro: `Datajud retornou HTTP ${resp.status}: ${errText.slice(0, 200)}`
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await resp.json();
    const hits: any[] = json?.hits?.hits ?? [];

    if (hits.length === 0) {
      return new Response(
        JSON.stringify({
          data_citacao: null,
          fonte: "datajud",
          erro: `Processo ${numeroNorm} não encontrado no ${tribunal.toUpperCase()}.`
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hit = hits[0];
    const dataCitacao = extrairDataCitacao(hit);
    const dataAjuizamento = hit._source?.dataAjuizamento?.slice(0, 10) ?? null;

    return new Response(
      JSON.stringify({
        data_citacao: dataCitacao,
        data_ajuizamento: dataAjuizamento,
        numero_processo_cnj: hit._source?.numeroProcesso ?? numeroNorm,
        tribunal,
        fonte: "datajud",
        // If citação not found, return ajuizamento so caller can use as fallback
        aviso: dataCitacao ? null : "Citação não localizada nos movimentos. Verifique manualmente.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ data_citacao: null, fonte: "datajud", erro: err?.message ?? "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
