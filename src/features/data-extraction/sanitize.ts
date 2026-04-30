/**
 * Sanitizadores para o formato CSV PJe-Calc Cidadão.
 *
 * Regras vindas do parser oficial (AbstractServicoDeParsing.java):
 *  - Remove TODAS as `"` antes do split — não use aspas
 *  - Split por `;` — campo NUNCA pode conter `;`
 *  - Linhas separadas por `\n` — campo nunca pode conter `\n` ou `\r`
 *  - Decimal em formato BR (vírgula, sem separador de milhar)
 *  - Booleanos `S` / `N`
 */

import { INVALID_TEXT_CHARS } from './constants';

/**
 * Remove caracteres proibidos pelo parser e trunca em maxLen.
 * Substitui ; \n \r " por espaço (preserva visibilidade do
 * conteúdo original em vez de mascarar).
 */
export function sanitizeText(s: string | undefined | null, maxLen: number): string {
  if (!s) return '';
  return s.replace(INVALID_TEXT_CHARS, ' ').trim().slice(0, maxLen);
}

/**
 * Formata número decimal no padrão brasileiro: vírgula como separador
 * decimal, SEM separador de milhar. 2 casas decimais.
 *
 * Exemplos:
 *   3500.5  → "3500,50"
 *   12345.67 → "12345,67"  (sem ".")
 *   0       → "0,00"
 *   NaN/Infinity → "0,00" (defensivo)
 */
export function formatDecimalBR(n: number, casas = 2): string {
  if (!Number.isFinite(n)) return '0,00';
  return n.toFixed(casas).replace('.', ',');
}

/** S = true, N = false. Aceita boolean direto, sem coerção falsa. */
export function formatBool(b: boolean): 'S' | 'N' {
  return b ? 'S' : 'N';
}

/**
 * Valida formato de competência MM/yyyy.
 * Retorna a string se válida ou string vazia caso contrário (drop linha).
 */
export function validateCompetencia(s: string): string {
  return /^(0[1-9]|1[0-2])\/\d{4}$/.test(s) ? s : '';
}

/**
 * Valida formato dd/MM/yyyy.
 * Retorna a string se válida ou string vazia caso contrário.
 */
export function validateData(s: string): string {
  return /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(s) ? s : '';
}

/** Valida formato "aaaa/aaaa" de relativa de férias. */
export function validateRelativa(s: string): string {
  return /^\d{4}\/\d{4}$/.test(s) ? s : '';
}
