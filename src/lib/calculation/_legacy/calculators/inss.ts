// =====================================================
// CALCULADORA: INSS (Descontos) - Padrão Classe
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
  TaxTable,
  parseFactAsDate,
  arredondarMoeda,
  getMonthsBetween,
} from '../../types';

// Inputs específicos para INSS
interface INSSInputs extends CalculatorInputs {
  valor_bruto?: number;
  competencia?: string;
  verbas_por_competencia?: Record<string, number>;
  total_bruto?: number;
  base_inss_rescisoria?: number;
  base_inss_13_isolado?: number;
}

// Regras configuráveis
interface INSSRules {
  tipo: 'progressivo' | 'simples';
  teto_aplicavel: boolean;
}

const DEFAULT_RULES: INSSRules = {
  tipo: 'progressivo',
  teto_aplicavel: true,
};

// Classe principal do calculador INSS
class INSSCalculator implements Calculator {
  id = 'inss';
  nome = 'INSS';
  version: string;
  private rules: INSSRules;

  constructor(rulesData: CalculatorRules) {
    this.version = rulesData.versao || '1.0';
    this.rules = {
      ...DEFAULT_RULES,
      ...(rulesData.regras as Partial<INSSRules>),
    };
  }

  // Buscar tabela vigente para a competência
  private getTabelaVigente(taxTables: TaxTable[], competencia: string | Date): TaxTable | null {
    const data = typeof competencia === 'string' 
      ? new Date(competencia + '-15') 
      : competencia;
    
    return taxTables.find(
      (t) =>
        t.tipo === 'inss' &&
        t.vigencia_inicio <= data &&
        (!t.vigencia_fim || t.vigencia_fim >= data)
    ) || null;
  }

  // Calcular desconto INSS progressivo (pós-reforma 2020)
  private calcularDescontoProgressivo(valor_bruto: number, tabela: TaxTable): { 
    desconto: number; 
    aliquota_efetiva: number;
    detalhes: Array<{ faixa: number; base: number; aliquota: number; valor: number }>;
  } {
    let desconto = 0;
    let base_restante = valor_bruto;
    let faixaAnterior = 0;
    const detalhes: Array<{ faixa: number; base: number; aliquota: number; valor: number }> = [];

    for (const faixa of tabela.faixas) {
      const limiteAteFaixa = faixa.ate - faixaAnterior;
      const valor_faixa = Math.min(base_restante, limiteAteFaixa);
      
      if (valor_faixa > 0) {
        const valorDesconto = valor_faixa * faixa.aliquota;
        desconto += valorDesconto;
        
        detalhes.push({
          faixa: faixa.ate,
          base: valor_faixa,
          aliquota: faixa.aliquota,
          valor: valorDesconto,
        });
        
        base_restante -= valor_faixa;
      }
      
      if (base_restante <= 0) break;
      faixaAnterior = faixa.ate;
    }

    return {
      desconto: arredondarMoeda(desconto),
      aliquota_efetiva: valor_bruto > 0 ? desconto / valor_bruto : 0,
      detalhes,
    };
  }

  // Calcular desconto INSS simples (alíquota única)
  private calcularDescontoSimples(valor_bruto: number, tabela: TaxTable): {
    desconto: number;
    aliquota_efetiva: number;
  } {
    for (const faixa of tabela.faixas) {
      if (valor_bruto <= faixa.ate || faixa.ate === 0) {
        const desconto = valor_bruto * faixa.aliquota;
        return {
          desconto: arredondarMoeda(desconto),
          aliquota_efetiva: faixa.aliquota,
        };
      }
    }
    
    // Última faixa (teto)
    const ultimaFaixa = tabela.faixas[tabela.faixas.length - 1];
    return {
      desconto: arredondarMoeda(ultimaFaixa.ate * ultimaFaixa.aliquota),
      aliquota_efetiva: ultimaFaixa.aliquota,
    };
  }

