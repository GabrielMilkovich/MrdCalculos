/**
 * Motor de Reflexos Automáticos
 * Gera reflexos padrão (13º, Férias+1/3, Aviso, RSR) a partir de verbas base.
 * Baseado na estrutura real do PJC: Reflexo → FormulaReflexo → BaseVerba → ItemBaseVerba
 */

export interface ReflexoTemplate {
  sufixo: string;
  caracteristica: string;
  ocorrencia_pagamento: string;
  comportamento_reflexo: 'valor_mensal' | 'media_valor_absoluto' | 'media_valor_corrigido' | 'media_quantidade' | 'media_pela_quantidade';
  periodo_media_reflexo?: 'ano_civil' | 'periodo_aquisitivo' | 'global';
  tratamento_fracao_mes: 'manter_fracao' | 'integralizar' | 'desprezar' | 'desprezar_menor_15';
  multiplicador: number;
  divisor_tipo: string;
  divisor_valor: number;
  tipo_quantidade: string;
  gerar_principal: 'devido' | 'diferenca';
  gerar_reflexo: 'devido' | 'diferenca';
  incidencias: { fgts: boolean; irpf: boolean; cs: boolean };
  ordem_offset: number;
  /** Whether to integralize base values before calculating the reflexo */
  integralizar_base?: boolean;
}

// Templates padrão de reflexos do PJe-Calc
export const REFLEXO_TEMPLATES: ReflexoTemplate[] = [
  {
    sufixo: '13º SALÁRIO',
    caracteristica: '13_salario',
    ocorrencia_pagamento: 'dezembro',
    comportamento_reflexo: 'media_pela_quantidade',
    periodo_media_reflexo: 'ano_civil',
    tratamento_fracao_mes: 'desprezar_menor_15',
    multiplicador: 1,
    divisor_tipo: 'informado',
    divisor_valor: 12,
    tipo_quantidade: 'avos',
    gerar_principal: 'diferenca',
    gerar_reflexo: 'diferenca',
    incidencias: { fgts: true, irpf: true, cs: true },
    ordem_offset: 100,
  },
  {
    sufixo: 'FÉRIAS + 1/3',
    caracteristica: 'ferias',
    ocorrencia_pagamento: 'periodo_aquisitivo',
    comportamento_reflexo: 'media_pela_quantidade',
    periodo_media_reflexo: 'periodo_aquisitivo',
    tratamento_fracao_mes: 'desprezar_menor_15',
    multiplicador: 4 / 3,
    divisor_tipo: 'informado',
    divisor_valor: 12,
    tipo_quantidade: 'avos',
    gerar_principal: 'diferenca',
    gerar_reflexo: 'diferenca',
    incidencias: { fgts: true, irpf: true, cs: true },
    ordem_offset: 200,
  },
  {
    sufixo: 'AVISO PRÉVIO',
    caracteristica: 'aviso_previo',
    ocorrencia_pagamento: 'desligamento',
    comportamento_reflexo: 'media_pela_quantidade',
    tratamento_fracao_mes: 'integralizar',
    multiplicador: 1,
    divisor_tipo: 'informado',
    divisor_valor: 12,
    tipo_quantidade: 'avos',
    gerar_principal: 'diferenca',
    gerar_reflexo: 'diferenca',
    incidencias: { fgts: true, irpf: true, cs: true },
    ordem_offset: 300,
  },
  {
    sufixo: 'REPOUSO SEMANAL REMUNERADO',
    caracteristica: 'comum',
    ocorrencia_pagamento: 'mensal',
    comportamento_reflexo: 'valor_mensal',
    tratamento_fracao_mes: 'manter_fracao',
    multiplicador: 1,
    divisor_tipo: 'dias_uteis',
    divisor_valor: 22,
    tipo_quantidade: 'repousos',
    gerar_principal: 'diferenca',
    gerar_reflexo: 'diferenca',
    incidencias: { fgts: true, irpf: true, cs: true },
    ordem_offset: 50,
  },
  {
    sufixo: 'MULTA ART. 477 CLT',
    caracteristica: 'comum',
    ocorrencia_pagamento: 'desligamento',
    comportamento_reflexo: 'media_valor_absoluto',
    tratamento_fracao_mes: 'integralizar',
    multiplicador: 1,
    divisor_tipo: 'informado',
    divisor_valor: 1,
    tipo_quantidade: 'informada',
    gerar_principal: 'diferenca',
    gerar_reflexo: 'diferenca',
    incidencias: { fgts: false, irpf: false, cs: false },
    ordem_offset: 400,
  },
];

export interface VerbaBase {
  id: string;
  nome: string;
  ordem: number;
  incidencias: { fgts: boolean; irpf: boolean; cs: boolean };
}

