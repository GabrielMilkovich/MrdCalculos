import JSZip from 'jszip';
import type { ZipExportPayload } from '../types';
import { buildLeiaMe } from './leia-me';

/**
 * Empacota os CSVs em um ZIP. Apenas categorias com `linhas > 0` entram.
 * `LEIA-ME.txt` sempre presente.
 *
 * Pure: não toca DOM/window. Browser-side helper em `download.ts`.
 */
export async function buildZip(payload: ZipExportPayload): Promise<Blob> {
  const zip = new JSZip();

  for (const h of payload.historicoSalarialCSVs) {
    if (h.linhas > 0) {
      zip.file(`historico_salarial_${h.slug}.csv`, h.csv);
    }
  }
  if (payload.feriasCsv && payload.feriasCsv.linhas > 0) {
    zip.file('ferias.csv', payload.feriasCsv.csv);
  }
  if (payload.faltasCsv && payload.faltasCsv.linhas > 0) {
    zip.file('faltas.csv', payload.faltasCsv.csv);
  }

  zip.file('LEIA-ME.txt', buildLeiaMe(payload));

  return zip.generateAsync({ type: 'blob' });
}

/** Conta CSVs efetivamente exportados (úteis no botão "Baixar ZIP (N CSVs)"). */
export function countCsvsToExport(payload: ZipExportPayload): number {
  let n = 0;
  for (const h of payload.historicoSalarialCSVs) if (h.linhas > 0) n++;
  if (payload.feriasCsv && payload.feriasCsv.linhas > 0) n++;
  if (payload.faltasCsv && payload.faltasCsv.linhas > 0) n++;
  return n;
}

/** Sanitiza string para nome de arquivo sem path traversal. */
export function sanitizeFilename(s: string): string {
  return s
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

export function buildZipFilename(caseSlug: string, dateIso?: string): string {
  const date = (dateIso ?? new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  return `pjecalc_export_${sanitizeFilename(caseSlug)}_${date}.zip`;
}
