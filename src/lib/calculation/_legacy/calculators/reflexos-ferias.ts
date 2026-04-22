// =====================================================
// CALCULADORA: REFLEXOS EM FÉRIAS
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
  parseFactAsDate,
  arredondarMoeda,
} from '../../types';

interface ReflexosFeriasRules {
  adicional_constitucional: number; // 1/3
  proporcional: boolean;
  verbas_base: string[];
}

const DEFAULT_RULES: ReflexosFeriasRules = {
  adicional_constitucional: 1 / 3,
  proporcional: true,
  verbas_base: ['horas_extras', 'dsr_horas_extras'],
};

export function createReflexosFeriasCalculator(rulesData: CalculatorRules): Calculator {
  const rules: ReflexosFeriasRules = {
    ...DEFAULT_RULES,
    ...(rulesData.regras as Partial<ReflexosFeriasRules>),
  };

  return {
    id: 'reflexos_ferias',
    nome: 'Reflexos em Férias',
    version: rulesData.versao || '1.0',

    execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult {
      const auditLines: AuditLine[] = [];
      const warnings: Warning[] = [];
      const verbas: VerbaOutput[] = [];
      let linhaAtual = 0;

      // Obter valores das verbas base
      const totalVerbasBase = (inputs.total_horas_extras as number) || 0;
      const dataAdmissao = parseFactAsDate(ctx.facts['data_admissao']);
      const dataDemissao = parseFactAsDate(ctx.facts['data_demissao']) || ctx.dataReferencia;

      if (totalVerbasBase <= 0) {
        warnings.push({
          tipo: 'info',
          codigo: 'SEM_BASE_REFLEXO',
          mensagem: 'Não há verbas base para calcular reflexos em férias',
        });
        return {
          calculadoraId: 'reflexos_ferias',
          calculadoraNome: 'Reflexos em Férias',
          versao: this.version,
          outputs: { total_bruto: 0, verbas: [] },
          auditLines,
          warnings,
        };
      }

      // Calcular períodos aquisitivos
      const periodosAquisitivos: { inicio: Date; fim: Date; meses: number }[] = [];
      
      if (dataAdmissao && dataDemissao) {
        let periodoInicio = new Date(dataAdmissao);
        
        while (periodoInicio < dataDemissao) {
          const periodoFim = new Date(periodoInicio);
          periodoFim.setFullYear(periodoFim.getFullYear() + 1);
          
          if (periodoFim > dataDemissao) {
            const meses = Math.ceil(
              (dataDemissao.getTime() - periodoInicio.getTime()) / (30 * 24 * 60 * 60 * 1000)
            );
            periodosAquisitivos.push({ inicio: periodoInicio, fim: dataDemissao, meses });
          } else {
            periodosAquisitivos.push({ inicio: periodoInicio, fim: periodoFim, meses: 12 });
          }
          
          periodoInicio = periodoFim;
        }
      }

      // Calcular média mensal das verbas base
      const totalMeses = periodosAquisitivos.reduce((sum, p) => sum + p.meses, 0) || 1;
      const mediaMensal = totalVerbasBase / totalMeses;

      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'reflexos_ferias',
        descricao: 'Média mensal das verbas base',
        formula: `${totalVerbasBase.toFixed(2)} / ${totalMeses} meses`,
        valor_bruto: arredondarMoeda(mediaMensal),
        metadata: { total_base: totalVerbasBase, meses: totalMeses },
      });

      // Calcular reflexo por período aquisitivo
      let totalReflexoFerias = 0;
      let totalTerco = 0;

      for (let i = 0; i < periodosAquisitivos.length; i++) {
        const periodo = periodosAquisitivos[i];
        const avos = rules.proporcional && periodo.meses < 12 ? periodo.meses : 12;
        
        // Reflexo base (férias)
        const reflexoBase = (mediaMensal * avos) / 12;
        
        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'reflexos_ferias',
          competencia: `Período ${i + 1}`,
          descricao: `Férias período ${i + 1} (${avos}/12 avos)`,
          formula: `(${mediaMensal.toFixed(2)} × ${avos}) / 12`,
          valor_bruto: arredondarMoeda(reflexoBase),
          metadata: { 
            periodo_inicio: periodo.inicio.toISOString().split('T')[0],
            periodo_fim: periodo.fim.toISOString().split('T')[0],
            avos,
          },
        });

        // 1/3 constitucional
        const terco = reflexoBase * rules.adicional_constitucional;
        
        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'reflexos_ferias',
          competencia: `Período ${i + 1}`,
          descricao: `1/3 constitucional período ${i + 1}`,
          formula: `${reflexoBase.toFixed(2)} × 1/3`,
          valor_bruto: arredondarMoeda(terco),
        });

        totalReflexoFerias += reflexoBase;
        totalTerco += terco;
      }

      // Adicionar verbas
      verbas.push({
        codigo: 'REFLEXO_FERIAS',
        descricao: 'Reflexo de Horas Extras em Férias',
        valor_bruto: arredondarMoeda(totalReflexoFerias),
      });

      verbas.push({
        codigo: 'REFLEXO_FERIAS_TERCO',
        descricao: '1/3 Constitucional sobre Reflexo em Férias',
        valor_bruto: arredondarMoeda(totalTerco),
      });

      // Total
      const totalGeral = totalReflexoFerias + totalTerco;
      
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'reflexos_ferias',
        descricao: 'TOTAL REFLEXOS EM FÉRIAS + 1/3',
        formula: `${totalReflexoFerias.toFixed(2)} + ${totalTerco.toFixed(2)}`,
        valor_bruto: arredondarMoeda(totalGeral),
        metadata: { reflexo: totalReflexoFerias, terco: totalTerco },
      });

      return {
        calculadoraId: 'reflexos_ferias',
        calculadoraNome: 'Reflexos em Férias',
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
