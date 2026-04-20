// =====================================================
// ⚠️  DEPRECATED — MOTOR DE CÁLCULO V1
// Este motor é LEGADO e será removido na próxima fase.
// O motor canônico é PjeCalcEngine em src/lib/pjecalc/engine.ts
// Usado apenas por CasoDetalhe.tsx (fluxo genérico legado).
// NÃO ADICIONE NOVAS FUNCIONALIDADES AQUI.
// =====================================================

const LEGACY_ENGINE_DEPRECATION_WARNING = '[DEPRECATED] Motor V1 (src/lib/calculation/engine.ts) foi acionado. Use PjeCalcEngine em src/lib/pjecalc/engine.ts. Este motor será removido em breve.';

// Runtime guard: warn loudly when this module is used
if (typeof console !== 'undefined') {
  logger.warn(LEGACY_ENGINE_DEPRECATION_WARNING)
}

import {
  CalcContext,
  CalcResult,
  CalculationProfile,
  CalculationRunResult,
  Calculator,
  CalculatorInputs,
  CalculatorRules,
  CalculatorUsed,
  ConsolidatedResult,
  FactMap,
  IndexSeries,
  TaxTable,
  Warning,
  AuditLine,
  arredondarMoeda,
} from './types';
import { createHorasExtrasCalculator } from './calculators/horas-extras';
import { createReflexos13Calculator } from './calculators/reflexos-13';
import { createReflexosFeriasCalculator } from './calculators/reflexos-ferias';
import { createFGTSCalculator } from './calculators/fgts';
import { createINSSCalculator } from './calculators/inss';
import { createAtualizacaoMonetariaCalculator } from './calculators/atualizacao-monetaria';
import { createVerbasRescisoriasCalculator } from './calculators/verbas-rescisorias';
import { createIntrajornadaCalculator } from './calculators/intrajornada';
import { logger } from '@/lib/logger';

// Registry de calculadoras disponíveis
const calculatorRegistry: Map<string, (rules: CalculatorRules) => Calculator> = new Map([
  ['horas_extras', createHorasExtrasCalculator],
  ['reflexos_13', createReflexos13Calculator],
  ['reflexos_ferias', createReflexosFeriasCalculator],
  ['fgts', createFGTSCalculator],
  ['inss', createINSSCalculator],
  ['atualizacao_monetaria', createAtualizacaoMonetariaCalculator],
  ['verbas_rescisorias', createVerbasRescisoriasCalculator],
  ['intrajornada', createIntrajornadaCalculator],
]);

// Registrar uma nova calculadora
export function registerCalculator(
  nome: string,
  factory: (rules: CalculatorRules) => Calculator
): void {
  calculatorRegistry.set(nome, factory);
}

// Obter lista de calculadoras disponíveis
export function getAvailableCalculators(): string[] {
  return Array.from(calculatorRegistry.keys());
}

// Criar instância de calculadora a partir de regras
export function createCalculator(
  nome: string,
  rules: CalculatorRules
): Calculator | null {
  const factory = calculatorRegistry.get(nome);
  if (!factory) {
    logger.warn(`Calculadora "${nome}" não encontrada no registry`)
    return null;
  }
  return factory(rules);
}

// Interface de resumo final (inspirado no motor simplificado)
export interface FinalResult {
  resumo: {
    bruto: number;
    liquido: number;
    descontos_totais: number;
    quantidade_verbas: number;
    quantidade_competencias: number;
  };
  por_verba: ConsolidatedResult['por_verba'];
  por_competencia: { [competencia: string]: number };
  memoria_calculo: AuditLine[];
  warnings: Warning[];
  calculadoras_utilizadas: CalculatorUsed[];
}

// Classe principal do motor de cálculo
export class CalculationEngine {
  private profile: CalculationProfile;
  private indices: IndexSeries[];
  private taxTables: TaxTable[];
  private facts: FactMap;
  private dataReferencia: Date;
  private calculators: Map<string, Calculator> = new Map();
  private allAuditLines: AuditLine[] = [];
  private allWarnings: Warning[] = [];
  private totalBruto: number = 0;
  private totalLiquido: number = 0;

  constructor(
    profile: CalculationProfile,
    indices: IndexSeries[],
    taxTables: TaxTable[],
    facts: FactMap,
    dataReferencia?: Date
  ) {
    this.profile = profile;
    this.indices = indices;
    this.taxTables = taxTables;
    this.facts = facts;
    this.dataReferencia = dataReferencia || new Date();
  }

