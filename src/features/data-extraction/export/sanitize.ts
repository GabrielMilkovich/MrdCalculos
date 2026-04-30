/**
 * Remove caracteres proibidos pelo parser do PJe-Calc Cidadão e trunca.
 *
 * O parser oficial:
 *   - Remove TODAS as `"` antes do split por `;` → aspa nunca pode aparecer.
 *   - Faz split por `;` → ponto-e-vírgula em campo texto quebra o split.
 *   - Lê linha por linha → quebra de linha em campo texto quebra a linha.
 *
 * Aplicar em: justificativa de faltas (max 200), relativa de férias (max 50).
 */
export function sanitizeText(s: string | null | undefined, maxLen: number): string {
  if (!s) return '';
  return s
    .replace(/[;\n\r"]/g, ' ')
    .trim()
    .slice(0, maxLen);
}
