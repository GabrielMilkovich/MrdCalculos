/**
 * Sanitização de texto antes de entrar no CSV.
 *
 * O parser oficial do PJe-Calc:
 *   - Remove TODAS as `"` antes do split por `;` → aspa nunca pode aparecer.
 *   - Faz split por `;` → ponto-e-vírgula em campo texto quebra o split.
 *   - Lê linha por linha → quebra de linha em campo texto quebra a linha.
 *
 * Adicionalmente, esta função protege contra:
 *   - **CSV formula injection**: Excel/LibreOffice/Sheets executam fórmulas
 *     quando uma célula começa com `=`, `+`, `-` ou `@`. Vetor LGPD/segurança
 *     real (CVE-2014-3524 e derivados). Prefixamos com aspa-simples na primeira
 *     posição quando detectado.
 *   - **Caracteres de controle invisíveis** (NUL, vertical tab, form feed,
 *     etc.) — alguns OCRs vazam isso e travam parsers strict.
 *
 * Aplicar em: justificativa de faltas (max 200), relativa de férias (max 50),
 * nomes de rubrica e quaisquer outros campos de texto-livre.
 */
import { csvSafeCell, stripControlChars } from "./validation";

export function sanitizeText(
  s: string | null | undefined,
  maxLen: number,
): string {
  if (!s) return "";
  const limpo = stripControlChars(s)
    .replace(/[;\n\r"]/g, " ")
    .trim()
    .slice(0, maxLen);
  return csvSafeCell(limpo);
}