  // Carregar calculadoras com suas versões/regras
  loadCalculators(calculatorsWithRules: { nome: string; rules: CalculatorRules }[]): void {
    for (const { nome, rules } of calculatorsWithRules) {
      const calculator = createCalculator(nome, rules);
      if (calculator) {
        this.calculators.set(nome, calculator);
      } else {
        this.allWarnings.push({
          tipo: 'atencao',
          codigo: 'CALC_NAO_ENCONTRADA',
          mensagem: `Calculadora "${nome}" não foi encontrada no sistema`,
          sugestao: 'Verifique se o nome está correto ou se a calculadora está implementada',
        });
      }
    }
  }

  // Criar contexto de cálculo
  private createContext(): CalcContext {
    return {
      profile: this.profile,
      indices: this.indices,
      taxTables: this.taxTables,
      facts: this.facts,
      dataReferencia: this.dataReferencia,
    };
  }

  // Estimar INSS para uma competência específica (usado em cálculos intermediários)
  estimateINSS(valorBruto: number, competencia: string | Date): number {
    const compDate = typeof competencia === 'string' 
      ? new Date(competencia + '-01') 
      : competencia;
    
    const tabela = getTaxTable(this.taxTables, 'inss', compDate);
    if (!tabela) {
      this.allWarnings.push({
        tipo: 'atencao',
        codigo: 'TABELA_INSS_NAO_ENCONTRADA',
        mensagem: `Tabela INSS não encontrada para ${competencia}`,
        sugestao: 'Usando alíquota padrão de 9%',
      });
      return arredondarMoeda(valorBruto * 0.09);
    }
    
    const { valor } = calcularImposto(valorBruto, tabela);
    return valor;
  }

  // Estimar IRRF para uma competência específica
  estimateIRRF(valorBruto: number, competencia: string | Date, descontoINSS: number = 0): number {
    const compDate = typeof competencia === 'string' 
      ? new Date(competencia + '-01') 
      : competencia;
    
    const baseIRRF = valorBruto - descontoINSS;
    const tabela = getTaxTable(this.taxTables, 'irrf', compDate);
    
    if (!tabela) {
      return 0; // IRRF é opcional se não tiver tabela
    }
    
    const { valor } = calcularImposto(baseIRRF, tabela);
    return valor;
  }

  // Executar uma calculadora específica
  executeCalculator(nome: string, inputs?: CalculatorInputs): CalcResult | null {
    const calculator = this.calculators.get(nome);
    if (!calculator) {
      this.allWarnings.push({
        tipo: 'erro',
        codigo: 'CALC_NAO_CARREGADA',
        mensagem: `Calculadora "${nome}" não está carregada`,
      });
      return null;
    }

    const ctx = this.createContext();
    const result = calculator.execute(ctx, inputs || {});

    // Numerar linhas de auditoria sequencialmente
    const startLine = this.allAuditLines.length + 1;
    result.auditLines.forEach((line, i) => {
      line.linha = startLine + i;
    });

    this.allAuditLines.push(...result.auditLines);
    this.allWarnings.push(...result.warnings);

    // Acumular totais
    this.totalBruto += result.outputs.total_bruto;
    this.totalLiquido += result.outputs.total_liquido ?? result.outputs.total_bruto;

    return result;
  }