export interface ReflexoGerado {
  nome: string;
  tipo: 'reflexa';
  verba_principal_id: string;
  verba_principal_nome: string;
  caracteristica: string;
  ocorrencia_pagamento: string;
  comportamento_reflexo: string;
  periodo_media_reflexo?: string;
  tratamento_fracao_mes: string;
  multiplicador: number;
  divisor_tipo: string;
  divisor_valor: number;
  tipo_quantidade: string;
  gerar_principal: string;
  gerar_reflexo: string;
  incidencias: { fgts: boolean; irpf: boolean; cs: boolean };
  ordem: number;
  base_verbas: string[]; // IDs das verbas base
  integralizar_base?: boolean;
}

/**
 * Gera todos os reflexos padrão para uma lista de verbas base.
 * Exclui reflexos que não fazem sentido (ex: RSR sobre verba que já é RSR).
 */
export function gerarReflexosPadrao(
  verbasBase: VerbaBase[],
  templates: ReflexoTemplate[] = REFLEXO_TEMPLATES,
  excludeTemplates: string[] = [],
): ReflexoGerado[] {
  const reflexos: ReflexoGerado[] = [];

  for (const vb of verbasBase) {
    const nomeUpper = vb.nome.toUpperCase();

    for (const tmpl of templates) {
      // Skip excluded templates
      if (excludeTemplates.includes(tmpl.sufixo)) continue;

      // Skip RSR sobre RSR
      if (tmpl.sufixo.includes('REPOUSO') && nomeUpper.includes('REPOUSO')) continue;
      if (tmpl.sufixo.includes('REPOUSO') && nomeUpper.includes('RSR')) continue;

      // Skip 13º sobre 13º
      if (tmpl.sufixo.includes('13º') && nomeUpper.includes('13')) continue;

      // Skip Aviso sobre Aviso
      if (tmpl.sufixo.includes('AVISO') && nomeUpper.includes('AVISO')) continue;

      // Skip Férias sobre Férias
      if (tmpl.sufixo.includes('FÉRIAS') && nomeUpper.includes('FÉRIAS')) continue;
      if (tmpl.sufixo.includes('FÉRIAS') && nomeUpper.includes('FERIAS')) continue;

      // Skip multa 477 sobre multa 477
      if (tmpl.sufixo.includes('477') && nomeUpper.includes('477')) continue;

      reflexos.push({
        nome: `${tmpl.sufixo} SOBRE ${vb.nome}`,
        tipo: 'reflexa',
        verba_principal_id: vb.id,
        verba_principal_nome: vb.nome,
        caracteristica: tmpl.caracteristica,
        ocorrencia_pagamento: tmpl.ocorrencia_pagamento,
        comportamento_reflexo: tmpl.comportamento_reflexo,
        periodo_media_reflexo: tmpl.periodo_media_reflexo,
        tratamento_fracao_mes: tmpl.tratamento_fracao_mes,
        multiplicador: tmpl.multiplicador,
        divisor_tipo: tmpl.divisor_tipo,
        divisor_valor: tmpl.divisor_valor,
        tipo_quantidade: tmpl.tipo_quantidade,
        gerar_principal: tmpl.gerar_principal,
        gerar_reflexo: tmpl.gerar_reflexo,
        incidencias: { ...tmpl.incidencias },
        ordem: vb.ordem + tmpl.ordem_offset,
        base_verbas: [vb.id],
        integralizar_base: tmpl.integralizar_base,
      });
    }
  }

  return reflexos.sort((a, b) => a.ordem - b.ordem);
}

/**
 * Gera reflexos seletivos (o usuário escolhe quais templates aplicar)
 */
export function gerarReflexosSeletivos(
  verbasBase: VerbaBase[],
  templateSufixos: string[],
): ReflexoGerado[] {
  const templates = REFLEXO_TEMPLATES.filter(t => templateSufixos.includes(t.sufixo));
  return gerarReflexosPadrao(verbasBase, templates);
}

/**
 * Lista os nomes dos templates disponíveis
 */
export function listarTemplatesReflexo(): { sufixo: string; caracteristica: string; descricao: string }[] {
  return REFLEXO_TEMPLATES.map(t => ({
    sufixo: t.sufixo,
    caracteristica: t.caracteristica,
    descricao: `${t.sufixo} — ${t.comportamento_reflexo}, div ${t.divisor_valor}, mult ${t.multiplicador}`,
  }));
}

// ── Cascade definitions ──
// PJe-Calc cascade rules: DSR/RSR sobre HE → 13º sobre DSR → Férias sobre 13º
interface CascadeRule {
  /** Template sufixo that generates the source reflexo */
  sourceSufixo: string;
  /** Template sufixos to apply on top of that source reflexo */
  targetSufixos: string[];
}

