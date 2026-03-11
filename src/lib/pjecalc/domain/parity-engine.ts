/**
 * =====================================================
 * PARITY ENGINE — Comparison between Engine results and PJC Ground Truth
 * =====================================================
 * Compares calculation results against PJe-Calc ground truth from ApuracaoDeJuros
 * and resultado section, producing a structured parity report.
 */

import type { PjeLiquidacaoResult } from '../engine-types';
import type { PJCAnalysis, ApuracaoJurosEntry } from '../pjc-analyzer';
import type { ParityReport, ParityReportEntry } from './fidelity-report';

// =====================================================
// TOLERANCE POLICY
// =====================================================

export const DEFAULT_TOLERANCE = {
  /** Maximum absolute monetary difference in R$ */
  monetaria_absoluta: 0.02,
  /** Maximum percentage difference */
  percentual_maximo: 0.5,
  /** Justification */
  justificativa: 'Tolerância mínima para diferenças de arredondamento entre truncamento (engine) e arredondamento bancário (PJe-Calc). Diferenças > R$ 0.02 por competência ou > 0.5% indicam divergência estrutural.',
};

// =====================================================
// MAIN COMPARISON
// =====================================================

export function gerarRelatorioParidade(
  engineResult: PjeLiquidacaoResult,
  pjcAnalysis: PJCAnalysis,
  engineVersion: string = '3.1.0',
): ParityReport {
  const now = new Date().toISOString();
  
  // Summary totals comparison
  const totais = {
    principal_bruto: compareTotals(
      engineResult.resumo.principal_bruto,
      sumVerbasDiferenca(pjcAnalysis),
    ),
    liquido_exequente: compareTotals(
      engineResult.resumo.liquido_reclamante,
      pjcAnalysis.resultado.liquido_exequente,
    ),
    inss_reclamante: compareTotals(
      engineResult.resumo.cs_segurado,
      pjcAnalysis.resultado.inss_reclamante,
    ),
    inss_reclamado: compareTotals(
      engineResult.resumo.cs_empregador,
      pjcAnalysis.resultado.inss_reclamado,
    ),
    imposto_renda: compareTotals(
      engineResult.resumo.ir_retido,
      pjcAnalysis.resultado.imposto_renda,
    ),
    fgts: compareTotals(
      engineResult.resumo.fgts_total,
      pjcAnalysis.resultado.fgts_deposito,
    ),
    honorarios: compareTotals(
      engineResult.resumo.honorarios_sucumbenciais + engineResult.resumo.honorarios_contratuais,
      pjcAnalysis.resultado.honorarios.reduce((s, h) => s + h.valor, 0),
    ),
    custas: compareTotals(
      engineResult.resumo.custas,
      pjcAnalysis.resultado.custas,
    ),
  };

  // Per-competência comparison from ApuracaoDeJuros
  const por_competencia: ParityReportEntry[] = [];
  const divergencias: ParityReportEntry[] = [];

  if (pjcAnalysis.apuracao_juros) {
    for (const gt of pjcAnalysis.apuracao_juros) {
      // Find engine's corrected values for this competência
      const engineComp = findEngineCompetencia(engineResult, gt.competencia);
      
      const entries = [
        makeEntry(gt.competencia, 'valor_corrigido', engineComp.valor_corrigido, gt.valor_corrigido),
        makeEntry(gt.competencia, 'cs_base_normal', engineComp.cs_base_normal, gt.cs_base_normal),
        makeEntry(gt.competencia, 'cs_base_13', engineComp.cs_base_13, gt.cs_base_13),
        makeEntry(gt.competencia, 'ir_base_demais', engineComp.ir_base_demais, gt.ir_base_demais),
        makeEntry(gt.competencia, 'ir_base_13', engineComp.ir_base_13, gt.ir_base_13),
        makeEntry(gt.competencia, 'taxa_juros', engineComp.taxa_juros, gt.taxa_juros),
      ];

      for (const entry of entries) {
        por_competencia.push(entry);
        if (!entry.tolerancia_ok) {
          divergencias.push(entry);
        }
      }
    }
  }

  // Calculate overall parity score (0-100)
  const totalFields = Object.values(totais).length;
  const fieldScores = Object.values(totais).map(t => {
    if (t.pjc === 0 && t.engine === 0) return 100;
    if (t.pjc === 0) return t.engine === 0 ? 100 : 0;
    return Math.max(0, 100 - Math.abs(t.delta_pct));
  });
  const score = Math.round(fieldScores.reduce((s, v) => s + v, 0) / totalFields);

  return {
    caso: pjcAnalysis.parametros.beneficiario,
    engine_version: engineVersion,
    pjc_version: pjcAnalysis.parametros.versao_sistema || 'unknown',
    data_comparacao: now,
    totais,
    por_competencia,
    score,
    divergencias,
    tolerancia: DEFAULT_TOLERANCE,
  };
}