  // Executar todas as calculadoras na ordem correta
  executeAll(): CalculationRunResult {
    const results: CalcResult[] = [];
    const calculatorsUsed: CalculatorUsed[] = [];

    // Ordem de execução (verbas base primeiro, depois reflexos, rescisão, descontos e atualização)
    const executionOrder = [
      'horas_extras',
      'reflexos_13',
      'reflexos_ferias',
      'fgts',
      'verbas_rescisorias',
      'inss',
      'atualizacao_monetaria',
    ];

    // Reset de estado para execução limpa
    this.totalBruto = 0;
    this.totalLiquido = 0;
    this.allAuditLines = [];
    this.allWarnings = [];

    // Acumuladores para passar entre calculadoras
    const verbasPorCompetencia: Record<string, number> = {};
    let accumulatedInputs: CalculatorInputs = {};

    // Executar na ordem
    for (const nome of executionOrder) {
      if (!this.calculators.has(nome)) continue;

      const calculator = this.calculators.get(nome)!;
      const result = this.executeCalculator(nome, accumulatedInputs);
      if (!result) continue;

      results.push(result);
      calculatorsUsed.push({
        calculator_id: calculator.id,
        nome: calculator.nome,
        versao: calculator.version,
        vigencia: this.dataReferencia.toISOString().split('T')[0],
      });

      // Acumular totais para calculadoras dependentes
      if (nome === 'horas_extras') {
        accumulatedInputs.total_horas_extras = result.outputs.total_bruto;
      } else if (nome === 'reflexos_13') {
        accumulatedInputs.total_reflexo_13 = result.outputs.total_bruto;
      } else if (nome === 'reflexos_ferias') {
        accumulatedInputs.total_reflexo_ferias = result.outputs.total_bruto;
      } else if (nome === 'fgts') {
        accumulatedInputs.total_fgts = result.outputs.total_bruto;
      } else if (nome === 'verbas_rescisorias') {
        // Extrair base INSS tributável (apenas saldo salário + aviso prévio)
        // Férias indenizadas: isentas (Art. 28, §9º, "d", Lei 8.212/91)
        // FGTS: não incide INSS
        const VERBAS_TRIBUTAVEIS_INSS = ['SALDO_SAL', 'AVISO_PREVIO'];
        const baseINSS = result.outputs.verbas
          .filter(v => VERBAS_TRIBUTAVEIS_INSS.includes(v.codigo))
          .reduce((sum, v) => sum + v.valor_bruto, 0);
        accumulatedInputs.base_inss_rescisoria = baseINSS;
        
        // 13º proporcional: tributação isolada (Art. 214, §6º, RPS)
        const decimo = result.outputs.verbas.find(v => v.codigo === 'DECIMO_PROP');
        accumulatedInputs.base_inss_13_isolado = decimo?.valor_bruto || 0;
      }

      // Acumular valores por competência para INSS/atualização monetária
      for (const verba of result.outputs.verbas) {
        for (const comp of verba.competencias || []) {
          const valorComp = comp.valor_bruto ?? 0;
          verbasPorCompetencia[comp.competencia] =
            (verbasPorCompetencia[comp.competencia] || 0) + valorComp;
        }
      }

      accumulatedInputs.total_bruto = this.totalBruto;
      accumulatedInputs.total_liquido = this.totalLiquido;
      accumulatedInputs.verbas_por_competencia = { ...verbasPorCompetencia };
    }

    // Calcular totais consolidados
    const resultado_bruto = this.consolidateResults(results, 'bruto');
    const resultado_liquido = this.consolidateResults(results, 'liquido');

    // Aplicar arredondamento conforme perfil
    if (this.profile.config.arredondamento === 'final') {
      resultado_bruto.total = arredondarMoeda(resultado_bruto.total);
      resultado_liquido.total = arredondarMoeda(resultado_liquido.total);
    }

    return {
      case_id: '', // será preenchido pelo caller
      profile_id: this.profile.id,
      facts_snapshot: this.facts,
      calculators_used: calculatorsUsed,
      resultado_bruto,
      resultado_liquido,
      auditLines: this.allAuditLines,
      warnings: this.allWarnings,
      executado_em: new Date(),
    };
  }

  /**
   * Retorna o resultado final consolidado (API simplificada)
   * Inspirado no motor simplificado do usuário
   */
  getFinalResult(): FinalResult {
    const resultado = this.executeAll();
    const competencias = new Set<string>();
    
    // Contar competências únicas
    for (const line of this.allAuditLines) {
      if (line.competencia) {
        competencias.add(line.competencia);
      }
    }

    return {
      resumo: {
        bruto: arredondarMoeda(resultado.resultado_bruto.total),
        liquido: arredondarMoeda(resultado.resultado_liquido.total),
        descontos_totais: arredondarMoeda(
          resultado.resultado_bruto.total - resultado.resultado_liquido.total
        ),
        quantidade_verbas: Object.keys(resultado.resultado_bruto.por_verba).length,
        quantidade_competencias: competencias.size,
      },
      por_verba: resultado.resultado_bruto.por_verba,
      por_competencia: resultado.resultado_bruto.por_competencia || {},
      memoria_calculo: this.allAuditLines,
      warnings: this.allWarnings,
      calculadoras_utilizadas: resultado.calculators_used,
    };
  }

