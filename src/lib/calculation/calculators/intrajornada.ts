// =====================================================
// CALCULADORA: INTERVALO INTRAJORNADA (Art. 71 CLT)
// =====================================================
//
// Art. 71 da CLT: Jornadas >6h exigem intervalo mínimo de 1h para
// repouso/alimentação. A supressão total ou parcial do intervalo
// gera pagamento do período suprimido como hora extra + 50%.
//
// Súmula 437 TST: A não concessão ou redução do intervalo
// intrajornada implica o pagamento TOTAL do período correspondente,
// com acréscimo de no mínimo 50%, com natureza salarial.
//
// Pós-Reforma (Lei 13.467/2017, art. 71, §4º): Para contratos
// pós 11/11/2017, paga-se apenas o período efetivamente suprimido,
// com natureza indenizatória.

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
  arredondarMoeda,
} from '../types';

interface IntrajornadaRules {
  divisor: number;
  adicional: number; // 1.5 = hora normal + 50%
  intervalo_minimo_minutos: number; // 60 min para jornada > 6h
  natureza: 'salarial' | 'indenizatoria'; // pré ou pós reforma
  integra_dsr: boolean;
  integra_ferias: boolean;
  integra_13: boolean;
  integra_fgts: boolean;
}

const DEFAULT_RULES: IntrajornadaRules = {
  divisor: 220,
  adicional: 1.5,
  intervalo_minimo_minutos: 60,
  natureza: 'salarial', // padrão pré-reforma (Súmula 437)
  integra_dsr: true,
  integra_ferias: true,
  integra_13: true,
  integra_fgts: true,
};

