// =====================================================
// CALCULADORA: FGTS (8%)
// =====================================================

import {
  Calculator,
  CalcContext,
  CalcResult,
  CalculatorInputs,
  CalculatorRules,
  AuditLine,
  Warning,
  VerbaOutput,
  arredondarMoeda,
} from '../../types';

interface FGTSRules {
  aliquota: number; // 8% padrão
  multa_rescisoria: number; // 40% ou 0%
  verbas_base: string[];
}

const DEFAULT_RULES: FGTSRules = {
  aliquota: 0.08,
  multa_rescisoria: 0.40, // 40% na dispensa sem justa causa
  verbas_base: ['horas_extras', 'reflexo_13', 'reflexo_ferias'],
};

export function createFGTSCalculator(rulesData: CalculatorRules): Calculator {
  const rules: FGTSRules = {
    ...DEFAULT_RULES,
    ...(rulesData.regras as Partial<FGTSRules>),
  };

  return {
    id: 'fgts',
    nome: 'FGTS',
    version: rulesData.versao || '1.0',

    execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult {
      const auditLines: AuditLine[] = [];
      const warnings: Warning[] = [];
      const verbas: VerbaOutput[] = [];
      let linhaAtual = 0;

      // Somar todas as verbas base
      const totalHE = (inputs.total_horas_extras as number) || 0;
      const totalReflexo13 = (inputs.total_reflexo_13 as number) || 0;
      const totalReflexoFerias = (inputs.total_reflexo_ferias as number) || 0;
      
      const baseCalculo = totalHE + totalReflexo13 + totalReflexoFerias;

      if (baseCalculo <= 0) {
        warnings.push({
          tipo: 'info',
          codigo: 'SEM_BASE_FGTS',
          mensagem: 'Não há verbas base para cálculo de FGTS',
        });
        return {
          calculadoraId: 'fgts',
          calculadoraNome: 'FGTS',
          versao: this.version,
          outputs: { total_bruto: 0, verbas: [] },
          auditLines,
          warnings,
        };
      }

      // Registrar base
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'fgts',
        descricao: 'Base de cálculo FGTS',
        formula: `HE(${totalHE.toFixed(2)}) + Refl.13º(${totalReflexo13.toFixed(2)}) + Refl.Férias(${totalReflexoFerias.toFixed(2)})`,
        valor_bruto: arredondarMoeda(baseCalculo),
        metadata: {
          horas_extras: totalHE,
          reflexo_13: totalReflexo13,
          reflexo_ferias: totalReflexoFerias,
        },
      });

      // Calcular FGTS 8%
      const fgts = baseCalculo * rules.aliquota;
      
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'fgts',
        descricao: `FGTS ${(rules.aliquota * 100).toFixed(0)}%`,
        formula: `${baseCalculo.toFixed(2)} × ${rules.aliquota}`,
        valor_bruto: arredondarMoeda(fgts),
        metadata: { aliquota: rules.aliquota },
      });

      verbas.push({
        codigo: 'FGTS_8',
        descricao: 'FGTS 8% sobre verbas deferidas',
        valor_bruto: arredondarMoeda(fgts),
      });

      // Calcular multa rescisória (se aplicável)
      let multa = 0;
      if (rules.multa_rescisoria > 0) {
        multa = fgts * rules.multa_rescisoria;
        
        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'fgts',
          descricao: `Multa rescisória ${(rules.multa_rescisoria * 100).toFixed(0)}%`,
          formula: `${fgts.toFixed(2)} × ${rules.multa_rescisoria}`,
          valor_bruto: arredondarMoeda(multa),
          metadata: { percentual_multa: rules.multa_rescisoria },
        });

        verbas.push({
          codigo: 'FGTS_MULTA_40',
          descricao: `Multa ${(rules.multa_rescisoria * 100).toFixed(0)}% FGTS`,
          valor_bruto: arredondarMoeda(multa),
        });
      }

      // Total
      const totalGeral = fgts + multa;
      
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'fgts',
        descricao: 'TOTAL FGTS + MULTA',
        formula: `${fgts.toFixed(2)} + ${multa.toFixed(2)}`,
        valor_bruto: arredondarMoeda(totalGeral),
      });

      return {
        calculadoraId: 'fgts',
        calculadoraNome: 'FGTS',
        versao: this.version,
        outputs: {
          total_bruto: arredondarMoeda(totalGeral),
          verbas,
        },
        auditLines,
        warnings,
      };
    },
  };
}