  // Consolidar resultados de múltiplas calculadoras
  private consolidateResults(
    results: CalcResult[],
    tipo: 'bruto' | 'liquido'
  ): ConsolidatedResult {
    const por_verba: ConsolidatedResult['por_verba'] = {};
    const por_competencia: { [competencia: string]: number } = {};
    let total = 0;

    for (const result of results) {
      for (const verba of result.outputs.verbas) {
        const valor = tipo === 'bruto' ? verba.valor_bruto : (verba.valor_liquido ?? verba.valor_bruto);
        
        if (!por_verba[verba.codigo]) {
          por_verba[verba.codigo] = {
            descricao: verba.descricao,
            valor: 0,
          };
        }
        por_verba[verba.codigo].valor += valor;
        total += valor;

        // Agregar por competência
        if (verba.competencias) {
          for (const comp of verba.competencias) {
            const compValor = tipo === 'bruto' ? comp.valor_bruto : (comp.valor_liquido ?? comp.valor_bruto);
            por_competencia[comp.competencia] = (por_competencia[comp.competencia] || 0) + compValor;
          }
        }
      }
    }

    return { total, por_verba, por_competencia };
  }

  // Getters
  getAuditLines(): AuditLine[] {
    return this.allAuditLines;
  }

  getWarnings(): Warning[] {
    return this.allWarnings;
  }

  getTotalBruto(): number {
    return arredondarMoeda(this.totalBruto);
  }

  getTotalLiquido(): number {
    return arredondarMoeda(this.totalLiquido);
  }

  getDescontosTotais(): number {
    return arredondarMoeda(this.totalBruto - this.totalLiquido);
  }
}

// Helper para buscar índice de atualização
export function getIndexValue(
  indices: IndexSeries[],
  nome: string,
  competencia: Date
): number | null {
  const compStr = `${competencia.getFullYear()}-${String(competencia.getMonth() + 1).padStart(2, '0')}`;
  const index = indices.find(
    (i) => i.nome === nome && formatCompetencia(i.competencia) === compStr
  );
  return index ? index.valor : null;
}

function formatCompetencia(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Helper para buscar tabela de imposto vigente
export function getTaxTable(
  taxTables: TaxTable[],
  tipo: 'inss' | 'irrf',
  data: Date
): TaxTable | null {
  return taxTables.find(
    (t) =>
      t.tipo === tipo &&
      t.vigencia_inicio <= data &&
      (!t.vigencia_fim || t.vigencia_fim >= data)
  ) || null;
}

// Calcular imposto com base na tabela
export function calcularImposto(
  base: number,
  tabela: TaxTable
): { valor: number; aliquota_efetiva: number } {
  if (tabela.tipo === 'inss') {
    // INSS progressivo (pós-reforma 2020)
    let imposto = 0;
    let baseRestante = base;
    let faixaAnterior = 0;

    for (const faixa of tabela.faixas) {
      const limiteAteFaixa = faixa.ate - faixaAnterior;
      const baseNaFaixa = Math.min(baseRestante, limiteAteFaixa);
      
      if (baseNaFaixa > 0) {
        imposto += baseNaFaixa * faixa.aliquota;
        baseRestante -= baseNaFaixa;
      }
      
      if (baseRestante <= 0) break;
      faixaAnterior = faixa.ate;
    }

    return {
      valor: arredondarMoeda(imposto),
      aliquota_efetiva: base > 0 ? imposto / base : 0,
    };
  } else {
    // IRRF por faixa única
    for (const faixa of tabela.faixas) {
      if (base <= faixa.ate || faixa.ate === 0) {
        const imposto = base * faixa.aliquota - (faixa.deducao || 0);
        return {
          valor: arredondarMoeda(Math.max(0, imposto)),
          aliquota_efetiva: base > 0 ? Math.max(0, imposto) / base : 0,
        };
      }
    }
    
    // Última faixa (sem limite)
    const ultimaFaixa = tabela.faixas[tabela.faixas.length - 1];
    const imposto = base * ultimaFaixa.aliquota - (ultimaFaixa.deducao || 0);
    return {
      valor: arredondarMoeda(Math.max(0, imposto)),
      aliquota_efetiva: base > 0 ? Math.max(0, imposto) / base : 0,
    };
  }
}
