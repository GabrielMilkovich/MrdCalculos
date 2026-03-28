/**
 * =====================================================
 * TABLE VALIDATOR — Pre-calculation validation of essential tables
 * =====================================================
 * Blocks calculation when essential historical tables are missing
 * for the required competência range.
 */

import type { PjeIndiceRow, PjeINSSFaixaRow, PjeIRFaixaRow } from '../engine-types';
import type { CalculationBlockError, CalculationWarning } from './fidelity-report';

export interface TableValidationInput {
  /** Competência range start (YYYY-MM) */
  competencia_inicio: string;
  /** Competência range end (YYYY-MM) */
  competencia_fim: string;
  /** Correction index type needed (e.g. 'IPCA-E', 'SELIC') */
  indice_correcao: string;
  /** Available correction indices */
  indicesDB: PjeIndiceRow[];
  /** Available INSS brackets */
  faixasINSSDB: PjeINSSFaixaRow[];
  /** Available IR brackets */
  faixasIRDB: PjeIRFaixaRow[];
  /** Whether CS is being calculated */
  apurar_cs: boolean;
  /** Whether IR is being calculated */
  apurar_ir: boolean;
  /** Whether FGTS is being calculated */
  apurar_fgts: boolean;
  /** Data de liquidação */
  data_liquidacao: string;
  /** Whether using pre-computed (PJC ground truth) mode — relaxes some checks */
  modo_precomputado: boolean;
  /** Combination indices (for COMBINACAO mode, e.g. ADC 58/59) */
  combinacoes_indice?: Array<{ indice: string }>;
}

export interface TableValidationResult {
  /** Whether calculation can proceed */
  can_proceed: boolean;
  /** Blocking errors that prevent calculation */
  errors: CalculationBlockError[];
  /** Non-blocking warnings */
  warnings: CalculationWarning[];
  /** Coverage summary */
  coverage: {
    indices_coverage: number; // 0-100%
    inss_coverage: number;
    ir_coverage: number;
    competencias_total: number;
    competencias_cobertas_indices: number;
    competencias_cobertas_inss: number;
    competencias_cobertas_ir: number;
  };
}

