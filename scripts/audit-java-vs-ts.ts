#!/usr/bin/env tsx
/**
 * audit-java-vs-ts — Mede cobertura do port PJe-Calc v2.15.1 (Java) → TypeScript.
 *
 * Uso:
 *   npx tsx scripts/audit-java-vs-ts.ts                    (relatório humano + json)
 *   npx tsx scripts/audit-java-vs-ts.ts --json             (só JSON em stdout)
 *   npx tsx scripts/audit-java-vs-ts.ts --check            (exit 1 se cobertura regrediu)
 *   npx tsx scripts/audit-java-vs-ts.ts --out docs/x.json  (escreve snapshot)
 *
 * Uso em CI:
 *   - Roda `--check --baseline docs/baselines/audit-port-baseline.json`.
 *   - Falha o job se cobertura total ou de qualquer categoria piorar.
 *
 * Classifica todo arquivo `.java` em `pjecalc-fonte/` em 6 categorias e, para
 * cada um, verifica se existe arquivo TS equivalente em `src/lib/pjecalc/core/`
 * (convenção CamelCase → kebab-case). Conta linhas de código (exclui linhas em
 * branco e linhas que são apenas comentário de uma linha).
 *
 * Ver: docs/PORT-PJECALC-PLAN.md §10 (Manutenibilidade).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const JAVA_ROOT = path.join(REPO_ROOT, 'pjecalc-fonte');
const TS_ROOT = path.join(REPO_ROOT, 'src/lib/pjecalc/core');
const DEFAULT_BASELINE = path.join(REPO_ROOT, 'docs/baselines/audit-port-baseline.json');

// ───────────────────────── Tipos ─────────────────────────

type Category =
  | '1-CORE-CALCULO'
  | '2-TABELAS-INDICES'
  | '3-DOMINIO-SUPORTE'
  | '4-RELATORIOS'
  | '5-SERVICOS'
  | '6-META-DADOS'
  | 'EXCLUIDO';

interface JavaFile {
  absPath: string;
  /** Caminho relativo a `pjecalc-fonte/`, ex: `negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/Calculo.java`. */
  relPath: string;
  /** Package sem prefixo `br.jus.trt8.pjecalc.`. Ex: `negocio.dominio.calculo`. */
  pkg: string;
  /** Nome da classe. Ex: `Calculo`. */
  className: string;
  /** Path canônico por categoria, ex: `calculo`, `calculo/inss`, `verba`, `comum`. */
  moduleKey: string;
  category: Category;
  javaLoc: number;
  /** Caminho TS relativo ao repo, esperado ser o equivalente. */
  expectedTsRelPath: string;
  tsExists: boolean;
  tsLoc: number;
}

interface ModuleSummary {
  moduleKey: string;
  category: Category;
  fileCount: number;
  javaLoc: number;
  tsLoc: number;
  coveragePct: number;
  missingCount: number;
}

interface CategorySummary {
  category: Category;
  fileCount: number;
  javaLoc: number;
  tsLoc: number;
  coveragePct: number;
  missingCount: number;
}

interface AuditReport {
  generatedAt: string;
  repoRoot: string;
  totals: {
    javaFiles: number;
    tsFilesMatched: number;
    javaLoc: number;
    tsLoc: number;
    coveragePct: number;
  };
  categories: CategorySummary[];
  modules: ModuleSummary[];
  /** Top gaps: classes com maior gap absoluto (linhas Java não portadas). */
  topGaps: Array<{
    className: string;
    pkg: string;
    category: Category;
    javaLoc: number;
    tsLoc: number;
    gap: number;
    expectedTsRelPath: string;
  }>;
}

// ───────────────────────── Helpers ─────────────────────────

function walk(dir: string, exts: string[], acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, exts, acc);
    else if (exts.some((e) => entry.name.endsWith(e))) acc.push(p);
  }
  return acc;
}

function countJavaLoc(absPath: string): number {
  const src = fs.readFileSync(absPath, 'utf-8');
  let loc = 0;
  let inBlockComment = false;
  for (const raw of src.split('\n')) {
    let line = raw.trim();
    if (!line) continue;
    if (inBlockComment) {
      if (line.includes('*/')) {
        inBlockComment = false;
        line = line.slice(line.indexOf('*/') + 2).trim();
        if (!line) continue;
      } else continue;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) {
        inBlockComment = true;
        continue;
      }
      line = line.replace(/\/\*.*?\*\//g, '').trim();
      if (!line) continue;
    }
    if (line.startsWith('//')) continue;
    loc += 1;
  }
  return loc;
}

