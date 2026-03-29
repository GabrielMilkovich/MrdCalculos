// =====================================================
// PRECATÓRIO vs RPV — Classificação para Fazenda Pública
// =====================================================
// Art. 100 CF/88 e Art. 87 ADCT
// RPV: valores até 60 salários mínimos (Fazenda Federal)
//      ou até 40 salários mínimos (Estados/Municípios, se não houver lei própria)
// Precatório: valores acima do teto RPV

import type { PjeResumo } from './engine-types';

export type ClassificacaoFazenda = 'rpv' | 'precatorio';
export type EsferaFazenda = 'federal' | 'estadual' | 'municipal';

export interface PrecatorioRPVResult {
  classificacao: ClassificacaoFazenda;
  esfera: EsferaFazenda;
  valor_total: number;
  teto_rpv: number;
  salario_minimo_referencia: number;
  multiplicador_sm: number;
  fundamentacao: string;
}

/**
 * Classify a liquidação result as RPV or Precatório.
 *
 * @param resumo - The calculation summary
 * @param esfera - Government level (federal, estadual, municipal)
 * @param salarioMinimo - Current minimum wage (defaults to 2024 value)
 * @param multiplicadorCustom - Custom SM multiplier (some states define different limits)
 */
export function classificarPrecatorioRPV(
  resumo: PjeResumo,
  esfera: EsferaFazenda = 'federal',
  salarioMinimo: number = 1412.00,
  multiplicadorCustom?: number,
): PrecatorioRPVResult {
  // Default multipliers per esfera
  const multiplicadores: Record<EsferaFazenda, number> = {
    federal: 60,    // Art. 87 ADCT — Fazenda Federal
    estadual: 40,   // Default para Estados sem lei própria (Art. 87 §1º ADCT)
    municipal: 30,  // Default para Municípios sem lei própria
  };

  const multiplicador = multiplicadorCustom ?? multiplicadores[esfera];
  const tetoRPV = salarioMinimo * multiplicador;

  // Use total_reclamada as the base (includes all amounts the public entity must pay)
  const valorTotal = resumo.total_reclamada;
  const classificacao: ClassificacaoFazenda = valorTotal <= tetoRPV ? 'rpv' : 'precatorio';

  const fundamentacao = classificacao === 'rpv'
    ? `RPV (Requisição de Pequeno Valor) — Art. 100, §3º CF/88. Valor de R$ ${valorTotal.toFixed(2)} não excede ${multiplicador} salários mínimos (R$ ${tetoRPV.toFixed(2)}).`
    : `Precatório — Art. 100 CF/88. Valor de R$ ${valorTotal.toFixed(2)} excede o teto RPV de ${multiplicador} salários mínimos (R$ ${tetoRPV.toFixed(2)}).`;

  return {
    classificacao,
    esfera,
    valor_total: valorTotal,
    teto_rpv: tetoRPV,
    salario_minimo_referencia: salarioMinimo,
    multiplicador_sm: multiplicador,
    fundamentacao,
  };
}
