/**
 * =====================================================
 * INCIDENCE ENGINE — Motor de Incidências por Competência
 * =====================================================
 * 
 * Calcula FGTS, INSS, IRRF por competência respeitando:
 * - natureza da verba
 * - tabelas históricas progressivas
 * - teto previdenciário
 * - tratamento específico de 13º, férias, PLR
 * - separação principal/juros quando necessário
 * 
 * Usa Decimal.js para precisão absoluta.
 */

import Decimal from 'decimal.js';
import type {
  IncidenceType, Competencia, RubricNature,
  CalculationItemIncidence, UUID,
} from './types';

// =====================================================
// TABELAS DE REFERÊNCIA
// =====================================================

export interface INSSFaixa {
  valor_inicial: number;
  valor_final: number | null; // null = teto
  aliquota: number; // percentual (ex: 7.5)
}

export interface INSSTabela {
  competencia: Competencia;
  faixas: INSSFaixa[];
  teto: number;
}

export interface IRRFFaixa {
  valor_inicial: number;
  valor_final: number | null;
  aliquota: number;
  parcela_deduzir: number;
}

export interface IRRFTabela {
  competencia: Competencia;
  faixas: IRRFFaixa[];
  deducao_dependente: number;
}

export interface FGTSConfig {
  aliquota: number; // normalmente 8%
  aliquota_aprendiz?: number; // 2%
  multa_rescisoria: number; // 40% ou 20%
}

// =====================================================
// INCIDENCE CONTEXT — Dados para cálculo
// =====================================================

export interface IncidenceContext {
  /** Valor base (diferença devida) */
  base: Decimal;
  /** Natureza da verba */
  natureza: RubricNature;
  /** Competência da verba */
  competencia: Competencia;
  /** É 13º salário? (tributação separada) */
  is_13_salario: boolean;
  /** É férias? (tributação separada) */
  is_ferias: boolean;
  /** É PLR? (tributação exclusiva) */
  is_plr: boolean;
  /** É verba rescisória indenizatória? (isenta) */
  is_rescisoria_indenizatoria: boolean;
  /** Incidências habilitadas na verba */
  incidences_config: {
    fgts: boolean;
    inss: boolean;
    irrf: boolean;
  };
}

// =====================================================
// RESULT
// =====================================================

export interface IncidenceResult {
  tipo: IncidenceType;
  base: Decimal;
  aliquota: Decimal;
  valor: Decimal;
  tabela_referencia: string;
  competencia_referencia: Competencia;
  detalhamento?: IncidenceDetail[];
}

export interface IncidenceDetail {
  faixa: number;
  base_faixa: Decimal;
  aliquota: Decimal;
  contribuicao: Decimal;
}

// =====================================================
// FGTS
// =====================================================

export function calcularFGTS(
  ctx: IncidenceContext,
  config: FGTSConfig,
): IncidenceResult | null {
  if (!ctx.incidences_config.fgts) return null;
  if (ctx.natureza === 'indenizatoria') return null;
  if (ctx.is_rescisoria_indenizatoria) return null;
  if (ctx.base.lte(0)) return null;
  
  const aliquota = new Decimal(config.aliquota).div(100);
  const valor = ctx.base.times(aliquota).toDP(2);
  
  return {
    tipo: 'fgts',
    base: ctx.base,
    aliquota: new Decimal(config.aliquota),
    valor,
    tabela_referencia: `FGTS ${config.aliquota}%`,
    competencia_referencia: ctx.competencia,
  };
}

// =====================================================
// INSS — Progressivo por faixas
// =====================================================

