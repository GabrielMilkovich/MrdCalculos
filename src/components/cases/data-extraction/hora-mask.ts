/**
 * Helpers de máscara para inputs de hora HH:MM nos review dialogs.
 *
 * Uso típico no onChange:
 *   <Input value={r.e} onChange={(e) => updateE(applyHoraMask(e.target.value))} />
 *
 * Comportamento:
 *   - Aceita apenas dígitos e `:`. Outros caracteres são ignorados.
 *   - Auto-insere `:` após 2 dígitos quando o usuário digita 4 dígitos seguidos
 *     ("0830" → "08:30").
 *   - Trunca em 5 chars (HH:MM).
 *   - Vazio → vazio (permite limpar a célula).
 */

/**
 * Aplica máscara incremental enquanto o usuário digita. Não valida ranges
 * (24h, 60min) — isso fica para validação no submit.
 */
export function applyHoraMask(raw: string): string {
  if (!raw) return "";
  // Mantém só dígitos.
  const digitos = raw.replace(/\D/g, "").slice(0, 4);
  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

/**
 * Variação que aceita "8:30" → "08:30" no blur (completa para 2 dígitos
 * cada lado). Usar no onBlur para não atrapalhar a digitação.
 */
export function normalizeHoraOnBlur(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/^(\d{1,2}):?(\d{0,2})$/);
  if (!m) return raw; // mantém valor inválido para o usuário corrigir
  const hh = m[1].padStart(2, "0");
  const mm = (m[2] || "00").padStart(2, "0");
  return `${hh}:${mm}`;
}
