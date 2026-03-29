/**
 * Section: Warnings & Audit Notes
 *
 * Renders calculation warnings, fallback notices, and audit information
 * collected during engine execution.
 */
import type { PDFRenderContext } from '../types';

export function renderWarnings(ctx: PDFRenderContext): string {
  const warnings = ctx.result.calculation_warnings || [];
  if (warnings.length === 0) return '';

  return `
    <div class="section page-break-before">
      <h3>Avisos e Ressalvas do Calculo</h3>
      <table class="data-table">
        <thead><tr><th>Codigo</th><th>Modulo</th><th>Mensagem</th></tr></thead>
        <tbody>
          ${warnings.map(w => `<tr><td>${w.code}</td><td>${w.module}</td><td>${w.message}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}
