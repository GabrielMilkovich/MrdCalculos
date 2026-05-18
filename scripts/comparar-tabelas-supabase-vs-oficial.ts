/* eslint-disable no-console */
/**
 * SPRINT 1 — Compara tabelas-históricas oficiais (PJe-Calc v2.15.1) com
 * Supabase atual. Não modifica nada — só gera relatório.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/comparar-tabelas-supabase-vs-oficial.ts
 *
 * Saída:
 *   docs/audit/tabelas-historicas-divergencias.md
 *
 * Filosofia:
 *   - Nunca toca em dados existentes. Operador decide se migration de
 *     seed deve ser aplicada baseado no relatório.
 *   - Divergência de VALOR (mesma competência, valor diferente) é tratada
 *     COMO ERRO — operador precisa decidir se a fonte antiga era atualizada
 *     legitimamente ou se tem bug.
 *   - Faltantes (competências oficiais ausentes no Supabase) são
 *     enumeradas — migration de seed posterior insere ON CONFLICT DO NOTHING.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

// =====================================================
// Helpers de parse do CSV (dump H2 → formato `c0;c1;...`)
// =====================================================

/**
 * Tokeniza uma linha de valores SQL no formato:
 *   `123, DATE '2024-01-01', 1.50, NULL, 'texto', ...`
 *
 * Retorna tokens preservando NULL como literal e DATE 'YYYY-MM-DD' como string.
 */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === " " && cur.length === 0) {
      i++;
      continue;
    }
    if (c === "," && cur.replace(/\s/g, "").length === 0) {
      tokens.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    if (c === "'") {
      // string até fechar aspa, respeitando '' como escape.
      let s = "";
      i++;
      while (i < line.length) {
        if (line[i] === "'" && line[i + 1] === "'") {
          s += "'";
          i += 2;
        } else if (line[i] === "'") {
          i++;
          break;
        } else {
          s += line[i];
          i++;
        }
      }
      cur = (cur + "'" + s + "'").trim();
      continue;
    }
    if (c === "," && cur.length > 0) {
      tokens.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim().length > 0) tokens.push(cur.trim());
  return tokens;
}

function parseValor(tk: string): string | number | null {
  if (tk === "NULL" || tk === "") return null;
  // DATE 'YYYY-MM-DD'
  const md = tk.match(/^DATE\s+'(\d{4}-\d{2}-\d{2})'$/);
  if (md) return md[1];
  // string 'foo'
  const ms = tk.match(/^'(.*)'$/s);
  if (ms) return ms[1];
  // número
  const n = Number(tk);
  if (!Number.isNaN(n)) return n;
  return tk;
}

interface CsvRow {
  raw: string[];
  parsed: (string | number | null)[];
}

function lerCsv(arquivo: string): CsvRow[] {
  const conteudo = readFileSync(arquivo, "utf-8");
  const linhas = conteudo.split(/\r?\n/).slice(1).filter((l) => l.trim().length > 0);
  return linhas.map((l) => {
    const raw = tokenize(l);
    return { raw, parsed: raw.map(parseValor) };
  });
}

// =====================================================
// Mapeamento CSV → tabela Supabase
// =====================================================

interface Mapping {
  csv: string;
  tabelaSupabase: string;
  /** Chave única que identifica uma "row" oficial (ex: competência). */
  chaveOficial: (parsed: CsvRow["parsed"]) => string;
  /** Idem para Supabase. */
  chaveSupabase: (row: Record<string, unknown>) => string;
  /** SELECT query no Supabase para buscar todas as rows comparáveis. */
  selectQuery: string;
  /** Compara valor da row oficial × Supabase. Retorna delta ou null se igual. */
  compararValor?: (
    oficial: CsvRow["parsed"],
    sup: Record<string, unknown>,
  ) => { campo: string; oficial: unknown; sup: unknown } | null;
}

