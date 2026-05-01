/**
 * Empacotador do .pjc.
 *
 * Estrutura final:
 *   <nome>.pjc            (arquivo ZIP)
 *     └── calculo.xml     (XML em ISO-8859-1)
 *
 * O PJe-Calc Cidadão lê o ZIP, extrai `calculo.xml`, parseia o XML e
 * reconstrói o cálculo. O nome interno do XML deve ser sempre
 * `calculo.xml` (case-sensitive).
 */

import JSZip from "jszip";
import { utf16ToLatin1 } from "./encoding";

/** Nome do arquivo XML dentro do ZIP — fixo. */
export const PJC_INNER_XML_NAME = "calculo.xml";

/**
 * Lê um arquivo .pjc (ZIP) e devolve o XML interno como string UTF-16.
 *
 * Trata:
 *   - ZIP com `calculo.xml` em ISO-8859-1 (formato canônico nosso)
 *   - ZIP com qualquer arquivo .xml dentro (fallback)
 *   - .pjc que na verdade é XML cru (alguns geradores antigos)
 */
export async function readPjcFile(
  bytes: Uint8Array | ArrayBuffer,
): Promise<string> {
  const buf = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  // Detecta ZIP pelo magic number "PK\x03\x04"
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    const zip = await JSZip.loadAsync(buf);
    let file = zip.file(PJC_INNER_XML_NAME);
    if (!file) {
      // Fallback: pega o primeiro .xml que achar
      for (const name of Object.keys(zip.files)) {
        if (name.toLowerCase().endsWith(".xml")) {
          file = zip.file(name);
          break;
        }
      }
    }
    if (!file) throw new Error("ZIP .pjc sem XML interno.");
    const innerBytes = await file.async("uint8array");
    return latin1ToUtf16(innerBytes);
  }
  // Fallback: trata como XML cru. Tenta UTF-8 primeiro, ISO-8859-1 se vier acentos quebrados.
  return new TextDecoder("iso-8859-1").decode(buf);
}

/** Converte bytes Latin-1 (ISO-8859-1) em string UTF-16 do JS. */
function latin1ToUtf16(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

/**
 * Empacota o XML como `.pjc` (ZIP) e devolve o conteúdo binário.
 *
 * @param xml string XML completa (com `<?xml encoding="ISO-8859-1"?>`).
 * @returns Uint8Array do arquivo .pjc final.
 */
export async function buildPjcZip(xml: string): Promise<Uint8Array> {
  const zip = new JSZip();
  // O XML precisa estar em ISO-8859-1 dentro do ZIP — converte aqui.
  const latin1Bytes = utf16ToLatin1(xml);
  zip.file(PJC_INNER_XML_NAME, latin1Bytes);
  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Compõe nome de arquivo .pjc seguro (sem caracteres problemáticos).
 *
 * @example
 *   composePjcFilename("João da Silva", "0001234-12.2024.5.02.0001")
 *   → "joao-da-silva_0001234-12-2024-5-02-0001.pjc"
 */
export function composePjcFilename(
  nomeBeneficiario: string,
  numeroProcesso: string,
): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const nome = slug(nomeBeneficiario) || "calculo";
  const proc = slug(numeroProcesso) || "sn";
  return `${nome}_${proc}.pjc`;
}
