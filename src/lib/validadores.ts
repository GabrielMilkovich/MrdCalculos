/**
 * Validadores e formatadores de documentos brasileiros.
 *
 * Cobre:
 *  - CPF  (11 dígitos + 2 DV pelo algoritmo oficial da Receita)
 *  - CNPJ (14 dígitos + 2 DV pelo algoritmo oficial da Receita)
 *  - PIS/PASEP/NIS/NIT (11 dígitos + 1 DV — pesos 3,2,9..2)
 *  - Número de processo CNJ (20 dígitos, DV MOD 97 — Res. CNJ 65/2008)
 *
 * A lógica de CPF/CNPJ foi extraída e deduplicada do esocial-validator
 * (`isValidCPF`, `isValidCNPJ`) para expor uma API pública única.
 *
 * Regras:
 *  - Todas as funções aceitam strings com ou sem máscara — dígitos são
 *    extraídos antes da validação.
 *  - Funções de formatação preservam entrada que não tenha o número exato
 *    de dígitos (retornam só os dígitos disponíveis).
 */

// ============ HELPERS ============

/** Remove tudo que não for dígito. */
function digits(v: string): string {
  return v.replace(/\D+/g, '');
}

/** Todos os dígitos iguais? (ex: 11111111111) */
function allSame(s: string): boolean {
  return s.length > 0 && /^(\d)\1+$/.test(s);
}

// ============ VALIDADORES ============

/**
 * Valida CPF (11 dígitos) conferindo os dois dígitos verificadores.
 * Aceita entrada formatada ou somente dígitos.
 */
export function validarCPF(cpf: string): boolean {
  if (typeof cpf !== 'string') return false;
  const d = digits(cpf);
  if (d.length !== 11) return false;
  if (allSame(d)) return false;
  const n = d.split('').map(Number);
  let s = 0;
  for (let i = 0; i < 9; i++) s += n[i] * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== n[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += n[i] * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === n[10];
}

/**
 * Valida CNPJ (14 dígitos) conferindo os dois dígitos verificadores.
 * Aceita entrada formatada ou somente dígitos.
 */
export function validarCNPJ(cnpj: string): boolean {
  if (typeof cnpj !== 'string') return false;
  const d = digits(cnpj);
  if (d.length !== 14) return false;
  if (allSame(d)) return false;
  const n = d.split('').map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s1 = 0;
  for (let i = 0; i < 12; i++) s1 += n[i] * w1[i];
  let d1 = s1 % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== n[12]) return false;
  let s2 = 0;
  for (let i = 0; i < 13; i++) s2 += n[i] * w2[i];
  let d2 = s2 % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return d2 === n[13];
}

/**
 * Valida PIS/PASEP/NIS/NIT (11 dígitos, 1 DV).
 * Algoritmo: pesos 3,2,9,8,7,6,5,4,3,2 sobre os 10 primeiros dígitos;
 * DV = 11 - (soma % 11); se ≥ 10 → 0.
 */
export function validarPIS(pis: string): boolean {
  if (typeof pis !== 'string') return false;
  const d = digits(pis);
  if (d.length !== 11) return false;
  if (allSame(d)) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const n = d.split('').map(Number);
  let s = 0;
  for (let i = 0; i < 10; i++) s += n[i] * pesos[i];
  let dv = 11 - (s % 11);
  if (dv >= 10) dv = 0;
  return dv === n[10];
}

/**
 * Valida número de processo CNJ no formato NNNNNNN-DD.AAAA.J.TR.OOOO
 * (20 dígitos) pelo algoritmo MOD 97 — Resolução CNJ 65/2008.
 *
 * Reordena como NNNNNNNAAAAJTROOOO, calcula MOD 97 e compara com DD
 * (que deve ser 98 - resultado), equivalente a: concatenar DD ao final
 * e exigir que o total % 97 === 1.
 */
export function validarProcessoCNJ(numero: string): boolean {
  if (typeof numero !== 'string') return false;
  const d = digits(numero);
  if (d.length !== 20) return false;

  const nnnnnnn = d.substring(0, 7);
  const dd = d.substring(7, 9);
  const aaaa = d.substring(9, 13);
  const j = d.substring(13, 14);
  const tr = d.substring(14, 16);
  const oooo = d.substring(16, 20);

  // j válido: 1..9 (Res. CNJ lista ramos 1..9)
  if (j === '0') return false;

  const reordenado = nnnnnnn + aaaa + j + tr + oooo + dd;
  return mod97(reordenado) === 1;
}

/** MOD 97 iterativo para strings grandes sem overflow. */
function mod97(numStr: string): number {
  let rem = 0;
  for (let i = 0; i < numStr.length; i++) {
    rem = (rem * 10 + Number(numStr[i])) % 97;
  }
  return rem;
}

// ============ FORMATADORES ============

/** Aplica máscara "000.000.000-00" no CPF. */
export function formatarCPF(cpf: string): string {
  const d = digits(cpf).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Aplica máscara "00.000.000/0000-00" no CNPJ. */
export function formatarCNPJ(cnpj: string): string {
  const d = digits(cnpj).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Aplica máscara "000.00000.00-0" no PIS/PASEP/NIS/NIT. */
export function formatarPIS(pis: string): string {
  const d = digits(pis).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 8) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}.${d.slice(3, 8)}.${d.slice(8)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 8)}.${d.slice(8, 10)}-${d.slice(10)}`;
}

/** Aplica máscara "NNNNNNN-DD.AAAA.J.TR.OOOO" em número CNJ. */
export function formatarProcessoCNJ(numero: string): string {
  const d = digits(numero).slice(0, 20);
  if (d.length <= 7) return d;
  if (d.length <= 9) return `${d.slice(0, 7)}-${d.slice(7)}`;
  if (d.length <= 13) return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9)}`;
  if (d.length <= 14) {
    return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13)}`;
  }
  if (d.length <= 16) {
    return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14)}`;
  }
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`;
}
