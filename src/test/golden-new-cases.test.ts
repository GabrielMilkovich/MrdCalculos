/**
 * GOLDEN TESTS — 7 Novos Casos PJC
 * Valida que o PJC Analyzer extrai corretamente os dados de cada caso.
 * Esses dados servem como Ground Truth para validação do motor de cálculo.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';

interface CaseConfig {
  file: string;
  reclamante: string;
  reclamado_contains: string;
}

const CASES: CaseConfig[] = [
  { file: 'islan-rodrigues.pjc', reclamante: 'ISLAN RODRIGUES', reclamado_contains: 'CASAS BAHIA' },
  { file: 'leide-santana.pjc', reclamante: 'LEIDE', reclamado_contains: '' },
  { file: 'vanderlei-carvalho.pjc', reclamante: 'VANDERLEI', reclamado_contains: '' },
  { file: 'carla-pego.pjc', reclamante: 'CARLA', reclamado_contains: '' },
  { file: 'francisco-pablo.pjc', reclamante: 'FRANCISCO', reclamado_contains: '' },
  { file: 'pyter-gabriel.pjc', reclamante: 'PYTER', reclamado_contains: '' },
  { file: 'tiago-jose.pjc', reclamante: 'TIAGO', reclamado_contains: '' },
];

const analyses = new Map<string, PJCAnalysis>();

beforeAll(() => {
  for (const c of CASES) {
    try {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${c.file}`), 'utf-8');
      const analysis = analyzePJC(content);
      analyses.set(c.file, analysis);
    } catch (e) {
      console.error(`Failed to parse ${c.file}:`, e);
    }
  }
}, 60000);

describe.each(CASES)('Golden PJC: $reclamante ($file)', (caseConfig) => {
  let a: PJCAnalysis;

  beforeAll(() => {
    a = analyses.get(caseConfig.file)!;
  });

  it('should parse without errors', () => {
    expect(a).toBeDefined();
    expect(a.parametros).toBeDefined();
  });

  it('should extract reclamante name', () => {
    // Some PJC files store name differently; just check it's not empty
    const name = a.parametros.beneficiario.toUpperCase();
    if (caseConfig.reclamante) {
      expect(name).toContain(caseConfig.reclamante);
    } else {
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('should have valid dates', () => {
    expect(a.parametros.admissao).toBeTruthy();
    expect(a.parametros.demissao).toBeTruthy();
    expect(a.parametros.ajuizamento).toBeTruthy();
    expect(a.parametros.inicio_calculo).toBeTruthy();
    expect(a.parametros.termino_calculo).toBeTruthy();
  });

  it('should have carga horaria', () => {
    expect(a.parametros.carga_horaria).toBeGreaterThan(0);
  });

  it('should have verbas', () => {
    expect(a.verbas.length).toBeGreaterThan(0);
  });

  it('should have resultado with liquido_exequente > 0', () => {
    expect(a.resultado.liquido_exequente).toBeGreaterThan(0);
  });

  it('should have historico salarial', () => {
    expect(a.historicos_salariais.length).toBeGreaterThan(0);
  });

  it('should have DAG with dependencies', () => {
    expect(a.dag.length).toBeGreaterThan(0);
  });

  it('should have version 2.13.2', () => {
    expect(a.parametros.versao_sistema).toBe('2.13.2');
  });
});

// ═══════════════════════════════════════════════════
// DETAILED SNAPSHOT DUMP — logs full analysis for each case
// ═══════════════════════════════════════════════════

describe('Snapshot Data Extraction', () => {
  it('should print summary for all 7 cases', () => {
    const summaries: Record<string, any> = {};

    for (const [file, a] of analyses.entries()) {
      const calculadas = a.verbas.filter(v => v.tipo === 'Calculada');
      const reflexos = a.verbas.filter(v => v.tipo === 'Reflexo');

      summaries[file] = {
        reclamante: a.parametros.beneficiario,
        reclamado: a.parametros.reclamado,
        cpf: a.parametros.cpf,
        admissao: a.parametros.admissao,
        demissao: a.parametros.demissao,
        ajuizamento: a.parametros.ajuizamento,
        inicio_calculo: a.parametros.inicio_calculo,
        termino_calculo: a.parametros.termino_calculo,
        carga_horaria: a.parametros.carga_horaria,
        sabado_dia_util: a.parametros.sabado_dia_util,
        projeta_aviso: a.parametros.projeta_aviso,
        prescricao_quinquenal: a.parametros.prescricao_quinquenal,
        zera_negativo: a.parametros.zera_negativo,
        regime: a.parametros.regime,
        indices_acumulados: a.parametros.indices_acumulados,
        dia_fechamento: a.parametros.dia_fechamento,
        versao: a.parametros.versao_sistema,

        resultado: a.resultado,

        calculadas_count: calculadas.length,
        reflexos_count: reflexos.length,

        verbas: a.verbas.map(v => ({
          nome: v.nome,
          tipo: v.tipo,
          variacao: v.variacao,
          caracteristica: v.caracteristica,
          ocorrencia_pagamento: v.ocorrencia_pagamento,
          incidencias: v.incidencias,
          formula: {
            base_tabelada: v.formula.base_tabelada,
            base_verbas: v.formula.base_verbas.map(b => `${b.nome} (int:${b.integralizar})`),
            divisor: v.formula.divisor,
            multiplicador: v.formula.multiplicador,
            quantidade: v.formula.quantidade,
            dobra: v.formula.dobra,
            valor_pago: v.formula.valor_pago,
          },
          comportamento_reflexo: v.comportamento_reflexo,
          periodo_media: v.periodo_media,
          ocorrencias_count: v.ocorrencias_count,
          total_devido: v.total_devido,
          total_pago: v.total_pago,
          total_diferenca: v.total_diferenca,
        })),

        historicos: a.historicos_salariais.map(h => ({
          nome: h.nome,
          tipo_variacao: h.tipo_variacao,
          incide_inss: h.incide_inss,
          incide_fgts: h.incide_fgts,
          count: h.ocorrencias_count,
          primeiros_3: h.competencias.slice(0, 3),
        })),

        faltas_count: a.faltas.length,
        ferias_count: a.ferias.length,
        apuracao_diaria_count: a.apuracao_diaria_count,
        atualizacao: a.atualizacao,
      };
    }

    // Print as structured JSON for analysis
    console.log('═══ GROUND TRUTH SUMMARY ═══');
    console.log(JSON.stringify(summaries, null, 2));

    expect(Object.keys(summaries).length).toBe(7);
  });
});
