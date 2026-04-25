// =====================================================
// CALCULADORA: HORAS EXTRAS
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
  CompetenciaOutput,
  parseFactAsNumber,
  parseFactAsDate,
  getMonthsBetween,
  formatCompetencia,
  arredondarMoeda,
} from '../../types';

interface HorasExtrasRules {
  divisor: number;
  adicional_50: number;
  adicional_100: number;
  integra_dsr: boolean;
  integra_ferias: boolean;
  integra_13: boolean;
  base_calculo: string[];
}

const DEFAULT_RULES: HorasExtrasRules = {
  divisor: 220,
  adicional_50: 1.5,
  adicional_100: 2.0,
  integra_dsr: true,
  integra_ferias: true,
  integra_13: true,
  base_calculo: ['salario_base'],
};

export function createHorasExtrasCalculator(rulesData: CalculatorRules): Calculator {
  const rules: HorasExtrasRules = {
    ...DEFAULT_RULES,
    ...(rulesData.regras as Partial<HorasExtrasRules>),
  };

  return {
    id: 'horas_extras',
    nome: 'Horas Extras',
    version: rulesData.versao || '1.0',

    execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult {
      const auditLines: AuditLine[] = [];
      const warnings: Warning[] = [];
      const verbas: VerbaOutput[] = [];
      let linhaAtual = 0;

      // Obter fatos necessários - fallback para salario_mensal se salario_base for inválido
      let salarioBase = parseFactAsNumber(ctx.facts['salario_base']);
      if (!salarioBase || salarioBase <= 0) {
        salarioBase = parseFactAsNumber(ctx.facts['salario_mensal']);
      }
      const dataAdmissao = parseFactAsDate(ctx.facts['data_admissao']);
      const dataDemissao = parseFactAsDate(ctx.facts['data_demissao']) || ctx.dataReferencia;
      
      // Média de horas extras mensais - aceita chaves legadas e atuais
      const horasMensais = parseFactAsNumber(ctx.facts['horas_extras_mensais']) || 
                          parseFactAsNumber(ctx.facts['media_horas_extras']) ||
                          parseFactAsNumber(ctx.facts['horas_extras']) ||
                          (inputs.horas_extras_mensais as number) || 0;

      // REGRA PROBATÓRIA: sem prova documental explícita, não estimar horas extras
      if (horasMensais <= 0) {
        warnings.push({
          tipo: 'atencao',
          codigo: 'HE_SEM_PROVA_DOCUMENTAL',
          mensagem: 'Horas extras não apuradas por ausência de prova documental explícita da quantidade mensal.',
          sugestao: 'Confirme o fato "horas_extras_mensais" (ou "horas_extras") com citação literal de documento de jornada/cartão de ponto.',
        });

        return {
          calculadoraId: 'horas_extras',
          calculadoraNome: 'Horas Extras',
          versao: this.version,
          outputs: { total_bruto: 0, verbas: [] },
          auditLines,
          warnings,
        };
      }

      const percentualDomingosFeriados = parseFactAsNumber(ctx.facts['percentual_domingos_feriados']) || 0.2;

      // Validações
      if (salarioBase <= 0) {
        warnings.push({
          tipo: 'erro',
          codigo: 'SALARIO_INVALIDO',
          mensagem: 'Salário base não informado ou inválido',
          campo: 'salario_base',
        });
        return {
          calculadoraId: 'horas_extras',
          calculadoraNome: 'Horas Extras',
          versao: rules.divisor.toString(),
          outputs: { total_bruto: 0, verbas: [] },
          auditLines,
          warnings,
        };
      }

      if (!dataAdmissao) {
        warnings.push({
          tipo: 'erro',
          codigo: 'DATA_ADMISSAO_INVALIDA',
          mensagem: 'Data de admissão não informada',
          campo: 'data_admissao',
        });
        return {
          calculadoraId: 'horas_extras',
          calculadoraNome: 'Horas Extras',
          versao: rules.divisor.toString(),
          outputs: { total_bruto: 0, verbas: [] },
          auditLines,
          warnings,
        };
      }

      // Calcular valor hora
      const valorHora = salarioBase / rules.divisor;
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'horas_extras',
        descricao: 'Valor da hora normal',
        formula: `${salarioBase.toFixed(2)} / ${rules.divisor}`,
        valor_bruto: arredondarMoeda(valorHora),
        metadata: { salario_base: salarioBase, divisor: rules.divisor },
      });

      // Valor hora extra 50%
      const valorHE50 = valorHora * rules.adicional_50;
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'horas_extras',
        descricao: 'Valor hora extra 50%',
        formula: `${valorHora.toFixed(2)} × ${rules.adicional_50}`,
        valor_bruto: arredondarMoeda(valorHE50),
        metadata: { adicional: rules.adicional_50 },
      });

      // Valor hora extra 100%
      const valorHE100 = valorHora * rules.adicional_100;
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'horas_extras',
        descricao: 'Valor hora extra 100%',
        formula: `${valorHora.toFixed(2)} × ${rules.adicional_100}`,
        valor_bruto: arredondarMoeda(valorHE100),
        metadata: { adicional: rules.adicional_100 },
      });

      // Calcular por competência
      const meses = getMonthsBetween(dataAdmissao, dataDemissao);
      const competencias: CompetenciaOutput[] = [];
      let totalBruto = 0;

      for (const competencia of meses) {
        // Calcular HE 50% (80% das horas)
        const horasHE50 = horasMensais * (1 - percentualDomingosFeriados);
        const valorMesHE50 = horasHE50 * valorHE50;

        // Calcular HE 100% (domingos/feriados)
        const horasHE100 = horasMensais * percentualDomingosFeriados;
        const valorMesHE100 = horasHE100 * valorHE100;

        const totalMes = valorMesHE50 + valorMesHE100;

        if (totalMes > 0) {
          auditLines.push({
            linha: ++linhaAtual,
            calculadora: 'horas_extras',
            competencia,
            descricao: `Horas extras 50% - ${horasHE50.toFixed(1)}h × R$ ${valorHE50.toFixed(2)}`,
            formula: `${horasHE50.toFixed(1)} × ${valorHE50.toFixed(2)}`,
            valor_bruto: arredondarMoeda(valorMesHE50),
          });

          if (valorMesHE100 > 0) {
            auditLines.push({
              linha: ++linhaAtual,
              calculadora: 'horas_extras',
              competencia,
              descricao: `Horas extras 100% - ${horasHE100.toFixed(1)}h × R$ ${valorHE100.toFixed(2)}`,
              formula: `${horasHE100.toFixed(1)} × ${valorHE100.toFixed(2)}`,
              valor_bruto: arredondarMoeda(valorMesHE100),
            });
          }

          competencias.push({
            competencia,
            valor_bruto: arredondarMoeda(totalMes),
            detalhes: {
              horas_50: horasHE50,
              valor_50: valorMesHE50,
              horas_100: horasHE100,
              valor_100: valorMesHE100,
            },
          });

          totalBruto += totalMes;
        }
      }

      // Calcular DSR sobre horas extras
      let totalDSR = 0;
      if (rules.integra_dsr) {
        totalDSR = totalBruto / 6; // DSR = HE / 6 (dias úteis / DSR)
        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'horas_extras',
          descricao: 'DSR sobre horas extras (total HE / 6)',
          formula: `${totalBruto.toFixed(2)} / 6`,
          valor_bruto: arredondarMoeda(totalDSR),
        });
      }

      // Adicionar verba principal
      verbas.push({
        codigo: 'HORAS_EXTRAS',
        descricao: 'Horas Extras',
        valor_bruto: arredondarMoeda(totalBruto),
        competencias,
      });

      if (totalDSR > 0) {
        verbas.push({
          codigo: 'DSR_HORAS_EXTRAS',
          descricao: 'DSR sobre Horas Extras',
          valor_bruto: arredondarMoeda(totalDSR),
        });
      }

      // Total geral
      const totalGeral = totalBruto + totalDSR;
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'horas_extras',
        descricao: 'TOTAL HORAS EXTRAS + DSR',
        formula: `${totalBruto.toFixed(2)} + ${totalDSR.toFixed(2)}`,
        valor_bruto: arredondarMoeda(totalGeral),
        metadata: { total_he: totalBruto, total_dsr: totalDSR },
      });

      // Avisos
      if (horasMensais > 60) {
        warnings.push({
          tipo: 'atencao',
          codigo: 'HORAS_ELEVADAS',
          mensagem: `Média de ${horasMensais} horas extras mensais é elevada`,
          sugestao: 'Verifique se há cartão ponto para comprovar',
        });
      }

      return {
        calculadoraId: 'horas_extras',
        calculadoraNome: 'Horas Extras',
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
