/**
 * @vitest-environment jsdom
 *
 * FASE 2 — Teste de integração no caminho REAL de produção (orchestrator).
 * =======================================================================
 *
 * O parity test (`parity-v3-vs-pjc.test.ts`) roda o engine V3 DIRETO
 * (analyzePJC → convertPjcToEngineInputs → PjeCalcEngineV3). Mas o advogado
 * clica "Liquidar", que dispara `orchestrator.ts:executarLiquidacao`:
 *
 *   loadCaseData (banco) → toEngineVerbas/toEngineReflexos/toEngineParams
 *   → ocorrências precomputadas → engine → upsertResultado
 *
 * Esse caminho NUNCA teve teste. Este é o de maior ROI: ele revela qualquer
 * divergência estrutural entre o caminho de produção e o V3-puro travado na
 * Fase 1 (líquido rosicleia = 245697.72).
 *
 * ESTRATÉGIA (sem banco real, sem `as any` na lógica de negócio):
 *  1. Mock de `@/integrations/supabase/client` com um fake-supabase em memória
 *     (query-builder genérico + emulação das VIEWS reais a partir das tabelas
 *     raw, fiel ao DDL das migrations).
 *  2. Seed via `persistirPJCAnalysis` REAL (os mappers de produção que gravam
 *     verba_base/reflexo/ocorrencia_calculo/configs).
 *  3. Tabelas fiscais (índices SELIC/IPCA-E + faixas INSS) injetadas IGUAIS às
 *     do parity test, para comparação apples-to-apples (senão o engine cai no
 *     fallback 2024 e diverge por artefato de tabela, não por bug do caminho).
 *  4. `executarLiquidacao(caseId, 'manual')` REAL → captura `upsertResultado`.
 *
 * Se o orchestrator divergir do V3-puro, é bug estrutural real (não teste a
 * ajustar) — ver relatório da Fase 2.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
vi.setConfig({ testTimeout: 120_000 });

import * as fs from 'fs';
import * as path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, SELIC_MENSAL, TR_ACUMULADO } from '../indices-fallback';

// ─────────────────────────────────────────────────────────────────────────
// Fake-supabase em memória (hoisted — o factory de vi.mock é içado pro topo)
// ─────────────────────────────────────────────────────────────────────────
const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const db: Record<string, Row[]> = {};
  const captures = {
    deletes: [] as Array<{ table: string; filters: Array<{ type: string; col: string; val: unknown }> }>,
    insertOcorrencia: [] as Row[],
    upsertResultado: [] as Row[],
  };
  let seq = 0;
  const nextId = () => `id_${++seq}`;
  const tbl = (name: string): Row[] => (db[name] ||= []);
  const getCaseId = (calculo_id: unknown): unknown =>
    tbl('pjecalc_calculos').find((c) => c.id === calculo_id)?.case_id;

  // VIEWS que são transformadas a partir das tabelas raw (fiel ao DDL).
  const TRANSFORM_VIEWS = new Set([
    'pjecalc_verbas',
    'pjecalc_ocorrencias',
    'pjecalc_reflexo',
    'pjecalc_historico_salarial',
    'pjecalc_historico_ocorrencias',
    'pjecalc_faltas',
    'pjecalc_ferias',
  ]);
  // Nomes que sempre retornam vazio na leitura (persist não os popula; o
  // orchestrator trata null/[] como ausência → defaults, igual ao banco real).
  const EMPTY_READS = new Set([
    'pjecalc_dados_processo',
    'pjecalc_cartao_ponto',
    'pjecalc_atualizacao_config',
    'pjecalc_excecoes_carga',
    'pjecalc_excecoes_sabado',
  ]);

  function readRows(name: string): Row[] {
    if (EMPTY_READS.has(name)) return [];
    if (!TRANSFORM_VIEWS.has(name)) return tbl(name); // pass-through (configs, params, tax tables, raw)

    if (name === 'pjecalc_verbas') {
      return tbl('pjecalc_verba_base').map((v) => ({
        ...v,
        case_id: getCaseId(v.calculo_id),
        ocorrencia_pagamento: v.periodicidade,
        divisor_informado: v.divisor,
        tipo: v.verba_principal_id ? 'reflexa' : 'principal',
        valor: v.valor ?? 'calculado',
        // Engine-critical fields que o persist não grava → defaults do DDL/coluna
        divisor_tipo: v.divisor_tipo ?? null,
        quantidade_tipo: v.quantidade_tipo ?? null,
        quantidade_valor: v.quantidade_valor ?? 1,
        fracao_mes_modo: v.fracao_mes_modo ?? 'manter_fracao',
        compor_principal: v.compor_principal ?? true,
        gerar_principal: v.gerar_principal ?? null,
        gerar_reflexo: v.gerar_reflexo ?? null,
        excluir_falta_justificada: v.excluir_falta_justificada ?? false,
        excluir_falta_nao_justificada: v.excluir_falta_nao_justificada ?? false,
        excluir_ferias_gozadas: v.excluir_ferias_gozadas ?? false,
        comportamento_reflexo: v.comportamento_reflexo ?? null,
        periodo_media_reflexo: v.periodo_media_reflexo ?? null,
        quantidade_proporcionalizar: v.quantidade_proporcionalizar ?? false,
        hora_noturna_ficticia: v.hora_noturna_ficticia ?? false,
        constante_mensal: v.constante_mensal ?? null,
        dobrar_valor_devido: v.dobrar_valor_devido ?? false,
        incidencias: {},
        base_calculo: {
          historicos: tbl('pjecalc_hist_salarial')
            .filter((h) => h.calculo_id === v.calculo_id && h.nome === v.hist_salarial_nome)
            .map((h) => h.id),
          tabelas: (v.base_tabelas as unknown[]) ?? [],
          verbas: v.verba_principal_id ? [v.verba_principal_id] : [],
        },
      }));
    }
    if (name === 'pjecalc_ocorrencias') {
      return tbl('pjecalc_ocorrencia_calculo').map((o) => ({
        ...o,
        case_id: getCaseId(o.calculo_id),
        verba_id: o.verba_base_id ?? o.reflexo_id,
        verba_nome: o.nome,
        multiplicador_valor: o.multiplicador,
        divisor_valor: o.divisor,
        quantidade_valor: o.quantidade,
      }));
    }
    if (name === 'pjecalc_reflexo') {
      return tbl('pjecalc_reflexo').map((r) => ({
        ...r,
        case_id: getCaseId(r.calculo_id),
        pjecalc_reflexo_base_verba: tbl('pjecalc_reflexo_base_verba')
          .filter((x) => x.reflexo_id === r.id)
          .map((x) => ({ verba_base_id: x.verba_base_id })),
      }));
    }
    if (name === 'pjecalc_historico_salarial') {
      return tbl('pjecalc_hist_salarial').map((h) => ({
        ...h,
        case_id: getCaseId(h.calculo_id),
        tipo_valor: h.tipo_variacao ?? 'informado',
        valor_informado: h.valor_fixo ?? null,
        periodo_inicio: null,
        periodo_fim: null,
        incidencia_fgts: h.incide_fgts,
        incidencia_cs: h.incide_inss,
      }));
    }
    if (name === 'pjecalc_historico_ocorrencias') {
      return tbl('pjecalc_hist_salarial_mes').map((m) => ({
        ...m,
        historico_id: m.hist_salarial_id,
        case_id: getCaseId(
          tbl('pjecalc_hist_salarial').find((h) => h.id === m.hist_salarial_id)?.calculo_id,
        ),
        competencia: m.competencia,
        valor: m.valor,
        tipo: m.origem ?? 'informado',
      }));
    }
    if (name === 'pjecalc_faltas') {
      return tbl('pjecalc_evento_intervalo')
        .filter((e) => e.tipo !== 'FERIAS')
        .map((e) => ({
          ...e,
          case_id: getCaseId(e.calculo_id),
          data_inicial: e.data_inicio,
          data_final: e.data_fim,
          tipo_falta: e.tipo,
          justificada: e.justificado,
        }));
    }
    if (name === 'pjecalc_ferias') {
      return tbl('pjecalc_evento_intervalo')
        .filter((e) => e.tipo === 'FERIAS')
        .map((e) => ({
          ...e,
          case_id: getCaseId(e.calculo_id),
          periodo_aquisitivo_inicio: e.ferias_aquisitivo_inicio,
          periodo_aquisitivo_fim: e.ferias_aquisitivo_fim,
          periodo_concessivo_inicio: e.ferias_concessivo_inicio,
          periodo_concessivo_fim: e.ferias_concessivo_fim,
          gozo_inicio: e.data_inicio,
          gozo_fim: e.data_fim,
          dias: e.ferias_dias,
          abono: e.ferias_abono,
          dias_abono: e.ferias_dias_abono,
          dobra: e.ferias_dobra,
          situacao: e.ferias_situacao,
        }));
    }
    return [];
  }

  function applyFilters(rows: Row[], filters: Array<{ type: string; col: string; val: unknown }>): Row[] {
    return rows.filter((r) =>
      filters.every((f) => {
        const rv = r[f.col] as never;
        const fv = f.val as never;
        if (f.type === 'eq') return rv === fv;
        if (f.type === 'neq') return rv !== fv;
        if (f.type === 'in') return Array.isArray(f.val) && (f.val as unknown[]).includes(r[f.col]);
        if (f.type === 'gt') return rv > fv;
        if (f.type === 'gte') return rv >= fv;
        if (f.type === 'lt') return rv < fv;
        if (f.type === 'lte') return rv <= fv;
        return true;
      }),
    );
  }

  function applyOrders(rows: Row[], orders: Array<{ col: string; asc: boolean }>): Row[] {
    if (orders.length === 0) return rows;
    const out = [...rows];
    out.sort((a, b) => {
      for (const o of orders) {
        const av = a[o.col];
        const bv = b[o.col];
        if (av === bv) continue;
        if (av == null) return o.asc ? -1 : 1;
        if (bv == null) return o.asc ? 1 : -1;
        const cmp = av < bv ? -1 : 1;
        return o.asc ? cmp : -cmp;
      }
      return 0;
    });
    return out;
  }

  class QB {
    table: string;
    op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
    payload: unknown;
    filters: Array<{ type: string; col: string; val: unknown }> = [];
    orders: Array<{ col: string; asc: boolean }> = [];
    _single?: 'one' | 'maybe';
    constructor(t: string) {
      this.table = t;
    }
    select() {
      return this;
    }
    insert(p: unknown) {
      this.op = 'insert';
      this.payload = p;
      return this;
    }
    upsert(p: unknown) {
      this.op = 'upsert';
      this.payload = p;
      return this;
    }
    update(p: unknown) {
      this.op = 'update';
      this.payload = p;
      return this;
    }
    delete() {
      this.op = 'delete';
      return this;
    }
    _limit?: number;
    eq(col: string, val: unknown) {
      this.filters.push({ type: 'eq', col, val });
      return this;
    }
    in(col: string, val: unknown) {
      this.filters.push({ type: 'in', col, val });
      return this;
    }
    gt(col: string, val: unknown) {
      this.filters.push({ type: 'gt', col, val });
      return this;
    }
    gte(col: string, val: unknown) {
      this.filters.push({ type: 'gte', col, val });
      return this;
    }
    lt(col: string, val: unknown) {
      this.filters.push({ type: 'lt', col, val });
      return this;
    }
    lte(col: string, val: unknown) {
      this.filters.push({ type: 'lte', col, val });
      return this;
    }
    neq(col: string, val: unknown) {
      this.filters.push({ type: 'neq', col, val });
      return this;
    }
    limit(n: number) {
      this._limit = n;
      return this;
    }
    order(col: string, opts?: { ascending?: boolean }) {
      for (const c of String(col).split(',')) {
        this.orders.push({ col: c.trim(), asc: opts?.ascending !== false });
      }
      return this;
    }
    maybeSingle() {
      this._single = 'maybe';
      return this.run();
    }
    // PostgREST `.single()`
    single() {
      this._single = 'one';
      return this.run();
    }
    then<T>(onF: (v: { data: unknown; error: unknown }) => T, onR?: (e: unknown) => T) {
      return this.run().then(onF, onR);
    }
    async run(): Promise<{ data: unknown; error: unknown }> {
      try {
        if (this.op === 'select') {
          let rows = applyFilters(readRows(this.table), this.filters);
          rows = applyOrders(rows, this.orders);
          if (this._limit != null) rows = rows.slice(0, this._limit);
          if (this._single === 'maybe') return { data: rows[0] ?? null, error: null };
          if (this._single === 'one')
            return rows[0]
              ? { data: rows[0], error: null }
              : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
          return { data: rows, error: null };
        }
        if (this.op === 'insert' || this.op === 'upsert') {
          // Writes em 'pjecalc_ocorrencias' (view) são capturados, não mutam raw.
          if (this.table === 'pjecalc_ocorrencias') {
            const ps = Array.isArray(this.payload) ? this.payload : [this.payload];
            captures.insertOcorrencia.push(...(ps as Row[]));
            return { data: ps, error: null };
          }
          if (this.table === 'pjecalc_liquidacao_resultado') {
            captures.upsertResultado.push(this.payload as Row);
          }
          const ps = Array.isArray(this.payload) ? (this.payload as Row[]) : [this.payload as Row];
          const stored = ps.map((p) => {
            const row: Row = { id: p.id ?? nextId(), ...p };
            tbl(this.table).push(row);
            return row;
          });
          if (this._single) return { data: stored[0], error: null };
          return { data: stored, error: null };
        }
        if (this.op === 'update') {
          const target = applyFilters(tbl(this.table), this.filters);
          for (const r of target) Object.assign(r, this.payload as Row);
          return { data: target, error: null };
        }
        if (this.op === 'delete') {
          captures.deletes.push({ table: this.table, filters: this.filters });
          if (!TRANSFORM_VIEWS.has(this.table) && !EMPTY_READS.has(this.table)) {
            const keep = tbl(this.table).filter((r) => !applyFilters([r], this.filters).length);
            db[this.table] = keep;
          }
          return { data: null, error: null };
        }
        return { data: null, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    }
  }

  const supabase = {
    from: (name: string) => new QB(name),
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'test-user' } } } }),
    },
  };

  return { db, captures, supabase, tbl, nextId };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: H.supabase }));

// `logger` é ruidoso (warns esperados de fallback) — silenciar para o teste.
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Imports que carregam o supabase mockado DEPOIS do vi.mock.
import { persistirPJCAnalysis } from '../pjc-persist';
import { executarLiquidacao } from '../orchestrator';

const CORPUS_DIR = path.resolve(__dirname, '../../../../public/reports');

async function readPjc(file: string): Promise<string> {
  const buffer = fs.readFileSync(path.join(CORPUS_DIR, file));
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(bytes);
    const nomes = Object.keys(zip.files);
    const alvo =
      nomes.find((n) => n.toLowerCase().endsWith('.pjc')) ??
      nomes.find((n) => n.toLowerCase().endsWith('.xml')) ??
      nomes[0];
    return await zip.files[alvo].async('string');
  }
  return buffer.toString('latin1');
}

// Tabelas fiscais idênticas às do parity test (buildIndicesDB/buildINSSFaixas).
function seedTaxTables() {
  const indices: Record<string, unknown>[] = [];
  for (const [comp, valor] of Object.entries(SELIC_MENSAL).sort()) {
    indices.push({ indice: 'SELIC', competencia: comp + '-01', valor, acumulado: SELIC_ACUMULADO[comp] ?? 100 });
  }
  for (const [comp, acum] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    indices.push({ indice: 'IPCA-E', competencia: comp + '-01', valor: 0, acumulado: acum });
    indices.push({ indice: 'IPCAE', competencia: comp + '-01', valor: 0, acumulado: acum });
    indices.push({ indice: 'IPCA', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
  for (const [comp, acum] of Object.entries(TR_ACUMULADO).sort()) {
    indices.push({ indice: 'TR', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
  H.db['pjecalc_correcao_monetaria'] = indices;

  const inss: Record<string, unknown>[] = [];
  const add = (i: string, e: string | null, b: [number, number][]) =>
    b.forEach(([v, a], idx) =>
      inss.push({ competencia_inicio: i, competencia_fim: e, faixa: idx + 1, valor_ate: v, aliquota: a }),
    );
  add('2015-01-01', '2015-12-01', [[1399.12, 0.08], [2331.88, 0.09], [4663.75, 0.11]]);
  add('2016-01-01', '2016-12-01', [[1556.94, 0.08], [2594.92, 0.09], [5189.82, 0.11]]);
  add('2017-01-01', '2017-12-01', [[1659.38, 0.08], [2765.66, 0.09], [5531.31, 0.11]]);
  add('2018-01-01', '2018-12-01', [[1693.72, 0.08], [2822.9, 0.09], [5645.8, 0.11]]);
  add('2019-01-01', '2019-12-01', [[1751.81, 0.08], [2919.72, 0.09], [5839.45, 0.11]]);
  add('2020-01-01', '2020-02-01', [[1830.29, 0.08], [3050.52, 0.09], [6101.06, 0.11]]);
  add('2020-03-01', '2020-12-01', [[1045.0, 0.075], [2089.6, 0.09], [3134.4, 0.12], [6101.06, 0.14]]);
  add('2021-01-01', '2021-12-01', [[1100.0, 0.075], [2203.48, 0.09], [3305.22, 0.12], [6433.57, 0.14]]);
  add('2022-01-01', '2022-12-01', [[1212.0, 0.075], [2427.35, 0.09], [3641.03, 0.12], [7087.22, 0.14]]);
  add('2023-01-01', '2023-12-01', [[1320.0, 0.075], [2571.29, 0.09], [3856.94, 0.12], [7507.49, 0.14]]);
  add('2024-01-01', '2024-12-01', [[1412.0, 0.075], [2666.68, 0.09], [4000.03, 0.12], [7786.02, 0.14]]);
  add('2025-01-01', null, [[1518.0, 0.075], [2793.88, 0.09], [4190.83, 0.12], [8157.41, 0.14]]);
  H.db['pjecalc_inss_faixas'] = inss;
}

/**
 * ⚠️ RESULTADO DA FASE 2 — o orchestrator NÃO reproduz o V3-puro.
 *
 * Este teste é fiel ao caminho de produção (persist real → views reais →
 * service real → executarLiquidacao real). Ele REVELOU DUAS divergências
 * estruturais do orchestrator vs o V3-puro travado na Fase 1
 * (rosicleia líquido = 245697.72):
 *
 *  ┌─ DIVERGÊNCIA 1 (gate) — mode 'manual'/'auto' BLOQUEIA o caso ───────────┐
 *  │ resolveCanonicalInput é chamado com isPjcImport:false e SEM as          │
 *  │ ocorrências precomputadas; o validador (canonical/validator.ts:171)     │
 *  │ bloqueia verbas depende_jornada (HORAS EXTRAS, INTERVALO, FERIADOS)     │
 *  │ porque cartão de ponto está vazio — e o import PJC NUNCA grava cartão.  │
 *  │ → E_VERBA_JORNADA_MISSING. Chamado de usePjeCalcData/usePjeCalculator.  │
 *  └────────────────────────────────────────────────────────────────────────┘
 *  ┌─ DIVERGÊNCIA 2 (valor) — mode 'seed' (bypass) INFLA +9.4% ──────────────┐
 *  │ Os reflexos de INTERVALO INTER/INTRAJORNADA vêm do PJC com ativa=false  │
 *  │ (desativados). toEngineReflexos os pula (orchestrator.ts:377), os       │
 *  │ principais ficam "sem reflexo", e gerarReflexosPadrao (1711-1750)       │
 *  │ AUTO-GERA 10 reflexos default (13º/férias/aviso/DSR/comum) por cima das │
 *  │ ocorrências precomputadas → líquido 268824.97 (vs 245697.72).           │
 *  │ O V3-puro (pjc-to-engine.ts:427 filtra v.ativo) NÃO auto-gera nada.     │
 *  └────────────────────────────────────────────────────────────────────────┘
 *
 * Este teste TRAVA o comportamento ATUAL (bugado) como regressão e documenta
 * o ALVO correto (245697.72). NÃO é o estado desejado — é o flagrante da
 * Fase 2. Correção da lógica de cálculo do orchestrator exige aprovação
 * humana (CLAUDE.md, escopo de auto-fix). Quando corrigido, estes asserts
 * de "divergência" devem ser substituídos pelos de paridade (toBeCloseTo
 * 245697.72 / 4151.24 / 23129.19).
 */