function countTsLoc(absPath: string): number {
  return countJavaLoc(absPath); // mesma regra (// e /* */ de linha)
}

function camelToKebab(s: string): string {
  return s
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

const PACKAGE_PREFIX_REGEX = /^br\/jus\/trt8\/pjecalc\//;

function parseJavaFile(absPath: string): JavaFile {
  const relPath = path.relative(JAVA_ROOT, absPath);
  // `negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/Calculo.java`
  // ou `base/br/jus/trt8/pjecalc/base/comum/Utils.java`
  const parts = relPath.split(path.sep);
  // Index de `br`
  const brIdx = parts.findIndex((p) => p === 'br');
  const afterBr = brIdx >= 0 ? parts.slice(brIdx).join('/') : relPath;
  // Remove prefixo `br/jus/trt8/pjecalc/`
  const cleaned = afterBr.replace(PACKAGE_PREFIX_REGEX, '');
  // Ex: `negocio/dominio/calculo/Calculo.java` ou `base/comum/Utils.java`
  const segs = cleaned.split('/');
  const className = segs[segs.length - 1].replace(/\.java$/, '');
  const pkgSegs = segs.slice(0, -1);
  const pkg = pkgSegs.join('.');

  const javaLoc = countJavaLoc(absPath);

  // ── Classificação de categoria ─────────────────────
  let category: Category;
  let moduleKey = pkgSegs.slice(1).join('/') || pkgSegs[0]; // tudo depois de "negocio"/"base"

  // Exclui repositorios, filtros, DTOs de web-service óbvios — fora do escopo
  if (
    className.startsWith('Repositorio') ||
    className.startsWith('Filtro') ||
    className.endsWith('Filtro') ||
    className.endsWith('JRAdapter')
  ) {
    // Repositorio e Filtro são EXCLUIDOS; JRAdapter é 4-RELATORIOS
    if (className.endsWith('JRAdapter')) category = '4-RELATORIOS';
    else category = 'EXCLUIDO';
  } else if (pkg.includes('.relatorio') || pkg.includes('/relatorio')) {
    category = '4-RELATORIOS';
  } else if (pkg.startsWith('negocio.servicos') || pkg.endsWith('.servicos')) {
    category = '5-SERVICOS';
  } else if (
    // Meta-dados: usuario, processo, perfil, assuntocnj
    /\.(usuario|processo|perfil|assuntocnj|controle|auditoria|loginfra|participante)(\.|$)/.test(
      pkg,
    ) ||
    pkgSegs[pkgSegs.length - 1] === 'usuario' ||
    pkgSegs[pkgSegs.length - 1] === 'processo' ||
    pkgSegs[pkgSegs.length - 1] === 'perfil'
  ) {
    category = '6-META-DADOS';
  } else if (pkg.includes('.indices') || pkgSegs.includes('indices')) {
    category = '2-TABELAS-INDICES';
  } else if (
    pkg.startsWith('base.comum') ||
    pkg.startsWith('negocio.comum') ||
    pkg.startsWith('negocio.constantes') ||
    pkg.includes('.feriado') ||
    pkg.includes('.municipio') ||
    pkg.includes('.estado') ||
    pkg.includes('.salariominimo') ||
    pkg.includes('.salariocategoria') ||
    pkg.includes('.justificativa') ||
    pkg.includes('.valetransporte')
  ) {
    category = '3-DOMINIO-SUPORTE';
  } else if (pkg.startsWith('negocio.dominio') || pkg.startsWith('base.')) {
    category = '1-CORE-CALCULO';
  } else {
    category = '3-DOMINIO-SUPORTE';
  }

  // moduleKey para agregação: pega penúltimo nível para dominio/calculo/inss → "calculo/inss"
  if (category === '1-CORE-CALCULO') {
    // pkgSegs: ['negocio','dominio','calculo','inss'] ⇒ moduleKey='calculo/inss'
    const dom = pkgSegs.indexOf('dominio');
    if (dom >= 0) {
      moduleKey = pkgSegs.slice(dom + 1).join('/') || 'calculo';
    }
  } else if (category === '2-TABELAS-INDICES') {
    const ind = pkgSegs.indexOf('indices');
    moduleKey = ind >= 0 ? pkgSegs.slice(ind).join('/') : 'indices';
  } else if (category === '3-DOMINIO-SUPORTE') {
    moduleKey = pkgSegs[pkgSegs.length - 1] || 'support';
  } else if (category === '4-RELATORIOS') {
    moduleKey = 'relatorio';
  } else if (category === '5-SERVICOS') {
    moduleKey = 'servicos';
  } else if (category === '6-META-DADOS') {
    moduleKey = pkgSegs[pkgSegs.length - 1] || 'meta';
  } else {
    moduleKey = 'excluido';
  }

  // ── Inferência do caminho TS esperado ───────────────────
  const tsDirParts = pkgSegs
    .filter((s) => !['br', 'jus', 'trt8', 'pjecalc'].includes(s))
    .map((s) => s.toLowerCase());
  // remove prefixo "negocio" ou "base" (o TS usa apenas core/base/..., core/dominio/..., etc.)
  if (tsDirParts[0] === 'negocio') tsDirParts.shift();
  if (tsDirParts[0] === 'base') tsDirParts.shift();
  const tsFileName = camelToKebab(className) + '.ts';
  const expectedTsRelPath = path.join(
    path.relative(REPO_ROOT, TS_ROOT),
    ...tsDirParts,
    tsFileName,
  );

  const tsAbsPath = path.join(REPO_ROOT, expectedTsRelPath);
  const tsExists = fs.existsSync(tsAbsPath);
  const tsLoc = tsExists ? countTsLoc(tsAbsPath) : 0;

  return {
    absPath,
    relPath,
    pkg,
    className,
    moduleKey,
    category,
    javaLoc,
    expectedTsRelPath,
    tsExists,
    tsLoc,
  };
}

// ───────────────────────── Agregação ─────────────────────────

function aggregate(files: JavaFile[]): AuditReport {
  // Mantém todos os arquivos — não filtra mais os excluídos aqui;
  // eles entram como categoria 'EXCLUIDO' e são omitidos das visualizações
  // principais, mas ficam no JSON para rastreabilidade.
  const scope = files.filter((f) => f.category !== 'EXCLUIDO');

  const byCat = new Map<Category, CategorySummary>();
  for (const f of scope) {
    const s = byCat.get(f.category) ?? {
      category: f.category,
      fileCount: 0,
      javaLoc: 0,
      tsLoc: 0,
      coveragePct: 0,
      missingCount: 0,
    };
    s.fileCount++;
    s.javaLoc += f.javaLoc;
    s.tsLoc += f.tsLoc;
    if (!f.tsExists) s.missingCount++;
    byCat.set(f.category, s);
  }
  for (const s of byCat.values()) {
    s.coveragePct = s.javaLoc > 0 ? (100 * s.tsLoc) / s.javaLoc : 0;
  }

  const byMod = new Map<string, ModuleSummary>();
  for (const f of scope) {
    const key = `${f.category}|${f.moduleKey}`;
    const s = byMod.get(key) ?? {
      moduleKey: f.moduleKey,
      category: f.category,
      fileCount: 0,
      javaLoc: 0,
      tsLoc: 0,
      coveragePct: 0,
      missingCount: 0,
    };
    s.fileCount++;
    s.javaLoc += f.javaLoc;
    s.tsLoc += f.tsLoc;
    if (!f.tsExists) s.missingCount++;
    byMod.set(key, s);
  }
  for (const s of byMod.values()) {
    s.coveragePct = s.javaLoc > 0 ? (100 * s.tsLoc) / s.javaLoc : 0;
  }

  const totalJava = scope.reduce((a, f) => a + f.javaLoc, 0);
  const totalTs = scope.reduce((a, f) => a + f.tsLoc, 0);
  const tsFilesMatched = scope.filter((f) => f.tsExists).length;

  const topGaps = scope
    .filter((f) => f.javaLoc >= 200)
    .map((f) => ({
      className: f.className,
      pkg: f.pkg,
      category: f.category,
      javaLoc: f.javaLoc,
      tsLoc: f.tsLoc,
      gap: f.javaLoc - f.tsLoc,
      expectedTsRelPath: f.expectedTsRelPath,
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 25);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: path.basename(REPO_ROOT),
    totals: {
      javaFiles: scope.length,
      tsFilesMatched,
      javaLoc: totalJava,
      tsLoc: totalTs,
      coveragePct: totalJava > 0 ? (100 * totalTs) / totalJava : 0,
    },
    categories: Array.from(byCat.values()).sort((a, b) => b.javaLoc - a.javaLoc),
    modules: Array.from(byMod.values()).sort((a, b) => b.javaLoc - a.javaLoc),
    topGaps,
  };
}

// ───────────────────────── Render humano ─────────────────────────

function renderHuman(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`Auditoria Port PJe-Calc  @ ${report.generatedAt}`);
  lines.push('━'.repeat(78));
  const t = report.totals;
  lines.push(
    `Totais: ${t.javaFiles} classes Java | ${t.tsFilesMatched} TS presentes | ` +
      `${t.javaLoc} loc Java | ${t.tsLoc} loc TS | cobertura ${t.coveragePct.toFixed(1)}%`,
  );
  lines.push('');
  lines.push('Por categoria:');
  lines.push('  Categoria                    Arqs    Java       TS    Cov%   Missing');
  for (const c of report.categories) {
    lines.push(
      `  ${c.category.padEnd(28)} ${String(c.fileCount).padStart(4)}  ${String(c.javaLoc).padStart(6)}  ${String(
        c.tsLoc,
      ).padStart(6)}  ${c.coveragePct.toFixed(1).padStart(5)}%  ${String(c.missingCount).padStart(5)}`,
    );
  }
  lines.push('');
  lines.push('Top 15 módulos por gap absoluto:');
  const sortedByGap = [...report.modules].sort(
    (a, b) => b.javaLoc - b.tsLoc - (a.javaLoc - a.tsLoc),
  );
  lines.push('  Categoria         Módulo                      Arqs   Java     TS   Cov%');
  for (const m of sortedByGap.slice(0, 15)) {
    lines.push(
      `  ${m.category.padEnd(17)} ${m.moduleKey.padEnd(27)} ${String(m.fileCount).padStart(4)}  ${String(
        m.javaLoc,
      ).padStart(6)}  ${String(m.tsLoc).padStart(6)}  ${m.coveragePct.toFixed(1).padStart(5)}%`,
    );
  }
  lines.push('');
  lines.push('Top 15 classes por gap absoluto (linhas Java não portadas):');
  for (const g of report.topGaps.slice(0, 15)) {
    lines.push(
      `  ${g.className.padEnd(48)} ${String(g.javaLoc).padStart(5)} Java ${String(
        g.tsLoc,
      ).padStart(5)} TS → gap ${String(g.gap).padStart(5)}`,
    );
  }
  return lines.join('\n');
}

// ───────────────────────── Main ─────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const isCheck = argv.includes('--check');
  const outIdx = argv.indexOf('--out');
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : undefined;
  const baseIdx = argv.indexOf('--baseline');
  const baselinePath = baseIdx >= 0 ? argv[baseIdx + 1] : DEFAULT_BASELINE;

  if (!fs.existsSync(JAVA_ROOT)) {
    console.error(`[ERRO] ${JAVA_ROOT} não encontrado.`);
    process.exit(2);
  }

  const javaFiles = walk(JAVA_ROOT, ['.java']);
  const parsed = javaFiles.map(parseJavaFile);
  const report = aggregate(parsed);

  if (outPath) {
    const abs = path.isAbsolute(outPath) ? outPath : path.join(REPO_ROOT, outPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, JSON.stringify(report, null, 2));
    if (!asJson) console.error(`[audit] snapshot escrito em ${path.relative(REPO_ROOT, abs)}`);
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderHuman(report));
  }

  if (isCheck) {
    if (!fs.existsSync(baselinePath)) {
      console.error(
        `[check] baseline ${baselinePath} não existe. Gere com: npx tsx scripts/audit-java-vs-ts.ts --out ${path.relative(
          REPO_ROOT,
          baselinePath,
        )}`,
      );
      process.exit(3);
    }
    const baseline: AuditReport = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    const regressions: string[] = [];
    // Total
    if (report.totals.coveragePct + 1e-6 < baseline.totals.coveragePct) {
      regressions.push(
        `total: ${report.totals.coveragePct.toFixed(2)}% < baseline ${baseline.totals.coveragePct.toFixed(2)}%`,
      );
    }
    // Por categoria
    const baseCats = new Map(baseline.categories.map((c) => [c.category, c]));
    for (const c of report.categories) {
      const b = baseCats.get(c.category);
      if (b && c.coveragePct + 1e-6 < b.coveragePct) {
        regressions.push(
          `${c.category}: ${c.coveragePct.toFixed(2)}% < baseline ${b.coveragePct.toFixed(2)}%`,
        );
      }
    }
    if (regressions.length > 0) {
      console.error('\n[check] REGRESSÕES DETECTADAS:');
      for (const r of regressions) console.error(`  - ${r}`);
      console.error('');
      process.exit(1);
    }
    if (!asJson) console.error('[check] OK — nenhuma regressão de cobertura.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
