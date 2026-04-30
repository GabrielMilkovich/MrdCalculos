/**
 * Normaliza nome de rubrica para lookup de memo:
 * - lowercase
 * - remove acentos (combining marks U+0300..U+036F)
 * - colapsa espaços múltiplos
 * - trim
 *
 * Match estável apesar de variações de OCR ("Comissões" vs "comissoes" vs
 * "ComissOes"). Não corrige typo; fuzzy match (Levenshtein) fica fora do MVP.
 */
export function normalizeNomeRubrica(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