  // Método principal de execução
  execute(ctx: CalcContext, inputs: INSSInputs): CalcResult {
    const auditLines: AuditLine[] = [];
    const warnings: Warning[] = [];
    const verbas: VerbaOutput[] = [];
    let linhaAtual = 0;

    // Modo 1: Cálculo direto por valor e competência
    if (inputs.valor_bruto !== undefined && inputs.competencia) {
      const tabela = this.getTabelaVigente(ctx.taxTables, inputs.competencia);
      
      if (!tabela) {
        warnings.push({
          tipo: 'erro',
          codigo: 'TABELA_NAO_ENCONTRADA',
          mensagem: `Tabela INSS não encontrada para ${inputs.competencia}`,
        });
        return this.emptyResult(warnings);
      }

      const { desconto, aliquota_efetiva, detalhes } = this.rules.tipo === 'progressivo'
        ? this.calcularDescontoProgressivo(inputs.valor_bruto, tabela)
        : { ...this.calcularDescontoSimples(inputs.valor_bruto, tabela), detalhes: [] };

      // Auditoria detalhada por faixa (progressivo)
      if (this.rules.tipo === 'progressivo' && detalhes) {
        for (const det of detalhes) {
          auditLines.push({
            linha: ++linhaAtual,
            calculadora: 'inss',
            competencia: inputs.competencia,
            descricao: `Faixa até R$ ${det.faixa.toFixed(2)} (${(det.aliquota * 100).toFixed(1)}%)`,
            formula: `${det.base.toFixed(2)} × ${det.aliquota}`,
            valor_liquido: arredondarMoeda(-det.valor),
            metadata: { faixa: det.faixa, aliquota: det.aliquota },
          });
        }
      }

      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'inss',
        competencia: inputs.competencia,
        descricao: `INSS sobre R$ ${inputs.valor_bruto.toFixed(2)} (alíq. efetiva ${(aliquota_efetiva * 100).toFixed(2)}%)`,
        valor_bruto: arredondarMoeda(-desconto),
        metadata: { base: inputs.valor_bruto, aliquota_efetiva },
      });

      verbas.push({
        codigo: 'INSS_DESCONTO',
        descricao: 'Desconto INSS',
        valor_bruto: 0,
        valor_liquido: arredondarMoeda(-desconto),
      });