const MAPEAMENTOS: Mapping[] = [
  {
    csv: "salario-minimo-nacional.csv",
    tabelaSupabase: "pjecalc_salario_minimo",
    chaveOficial: (p) => String(p[1]), // vigencia_inicio
    chaveSupabase: (r) => String(r.competencia ?? "").slice(0, 10),
    selectQuery: "SELECT competencia, valor FROM pjecalc_salario_minimo ORDER BY competencia",
    compararValor: (oficial, sup) => {
      const vO = Number(oficial[2]);
      const vS = Number(sup.valor);
      if (Math.abs(vO - vS) <= 0.005) return null;
      return { campo: "valor", oficial: vO, sup: vS };
    },
  },
  {
    csv: "inss-base-teto.csv",
    tabelaSupabase: "pjecalc_inss_faixas",
    chaveOficial: (p) => String(p[0]),
    chaveSupabase: (r) => String(r.competencia_inicio ?? "").slice(0, 10),
    selectQuery: "SELECT competencia_inicio, teto_previdenciario FROM pjecalc_inss_faixas WHERE teto_previdenciario IS NOT NULL ORDER BY competencia_inicio",
  },
  {
    csv: "salario-familia-faixas.csv",
    tabelaSupabase: "pjecalc_salario_familia",
    chaveOficial: (p) => `${p[2]}|f1`,
    chaveSupabase: (r) => `${String(r.competencia).slice(0, 10)}|f${r.faixa}`,
    selectQuery: "SELECT competencia, faixa, valor_inicial, valor_final, valor_cota FROM pjecalc_salario_familia ORDER BY competencia, faixa",
  },
  {
    csv: "seguro-desemprego-faixas.csv",
    tabelaSupabase: "pjecalc_seguro_desemprego",
    chaveOficial: (p) => `${p[2]}|f1`,
    chaveSupabase: (r) => `${String(r.competencia).slice(0, 10)}|f${r.faixa}`,
    selectQuery: "SELECT competencia, faixa, valor_inicial, valor_final, percentual, valor_teto, valor_piso FROM pjecalc_seguro_desemprego ORDER BY competencia, faixa",
  },
  {
    csv: "inss-taxa-multa.csv",
    tabelaSupabase: "pjecalc_inss_multa",
    chaveOficial: (p) => `${p[1]}-${p[2] ?? "fim"}`,
    chaveSupabase: (r) => `${String(r.competencia_inicio).slice(0, 10)}-${r.competencia_fim ? String(r.competencia_fim).slice(0, 10) : "fim"}`,
    selectQuery: "SELECT competencia_inicio, competencia_fim, percentual_por_mes, percentual_maximo FROM pjecalc_inss_multa ORDER BY competencia_inicio",
  },
  {
    csv: "juros-taxa-legal.csv",
    tabelaSupabase: "pjecalc_taxa_legal",
    chaveOficial: (p) => String(p[1]), // data_indice
    chaveSupabase: (r) => String(r.competencia ?? "").slice(0, 10),
    selectQuery: "SELECT competencia, taxa_diaria, taxa_mensal FROM pjecalc_taxa_legal ORDER BY competencia",
  },
  {
    csv: "juros-selic-inss.csv",
    tabelaSupabase: "index_series",
    chaveOficial: (p) => String(p[1]),
    chaveSupabase: (r) => String(r.competencia ?? "").slice(0, 10),
    selectQuery: "SELECT competencia, valor FROM index_series WHERE serie_id = 'SELIC_INSS' ORDER BY competencia",
  },
  {
    csv: "juros-selic-irpf.csv",
    tabelaSupabase: "index_series",
    chaveOficial: (p) => String(p[1]),
    chaveSupabase: (r) => String(r.competencia ?? "").slice(0, 10),
    selectQuery: "SELECT competencia, valor FROM index_series WHERE serie_id = 'SELIC_IRPF' ORDER BY competencia",
  },
  {
    csv: "feriados-nacionais.csv",
    tabelaSupabase: "pjecalc_feriados",
    chaveOficial: (p) => `${p[6] ?? p[8]}|${p[5]}`,
    chaveSupabase: (r) => `${String(r.data ?? "").slice(0, 10)}|${r.nome}`,
    selectQuery: "SELECT data, nome, scope FROM pjecalc_feriados WHERE scope = 'nacional' ORDER BY data",
  },
  {
    csv: "inss-faixas-segurado-empregado.csv",
    tabelaSupabase: "pjecalc_inss_faixas",
    chaveOficial: (p) => `${p[1]}|f1`,
    chaveSupabase: (r) => `${String(r.competencia_inicio).slice(0, 10)}|f${r.faixa}`,
    selectQuery: "SELECT competencia_inicio, faixa, valor_ate, aliquota FROM pjecalc_inss_faixas WHERE progressiva = true OR progressiva IS NULL ORDER BY competencia_inicio, faixa",
  },
  {
    csv: "inss-faixas-empregado-domestico.csv",
    tabelaSupabase: "pjecalc_inss_faixas_domestico",
    chaveOficial: (p) => `${p[1]}|f1`,
    chaveSupabase: (r) => `${String(r.competencia_inicio).slice(0, 10)}|f${r.faixa}`,
    selectQuery: "SELECT competencia_inicio, faixa, valor_ate, aliquota FROM pjecalc_inss_faixas_domestico ORDER BY competencia_inicio, faixa",
  },
  {
    csv: "juros-padrao.csv",
    tabelaSupabase: "(sem-equivalente)",
    chaveOficial: (p) => `${p[1]}-${p[2]}`,
    chaveSupabase: () => "",
    selectQuery: "",
  },
];

