/**
 * Domain layer + Verba Modules — Integration Tests
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

// Domain
import { buildTimeline, generateCompetencias, buildCalendarInfo } from '@/domain/timeline-builder';
import { resolveJudicialTitle, getRulesForRubric, isRubricGranted } from '@/domain/judicial-title-resolver';
import { calcularFGTS, calcularINSS, calcularIRRF } from '@/domain/incidence-engine';
import { classifyRubric, getRubricByCode, getReflexiveRubrics } from '@/domain/rubric-classifier';
import type { JudicialTitleVersion, CalendarRule, EmploymentContract } from '@/domain/types';
import type { INSSTabela, IRRFTabela, FGTSConfig, IncidenceContext } from '@/domain/incidence-engine';

// Verba modules
import { getAllVerbaModules, getModulesInOrder } from '@/lib/pjecalc/verba-modules';

// =====================================================
// TIMELINE BUILDER
// =====================================================

describe('Timeline Builder', () => {
  it('should generate correct competências', () => {
    const comps = generateCompetencias('2023-01-15', '2023-06-10');
    expect(comps).toEqual(['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06']);
  });

  it('should handle cross-year period', () => {
    const comps = generateCompetencias('2022-11-01', '2023-02-28');
    expect(comps.length).toBe(4);
    expect(comps[0]).toBe('2022-11');
    expect(comps[3]).toBe('2023-02');
  });

  it('should build calendar info with holidays', () => {
    const rules: CalendarRule[] = [{
      ano: 2024,
      estado: 'MG',
      feriados: [
        { data: '2024-01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
        { data: '2024-01-25', nome: 'Aniversário SP', tipo: 'municipal' },
      ],
      sabado_dia_util: false,
    }];

    const info = buildCalendarInfo('2024-01', rules, false, true, false);
    expect(info.dias_no_mes).toBe(31);
    expect(info.feriados).toBe(1); // only national (municipal excluded)
    expect(info.domingos).toBeGreaterThan(0);
  });

  it('should build full timeline for a contract', () => {
    const contract: EmploymentContract = {
      id: 'c1',
      case_id: 'case1',
      admissao: '2023-01-02',
      demissao: '2023-03-31',
      funcao: 'Vendedor',
      regime: 'clt',
      tipo_salario: 'fixo',
      carga_horaria_semanal: 44,
      periods: [],
      salary_histories: [{
        id: 'sh1', contract_id: 'c1', rubric_name: 'Salário', tipo: 'fixo',
        records: [
          { competencia: '2023-01', valor: 2000, fonte: 'ctps', confidence: 1 },
          { competencia: '2023-02', valor: 2000, fonte: 'ctps', confidence: 1 },
          { competencia: '2023-03', valor: 2200, fonte: 'ctps', confidence: 1 },
        ],
      }],
      events: [],
    };

    const timeline = buildTimeline({
      contract,
      calendarRules: [],
      normativeRules: [],
      evidenceSources: [],
      sabadoDiaUtil: false,
      considerarFeriadoEstadual: true,
      considerarFeriadoMunicipal: false,
    });

    expect(timeline.length).toBe(3);
    expect(timeline[0].competencia).toBe('2023-01');
    expect(timeline[0].salario_base).toBe(2000);
    expect(timeline[0].vinculo_ativo).toBe(true);
    expect(timeline[2].salario_base).toBe(2200);
  });
});

// =====================================================
// JUDICIAL TITLE RESOLVER
// =====================================================

describe('Judicial Title Resolver', () => {
  it('should resolve simple sentença rules', () => {
    const versions: JudicialTitleVersion[] = [{
      id: 'v1', case_id: 'c1', versao: 1, tipo: 'sentenca', data_decisao: '2023-06-01',
      descricao: 'Sentença', created_at: '2023-06-01',
      rules: [
        { id: 'r1', title_version_id: 'v1', rubric_code: 'HE_50', tipo: 'deferimento', descricao: 'Horas extras 50% deferidas', parametros: { adicional: 50 }, prioridade: 1, fonte: 'sentenca' },
        { id: 'r2', title_version_id: 'v1', rubric_code: 'COMISSAO', tipo: 'indeferimento', descricao: 'Comissões indeferidas', parametros: {}, prioridade: 1, fonte: 'sentenca' },
      ],
    }];

    const state = resolveJudicialTitle(versions);
    expect(isRubricGranted(state, 'HE_50')).toBe(true);
    expect(isRubricGranted(state, 'COMISSAO')).toBe(false);
    expect(state.denied_rubrics.has('COMISSAO')).toBe(true);
  });

  it('should let acórdão override sentença', () => {
    const versions: JudicialTitleVersion[] = [
      {
        id: 'v1', case_id: 'c1', versao: 1, tipo: 'sentenca', data_decisao: '2023-06-01',
        descricao: 'Sentença', created_at: '2023-06-01',
        rules: [
          { id: 'r1', title_version_id: 'v1', rubric_code: 'HE_50', tipo: 'deferimento', descricao: 'HE 50%', parametros: { adicional: 50, periodo: 'integral' }, prioridade: 1, fonte: 'sentenca' },
        ],
      },
      {
        id: 'v2', case_id: 'c1', versao: 2, tipo: 'acordao', data_decisao: '2024-01-15',
        descricao: 'Acórdão', created_at: '2024-01-15',
        rules: [
          { id: 'r2', title_version_id: 'v2', rubric_code: 'HE_50', tipo: 'deferimento', descricao: 'HE 50% - limitado', parametros: { adicional: 50, limite: '8a16' }, prioridade: 1, fonte: 'acordao' },
        ],
      },
    ];

    const state = resolveJudicialTitle(versions);
    const rules = getRulesForRubric(state, 'HE_50');
    expect(rules.length).toBe(1);
    expect(rules[0].source_version.tipo).toBe('acordao');
    expect(state.conflicts.length).toBe(1);
    expect(state.conflicts[0].resolution).toBe('posterior_prevalece');
  });

  it('should handle embargos re-granting a denied rubric', () => {
    const versions: JudicialTitleVersion[] = [
      {
        id: 'v1', case_id: 'c1', versao: 1, tipo: 'sentenca', data_decisao: '2023-06-01',
        descricao: 'Sentença', created_at: '2023-06-01',
        rules: [
          { id: 'r1', title_version_id: 'v1', rubric_code: 'DSR', tipo: 'deferimento', descricao: 'DSR deferido', parametros: {}, prioridade: 1, fonte: 'sentenca' },
        ],
      },
      {
        id: 'v2', case_id: 'c1', versao: 2, tipo: 'acordao', data_decisao: '2024-01-15',
        descricao: 'Acórdão', created_at: '2024-01-15',
        rules: [
          { id: 'r2', title_version_id: 'v2', rubric_code: 'DSR', tipo: 'indeferimento', descricao: 'DSR indeferido', parametros: {}, prioridade: 1, fonte: 'acordao' },
        ],
      },
      {
        id: 'v3', case_id: 'c1', versao: 3, tipo: 'embargos_declaracao', data_decisao: '2024-03-01',
        descricao: 'Embargos', created_at: '2024-03-01',
        rules: [
          { id: 'r3', title_version_id: 'v3', rubric_code: 'DSR', tipo: 'deferimento', descricao: 'DSR deferido nos embargos', parametros: {}, prioridade: 1, fonte: 'embargos_declaracao' },
        ],
      },
    ];

    const state = resolveJudicialTitle(versions);
    expect(isRubricGranted(state, 'DSR')).toBe(true);
    expect(state.denied_rubrics.has('DSR')).toBe(false);
  });
});

// =====================================================
// INCIDENCE ENGINE
// =====================================================

describe('Incidence Engine', () => {
  const fgtsConfig: FGTSConfig = { aliquota: 8, multa_rescisoria: 40 };

  const inssTabela: INSSTabela = {
    competencia: '2024-01',
    teto: 7786.02,
    faixas: [
      { valor_inicial: 0, valor_final: 1412, aliquota: 7.5 },
      { valor_inicial: 1412.01, valor_final: 2666.68, aliquota: 9 },
      { valor_inicial: 2666.69, valor_final: 4000.03, aliquota: 12 },
      { valor_inicial: 4000.04, valor_final: 7786.02, aliquota: 14 },
    ],
  };

  const irrfTabela: IRRFTabela = {
    competencia: '2024-01',
    deducao_dependente: 189.59,
    faixas: [
      { valor_inicial: 0, valor_final: 2259.20, aliquota: 0, parcela_deduzir: 0 },
      { valor_inicial: 2259.21, valor_final: 2826.65, aliquota: 7.5, parcela_deduzir: 169.44 },
      { valor_inicial: 2826.66, valor_final: 3751.05, aliquota: 15, parcela_deduzir: 381.44 },
      { valor_inicial: 3751.06, valor_final: 4664.68, aliquota: 22.5, parcela_deduzir: 662.77 },
      { valor_inicial: 4664.69, valor_final: null, aliquota: 27.5, parcela_deduzir: 896.00 },
    ],
  };

  it('should calculate FGTS at 8%', () => {
    const ctx: IncidenceContext = {
      base: new Decimal(3000),
      natureza: 'salarial',
      competencia: '2024-01',
      is_13_salario: false,
      is_ferias: false,
      is_plr: false,
      is_rescisoria_indenizatoria: false,
      incidences_config: { fgts: true, inss: true, irrf: true },
    };

    const result = calcularFGTS(ctx, fgtsConfig);
    expect(result).not.toBeNull();
    expect(result!.valor.toNumber()).toBe(240);
  });

  it('should skip FGTS for indenizatória', () => {
    const ctx: IncidenceContext = {
      base: new Decimal(3000),
      natureza: 'indenizatoria',
      competencia: '2024-01',
      is_13_salario: false, is_ferias: false, is_plr: false, is_rescisoria_indenizatoria: false,
      incidences_config: { fgts: true, inss: true, irrf: true },
    };

    expect(calcularFGTS(ctx, fgtsConfig)).toBeNull();
  });

  it('should calculate progressive INSS', () => {
    const ctx: IncidenceContext = {
      base: new Decimal(3000),
      natureza: 'salarial',
      competencia: '2024-01',
      is_13_salario: false, is_ferias: false, is_plr: false, is_rescisoria_indenizatoria: false,
      incidences_config: { fgts: true, inss: true, irrf: true },
    };

    const result = calcularINSS(ctx, inssTabela);
    expect(result).not.toBeNull();
    // Faixa 1: 1412 × 7.5% = 105.90
    // Faixa 2: (2666.68 - 1412) × 9% = 112.92
    // Faixa 3: (3000 - 2666.68) × 12% = 39.99 (approx)
    expect(result!.valor.toNumber()).toBeGreaterThan(250);
    expect(result!.detalhamento!.length).toBe(3);
  });

  it('should calculate IRRF with deductions', () => {
    const ctx: IncidenceContext = {
      base: new Decimal(5000),
      natureza: 'salarial',
      competencia: '2024-01',
      is_13_salario: false, is_ferias: false, is_plr: false, is_rescisoria_indenizatoria: false,
      incidences_config: { fgts: true, inss: true, irrf: true },
    };

    const deducaoInss = new Decimal(400);
    const result = calcularIRRF(ctx, irrfTabela, deducaoInss, 0);
    expect(result).not.toBeNull();
    expect(result!.valor.toNumber()).toBeGreaterThan(0);
  });
});

// =====================================================
// RUBRIC CLASSIFIER
// =====================================================

describe('Rubric Classifier', () => {
  it('should classify exact code match', () => {
    const result = classifyRubric('HE_50');
    expect(result).not.toBeNull();
    expect(result!.canonical_rubric_id).toBe('HE_50');
    expect(result!.confidence).toBe(1.0);
    expect(result!.method).toBe('exact');
  });

  it('should classify by alias', () => {
    const result = classifyRubric('hora extra 50');
    expect(result).not.toBeNull();
    expect(result!.canonical_rubric_id).toBe('HE_50');
    expect(result!.method).toBe('alias');
  });

  it('should classify by name', () => {
    const result = classifyRubric('Multa Art. 477 CLT');
    expect(result).not.toBeNull();
    expect(result!.canonical_rubric_id).toBe('MULTA_477');
  });

  it('should return null for unknown rubric', () => {
    const result = classifyRubric('XYZZY_UNKNOWN_123');
    expect(result).toBeNull();
  });

  it('should find reflexive rubrics', () => {
    const reflexive = getReflexiveRubrics();
    expect(reflexive.length).toBeGreaterThan(5);
    expect(reflexive.every(r => r.gera_reflexos)).toBe(true);
  });

  it('should get rubric by code', () => {
    const rubric = getRubricByCode('DSR');
    expect(rubric).toBeDefined();
    expect(rubric!.natureza).toBe('salarial');
  });
});

// =====================================================
// VERBA MODULES
// =====================================================

describe('Verba Module System', () => {
  it('should have all expected modules registered', () => {
    const modules = getAllVerbaModules();
    const ids = modules.map(m => m.id);
    
    expect(ids).toContain('HE_50');
    expect(ids).toContain('HE_100');
    expect(ids).toContain('DSR');
    expect(ids).toContain('SALDO_SAL');
    expect(ids).toContain('AVISO_PREVIO');
    expect(ids).toContain('COMISSAO');
    expect(ids).toContain('PREMIO');
    expect(ids).toContain('INTRAJORNADA');
    expect(ids).toContain('INTERJORNADA');
    expect(ids).toContain('ART384');
    expect(ids).toContain('DOM_FER');
    expect(ids).toContain('MULTA_467');
    expect(ids).toContain('MULTA_477');
  });

  it('should respect topological order (DSR after HE)', () => {
    const ordered = getModulesInOrder();
    const heIdx = ordered.findIndex(m => m.id === 'HE_50');
    const dsrIdx = ordered.findIndex(m => m.id === 'DSR');
    expect(heIdx).toBeLessThan(dsrIdx);
  });

  it('should compute HE_50 correctly', () => {
    const modules = getAllVerbaModules();
    const he50 = modules.find(m => m.id === 'HE_50')!;
    
    const inputs = {
      base: 2200,
      baseSource: 'test',
      quantidade: 20,
      quantidadeSource: 'test',
      divisor: 220,
      divisorSource: 'test',
      multiplicador: 1.5,
    };
    
    const result = he50.applyFormula(inputs, {} as any);
    // 2200/220 = 10 × 1.5 = 15 × 20 = 300
    expect(result).toBe(300);
  });

  it('should compute DSR correctly', () => {
    const modules = getAllVerbaModules();
    const dsr = modules.find(m => m.id === 'DSR')!;
    
    const inputs = {
      base: 300, // soma HE
      baseSource: 'HE_50:300',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 22, // dias úteis
      divisorSource: 'calendario',
      multiplicador: 4, // repousos
    };
    
    const result = dsr.applyFormula(inputs, {} as any);
    // 300/22 = 13.63 × 4 = 54.52
    expect(result).toBeCloseTo(54.52, 1);
  });
});
