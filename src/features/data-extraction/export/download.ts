import type { ZipExportPayload } from '../types';
import { buildZip, buildZipFilename } from './zip';

/**
 * Browser-only helper: gera ZIP e dispara download. Revoga o object URL
 * em finally para evitar leak. Não tem teste unitário (depende de DOM).
 */
export async function downloadZip(payload: ZipExportPayload): Promise<void> {
  const blob = await buildZip(payload);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = buildZipFilename(payload.caseSlug);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
