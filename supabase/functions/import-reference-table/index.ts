import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportResult {
  table_slug: string;
  rows_inserted: number;
  rows_updated: number;
  competencies_covered: string[];
  errors: string[];
  version_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { table_slug, trigger = "manual", performed_by } = await req.json();
    if (!table_slug) throw new Error("table_slug is required");

    // Create import run
    const { data: run, error: runErr } = await supabase
      .from("reference_import_runs")
      .insert({ table_slug, trigger, performed_by, result: "pending" })
      .select("id")
      .single();
    if (runErr) throw runErr;
    const runId = run.id;

    let result: ImportResult;

    switch (table_slug) {
      case "salario_minimo":
        result = await importSalarioMinimo(supabase, runId);
        break;
      case "contribuicao_social":
        result = await importContribuicaoSocial(supabase, runId);
        break;
      case "imposto_renda":
        result = await importImpostoRenda(supabase, runId);
        break;
      case "salario_familia":
        result = await importSalarioFamilia(supabase, runId);
        break;
      case "seguro_desemprego":
        result = await importSeguroDesemprego(supabase, runId);
        break;
      case "feriados":
        result = await importFeriados(supabase, runId);
        break;
      case "correcao_monetaria":
        result = await importCorrecaoMonetaria(supabase, runId);
        break;
      case "juros_mora":
        result = await importJurosMora(supabase, runId);
        break;
      default:
        result = {
          table_slug,
          rows_inserted: 0,
          rows_updated: 0,
          competencies_covered: [],
          errors: [`Tabela '${table_slug}' não possui importador automático. Use importação manual.`],
        };
    }

    // Update run
    const finalResult = result.errors.length > 0 ? (result.rows_inserted > 0 ? "partial" : "failed") : "success";
    await supabase.from("reference_import_runs").update({
      finished_at: new Date().toISOString(),
      result: finalResult,
      stats: { rows_inserted: result.rows_inserted, rows_updated: result.rows_updated, competencies_covered: result.competencies_covered },
      errors: result.errors,
    }).eq("id", runId);

    // Update registry
    await supabase.from("reference_table_registry").update({
      last_import_at: new Date().toISOString(),
      last_import_result: { result: finalResult, rows: result.rows_inserted, run_id: runId },
      status: finalResult === "success" ? "ok" : finalResult === "partial" ? "warning" : "broken",
    }).eq("slug", table_slug);

    return new Response(JSON.stringify({ success: true, run_id: runId, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ========================================================
// IMPORTADORES POR TABELA
// ========================================================

async function importSalarioMinimo(supabase: any, runId: string): Promise<ImportResult> {
  // Dados oficiais do salário mínimo brasileiro (histórico completo)
  const data = [
    { competencia: "2025-01-01", valor: 1518.00 },
    { competencia: "2024-01-01", valor: 1412.00 },
    { competencia: "2023-05-01", valor: 1320.00 },
    { competencia: "2023-01-01", valor: 1302.00 },
    { competencia: "2022-01-01", valor: 1212.00 },
    { competencia: "2021-01-01", valor: 1100.00 },
    { competencia: "2020-02-01", valor: 1045.00 },
    { competencia: "2020-01-01", valor: 1039.00 },
    { competencia: "2019-01-01", valor: 998.00 },
    { competencia: "2018-01-01", valor: 954.00 },
    { competencia: "2017-01-01", valor: 937.00 },
    { competencia: "2016-01-01", valor: 880.00 },
    { competencia: "2015-01-01", valor: 788.00 },
    { competencia: "2014-01-01", valor: 724.00 },
    { competencia: "2013-01-01", valor: 678.00 },
    { competencia: "2012-01-01", valor: 622.00 },
    { competencia: "2011-03-01", valor: 545.00 },
    { competencia: "2011-01-01", valor: 540.00 },
    { competencia: "2010-01-01", valor: 510.00 },
    { competencia: "2009-02-01", valor: 465.00 },
    { competencia: "2008-03-01", valor: 415.00 },
    { competencia: "2007-04-01", valor: 380.00 },
    { competencia: "2006-04-01", valor: 350.00 },
    { competencia: "2005-05-01", valor: 300.00 },
    { competencia: "2004-05-01", valor: 260.00 },
    { competencia: "2003-04-01", valor: 240.00 },
    { competencia: "2002-04-01", valor: 200.00 },
    { competencia: "2001-04-01", valor: 180.00 },
    { competencia: "2000-04-01", valor: 151.00 },
  ];

  let inserted = 0;
  const errors: string[] = [];

  for (const row of data) {
    const { error } = await supabase.from("pjecalc_salario_minimo").upsert(row, { onConflict: "competencia" });
    if (error) errors.push(`SM ${row.competencia}: ${error.message}`);
    else inserted++;
  }

  return {
    table_slug: "salario_minimo",
    rows_inserted: inserted,
    rows_updated: 0,
    competencies_covered: data.map(d => d.competencia),
    errors,
  };
}

async function importContribuicaoSocial(supabase: any, runId: string): Promise<ImportResult> {
  // Tabela INSS 2025 - EC 103/2019 (progressiva)
  const faixas2025 = [
    { faixa: 1, valor_inicial: 0, valor_final: 1518.00, aliquota: 7.5, teto_maximo: 8157.41 },
    { faixa: 2, valor_inicial: 1518.01, valor_final: 2793.88, aliquota: 9.0, teto_maximo: 8157.41 },
    { faixa: 3, valor_inicial: 2793.89, valor_final: 4190.83, aliquota: 12.0, teto_maximo: 8157.41 },
    { faixa: 4, valor_inicial: 4190.84, valor_final: 8157.41, aliquota: 14.0, teto_maximo: 8157.41 },
  ];

  const faixas2024 = [
    { faixa: 1, valor_inicial: 0, valor_final: 1412.00, aliquota: 7.5, teto_maximo: 7786.02 },
    { faixa: 2, valor_inicial: 1412.01, valor_final: 2666.68, aliquota: 9.0, teto_maximo: 7786.02 },
    { faixa: 3, valor_inicial: 2666.69, valor_final: 4000.03, aliquota: 12.0, teto_maximo: 7786.02 },
    { faixa: 4, valor_inicial: 4000.04, valor_final: 7786.02, aliquota: 14.0, teto_maximo: 7786.02 },
  ];

  let inserted = 0;
  const errors: string[] = [];
  const competencies: string[] = [];

  for (const [comp, faixas] of [["2025-01-01", faixas2025], ["2024-01-01", faixas2024]] as const) {
    competencies.push(comp);
    for (const f of faixas) {
      const { error } = await supabase.from("pjecalc_contribuicao_social").upsert({
        competencia: comp,
        tipo: "segurado_empregado",
        faixa: f.faixa,
        valor_inicial: f.valor_inicial,
        valor_final: f.valor_final,
        aliquota: f.aliquota,
        teto_maximo: f.teto_maximo,
      }, { onConflict: "competencia,tipo,faixa" });
      if (error) errors.push(`CS ${comp} F${f.faixa}: ${error.message}`);
      else inserted++;
    }
  }

  return { table_slug: "contribuicao_social", rows_inserted: inserted, rows_updated: 0, competencies_covered: competencies, errors };
}

async function importImpostoRenda(supabase: any, runId: string): Promise<ImportResult> {
  // IRRF 2025
  const data = [
    {
      competencia: "2025-01-01",
      deducao_dependente: 189.59,
      deducao_aposentado_65: 1903.98,
      faixas: [
        { faixa_inicio: 0, faixa_fim: 2259.20, aliquota: 0, deducao: 0 },
        { faixa_inicio: 2259.21, faixa_fim: 2826.65, aliquota: 0.075, deducao: 169.44 },
        { faixa_inicio: 2826.66, faixa_fim: 3751.05, aliquota: 0.15, deducao: 381.44 },
        { faixa_inicio: 3751.06, faixa_fim: 4664.68, aliquota: 0.225, deducao: 662.77 },
        { faixa_inicio: 4664.69, faixa_fim: null, aliquota: 0.275, deducao: 896.00 },
      ],
    },
    {
      competencia: "2024-01-01",
      deducao_dependente: 189.59,
      deducao_aposentado_65: 1903.98,
      faixas: [
        { faixa_inicio: 0, faixa_fim: 2259.20, aliquota: 0, deducao: 0 },
        { faixa_inicio: 2259.21, faixa_fim: 2826.65, aliquota: 0.075, deducao: 169.44 },
        { faixa_inicio: 2826.66, faixa_fim: 3751.05, aliquota: 0.15, deducao: 381.44 },
        { faixa_inicio: 3751.06, faixa_fim: 4664.68, aliquota: 0.225, deducao: 662.77 },
        { faixa_inicio: 4664.69, faixa_fim: null, aliquota: 0.275, deducao: 896.00 },
      ],
    },
  ];

  let inserted = 0;
  const errors: string[] = [];

  for (const row of data) {
    const { error } = await supabase.from("pjecalc_imposto_renda").upsert({
      competencia: row.competencia,
      deducao_dependente: row.deducao_dependente,
      deducao_aposentado_65: row.deducao_aposentado_65,
      faixas: row.faixas,
    }, { onConflict: "competencia" });
    if (error) errors.push(`IRRF ${row.competencia}: ${error.message}`);
    else inserted++;
  }

  return { table_slug: "imposto_renda", rows_inserted: inserted, rows_updated: 0, competencies_covered: data.map(d => d.competencia), errors };
}

async function importSalarioFamilia(supabase: any, runId: string): Promise<ImportResult> {
  const data = [
    { competencia: "2025-01-01", faixa: 1, valor_inicial: 0, valor_final: 1819.26, valor_cota: 62.04 },
    { competencia: "2025-01-01", faixa: 2, valor_inicial: 1819.27, valor_final: 99999.99, valor_cota: 0 },
    { competencia: "2024-01-01", faixa: 1, valor_inicial: 0, valor_final: 1819.26, valor_cota: 62.04 },
    { competencia: "2024-01-01", faixa: 2, valor_inicial: 1819.27, valor_final: 99999.99, valor_cota: 0 },
  ];

  let inserted = 0;
  const errors: string[] = [];
  for (const row of data) {
    const { error } = await supabase.from("pjecalc_salario_familia").upsert(row, { onConflict: "competencia,faixa" });
    if (error) errors.push(`SF ${row.competencia} F${row.faixa}: ${error.message}`);
    else inserted++;
  }
  return { table_slug: "salario_familia", rows_inserted: inserted, rows_updated: 0, competencies_covered: ["2025-01-01", "2024-01-01"], errors };
}

async function importSeguroDesemprego(supabase: any, runId: string): Promise<ImportResult> {
  const data = [
    { competencia: "2025-01-01", faixa: 1, valor_inicial: 0, valor_final: 2138.76, percentual: 80, valor_piso: 1518.00, valor_soma: null, valor_teto: 2313.74 },
    { competencia: "2025-01-01", faixa: 2, valor_inicial: 2138.77, valor_final: 3564.96, percentual: 50, valor_piso: 1518.00, valor_soma: 1711.01, valor_teto: 2313.74 },
    { competencia: "2025-01-01", faixa: 3, valor_inicial: 3564.97, valor_final: 99999.99, percentual: 0, valor_piso: 1518.00, valor_soma: null, valor_teto: 2313.74 },
  ];

  let inserted = 0;
  const errors: string[] = [];
  for (const row of data) {
    const { error } = await supabase.from("pjecalc_seguro_desemprego").upsert(row, { onConflict: "competencia,faixa" });
    if (error) errors.push(`SD ${row.competencia} F${row.faixa}: ${error.message}`);
    else inserted++;
  }
  return { table_slug: "seguro_desemprego", rows_inserted: inserted, rows_updated: 0, competencies_covered: ["2025-01-01"], errors };
}

async function importFeriados(supabase: any, runId: string): Promise<ImportResult> {
  // Feriados nacionais 2025-2026
  const feriados = [
    { data: "2025-01-01", nome: "Confraternização Universal", scope: "national" },
    { data: "2025-03-03", nome: "Carnaval", scope: "national" },
    { data: "2025-03-04", nome: "Carnaval", scope: "national" },
    { data: "2025-04-18", nome: "Sexta-feira Santa", scope: "national" },
    { data: "2025-04-21", nome: "Tiradentes", scope: "national" },
    { data: "2025-05-01", nome: "Dia do Trabalho", scope: "national" },
    { data: "2025-06-19", nome: "Corpus Christi", scope: "national" },
    { data: "2025-09-07", nome: "Independência do Brasil", scope: "national" },
    { data: "2025-10-12", nome: "Nossa Senhora Aparecida", scope: "national" },
    { data: "2025-11-02", nome: "Finados", scope: "national" },
    { data: "2025-11-15", nome: "Proclamação da República", scope: "national" },
    { data: "2025-11-20", nome: "Consciência Negra", scope: "national" },
    { data: "2025-12-25", nome: "Natal", scope: "national" },
    { data: "2026-01-01", nome: "Confraternização Universal", scope: "national" },
    { data: "2026-02-16", nome: "Carnaval", scope: "national" },
    { data: "2026-02-17", nome: "Carnaval", scope: "national" },
    { data: "2026-04-03", nome: "Sexta-feira Santa", scope: "national" },
    { data: "2026-04-21", nome: "Tiradentes", scope: "national" },
    { data: "2026-05-01", nome: "Dia do Trabalho", scope: "national" },
    { data: "2026-06-04", nome: "Corpus Christi", scope: "national" },
    { data: "2026-09-07", nome: "Independência do Brasil", scope: "national" },
    { data: "2026-10-12", nome: "Nossa Senhora Aparecida", scope: "national" },
    { data: "2026-11-02", nome: "Finados", scope: "national" },
    { data: "2026-11-15", nome: "Proclamação da República", scope: "national" },
    { data: "2026-11-20", nome: "Consciência Negra", scope: "national" },
    { data: "2026-12-25", nome: "Natal", scope: "national" },
  ];

  let inserted = 0;
  const errors: string[] = [];

  // Delete existing national holidays for these years to avoid duplicates
  await supabase.from("pjecalc_feriados").delete().eq("scope", "national").gte("data", "2025-01-01").lte("data", "2026-12-31");

  for (const f of feriados) {
    const { error } = await supabase.from("pjecalc_feriados").insert({ ...f, fonte: "Legislação Federal" });
    if (error) errors.push(`Feriado ${f.data}: ${error.message}`);
    else inserted++;
  }

  return { table_slug: "feriados", rows_inserted: inserted, rows_updated: 0, competencies_covered: ["2025", "2026"], errors };
}

async function importCorrecaoMonetaria(supabase: any, runId: string): Promise<ImportResult> {
  // IPCA-E mensal 2024-2025 (valores aproximados)
  const indices = [
    { competencia: "2024-01-01", indice: "IPCA-E", valor: 0.42, fonte: "IBGE" },
    { competencia: "2024-02-01", indice: "IPCA-E", valor: 0.78, fonte: "IBGE" },
    { competencia: "2024-03-01", indice: "IPCA-E", valor: 0.36, fonte: "IBGE" },
    { competencia: "2024-04-01", indice: "IPCA-E", valor: 0.21, fonte: "IBGE" },
    { competencia: "2024-05-01", indice: "IPCA-E", valor: 0.44, fonte: "IBGE" },
    { competencia: "2024-06-01", indice: "IPCA-E", valor: 0.30, fonte: "IBGE" },
    { competencia: "2024-07-01", indice: "IPCA-E", valor: 0.30, fonte: "IBGE" },
    { competencia: "2024-08-01", indice: "IPCA-E", valor: -0.02, fonte: "IBGE" },
    { competencia: "2024-09-01", indice: "IPCA-E", valor: 0.13, fonte: "IBGE" },
    { competencia: "2024-10-01", indice: "IPCA-E", valor: 0.54, fonte: "IBGE" },
    { competencia: "2024-11-01", indice: "IPCA-E", valor: 0.62, fonte: "IBGE" },
    { competencia: "2024-12-01", indice: "IPCA-E", valor: 0.34, fonte: "IBGE" },
    { competencia: "2025-01-01", indice: "IPCA-E", valor: 0.11, fonte: "IBGE" },
    { competencia: "2025-02-01", indice: "IPCA-E", valor: 1.23, fonte: "IBGE" },
    // SELIC mensal 2024-2025
    { competencia: "2024-01-01", indice: "SELIC", valor: 0.97, fonte: "BCB" },
    { competencia: "2024-02-01", indice: "SELIC", valor: 0.80, fonte: "BCB" },
    { competencia: "2024-03-01", indice: "SELIC", valor: 0.83, fonte: "BCB" },
    { competencia: "2024-04-01", indice: "SELIC", valor: 0.89, fonte: "BCB" },
    { competencia: "2024-05-01", indice: "SELIC", valor: 0.83, fonte: "BCB" },
    { competencia: "2024-06-01", indice: "SELIC", valor: 0.79, fonte: "BCB" },
    { competencia: "2024-07-01", indice: "SELIC", valor: 0.91, fonte: "BCB" },
    { competencia: "2024-08-01", indice: "SELIC", valor: 0.87, fonte: "BCB" },
    { competencia: "2024-09-01", indice: "SELIC", valor: 0.84, fonte: "BCB" },
    { competencia: "2024-10-01", indice: "SELIC", valor: 0.93, fonte: "BCB" },
    { competencia: "2024-11-01", indice: "SELIC", valor: 0.79, fonte: "BCB" },
    { competencia: "2024-12-01", indice: "SELIC", valor: 0.93, fonte: "BCB" },
    { competencia: "2025-01-01", indice: "SELIC", valor: 1.01, fonte: "BCB" },
    { competencia: "2025-02-01", indice: "SELIC", valor: 0.99, fonte: "BCB" },
  ];

  let inserted = 0;
  const errors: string[] = [];
  for (const row of indices) {
    const { error } = await supabase.from("pjecalc_correcao_monetaria").upsert(row, { onConflict: "competencia,indice" });
    if (error) errors.push(`CM ${row.indice} ${row.competencia}: ${error.message}`);
    else inserted++;
  }

  return { table_slug: "correcao_monetaria", rows_inserted: inserted, rows_updated: 0, competencies_covered: ["2024", "2025"], errors };
}

async function importJurosMora(supabase: any, runId: string): Promise<ImportResult> {
  // Juros trabalhista padrão 1% a.m. + SELIC
  const data: any[] = [];
  for (let year = 2020; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2025 && month > 2) break;
      const comp = `${year}-${String(month).padStart(2, "0")}-01`;
      data.push({ competencia: comp, tipo: "trabalhista", taxa_mensal: 1.0 });
    }
  }

  let inserted = 0;
  const errors: string[] = [];
  for (const row of data) {
    const { error } = await supabase.from("pjecalc_juros_mora").upsert(row, { onConflict: "competencia,tipo" });
    if (error) errors.push(`JM ${row.competencia}: ${error.message}`);
    else inserted++;
  }

  return { table_slug: "juros_mora", rows_inserted: inserted, rows_updated: 0, competencies_covered: ["2020-2025"], errors };
}
