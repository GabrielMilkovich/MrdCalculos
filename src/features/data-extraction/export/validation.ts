/**
 * Camada de validação e auto-correção compartilhada pelos 4 builders de CSV.
 *
 * Filosofia:
 *   - **Validação dura**: linha com erro grave (data inválida, formato
 *     impossível) é REJEITADA e reportada — preserva integridade do CSV.
 *   - **Auto-correção**: ordenação cronológica, deduplicação, normalização
 *     de booleanos coerentes (ex: `abono=false` → `dias_abono=0`).
 *   - **CSV-safe**: bloqueia formula injection (`=`, `+`, `-`, `@` no início
 *     de célula → Excel/Calc/Sheets executam fórmula com dados externos).
 *     Vetor LGPD/segurança real.
 *   - **Determinístico**: mesma entrada → mesmo CSV.
 *
 * Cada builder retorna um `BuildReport` listando o que foi limpo, para o
 * dialog mostrar ao operador antes do download (transparência total).
 */

/**
 * Relatório do que aconteceu durante a construção do CSV. Builders devolvem
 * isso junto com o Blob para a UI dar feedback explícito.
 */
export interface BuildReport {
  /** Linhas válidas que entraram no CSV. */
  linhasGeradas: number;
  /** Linhas rejeitadas e o motivo. Limite 50 itens (resto contado em `linhasRejeitadasTotal`). */
  linhasRejeitadas: Array<{ idx: number; motivo: string; conteudo?: string }>;
  /** Linhas auto-corrigidas (dedup, ordenação, normalização de bool). */
  linhasAjustadas: Array<{ idx: number; ajuste: string }>;
  /** Avisos não-bloqueantes (cross-validation, suspeitas semânticas). */
  warnings: string[];
}

export function emptyReport(): BuildReport {
  return {
    linhasGeradas: 0,
    linhasRejeitadas: [],
    linhasAjustadas: [],
    warnings: [],
  };
}

/**
 * Bloqueia "formula injection" — quando uma célula CSV começa com `=`, `+`,
 * `-` ou `@`, Excel/LibreOffice/Sheets executam como FÓRMULA quando o usuário
 * abre o arquivo. Vetor de exfiltração de dados real (CVE-2014-3524 e
 * derivados). OWASP recomenda prefixar com apóstrofo `'` ou simplesmente
 * remover o caractere se o conteúdo é controlado.
 *
 * Aqui aplicamos a estratégia mais conservadora: prefixar com aspas-simples
 * apenas quando o caractere problemático aparece NA PRIMEIRA POSIÇÃO. Isso
 * preserva textos como "rubrica - desconto" no meio da string.
 */
export function csvSafeCell(s: string): string {
  if (!s) return s;
  const first = s.charAt(0);
  if (first === "=" || first === "+" || first === "-" || first === "@") {
    return `'${s}`;
  }
  return s;
}

/** Strip caracteres de controle (NUL, tabs invisíveis etc.) e normaliza espaços. */
export function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// ============================================================
// Datas
// ============================================================

const RE_DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_DATA_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const RE_RELATIVA = /^\d{4}\/\d{4}$/;
const RE_COMPETENCIA = /^(0[1-9]|1[0-2])\/\d{4}$/;
const RE_HHMM = /^(\d{1,2}):(\d{2})$/;

export function isDataIsoValida(s: string): boolean {
  const m = s.match(RE_DATA_ISO);
  if (!m) return false;
  return validarYMD(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
}

export function isDataBRValida(s: string): boolean {
  const m = s.match(RE_DATA_BR);
  if (!m) return false;
  return validarYMD(parseInt(m[3], 10), parseInt(m[2], 10), parseInt(m[1], 10));
}

function validarYMD(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 1900 || y > 2200) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  );
}

/** "01/03/2024" → "2024-03-01" se válida; null se inválida. */
export function dataBRtoIso(s: string): string | null {
  const m = s.match(RE_DATA_BR);
  if (!m) return null;
  const y = parseInt(m[3], 10);
  const mm = parseInt(m[2], 10);
  const d = parseInt(m[1], 10);
  if (!validarYMD(y, mm, d)) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** "2024-03-01" → "01/03/2024" se válida; null se inválida. */
export function dataIsoToBr(s: string): string | null {
  const m = s.match(RE_DATA_ISO);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (!validarYMD(y, mm, d)) return null;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Comparator pra sort cronológico de datas ISO (yyyy-mm-dd). */
export function compararDatasIso(a: string, b: string): number {
  return a.localeCompare(b);
}

// ============================================================
// Hora HH:MM
// ============================================================

/** "08:30" / "8:30" → "08:30" se válida (0-23, 0-59); null se inválida. */
export function normalizarHora(s: string): string | null {
  if (s === "" || s == null) return ""; // vazio é aceitável
  const m = s.match(RE_HHMM);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Converte HH:MM para minutos desde 00:00. null se inválido. */
export function hhmmToMin(s: string): number | null {
  const norm = normalizarHora(s);
  if (norm === null || norm === "") return null;
  const [h, m] = norm.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

// ============================================================
// Outros validadores
// ============================================================

export function isRelativaValida(s: string): boolean {
  if (!RE_RELATIVA.test(s)) return false;
  const [a, b] = s.split("/").map((x) => parseInt(x, 10));
  // Períodos aquisitivos válidos: a < b (ano de início < ano de fim);
  // diferença típica é 1, mas alguns casos especiais (mudança de regime)
  // podem ter 2. Negar diferenças > 5 é prudente.
  if (a >= b) return false;
  if (b - a > 5) return false;
  return true;
}

export function isCompetenciaValida(s: string): boolean {
  return RE_COMPETENCIA.test(s);
}

// ============================================================
// Dedup genérico
// ============================================================

/**
 * Deduplica array por chave. Quando há duplicatas, aplica `merge` (default:
 * mantém a primeira). Retorna { resultado, removidas } para reportar.
 */
export function dedupBy<T>(
  arr: readonly T[],
  keyFn: (item: T) => string,
  merge?: (existing: T, incoming: T) => T,
): { resultado: T[]; removidasIdx: number[] } {
  const out: T[] = [];
  const map = new Map<string, number>();
  const removidasIdx: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const k = keyFn(item);
    const existIdx = map.get(k);
    if (existIdx === undefined) {
      map.set(k, out.length);
      out.push(item);
    } else if (merge) {
      out[existIdx] = merge(out[existIdx], item);
      removidasIdx.push(i);
    } else {
      removidasIdx.push(i);
    }
  }
  return { resultado: out, removidasIdx };
}
