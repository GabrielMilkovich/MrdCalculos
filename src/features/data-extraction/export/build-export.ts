/**
 * Orquestrador final do "Modo Extração de Dados v3".
 *
 * Recebe a composição já validada (ZipExportPayload + dados PJC) e produz
 * um único ZIP contendo:
 *   - calculo.pjc        (arquivo importável no PJe-Calc Cidadão)
 *   - historico_salarial_*.csv  (1 por categoria com dados)
 *   - ferias.csv          (se houver)
 *   - faltas.csv          (se houver)
 *   - LEIA-ME.txt         (instruções de uso)
 *
 * O `.pjc` é a forma preferida (1 import único). Os CSVs ficam como fallback
 * para usuários que preferem importar categoria a categoria ou que tenham
 * versão antiga do PJe-Calc.
 */

import JSZip from "jszip";
import type { ZipExportPayload } from "../types";
import { buildLeiaMe } from "./leia-me";
import { buildPjcXml, type PjcCalculoData } from "./pjc/builder";
import { buildPjcZip, composePjcFilename } from "./pjc/zip";

export type BuildExportInput = {
  zipPayload: ZipExportPayload;
  pjcData: PjcCalculoData;
};

export type BuildExportOutput = {
  blob: Blob;
  filename: string;
  pjcInnerFilename: string;
  csvCount: number;
};

/**
 * Empacota tudo num único ZIP final pronto pra download.
 */
export async function buildExport(input: BuildExportInput): Promise<BuildExportOutput> {
  const { zipPayload, pjcData } = input;

  // 1) Gera o XML + .pjc
  const xml = buildPjcXml(pjcData);
  const pjcBytes = await buildPjcZip(xml);
  const pjcInnerFilename = composePjcFilename(
    pjcData.meta.nome_beneficiario,
    pjcData.meta.numero_processo,
  );

  // 2) Bundle final
  const zip = new JSZip();
  zip.file(pjcInnerFilename, pjcBytes);

  let csvCount = 0;
  for (const h of zipPayload.historicoSalarialCSVs) {
    if (h.linhas > 0) {
      zip.file(`historico_salarial_${h.slug}.csv`, h.csv);
      csvCount++;
    }
  }
  if (zipPayload.feriasCsv && zipPayload.feriasCsv.linhas > 0) {
    zip.file("ferias.csv", zipPayload.feriasCsv.csv);
    csvCount++;
  }
  if (zipPayload.faltasCsv && zipPayload.faltasCsv.linhas > 0) {
    zip.file("faltas.csv", zipPayload.faltasCsv.csv);
    csvCount++;
  }

  zip.file("LEIA-ME.txt", buildLeiaMeV3(zipPayload, pjcInnerFilename));

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = composeFinalZipName(zipPayload, pjcData);

  return { blob, filename, pjcInnerFilename, csvCount };
}

function composeFinalZipName(
  zipPayload: ZipExportPayload,
  pjcData: PjcCalculoData,
): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const nome = slug(pjcData.meta.nome_beneficiario) || slug(zipPayload.caseSlug) || "calculo";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `pjecalc_export_${nome}_${date}.zip`;
}

/**
 * LEIA-ME v3: prioriza o .pjc, mantém CSVs como fallback.
 */
function buildLeiaMeV3(payload: ZipExportPayload, pjcFilename: string): string {
  const linhas: string[] = [];
  linhas.push("INSTRUÇÕES DE IMPORTAÇÃO NO PJe-CALC CIDADÃO");
  linhas.push("=============================================");
  linhas.push("");
  linhas.push("OPÇÃO RECOMENDADA — IMPORTAR O ARQUIVO .pjc");
  linhas.push("-------------------------------------------");
  linhas.push(`Use o arquivo "${pjcFilename}" deste ZIP.`);
  linhas.push("");
  linhas.push("No PJe-Calc Cidadão:");
  linhas.push("  1. Abra o programa.");
  linhas.push("  2. Menu Arquivo → Abrir cálculo.");
  linhas.push(`  3. Selecione "${pjcFilename}".`);
  linhas.push("  4. O cálculo aparece pronto, com históricos, férias, faltas e cartões de ponto");
  linhas.push("     já preenchidos. Basta revisar e calcular.");
  linhas.push("");
  linhas.push("OPÇÃO ALTERNATIVA — IMPORTAR CSV POR CATEGORIA");
  linhas.push("----------------------------------------------");
  linhas.push("Caso prefira (ou esteja em uma versão antiga do PJe-Calc), você pode usar");
  linhas.push("os CSVs avulsos abaixo. Para cada um, primeiro crie o Histórico Salarial");
  linhas.push("correspondente no PJe-Calc com o nome e flags de incidência indicados.");
  linhas.push("");
  linhas.push("CSVs incluídos:");
  let any = false;
  for (const h of payload.historicoSalarialCSVs) {
    if (h.linhas > 0) {
      linhas.push(`  - historico_salarial_${h.slug}.csv (${h.linhas} linhas)`);
      any = true;
    }
  }
  if (payload.feriasCsv && payload.feriasCsv.linhas > 0) {
    linhas.push(`  - ferias.csv (${payload.feriasCsv.linhas} períodos)`);
    any = true;
  }
  if (payload.faltasCsv && payload.faltasCsv.linhas > 0) {
    linhas.push(`  - faltas.csv (${payload.faltasCsv.linhas} ocorrências)`);
    any = true;
  }
  if (!any) {
    linhas.push("  (nenhum — todos os dados estão dentro do .pjc)");
  }
  linhas.push("");

  for (const h of payload.historicoSalarialCSVs) {
    if (h.linhas === 0) continue;
    linhas.push(`> historico_salarial_${h.slug}.csv`);
    linhas.push(`   NOME PARA CRIAR NO PJE-CALC: ${h.nomePjecalc}`);
    if (h.config.natureza_indenizatoria) {
      linhas.push(
        "   INCIDÊNCIA CONFIGURADA: NATUREZA INDENIZATÓRIA — todas flags = N",
      );
    } else {
      const f = (b: boolean) => (b ? "S" : "N");
      linhas.push(
        `   INCIDÊNCIA CONFIGURADA: FGTS=${f(h.config.incide_fgts)}, FGTS Recolhido=${f(h.config.fgts_recolhido)}, INSS=${f(h.config.incide_inss)}, INSS Recolhido=${f(h.config.inss_recolhido)}`,
      );
    }
    linhas.push(`   LINHAS NO CSV: ${h.linhas}`);
    linhas.push("");
  }

  if (payload.feriasCsv && payload.feriasCsv.linhas > 0) {
    linhas.push("> ferias.csv");
    linhas.push(
      "  Atenção: o PJe-Calc só aceita esse CSV se os PERÍODOS AQUISITIVOS já estiverem",
    );
    linhas.push(
      "  cadastrados no cálculo. Crie-os manualmente na aba \"Férias\" antes de importar.",
    );
    linhas.push("");
  }

  if (payload.faltasCsv && payload.faltasCsv.linhas > 0) {
    linhas.push("> faltas.csv");
    linhas.push("  Importe diretamente na aba \"Faltas\".");
    linhas.push("");
  }

  linhas.push("CSV: encoding UTF-8 (sem BOM), delimitador ;, decimal vírgula.");
  linhas.push(".pjc: encoding ISO-8859-1 (PJe-Calc Cidadão 2.5.4+).");
  linhas.push(
    `GERADO POR: MRD Calc — ${new Date().toISOString().slice(0, 10)} — caso ${payload.numeroProcesso ?? "(sem número)"}`,
  );

  return linhas.join("\n");
}
