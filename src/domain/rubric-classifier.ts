/**
 * =====================================================
 * RUBRIC CLASSIFIER — Classificação de Rubricas e Fontes
 * =====================================================
 * 
 * Classifica rubricas de folha/TRCT em categorias canônicas.
 * Explica por que uma rubrica entrou em determinada base.
 */

import type { Rubric, RubricClassification, RubricNature, RubricFamily, RubricIncidenceConfig, UUID } from './types';

// =====================================================
// CANONICAL RUBRIC CATALOG
// =====================================================

export const CANONICAL_RUBRICS: Rubric[] = [
  // --- JORNADA ---
  { id: 'HE_50', codigo: 'HE_50', nome: 'Horas Extras 50%', familia: 'jornada', natureza: 'salarial', aliases: ['horas extras', 'hora extra 50', 'he 50%', 'adicional hora extra'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'HE_100', codigo: 'HE_100', nome: 'Horas Extras 100%', familia: 'jornada', natureza: 'salarial', aliases: ['hora extra 100', 'he 100%', 'horas extras domingos', 'horas extras feriados'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'HE_FIXA', codigo: 'HE_FIXA', nome: 'Horas Extras Parte Fixa', familia: 'jornada', natureza: 'salarial', aliases: ['he parte fixa'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'HE_VAR', codigo: 'HE_VAR', nome: 'Horas Extras Parte Variável', familia: 'jornada', natureza: 'salarial', aliases: ['he parte variável', 'he comissão'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'INTRAJORNADA', codigo: 'INTRAJORNADA', nome: 'Intervalo Intrajornada', familia: 'jornada', natureza: 'salarial', aliases: ['intervalo suprimido', 'intrajornada', 'intervalo não concedido'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'INTERJORNADA', codigo: 'INTERJORNADA', nome: 'Intervalo Interjornadas', familia: 'jornada', natureza: 'salarial', aliases: ['interjornada', '11 horas'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'ART384', codigo: 'ART384', nome: 'Art. 384 CLT', familia: 'jornada', natureza: 'salarial', aliases: ['art 384', 'intervalo mulher'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'DOM_FER', codigo: 'DOM_FER', nome: 'Domingos e Feriados Laborados', familia: 'jornada', natureza: 'salarial', aliases: ['feriados laborados', 'domingos trabalhados', 'trabalho em feriado'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },

  // --- VARIÁVEIS / COMISSÕES ---
  { id: 'COMISSAO', codigo: 'COMISSAO', nome: 'Comissões', familia: 'comissao', natureza: 'salarial', aliases: ['comissão', 'comissões', 'commission'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'DIF_COMISSAO', codigo: 'DIF_COMISSAO', nome: 'Diferenças de Comissão', familia: 'comissao', natureza: 'salarial', aliases: ['diferença de comissão', 'diferenças comissão'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'COMISSAO_ESTORNADA', codigo: 'COMISSAO_ESTORNADA', nome: 'Comissões Estornadas', familia: 'comissao', natureza: 'salarial', aliases: ['estorno comissão', 'comissão estornada', 'canceladas'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'PREMIO', codigo: 'PREMIO', nome: 'Prêmio/Meta', familia: 'comissao', natureza: 'salarial', aliases: ['prêmio', 'meta', 'prêmio estímulo', 'bonificação'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },

  // --- CONTRATUAIS / RESCISÓRIAS ---
  { id: 'SALDO_SAL', codigo: 'SALDO_SAL', nome: 'Saldo de Salário', familia: 'rescisoria', natureza: 'salarial', aliases: ['saldo salário', 'salário do mês'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: false },
  { id: 'AVISO_PREVIO', codigo: 'AVISO_PREVIO', nome: 'Aviso Prévio Indenizado', familia: 'rescisoria', natureza: 'indenizatoria', aliases: ['aviso prévio', 'aviso prévio indenizado'], incidences: { fgts: true, inss: false, irrf: false, previdencia_privada: false, pensao_alimenticia: false }, gera_reflexos: true },
  { id: 'FERIAS_VENC', codigo: 'FERIAS_VENC', nome: 'Férias Vencidas + 1/3', familia: 'rescisoria', natureza: 'indenizatoria', aliases: ['férias vencidas', 'férias indenizadas'], incidences: { fgts: true, inss: false, irrf: false, previdencia_privada: false, pensao_alimenticia: false }, gera_reflexos: false },
  { id: 'FERIAS_PROP', codigo: 'FERIAS_PROP', nome: 'Férias Proporcionais + 1/3', familia: 'rescisoria', natureza: 'indenizatoria', aliases: ['férias proporcionais'], incidences: { fgts: true, inss: false, irrf: false, previdencia_privada: false, pensao_alimenticia: false }, gera_reflexos: false },
  { id: '13_SAL', codigo: '13_SAL', nome: '13º Salário Proporcional', familia: 'rescisoria', natureza: 'salarial', aliases: ['décimo terceiro', '13º salário', 'gratificação natalina'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: false },
  { id: 'FGTS', codigo: 'FGTS', nome: 'FGTS Incidente', familia: 'tributario', natureza: 'salarial', aliases: ['fgts'], incidences: { fgts: false, inss: false, irrf: false, previdencia_privada: false, pensao_alimenticia: false }, gera_reflexos: false },
  { id: 'MULTA_40', codigo: 'MULTA_40', nome: 'Multa 40% FGTS', familia: 'rescisoria', natureza: 'indenizatoria', aliases: ['multa fundiária', 'multa 40%', 'multa fgts'], incidences: { fgts: false, inss: false, irrf: false, previdencia_privada: false, pensao_alimenticia: false }, gera_reflexos: false },
  { id: 'MULTA_467', codigo: 'MULTA_467', nome: 'Multa Art. 467 CLT', familia: 'rescisoria', natureza: 'indenizatoria', aliases: ['multa 467', 'art 467'], incidences: { fgts: false, inss: false, irrf: false, previdencia_privada: false, pensao_alimenticia: false }, gera_reflexos: false },
  { id: 'MULTA_477', codigo: 'MULTA_477', nome: 'Multa Art. 477 CLT', familia: 'rescisoria', natureza: 'indenizatoria', aliases: ['multa 477', 'art 477', 'atraso rescisão'], incidences: { fgts: false, inss: false, irrf: false, previdencia_privada: false, pensao_alimenticia: false }, gera_reflexos: false },
  { id: 'PLR', codigo: 'PLR', nome: 'PLR Proporcional', familia: 'contratual', natureza: 'salarial', aliases: ['plr', 'participação lucros'], incidences: { fgts: false, inss: false, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: false },
  { id: 'SAL_SUBST', codigo: 'SAL_SUBST', nome: 'Salário Substituição', familia: 'contratual', natureza: 'salarial', aliases: ['salário substituição', 'diferença salarial'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },

  // --- REFLEXOS ---
  { id: 'DSR', codigo: 'DSR', nome: 'DSR / RSR', familia: 'reflexo', natureza: 'salarial', aliases: ['dsr', 'rsr', 'repouso semanal', 'descanso semanal'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: true },
  { id: 'REFL_13', codigo: 'REFL_13', nome: 'Reflexo em 13º Salário', familia: 'reflexo', natureza: 'salarial', aliases: ['reflexo 13º', 'reflexo décimo terceiro'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: false },
  { id: 'REFL_FERIAS', codigo: 'REFL_FERIAS', nome: 'Reflexo em Férias + 1/3', familia: 'reflexo', natureza: 'salarial', aliases: ['reflexo férias', 'reflexo em férias'], incidences: { fgts: true, inss: true, irrf: true, previdencia_privada: false, pensao_alimenticia: true }, gera_reflexos: false },
  { id: 'REFL_AVISO', codigo: 'REFL_AVISO', nome: 'Reflexo em Aviso Prévio', familia: 'reflexo', natureza: 'salarial', aliases: ['reflexo aviso', 'reflexo aviso prévio'], incidences: { fgts: true, inss: false, irrf: false, previdencia_privada: false, pensao_alimenticia: false }, gera_reflexos: false },
  { id: 'REFL_FGTS', codigo: 'REFL_FGTS', nome: 'Reflexo em FGTS', familia: 'reflexo', natureza: 'salarial', aliases: ['reflexo fgts'], incidences: { fgts: false, inss: false, irrf: false, previdencia_privada: false, pensao_alimenticia: false }, gera_reflexos: false },
];

// =====================================================
// CLASSIFICATION ENGINE
// =====================================================

/**
 * Classify a source rubric name to canonical rubric.
 */
export function classifyRubric(
  sourceName: string,
  catalog: Rubric[] = CANONICAL_RUBRICS,
): RubricClassification | null {
  const normalized = sourceName.trim().toUpperCase();
  
  // 1. Exact match by code
  const exactCode = catalog.find(r => r.codigo === normalized);
  if (exactCode) {
    return {
      id: crypto.randomUUID?.() || Math.random().toString(36),
      source_name: sourceName,
      canonical_rubric_id: exactCode.id,
      confidence: 1.0,
      method: 'exact',
    };
  }
  
  // 2. Exact match by name
  const exactName = catalog.find(r => r.nome.toUpperCase() === normalized);
  if (exactName) {
    return {
      id: crypto.randomUUID?.() || Math.random().toString(36),
      source_name: sourceName,
      canonical_rubric_id: exactName.id,
      confidence: 1.0,
      method: 'exact',
    };
  }
  
  // 3. Alias match
  for (const rubric of catalog) {
    for (const alias of rubric.aliases) {
      if (alias.toUpperCase() === normalized || normalized.includes(alias.toUpperCase())) {
        return {
          id: crypto.randomUUID?.() || Math.random().toString(36),
          source_name: sourceName,
          canonical_rubric_id: rubric.id,
          confidence: 0.9,
          method: 'alias',
        };
      }
    }
  }
  
  // 4. Fuzzy match (simple word overlap)
  const sourceWords = new Set(normalized.split(/\s+/).filter(w => w.length > 2));
  let bestMatch: Rubric | null = null;
  let bestScore = 0;
  
  for (const rubric of catalog) {
    const allTerms = [rubric.nome, ...rubric.aliases].join(' ').toUpperCase();
    const targetWords = new Set(allTerms.split(/\s+/).filter(w => w.length > 2));
    
    let overlap = 0;
    for (const w of sourceWords) {
      if (targetWords.has(w)) overlap++;
    }
    
    const score = sourceWords.size > 0 ? overlap / sourceWords.size : 0;
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = rubric;
    }
  }
  
  if (bestMatch) {
    return {
      id: crypto.randomUUID?.() || Math.random().toString(36),
      source_name: sourceName,
      canonical_rubric_id: bestMatch.id,
      confidence: Math.min(bestScore, 0.8),
      method: 'fuzzy',
    };
  }
  
  return null; // Unclassified — needs human review
}

/**
 * Get a canonical rubric by code.
 */
export function getRubricByCode(code: string): Rubric | undefined {
  return CANONICAL_RUBRICS.find(r => r.codigo === code);
}

/**
 * Get all rubrics that generate reflexos.
 */
export function getReflexiveRubrics(): Rubric[] {
  return CANONICAL_RUBRICS.filter(r => r.gera_reflexos);
}

/**
 * Get rubrics by family.
 */
export function getRubricsByFamily(family: RubricFamily): Rubric[] {
  return CANONICAL_RUBRICS.filter(r => r.familia === family);
}
