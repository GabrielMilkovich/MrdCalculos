/**
 * PDF Report Engine - HTML Template Assembly
 *
 * Builds a complete standalone HTML document from rendered sections + config.
 * Includes @page rules, @media print, CSS counters, and table header repeat.
 */
import type { PDFReportConfig } from './types';

/**
 * Base CSS for the PDF report.
 * Designed for deterministic print output:
 * - @page rules for margins and size
 * - thead repeats on every page
 * - page-break utilities
 * - Consistent serif/monospace fonts for legal documents
 */
function getBaseCSS(config: PDFReportConfig): string {
  const { margins, fontSize, fontFamily, fontFamilyMono } = config;
  const pageOrientation = config.orientation === 'landscape' ? 'landscape' : 'portrait';
  const pageSize = config.pageSize === 'Letter' ? 'letter' : 'A4';

  return `
/* ── Page rules ── */
@page {
  size: ${pageSize} ${pageOrientation};
  margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
}

/* ── Reset ── */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

/* ── Body ── */
body {
  font-family: ${fontFamily};
  font-size: ${fontSize.body}pt;
  color: #000;
  line-height: 1.35;
  background: #fff;
}

/* ── Page header ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #003366;
  padding-bottom: 4px;
  margin-bottom: 8px;
}
.page-header-left { font-size: ${fontSize.small}pt; color: #555; }
.page-header-right { text-align: right; font-size: ${fontSize.small}pt; color: #555; }
.page-header-center { text-align: center; flex: 1; }
.page-header-center h1 { font-size: ${fontSize.title}pt; color: #003366; margin: 0; font-weight: 700; }
.page-header-center .subtitle { font-size: ${fontSize.subtitle}pt; color: #333; }

/* ── Section titles ── */
h2 {
  font-size: 9pt;
  font-weight: 700;
  color: #003366;
  margin: 14px 0 6px;
  padding: 3px 0;
  border-bottom: 1px solid #003366;
}
h3 { font-size: 8pt; font-weight: 700; color: #003366; margin: 8px 0 4px; }

/* ── Info grid (key-value pairs) ── */
.info-grid { margin: 4px 0 10px; }
.info-row { display: flex; margin-bottom: 1px; }
.info-label {
  font-weight: 700; width: 280px; font-size: 7.5pt;
  color: #333; padding: 2px 4px; background: #f5f5f5; border: 1px solid #ddd;
}
.info-value {
  font-size: 7.5pt; padding: 2px 6px;
  border: 1px solid #ddd; border-left: none; flex: 1;
}

/* ── Tables ── */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 4px 0 10px;
  font-size: ${fontSize.table}pt;
}
thead { display: table-header-group; }
tfoot { display: table-footer-group; }
th {
  background: #003366;
  color: #fff;
  font-weight: 700;
  text-align: center;
  padding: 3px 4px;
  border: 1px solid #003366;
  font-size: ${fontSize.small}pt;
}
td {
  padding: 2px 4px;
  border: 1px solid #ccc;
}
td.num, th.num {
  text-align: right;
  font-family: ${fontFamilyMono};
}
td.left { text-align: left; }
td.center { text-align: center; }
tr:nth-child(even) { background: #f9f9f9; }
tr.total-row { background: #e6edf5; font-weight: 700; }
tr.total-row td { border-color: #999; }
tr.grand-total { background: #003366; color: #fff; font-weight: 700; }
tr.grand-total td { border-color: #003366; }
tr.deduction td { color: #990000; }
tr.subtotal td { font-weight: 700; border-top: 2px solid #003366; background: #e6edf5; }

/* ── Summary boxes ── */
.resumo-valores { display: flex; gap: 16px; margin: 12px 0 16px; justify-content: center; }
.resumo-box {
  text-align: center; padding: 10px 20px;
  border: 2px solid #003366; border-radius: 4px; background: #f0f4fa;
}
.resumo-box .label { font-size: ${fontSize.small}pt; color: #555; text-transform: uppercase; letter-spacing: 0.3px; }
.resumo-box .value {
  font-size: 16pt; font-weight: 800; color: #003366;
  font-family: ${fontFamilyMono}; margin-top: 2px;
}
.resumo-box.danger { border-color: #cc0000; background: #fff5f5; }
.resumo-box.danger .value { color: #cc0000; }

/* ── Page footer ── */
.page-footer {
  margin-top: 12px; padding-top: 4px; border-top: 1px solid #ccc;
  display: flex; justify-content: space-between;
  font-size: 6.5pt; color: #888;
}

/* ── Signature block ── */
.assinatura-block { display: flex; gap: 60px; justify-content: center; margin-top: 30px; }
.assinatura-line {
  text-align: center; padding-top: 30px;
  border-top: 1px solid #333;
  font-size: ${fontSize.small}pt; color: #333; min-width: 200px;
}

/* ── Page break utilities ── */
.page-break { page-break-before: always; }
.avoid-break { page-break-inside: avoid; }
.break-after { page-break-after: always; }

/* ── Badge ── */
.badge {
  background: #e0e7ff; color: #3730a3;
  padding: 1px 6px; border-radius: 3px;
  font-size: 6pt; font-weight: 600; margin-left: 6px;
}

/* ── Print media ── */
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
}

/* ── Screen-only controls (print button bar) ── */
@media screen {
  .btn-bar {
    position: fixed; top: 8px; right: 8px; z-index: 9999;
    display: flex; gap: 8px;
  }
  .btn-bar button {
    padding: 8px 20px; background: #003366; color: white;
    border: none; border-radius: 4px;
    font-size: 11px; font-weight: 700; cursor: pointer;
  }
  .btn-bar button:hover { background: #004488; }
}
`;
}

/**
 * Assemble a complete HTML document from rendered section HTML strings.
 */
export function buildReportHTML(
  sections: string[],
  config: PDFReportConfig,
  options?: { printButton?: boolean }
): string {
  const showPrintButton = options?.printButton ?? true;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>${getBaseCSS(config)}</style>
</head>
<body>
  ${showPrintButton ? `
  <div class="btn-bar no-print">
    <button onclick="window.print()">Imprimir / Salvar PDF</button>
    <button onclick="window.close()">Fechar</button>
  </div>` : ''}
  ${sections.join('\n')}
</body>
</html>`;
}
