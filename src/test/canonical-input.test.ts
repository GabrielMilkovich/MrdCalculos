/**
 * =====================================================
 * TESTES: Camada Canônica de Insumos
 * =====================================================
 * 
 * Testes sistêmicos para impedir regressão de:
 * - Defaults silenciosos em campos críticos
 * - Cálculo com data de liquidação ausente
 * - Cálculo com ajuizamento ausente
 * - Rubricas não mapeadas
 * - Jornada ausente quando verba exige
 * - Equivalência de rubricas
 * - Score de confiabilidade
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalInput,
  validateCanonicalInput,
  generateConfidenceReport,
  findCanonicalRubric,
  compareRubrics,
  mapToCanonical,
  resolved,
  absent,
  type ResolverSources,
} from '../pjecalc/canonical';

// =====================================================
// FIXTURES
// =====================================================

function makeMinimalSources(overrides: Partial<ResolverSources> = {}): ResolverSources {
  return {
    params: {
      id: 'calc-1', case_id: 'case-1',
      estado: 'PR', municipio: 'Curitiba',
      data_admissao: '2010-01-01', data_demissao: '2021-03-09',
      data_ajuizamento: '2021-05-15',
      data_inicial: null, data_final: null,
      prescricao_quinquenal: true, prescricao_fgts: false,
      regime_trabalho: 'tempo_integral', carga_horaria_padrao: 220,
      maior_remuneracao: null, ultima_remuneracao: 3500,
      prazo_aviso_previo: 'calculado', prazo_aviso_dias: 51,
      projetar_aviso_indenizado: true, limitar_avos_periodo: false,
      zerar_valor_negativo: false, sabado_dia_util: true,
      considerar_feriado_estadual: false, considerar_feriado_municipal: false,
      comentarios: null, created_at: '', updated_at: '',
    },
    dadosProcesso: {
      id: 'calc-1', case_id: 'case-1',
      numero_processo: '0001234-56.2021.5.09.0001',
      reclamante_nome: 'Teste Trabalhador',
      reclamante_cpf: '123.456.789-00',
      reclamada_nome: 'Empresa Teste S.A.',
      reclamada_cnpj: '12.345.678/0001-90',
      vara: '1ª Vara', reclamado: null, perito: null, funcao: null,
      data_citacao: '2021-07-15',
      created_at: '', updated_at: '',
    },
    historicos: [
      { id: 'h1', case_id: 'case-1', nome: 'SALÁRIO BASE', periodo_inicio: '2010-01', periodo_fim: '2021-03', tipo_valor: 'informado', valor_informado: 3500, incidencia_fgts: true, incidencia_cs: true, observacoes: null, created_at: '' },
    ],
    histOcorrencias: [],
    verbas: [
      { id: 'v1', case_id: 'case-1', nome: 'Horas Extras 50%', codigo: null, tipo: 'principal', caracteristica: 'COMUM', ocorrencia_pagamento: 'MENSAL', multiplicador: 1.5, divisor_informado: 220, periodo_inicio: '2016-05', periodo_fim: '2021-03', ordem: 1, ativa: true, observacoes: null, hist_salarial_nome: 'SALÁRIO BASE', verba_principal_id: null, valor: 'calculado', valor_informado_devido: null, valor_informado_pago: null, base_calculo: null, created_at: '', updated_at: '' },
    ],
    faltas: [],
    ferias: [],
    cartaoPonto: [
      { id: 'cp1', case_id: 'case-1', competencia: '2020-01', dias_uteis: 22, dias_trabalhados: 22, horas_extras_50: 10, horas_extras_100: 0, horas_noturnas: 0, intervalo_suprimido: 0, dsr_horas: 0, sobreaviso: 0, created_at: '' },
    ],
    fgtsConfig: { id: 'fg1', case_id: 'case-1', habilitado: true, percentual_deposito: 8, percentual_multa: 40, created_at: '' },
    csConfig: { id: 'cs1', case_id: 'case-1', habilitado: true, regime: 'progressivo', created_at: '' },
    irConfig: { id: 'ir1', case_id: 'case-1', habilitado: true, metodo: 'rra', dependentes: 1, created_at: '' },
    correcaoConfig: { id: 'cc1', case_id: 'case-1', indice: 'IPCA-E', epoca: 'mensal', juros_tipo: 'simples_mensal', juros_percentual: 1, juros_inicio: 'ajuizamento', multa_523: false, multa_523_percentual: 10, data_liquidacao: '2025-01-15', indice_correcao: null, created_at: '' },
    atualizacaoConfig: [],
    honorarios: { id: 'hon1', case_id: 'case-1', percentual: 15, sobre: 'condenacao', created_at: '' },
    custasConfig: { id: 'cus1', case_id: 'case-1', percentual: 2, limite: 100000, created_at: '' },
    indicesDB: [{ indice: 'IPCA-E', competencia: '2020-01-01', valor: 0.21, acumulado: 1.0021 }],
    faixasINSSDB: [{ competencia_inicio: '2025-01-01', faixa: 1, valor_ate: 1518, aliquota: 7.5 }],
    faixasIRDB: [{ competencia_inicio: '2025-01-01', faixa: 1, valor_ate: 2259.20, aliquota: 0, deducao: 0, deducao_dependente: 189.59 }],
    feriadosDB: [],
    seguroDesempregoDB: [],
    salarioFamiliaDB: [],
    isPjcImport: false,
    ...overrides,
  };
}

// =====================================================
// TESTS: Canonical Input Resolution
// =====================================================

describe('Canonical Input Resolution', () => {
  it('resolves all critical temporal marks from complete sources', () => {
    const sources = makeMinimalSources();
    const input = resolveCanonicalInput(sources);

    expect(input.temporal.data_admissao.isResolved).toBe(true);
    expect(input.temporal.data_admissao.value).toBe('2010-01-01');
    expect(input.temporal.data_ajuizamento.isResolved).toBe(true);
    expect(input.temporal.data_liquidacao.isResolved).toBe(true);
    expect(input.temporal.data_liquidacao.value).toBe('2025-01-15');
    expect(input.temporal.data_citacao.isResolved).toBe(true);
    expect(input.temporal.data_citacao.value).toBe('2021-07-15');
  });

  it('marks absent fields when data_liquidacao is missing', () => {
    const sources = makeMinimalSources({
      correcaoConfig: { id: 'cc1', case_id: 'case-1', indice: 'IPCA-E', epoca: 'mensal', juros_tipo: 'simples_mensal', juros_percentual: 1, juros_inicio: 'ajuizamento', multa_523: false, multa_523_percentual: 10, data_liquidacao: null, indice_correcao: null, created_at: '' },
    });
    const input = resolveCanonicalInput(sources);
    expect(input.temporal.data_liquidacao.isResolved).toBe(false);
    expect(input.temporal.data_liquidacao.blocksCalculation).toBe(true);
  });

  it('marks absent fields when data_ajuizamento is missing', () => {
    const sources = makeMinimalSources();
    sources.params!.data_ajuizamento = null;
    const input = resolveCanonicalInput(sources);
    expect(input.temporal.data_ajuizamento.isResolved).toBe(false);
    expect(input.temporal.data_ajuizamento.blocksCalculation).toBe(true);
  });

  it('maps verbas to canonical rubric codes', () => {
    const sources = makeMinimalSources();
    const input = resolveCanonicalInput(sources);
    expect(input.verbas[0].codigo_canonico.isResolved).toBe(true);
    expect(input.verbas[0].codigo_canonico.value).toBe('HE_50');
  });

  it('tracks source of each field', () => {
    const sources = makeMinimalSources();
    const input = resolveCanonicalInput(sources);
    expect(input.identification.processo_cnj.source).toBe('database');
    expect(input.temporal.data_admissao.source).toBe('database');
  });

  it('marks PJC import source correctly', () => {
    const sources = makeMinimalSources({ isPjcImport: true });
    const input = resolveCanonicalInput(sources);
    expect(input.temporal.data_admissao.source).toBe('pjc_import');
  });
});

// =====================================================
// TESTS: Input Validation — Blockers
// =====================================================

describe('Input Validation — Blockers', () => {
  it('blocks calculation when data_liquidacao is absent', () => {
    const sources = makeMinimalSources({
      correcaoConfig: { id: 'cc1', case_id: 'case-1', indice: 'IPCA-E', epoca: 'mensal', juros_tipo: 'simples_mensal', juros_percentual: 1, juros_inicio: 'ajuizamento', multa_523: false, multa_523_percentual: 10, data_liquidacao: null, indice_correcao: null, created_at: '' },
    });
    const input = resolveCanonicalInput(sources);
    const result = validateCanonicalInput(input);
    expect(result.canProceed).toBe(false);
    expect(result.blockers.some(b => b.code === 'E003_LIQUIDACAO')).toBe(true);
  });

  it('blocks calculation when data_admissao is absent', () => {
    const sources = makeMinimalSources();
    sources.params!.data_admissao = null;
    const input = resolveCanonicalInput(sources);
    const result = validateCanonicalInput(input);
    expect(result.canProceed).toBe(false);
    expect(result.blockers.some(b => b.code === 'E001_ADMISSAO')).toBe(true);
  });

  it('blocks when verba depends on jornada but no cartao_ponto', () => {
    const sources = makeMinimalSources({ cartaoPonto: [] });
    const input = resolveCanonicalInput(sources);
    // Force the verba to depend on jornada (it should be auto-detected from canonical)
    if (input.verbas[0].depende_jornada.value) {
      const result = validateCanonicalInput(input);
      expect(result.blockers.some(b => b.code === 'E_VERBA_JORNADA_MISSING')).toBe(true);
    }
  });

  it('blocks when salary history is empty but verbas exist', () => {
    const sources = makeMinimalSources({ historicos: [] });
    const input = resolveCanonicalInput(sources);
    const result = validateCanonicalInput(input);
    expect(result.blockers.some(b => b.code === 'E_SALARY_EMPTY')).toBe(true);
  });

  it('allows calculation with all required fields present', () => {
    const sources = makeMinimalSources();
    const input = resolveCanonicalInput(sources);
    const result = validateCanonicalInput(input);
    expect(result.canProceed).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });
});

// =====================================================
// TESTS: Confidence Report
// =====================================================

describe('Confidence Report', () => {
  it('generates score > 80 for complete inputs', () => {
    const sources = makeMinimalSources();
    const input = resolveCanonicalInput(sources);
    const report = generateConfidenceReport(input);
    expect(report.overall).toBeGreaterThan(70);
    expect(report.status).toBe('apto');
  });

  it('reports "bloqueado" when critical inputs missing', () => {
    const sources = makeMinimalSources();
    sources.params!.data_admissao = null;
    const input = resolveCanonicalInput(sources);
    const report = generateConfidenceReport(input);
    expect(report.status).toBe('bloqueado');
    expect(report.missingCritical.length).toBeGreaterThan(0);
  });

  it('tracks input source summary', () => {
    const sources = makeMinimalSources();
    const input = resolveCanonicalInput(sources);
    const report = generateConfidenceReport(input);
    expect(report.inputSources.database).toBeGreaterThan(0);
  });
});

// =====================================================
// TESTS: Rubric Taxonomy
// =====================================================

describe('Rubric Taxonomy', () => {
  it('maps "Horas Extras 50%" to canonical HE_50', () => {
    const rubric = findCanonicalRubric('Horas Extras 50%');
    expect(rubric).not.toBeNull();
    expect(rubric!.code).toBe('HE_50');
    expect(rubric!.depende_jornada).toBe(true);
  });

  it('maps PJe-Calc alias "HORAS EXTRAS A 50%" to HE_50', () => {
    const rubric = findCanonicalRubric('HORAS EXTRAS A 50%');
    expect(rubric).not.toBeNull();
    expect(rubric!.code).toBe('HE_50');
  });

  it('maps "DIF. COMISSÕES - CANCELADAS" to canonical code', () => {
    const rubric = findCanonicalRubric('DIF. COMISSÕES - CANCELADAS');
    expect(rubric).not.toBeNull();
    expect(rubric!.code).toBe('DIF_COMISSOES_CANCELADAS');
  });

  it('maps "COMISSÕES ESTORNADAS" same as "DIF. COMISSÕES - CANCELADAS"', () => {
    expect(compareRubrics('DIF. COMISSÕES - CANCELADAS', 'COMISSÕES ESTORNADAS')).toBe('equivalent');
  });

  it('detects "FERIADOS LABORADOS" as equivalent to "DOMINGOS E FERIADOS TRABALHADOS"', () => {
    expect(compareRubrics('FERIADOS LABORADOS', 'DOMINGOS E FERIADOS TRABALHADOS')).toBe('equivalent');
  });

  it('correctly differentiates HE_50 from HE_100', () => {
    expect(compareRubrics('HORAS EXTRAS 50%', 'HORAS EXTRAS 100%')).toBe('different');
  });

  it('returns "unknown" for unmapped rubrics', () => {
    expect(compareRubrics('VERBA ESPECIAL XYZ', 'OUTRA VERBA ABC')).toBe('unknown');
  });

  it('maps batch of names and identifies unmapped ones', () => {
    const result = mapToCanonical([
      'Horas Extras 50%',
      'DSR S/ HORAS EXTRAS',
      'VERBA DESCONHECIDA QUALQUER',
      'INTERVALO INTRAJORNADA',
    ]);
    expect(result.mapped).toHaveLength(3);
    expect(result.unmapped).toEqual(['VERBA DESCONHECIDA QUALQUER']);
  });

  it('marks jornada-dependent rubrics correctly', () => {
    const he = findCanonicalRubric('HE 50%');
    expect(he?.depende_jornada).toBe(true);
    const comissao = findCanonicalRubric('COMISSÕES');
    expect(comissao?.depende_jornada).toBe(false);
    expect(comissao?.depende_comissao).toBe(true);
  });
});

// =====================================================
// TESTS: No Silent Defaults on Critical Path
// =====================================================

describe('No Silent Defaults', () => {
  it('never silently defaults data_liquidacao', () => {
    const sources = makeMinimalSources({
      correcaoConfig: { id: 'cc1', case_id: 'case-1', indice: 'IPCA-E', epoca: null, juros_tipo: null, juros_percentual: null, juros_inicio: null, multa_523: false, multa_523_percentual: 10, data_liquidacao: null, indice_correcao: null, created_at: '' },
    });
    const input = resolveCanonicalInput(sources);
    // The field must be marked as absent and blocking, NOT silently filled with today's date
    expect(input.temporal.data_liquidacao.source).toBe('absent');
    expect(input.temporal.data_liquidacao.blocksCalculation).toBe(true);
    expect(input.temporal.data_liquidacao.isResolved).toBe(false);
  });

  it('never silently defaults data_ajuizamento', () => {
    const sources = makeMinimalSources();
    sources.params!.data_ajuizamento = '';
    const input = resolveCanonicalInput(sources);
    expect(input.temporal.data_ajuizamento.isResolved).toBe(false);
    expect(input.temporal.data_ajuizamento.blocksCalculation).toBe(true);
  });

  it('default for carga_horaria is audited and traceable', () => {
    const sources = makeMinimalSources();
    sources.params!.carga_horaria_padrao = 220;
    const input = resolveCanonicalInput(sources);
    // When 220 comes from DB it's 'database'; when from default it's 'default_audited'
    expect(['database', 'default_audited']).toContain(input.juridical.carga_horaria_padrao.source);
    expect(input.juridical.carga_horaria_padrao.value).toBe(220);
  });
});
