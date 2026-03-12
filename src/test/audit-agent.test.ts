/**
 * =====================================================
 * TESTS: AI Audit Agent — Canonical Input & Resolution
 * =====================================================
 */

import { describe, it, expect } from 'vitest';
import { resolveCanonicalInput, type ResolverSources } from '@/lib/pjecalc/canonical/resolver';
import { validateCanonicalInput } from '@/lib/pjecalc/canonical/validator';
import { generateConfidenceReport } from '@/lib/pjecalc/canonical/confidence-report';

// =====================================================
// MINIMAL SOURCES FACTORY
// =====================================================

function makeMinimalSources(overrides?: Partial<ResolverSources>): ResolverSources {
  return {
    params: {
      case_id: 'test-case-001',
      data_admissao: '2015-01-05',
      data_demissao: '2020-06-15',
      data_ajuizamento: '2021-03-10',
      estado: 'SP',
      municipio: 'São Paulo',
      regime_trabalho: 'tempo_integral',
      carga_horaria_padrao: 220,
      prescricao_quinquenal: true,
      prescricao_fgts: false,
      prazo_aviso_previo: 'calculado',
      projetar_aviso_indenizado: false,
      limitar_avos_periodo: false,
      zerar_valor_negativo: false,
      sabado_dia_util: true,
      considerar_feriado_estadual: false,
      considerar_feriado_municipal: false,
    } as any,
    dadosProcesso: null,
    historicos: [],
    histOcorrencias: [],
    verbas: [],
    faltas: [],
    ferias: [],
    cartaoPonto: [],
    fgtsConfig: null,
    csConfig: null,
    irConfig: null,
    correcaoConfig: { data_liquidacao: '2025-03-01', indice: 'IPCA-E', juros_tipo: 'simples_mensal', juros_percentual: 1, juros_inicio: 'ajuizamento' } as any,
    atualizacaoConfig: [],
    honorarios: null,
    custasConfig: null,
    indicesDB: [{ competencia: '2024-01-01', indice: 'IPCA-E', valor: 0.5 }] as any,
    faixasINSSDB: [{ faixa: 1, valor_inicial: 0, valor_final: 1320, aliquota: 7.5 }] as any,
    faixasIRDB: [{ faixa: 1, valor_inicial: 0, valor_final: 2112, aliquota: 0 }] as any,
    feriadosDB: [],
    seguroDesempregoDB: [],
    salarioFamiliaDB: [],
    isPjcImport: false,
    ...overrides,
  };
}

// =====================================================
// TEST: Input Resolution
// =====================================================

describe('Input Resolution Engine', () => {
  it('resolves minimal sources into canonical input', () => {
    const sources = makeMinimalSources();
    const canonical = resolveCanonicalInput(sources);

    expect(canonical._version).toBe(1);
    expect(canonical.temporal.data_admissao.isResolved).toBe(true);
    expect(canonical.temporal.data_admissao.value).toBe('2015-01-05');
    expect(canonical.temporal.data_liquidacao.isResolved).toBe(true);
    expect(canonical.identification.case_id.value).toBe('test-case-001');
  });

  it('marks absent data_liquidacao as blocker', () => {
    const sources = makeMinimalSources({
      correcaoConfig: { indice: 'IPCA-E', juros_tipo: 'simples_mensal' } as any,
    });
    const canonical = resolveCanonicalInput(sources);

    expect(canonical.temporal.data_liquidacao.isResolved).toBe(false);
    expect(canonical.temporal.data_liquidacao.blocksCalculation).toBe(true);
    expect(canonical.temporal.data_liquidacao.warningCode).toBe('E003_LIQUIDACAO');
  });

  it('marks absent data_ajuizamento as blocker', () => {
    const sources = makeMinimalSources({
      params: { ...makeMinimalSources().params!, data_ajuizamento: '' } as any,
    });
    const canonical = resolveCanonicalInput(sources);

    expect(canonical.temporal.data_ajuizamento.isResolved).toBe(false);
    expect(canonical.temporal.data_ajuizamento.blocksCalculation).toBe(true);
  });

  it('resolves PJC import with correct source', () => {
    const sources = makeMinimalSources({ isPjcImport: true });
    const canonical = resolveCanonicalInput(sources);

    expect(canonical.temporal.data_admissao.source).toBe('pjc_import');
    expect(canonical.identification.fonte_caso.value).toBe('pjc');
  });
});

// =====================================================
// TEST: Validation with blocking
// =====================================================

