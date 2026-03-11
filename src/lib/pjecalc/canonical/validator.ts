/**
 * =====================================================
 * VALIDADOR GLOBAL DE COMPLETUDE DOS INSUMOS
 * =====================================================
 * 
 * Impede que o cálculo rode com insumos críticos ausentes.
 * Gera relatório de completude com score por módulo.
 */

import type {
  CanonicalCaseInput,
  InputFieldMeta,
  InputValidationResult,
  ValidationFinding,
  ValidationSeverity,
  ModuleScore,
} from './types';

// =====================================================
// FIELD INSPECTION UTILITIES
// =====================================================

function inspectField(
  meta: InputFieldMeta<unknown>,
  module: string,
  field: string,
  label: string,
): ValidationFinding | null {
  if (!meta.isResolved && meta.blocksCalculation) {
    return {
      code: meta.warningCode || `E_${module.toUpperCase()}_${field.toUpperCase()}`,
      severity: 'blocker',
      module,
      field,
      message: `${label}: campo obrigatório não resolvido`,
      message_friendly: `O campo "${label}" é obrigatório e bloqueia o cálculo.`,
      suggestion: `Preencha o campo "${label}" antes de executar a liquidação.`,
    };
  }
  if (!meta.isResolved && meta.isRequired) {
    return {
      code: meta.warningCode || `W_${module.toUpperCase()}_${field.toUpperCase()}`,
      severity: 'warning',
      module,
      field,
      message: `${label}: campo recomendado não resolvido`,
      message_friendly: `O campo "${label}" não foi preenchido. O cálculo pode ficar impreciso.`,
    };
  }
  if (meta.isInferred) {
    return {
      code: `I_${module.toUpperCase()}_${field.toUpperCase()}`,
      severity: 'info',
      module,
      field,
      message: `${label}: valor inferido (confiança ${(meta.confidence * 100).toFixed(0)}%)`,
      message_friendly: `O campo "${label}" foi preenchido automaticamente por inferência.`,
    };
  }
  if (meta.source === 'default_audited') {
    return {
      code: `I_${module.toUpperCase()}_${field.toUpperCase()}_DEFAULT`,
      severity: 'info',
      module,
      field,
      message: `${label}: usando valor default auditado`,
      message_friendly: `O campo "${label}" está usando um valor padrão. Revise se aplicável.`,
    };
  }
  return null;
}

function countFields(obj: unknown): { total: number; resolved: number; inferred: number; absent: number; blockers: number } {
  let total = 0, resolved = 0, inferred = 0, absent = 0, blockers = 0;

  function walk(val: unknown): void {
    if (!val || typeof val !== 'object') return;
    if ('isResolved' in (val as object) && 'source' in (val as object)) {
      const meta = val as InputFieldMeta<unknown>;
      total++;
      if (meta.isResolved) resolved++;
      if (meta.isInferred) inferred++;
      if (!meta.isResolved && meta.source === 'absent') absent++;
      if (!meta.isResolved && meta.blocksCalculation) blockers++;
      return;
    }
    if (Array.isArray(val)) {
      val.forEach(walk);
    } else {
      Object.values(val).forEach(walk);
    }
  }
  walk(obj);
  return { total, resolved, inferred, absent, blockers };
}

// =====================================================
// MAIN VALIDATOR
// =====================================================

