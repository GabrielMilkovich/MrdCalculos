/**
 * =====================================================
 * SEED OFICIAL DE ÍNDICES — IPCA-E, SELIC, TR, INPC
 * =====================================================
 * Lê APIs oficiais (IBGE SIDRA / BCB SGS) e faz upsert na tabela
 * `pjecalc_correcao_monetaria` do Supabase (indice, competencia,
 * valor, acumulado, fonte).
 *
 * Uso:
 *   npx tsx scripts/seed-indices-oficiais.ts --help
 *   npx tsx scripts/seed-indices-oficiais.ts \
 *     --indice=IPCA-E,SELIC,TR,INPC --from=2015-01 --to=2026-02
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role).
 * =====================================================
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface IndiceRow {
  indice: string;
  competencia: string; // YYYY-MM-01
  valor: number;       // taxa mensal %
  acumulado: number;   // acumulado base 100 em 2014-12
}

interface BCBEntry { data: string; valor: string }
interface IBGEValor { V?: string; D2C?: string; D3C?: string; [k: string]: string | undefined }
interface RawRow { indice: string; competencia: string; valor: number; fonte: string }

const TABLE = 'pjecalc_correcao_monetaria';

// ----- helpers ---------------------------------------------------------

async function withRetry<T>(fn: () => Promise<T>, label: string, max = 3): Promise<T> {
  let lastErr: unknown = null;
  for (let i = 1; i <= max; i++) {
    try { return await fn(); } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[retry ${i}/${max}] ${label}: ${msg}`);
      if (i < max) await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label} falhou`);
}

const ymToComp = (ym: string): string => `${ym}-01`;
const bcbToYM = (d: string): string => {
  const [, mm, yyyy] = d.split('/');
  return `${yyyy}-${mm}`;
};
const parseRate = (raw: string): number => {
  const v = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(v)) throw new Error(`taxa inválida: ${raw}`);
  return v;
};

function buildAcumulado(rows: RawRow[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => a.competencia.localeCompare(b.competencia));
  let acum = 100;
  const out = new Map<string, number>();
  for (const r of sorted) {
    acum = acum * (1 + r.valor / 100);
    out.set(r.competencia, Number(acum.toFixed(8)));
  }
  return out;
}

function assemble(base: RawRow[], from: string, to: string): IndiceRow[] {
  const fromC = ymToComp(from), toC = ymToComp(to);
  const filtered = base.filter((r) => r.competencia >= fromC && r.competencia <= toC);
  const acum = buildAcumulado(filtered);
  return filtered.map((r) => ({
    indice: r.indice,
    competencia: r.competencia,
    valor: r.valor,
    acumulado: acum.get(r.competencia) ?? 100,
  }));
}

// ----- fetchers --------------------------------------------------------

async function fetchBcb(codigo: number, from: string): Promise<BCBEntry[]> {
  const [y, m] = from.split('-');
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=01/${m}/${y}`;
  return withRetry(async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`BCB série ${codigo}: HTTP ${res.status}`);
    return (await res.json()) as BCBEntry[];
  }, `BCB série ${codigo}`);
}

async function fetchIbge(tabela: number, variavel: number): Promise<IBGEValor[]> {
  const url = `https://apisidra.ibge.gov.br/values/t/${tabela}/n1/all/v/${variavel}/p/all`;
  return withRetry(async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`IBGE t=${tabela} v=${variavel}: HTTP ${res.status}`);
    const data = (await res.json()) as IBGEValor[];
    return data.slice(1);
  }, `IBGE t=${tabela} v=${variavel}`);
}

function bcbToRows(indice: string, raw: BCBEntry[]): RawRow[] {
  const acc: RawRow[] = [];
  for (const e of raw) {
    const row: RawRow = {
      indice,
      fonte: 'BCB',
      competencia: ymToComp(bcbToYM(e.data)),
      valor: parseRate(e.valor),
    };
    const idx = acc.findIndex((a) => a.competencia === row.competencia);
    if (idx >= 0) acc[idx] = row; else acc.push(row);
  }
  return acc;
}

function ibgeToRows(indice: string, raw: IBGEValor[]): RawRow[] {
  const out: RawRow[] = [];
  for (const row of raw) {
    const periodo = row.D2C ?? row.D3C;
    const v = row.V;
    if (!periodo || !v || v === '...' || v === '-') continue;
    if (!/^\d{6}$/.test(periodo)) continue;
    const ym = `${periodo.slice(0, 4)}-${periodo.slice(4, 6)}`;
    const valor = parseFloat(v.replace(',', '.'));
    if (!Number.isFinite(valor)) continue;
    out.push({ indice, fonte: 'IBGE', competencia: ymToComp(ym), valor });
  }
  return out;
}

export async function fetchIpcaE(from: string, to: string): Promise<IndiceRow[]> {
  console.log(`[IPCA-E] IBGE SIDRA t=1736 v=44 (${from} → ${to})`);
  return assemble(ibgeToRows('IPCA-E', await fetchIbge(1736, 44)), from, to);
}

export async function fetchSelicDiaria(from: string, to: string): Promise<IndiceRow[]> {
  console.log(`[SELIC] BCB SGS 11 diária → mensal (${from} → ${to})`);
  return assemble(bcbToRows('SELIC', await fetchBcb(11, from)), from, to);
}

export async function fetchTR(from: string, to: string): Promise<IndiceRow[]> {
  console.log(`[TR] BCB SGS 188 (${from} → ${to})`);
  return assemble(bcbToRows('TR', await fetchBcb(188, from)), from, to);
}

export async function fetchINPC(from: string, to: string): Promise<IndiceRow[]> {
  console.log(`[INPC] IBGE SIDRA t=1737 v=44 (${from} → ${to})`);
  return assemble(ibgeToRows('INPC', await fetchIbge(1737, 44)), from, to);
}

// ----- supabase --------------------------------------------------------

function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_KEY precisam estar definidos.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function seedToSupabase(rows: IndiceRow[]): Promise<void> {
  if (rows.length === 0) { console.log('[seed] nada a inserir.'); return; }
  const supabase = getClient();
  const chunkSize = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({
      indice: r.indice,
      competencia: r.competencia,
      valor: r.valor,
      acumulado: r.acumulado,
      fonte: r.indice === 'IPCA-E' || r.indice === 'INPC' ? 'IBGE' : 'BCB',
    }));
    const { error } = await supabase
      .from(TABLE)
      .upsert(chunk, { onConflict: 'competencia,indice' });
    if (error) throw new Error(`upsert chunk ${i}: ${error.message}`);
    done += chunk.length;
    console.log(`[seed] ${done}/${rows.length}`);
  }
  console.log(`[seed] OK — ${done} registros upserted em ${TABLE}.`);
}

// ----- CLI -------------------------------------------------------------

interface CliArgs { indices: string[]; from: string; to: string; dryRun: boolean; help: boolean }

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    indices: ['IPCA-E', 'SELIC', 'TR', 'INPC'],
    from: '2015-01',
    to: new Date().toISOString().slice(0, 7),
    dryRun: false,
    help: false,
  };
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--indice=')) out.indices = a.slice(9).split(',').map((s) => s.trim());
    else if (a.startsWith('--from=')) out.from = a.slice(7);
    else if (a.startsWith('--to=')) out.to = a.slice(5);
  }
  return out;
}

function printHelp(): void {
  console.log(`
seed-indices-oficiais — carga de índices oficiais no Supabase

Uso:
  npx tsx scripts/seed-indices-oficiais.ts [options]

Options:
  --indice=IPCA-E,SELIC,TR,INPC   quais séries (default: todas)
  --from=YYYY-MM                  mês inicial (default: 2015-01)
  --to=YYYY-MM                    mês final (default: hoje)
  --dry-run                       baixa + valida, não grava no DB
  --help, -h                      esta ajuda

Fontes:
  IPCA-E : IBGE SIDRA tabela 1736 variável 44
  SELIC  : BCB SGS 11 (diária, consolidada no fim do mês)
  TR     : BCB SGS 188
  INPC   : IBGE SIDRA tabela 1737

Requer: SUPABASE_URL e SUPABASE_SERVICE_KEY (service_role).
Frequência sugerida: mensal, após publicação oficial.
`.trim());
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); return; }
  const map: Record<string, (f: string, t: string) => Promise<IndiceRow[]>> = {
    'IPCA-E': fetchIpcaE,
    'SELIC': fetchSelicDiaria,
    'TR': fetchTR,
    'INPC': fetchINPC,
  };
  const all: IndiceRow[] = [];
  for (const ind of args.indices) {
    const fn = map[ind];
    if (!fn) { console.warn(`[skip] índice desconhecido: ${ind}`); continue; }
    const rows = await fn(args.from, args.to);
    console.log(`[${ind}] ${rows.length} linhas`);
    all.push(...rows);
  }
  if (args.dryRun) {
    console.log(`[dry-run] total: ${all.length} linhas — nada gravado.`);
    return;
  }
  await seedToSupabase(all);
}

const isMain = import.meta.url === `file://${process.argv[1]}`
  || process.argv[1]?.endsWith('seed-indices-oficiais.ts');
if (isMain) {
  main().catch((err) => {
    console.error('[fatal]', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
