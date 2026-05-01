import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildExport } from "../../export/build-export";
import type { ZipExportPayload } from "../../types";
import type { PjcCalculoData } from "../../export/pjc/builder";

function emptyPjcData(): PjcCalculoData {
  return {
    meta: {
      nome_beneficiario: "JOÃO DA SILVA",
      cpf: "12345678900",
      data_admissao: "2011-06-06",
      data_demissao: "2024-03-15",
      data_inicio_calculo: "2019-04-01",
      data_termino_calculo: "2024-03-15",
      data_ajuizamento: "2024-04-01",
      numero_processo: "0001234-12.2024.5.02.0001",
    },
    historicosSalariais: [],
    ferias: [],
    faltas: [],
    cartoesDePonto: [],
  };
}

function emptyZipPayload(): ZipExportPayload {
  return {
    caseSlug: "joao-silva",
    numeroProcesso: "0001234-12.2024.5.02.0001",
    historicoSalarialCSVs: [],
    feriasCsv: null,
    faltasCsv: null,
  };
}

describe("buildExport", () => {
  it("Mesmo sem CSVs, gera ZIP final com .pjc + LEIA-ME", async () => {
    const out = await buildExport({
      zipPayload: emptyZipPayload(),
      pjcData: emptyPjcData(),
    });
    expect(out.csvCount).toBe(0);
    expect(out.pjcInnerFilename).toMatch(/\.pjc$/);
    expect(out.filename).toMatch(/^pjecalc_export_.*\.zip$/);

    // Re-abre o ZIP final
    const arr = new Uint8Array(await out.blob.arrayBuffer());
    const reZip = await JSZip.loadAsync(arr);
    const files = Object.keys(reZip.files);
    expect(files).toContain(out.pjcInnerFilename);
    expect(files).toContain("LEIA-ME.txt");
  });

  it("Inclui CSV de comissões quando linhas>0", async () => {
    const payload = emptyZipPayload();
    payload.historicoSalarialCSVs.push({
      slug: "comissao",
      nomePjecalc: "Comissões",
      csv: "Competencia;Valor\n08/2016;1158,82",
      config: {
        case_id: "x",
        categoria_id: "y",
        incide_fgts: true,
        fgts_recolhido: false,
        incide_inss: true,
        inss_recolhido: false,
        natureza_indenizatoria: false,
      },
      linhas: 1,
    });

    const out = await buildExport({ zipPayload: payload, pjcData: emptyPjcData() });
    expect(out.csvCount).toBe(1);

    const arr = new Uint8Array(await out.blob.arrayBuffer());
    const reZip = await JSZip.loadAsync(arr);
    expect(reZip.file("historico_salarial_comissao.csv")).not.toBeNull();
    const csvText = await reZip.file("historico_salarial_comissao.csv")!.async("string");
    expect(csvText).toContain("1158,82");
  });

  it("LEIA-ME.txt menciona o nome do .pjc gerado", async () => {
    const out = await buildExport({
      zipPayload: emptyZipPayload(),
      pjcData: emptyPjcData(),
    });

    const arr = new Uint8Array(await out.blob.arrayBuffer());
    const reZip = await JSZip.loadAsync(arr);
    const leiaMe = await reZip.file("LEIA-ME.txt")!.async("string");
    expect(leiaMe).toContain(out.pjcInnerFilename);
    expect(leiaMe).toContain("OPÇÃO RECOMENDADA");
  });

  it("Skipa CSVs com linhas=0", async () => {
    const payload = emptyZipPayload();
    payload.historicoSalarialCSVs.push({
      slug: "comissao",
      nomePjecalc: "Comissões",
      csv: "Competencia;Valor\n",
      config: {
        case_id: "x",
        categoria_id: "y",
        incide_fgts: true,
        fgts_recolhido: false,
        incide_inss: true,
        inss_recolhido: false,
        natureza_indenizatoria: false,
      },
      linhas: 0,
    });
    payload.feriasCsv = { csv: "...", linhas: 0 };
    payload.faltasCsv = { csv: "...", linhas: 0 };

    const out = await buildExport({ zipPayload: payload, pjcData: emptyPjcData() });
    expect(out.csvCount).toBe(0);

    const arr = new Uint8Array(await out.blob.arrayBuffer());
    const reZip = await JSZip.loadAsync(arr);
    expect(reZip.file("historico_salarial_comissao.csv")).toBeNull();
    expect(reZip.file("ferias.csv")).toBeNull();
    expect(reZip.file("faltas.csv")).toBeNull();
  });

  it("Filename final é slugificado", async () => {
    const out = await buildExport({
      zipPayload: emptyZipPayload(),
      pjcData: emptyPjcData(),
    });
    // pjecalc_export_joao-da-silva_YYYYMMDD.zip
    expect(out.filename).toMatch(/pjecalc_export_joao-da-silva_\d{8}\.zip/);
  });
});