// =====================================================
// HELPERS
// =====================================================

function compareTotals(engine: number, pjc: number): { engine: number; pjc: number; delta: number; delta_pct: number } {
  const delta = engine - pjc;
  const delta_pct = pjc !== 0 ? (delta / pjc) * 100 : (engine !== 0 ? 100 : 0);
  return { engine, pjc, delta, delta_pct: Math.round(delta_pct * 100) / 100 };
}

function makeEntry(
  competencia: string,
  campo: string,
  engine: number,
  pjc: number,
): ParityReportEntry {
  const diferenca_absoluta = Math.abs(engine - pjc);
  const diferenca_percentual = pjc !== 0 ? Math.abs((engine - pjc) / pjc) * 100 : (engine !== 0 ? 100 : 0);
  const tolerancia_ok = diferenca_absoluta <= DEFAULT_TOLERANCE.monetaria_absoluta
    && diferenca_percentual <= DEFAULT_TOLERANCE.percentual_maximo;

  return {
    competencia,
    campo,
    valor_engine: engine,
    valor_pjc: pjc,
    diferenca_absoluta: Math.round(diferenca_absoluta * 100) / 100,
    diferenca_percentual: Math.round(diferenca_percentual * 100) / 100,
    tolerancia_ok,
  };
}

function sumVerbasDiferenca(analysis: PJCAnalysis): number {
  return analysis.verbas
    .filter(v => v.compor_principal !== 'NAO_COMPOR')
    .reduce((s, v) => s + (v.total_diferenca ?? 0), 0);
}

interface EngineCompetenciaValues {
  valor_corrigido: number;
  cs_base_normal: number;
  cs_base_13: number;
  ir_base_demais: number;
  ir_base_13: number;
  taxa_juros: number;
}

function findEngineCompetencia(result: PjeLiquidacaoResult, competencia: string): EngineCompetenciaValues {
  const comp = competencia.slice(0, 7);
  
  let valor_corrigido = 0;
  let cs_base_normal = 0;
  let cs_base_13 = 0;
  let ir_base_demais = 0;
  let ir_base_13 = 0;
  
  // Sum corrected values from verbas for this competência
  for (const verba of result.verbas) {
    for (const oc of verba.ocorrencias) {
      if (oc.competencia.slice(0, 7) === comp) {
        valor_corrigido += oc.valor_corrigido;
        
        // CS base segregation by caracteristica
        if (verba.caracteristica === '13_salario') {
          cs_base_13 += oc.valor_corrigido;
          ir_base_13 += oc.valor_final;
        } else {
          cs_base_normal += oc.valor_corrigido;
          ir_base_demais += oc.valor_final;
        }
      }
    }
  }

  // Find interest rate (simplified — would need correction-by-date for precision)
  const taxa_juros = 0; // Engine doesn't expose per-comp rate separately yet

  return { valor_corrigido, cs_base_normal, cs_base_13, ir_base_demais, ir_base_13, taxa_juros };
}
