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

/**
 * Versão que devolve metadados sobre o que foi alterado pela sanitização.
 * Útil para builders que querem registrar warnings de paridade quando
 * o texto original foi truncado ou teve caracteres trocados.
 *
 * `truncado` é true quando `maxLen` cortou o texto.
 * `caracteresRemovidos` é true quando `;`, `\n`, `\r`, `"` ou caracteres
 * de controle foram trocados por espaço (perda informacional sutil).
 */
export function sanitizeTextWithMeta(
  s: string | null | undefined,
  maxLen: number,
): {
  texto: string;
  truncado: boolean;
  caracteresRemovidos: boolean;
  original: string;
} {
  if (!s) {
    return {
      texto: "",
      truncado: false,
      caracteresRemovidos: false,
      original: s ?? "",
    };
  }
  const original = s;
  const semCtrl = stripControlChars(s);
  const semInjecao = semCtrl.replace(/[;\n\r"]/g, " ");
  const trimado = semInjecao.trim();
  const cortado = trimado.slice(0, maxLen);
  return {
    texto: csvSafeCell(cortado),
    truncado: trimado.length > maxLen,
    caracteresRemovidos: semInjecao !== semCtrl || semCtrl !== s,
    original,
  };
}
