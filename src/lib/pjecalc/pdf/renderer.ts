/**
 * PDF Report Engine - Core Renderer
 *
 * Orchestrates section rendering and HTML assembly.
 * Uses an iframe-based print approach for deterministic output:
 * - Full CSS @page control
 * - thead repeat on every printed page
 * - page-break-before for section boundaries
 * - No external dependencies (pure HTML/CSS)
 */
import type { PDFRenderContext, PDFSection, PDFReportConfig } from './types';
import { buildReportHTML } from './template';

/**
 * Render all visible sections into a complete HTML document string.
 */
export function renderSections(
  sections: PDFSection[],
  ctx: PDFRenderContext
): string {
  const visibleSections = sections.filter(s => s.visible);

  const sectionHTMLs = visibleSections.map((section, index) => {
    const html = section.render(ctx);
    if (!html || html.trim() === '') return '';

    const pageBreak = section.pageBreakBefore && index > 0
      ? '<div class="page-break"></div>'
      : '';

    return `${pageBreak}
<!-- Section: ${section.id} -->
<div id="section-${section.id}" class="report-section">
  ${html}
</div>`;
  });

  return buildReportHTML(
    sectionHTMLs.filter(h => h !== ''),
    ctx.config,
    { printButton: true }
  );
}

/**
 * Open rendered HTML in a new window for printing.
 * This is the primary "print to PDF" approach.
 */
export function openForPrint(html: string): void {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }
}

/**
 * Print via hidden iframe for more deterministic output.
 * Creates a temporary iframe, writes the HTML, triggers print, then cleans up.
 */
export function printViaIframe(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        reject(new Error('Could not access iframe document'));
        return;
      }

      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // Wait for content to load, then print
      const onLoad = () => {
        try {
          iframe.contentWindow?.print();
        } catch {
          // Fallback: open in new window
          openForPrint(html);
        }
        // Clean up after a delay to ensure print dialog has opened
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
          resolve();
        }, 1000);
      };

      iframe.onload = onLoad;
      // Fallback if onload doesn't fire
      setTimeout(onLoad, 2000);
    } catch (err) {
      reject(err);
    }
  });
}
