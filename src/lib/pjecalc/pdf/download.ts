/**
 * PDF Report Engine - Download Service
 *
 * Provides functions to trigger PDF print dialog and download HTML reports.
 */

/**
 * Download HTML as a file (for offline printing or archival).
 *
 * Hardened: throws clear errors if File API is unavailable, sanitizes
 * filename against path-separator injection, and revokes Object URL even
 * when click fails.
 */
export function downloadHTML(html: string, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('downloadHTML: ambiente sem suporte a File API (SSR/Node).');
  }
  const safeName = (filename || 'mrd_calc_report.html')
    .replace(/[\x00-\x1f<>:"/\\|?*]+/g, '_')
    .trim()
    .slice(0, 200) || 'mrd_calc_report.html';

  const blob = new Blob([html ?? ''], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  let a: HTMLAnchorElement | null = null;
  try {
    a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
  } finally {
    try {
      if (a && a.parentNode) a.parentNode.removeChild(a);
    } catch {
      /* ignore */
    }
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Generate a standardized filename for reports.
 *
 * @param tipo - Report type identifier (e.g. 'Memoria', 'Completo', 'Resumo')
 * @param processo - Process number (optional)
 * @param data - Date string YYYY-MM-DD (optional, defaults to today)
 * @returns Filename like "MRD_CALC_Memoria_12345678_2024-01-15.html"
 */
export function generateFilename(
  tipo: string,
  processo?: string,
  data?: string
): string {
  const dateStr = data || new Date().toISOString().substring(0, 10);
  const sanitizedProcesso = processo
    ? processo.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 40)
    : '';
  const parts = ['MRD_CALC', tipo];
  if (sanitizedProcesso) parts.push(sanitizedProcesso);
  parts.push(dateStr);
  return parts.join('_') + '.html';
}

/**
 * Open HTML in a new window and trigger print dialog.
 * This is the standard approach for "Save as PDF" via browser print.
 */
export function openAndPrint(html: string): void {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }
}
