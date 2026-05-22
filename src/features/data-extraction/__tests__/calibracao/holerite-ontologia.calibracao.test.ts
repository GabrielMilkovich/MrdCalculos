/**
 * Sprint 3c Fase 4 — calibração da integração ontologia no exporter de
 * holerite contra 3 PDFs de contracheque REAIS já versionados no repo:
 *
 *   - Roque Guerreiro (Via Varejo antigo)   — 73 holerites (pgs)
 *   - Rosicleia até 06/2021 (Via Varejo)    — 44 holerites
 *   - Rosicleia após 06/2021 (Grupo Casas
 *     Bahia, layout SAP novo pós-transição) — 35 holerites
 *
 * Os textos OCR estão em `scripts/calibracao/ocr-holerites/*.txt`,
 * extraídos via `scripts/calibracao/extrair-holerites.py`. Cada arquivo
 * é 1 holerite isolado.
 *
 * ====================================================================
 * PIPELINE — espelha o caminho V6 de produção
 * ====================================================================
 *
 * Em produção, holerites V6 (`ocr_provider='pdfjs_geometric'`) seguem:
 *   PDF → extractor geométrico → DocumentoTabular → mapper Deno
 *       → documents.parsed JSONB (com rubricas_classificadas)
 *       → frontend lê e passa pra classifyHolerite
 *
 * Pra calibrar, replicamos esse caminho:
 *   1. `docTabularSintetico(ocrText)` → DocumentoTabular mínimo
 *      (mesma fábrica usada em `v6-mappers.test.ts`)
 *   2. `escolherMapper(doc, 'holerite')` → seleciona Via Varejo OU genérico
 *   3. `mapper.mapear(doc)` → `HoleriteResultDominio` com
 *      `rubricas_classificadas` já populado pelo `enriquecerComClassificacao`
 *      interno do mapper (Sprint 2)
 *   4. `classifyHolerite({...parsed, rubricas_classificadas})` →
 *      `ClassificacaoHolerite` (Sprint 3c, camada 2 ativa)
 *
 * NOTA: a 1ª iteração usou `parseHolerite(ocrText)` frontend mas ele
 * NÃO suporta o formato ADP Via Varejo antigo (linhas com pipes
 * `0712 NOME | 30,00 | 1.469,18 |`). Resultado: 1-2 rubricas/holerite
 * em vez de 8-15, cobertura ~0%. Pivotamos pro caminho V6 (mapper Deno)
 * que é o caminho real de produção. Adaptar o parser frontend pra
 * cobrir layout antigo com pipes fica como dívida Sprint 3c.1 (relevante
 * apenas quando documento for processado SEM V6, fluxo legado).
 *
 * ====================================================================
 * METODOLOGIA (anti-tautologia)
 * ====================================================================
 *
 * Risco: usar o próprio `enriquecerComClassificacao` (que é o que
 * estamos auditando) também como ground truth vira tautologia (foi
 * o que aconteceu na 1ª tentativa da Sprint 3 Fase 4).
 *
 * Solução adotada:
 *   - OBSERVADO = saída de `classifyHolerite`, que internamente usou
 *     `enriquecerComClassificacao` (normalização robusta: NFD, sem
 *     acentos, sinônimos, fuzzy Levenshtein @ 0.85)
 *   - ESPERADO  = lookup literal direto no catálogo `ONTOLOGIA`
 *     (`texto_canonico` ou string em `sinonimos[]`), com normalização
 *     mínima (`trim` + `toLowerCase` — sem NFD, sem strip de
 *     pontuação, sem colapso de espaços)
 *
 * Diferença real entre os 2:
 *   - Concordância → ok
 *   - Literal não acha (fuzzy do classifier foi mais agressivo) →
 *     FUZZY_ONLY, não conta nem ok nem erro
 *   - Literal acha e diverge → BUG REAL
 *
 * Métricas:
 *   - COBERTURA = (origem=ontologia + ontologia_desconsiderar) / total
 *     Meta ≥60% Via Varejo (composição típica)
 *   - CORREÇÃO = concordantes / (literal-auditáveis)
 *     Meta 100% (escritório validou as 96 rubricas na Sprint 2)
 *
 * Assertion: SOFT. Não falha CI hoje (calibração informativa).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyHolerite } from '../../export/per-doc/holerite-classify';
import {
  ONTOLOGIA,
  type CategoriaRubrica,
} from '../../../../../supabase/functions/_shared/ontologia-rubricas/index';
import type {
  DocumentoTabular,
} from '../../../../../supabase/functions/_shared/documento-tabular';
import { escolherMapper } from '../../../../../supabase/functions/_shared/mappers/dispatcher';
import type {
  RubricaParseada,
  RubricaClassificada,
} from '../../parsers/holerite/types';
import type { CategoriaSlug } from '../../types';

// ─── Espelho do mapeamento ontologia→slug (Sprint 3c Fase 1) ───────────
// Repetido aqui APENAS pra computar "qual slug eu esperaria dado o
// resultado do lookup literal". Sincronizado manualmente com
// ONTOLOGIA_PARA_CATEGORIA_SLUG do classifier.
const SLUG_ESPERADO: Record<CategoriaRubrica, CategoriaSlug | null> = {
  MINIMO_GARANTIDO: 'minimo_garantido',
  COMISSAO_PRODUTOS: 'comissao',
  COMISSAO_SERVICOS: 'comissao',
  PREMIO: 'premiacao',
  DSR_PAGO: 'dsr',
  DESCONSIDERAR: null,
  NAO_CLASSIFICADO: null,
};

// ─── Lookup literal independente (anti-tautologia) ─────────────────────
const normLiteral = (s: string): string => s.trim().toLowerCase();

const CATALOGO_LITERAL = new Map<string, CategoriaRubrica>();
for (const r of ONTOLOGIA) {
  CATALOGO_LITERAL.set(normLiteral(r.texto_canonico), r.categoria);
  for (const s of r.sinonimos) {
    if (!CATALOGO_LITERAL.has(normLiteral(s))) {
      CATALOGO_LITERAL.set(normLiteral(s), r.categoria);
    }
  }
}

function lookupLiteral(nome: string): CategoriaRubrica | null {
  return CATALOGO_LITERAL.get(normLiteral(nome)) ?? null;
}

// ─── Fábrica de DocumentoTabular sintética ─────────────────────────────
// Mesma assinatura usada em v6-mappers.test.ts: o mapper Via Varejo
// usa o fallback regex sobre `textoPlano` quando `tabelas[]` está vazio.
function docTabularSintetico(textoCompleto: string): DocumentoTabular {
  return {
    numeroPaginas: 1,
    paginas: [
      {
        numero: 1,
        textos: [],
        tabelas: [],
        textoPlano: textoCompleto,
      },
    ],
    textoCompleto,
    extractor: 'synthetic_for_test',
    qualidade: { score: 0.9, razao: 'fixture sintética' },
  };
}

// ─── Iterador de holerites OCR ─────────────────────────────────────────
const OCR_DIR = path.resolve(
  __dirname,
  '../../../../../scripts/calibracao/ocr-holerites',
);

function listarHoleritesPorSlug(slug: string): string[] {
  if (!fs.existsSync(OCR_DIR)) return [];
  return fs
    .readdirSync(OCR_DIR)
    .filter((f) => f.startsWith(`${slug}-pg`) && f.endsWith('.txt'))
    .sort()
    .map((f) => path.join(OCR_DIR, f));
}

interface RelatorioPDF {
  slug: string;
  total_holerites_processados: number;
  total_holerites_pulados: number;
  mappers_usados: Record<string, number>;
  total_rubricas: number;
  por_origem: Record<string, number>;
  cobertura_ontologia_pct: number;
  cobertura_ontologia_efetiva_pct: number;
  correcao_pct: number;
  literal_concordantes: number;
  literal_divergentes: Array<{
    holerite: string;
    nome: string;
    observado: CategoriaRubrica;
    esperado: CategoriaRubrica;
    slug_observado: CategoriaSlug | null;
    slug_esperado: CategoriaSlug | null;
  }>;
  fuzzy_only_count: number;
  fuzzy_only_amostra: Array<{ holerite: string; nome: string; observado: CategoriaRubrica }>;
}

function calibrarPDF(slug: string): RelatorioPDF {
  const arquivos = listarHoleritesPorSlug(slug);
  const rel: RelatorioPDF = {
    slug,
    total_holerites_processados: 0,
    total_holerites_pulados: 0,
    mappers_usados: {},
    total_rubricas: 0,
    por_origem: {
      ontologia: 0,
      ontologia_desconsiderar: 0,
      hint: 0,
      fallback: 0,
      totalizador_suspeito: 0,
      desconto: 0,
      ignorar_hint: 0,
    },
    cobertura_ontologia_pct: 0,
    cobertura_ontologia_efetiva_pct: 0,
    correcao_pct: 0,
    literal_concordantes: 0,
    literal_divergentes: [],
    fuzzy_only_count: 0,
    fuzzy_only_amostra: [],
  };

  for (const filePath of arquivos) {
    const ocrText = fs.readFileSync(filePath, 'utf-8');
    const doc = docTabularSintetico(ocrText);
    const dispatch = escolherMapper(doc, 'holerite');
    if (!dispatch) {
      rel.total_holerites_pulados += 1;
      continue;
    }
    const result = dispatch.mapper.mapear(doc);
    if (!result || result.rubricas.length === 0) {
      rel.total_holerites_pulados += 1;
      continue;
    }

    rel.total_holerites_processados += 1;
    const mapperSlug = dispatch.mapper.slug;
    rel.mappers_usados[mapperSlug] = (rel.mappers_usados[mapperSlug] ?? 0) + 1;

    // RubricaDominio e RubricaParseada são estruturalmente compatíveis
    // (RubricaParseada = RubricaDominio + flag_suspeita opcional).
    // RubricaClassificadaDominio idem com RubricaClassificada do frontend.
    const preview = classifyHolerite({
      competencia: result.competencia,
      layout_usado: result.layout_usado,
      warnings: result.warnings ?? [],
      rubricas: result.rubricas as unknown as RubricaParseada[],
      rubricas_classificadas:
        result.rubricas_classificadas as unknown as readonly RubricaClassificada[] | undefined,
    });

    const nomeHolerite = path.basename(filePath, '.txt');
    for (const linha of preview.linhas) {
      rel.total_rubricas += 1;
      rel.por_origem[linha.origem] = (rel.por_origem[linha.origem] ?? 0) + 1;

      if (
        linha.origem !== 'ontologia' &&
        linha.origem !== 'ontologia_desconsiderar'
      ) {
        continue;
      }
      const observado: CategoriaRubrica =
        linha.classificacao_ontologia!.categoria_ontologia;
      const literal = lookupLiteral(linha.rubrica.nome);
      if (literal === null) {
        rel.fuzzy_only_count += 1;
        if (rel.fuzzy_only_amostra.length < 8) {
          rel.fuzzy_only_amostra.push({
            holerite: nomeHolerite,
            nome: linha.rubrica.nome,
            observado,
          });
        }
        continue;
      }
      if (observado === literal) {
        rel.literal_concordantes += 1;
      } else {
        rel.literal_divergentes.push({
          holerite: nomeHolerite,
          nome: linha.rubrica.nome,
          observado,
          esperado: literal,
          slug_observado: linha.categoria,
          slug_esperado: SLUG_ESPERADO[literal],
        });
      }
    }
  }

  const totalOnto =
    (rel.por_origem.ontologia ?? 0) +
    (rel.por_origem.ontologia_desconsiderar ?? 0);
  rel.cobertura_ontologia_pct =
    rel.total_rubricas === 0 ? 0 : (100 * totalOnto) / rel.total_rubricas;

  // Cobertura efetiva: exclui linhas que JAMAIS seriam ontologia
  // (descontos puros, totalizadores suspeitos, ignorar_hint = INSS/IRRF
  // que já são deduplicados pela camada 3 do classifier). Essas linhas
  // diluem a métrica e não dependem da Sprint 2.
  const naoOntologizavel =
    (rel.por_origem.desconto ?? 0) +
    (rel.por_origem.totalizador_suspeito ?? 0) +
    (rel.por_origem.ignorar_hint ?? 0);
  const base_efetiva = rel.total_rubricas - naoOntologizavel;
  rel.cobertura_ontologia_efetiva_pct =
    base_efetiva === 0 ? 0 : (100 * totalOnto) / base_efetiva;

  const totalLiteralAuditavel =
    rel.literal_concordantes + rel.literal_divergentes.length;
  rel.correcao_pct =
    totalLiteralAuditavel === 0
      ? 100
      : (100 * rel.literal_concordantes) / totalLiteralAuditavel;

  return rel;
}

function imprimirRelatorio(rel: RelatorioPDF): void {
  const linhas: string[] = [];
  linhas.push('');
  linhas.push('═'.repeat(72));
  linhas.push(`📄 PDF: ${rel.slug}`);
  linhas.push('═'.repeat(72));
  linhas.push(
    `  Holerites OK: ${rel.total_holerites_processados}  pulados: ${rel.total_holerites_pulados}`,
  );
  linhas.push('  Mappers usados:');
  for (const [m, n] of Object.entries(rel.mappers_usados)) {
    linhas.push(`    ${m.padEnd(40)} ${n}`);
  }
  linhas.push(`  Total rubricas processadas: ${rel.total_rubricas}`);
  linhas.push('  Distribuição por origem:');
  for (const k of Object.keys(rel.por_origem).sort()) {
    const v = rel.por_origem[k];
    if (v === 0) continue;
    const pct =
      rel.total_rubricas === 0
        ? '0.0'
        : ((100 * v) / rel.total_rubricas).toFixed(1);
    linhas.push(`    ${k.padEnd(28)} ${String(v).padStart(5)} (${pct}%)`);
  }
  linhas.push('');
  linhas.push(
    `  COBERTURA ontologia (todas as rubricas):  ${rel.cobertura_ontologia_pct.toFixed(1)}%  (meta ≥60%)`,
  );
  linhas.push(
    `  COBERTURA EFETIVA (excluindo desc/totaliz/ignorar): ${rel.cobertura_ontologia_efetiva_pct.toFixed(1)}%  (meta ≥80%)`,
  );
  const auditavel = rel.literal_concordantes + rel.literal_divergentes.length;
  linhas.push(
    `  CORREÇÃO (literal-auditável): ${rel.correcao_pct.toFixed(1)}%  ` +
      `(${rel.literal_concordantes}/${auditavel}) — meta 100%`,
  );
  linhas.push(
    `  fuzzy_only (literal não achou, fuzzy classificou): ${rel.fuzzy_only_count}`,
  );
  if (rel.fuzzy_only_amostra.length > 0) {
    linhas.push('  amostra fuzzy_only (primeiros 8):');
    for (const f of rel.fuzzy_only_amostra) {
      linhas.push(
        `    [${f.holerite}] "${f.nome}" → ${f.observado} (fuzzy)`,
      );
    }
  }
  if (rel.literal_divergentes.length > 0) {
    linhas.push('');
    linhas.push(`  ⚠️  DIVERGÊNCIAS REAIS (${rel.literal_divergentes.length}):`);
    const amostra = rel.literal_divergentes.slice(0, 10);
    for (const d of amostra) {
      linhas.push(`    [${d.holerite}] "${d.nome}"`);
      linhas.push(
        `        observado: ${d.observado} → ${d.slug_observado ?? 'null'}`,
      );
      linhas.push(
        `        esperado : ${d.esperado} → ${d.slug_esperado ?? 'null'}`,
      );
    }
    if (rel.literal_divergentes.length > 10) {
      linhas.push(`    ... e mais ${rel.literal_divergentes.length - 10}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(linhas.join('\n'));
}

describe('Sprint 3c Fase 4 — calibração ontologia contra holerites reais (via mapper Deno)', () => {
  it('Roque Guerreiro (Via Varejo antigo, 73 holerites)', () => {
    const rel = calibrarPDF('roque');
    imprimirRelatorio(rel);
    expect(rel.total_holerites_processados).toBeGreaterThan(0);
    expect(rel.correcao_pct).toBe(100);
  });

  it('Rosicleia até 06/2021 (Via Varejo antigo, 44 holerites)', () => {
    const rel = calibrarPDF('rosicleia-antigo');
    imprimirRelatorio(rel);
    expect(rel.total_holerites_processados).toBeGreaterThan(0);
    expect(rel.correcao_pct).toBe(100);
  });

  it('Rosicleia após 06/2021 (Casas Bahia SAP novo, 35 holerites)', () => {
    const rel = calibrarPDF('rosicleia-novo');
    imprimirRelatorio(rel);
    expect(rel.correcao_pct).toBe(100);
  });
});
