/**
 * Extrai o XML de um arquivo .PJC (aceita ZIP ou XML puro em ISO-8859-1).
 *
 * Usado tanto pela pagina admin PJCAnalyzer quanto pelo dialog ImportPJCDialog
 * dentro de um caso. Ver tambem pjc-analyzer.ts (analyzePJC) para parsing
 * apos extracao.
 */
import JSZip from 'jszip';

export async function extractXmlFromPjc(data: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(data);
  // Assinatura ZIP: PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const zip = await JSZip.loadAsync(data);
    const files = Object.keys(zip.files);
    const pjcFile = files.find(
      f => f.endsWith('.PJC') || f.endsWith('.pjc') || f.endsWith('.xml'),
    ) ?? files[0];
    if (!pjcFile) {
      throw new Error('Nenhum arquivo .PJC/.xml encontrado dentro do ZIP');
    }
    return await zip.files[pjcFile].async('string');
  }
  // XML puro em ISO-8859-1 (encoding do PJe-Calc oficial)
  const decoder = new TextDecoder('iso-8859-1');
  return decoder.decode(data);
}