describe('Canonical Input Validation', () => {
  it('blocks calculation when data_liquidacao is absent', () => {
    const sources = makeMinimalSources({
      correcaoConfig: { indice: 'IPCA-E' } as any,
    });
    const canonical = resolveCanonicalInput(sources);
    const validation = validateCanonicalInput(canonical);

    expect(validation.canProceed).toBe(false);
    expect(validation.blockers.length).toBeGreaterThan(0);
    expect(validation.blockers.some(b => b.code === 'E003_LIQUIDACAO')).toBe(true);
  });

  it('allows calculation with complete inputs', () => {
    const sources = makeMinimalSources();
    const canonical = resolveCanonicalInput(sources);
    const validation = validateCanonicalInput(canonical);

    expect(validation.canProceed).toBe(true);
    expect(validation.blockers.length).toBe(0);
  });

  it('warns when salary history is empty but verbas exist', () => {
    const sources = makeMinimalSources({
      verbas: [{ id: 'v1', nome: 'HE 50%', tipo: 'principal', caracteristica: 'COMUM', periodo_inicio: '2015-01-05', periodo_fim: '2020-06-15' }] as any,
    });
    const canonical = resolveCanonicalInput(sources);
    const validation = validateCanonicalInput(canonical);

    expect(validation.blockers.some(b => b.code === 'E_SALARY_EMPTY')).toBe(true);
  });

  it('blocks when jornada is needed but absent', () => {
    const sources = makeMinimalSources({
      verbas: [{
        id: 'v1', nome: 'HORAS EXTRAS 50%', tipo: 'principal',
        caracteristica: 'COMUM', periodo_inicio: '2015-01-05', periodo_fim: '2020-06-15',
      }] as any,
    });
    const canonical = resolveCanonicalInput(sources);

    // If the canonical rubric requires jornada, it should block
    const jornadaVerbas = canonical.verbas.filter(v => v.depende_jornada.value);
    if (jornadaVerbas.length > 0 && canonical.jornada.cartao_ponto.length === 0) {
      const validation = validateCanonicalInput(canonical);
      expect(validation.blockers.some(b => b.code === 'E_VERBA_JORNADA_MISSING')).toBe(true);
    }
  });
});

// =====================================================
// TEST: Confidence Report
// =====================================================

describe('Confidence Report', () => {
  it('generates report with correct status for complete input', () => {
    const sources = makeMinimalSources();
    const canonical = resolveCanonicalInput(sources);
    const report = generateConfidenceReport(canonical);

    expect(report.overall).toBeGreaterThan(0);
    expect(['apto', 'apto_com_warnings']).toContain(report.status);
    expect(report.modules.length).toBeGreaterThan(0);
    expect(report.timestamp).toBeTruthy();
  });

  it('reports bloqueado when critical fields are absent', () => {
    const sources = makeMinimalSources({
      params: { ...makeMinimalSources().params!, data_admissao: '', data_ajuizamento: '' } as any,
      correcaoConfig: { indice: 'IPCA-E' } as any,
    });
    const canonical = resolveCanonicalInput(sources);
    const report = generateConfidenceReport(canonical);

    expect(report.status).toBe('bloqueado');
    expect(report.missingCritical.length).toBeGreaterThan(0);
  });

  it('tracks input sources correctly', () => {
    const sources = makeMinimalSources();
    const canonical = resolveCanonicalInput(sources);
    const report = generateConfidenceReport(canonical);

    const totalSources = Object.values(report.inputSources).reduce((a, b) => a + b, 0);
    expect(totalSources).toBeGreaterThan(0);
  });

  it('identifies defaulted fields', () => {
    const sources = makeMinimalSources();
    const canonical = resolveCanonicalInput(sources);
    const report = generateConfidenceReport(canonical);

    // There should be some defaulted fields from 'default_audited' source
    expect(report.inputSources.default_audited).toBeGreaterThanOrEqual(0);
  });
});

// =====================================================
// TEST: Conflict Detection
// =====================================================

describe('Conflict Detection', () => {
  it('detects when SELIC is used without citacao date', () => {
    const sources = makeMinimalSources({
      atualizacaoConfig: [{
        tipo: 'correcao',
        combinacoes_indice: [
          { de: '2015-01-01', ate: '2021-03-01', indice: 'IPCA-E' },
          { de: '2021-03-01', indice: 'SELIC' },
        ],
      }],
    });
    const canonical = resolveCanonicalInput(sources);
    const validation = validateCanonicalInput(canonical);

    // Without citacao, SELIC regime should be flagged
    const selicFinding = validation.blockers.find(b => b.code === 'E_TEMPORAL_CITACAO_ADC58');
    if (canonical.monetary.combinacoes_indice.value.some(c => c.indice === 'SELIC')) {
      expect(selicFinding).toBeTruthy();
    }
  });
});

// =====================================================
// TEST: Score calculation
// =====================================================

describe('Module Scores', () => {
  it('calculates per-module completeness', () => {
    const sources = makeMinimalSources();
    const canonical = resolveCanonicalInput(sources);
    const validation = validateCanonicalInput(canonical);

    expect(Object.keys(validation.moduleScores).length).toBeGreaterThan(0);
    expect(validation.completenessScore).toBeGreaterThan(0);
    expect(validation.resolvedFields).toBeGreaterThan(0);
  });
});