describe('FASE 2 — integração orchestrator (caminho de produção) — rosicleia', () => {
  const CASE_ID = 'case-rosicleia-fase2';
  // Alvo correto (V3-puro / Fase 1):
  const ALVO_LIQUIDO = 245697.72;
  let seedPayload: Record<string, unknown> | undefined;
  let manualError: Error | undefined;
  let autoReflexoIds: string[] = [];

  beforeAll(async () => {
    for (const k of Object.keys(H.db)) delete H.db[k];
    H.captures.deletes.length = 0;
    H.captures.insertOcorrencia.length = 0;
    H.captures.upsertResultado.length = 0;
    seedTaxTables();

    // Seed via os mappers REAIS de produção (pjc-persist).
    const xml = await readPjc('rosicleia-pereira-chaves.pjc');
    const analysis = analyzePJC(xml);
    await persistirPJCAnalysis(CASE_ID, 'test-user', analysis);

    // (1) Caminho de produção real: advogado clica "Liquidar" (mode 'manual').
    try {
      await executarLiquidacao(CASE_ID, 'manual');
    } catch (e) {
      manualError = e instanceof Error ? e : new Error(String(e));
    }

    // (2) mode 'seed' faz bypass do gate canProceed (orchestrator.ts:1585) —
    // isola a paridade de CÁLCULO dos gates de insumo.
    H.captures.upsertResultado.length = 0;
    const r = await executarLiquidacao(CASE_ID, 'seed');
    seedPayload = H.captures.upsertResultado[0];
    const verbas = (r.result as { verbas: Array<{ verba_id: string }> }).verbas;
    autoReflexoIds = verbas.map((v) => String(v.verba_id)).filter((id) => id.startsWith('auto_'));
  });

  // ── DIVERGÊNCIA 1 — gate canônico bloqueia caso PJC no modo de produção ──
  it('BUG: mode "manual" BLOQUEIA o caso PJC (E_VERBA_JORNADA_MISSING)', () => {
    expect(manualError, 'esperava bloqueio do gate canônico em modo manual').toBeDefined();
    expect(manualError?.message).toContain('E_VERBA_JORNADA_MISSING');
  });

  // ── DIVERGÊNCIA 2 — auto-reflexo infla o líquido vs V3-puro ──
  it('BUG: mode "seed" auto-gera reflexos para INTERVALO (reflexos PJC ativa=false)', () => {
    // id_319=INTERVALO INTERJORNADAS, id_320=INTERVALO INTRAJORNADA.
    expect(autoReflexoIds.length).toBeGreaterThan(0);
    expect(autoReflexoIds.some((id) => id.includes('319') || id.includes('320'))).toBe(true);
  });

  it('BUG: orchestrator INFLA o líquido (268824.97) vs alvo V3-puro (245697.72)', () => {
    const liquido = seedPayload?.total_liquido as number;
    // Diverge da paridade (>5% acima do alvo) — é a inflação por auto-reflexo.
    const deltaPct = ((liquido - ALVO_LIQUIDO) / ALVO_LIQUIDO) * 100;
    expect(deltaPct).toBeGreaterThan(5);
    // Trava o valor inflado ATUAL: quando o bug for corrigido, este assert
    // quebra e deve virar `toBeCloseTo(245697.72, 0)`.
    expect(liquido).toBeCloseTo(268824.97, 0);
    expect(seedPayload?.irrf as number).toBeCloseTo(7204.37, 0);
    expect(seedPayload?.inss_segurado as number).toBeCloseTo(25946.5, 0);
  });

  // ── O que o caminho de produção FAZ certo: preserva PJC_IMPORT ──
  it('OK: deleteOcorrencias só apaga origem=CALCULADA (preserva PJC_IMPORT)', () => {
    const delOcorrencias = H.captures.deletes.filter((d) => d.table === 'pjecalc_ocorrencias');
    expect(delOcorrencias.length).toBeGreaterThanOrEqual(1);
    for (const d of delOcorrencias) {
      const origem = d.filters.find((f) => f.col === 'origem');
      const caseFilter = d.filters.find((f) => f.col === 'case_id');
      expect(origem?.val, 'deleteOcorrencias sem filtro origem=CALCULADA').toBe('CALCULADA');
      expect(caseFilter?.val).toBe(CASE_ID);
    }
  });
});