      return {
        calculadoraId: this.id,
        calculadoraNome: this.nome,
        versao: this.version,
        outputs: { total_bruto: 0, total_liquido: arredondarMoeda(-desconto), verbas },
        auditLines,
        warnings,
      };
    }

    // Modo 2: Cálculo por competência (múltiplas competências)
    const verbasCompetencia = inputs.verbas_por_competencia || {};
    const dataAdmissao = parseFactAsDate(ctx.facts['data_admissao']);
    const dataDemissao = parseFactAsDate(ctx.facts['data_demissao']) || ctx.dataReferencia;

    // ═══ MODO 2a: Base rescisória tributável (verbas rescisórias) ═══
    // Quando há base_inss_rescisoria, calcular INSS apenas sobre verbas tributáveis
    // Art. 28, Lei 8.212/91 — Férias indenizadas isentas (§9º, "d")
    const baseRescisoria = inputs.base_inss_rescisoria || 0;
    const base13Isolado = inputs.base_inss_13_isolado || 0;
    
    if (baseRescisoria > 0 || base13Isolado > 0) {
      // INSS sobre verbas rescisórias tributáveis (Saldo Salário + Aviso Prévio)
      if (baseRescisoria > 0) {
        const tabela = this.getTabelaVigente(ctx.taxTables, dataDemissao);
        if (!tabela) {
          warnings.push({ tipo: 'atencao', codigo: 'TABELA_INSS_NAO_ENCONTRADA', mensagem: 'Tabela INSS não encontrada para data de demissão' });
        } else {
          const { desconto, aliquota_efetiva, detalhes } = this.rules.tipo === 'progressivo'
            ? this.calcularDescontoProgressivo(baseRescisoria, tabela)
            : { ...this.calcularDescontoSimples(baseRescisoria, tabela), detalhes: [] };

          if (this.rules.tipo === 'progressivo' && detalhes) {
            for (const det of detalhes) {
              auditLines.push({
                linha: ++linhaAtual, calculadora: 'inss',
                descricao: `INSS Rescisão — Faixa até R$ ${det.faixa.toFixed(2)} (${(det.aliquota * 100).toFixed(1)}%)`,
                formula: `R$ ${det.base.toFixed(2)} × ${(det.aliquota * 100).toFixed(1)}% = R$ ${det.valor.toFixed(2)}`,
                valor_liquido: arredondarMoeda(-det.valor),
                metadata: { faixa: det.faixa, aliquota: det.aliquota, tipo: 'rescisoria' },
              });
            }
          }

          auditLines.push({
            linha: ++linhaAtual, calculadora: 'inss',
            descricao: `INSS s/ Verbas Rescisórias (alíq. efetiva ${(aliquota_efetiva * 100).toFixed(2)}%)`,
            formula: `Base R$ ${baseRescisoria.toFixed(2)} (Saldo Salário + Aviso Prévio) → Desconto R$ ${desconto.toFixed(2)}`,
            valor_bruto: arredondarMoeda(desconto),
            valor_liquido: arredondarMoeda(-desconto),
            metadata: { base: baseRescisoria, aliquota_efetiva, fundamento: 'Art. 28, Lei 8.212/91' },
          });

          verbas.push({
            codigo: 'INSS_DESCONTO',
            descricao: 'Desconto INSS',
            valor_bruto: 0,
            valor_liquido: arredondarMoeda(-desconto),
          });
        }
      }
      
      // INSS sobre 13º proporcional (tributação isolada — Art. 214, §6º, RPS)
      if (base13Isolado > 0) {
        const tabela = this.getTabelaVigente(ctx.taxTables, dataDemissao);
        if (tabela) {
          const { desconto, aliquota_efetiva } = this.rules.tipo === 'progressivo'
            ? this.calcularDescontoProgressivo(base13Isolado, tabela)
            : this.calcularDescontoSimples(base13Isolado, tabela);

          auditLines.push({
            linha: ++linhaAtual, calculadora: 'inss',
            descricao: `INSS s/ 13º Proporcional (tributação isolada — Art. 214, §6º, RPS)`,
            formula: `Base R$ ${base13Isolado.toFixed(2)} → Desconto R$ ${desconto.toFixed(2)}`,
            valor_bruto: arredondarMoeda(desconto),
            valor_liquido: arredondarMoeda(-desconto),
            metadata: { base: base13Isolado, aliquota_efetiva, fundamento: 'Art. 214, §6º, Decreto 3.048/99' },
          });
          
          const existingVerba = verbas.find(v => v.codigo === 'INSS_DESCONTO');
          if (existingVerba) {
            existingVerba.valor_liquido = arredondarMoeda((existingVerba.valor_liquido || 0) - desconto);
          } else {
            verbas.push({
              codigo: 'INSS_DESCONTO', descricao: 'Desconto INSS',
              valor_bruto: 0, valor_liquido: arredondarMoeda(-desconto),
            });
          }
        }
      }

      const totalDesconto = verbas.reduce((sum, v) => sum + Math.abs(v.valor_liquido || 0), 0);
      
      auditLines.push({
        linha: ++linhaAtual, calculadora: 'inss',
        descricao: 'TOTAL DESCONTO INSS',
        valor_bruto: arredondarMoeda(totalDesconto),
        valor_liquido: arredondarMoeda(-totalDesconto),
      });

      return {
        calculadoraId: this.id, calculadoraNome: this.nome, versao: this.version,
        outputs: { total_bruto: 0, total_liquido: arredondarMoeda(-totalDesconto), verbas },
        auditLines, warnings,
      };
    }

    if (Object.keys(verbasCompetencia).length === 0) {
      const totalBruto = inputs.total_bruto || 0;
      
      if (totalBruto <= 0) {
        warnings.push({
          tipo: 'info',
          codigo: 'SEM_BASE_INSS',
          mensagem: 'Não há base de cálculo para INSS',
        });
        return this.emptyResult(warnings);
      }

      // Cálculo simplificado com tabela atual
      const tabela = this.getTabelaVigente(ctx.taxTables, ctx.dataReferencia);
      
      if (!tabela) {
        warnings.push({
          tipo: 'atencao',
          codigo: 'TABELA_INSS_NAO_ENCONTRADA',
          mensagem: 'Tabela de INSS não encontrada para o período',
          sugestao: 'Cadastre a tabela de INSS vigente',
        });
        return this.emptyResult(warnings);
      }

      const { desconto, aliquota_efetiva } = this.rules.tipo === 'progressivo'
        ? this.calcularDescontoProgressivo(totalBruto, tabela)
        : this.calcularDescontoSimples(totalBruto, tabela);

      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'inss',
        descricao: `Desconto INSS (alíq. efetiva ${(aliquota_efetiva * 100).toFixed(2)}%)`,
        formula: `Base ${totalBruto.toFixed(2)} → Desconto`,
        valor_bruto: arredondarMoeda(desconto),
        valor_liquido: arredondarMoeda(-desconto),
        metadata: { base: totalBruto, aliquota_efetiva },
      });

      verbas.push({
        codigo: 'INSS_DESCONTO',
        descricao: 'Desconto INSS',
        valor_bruto: arredondarMoeda(desconto),
        valor_liquido: arredondarMoeda(-desconto),
      });

      return {
        calculadoraId: this.id,
        calculadoraNome: this.nome,
        versao: this.version,
        outputs: { total_bruto: 0, total_liquido: arredondarMoeda(-desconto), verbas },
        auditLines,
        warnings,
      };
    }

    // Processar cada competência
    const competencias: CompetenciaOutput[] = [];
    let totalDesconto = 0;

    const meses = dataAdmissao && dataDemissao
      ? getMonthsBetween(dataAdmissao, dataDemissao)
      : Object.keys(verbasCompetencia);

    for (const competencia of meses) {
      const baseCompetencia = verbasCompetencia[competencia] || 0;
      if (baseCompetencia <= 0) continue;

      const tabela = this.getTabelaVigente(ctx.taxTables, competencia);

      if (!tabela) {
        warnings.push({
          tipo: 'atencao',
          codigo: 'TABELA_INSS_NAO_ENCONTRADA',
          mensagem: `Tabela INSS não encontrada para ${competencia}`,
        });
        continue;
      }

      const { desconto, aliquota_efetiva } = this.rules.tipo === 'progressivo'
        ? this.calcularDescontoProgressivo(baseCompetencia, tabela)
        : this.calcularDescontoSimples(baseCompetencia, tabela);

      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'inss',
        competencia,
        descricao: `INSS ${competencia} (${(aliquota_efetiva * 100).toFixed(1)}%)`,
        formula: `${baseCompetencia.toFixed(2)} → ${desconto.toFixed(2)}`,
        valor_liquido: arredondarMoeda(-desconto),
        metadata: { base: baseCompetencia, aliquota_efetiva },
      });

      competencias.push({
        competencia,
        valor_bruto: 0,
        valor_liquido: arredondarMoeda(-desconto),
      });

      totalDesconto += desconto;
    }

    verbas.push({
      codigo: 'INSS_DESCONTO',
      descricao: 'Desconto INSS',
      valor_bruto: 0,
      valor_liquido: arredondarMoeda(-totalDesconto),
      competencias,
    });

    auditLines.push({
      linha: ++linhaAtual,
      calculadora: 'inss',
      descricao: 'TOTAL DESCONTO INSS',
      valor_liquido: arredondarMoeda(-totalDesconto),
    });

    return {
      calculadoraId: this.id,
      calculadoraNome: this.nome,
      versao: this.version,
      outputs: { total_bruto: 0, total_liquido: arredondarMoeda(-totalDesconto), verbas },
      auditLines,
      warnings,
    };
  }

  // Helper para resultado vazio
  private emptyResult(warnings: Warning[]): CalcResult {
    return {
      calculadoraId: this.id,
      calculadoraNome: this.nome,
      versao: this.version,
      outputs: { total_bruto: 0, total_liquido: 0, verbas: [] },
      auditLines: [],
      warnings,
    };
  }
}

// Factory function para manter compatibilidade
export function createINSSCalculator(rulesData: CalculatorRules): Calculator {
  return new INSSCalculator(rulesData);
}