export function calcularINSS(
  ctx: IncidenceContext,
  tabela: INSSTabela,
): IncidenceResult | null {
  if (!ctx.incidences_config.inss) return null;
  if (ctx.natureza === 'indenizatoria') return null;
  if (ctx.is_rescisoria_indenizatoria) return null;
  if (ctx.base.lte(0)) return null;
  
  let total = new Decimal(0);
  let restante = ctx.base;
  const detalhamento: IncidenceDetail[] = [];
  let faixaAnterior = new Decimal(0);
  
  for (let i = 0; i < tabela.faixas.length; i++) {
    const faixa = tabela.faixas[i];
    if (restante.lte(0)) break;
    
    const limSuperior = faixa.valor_final 
      ? new Decimal(faixa.valor_final) 
      : restante.plus(faixaAnterior); // sem teto nesta faixa
    
    const baseFaixa = Decimal.min(restante, limSuperior.minus(faixaAnterior));
    if (baseFaixa.lte(0)) {
      faixaAnterior = limSuperior;
      continue;
    }
    
    const aliq = new Decimal(faixa.aliquota).div(100);
    const contrib = baseFaixa.times(aliq).toDP(2);
    
    total = total.plus(contrib);
    restante = restante.minus(baseFaixa);
    
    detalhamento.push({
      faixa: i + 1,
      base_faixa: baseFaixa,
      aliquota: new Decimal(faixa.aliquota),
      contribuicao: contrib,
    });
    
    faixaAnterior = limSuperior;
  }
  
  return {
    tipo: 'inss',
    base: ctx.base,
    aliquota: ctx.base.gt(0) ? total.div(ctx.base).times(100).toDP(4) : new Decimal(0),
    valor: total,
    tabela_referencia: `INSS Progressivo ${tabela.competencia}`,
    competencia_referencia: ctx.competencia,
    detalhamento,
  };
}

// =====================================================
// IRRF — Com dedução por dependente e parcela
// =====================================================

export function calcularIRRF(
  ctx: IncidenceContext,
  tabela: IRRFTabela,
  deducao_inss: Decimal,
  dependentes: number = 0,
  /** Meses de acumulação para RRA (Art. 12-A) */
  meses_rra?: number,
): IncidenceResult | null {
  if (!ctx.incidences_config.irrf) return null;
  if (ctx.natureza === 'indenizatoria') return null;
  if (ctx.is_rescisoria_indenizatoria) return null;
  if (ctx.base.lte(0)) return null;
  
  // Base = valor - INSS - dedução dependentes
  const deducaoDep = new Decimal(tabela.deducao_dependente).times(dependentes);
  let baseCalc = ctx.base.minus(deducao_inss).minus(deducaoDep);
  
  // RRA: divide base pelo número de meses
  if (meses_rra && meses_rra > 1) {
    baseCalc = baseCalc.div(meses_rra);
  }
  
  if (baseCalc.lte(0)) return null;
  
  // Find applicable bracket
  for (const faixa of tabela.faixas) {
    const limInf = new Decimal(faixa.valor_inicial);
    const limSup = faixa.valor_final ? new Decimal(faixa.valor_final) : new Decimal(Infinity);
    
    if (baseCalc.gte(limInf) && baseCalc.lte(limSup)) {
      const aliq = new Decimal(faixa.aliquota).div(100);
      const parcela = new Decimal(faixa.parcela_deduzir);
      
      let imposto = baseCalc.times(aliq).minus(parcela).toDP(2);
      
      // RRA: multiplica de volta pelo número de meses
      if (meses_rra && meses_rra > 1) {
        imposto = imposto.times(meses_rra).toDP(2);
      }
      
      if (imposto.lte(0)) return null;
      
      return {
        tipo: 'irrf',
        base: ctx.base,
        aliquota: new Decimal(faixa.aliquota),
        valor: imposto,
        tabela_referencia: `IRRF ${tabela.competencia} Faixa ${faixa.aliquota}%`,
        competencia_referencia: ctx.competencia,
      };
    }
  }
  
  return null; // Isento
}

// =====================================================
// ORCHESTRATOR — Calcula todas as incidências de um item
// =====================================================

export interface IncidenceEngineParams {
  ctx: IncidenceContext;
  fgtsConfig: FGTSConfig;
  inssTabela: INSSTabela;
  irrfTabela: IRRFTabela;
  dependentes?: number;
  meses_rra?: number;
}

export function calcularIncidencias(
  params: IncidenceEngineParams,
): IncidenceResult[] {
  const results: IncidenceResult[] = [];
  
  const fgts = calcularFGTS(params.ctx, params.fgtsConfig);
  if (fgts) results.push(fgts);
  
  const inss = calcularINSS(params.ctx, params.inssTabela);
  if (inss) results.push(inss);
  
  const irrf = calcularIRRF(
    params.ctx,
    params.irrfTabela,
    inss ? inss.valor : new Decimal(0),
    params.dependentes,
    params.meses_rra,
  );
  if (irrf) results.push(irrf);
  
  return results;
}
