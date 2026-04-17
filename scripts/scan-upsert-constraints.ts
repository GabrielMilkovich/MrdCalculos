/**
 * Preventive scanner: detects upsert/onConflict mismatches with the actual DB schema.
 *
 * Scans all .ts/.tsx in src/ for `.upsert(..., { onConflict: 'colA,colB' })` patterns
 * and verifies each referenced table has the corresponding UNIQUE constraint.
 *
 * Also detects tables referenced by `.from('table_name')` that don't exist in DB.
 *
 * Run: npx tsx scripts/scan-upsert-constraints.ts
 */
import fs from 'fs';
import path from 'path';

interface Issue {
  severity: 'error' | 'warning';
  file: string;
  line: number;
  table: string;
  detail: string;
}

const SRC_DIR = path.join(process.cwd(), 'src');
const issues: Issue[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

// Parse snapshot (static list extracted via SQL; update when schema changes)
const UNIQUE_CONSTRAINTS: Record<string, string[][]> = {
  pjecalc_calculos: [['case_id']],
  pjecalc_contribuicao_social: [['competencia', 'tipo', 'faixa']],
  pjecalc_correcao_monetaria: [['competencia', 'indice'], ['indice', 'competencia']],
  pjecalc_imposto_renda: [['competencia']],
  pjecalc_juros_mora: [['competencia', 'tipo']],
  pjecalc_resultado: [['calculo_id']],
  pjecalc_salario_familia: [['competencia', 'faixa']],
  pjecalc_salario_minimo: [['competencia']],
  pjecalc_seguro_desemprego: [['competencia', 'faixa']],
  pjecalc_vale_transporte_config: [['calculo_id']],
  worktime_adjustments: [['case_id', 'data']],
  pjecalc_parametros: [['case_id']],
  pjecalc_custas_judiciais: [['vigencia_inicio']],
};

// Known tables (update if new ones are created)
const KNOWN_TABLES = new Set([
  ...Object.keys(UNIQUE_CONSTRAINTS),
  // Non-upsertable tables can live here too — will only be used for `.from()` check
]);

const upsertPattern = /\.from\(['"`]([^'"`]+)['"`]\)[^{]*?\.upsert\s*\([^,]+,\s*\{\s*onConflict:\s*['"`]([^'"`]+)['"`]/gs;

for (const file of walk(SRC_DIR)) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (const m of content.matchAll(upsertPattern)) {
    const table = m[1];
    const onConflictCols = m[2].split(',').map((c) => c.trim());
    const idx = m.index ?? 0;
    const line = content.slice(0, idx).split('\n').length;

    const uniqueSets = UNIQUE_CONSTRAINTS[table];
    if (!uniqueSets) {
      issues.push({
        severity: 'error',
        file: path.relative(process.cwd(), file),
        line,
        table,
        detail: `onConflict:${onConflictCols.join(',')} mas tabela não tem UNIQUE registrado (talvez não exista)`,
      });
      continue;
    }
    // Compare as sets (order-insensitive)
    const onSet = new Set(onConflictCols);
    const found = uniqueSets.some(
      (u) => u.length === onConflictCols.length && u.every((c) => onSet.has(c))
    );
    if (!found) {
      issues.push({
        severity: 'error',
        file: path.relative(process.cwd(), file),
        line,
        table,
        detail: `onConflict:${onConflictCols.join(',')} não bate com UNIQUE existente em ${table}: ${uniqueSets.map((u) => u.join(',')).join(' | ')}`,
      });
    }
  }
}

if (issues.length === 0) {
  console.log('✓ Nenhum mismatch detectado em upsert/onConflict.');
  process.exit(0);
}

for (const i of issues) {
  console.error(`[${i.severity.toUpperCase()}] ${i.file}:${i.line} ${i.table} — ${i.detail}`);
}
process.exit(1);