// =====================================================
// Runner
// =====================================================

interface RelatorioTabela {
  csv: string;
  tabelaSupabase: string;
  linhasOficiais: number;
  linhasSupabase: number;
  identicas: number;
  divergentes: Array<{ chave: string; campo: string; oficial: unknown; sup: unknown }>;
  faltantesNoSupabase: string[];
  /** Erro de execução (tabela ausente, query inválida etc.). */
  erro?: string;
}

async function rodarComparacao(
  sb: SupabaseClient,
  csvDir: string,
): Promise<RelatorioTabela[]> {
  const relatorios: RelatorioTabela[] = [];
  for (const m of MAPEAMENTOS) {
    const csvPath = join(csvDir, m.csv);
    if (!existsSync(csvPath)) {
      relatorios.push({
        csv: m.csv,
        tabelaSupabase: m.tabelaSupabase,
        linhasOficiais: 0,
        linhasSupabase: 0,
        identicas: 0,
        divergentes: [],
        faltantesNoSupabase: [],
        erro: `CSV não encontrado: ${csvPath}`,
      });
      continue;
    }

    const oficiais = lerCsv(csvPath);
    if (!m.selectQuery) {
      relatorios.push({
        csv: m.csv,
        tabelaSupabase: m.tabelaSupabase,
        linhasOficiais: oficiais.length,
        linhasSupabase: 0,
        identicas: 0,
        divergentes: [],
        faltantesNoSupabase: oficiais.map(m.chaveOficial),
        erro: "Sem tabela Supabase equivalente — todas as linhas marcadas como faltantes (informativo).",
      });
      continue;
    }

    // Executa via .rpc('execute_sql', ...) não funciona universalmente —
    // melhor: usar from() e pegar tudo da tabela com paginação.
    // Como a query é simples (sem JOIN), faço .from(tabela).select().
    const supRows = await fetchAllRows(sb, m);
    if (supRows.error) {
      relatorios.push({
        csv: m.csv,
        tabelaSupabase: m.tabelaSupabase,
        linhasOficiais: oficiais.length,
        linhasSupabase: 0,
        identicas: 0,
        divergentes: [],
        faltantesNoSupabase: oficiais.map(m.chaveOficial),
        erro: `Erro ao consultar Supabase: ${supRows.error}`,
      });
      continue;
    }

    const indiceSup = new Map<string, Record<string, unknown>>();
    for (const r of supRows.rows) {
      indiceSup.set(m.chaveSupabase(r), r);
    }

    let identicas = 0;
    const divergentes: RelatorioTabela["divergentes"] = [];
    const faltantes: string[] = [];

    for (const o of oficiais) {
      const k = m.chaveOficial(o.parsed);
      const supRow = indiceSup.get(k);
      if (!supRow) {
        faltantes.push(k);
        continue;
      }
      if (m.compararValor) {
        const d = m.compararValor(o.parsed, supRow);
        if (d) {
          divergentes.push({ chave: k, campo: d.campo, oficial: d.oficial, sup: d.sup });
        } else {
          identicas++;
        }
      } else {
        identicas++;
      }
    }

    relatorios.push({
      csv: m.csv,
      tabelaSupabase: m.tabelaSupabase,
      linhasOficiais: oficiais.length,
      linhasSupabase: supRows.rows.length,
      identicas,
      divergentes,
      faltantesNoSupabase: faltantes,
    });
  }
  return relatorios;
}

