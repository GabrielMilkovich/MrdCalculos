/**
 * UTF-16 → ISO-8859-1 (Latin-1) conversion.
 *
 * O .pjc do PJe-Calc é XML em ISO-8859-1. JS trabalha em UTF-16 nativo;
 * precisamos converter antes de empacotar no ZIP.
 *
 * Caracteres com code point > 0xFF não cabem em Latin-1. Para nomes
 * brasileiros e dados normais (acentos PT-BR estão em 0x80..0xFF),
 * está coberto. Caracteres exóticos (emojis, símbolos asiáticos) viram
 * '?' (0x3F).
 */

export function utf16ToLatin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = c > 0xff ? 0x3f /* '?' */ : c;
  }
  return out;
}

/**
 * Converte epoch ms pra dia 1 do mês de competência, no horário 00:00 BRT.
 *
 * Spec §3.2: `<dataOcorrencia>` é timestamp epoch ms do dia 1 do mês
 * em horário de Brasília. Validado contra o .pjc real:
 *   08/2016 → 1470020400000 = 2016-08-01T03:00:00.000Z = 00:00 BRT
 */
export function competenciaToEpochMs(competencia: string): number {
  const m = competencia.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return 0;
  const mes = parseInt(m[1], 10);
  const ano = parseInt(m[2], 10);
  if (mes < 1 || mes > 12) return 0;
  // 00:00 BRT = 03:00 UTC (UTC-3)
  return Date.UTC(ano, mes - 1, 1, 3, 0, 0);
}

/**
 * Converte data ISO (yyyy-mm-dd) pra epoch ms 00:00 BRT.
 */
export function isoToEpochMs(iso: string): number {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 0;
  return Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 3, 0, 0);
}
