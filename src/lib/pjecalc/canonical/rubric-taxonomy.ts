/**
 * =====================================================
 * TAXONOMIA CANÔNICA DE RUBRICAS
 * =====================================================
 * 
 * Mapeamento robusto entre rubricas PJe-Calc, MRDcalc e documentos.
 * Impede que o sistema calcule rubricas "parecidas" sem validação.
 */

export interface CanonicalRubric {
  /** Código canônico MRDcalc (ex: 'HE_50', 'DSR_HE', 'COMISSOES') */
  code: string;
  /** Nome canônico para exibição */
  name: string;
  /** Aliases reconhecidos (PJe-Calc, documentos, nomes variantes) */
  aliases: string[];
  /** Natureza jurídica */
  natureza: 'remuneratoria' | 'indenizatoria' | 'mista';
  /** Incidências padrão */
  incidencias: {
    fgts: boolean;
    inss: boolean;
    irrf: boolean;
  };
  /** Compõe principal na liquidação? */
  compoe_principal: boolean;
  /** Pode gerar reflexo? */
  gera_reflexo: boolean;
  /** Depende de jornada real? */
  depende_jornada: boolean;
  /** Depende de histórico salarial? */
  depende_historico: boolean;
  /** Depende de base de comissão? */
  depende_comissao: boolean;
  /** Característica PJe-Calc */
  caracteristica: 'comum' | '13_salario' | 'ferias' | 'aviso_previo';
  /** Ocorrência pagamento */
  ocorrencia_pagamento: 'mensal' | 'dezembro' | 'periodo_aquisitivo' | 'desligamento';
  /** Fórmula padrão (texto descritivo) */
  formula_descricao?: string;
  /** Categoria agrupadora */
  categoria: string;
}

/**
 * Catálogo canônico de rubricas trabalhistas.
 * Cada entrada define: código, nome, aliases, incidências e dependências.
 */
