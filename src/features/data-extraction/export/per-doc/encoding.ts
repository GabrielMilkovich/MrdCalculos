/**
 * UTF-16 → ISO-8859-1 (Latin-1) conversion.
 *
 * O CSV "Importar Jornada" do PJe-Calc Cidadão usa ISO-8859-1 (encoding
 * default do Windows BR). JS trabalha em UTF-16 nativo; precisamos
 * converter antes de gerar o Blob.
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
