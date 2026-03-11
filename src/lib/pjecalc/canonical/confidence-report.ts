/**
 * =====================================================
 * RELATÓRIO DE CONFIABILIDADE DO CÁLCULO
 * =====================================================
 * 
 * Gera score de confiabilidade por módulo antes de apresentar resultados.
 */

import type {
  CanonicalCaseInput,
  ConfidenceReport,
  ConfidenceModule,
  InputSourceSummary,
  InputFieldMeta,
  InputSource,
} from './types';

function walkFields(obj: unknown): InputFieldMeta<unknown>[] {
  const fields: InputFieldMeta<unknown>[] = [];
  function walk(val: unknown): void {
    if (!val || typeof val !== 'object') return;
    if ('isResolved' in (val as object) && 'source' in (val as object)) {
      fields.push(val as InputFieldMeta<unknown>);
      return;
    }
    if (Array.isArray(val)) val.forEach(walk);
    else Object.values(val).forEach(walk);
  }
  walk(obj);
  return fields;
}

function computeModuleScore(name: string, label: string, data: unknown): ConfidenceModule {
  const fields = walkFields(data);
  const resolved = fields.filter(f => f.isResolved).length;
  const inferred = fields.filter(f => f.isInferred).length;
  const absent = fields.filter(f => !f.isResolved && f.source === 'absent').length;
  const blockers = fields.filter(f => !f.isResolved && f.blocksCalculation).length;
  const score = fields.length > 0 ? Math.round((resolved / fields.length) * 100) : 100;

  return {
    name, label, score,
    fieldCount: fields.length,
    resolvedCount: resolved,
    inferredCount: inferred,
    absentCount: absent,
    blockerCount: blockers,
  };
}

export function generateConfidenceReport(input: CanonicalCaseInput): ConfidenceReport {
  const allFields = walkFields(input);

  // Source summary
  const sources: InputSourceSummary = {
    manual: 0, pjc_import: 0, document_extract: 0, ai_inferred: 0,
    database: 0, default_audited: 0, override: 0, absent: 0,
  };
  for (const f of allFields) {
    if (f.source in sources) {
      sources[f.source as keyof InputSourceSummary]++;
    }
  }

  // Module scores
  const moduleDefs: { key: string; label: string; data: unknown }[] = [
    { key: 'identification', label: 'Identificação', data: input.identification },
    { key: 'temporal', label: 'Marcos Temporais', data: input.temporal },
    { key: 'juridical', label: 'Parâmetros Jurídicos', data: input.juridical },
    { key: 'salary', label: 'Histórico Salarial', data: input.salary },
    { key: 'jornada', label: 'Jornada', data: input.jornada },
    { key: 'verbas', label: 'Verbas', data: input.verbas },
    { key: 'monetary', label: 'Correção/Juros', data: input.monetary },
    { key: 'taxes', label: 'Encargos', data: input.taxes },
    { key: 'reference_tables', label: 'Tabelas de Referência', data: input.referenceTables },
  ];

  const modules = moduleDefs.map(m => computeModuleScore(m.key, m.label, m.data));
  const overall = modules.length > 0
    ? Math.round(modules.reduce((s, m) => s + m.score, 0) / modules.length)
    : 0;

  const hasBlockers = modules.some(m => m.blockerCount > 0);
  const hasWarnings = modules.some(m => m.absentCount > 0 && m.blockerCount === 0);
  const missingCritical = allFields
    .filter(f => !f.isResolved && f.blocksCalculation)
    .map(f => f.warningCode || 'UNKNOWN')
    .filter((v, i, a) => a.indexOf(v) === i);

  const inferredFields = allFields
    .filter(f => f.isInferred)
    .map(f => f.warningCode || 'INFERRED')
    .filter((v, i, a) => a.indexOf(v) === i);

  const defaultedFields = allFields
    .filter(f => f.source === 'default_audited')
    .map(f => f.warningCode || 'DEFAULT')
    .filter((v, i, a) => a.indexOf(v) === i);

  let status: ConfidenceReport['status'];
  if (hasBlockers) status = 'bloqueado';
  else if (hasWarnings) status = 'apto_com_warnings';
  else status = 'apto';

  return {
    overall,
    status,
    modules,
    inputSources: sources,
    missingCritical,
    inferredFields,
    defaultedFields,
    timestamp: new Date().toISOString(),
  };
}