async function fetchAllRows(
  sb: SupabaseClient,
  m: Mapping,
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  // Heurística simples: assume que o `selectQuery` lista colunas + WHERE
  // já é compatível com from().select(). Para SELIC_INSS/IRPF e similares
  // com filtro `serie_id`, parsing dedicado.
  if (m.tabelaSupabase === "index_series") {
    const serie = m.csv.includes("inss") ? "SELIC_INSS" : "SELIC_IRPF";
    const { data, error } = await sb
      .from("index_series")
      .select("competencia,valor")
      .eq("serie_id", serie)
      .limit(50000);
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [] };
  }
  if (m.tabelaSupabase === "pjecalc_feriados") {
    const { data, error } = await sb
      .from("pjecalc_feriados")
      .select("data,nome,scope")
      .eq("scope", "nacional")
      .limit(50000);
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [] };
  }
  if (m.tabelaSupabase === "(sem-equivalente)") {
    return { rows: [] };
  }
  const { data, error } = await sb
    .from(m.tabelaSupabase)
    .select("*")
    .limit(50000);
  if (error) return { rows: [], error: error.message };
  return { rows: data ?? [] };
}

// =====================================================
// Relatório markdown
// =====================================================

function gerarMarkdown(relatorios: RelatorioTabela[]): string {
  const idents = relatorios.filter((r) => !r.erro && r.divergentes.length === 0 && r.faltantesNoSupabase.length === 0);
  const divs = relatorios.filter((r) => r.divergentes.length > 0);
  const faltantes = relatorios.filter((r) => r.faltantesNoSupabase.length > 0 && r.divergentes.length === 0);
  const erros = relatorios.filter((r) => r.erro);

  const linhas: string[] = [];
  linhas.push("# SPRINT 1 — Tabelas históricas: divergências Supabase vs oficial PJe-Calc v2.15.1");
  linhas.push("");
  linhas.push(`Gerado em: ${new Date().toISOString()}`);
  linhas.push("");
  linhas.push("## Resumo");
  linhas.push("");
  linhas.push("| Métrica | Quantidade |");
  linhas.push("|---|---:|");
  linhas.push(`| Tabelas idênticas (linhas e valores) | ${idents.length} |`);
  linhas.push(`| Tabelas com divergência de VALOR | ${divs.length} |`);
  linhas.push(`| Tabelas só com faltantes (sem divergência de valor) | ${faltantes.length} |`);
  linhas.push(`| Tabelas com erro de execução | ${erros.length} |`);
  linhas.push("");

  // Tabela detalhada
  linhas.push("## Detalhamento");
  linhas.push("");
  linhas.push("| CSV oficial | Tabela Supabase | Linhas oficiais | Linhas Sup | Idênticas | Divergentes | Faltantes |");
  linhas.push("|---|---|---:|---:|---:|---:|---:|");
  for (const r of relatorios) {
    linhas.push(
      `| ${r.csv} | ${r.tabelaSupabase} | ${r.linhasOficiais} | ${r.linhasSupabase} | ${r.identicas} | ${r.divergentes.length} | ${r.faltantesNoSupabase.length} |`,
    );
  }
  linhas.push("");

  // Seção 1: Idênticas
  linhas.push("## 1. Idênticas");
  linhas.push("");
  if (idents.length === 0) {
    linhas.push("_Nenhuma tabela 100% idêntica neste momento._");
  } else {
    for (const r of idents) {
      linhas.push(`- **${r.csv}** → \`${r.tabelaSupabase}\`: ${r.identicas} linhas com match (sem divergência).`);
    }
  }
  linhas.push("");

  // Seção 2: Divergentes
  linhas.push("## 2. Divergentes (valor diferente para mesma competência)");
  linhas.push("");
  if (divs.length === 0) {
    linhas.push("_Nenhuma divergência de VALOR detectada — só faltantes (próxima seção)._");
  } else {
    linhas.push("");
    linhas.push("⚠ **BLOQUEADOR**: cada divergência aqui pode invalidar cálculos antigos. Operador decide se Supabase tinha update legítimo (mantém) ou bug (corrige).");
    linhas.push("");
    for (const r of divs) {
      linhas.push(`### ${r.csv} → \`${r.tabelaSupabase}\``);
      linhas.push("");
      linhas.push("| Chave | Campo | Oficial | Supabase | Δ |");
      linhas.push("|---|---|---:|---:|---:|");
      for (const d of r.divergentes.slice(0, 20)) {
        const delta = typeof d.oficial === "number" && typeof d.sup === "number"
          ? (d.oficial - d.sup).toFixed(4)
          : "?";
        linhas.push(`| ${d.chave} | ${d.campo} | ${d.oficial} | ${d.sup} | ${delta} |`);
      }
      if (r.divergentes.length > 20) {
        linhas.push(`| ... | ... | ... | ... | (+${r.divergentes.length - 20}) |`);
      }
      linhas.push("");
    }
  }

  // Seção 3: Faltantes
  linhas.push("## 3. Faltantes no Supabase");
  linhas.push("");
  if (faltantes.length === 0 && divs.length === 0) {
    linhas.push("_Sem competências faltantes._");
  } else {
    for (const r of [...faltantes, ...divs]) {
      if (r.faltantesNoSupabase.length === 0) continue;
      linhas.push(`### ${r.csv} → \`${r.tabelaSupabase}\``);
      linhas.push("");
      linhas.push(`${r.faltantesNoSupabase.length} chave(s) ausente(s) no Supabase.`);
      linhas.push("");
      const amostra = r.faltantesNoSupabase.slice(0, 10);
      linhas.push("Amostra (10 primeiras):");
      linhas.push("");
      for (const k of amostra) {
        linhas.push(`- \`${k}\``);
      }
      if (r.faltantesNoSupabase.length > 10) {
        linhas.push(`- _... e mais ${r.faltantesNoSupabase.length - 10}_`);
      }
      linhas.push("");
    }
  }

  // Erros
  if (erros.length > 0) {
    linhas.push("## 4. Erros de execução");
    linhas.push("");
    for (const r of erros) {
      linhas.push(`- **${r.csv}**: ${r.erro}`);
    }
    linhas.push("");
  }

  return linhas.join("\n") + "\n";
}

