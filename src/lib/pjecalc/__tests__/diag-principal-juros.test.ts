/**
 * @vitest-environment jsdom
 *
 * DIAGNÓSTICO — Divergência principal + juros (orchestrator vs V3-puro natural)
 * ==============================================================================
 *
 * Contexto (sessão de hardening):
 *   joseli:    orch bruto −7.0%, juros +9.3%
 *   rosicleia: orch bruto +5.9%, juros +22.6%
 *   izabela:   orch bruto  0.0%, juros +16.5%  ← controle isolado
 *
 * izabela com bruto IDÊNTICO e juros +16.5% → o delta NÃO é de verba.
 * É necessariamente uma diferença na configuração de correção/juros.
 *
 * Hipótese principal: orchestrator perde o split ADC 58/59
 * (combinacoes_juros: pre-ADC = 1%/mês, pós-ADC = NENHUM) e aplica
 * 1%/mês uniformemente a TODAS as competências, incluindo as pós-2021-11-11
 * onde SELIC já inclui os juros.
 *
 * Este teste é READ-ONLY (sem assert de valor numérico), apenas console.log
 * estruturado para diagnóstico. Não toca engine-v3 nem orchestrator.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
vi.setConfig({ testTimeout: 180_000 });

import * as fs from 'fs';
import * as path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, SELIC_MENSAL, TR_ACUMULADO } from '../indices-fallback';
import type { PjeIndiceRow, PjeINSSFaixaRow, PjeVerbaResult } from '../engine-types';

// ─── Reutiliza o mesmo fake-supabase do arquivo irmão ───────────────────────
const H = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const db: Record<string, Row[]> = {};
  const captures = {
    upsertResultado: [] as Row[],
    insertOcorrencia: [] as Row[],
    deletes: [] as Array<{ table: string; filters: Array<{ type: string; col: string; val: unknown }> }>,
  };
  let seq = 0;
  const nextId = () => `id_${++seq}`;
  const tbl = (name: string): Row[] => (db[name] ||= []);
  const getCaseId = (calculo_id: unknown): unknown =>
    tbl('pjecalc_calculos').find((c) => c.id === calculo_id)?.case_id;

  const TRANSFORM_VIEWS = new Set([
    'pjecalc_verbas', 'pjecalc_ocorrencias', 'pjecalc_reflexo',
    'pjecalc_historico_salarial', 'pjecalc_historico_ocorrencias',
    'pjecalc_faltas', 'pjecalc_ferias',
  ]);
  const EMPTY_READS = new Set([
    'pjecalc_dados_processo', 'pjecalc_cartao_ponto',
    'pjecalc_atualizacao_config', 'pjecalc_excecoes_carga', 'pjecalc_excecoes_sabado',
  ]);

  function readRows(name: string): Row[] {
    if (EMPTY_READS.has(name)) return [];
    if (!TRANSFORM_VIEWS.has(name)) return tbl(name);
    if (name === 'pjecalc_verbas') {
      return tbl('pjecalc_verba_base').map((v) => ({
        ...v,
        case_id: getCaseId(v.calculo_id),
        ocorrencia_pagamento: v.periodicidade,
        divisor_informado: v.divisor,
        tipo: v.verba_principal_id ? 'reflexa' : 'principal',
        valor: v.valor ?? 'calculado',
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
        ...h, case_id: getCaseId(h.calculo_id),
        tipo_valor: h.tipo_variacao ?? 'informado', valor_informado: h.valor_fixo ?? null,
        periodo_inicio: null, periodo_fim: null,
        incidencia_fgts: h.incide_fgts, incidencia_cs: h.incide_inss,
      }));
    }
    if (name === 'pjecalc_historico_ocorrencias') {
      return tbl('pjecalc_hist_salarial_mes').map((m) => ({
        ...m, historico_id: m.hist_salarial_id,
        case_id: getCaseId(tbl('pjecalc_hist_salarial').find((h) => h.id === m.hist_salarial_id)?.calculo_id),
        competencia: m.competencia, valor: m.valor, tipo: m.origem ?? 'informado',
      }));
    }
    if (name === 'pjecalc_faltas') {
      return tbl('pjecalc_evento_intervalo').filter((e) => e.tipo !== 'FERIAS').map((e) => ({
        ...e, case_id: getCaseId(e.calculo_id),
        data_inicial: e.data_inicio, data_final: e.data_fim, tipo_falta: e.tipo, justificada: e.justificado,
      }));
    }
    if (name === 'pjecalc_ferias') {
      return tbl('pjecalc_evento_intervalo').filter((e) => e.tipo === 'FERIAS').map((e) => ({
        ...e, case_id: getCaseId(e.calculo_id),
        periodo_aquisitivo_inicio: e.ferias_aquisitivo_inicio, periodo_aquisitivo_fim: e.ferias_aquisitivo_fim,
        periodo_concessivo_inicio: e.ferias_concessivo_inicio, periodo_concessivo_fim: e.ferias_concessivo_fim,
        gozo_inicio: e.data_inicio, gozo_fim: e.data_fim,
        dias: e.ferias_dias, abono: e.ferias_abono, dias_abono: e.ferias_dias_abono,
        dobra: e.ferias_dobra, situacao: e.ferias_situacao,
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
        if (f.type === 'in') return Array.isArray(f.val) && (f.val as unknown[]).includes(r[f.col]);
        if (f.type === 'gt') return rv > fv;
        if (f.type === 'gte') return rv >= fv;
        if (f.type === 'lt') return rv < fv;
        if (f.type === 'lte') return rv <= fv;
        return true;
      }),
    );
  }

  class QB {
    table: string;
    op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
    payload: unknown;
    filters: Array<{ type: string; col: string; val: unknown }> = [];
    orders: Array<{ col: string; asc: boolean }> = [];
    _single?: 'one' | 'maybe';
    constructor(t: string) { this.table = t; }
    select() { return this; }
    insert(p: unknown) { this.op = 'insert'; this.payload = p; return this; }
    upsert(p: unknown) { this.op = 'upsert'; this.payload = p; return this; }
    update(p: unknown) { this.op = 'update'; this.payload = p; return this; }
    delete() { this.op = 'delete'; return this; }
    _limit?: number;
    eq(col: string, val: unknown) { this.filters.push({ type: 'eq', col, val }); return this; }
    in(col: string, val: unknown) { this.filters.push({ type: 'in', col, val }); return this; }
    gt(col: string, val: unknown) { this.filters.push({ type: 'gt', col, val }); return this; }
    gte(col: string, val: unknown) { this.filters.push({ type: 'gte', col, val }); return this; }
    lt(col: string, val: unknown) { this.filters.push({ type: 'lt', col, val }); return this; }
    lte(col: string, val: unknown) { this.filters.push({ type: 'lte', col, val }); return this; }
    neq(col: string, val: unknown) { this.filters.push({ type: 'neq', col, val }); return this; }
    limit(n: number) { this._limit = n; return this; }
    order(col: string, opts?: { ascending?: boolean }) {
      for (const c of String(col).split(','))
        this.orders.push({ col: c.trim(), asc: opts?.ascending !== false });
      return this;
    }
    maybeSingle() { this._single = 'maybe'; return this.run(); }
    single() { this._single = 'one'; return this.run(); }
    then<T>(onF: (v: { data: unknown; error: unknown }) => T, onR?: (e: unknown) => T) {
      return this.run().then(onF, onR);
    }
    async run(): Promise<{ data: unknown; error: unknown }> {
      try {
        if (this.op === 'select') {
          let rows = applyFilters(readRows(this.table), this.filters);
          if (this._limit != null) rows = rows.slice(0, this._limit);
          if (this._single === 'maybe') return { data: rows[0] ?? null, error: null };
          if (this._single === 'one')
            return rows[0] ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
          return { data: rows, error: null };
        }
        if (this.op === 'insert' || this.op === 'upsert') {
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
    auth: { getSession: async () => ({ data: { session: { user: { id: 'test-user' } } } }) },
  };

  return { db, captures, supabase, tbl };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: H.supabase }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

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
    const alvo = nomes.find((n) => n.toLowerCase().endsWith('.pjc')) ?? nomes.find((n) => n.toLowerCase().endsWith('.xml')) ?? nomes[0];
    return await zip.files[alvo].async('string');
  }
  return buffer.toString('latin1');
}

const INDICES_DB: PjeIndiceRow[] = (() => {
  const rows: PjeIndiceRow[] = [];
  for (const [comp, valor] of Object.entries(SELIC_MENSAL).sort())
    rows.push({ indice: 'SELIC', competencia: comp + '-01', valor, acumulado: SELIC_ACUMULADO[comp] ?? 100 });
  for (const [comp, acum] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    rows.push({ indice: 'IPCA-E', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCAE', competencia: comp + '-01', valor: 0, acumulado: acum });
    rows.push({ indice: 'IPCA', competencia: comp + '-01', valor: 0, acumulado: acum });
  }
  for (const [comp, acum] of Object.entries(TR_ACUMULADO).sort())
    rows.push({ indice: 'TR', competencia: comp + '-01', valor: 0, acumulado: acum });
  return rows;
})();

const INSS_FAIXAS: PjeINSSFaixaRow[] = (() => {
  const f: PjeINSSFaixaRow[] = [];
  const add = (i: string, e: string | null, b: [number, number][]) =>
    b.forEach(([v, a], idx) => f.push({ competencia_inicio: i, competencia_fim: e, faixa: idx + 1, valor_ate: v, aliquota: a }));
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
  return f;
})();

function seedTaxTables() {
  H.db['pjecalc_correcao_monetaria'] = INDICES_DB as unknown as Record<string, unknown>[];
  H.db['pjecalc_inss_faixas'] = INSS_FAIXAS as unknown as Record<string, unknown>[];
}

// ─── Resultado extendido de V3-puro ──────────────────────────────────────────
interface V3PuroFull {
  resumo: ReturnType<InstanceType<typeof PjeCalcEngineV3>['liquidar']>['resumo'];
  verbas: PjeVerbaResult[];
  correcaoConfig: ReturnType<typeof convertPjcToEngineInputs>['correcaoConfig'];
  params: ReturnType<typeof convertPjcToEngineInputs>['params'];
}

async function liquidarV3PuroFull(file: string): Promise<V3PuroFull> {
  const analysis = analyzePJC(await readPjc(file));
  const inputs = convertPjcToEngineInputs(analysis, `v3-${file}`);
  inputs.params.modo_calculo = 'independent';
  const engine = new PjeCalcEngineV3(
    inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
    inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
    inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
    inputs.custasConfig, inputs.seguroConfig, INDICES_DB, INSS_FAIXAS,
  );
  const result = engine.liquidar();
  return {
    resumo: result.resumo,
    verbas: result.verbas as PjeVerbaResult[],
    correcaoConfig: inputs.correcaoConfig,
    params: inputs.params,
  };
}

// ─── Estrutura de diagnóstico por caso ───────────────────────────────────────
interface CaseDiag {
  v3: V3PuroFull;
  orchResumo: { principal_bruto: number; juros_mora: number; liquido_reclamante: number };
  orchVerbas: PjeVerbaResult[];
  dbCorrecaoConfig: Record<string, unknown>;
}

describe('DIAGNÓSTICO — principal + juros divergence', () => {
  const CASES = [
    { nome: 'izabela', file: 'izabela-cristina.pjc', caseId: 'diag-izabela' },
    { nome: 'joseli', file: 'joseli-silva.pjc', caseId: 'diag-joseli' },
    { nome: 'rosicleia', file: 'rosicleia-pereira-chaves.pjc', caseId: 'diag-rosicleia' },
  ];

  const diag: Record<string, CaseDiag> = {};

  beforeAll(async () => {
    for (const c of CASES) {
      // Reset DB
      for (const k of Object.keys(H.db)) delete H.db[k];
      H.captures.deletes.length = 0;
      H.captures.insertOcorrencia.length = 0;
      H.captures.upsertResultado.length = 0;
      seedTaxTables();

      // V3-puro (natural, sem massage) — captura config direta do PJC
      const v3 = await liquidarV3PuroFull(c.file);

      // Persiste PJC no fake-supabase
      const analysis = analyzePJC(await readPjc(c.file));
      await persistirPJCAnalysis(c.caseId, 'test-user', analysis);

      // Captura o que o persist salvou em pjecalc_correcao_config (antes de correr o orchestrator)
      const dbCorrecaoConfig = (H.db['pjecalc_correcao_config']?.[0] ?? {}) as Record<string, unknown>;

      // Roda orchestrator
      const orchResult = await executarLiquidacao(c.caseId, 'seed');
      const orchResumo = orchResult.result.resumo;
      const orchVerbas = orchResult.result.verbas as PjeVerbaResult[];

      diag[c.nome] = { v3, orchResumo, orchVerbas, dbCorrecaoConfig };

      // ─── LINHA DE DIAGNÓSTICO PRINCIPAL ──────────────────────────────────
      const pctBruto = ((orchResumo.principal_bruto - v3.resumo.principal_bruto) / v3.resumo.principal_bruto * 100);
      const pctJuros = ((orchResumo.juros_mora - v3.resumo.juros_mora) / v3.resumo.juros_mora * 100);

      // eslint-disable-next-line no-console
      console.log(`\n${'═'.repeat(70)}`);
      // eslint-disable-next-line no-console
      console.log(`[DIAG ${c.nome.toUpperCase()}]`);
      // eslint-disable-next-line no-console
      console.log(`  bruto:  orch=${orchResumo.principal_bruto.toFixed(2)} v3=${v3.resumo.principal_bruto.toFixed(2)} delta=${pctBruto.toFixed(1)}%`);
      // eslint-disable-next-line no-console
      console.log(`  juros:  orch=${orchResumo.juros_mora.toFixed(2)} v3=${v3.resumo.juros_mora.toFixed(2)} delta=${pctJuros.toFixed(1)}%`);
      // eslint-disable-next-line no-console
      console.log(`  liquido: orch=${orchResumo.liquido_reclamante.toFixed(2)} v3=${v3.resumo.liquido_reclamante.toFixed(2)}`);

      // ─── DECOMPOSIÇÃO DO LÍQUIDO (deduções downstream) ───────────────────
      // Com bruto+correção+juros idênticos, qualquer Δ no líquido é dedução.
      // Isola qual componente (INSS/IR/FGTS/honorários/multas) diverge.
      const oR = orchResumo as unknown as Record<string, number>;
      const vR = v3.resumo as unknown as Record<string, number>;
      const compsLiquido = ['cs_segurado', 'ir_retido', 'fgts_total', 'honorarios_sucumbenciais', 'multa_523', 'multa_467', 'seguro_desemprego'];
      // eslint-disable-next-line no-console
      console.log(`  [líquido decomposição] orch=${orchResumo.liquido_reclamante.toFixed(2)} v3=${v3.resumo.liquido_reclamante.toFixed(2)} Δ=${(orchResumo.liquido_reclamante - v3.resumo.liquido_reclamante).toFixed(2)}`);
      for (const k of compsLiquido) {
        const o = oR[k] ?? 0; const v = vR[k] ?? 0;
        if (Math.abs(o - v) > 0.01) {
          // eslint-disable-next-line no-console
          console.log(`    ${k.padEnd(24)} orch=${o.toFixed(2).padStart(12)} v3=${v.toFixed(2).padStart(12)} Δ=${(o - v).toFixed(2).padStart(12)}`);
        }
      }

      // ─── CORRECAO CONFIG COMPARISON ──────────────────────────────────────
      // eslint-disable-next-line no-console
      console.log(`\n  [correcaoConfig] v3-puro (from PJC XML):`);
      // eslint-disable-next-line no-console
      console.log(`    data_liquidacao: ${v3.correcaoConfig.data_liquidacao}`);
      // eslint-disable-next-line no-console
      console.log(`    juros_tipo: ${v3.correcaoConfig.juros_tipo}`);
      // eslint-disable-next-line no-console
      console.log(`    juros_inicio: ${v3.correcaoConfig.juros_inicio}`);
      // eslint-disable-next-line no-console
      console.log(`    juros_pre_judicial: ${v3.correcaoConfig.juros_pre_judicial}`);
      // eslint-disable-next-line no-console
      console.log(`    combinacoes_juros: ${JSON.stringify(v3.correcaoConfig.combinacoes_juros)}`);
      // eslint-disable-next-line no-console
      console.log(`    combinacoes_indice: ${JSON.stringify(v3.correcaoConfig.combinacoes_indice)}`);
      // eslint-disable-next-line no-console
      console.log(`    data_citacao (params): ${v3.params.data_citacao ?? '(nenhuma)'}`);

      // eslint-disable-next-line no-console
      console.log(`\n  [correcaoConfig] orchestrator (from DB after persist):`);
      // eslint-disable-next-line no-console
      console.log(`    data_liquidacao: ${String(dbCorrecaoConfig.data_liquidacao ?? '(nulo)')}`);
      // eslint-disable-next-line no-console
      console.log(`    juros_tipo: ${String(dbCorrecaoConfig.juros_tipo ?? '(nulo)')}`);
      // eslint-disable-next-line no-console
      console.log(`    juros_inicio: ${String(dbCorrecaoConfig.juros_inicio ?? '(nulo)')}`);
      // eslint-disable-next-line no-console
      console.log(`    aplicar_juros_fase_pre_judicial (saved by persist): ${String(dbCorrecaoConfig.aplicar_juros_fase_pre_judicial ?? '(nulo)')}`);
      // eslint-disable-next-line no-console
      console.log(`    combinacoes_juros: ${String(dbCorrecaoConfig.combinacoes_juros ?? '(nulo)')}`);
      // eslint-disable-next-line no-console
      console.log(`    combinacoes_indice: ${String(dbCorrecaoConfig.combinacoes_indice ?? '(nulo)')}`);

      // VERIFICAÇÃO DE HIPÓTESE 1 (juros_pre_judicial):
      // Rodar V3-puro com juros_pre_judicial=undefined (simula o orchestrator,
      // que não passa esse campo). Se os juros ficam iguais ao orchestrator,
      // confirmamos que a ausência de juros_pre_judicial é o root cause.
      {
        const analysis2 = analyzePJC(await readPjc(c.file));
        const inputs2 = convertPjcToEngineInputs(analysis2, `check-${c.nome}`);
        inputs2.params.modo_calculo = 'independent';
        inputs2.correcaoConfig.juros_pre_judicial = undefined; // simula orchestrator
        const eng2 = new PjeCalcEngineV3(
          inputs2.params, inputs2.historicos, inputs2.faltas, inputs2.ferias,
          inputs2.verbas, inputs2.cartaoPonto, inputs2.fgtsConfig, inputs2.csConfig,
          inputs2.irConfig, inputs2.correcaoConfig, inputs2.honorariosConfig,
          inputs2.custasConfig, inputs2.seguroConfig, INDICES_DB, INSS_FAIXAS,
        );
        const jurosNoJP = eng2.liquidar().resumo.juros_mora;
        const confirma = Math.abs(jurosNoJP - orchResumo.juros_mora) / orchResumo.juros_mora < 0.02;
        // eslint-disable-next-line no-console
        console.log(`\n  [hipótese 1] V3 sem juros_pre_judicial → juros=${jurosNoJP.toFixed(2)} vs orch=${orchResumo.juros_mora.toFixed(2)} → ${confirma ? '✓ CONFIRMADA' : '✗ NÃO confirma'}`);
      }

      // VERIFICAÇÃO DE HIPÓTESE 3 (base_de_juros_das_verbas):
      // buildCorrecaoConfig em pjc-to-engine.ts lê `a.atualizacao.base_de_juros_das_verbas`
      // do PJC XML e passa para o engine. Se for 'VERBA_INSS', o engine aplica um
      // multiplicador (1 - INSS_rate) na base dos juros. toEngineCorrecaoConfig no
      // orchestrator NÃO repassa esse campo → usa default 'DIFERENCA' → multiplier=1.0.
      // Isso faria o orchestrator computar MAIS juros do que o V3-puro.
      {
        const analysis3 = analyzePJC(await readPjc(c.file));
        const inputs3 = convertPjcToEngineInputs(analysis3, `h3-${c.nome}`);
        inputs3.params.modo_calculo = 'independent';
        // eslint-disable-next-line no-console
        console.log(`\n  [hipótese 3] base_de_juros_das_verbas do PJC: "${inputs3.correcaoConfig.base_de_juros_das_verbas ?? '(undefined)'}"`);
        // Simula orchestrator: remove base_de_juros_das_verbas (defaults to 'DIFERENCA')
        inputs3.correcaoConfig.base_de_juros_das_verbas = undefined;
        const eng3 = new PjeCalcEngineV3(
          inputs3.params, inputs3.historicos, inputs3.faltas, inputs3.ferias,
          inputs3.verbas, inputs3.cartaoPonto, inputs3.fgtsConfig, inputs3.csConfig,
          inputs3.irConfig, inputs3.correcaoConfig, inputs3.honorariosConfig,
          inputs3.custasConfig, inputs3.seguroConfig, INDICES_DB, INSS_FAIXAS,
        );
        const jurosNoBase = eng3.liquidar().resumo.juros_mora;
        const confirma3 = Math.abs(jurosNoBase - orchResumo.juros_mora) / orchResumo.juros_mora < 0.02;
        // eslint-disable-next-line no-console
        console.log(`  [hipótese 3] V3 sem base_de_juros → juros=${jurosNoBase.toFixed(2)} vs orch=${orchResumo.juros_mora.toFixed(2)} → ${confirma3 ? '✓ CONFIRMADA' : '✗ NÃO confirma'}`);
      }

      // ─── PER-OCCURRENCE COMPARISON (izabela only — controle isolado) ──────
      if (c.nome === 'izabela') {
        const orchVerbaPrimeira = orchVerbas[0]; // qualquer verba com juros > 0
        const v3VerbaPrimeira = v3.verbas[0];
        // eslint-disable-next-line no-console
        console.log(`\n  [ocorrências] primeira verba: ${orchVerbaPrimeira?.nome}`);
        // eslint-disable-next-line no-console
        console.log(`    orch.ocorrencias[0..2]: ${JSON.stringify(orchVerbaPrimeira?.ocorrencias?.slice(0, 3).map(o => ({ comp: o.competencia, corr: o.valor_corrigido.toFixed(2), juros: o.juros.toFixed(2) })))}`);
        // eslint-disable-next-line no-console
        console.log(`    v3.ocorrencias[0..2]:   ${JSON.stringify(v3VerbaPrimeira?.ocorrencias?.slice(0, 3).map(o => ({ comp: o.competencia, corr: o.valor_corrigido.toFixed(2), juros: o.juros.toFixed(2) })))}`);
        // Print params.data_ajuizamento for both paths
        // eslint-disable-next-line no-console
        console.log(`\n  data_ajuizamento: v3=${v3.params.data_ajuizamento} | orch from DB=${String((H.db['pjecalc_parametros']?.[0] as Record<string, unknown>)?.data_ajuizamento ?? '(nulo)')}`);
      }

      // VERIFICAÇÃO DE HIPÓTESE 4 (quantidade=0 bug em toEngineVerbas):
      // orchestrator.ts line 228: `Number(o.quantidade_valor) || 1` converte
      // quantidade=0 em 1, inflando meses sem evento (ex: FERIADOS LABORADOS).
      // Verificação: contar ocorrências de FERIADOS LABORADOS em cada path.
      if (c.nome === 'rosicleia') {
        const orchFeriados = orchVerbas.find(v => v.nome === 'FERIADOS LABORADOS');
        const v3Feriados = v3.verbas.find(v => v.nome === 'FERIADOS LABORADOS');
        const orchOcs = orchFeriados?.ocorrencias ?? [];
        const v3Ocs = v3Feriados?.ocorrencias ?? [];
        const orchNonZero = orchOcs.filter(o => o.juros > 0 || o.valor_corrigido > 0);
        const v3NonZero = v3Ocs.filter(o => o.juros > 0 || o.valor_corrigido > 0);
        // eslint-disable-next-line no-console
        console.log(`\n  [hipótese 4] FERIADOS LABORADOS:`);
        // eslint-disable-next-line no-console
        console.log(`    orch ocorrências: total=${orchOcs.length} com valor>0: ${orchNonZero.length}`);
        // eslint-disable-next-line no-console
        console.log(`    v3   ocorrências: total=${v3Ocs.length} com valor>0: ${v3NonZero.length}`);
        // eslint-disable-next-line no-console
        console.log(`    orch total_devido=${orchFeriados?.total_devido?.toFixed(2)} v3 total_devido=${v3Feriados?.total_devido?.toFixed(2)}`);
        const confirma4 = v3NonZero.length < orchNonZero.length;
        // eslint-disable-next-line no-console
        console.log(`    → ${confirma4 ? '✓ CONFIRMADA (orch infla mais meses)' : '✗ NÃO confirma'}`);
      }

      // VERIFICAÇÃO DE HIPÓTESE 5 (resíduo −1.5% de correção — 4º efeito):
      // bruto idêntico mas corrigido diverge. Compara, por competência, a
      // `diferenca` e o `indice_correcao` recalculado pelo engine em cada path.
      // Se indice_correcao difere por competência → viés de cálculo de índice.
      // Se a diferença está na distribuição de competências → outra causa.
      if (c.nome === 'rosicleia') {
        const VERBA_ALVO = 'PRÊMIO ESTÍMULO';
        const ov = orchVerbas.find(v => v.nome === VERBA_ALVO);
        const vv = v3.verbas.find(v => v.nome === VERBA_ALVO);
        const orchByComp = new Map((ov?.ocorrencias ?? []).map(o => [o.competencia, o]));
        const v3ByComp = new Map((vv?.ocorrencias ?? []).map(o => [o.competencia, o]));
        const comps = [...new Set([...orchByComp.keys(), ...v3ByComp.keys()])].sort();
        // eslint-disable-next-line no-console
        console.log(`\n  [hipótese 5] termo-a-termo correção "${VERBA_ALVO}" (orch ${ov?.ocorrencias?.length}oc vs v3 ${vv?.ocorrencias?.length}oc):`);
        // eslint-disable-next-line no-console
        console.log(`    comp     | orch.dif   orch.idx   orch.corr | v3.dif    v3.idx    v3.corr  | Δidx`);
        let primeirosDivergentes = 0;
        for (const comp of comps) {
          const o = orchByComp.get(comp);
          const v = v3ByComp.get(comp);
          const oIdx = o?.indice_correcao ?? 0;
          const vIdx = v?.indice_correcao ?? 0;
          const deltaIdx = Math.abs(oIdx - vIdx);
          // imprime só os 8 primeiros divergentes + os 3 primeiros sempre
          const divergiu = deltaIdx > 1e-6 || Math.abs((o?.diferenca ?? 0) - (v?.diferenca ?? 0)) > 0.01;
          if (divergiu && primeirosDivergentes < 8) {
            primeirosDivergentes++;
            // eslint-disable-next-line no-console
            console.log(`    ${comp} | ${(o?.diferenca ?? 0).toFixed(2).padStart(9)} ${oIdx.toFixed(6).padStart(9)} ${(o?.valor_corrigido ?? 0).toFixed(2).padStart(9)} | ${(v?.diferenca ?? 0).toFixed(2).padStart(9)} ${vIdx.toFixed(6).padStart(9)} ${(v?.valor_corrigido ?? 0).toFixed(2).padStart(9)} | ${deltaIdx.toFixed(6)} ${divergiu ? '←' : ''}`);
          }
        }
        const orchTotalIdx = (ov?.ocorrencias ?? []).reduce((s, o) => s + o.indice_correcao, 0);
        const v3TotalIdx = (vv?.ocorrencias ?? []).reduce((s, o) => s + o.indice_correcao, 0);
        // eslint-disable-next-line no-console
        console.log(`    Σindice_correcao: orch=${orchTotalIdx.toFixed(4)} v3=${v3TotalIdx.toFixed(4)} | total_corrigido orch=${ov?.total_corrigido?.toFixed(2)} v3=${vv?.total_corrigido?.toFixed(2)}`);
        // eslint-disable-next-line no-console
        console.log(`    competências divergentes em índice/dif: ${primeirosDivergentes}${primeirosDivergentes >= 8 ? '+ (truncado)' : ''}`);
      }

      // VERIFICAÇÃO DE HIPÓTESE 6 (ignorar_taxa_negativa — root cause do 4º efeito):
      // engine-v3:480 → setIgnorarTaxaNegativa(cfg.ignorar_taxa_negativa ?? false).
      // toEngineCorrecaoConfig (orchestrator) NÃO repassa esse campo → engine usa
      // false → aplica taxas negativas (deflação IPCA-E) → índice acumulado MENOR.
      // V3-puro passa o valor do PJC (true) → clampa negativas a 0 → índice MAIOR.
      // Teste: rodar V3-puro com ignorar_taxa_negativa=false (simula orchestrator).
      {
        // eslint-disable-next-line no-console
        console.log(`\n  [hipótese 6] ignorar_taxa_negativa do PJC: ${v3.correcaoConfig.ignorar_taxa_negativa} | combinar_indice: ${v3.correcaoConfig.combinar_indice}`);
        const analysis6 = analyzePJC(await readPjc(c.file));
        const inputs6 = convertPjcToEngineInputs(analysis6, `h6-${c.nome}`);
        inputs6.params.modo_calculo = 'independent';
        inputs6.correcaoConfig.ignorar_taxa_negativa = false; // simula orchestrator (?? false)
        const eng6 = new PjeCalcEngineV3(
          inputs6.params, inputs6.historicos, inputs6.faltas, inputs6.ferias,
          inputs6.verbas, inputs6.cartaoPonto, inputs6.fgtsConfig, inputs6.csConfig,
          inputs6.irConfig, inputs6.correcaoConfig, inputs6.honorariosConfig,
          inputs6.custasConfig, inputs6.seguroConfig, INDICES_DB, INSS_FAIXAS,
        );
        const r6 = eng6.liquidar().resumo;
        const confirma6 = Math.abs(r6.principal_corrigido - orchResumo.principal_corrigido) / orchResumo.principal_corrigido < 0.005;
        // eslint-disable-next-line no-console
        console.log(`  [hipótese 6] V3 com ignorar_taxa_negativa=false → corr=${r6.principal_corrigido.toFixed(2)} juros=${r6.juros_mora.toFixed(2)} vs orch corr=${orchResumo.principal_corrigido.toFixed(2)} juros=${orchResumo.juros_mora.toFixed(2)} → ${confirma6 ? '✓ CONFIRMADA' : '✗ NÃO confirma'}`);
      }

      // ─── VERBA-BY-VERBA COMPARISON (top divergências de juros) ───────────
      const orchByNome = new Map(orchVerbas.map((v) => [v.nome, v]));
      const v3ByNome = new Map(v3.verbas.map((v) => [v.nome, v]));
      const allNomes = new Set([...orchByNome.keys(), ...v3ByNome.keys()]);

      type VerbaDelta = { nome: string; orchJuros: number; v3Juros: number; deltaJuros: number; orchBruto: number; v3Bruto: number; deltaBruto: number };
      const deltas: VerbaDelta[] = [];
      for (const nome of allNomes) {
        const ov = orchByNome.get(nome);
        const vv = v3ByNome.get(nome);
        const orchJuros = ov?.total_juros ?? 0;
        const v3Juros = vv?.total_juros ?? 0;
        const orchBruto = ov?.total_devido ?? 0;
        const v3Bruto = vv?.total_devido ?? 0;
        deltas.push({
          nome,
          orchJuros, v3Juros,
          deltaJuros: orchJuros - v3Juros,
          orchBruto, v3Bruto,
          deltaBruto: orchBruto - v3Bruto,
        });
      }

      // VERIFICAÇÃO DE HIPÓTESE 2 (verbas Informadas não persistidas):
      // pjc-persist só salva tipo='Calculada' e tipo='Reflexo'. Se 'Informada'
      // verbas existem na análise PJC, elas não entram no DB → orchestrator retorna 0.
      {
        const analysis2 = analyzePJC(await readPjc(c.file));
        const informadas = analysis2.verbas.filter((v) => v.tipo === 'Informada');
        if (informadas.length > 0) {
          const totalInformadaBruto = informadas.reduce((s, v) => s + (v.total_devido || 0), 0);
          // eslint-disable-next-line no-console
          console.log(`\n  [hipótese 2] verbas Informadas (NÃO persistidas): ${informadas.length} verbas, total_devido=${totalInformadaBruto.toFixed(2)}`);
          for (const v of informadas) {
            // eslint-disable-next-line no-console
            console.log(`    - ${v.nome}: total_devido=${v.total_devido?.toFixed(2) ?? '?'}`);
          }
        } else {
          // eslint-disable-next-line no-console
          console.log(`\n  [hipótese 2] nenhuma verba Informada — bruto divergence tem outra causa`);
        }
      }

      // Sort by |deltaJuros| desc
      deltas.sort((a, b) => Math.abs(b.deltaJuros) - Math.abs(a.deltaJuros));

      const totalJurosDelta = deltas.reduce((s, d) => s + d.deltaJuros, 0);
      const totalBrutoDelta = deltas.reduce((s, d) => s + d.deltaBruto, 0);
      // eslint-disable-next-line no-console
      console.log(`\n  [verbas] top 10 por |deltaJuros| (total juros delta=${totalJurosDelta.toFixed(2)}, bruto delta=${totalBrutoDelta.toFixed(2)}):`);
      for (const d of deltas.slice(0, 10)) {
        // eslint-disable-next-line no-console
        console.log(`    ${d.nome.padEnd(40)} juros: orch=${d.orchJuros.toFixed(2).padStart(10)} v3=${d.v3Juros.toFixed(2).padStart(10)} Δ=${d.deltaJuros.toFixed(2).padStart(10)} | bruto Δ=${d.deltaBruto.toFixed(2).padStart(10)}`);
      }
    }
  }, 180_000);

  // ─── Asserções mínimas (verificação de sanidade — não valores absolutos) ──
  it('izabela: diagnóstico completo disponível (smoke)', () => {
    expect(diag['izabela']).toBeDefined();
    expect(diag['izabela'].orchResumo.principal_bruto).toBeGreaterThan(0);
  });

  it('joseli: diagnóstico completo disponível (smoke)', () => {
    expect(diag['joseli']).toBeDefined();
    expect(diag['joseli'].orchResumo.principal_bruto).toBeGreaterThan(0);
  });

  it('rosicleia: diagnóstico completo disponível (smoke)', () => {
    expect(diag['rosicleia']).toBeDefined();
    expect(diag['rosicleia'].orchResumo.principal_bruto).toBeGreaterThan(0);
  });
});
