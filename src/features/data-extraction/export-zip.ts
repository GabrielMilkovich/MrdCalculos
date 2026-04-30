/**
 * Empacota os 3 CSVs + LEIA-ME em ZIP e dispara download via Blob URL.
 *
 * Side-effect-free na geração do Blob (testável). Apenas o `triggerDownload`
 * toca em `document` / `URL.createObjectURL` (browser-only).
 */

import JSZip from 'jszip';

import {
  buildFaltasCSV,
  buildFeriasCSV,
  buildHistoricoSalarialCSV,
} from './export-csv';
import { CATEGORY_CSV_FILENAME } from './constants';
import type { FaltasRow, FeriasRow, HistoricoSalarialRow } from './types';

export interface ExportPayload {
  historicoSalarial: HistoricoSalarialRow[];
  ferias: FeriasRow[];
  faltas: FaltasRow[];
  /** Nome legível do caso (vai em LEIA-ME para rastreio). */
  caseLabel?: string;
}

/** Texto do LEIA-ME.txt incluído no ZIP. Briefing §8. */
function buildReadme(caseLabel?: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return [
    'INSTRUÇÕES DE IMPORTAÇÃO NO PJe-CALC CIDADÃO',
    '=============================================',
    '',
    `Gerado em: ${stamp}`,
    caseLabel ? `Caso: ${caseLabel}` : null,
    '',
    'Estes 3 arquivos CSV foram gerados pelo MRD Calc no formato esperado',
    'pelo PJe-Calc Cidadão (versão 2.5.4 ou superior).',
    '',
    'ANTES DE IMPORTAR:',
    '',
    '1. FÉRIAS (ferias.csv)',
    '   O PJe-Calc só aceita o CSV de férias se os PERÍODOS AQUISITIVOS',
    '   já estiverem cadastrados no cálculo. Crie-os manualmente na aba',
    '   "Férias" do PJe-Calc antes de importar este CSV. O identificador',
    '   "relativa" (ex: "2023/2024") deve bater exatamente.',
    '',
    '2. HISTÓRICO SALARIAL (historico_salarial.csv)',
    '   As flags FGTS/INSS foram extraídas com defaults S/S/S/S.',
    '   Revise se há rubricas não tributáveis no caso concreto.',
    '',
    '3. FALTAS (faltas.csv)',
    '   O campo "Justificativa" é truncado em 200 caracteres e tem',
    '   ponto-e-vírgula, quebras de linha e aspas removidos.',
    '',
    'COMO IMPORTAR:',
    '1. Abra o cálculo no PJe-Calc Cidadão.',
    '2. Vá na aba correspondente (Histórico Salarial / Férias / Faltas).',
    '3. Clique no botão "Importar CSV" da aba.',
    '4. Selecione o arquivo CSV correspondente.',
    '',
    'ENCODING: UTF-8 (sem BOM).',
    'DELIMITADOR: ponto-e-vírgula (;).',
    'DECIMAL: vírgula (formato brasileiro).',
    'BOOLEANOS: S (sim) / N (não).',
  ]
    .filter(line => line !== null)
    .join('\n');
}

/**
 * Gera o Blob do ZIP. Pure (não toca em DOM). Testável.
 */
export async function buildExportZip(payload: ExportPayload): Promise<Blob> {
  const zip = new JSZip();
  zip.file(CATEGORY_CSV_FILENAME.historico_salarial, buildHistoricoSalarialCSV(payload.historicoSalarial));
  zip.file(CATEGORY_CSV_FILENAME.ferias, buildFeriasCSV(payload.ferias));
  zip.file(CATEGORY_CSV_FILENAME.faltas, buildFaltasCSV(payload.faltas));
  zip.file('LEIA-ME.txt', buildReadme(payload.caseLabel));
  return zip.generateAsync({ type: 'blob' });
}

/**
 * Browser-only: dispara download. Wrapped em try/finally para garantir
 * revoke do object URL (evita memory leak).
 */
export async function downloadExportZip(payload: ExportPayload, filename = 'pjecalc_export.zip'): Promise<void> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('downloadExportZip requer ambiente browser (document/URL).');
  }
  const blob = await buildExportZip(payload);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(filename);
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Remove control chars + path traversal do filename. */
function sanitizeFilename(name: string): string {
  // Permite \w . - _ e remove resto. Limita tamanho.
  return name.replace(/[\x00-\x1f<>:"/\\|?*]/g, '_').slice(0, 100) || 'export.zip';
}