export function validarTabelasHistoricas(input: TableValidationInput): TableValidationResult {
  const errors: CalculationBlockError[] = [];
  const warnings: CalculationWarning[] = [];
  
  // Generate list of competências in range
  const competencias = gerarCompetencias(input.competencia_inicio, input.competencia_fim);
  const total = competencias.length;
  
  if (total === 0) {
    errors.push({
      type: 'structural_error',
      code: 'E000',
      message: 'Período de cálculo inválido ou vazio.',
      message_friendly: 'O período de cálculo não contém nenhuma competência válida.',
      severity: 'critical',
      acao_recomendada: 'Verifique as datas de início e fim do cálculo.',
    });
    return { can_proceed: false, errors, warnings, coverage: emptyCoverage() };
  }

  // 1. Validate correction indices
  let cobertasIndices = 0;
  const compsSemIndice: string[] = [];

  if (!input.modo_precomputado) {
    const indicesSet = new Set(
      input.indicesDB
        .filter(i => i.indice === input.indice_correcao || input.indice_correcao === 'COMBINACAO')
        .map(i => i.competencia.slice(0, 7))
    );
    
    for (const comp of competencias) {
      if (indicesSet.has(comp)) {
        cobertasIndices++;
      } else {
        compsSemIndice.push(comp);
      }
    }

    if (cobertasIndices === 0 && input.indicesDB.length === 0) {
      // No indices at all — this is critical unless in precomputed mode
      warnings.push({
        type: 'fallback_used',
        code: 'W010',
        message: `Nenhum índice de correção '${input.indice_correcao}' encontrado no banco. Motor usará índices pré-computados do PJC se disponíveis.`,
        message_friendly: 'Tabelas de correção monetária não encontradas. O sistema tentará usar os índices do arquivo importado.',
        severity: 'warning',
        module: 'correcao_monetaria',
      });
    } else if (compsSemIndice.length > 0 && compsSemIndice.length <= 6) {
      warnings.push({
        type: 'data_approximated',
        code: 'W011',
        message: `${compsSemIndice.length} competências sem índice '${input.indice_correcao}': ${compsSemIndice.join(', ')}`,
        message_friendly: `${compsSemIndice.length} meses sem tabela de correção. Valores aproximados podem ser usados.`,
        severity: 'warning',
        module: 'correcao_monetaria',
      });
    } else if (compsSemIndice.length > 6) {
      errors.push({
        type: 'table_missing',
        code: 'E001',
        message: `${compsSemIndice.length} de ${total} competências sem índice de correção '${input.indice_correcao}'.`,
        message_friendly: `Tabela de correção monetária incompleta. ${compsSemIndice.length} meses sem dados.`,
        severity: 'error',
        tabela_ausente: `pjecalc_correcao_monetaria (${input.indice_correcao})`,
        competencias_afetadas: compsSemIndice.slice(0, 10),
        acao_recomendada: 'Importe as séries históricas de índices na tela de administração.',
      });
    }
  } else {
    cobertasIndices = total; // precomputed mode doesn't need indices
  }

  // 2. Validate INSS brackets
  let cobertasINSS = 0;
  if (input.apurar_cs) {
    const inssComps = new Set<string>();
    for (const faixa of input.faixasINSSDB) {
      const start = faixa.competencia_inicio.slice(0, 7);
      const end = faixa.competencia_fim?.slice(0, 7) || '9999-12';
      for (const comp of competencias) {
        if (comp >= start && comp <= end) {
          inssComps.add(comp);
        }
      }
    }
    cobertasINSS = inssComps.size;

    if (cobertasINSS === 0 && input.faixasINSSDB.length === 0) {
      warnings.push({
        type: 'fallback_used',
        code: 'W012',
        message: 'Nenhuma faixa de INSS encontrada no banco. Usando tabela padrão 2025.',
        message_friendly: 'Tabelas de INSS não encontradas. Usando valores padrão de 2025.',
        severity: 'warning',
        module: 'contribuicao_social',
      });
      cobertasINSS = total; // default table covers all
    }
  } else {
    cobertasINSS = total;
  }

  // 3. Validate IR brackets
  let cobertasIR = 0;
  if (input.apurar_ir) {
    const irComps = new Set<string>();
    for (const faixa of input.faixasIRDB) {
      const start = faixa.competencia_inicio.slice(0, 7);
      const end = faixa.competencia_fim?.slice(0, 7) || '9999-12';
      for (const comp of competencias) {
        if (comp >= start && comp <= end) {
          irComps.add(comp);
        }
      }
    }
    cobertasIR = irComps.size;

    if (cobertasIR === 0 && input.faixasIRDB.length === 0) {
      warnings.push({
        type: 'fallback_used',
        code: 'W013',
        message: 'Nenhuma faixa de IR encontrada no banco. Usando tabela padrão 2025.',
        message_friendly: 'Tabelas de Imposto de Renda não encontradas. Usando valores padrão de 2025.',
        severity: 'warning',
        module: 'imposto_renda',
      });
      cobertasIR = total; // default table covers all
    }
  } else {
    cobertasIR = total;
  }

  // 4. Validate data_liquidacao
  if (!input.data_liquidacao) {
    errors.push({
      type: 'param_missing',
      code: 'E002',
      message: 'Data de liquidação não informada. Cálculo não é determinístico.',
      message_friendly: 'A data de liquidação é obrigatória para garantir resultado auditável.',
      severity: 'critical',
      acao_recomendada: 'Informe a data de liquidação nos parâmetros do cálculo.',
    });
  }

  if (!input.modo_precomputado) {
    // 5. P0-3: Check for recent-months gap — indices missing between last available and data_liquidacao
    const indicesNeeded: string[] = [];
    if (input.indice_correcao && input.indice_correcao !== 'COMBINACAO') {
      indicesNeeded.push(input.indice_correcao);
    }
    // For COMBINACAO (ADC 58/59) check both IPCA-E and SELIC
    if (input.indice_correcao === 'COMBINACAO' || input.combinacoes_indice?.length) {
      const combIndices = input.combinacoes_indice?.map(c => c.indice) ?? ['IPCA-E', 'SELIC'];
      for (const ci of combIndices) {
        if (!indicesNeeded.includes(ci)) indicesNeeded.push(ci);
      }
    }

    const liqComp = input.data_liquidacao?.slice(0, 7);
    for (const indiceNecessario of indicesNeeded) {
      const ultimaComp = input.indicesDB
        .filter(r => r.indice === indiceNecessario)
        .map(r => r.competencia.slice(0, 7))
        .sort()
        .at(-1);

      if (ultimaComp && liqComp && ultimaComp < liqComp) {
        const mesesGap = mesesEntre(ultimaComp, liqComp);
        if (mesesGap > 3) {
          errors.push({
            type: 'table_missing',
            code: 'E003',
            message: `P0-3: Índice '${indiceNecessario}' só disponível até ${ultimaComp} — faltam ${mesesGap} meses até data de liquidação (${liqComp}). Execute sync-pjecalc-indices para atualizar.`,
            message_friendly: `Índice de correção '${indiceNecessario}' desatualizado: última competência ${ultimaComp}, liquidação em ${liqComp}.`,
            severity: 'critical',
            tabela_ausente: `pjecalc_correcao_monetaria (${indiceNecessario})`,
            competencias_afetadas: gerarCompetencias(nextComp(ultimaComp), liqComp),
            acao_recomendada: `Acione a função sync-pjecalc-indices ou adicione manualmente os dados de ${indiceNecessario} de ${nextComp(ultimaComp)} a ${liqComp}.`,
          });
        } else if (mesesGap > 0) {
          warnings.push({
            type: 'data_approximated',
            code: 'W015',
            message: `P0-3: Índice '${indiceNecessario}' só disponível até ${ultimaComp} (${mesesGap} mês(es) desatualizados). Acione sync-pjecalc-indices para buscar dados recentes.`,
            message_friendly: `Índice '${indiceNecessario}' pode estar desatualizado. Última competência: ${ultimaComp}.`,
            severity: 'warning',
            module: 'correcao_monetaria',
          });
        }
      }
    }

    // 6. P0-3: TR_FGTS coverage check
    if (input.apurar_fgts) {
      const trFgtsSet = new Set(
        input.indicesDB
          .filter(r => r.indice === 'TR_FGTS' || r.indice === 'TR')
          .map(r => r.competencia.slice(0, 7))
      );
      const compsSemTR = competencias.filter(c => !trFgtsSet.has(c));
      if (compsSemTR.length > 6) {
        errors.push({
          type: 'table_missing',
          code: 'E004',
          message: `TR/TR_FGTS ausente para ${compsSemTR.length} competências — FGTS calculado com fallback 3%a.a.`,
          message_friendly: `Tabela TR_FGTS incompleta. ${compsSemTR.length} meses sem dados de TR para FGTS.`,
          severity: 'error',
          tabela_ausente: 'pjecalc_correcao_monetaria (TR_FGTS)',
          competencias_afetadas: compsSemTR.slice(0, 10),
          acao_recomendada: 'Acione sync-pjecalc-indices para sincronizar série TR (BCB 226).',
        });
      } else if (compsSemTR.length > 0) {
        warnings.push({
          type: 'fallback_used',
          code: 'W016',
          message: `TR/TR_FGTS ausente para ${compsSemTR.length} competências de FGTS — fallback 3%a.a. será usado.`,
          message_friendly: `${compsSemTR.length} meses sem TR para FGTS. Resultado pode diferir levemente.`,
          severity: 'warning',
          module: 'fgts',
        });
      }
    }
  }

  const can_proceed = errors.filter(e => e.severity === 'critical').length === 0;

  return {
    can_proceed,
    errors,
    warnings,
    coverage: {
      indices_coverage: total > 0 ? Math.round((cobertasIndices / total) * 100) : 0,
      inss_coverage: total > 0 ? Math.round((cobertasINSS / total) * 100) : 0,
      ir_coverage: total > 0 ? Math.round((cobertasIR / total) * 100) : 0,
      competencias_total: total,
      competencias_cobertas_indices: cobertasIndices,
      competencias_cobertas_inss: cobertasINSS,
      competencias_cobertas_ir: cobertasIR,
    },
  };
}

// =====================================================
// HELPERS
// =====================================================

function mesesEntre(compA: string, compB: string): number {
  const [ya, ma] = compA.split('-').map(Number);
  const [yb, mb] = compB.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

function nextComp(comp: string): string {
  const [y, m] = comp.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function gerarCompetencias(inicio: string, fim: string): string[] {
  const comps: string[] = [];
  if (!inicio || !fim) return comps;
  
  const startComp = inicio.slice(0, 7);
  const endComp = fim.slice(0, 7);
  
  let [year, month] = startComp.split('-').map(Number);
  const [endYear, endMonth] = endComp.split('-').map(Number);
  
  while (year < endYear || (year === endYear && month <= endMonth)) {
    comps.push(`${year}-${String(month).padStart(2, '0')}`);
    month++;
    if (month > 12) { month = 1; year++; }
    if (comps.length > 600) break; // safety limit: 50 years
  }
  
  return comps;
}

function emptyCoverage(): TableValidationResult['coverage'] {
  return {
    indices_coverage: 0,
    inss_coverage: 0,
    ir_coverage: 0,
    competencias_total: 0,
    competencias_cobertas_indices: 0,
    competencias_cobertas_inss: 0,
    competencias_cobertas_ir: 0,
  };
}