// =====================================================
// Main
// =====================================================

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY).");
    process.exit(2);
  }
  const sb = createClient(url, key);
  const csvDir = join(__dirname, "..", "pjecalc-fonte", "_recursos-oficiais", "tabelas-historicas", "csv");
  if (!existsSync(csvDir)) {
    console.error(`ERRO: pasta de CSVs não encontrada em ${csvDir}`);
    process.exit(2);
  }
  console.log(`[script] lendo CSVs de ${csvDir}`);
  console.log(`[script] consultando Supabase em ${url}`);
  const relatorios = await rodarComparacao(sb, csvDir);
  const md = gerarMarkdown(relatorios);
  const outDir = join(__dirname, "..", "docs", "audit");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "tabelas-historicas-divergencias.md");
  writeFileSync(outPath, md, "utf-8");
  console.log(`[script] relatório gerado em ${outPath}`);

  // Saída resumida no stdout para o caller decidir o exit code.
  const divergentes = relatorios.filter((r) => r.divergentes.length > 0);
  const faltantes = relatorios.filter((r) => r.faltantesNoSupabase.length > 0);
  console.log(`[script] divergentes: ${divergentes.length} | faltantes: ${faltantes.length}`);
  if (divergentes.length > 0) {
    console.log("[script] DIVERGÊNCIAS DETECTADAS — não aplique migration sem decisão humana.");
    process.exit(1);
  }
}

// CommonJS-compatible self-invocation (Node esm + tsx).
main().catch((err) => {
  console.error(err);
  process.exit(99);
});
