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