export const RUBRIC_CATALOG: CanonicalRubric[] = [
  // ── HORAS EXTRAS ──
  {
    code: 'HE_50', name: 'Horas Extras 50%',
    aliases: ['HORAS EXTRAS 50%', 'HE 50%', 'HORA EXTRA 50%', 'HORAS EXTRAS A 50%', 'Horas extras 50%'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: true, depende_historico: true, depende_comissao: false,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'jornada',
    formula_descricao: 'Base / Divisor × 1.5 × Quantidade',
  },
  {
    code: 'HE_100', name: 'Horas Extras 100%',
    aliases: ['HORAS EXTRAS 100%', 'HE 100%', 'HORA EXTRA 100%', 'HORAS EXTRAS A 100%'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: true, depende_historico: true, depende_comissao: false,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'jornada',
    formula_descricao: 'Base / Divisor × 2.0 × Quantidade',
  },
  // ── DSR ──
  {
    code: 'DSR_HE', name: 'DSR sobre Horas Extras',
    aliases: ['DSR S/ HORAS EXTRAS', 'DSR SOBRE HORAS EXTRAS', 'REPOUSO SEMANAL REMUNERADO', 'RSR SOBRE HE', 'DSR/HE'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: true, depende_historico: false, depende_comissao: false,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'jornada',
  },
  {
    code: 'DSR_COMISSAO', name: 'DSR sobre Comissões (Comissionista)',
    aliases: ['REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', 'DSR COMISSÕES', 'RSR COMISSÃO', 'DSR S/ COMISSÕES'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: false, depende_historico: true, depende_comissao: true,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'comissao',
  },
  // ── COMISSÕES ──
  {
    code: 'COMISSOES', name: 'Comissões',
    aliases: ['COMISSÕES', 'COMISSÕES DEVIDAS', 'COMISSAO'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: false, depende_historico: true, depende_comissao: true,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'comissao',
  },
  {
    code: 'DIF_COMISSOES_CANCELADAS', name: 'Dif. Comissões Canceladas',
    aliases: ['DIF. COMISSÕES - CANCELADAS', 'COMISSÕES CANCELADAS', 'COMISSÕES ESTORNADAS', 'DIFERENÇA COMISSÕES CANCELADAS'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: false, depende_historico: true, depende_comissao: true,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'comissao',
  },
  // ── INTERVALO ──
  {
    code: 'INTERVALO_INTRAJORNADA', name: 'Intervalo Intrajornada',
    aliases: ['INTERVALO INTRAJORNADA', 'INTRAJORNADA', 'SUPRESSÃO DO INTERVALO', 'INTERVALO P/ REPOUSO'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: true, depende_historico: true, depende_comissao: false,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'jornada',
  },
  // ── DOMINGOS E FERIADOS ──
  {
    code: 'DOMINGOS_FERIADOS', name: 'Domingos e Feriados Trabalhados',
    aliases: ['DOMINGOS E FERIADOS TRABALHADOS', 'FERIADOS LABORADOS', 'DOMINGOS TRABALHADOS', 'FERIADOS TRABALHADOS'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: true, depende_historico: true, depende_comissao: false,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'jornada',
  },
  // ── ADICIONAL NOTURNO ──
  {
    code: 'ADICIONAL_NOTURNO', name: 'Adicional Noturno',
    aliases: ['ADICIONAL NOTURNO', 'AD. NOTURNO', 'HORA NOTURNA'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: true, depende_historico: true, depende_comissao: false,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'jornada',
  },
  // ── REFLEXOS ──
  {
    code: 'REFLEXO_13', name: 'Reflexo em 13º Salário',
    aliases: ['REFLEXO EM 13º SALÁRIO', 'REFLEXO 13O', '13º REFLEXO'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: false, depende_jornada: false, depende_historico: false, depende_comissao: false,
    caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro', categoria: 'reflexo',
  },
  {
    code: 'REFLEXO_FERIAS', name: 'Reflexo em Férias + 1/3',
    aliases: ['REFLEXO EM FÉRIAS + 1/3', 'REFLEXO FÉRIAS', 'FÉRIAS REFLEXO'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: false, depende_jornada: false, depende_historico: false, depende_comissao: false,
    caracteristica: 'ferias', ocorrencia_pagamento: 'periodo_aquisitivo', categoria: 'reflexo',
  },
  // ── AVISO PRÉVIO ──
  {
    code: 'AVISO_PREVIO', name: 'Aviso Prévio Indenizado',
    aliases: ['AVISO PRÉVIO INDENIZADO', 'AVISO PRÉVIO', 'AVISO INDENIZADO'],
    natureza: 'indenizatoria', incidencias: { fgts: true, inss: false, irrf: false },
    compoe_principal: true, gera_reflexo: false, depende_jornada: false, depende_historico: true, depende_comissao: false,
    caracteristica: 'aviso_previo', ocorrencia_pagamento: 'desligamento', categoria: 'rescisorio',
  },
  // ── FÉRIAS ──
  {
    code: 'FERIAS_VENCIDAS', name: 'Férias Vencidas + 1/3',
    aliases: ['FÉRIAS VENCIDAS', 'FÉRIAS + 1/3', 'FÉRIAS VENCIDAS + 1/3'],
    natureza: 'indenizatoria', incidencias: { fgts: true, inss: false, irrf: true },
    compoe_principal: true, gera_reflexo: false, depende_jornada: false, depende_historico: true, depende_comissao: false,
    caracteristica: 'ferias', ocorrencia_pagamento: 'periodo_aquisitivo', categoria: 'ferias',
  },
  {
    code: 'FERIAS_PROPORCIONAIS', name: 'Férias Proporcionais + 1/3',
    aliases: ['FÉRIAS PROPORCIONAIS', 'FÉRIAS PROPORCIONAIS + 1/3'],
    natureza: 'indenizatoria', incidencias: { fgts: true, inss: false, irrf: true },
    compoe_principal: true, gera_reflexo: false, depende_jornada: false, depende_historico: true, depende_comissao: false,
    caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', categoria: 'ferias',
  },
  // ── 13º ──
  {
    code: 'DECIMO_TERCEIRO', name: '13º Salário',
    aliases: ['13º SALÁRIO', 'DÉCIMO TERCEIRO', '13O SALÁRIO'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: false, depende_jornada: false, depende_historico: true, depende_comissao: false,
    caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro', categoria: 'rescisorio',
  },
  // ── MULTAS ──
  {
    code: 'MULTA_467', name: 'Multa Art. 467 CLT',
    aliases: ['MULTA 467', 'ART. 467', 'MULTA ART. 467'],
    natureza: 'indenizatoria', incidencias: { fgts: false, inss: false, irrf: false },
    compoe_principal: false, gera_reflexo: false, depende_jornada: false, depende_historico: false, depende_comissao: false,
    caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', categoria: 'multa',
  },
  {
    code: 'MULTA_477', name: 'Multa Art. 477 CLT',
    aliases: ['MULTA 477', 'ART. 477', 'MULTA ART. 477'],
    natureza: 'indenizatoria', incidencias: { fgts: false, inss: false, irrf: false },
    compoe_principal: false, gera_reflexo: false, depende_jornada: false, depende_historico: false, depende_comissao: false,
    caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', categoria: 'multa',
  },
  // ── DIF. SALARIAL / COVID ──
  {
    code: 'DIF_SALARIAL_COVID', name: 'Diferença Salarial COVID (MP 936)',
    aliases: ['DIF. SALARIAL COVID', 'DIFERENÇA SALARIAL COVID', 'DIFERENÇA SALARIAL MP 936', 'REDUÇÃO 25%', 'SUSPENSÃO CONTRATUAL'],
    natureza: 'remuneratoria', incidencias: { fgts: true, inss: true, irrf: true },
    compoe_principal: true, gera_reflexo: true, depende_jornada: false, depende_historico: true, depende_comissao: false,
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal', categoria: 'salarial',
  },
];

/**
 * Encontra a rubrica canônica mais próxima dado um nome/alias.
 * Retorna null se nenhuma correspondência for encontrada.
 */
export function findCanonicalRubric(name: string): CanonicalRubric | null {
  const normalized = name.trim().toUpperCase().replace(/\s+/g, ' ');

  // Exact match by code
  const byCode = RUBRIC_CATALOG.find(r => r.code === normalized);
  if (byCode) return byCode;

  // Exact match by alias
  for (const rubric of RUBRIC_CATALOG) {
    for (const alias of rubric.aliases) {
      if (alias.toUpperCase() === normalized) return rubric;
    }
  }

  // Fuzzy: check if name contains any alias or vice versa
  for (const rubric of RUBRIC_CATALOG) {
    for (const alias of rubric.aliases) {
      const normAlias = alias.toUpperCase();
      if (normalized.includes(normAlias) || normAlias.includes(normalized)) {
        return rubric;
      }
    }
  }

  return null;
}

/**
 * Valida se duas rubricas são equivalentes (mesma canônica).
 * Se não forem mapeáveis, retorna 'unknown'.
 */
export function compareRubrics(
  nameA: string,
  nameB: string,
): 'equivalent' | 'different' | 'unknown' {
  const rubricA = findCanonicalRubric(nameA);
  const rubricB = findCanonicalRubric(nameB);

  if (!rubricA || !rubricB) return 'unknown';
  if (rubricA.code === rubricB.code) return 'equivalent';
  return 'different';
}

/**
 * Mapeia uma lista de nomes de verbas para seus códigos canônicos,
 * retornando os não mapeados como warnings.
 */
export function mapToCanonical(names: string[]): {
  mapped: { original: string; canonical: CanonicalRubric }[];
  unmapped: string[];
} {
  const mapped: { original: string; canonical: CanonicalRubric }[] = [];
  const unmapped: string[] = [];

  for (const name of names) {
    const rubric = findCanonicalRubric(name);
    if (rubric) {
      mapped.push({ original: name, canonical: rubric });
    } else {
      unmapped.push(name);
    }
  }

  return { mapped, unmapped };
}