export function validateCanonicalInput(input: CanonicalCaseInput): InputValidationResult {
  const findings: ValidationFinding[] = [];

  // ── TEMPORAL MARKS ──
  const temporalFields: [InputFieldMeta<unknown>, string, string][] = [
    [input.temporal.data_admissao, 'data_admissao', 'Data de Admissão'],
    [input.temporal.data_ajuizamento, 'data_ajuizamento', 'Data de Ajuizamento'],
    [input.temporal.data_liquidacao, 'data_liquidacao', 'Data de Liquidação'],
  ];
  for (const [meta, field, label] of temporalFields) {
    const f = inspectField(meta, 'temporal', field, label);
    if (f) findings.push(f);
  }
  // Citação: blocker only if monetary regime requires it
  if (input.monetary.combinacoes_indice.isResolved) {
    const combos = input.monetary.combinacoes_indice.value;
    const needsCitacao = combos.some(c => c.indice === 'SELIC' || c.indice === 'SEM_CORRECAO');
    if (needsCitacao && !input.temporal.data_citacao.isResolved) {
      findings.push({
        code: 'E_TEMPORAL_CITACAO_ADC58',
        severity: 'blocker',
        module: 'temporal',
        field: 'data_citacao',
        message: 'Data de citação obrigatória para regime ADC 58 (SELIC)',
        message_friendly: 'O regime monetário usa SELIC, mas a data de citação não foi informada.',
        suggestion: 'Informe a data de citação para definir a transição IPCA-E → SELIC.',
      });
    }
  }

  // ── SALARY HISTORY ──
  if (input.salary.length === 0) {
    const hasVerbas = input.verbas.length > 0;
    if (hasVerbas) {
      findings.push({
        code: 'E_SALARY_EMPTY',
        severity: 'blocker',
        module: 'salary',
        message: 'Nenhum histórico salarial informado, mas existem verbas a calcular',
        message_friendly: 'Verbas foram configuradas, mas não há histórico salarial para servir de base.',
        suggestion: 'Cadastre ao menos um histórico salarial.',
      });
    }
  } else {
    for (const h of input.salary) {
      if (h.ocorrencias.length === 0 && h.valor_informado.value == null) {
        findings.push({
          code: 'W_SALARY_NO_VALUES',
          severity: 'warning',
          module: 'salary',
          field: h.id,
          message: `Histórico "${h.nome.value}" sem valores mensais nem valor fixo`,
          message_friendly: `O histórico salarial "${h.nome.value}" não possui valores. A base de cálculo será zero.`,
        });
      }
    }
  }

  // ── VERBAS ──
  if (input.verbas.length === 0) {
    findings.push({
      code: 'W_VERBAS_EMPTY',
      severity: 'warning',
      module: 'verbas',
      message: 'Nenhuma verba cadastrada',
      message_friendly: 'Não há verbas para calcular.',
    });
  }
  for (const v of input.verbas) {
    // Verba depends on jornada but no timecard
    if (v.depende_jornada.value && input.jornada.cartao_ponto.length === 0) {
      findings.push({
        code: 'E_VERBA_JORNADA_MISSING',
        severity: 'blocker',
        module: 'verbas',
        field: v.id,
        message: `Verba "${v.nome.value}" depende de jornada, mas cartão de ponto ausente`,
        message_friendly: `A verba "${v.nome.value}" requer dados de jornada que não foram importados.`,
        suggestion: 'Importe cartões de ponto ou informe a jornada manualmente.',
      });
    }
    // Verba depends on historico but has none linked
    if (v.depende_historico.value && v.base_calculo_historicos.value.length === 0) {
      findings.push({
        code: 'W_VERBA_NO_BASE',
        severity: 'warning',
        module: 'verbas',
        field: v.id,
        message: `Verba "${v.nome.value}" sem base de cálculo vinculada`,
        message_friendly: `A verba "${v.nome.value}" não tem histórico salarial vinculado como base.`,
      });
    }
  }

  // ── MONETARY ──
  const monetaryF = inspectField(input.monetary.indice_principal, 'monetary', 'indice', 'Índice de Correção');
  if (monetaryF) findings.push(monetaryF);

  // ── REFERENCE TABLES ──
  const tablesCheck = [
    { meta: input.referenceTables.indices_correcao, field: 'indices', label: 'Índices de Correção' },
    { meta: input.referenceTables.faixas_inss, field: 'faixas_inss', label: 'Faixas INSS' },
    { meta: input.referenceTables.faixas_ir, field: 'faixas_ir', label: 'Faixas IR' },
  ];
  for (const t of tablesCheck) {
    if (t.meta.isResolved && !t.meta.value.loaded) {
      findings.push({
        code: `E_TABLE_${t.field.toUpperCase()}`,
        severity: 'blocker',
        module: 'reference_tables',
        field: t.field,
        message: `Tabela de referência "${t.label}" não carregada`,
        message_friendly: `A tabela "${t.label}" é necessária mas não está disponível.`,
        suggestion: 'Sincronize as tabelas de referência antes de liquidar.',
      });
    }
  }

  // ── TAXES: Check if encargos are configured when applicable ──
  if (input.taxes.fgts.apurar.value && !input.taxes.fgts.apurar.isResolved) {
    findings.push({
      code: 'W_FGTS_CONFIG',
      severity: 'warning',
      module: 'taxes',
      field: 'fgts',
      message: 'Configuração de FGTS não definida explicitamente',
      message_friendly: 'O módulo FGTS não foi configurado. Verifique se FGTS é aplicável.',
    });
  }

  // ── COMPUTE SCORES ──
  const moduleDefs: { key: string; label: string; data: unknown }[] = [
    { key: 'identification', label: 'Identificação', data: input.identification },
    { key: 'temporal', label: 'Marcos Temporais', data: input.temporal },
    { key: 'juridical', label: 'Parâmetros Jurídicos', data: input.juridical },
    { key: 'salary', label: 'Histórico Salarial', data: input.salary },
    { key: 'jornada', label: 'Jornada / Cartão Ponto', data: input.jornada },
    { key: 'verbas', label: 'Verbas', data: input.verbas },
    { key: 'monetary', label: 'Correção e Juros', data: input.monetary },
    { key: 'taxes', label: 'Encargos e Descontos', data: input.taxes },
    { key: 'reference_tables', label: 'Tabelas de Referência', data: input.referenceTables },
  ];

  const moduleScores: Record<string, ModuleScore> = {};
  let totalFields = 0;
  let resolvedTotal = 0;

  for (const mod of moduleDefs) {
    const counts = countFields(mod.data);
    totalFields += counts.total;
    resolvedTotal += counts.resolved;
    const modFindings = findings.filter(f => f.module === mod.key);
    const hasBlocker = modFindings.some(f => f.severity === 'blocker');
    const score = counts.total > 0 ? Math.round((counts.resolved / counts.total) * 100) : 100;

    moduleScores[mod.key] = {
      module: mod.key,
      label: mod.label,
      score,
      status: hasBlocker ? 'blocked' : counts.absent > 0 ? 'partial' : counts.total === 0 ? 'missing' : 'complete',
      findings: modFindings,
    };
  }

  const blockers = findings.filter(f => f.severity === 'blocker');
  const warnings = findings.filter(f => f.severity === 'warning');
  const infos = findings.filter(f => f.severity === 'info');
  const completenessScore = totalFields > 0 ? Math.round((resolvedTotal / totalFields) * 100) : 0;
  const unresolvedCritical = blockers.map(b => b.field || b.code);

  return {
    canProceed: blockers.length === 0,
    blockers,
    warnings,
    infos,
    completenessScore,
    moduleScores,
    resolvedFields: resolvedTotal,
    totalFields,
    unresolvedCritical,
  };
}
