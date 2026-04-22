// =====================================================
// CALCULADORA: REFLEXOS EM 13º SALÁRIO
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
  parseFactAsNumber,
  parseFactAsDate,
  arredondarMoeda,
} from '../../types';

interface Reflexos13Rules {
  divisor_meses: number; // 12 meses
  proporcional: boolean;
  verbas_base: string[];
}

const DEFAULT_RULES: Reflexos13Rules = {
  divisor_meses: 12,
  proporcional: true,
  verbas_base: ['horas_extras', 'dsr_horas_extras'],
};

export function createReflexos13Calculator(rulesData: CalculatorRules): Calculator {
  const rules: Reflexos13Rules = {
    ...DEFAULT_RULES,
    ...(rulesData.regras as Partial<Reflexos13Rules>),
  };

  return {
    id: 'reflexos_13',
    nome: 'Reflexos em 13º Salário',
    version: rulesData.versao || '1.0',

    execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult {
      const auditLines: AuditLine[] = [];
      const warnings: Warning[] = [];
      const verbas: VerbaOutput[] = [];
      let linhaAtual = 0;

      // Obter valores das verbas base (do input, que vem de outras calculadoras)
      const totalVerbasBase = (inputs.total_horas_extras as number) || 0;
      const dataAdmissao = parseFactAsDate(ctx.facts['data_admissao']);
      const dataDemissao = parseFactAsDate(ctx.facts['data_demissao']) || ctx.dataReferencia;

      if (totalVerbasBase <= 0) {
        warnings.push({
          tipo: 'info',
          codigo: 'SEM_BASE_REFLEXO',
          mensagem: 'Não há verbas base para calcular reflexos em 13º',
        });
        return {
          calculadoraId: 'reflexos_13',
          calculadoraNome: 'Reflexos em 13º Salário',
          versao: this.version,
          outputs: { total_bruto: 0, verbas: [] },
          auditLines,
          warnings,
        };
      }

      // Calcular meses trabalhados por ano
      const anos = new Map<number, number>();
      
      if (dataAdmissao && dataDemissao) {
        const anoInicio = dataAdmissao.getFullYear();
        const anoFim = dataDemissao.getFullYear();

        for (let ano = anoInicio; ano <= anoFim; ano++) {
          const inicioAno = ano === anoInicio 
            ? dataAdmissao.getMonth() + 1 
            : 1;
          const fimAno = ano === anoFim 
            ? dataDemissao.getMonth() + 1 
            : 12;
          
          anos.set(ano, fimAno - inicioAno + 1);
        }
      }

      // Calcular média mensal das verbas base
      const totalMeses = Array.from(anos.values()).reduce((a, b) => a + b, 0) || 1;
      const mediaMensal = totalVerbasBase / totalMeses;

      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'reflexos_13',
        descricao: 'Média mensal das verbas base',
        formula: `${totalVerbasBase.toFixed(2)} / ${totalMeses} meses`,
        valor_bruto: arredondarMoeda(mediaMensal),
        metadata: { total_base: totalVerbasBase, meses: totalMeses },
      });

      // Calcular reflexo por ano
      let totalReflexo = 0;

      for (const [ano, meses] of anos) {
        const reflexoAno = rules.proporcional 
          ? (mediaMensal * meses) / rules.divisor_meses
          : mediaMensal;

        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'reflexos_13',
          competencia: `${ano}`,
          descricao: `Reflexo 13º ${ano} (${meses}/12 avos)`,
          formula: rules.proporcional 
            ? `(${mediaMensal.toFixed(2)} × ${meses}) / ${rules.divisor_meses}`
            : `${mediaMensal.toFixed(2)}`,
          valor_bruto: arredondarMoeda(reflexoAno),
          metadata: { ano, meses_trabalhados: meses },
        });

        totalReflexo += reflexoAno;
      }

      // Adicionar verba
      verbas.push({
        codigo: 'REFLEXO_13',
        descricao: 'Reflexo de Horas Extras em 13º Salário',
        valor_bruto: arredondarMoeda(totalReflexo),
      });

      // Total
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'reflexos_13',
        descricao: 'TOTAL REFLEXOS EM 13º SALÁRIO',
        valor_bruto: arredondarMoeda(totalReflexo),
      });

      return {
        calculadoraId: 'reflexos_13',
        calculadoraNome: 'Reflexos em 13º Salário',
        versao: this.version,
        outputs: {
          total_bruto: arredondarMoeda(totalReflexo),
          verbas,
        },
        auditLines,
        warnings,
      };
    },
  };
}
