/* eslint-disable no-console */
/**
 * SPRINT 1.1 — Extrair casos potencialmente afetados pelas 3 correções
 * de tabelas históricas.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/extrair-casos-afetados.ts
 *
 * Gera 3 CSVs em docs/audit/casos-afetados/:
 *   - salario-familia.csv
 *   - inss-2003-2014.csv
 *   - multa-1996-2009.csv
 *
 * Read-only. Não modifica Supabase.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUTDIR = join(__dirname, "..", "docs", "audit", "casos-afetados");

interface CasoRow {
  case_id: string;
  criado_em: string | null;
  cliente: string | null;
  [k: string]: unknown;
}

function toCsv(rows: CasoRow[], header: string[]): string {
  const linhas = [header.join(",")];
  for (const r of rows) {
    linhas.push(
      header
        .map((h) => {
          const v = r[h];
          if (v === null || v === undefined) return "";
          const s = String(v).replace(/"/g, '""');
          return s.includes(",") || s.includes('"') ? `"${s}"` : s;
        })
        .join(","),
    );
  }
  return linhas.join("\n") + "\n";
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(2);
  }
  const sb = createClient(url, key);
  mkdirSync(OUTDIR, { recursive: true });

  // ────────── 1. salário-família ──────────
  // Casos com pjecalc_sal_familia_config.apurar = true.
  // Conta com o último cálculo salvo para mostrar total atual.
  const { data: sf, error: errSf } = await sb.rpc("exec_sql_select", {
    sql: `
      SELECT DISTINCT
        cases.id AS case_id,
        cases.criado_em::text,
        cases.cliente,
        pr.total_reclamante::text AS total_liquido_atual
      FROM cases
      JOIN pjecalc_sal_familia_config sf ON sf.case_id = cases.id AND sf.apurar = true
      LEFT JOIN pjecalc_calculos pc ON pc.case_id = cases.id
      LEFT JOIN pjecalc_resultado pr ON pr.calculo_id = pc.id
      ORDER BY cases.criado_em DESC
    `,
  }).catch(() => ({ data: null, error: { message: "exec_sql_select rpc indisponível — script precisa de fallback via .from()" } }));

  // Fallback sem RPC: 3 queries .from() encadeadas (mais lento mas portável).
  let salarioFamilia: CasoRow[];
  if (sf && Array.isArray(sf)) {
    salarioFamilia = sf as CasoRow[];
  } else {
    // Fallback manual.
    const { data: configs } = await sb
      .from("pjecalc_sal_familia_config")
      .select("case_id")
      .eq("apurar", true);
    const ids = (configs ?? []).map((c) => c.case_id as string);
    if (ids.length === 0) {
      salarioFamilia = [];
    } else {
      const { data: cs } = await sb
        .from("cases")
        .select("id, criado_em, cliente")
        .in("id", ids);
      salarioFamilia = (cs ?? []).map((c) => ({
        case_id: c.id as string,
        criado_em: c.criado_em as string | null,
        cliente: c.cliente as string | null,
        total_liquido_atual: "(nao-disponivel-via-fallback)",
      }));
    }
  }
  writeFileSync(
    join(OUTDIR, "salario-familia.csv"),
    toCsv(salarioFamilia, ["case_id", "criado_em", "cliente", "total_liquido_atual"]),
  );
  console.log(`[script] salario-familia: ${salarioFamilia.length} casos`);

  // ────────── 2. INSS 2003-2014 ──────────
  const { data: empPeriodo } = await sb
    .from("employment_contracts")
    .select("case_id, data_admissao, data_demissao")
    .lte("data_admissao", "2014-12-31")
    .gte("data_demissao", "2003-01-01");
  const empIds = (empPeriodo ?? []).map((r) => r.case_id as string);

  const { data: csConfigs } = empIds.length === 0
    ? { data: [] as Array<{ case_id: string }> }
    : await sb
        .from("pjecalc_cs_config")
        .select("case_id")
        .eq("apurar_segurado", true)
        .in("case_id", empIds);
  const csIds = new Set((csConfigs ?? []).map((r) => r.case_id as string));
  const empFiltradas = (empPeriodo ?? []).filter((r) => csIds.has(r.case_id as string));

  const inssCases: CasoRow[] = [];
  if (empFiltradas.length > 0) {
    const ids = empFiltradas.map((r) => r.case_id as string);
    const { data: cs } = await sb
      .from("cases")
      .select("id, criado_em, cliente")
      .in("id", ids);
    const mapEmp = new Map(empFiltradas.map((r) => [r.case_id as string, r]));
    for (const c of cs ?? []) {
      const e = mapEmp.get(c.id as string);
      inssCases.push({
        case_id: c.id as string,
        criado_em: c.criado_em as string | null,
        cliente: c.cliente as string | null,
        periodo_inicio: e?.data_admissao as string | undefined,
        periodo_fim: e?.data_demissao as string | undefined,
        inss_segurado_atual: "(precisa-query-rpc)",
      });
    }
  }
  writeFileSync(
    join(OUTDIR, "inss-2003-2014.csv"),
    toCsv(inssCases, ["case_id", "criado_em", "cliente", "periodo_inicio", "periodo_fim", "inss_segurado_atual"]),
  );
  console.log(`[script] inss-2003-2014: ${inssCases.length} casos`);

  // ────────── 3. multa 1996-2009 ──────────
  const { data: empDemissao } = await sb
    .from("employment_contracts")
    .select("case_id, data_demissao")
    .gte("data_demissao", "1996-01-01")
    .lte("data_demissao", "2009-01-27");
  const demIds = (empDemissao ?? []).map((r) => r.case_id as string);

  let multaCases: CasoRow[] = [];
  if (demIds.length > 0) {
    const { data: calcs } = await sb
      .from("pjecalc_calculos")
      .select("id, case_id")
      .in("case_id", demIds);
    const calcMap = new Map((calcs ?? []).map((c) => [c.id as string, c.case_id as string]));
    const calcIds = (calcs ?? []).map((c) => c.id as string);
    const { data: results } = calcIds.length === 0
      ? { data: [] as Array<{ calculo_id: string; multa_467: number; multa_477: number }> }
      : await sb
          .from("pjecalc_resultado")
          .select("calculo_id, multa_467, multa_477")
          .in("calculo_id", calcIds);
    const comMulta = (results ?? []).filter(
      (r) => (Number(r.multa_467) || 0) > 0 || (Number(r.multa_477) || 0) > 0,
    );
    const idsComMulta = new Set(comMulta.map((r) => calcMap.get(r.calculo_id as string)).filter(Boolean) as string[]);
    if (idsComMulta.size > 0) {
      const { data: cs } = await sb
        .from("cases")
        .select("id, criado_em, cliente")
        .in("id", Array.from(idsComMulta));
      const mapDem = new Map(empDemissao!.map((r) => [r.case_id as string, r.data_demissao as string]));
      const mapMulta = new Map<string, number>();
      for (const r of comMulta) {
        const caseId = calcMap.get(r.calculo_id as string);
        if (caseId) {
          mapMulta.set(caseId, (Number(r.multa_467) || 0) + (Number(r.multa_477) || 0));
        }
      }
      multaCases = (cs ?? []).map((c) => ({
        case_id: c.id as string,
        criado_em: c.criado_em as string | null,
        cliente: c.cliente as string | null,
        data_demissao: mapDem.get(c.id as string),
        multa_atual: mapMulta.get(c.id as string),
      }));
    }
  }
  writeFileSync(
    join(OUTDIR, "multa-1996-2009.csv"),
    toCsv(multaCases, ["case_id", "criado_em", "cliente", "data_demissao", "multa_atual"]),
  );
  console.log(`[script] multa-1996-2009: ${multaCases.length} casos`);

  console.log("\nResumo PASSO A.2:");
  console.log(`  salario_familia:  ${salarioFamilia.length}`);
  console.log(`  inss_2003_2014:   ${inssCases.length}`);
  console.log(`  multa_1996_2009:  ${multaCases.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