export function createIntrajornadaCalculator(rulesData: CalculatorRules): Calculator {
  const rules: IntrajornadaRules = {
    ...DEFAULT_RULES,
    ...(rulesData.regras as Partial<IntrajornadaRules>),
  };

  return {
    id: 'intrajornada',
    nome: 'Intervalo Intrajornada',
    version: rulesData.versao || '1.0',

    execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult {
      const auditLines: AuditLine[] = [];
      const warnings: Warning[] = [];
      const verbas: VerbaOutput[] = [];
      let linhaAtual = 0;

      // Obter fatos necessários
      let salarioBase = parseFactAsNumber(ctx.facts['salario_base']);
      if (!salarioBase || salarioBase <= 0) {
        salarioBase = parseFactAsNumber(ctx.facts['salario_mensal']);
      }
      const dataAdmissao = parseFactAsDate(ctx.facts['data_admissao']);
      const dataDemissao = parseFactAsDate(ctx.facts['data_demissao']) || ctx.dataReferencia;

      // Minutos suprimidos por dia (média)
      const minutosConcedidos = parseFactAsNumber(ctx.facts['intervalo_intrajornada_concedido']) ??
                                 parseFactAsNumber(ctx.facts['minutos_intervalo_concedido']) ??
                                 (inputs.minutos_intervalo_concedido as number) ?? 0;

      const minutosSuprimidos = rules.intervalo_minimo_minutos - minutosConcedidos;

      // Quantidade de dias com supressão por mês
      const diasSupressaoPorMes = parseFactAsNumber(ctx.facts['dias_supressao_intrajornada']) ??
                                   parseFactAsNumber(ctx.facts['dias_intrajornada_suprimido']) ??
                                   (inputs.dias_supressao_intrajornada as number) ?? 0;

      // Validações
      if (salarioBase <= 0) {
        warnings.push({
          tipo: 'erro',
          codigo: 'SALARIO_INVALIDO',
          mensagem: 'Salário base não informado ou inválido',
          campo: 'salario_base',
        });
        return emptyResult(this.version, auditLines, warnings);
      }

      if (!dataAdmissao) {
        warnings.push({
          tipo: 'erro',
          codigo: 'DATA_ADMISSAO_INVALIDA',
          mensagem: 'Data de admissão não informada',
          campo: 'data_admissao',
        });
        return emptyResult(this.version, auditLines, warnings);
      }

      if (minutosSuprimidos <= 0) {
        warnings.push({
          tipo: 'info',
          codigo: 'SEM_SUPRESSAO_INTRAJORNADA',
          mensagem: 'Intervalo intrajornada não foi suprimido (concedido >= mínimo legal)',
        });
        return emptyResult(this.version, auditLines, warnings);
      }

      if (diasSupressaoPorMes <= 0) {
        warnings.push({
          tipo: 'atencao',
          codigo: 'INTRAJORNADA_SEM_PROVA',
          mensagem: 'Não há quantidade de dias com supressão de intrajornada informada.',
          sugestao: 'Informe "dias_supressao_intrajornada" com base em prova documental.',
        });
        return emptyResult(this.version, auditLines, warnings);
      }

      // Calcular valor hora
      const valorHora = salarioBase / rules.divisor;
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'intrajornada',
        descricao: 'Valor da hora normal',
        formula: `${salarioBase.toFixed(2)} / ${rules.divisor}`,
        valor_bruto: arredondarMoeda(valorHora),
        metadata: { salario_base: salarioBase, divisor: rules.divisor },
      });

      // Horas suprimidas por dia
      const horasSuprimidasDia = minutosSuprimidos / 60;

      // Para natureza salarial (Súmula 437, pré-reforma):
      // paga-se o período INTEGRAL do intervalo com adicional de 50%
      // Para natureza indenizatória (pós-reforma):
      // paga-se apenas o período suprimido com adicional de 50%
      const horasDevidasDia = rules.natureza === 'salarial'
        ? rules.intervalo_minimo_minutos / 60 // Período integral (1h)
        : horasSuprimidasDia; // Apenas suprimido

      const valorHoraIntrajornada = valorHora * rules.adicional;

      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'intrajornada',
        descricao: `Valor hora intrajornada (${(rules.adicional * 100 - 100).toFixed(0)}% adicional)`,
        formula: `${valorHora.toFixed(4)} × ${rules.adicional}`,
        valor_bruto: arredondarMoeda(valorHoraIntrajornada),
        metadata: {
          adicional: rules.adicional,
          natureza: rules.natureza,
          minutos_suprimidos: minutosSuprimidos,
          horas_devidas_dia: horasDevidasDia,
        },
      });

      // Calcular por competência
      const meses = getMonthsBetween(dataAdmissao, dataDemissao);
      const competencias: CompetenciaOutput[] = [];
      let totalBruto = 0;

      for (const competencia of meses) {
        const valorMes = horasDevidasDia * valorHoraIntrajornada * diasSupressaoPorMes;

        if (valorMes > 0) {
          auditLines.push({
            linha: ++linhaAtual,
            calculadora: 'intrajornada',
            competencia,
            descricao: `Intrajornada: ${horasDevidasDia.toFixed(2)}h × R$ ${valorHoraIntrajornada.toFixed(2)} × ${diasSupressaoPorMes} dias`,
            formula: `${horasDevidasDia.toFixed(2)} × ${valorHoraIntrajornada.toFixed(2)} × ${diasSupressaoPorMes}`,
            valor_bruto: arredondarMoeda(valorMes),
          });

          competencias.push({
            competencia,
            valor_bruto: arredondarMoeda(valorMes),
            detalhes: {
              horas_devidas: horasDevidasDia,
              dias_supressao: diasSupressaoPorMes,
              valor_hora_intrajornada: valorHoraIntrajornada,
            },
          });

          totalBruto += valorMes;
        }
      }

      // Verba principal
      verbas.push({
        codigo: 'INTRAJORNADA',
        descricao: 'Intervalo Intrajornada (Art. 71 CLT)',
        valor_bruto: arredondarMoeda(totalBruto),
        competencias,
      });

      // DSR sobre intrajornada (se natureza salarial)
      let totalDSR = 0;
      if (rules.integra_dsr && rules.natureza === 'salarial') {
        totalDSR = totalBruto / 6;
        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'intrajornada',
          descricao: 'DSR sobre intrajornada (total / 6)',
          formula: `${totalBruto.toFixed(2)} / 6`,
          valor_bruto: arredondarMoeda(totalDSR),
        });

        verbas.push({
          codigo: 'DSR_INTRAJORNADA',
          descricao: 'DSR sobre Intervalo Intrajornada',
          valor_bruto: arredondarMoeda(totalDSR),
        });
      }

      // Total geral
      const totalGeral = totalBruto + totalDSR;
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'intrajornada',
        descricao: 'TOTAL INTRAJORNADA + DSR',
        formula: `${totalBruto.toFixed(2)} + ${totalDSR.toFixed(2)}`,
        valor_bruto: arredondarMoeda(totalGeral),
        metadata: {
          total_intrajornada: totalBruto,
          total_dsr: totalDSR,
          natureza: rules.natureza,
          fundamento: rules.natureza === 'salarial'
            ? 'Súmula 437 TST / Art. 71, §4º CLT (pré-reforma)'
            : 'Art. 71, §4º CLT (pós Lei 13.467/2017)',
        },
      });

      // Avisos
      if (rules.natureza === 'indenizatoria') {
        warnings.push({
          tipo: 'info',
          codigo: 'INTRAJORNADA_INDENIZATORIA',
          mensagem: 'Natureza indenizatória aplicada (pós-reforma). Não integra reflexos.',
          sugestao: 'Verifique a data de início do contrato para confirmar o regime aplicável.',
        });
      }

      if (diasSupressaoPorMes > 26) {
        warnings.push({
          tipo: 'atencao',
          codigo: 'DIAS_SUPRESSAO_ELEVADOS',
          mensagem: `${diasSupressaoPorMes} dias de supressão por mês é elevado`,
          sugestao: 'Verifique cartões de ponto para confirmar frequência da supressão',
        });
      }

      return {
        calculadoraId: 'intrajornada',
        calculadoraNome: 'Intervalo Intrajornada',
        versao: this.version,
        outputs: {
          total_bruto: arredondarMoeda(totalGeral),
          total_intrajornada: arredondarMoeda(totalBruto),
          total_dsr_intrajornada: arredondarMoeda(totalDSR),
          verbas,
        },
        auditLines,
        warnings,
      };
    },
  };
}

function emptyResult(version: string, auditLines: AuditLine[], warnings: Warning[]): CalcResult {
  return {
    calculadoraId: 'intrajornada',
    calculadoraNome: 'Intervalo Intrajornada',
    versao: version,
    outputs: { total_bruto: 0, verbas: [] },
    auditLines,
    warnings,
  };
}