const CASCADE_RULES: CascadeRule[] = [
  {
    // DSR/RSR sobre HE → then 13º and Férias cascade on top of DSR
    sourceSufixo: 'REPOUSO SEMANAL REMUNERADO',
    targetSufixos: ['13º SALÁRIO', 'FÉRIAS + 1/3'],
  },
  {
    // 13º sobre DSR → then Férias cascades on top of 13º
    sourceSufixo: '13º SALÁRIO',
    targetSufixos: ['FÉRIAS + 1/3'],
  },
];

/**
 * Gera reflexos com cascatas completas (reflexo-sobre-reflexo).
 *
 * PJe-Calc cascade: DSR sobre HE → 13º sobre DSR → Férias sobre 13º.
 * The engine's DAG (processVerba topological sort) handles execution order;
 * this function generates the cascade ENTRIES so the engine has them.
 *
 * @param verbasBase - verbas principais (e.g., Horas Extras)
 * @param templates - reflexo templates to use (defaults to REFLEXO_TEMPLATES)
 * @param excludeTemplates - template sufixos to skip
 * @param enableCascade - whether to generate reflexo-on-reflexo entries (default true)
 */
export function gerarReflexosComCascata(
  verbasBase: VerbaBase[],
  templates: ReflexoTemplate[] = REFLEXO_TEMPLATES,
  excludeTemplates: string[] = [],
  enableCascade = true,
): ReflexoGerado[] {
  // Step 1: Generate direct reflexos (level 1)
  const directReflexos = gerarReflexosPadrao(verbasBase, templates, excludeTemplates);

  if (!enableCascade) return directReflexos;

  // Step 2: Generate cascade reflexos (level 2+)
  const cascadeReflexos: ReflexoGerado[] = [];
  let nextOrdemOffset = 500; // cascade entries start after direct reflexos

  for (const rule of CASCADE_RULES) {
    // Find all level-1 reflexos that match the source template
    const sourceReflexos = directReflexos.filter(r =>
      r.nome.startsWith(rule.sourceSufixo + ' SOBRE'),
    );

    for (const sourceRef of sourceReflexos) {
      // Skip if excluded
      if (excludeTemplates.includes(rule.sourceSufixo)) continue;

      for (const targetSufixo of rule.targetSufixos) {
        if (excludeTemplates.includes(targetSufixo)) continue;

        const targetTemplate = templates.find(t => t.sufixo === targetSufixo);
        if (!targetTemplate) continue;

        // Avoid generating duplicates (e.g., 13º SOBRE 13º SOBRE ...)
        const cascadeName = `${targetSufixo} SOBRE ${sourceRef.nome}`;
        if (cascadeReflexos.some(r => r.nome === cascadeName)) continue;
        if (directReflexos.some(r => r.nome === cascadeName)) continue;

        // Skip self-referential cascades
        if (targetSufixo.includes('13º') && sourceRef.nome.includes('13º')) continue;
        if (targetSufixo.includes('FÉRIAS') && sourceRef.nome.includes('FÉRIAS')) continue;
        if (targetSufixo.includes('REPOUSO') && sourceRef.nome.includes('REPOUSO')) continue;

        // Generate a virtual verba_principal_id for this cascade.
        // The engine resolves this via verbaResultsMap keyed by verba.id.
        const cascadeId = `cascade_${sourceRef.verba_principal_id}_${rule.sourceSufixo}_${targetSufixo}`.replace(/\s+/g, '_');

        cascadeReflexos.push({
          nome: cascadeName,
          tipo: 'reflexa',
          verba_principal_id: sourceRef.nome, // will be resolved by name in the engine DAG
          verba_principal_nome: sourceRef.nome,
          caracteristica: targetTemplate.caracteristica,
          ocorrencia_pagamento: targetTemplate.ocorrencia_pagamento,
          comportamento_reflexo: targetTemplate.comportamento_reflexo,
          periodo_media_reflexo: targetTemplate.periodo_media_reflexo,
          tratamento_fracao_mes: targetTemplate.tratamento_fracao_mes,
          multiplicador: targetTemplate.multiplicador,
          divisor_tipo: targetTemplate.divisor_tipo,
          divisor_valor: targetTemplate.divisor_valor,
          tipo_quantidade: targetTemplate.tipo_quantidade,
          gerar_principal: targetTemplate.gerar_principal,
          gerar_reflexo: targetTemplate.gerar_reflexo,
          incidencias: { ...targetTemplate.incidencias },
          ordem: sourceRef.ordem + nextOrdemOffset++,
          base_verbas: [sourceRef.verba_principal_id],
          integralizar_base: targetTemplate.integralizar_base,
        });
      }
    }
  }

  return [...directReflexos, ...cascadeReflexos].sort((a, b) => a.ordem - b.ordem);
}
