/**
 * PDF Report Engine - Formatting Utilities
 *
 * Consistent number, date, and currency formatting for all report sections.
 * All formatters use pt-BR locale for Brazilian legal document standards.
 */

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter2 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter4 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export const fmt = {
  /**
   * Format as BRL currency: R$ 1.234,56
   */
  currency(v: number): string {
    return currencyFormatter.format(v || 0);
  },

  /**
   * Format as plain number with 2 decimal places: 1.234,56
   */
  decimal(v: number): string {
    return numberFormatter2.format(v || 0);
  },

  /**
   * Format a number with custom decimal places
   */
  number(v: number, decimals = 2): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v || 0);
  },

  /**
   * Format a 4-decimal number (for correction indices, multipliers, etc.)
   */
  index(v: number): string {
    return numberFormatter4.format(v || 0);
  },

  /**
   * Format as percentage: 8,00%
   */
  percent(v: number): string {
    return `${(v || 0).toFixed(2)}%`;
  },

  /**
   * Format ISO date string (YYYY-MM-DD) to DD/MM/YYYY
   */
  date(d: string | undefined | null): string {
    if (!d) return '\u2014'; // em dash
    const parts = d.substring(0, 10).split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  /**
   * Format competencia: "2024-01" or "2024-01-01" to "jan/2024"
   */
  competencia(c: string | undefined | null): string {
    if (!c) return '\u2014';
    const clean = c.substring(0, 7); // "YYYY-MM"
    const [year, month] = clean.split('-');
    if (!year || !month) return c;
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const idx = parseInt(month, 10) - 1;
    if (idx < 0 || idx > 11) return c;
    return `${months[idx]}/${year}`;
  },

  /**
   * Format competencia as short: "01/2024"
   */
  competenciaShort(c: string | undefined | null): string {
    if (!c) return '\u2014';
    const clean = c.substring(0, 7);
    const [year, month] = clean.split('-');
    if (!year || !month) return c;
    return `${month}/${year}`;
  },

  /**
   * Escape HTML special characters
   */
  escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
};
