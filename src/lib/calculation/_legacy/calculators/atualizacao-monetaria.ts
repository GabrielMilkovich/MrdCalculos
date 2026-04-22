// =====================================================
// CALCULADORA: ATUALIZAÇÃO MONETÁRIA
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
  arredondarMoeda,
} from '../../types';
import { getIndexValue } from '../engine';

interface AtualizacaoRules {
  indice: 'ipca_e' | 'inpc' | 'tr' | 'selic';
  juros: 'selic' | '1_am' | '0.5_am' | 'nenhum';
  juros_simples: boolean;
  partir_de: 'vencimento' | 'ajuizamento' | 'citacao';
}

const DEFAULT_RULES: AtualizacaoRules = {
  indice: 'ipca_e',
  juros: 'selic',
  juros_simples: true,
  partir_de: 'vencimento',
};

export function createAtualizacaoMonetariaCalculator(rulesData: CalculatorRules): Calculator {
  const rules: AtualizacaoRules = {
    ...DEFAULT_RULES,
    ...(rulesData.regras as Partial<AtualizacaoRules>),
  };

  return {
    id: 'atualizacao_monetaria',
    nome: 'Atualização Monetária',
    version: rulesData.versao || '1.0',

    execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult {
      const auditLines: AuditLine[] = [];
      const warnings: Warning[] = [];
      const verbas: VerbaOutput[] = [];
      let linhaAtual = 0;

      // Obter valores por competência
      const verbasCompetencia = (inputs.verbas_por_competencia as Record<string, number>) || {};
      const totalBruto = (inputs.total_bruto as number) || 0;

      if (totalBruto <= 0 && Object.keys(verbasCompetencia).length === 0) {
        warnings.push({
          tipo: 'info',
          codigo: 'SEM_BASE_ATUALIZACAO',
          mensagem: 'Não há valores para atualizar',
        });
        return {
          calculadoraId: 'atualizacao_monetaria',
          calculadoraNome: 'Atualização Monetária',
          versao: this.version,
          outputs: { total_bruto: 0, verbas: [] },
          auditLines,
          warnings,
        };
      }

      // Se não tiver detalhamento por competência, avisa
      if (Object.keys(verbasCompetencia).length === 0) {
        warnings.push({
          tipo: 'atencao',
          codigo: 'SEM_COMPETENCIAS',
          mensagem: 'Sem detalhamento por competência, atualização pode ser imprecisa',
          sugestao: 'Forneça valores por competência para cálculo mais preciso',
        });
      }

      // Calcular atualização por competência
      const competencias: CompetenciaOutput[] = [];
      let totalCorrecao = 0;
      let totalJuros = 0;

      const dataReferencia = ctx.dataReferencia;
      const mesReferencia = `${dataReferencia.getFullYear()}-${String(dataReferencia.getMonth() + 1).padStart(2, '0')}`;

      for (const [competencia, valor] of Object.entries(verbasCompetencia)) {
        if (valor <= 0) continue;

        // Calcular fator de correção acumulado
        const [anoComp, mesComp] = competencia.split('-').map(Number);
        const dataCompetencia = new Date(anoComp, mesComp - 1, 1);
        
        let fatorCorrecao = 1;
        let fatorJuros = 0;

        // Acumular índices mês a mês
        const mesesAcumulados: { mes: string; indice: number }[] = [];
        const current = new Date(dataCompetencia);
        
        while (current < dataReferencia) {
          const compStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          const indice = getIndexValue(ctx.indices, rules.indice, current);
          
          if (indice !== null) {
            fatorCorrecao *= (1 + indice);
            mesesAcumulados.push({ mes: compStr, indice });
          }
          
          current.setMonth(current.getMonth() + 1);
        }

        // Calcular juros
        const mesesTranscorridos = mesesAcumulados.length;
        
        if (rules.juros !== 'nenhum') {
          if (rules.juros === '1_am') {
            fatorJuros = rules.juros_simples 
              ? 0.01 * mesesTranscorridos
              : Math.pow(1.01, mesesTranscorridos) - 1;
          } else if (rules.juros === '0.5_am') {
            fatorJuros = rules.juros_simples
              ? 0.005 * mesesTranscorridos
              : Math.pow(1.005, mesesTranscorridos) - 1;
          } else if (rules.juros === 'selic') {
            // Para Selic, usar os próprios índices acumulados
            for (const item of mesesAcumulados) {
              const selicMes = getIndexValue(ctx.indices, 'selic', new Date(item.mes + '-01'));
              if (selicMes !== null) {
                fatorJuros = rules.juros_simples
                  ? fatorJuros + selicMes
                  : (1 + fatorJuros) * (1 + selicMes) - 1;
              }
            }
          }
        }

        const valorCorrigido = valor * fatorCorrecao;
        const valorJuros = valor * fatorJuros;
        const valorAtualizado = valorCorrigido + valorJuros;

        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'atualizacao_monetaria',
          competencia,
          descricao: `Correção ${competencia} → ${mesReferencia}`,
          formula: `${valor.toFixed(2)} × ${fatorCorrecao.toFixed(6)}`,
          valor_bruto: arredondarMoeda(valorCorrigido - valor),
          metadata: {
            valor_original: valor,
            fator_correcao: fatorCorrecao,
            meses: mesesTranscorridos,
          },
        });

        if (fatorJuros > 0) {
          auditLines.push({
            linha: ++linhaAtual,
            calculadora: 'atualizacao_monetaria',
            competencia,
            descricao: `Juros ${rules.juros} (${mesesTranscorridos} meses)`,
            formula: `${valor.toFixed(2)} × ${fatorJuros.toFixed(6)}`,
            valor_bruto: arredondarMoeda(valorJuros),
            metadata: {
              tipo_juros: rules.juros,
              fator_juros: fatorJuros,
            },
          });
        }

        competencias.push({
          competencia,
          valor_bruto: arredondarMoeda(valorAtualizado - valor),
          detalhes: {
            original: valor,
            correcao: valorCorrigido - valor,
            juros: valorJuros,
          },
        });

        totalCorrecao += (valorCorrigido - valor);
        totalJuros += valorJuros;
      }

      // Se não calculou por competência, calcular simplificado
      if (competencias.length === 0 && totalBruto > 0) {
        // Estimativa simplificada (12 meses, 10% correção)
        const correcaoEstimada = totalBruto * 0.10;
        const jurosEstimado = totalBruto * 0.12;
        
        warnings.push({
          tipo: 'atencao',
          codigo: 'ATUALIZACAO_ESTIMADA',
          mensagem: 'Correção calculada de forma estimada',
          sugestao: 'Forneça índices e competências para cálculo preciso',
        });

        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'atualizacao_monetaria',
          descricao: 'Correção monetária (estimativa)',
          valor_bruto: arredondarMoeda(correcaoEstimada),
          metadata: { estimativa: true },
        });

        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'atualizacao_monetaria',
          descricao: 'Juros moratórios (estimativa)',
          valor_bruto: arredondarMoeda(jurosEstimado),
          metadata: { estimativa: true },
        });

        totalCorrecao = correcaoEstimada;
        totalJuros = jurosEstimado;
      }

      // Adicionar verbas
      if (totalCorrecao > 0) {
        verbas.push({
          codigo: 'CORRECAO_MONETARIA',
          descricao: `Correção Monetária (${rules.indice.toUpperCase()})`,
          valor_bruto: arredondarMoeda(totalCorrecao),
          competencias,
        });
      }

      if (totalJuros > 0) {
        verbas.push({
          codigo: 'JUROS_MORATORIOS',
          descricao: `Juros Moratórios (${rules.juros})`,
          valor_bruto: arredondarMoeda(totalJuros),
        });
      }

      // Total
      const totalGeral = totalCorrecao + totalJuros;
      
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'atualizacao_monetaria',
        descricao: 'TOTAL ATUALIZAÇÃO (Correção + Juros)',
        formula: `${totalCorrecao.toFixed(2)} + ${totalJuros.toFixed(2)}`,
        valor_bruto: arredondarMoeda(totalGeral),
        metadata: {
          indice: rules.indice,
          juros: rules.juros,
        },
      });

      return {
        calculadoraId: 'atualizacao_monetaria',
        calculadoraNome: 'Atualização Monetária',
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
