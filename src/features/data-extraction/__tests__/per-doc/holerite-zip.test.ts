import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildHoleriteZip } from "../../export/per-doc/holerite-zip";
import { classifyHolerite } from "../../export/per-doc/holerite-classify";
import type { RubricaParseada } from "../../parsers/holerite/types";

const r = (over: Partial<RubricaParseada>): RubricaParseada => ({
  codigo: null,
  nome: "",
  valor_vencimento: null,
  valor_desconto: null,
  quantidade: null,
  ordem: 0,
  ...over,
});

describe("buildHoleriteZip", () => {
  it("ZIP contém 1 CSV por categoria com soma > 0 + LEIA-ME.txt", async () => {
    const classif = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        r({ codigo: "0620", nome: "Comissões", valor_vencimento: 1158.82 }),
        r({ codigo: "3290", nome: "PREMIO ANTECIPADO", valor_vencimento: 76.44 }),
        r({ codigo: "0501", nome: "DSR(Comissão)", valor_vencimento: 272.64 }),
      ],
    });
    const blob = await buildHoleriteZip(classif);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const files = Object.keys(zip.files).sort();
    expect(files).toContain("historico_salarial_comissao.csv");
    expect(files).toContain("historico_salarial_dsr.csv");
    expect(files).toContain("historico_salarial_premiacao.csv");
    expect(files).toContain("LEIA-ME.txt");
  });

  it("Cada CSV tem 1 linha (1 competência por holerite)", async () => {
    const classif = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        r({ codigo: "0620", nome: "Comissões", valor_vencimento: 1158.82 }),
        r({ codigo: "3391", nome: "COM. GARANTIA", valor_vencimento: 154.04 }),
      ],
    });
    const blob = await buildHoleriteZip(classif);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const csv = await zip.file("historico_salarial_comissao.csv")!.async("string");
    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(2); // header + 1 data row
    // Soma 1158.82 + 154.04 = 1312.86 (sem separador de milhar)
    expect(lines[1]).toContain("08/2016;1312,86");
  });

  it("salario_familia tem natureza_indenizatoria (todas flags = N)", async () => {
    const classif = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "generico_v1",
      warnings: [],
      rubricas: [
        r({ codigo: "1001", nome: "Salário-família", valor_vencimento: 100 }),
      ],
    });
    const blob = await buildHoleriteZip(classif);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const csv = await zip.file("historico_salarial_salario_familia.csv")!.async("string");
    const lines = csv.trim().split("\n");
    expect(lines[1]).toMatch(/08\/2016;100,00;N;N;N;N$/);
  });

  it("Outras categorias têm FGTS+INSS=S por default", async () => {
    const classif = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "generico_v1",
      warnings: [],
      rubricas: [r({ codigo: "0620", nome: "Comissões", valor_vencimento: 100 })],
    });
    const blob = await buildHoleriteZip(classif);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const csv = await zip.file("historico_salarial_comissao.csv")!.async("string");
    const lines = csv.trim().split("\n");
    // FGTS=S, FGTSRecolhido=N, INSS=S, INSSRecolhido=N
    expect(lines[1]).toMatch(/08\/2016;100,00;S;N;S;N$/);
  });

  it("ZIP vazio (todas linhas excluídas) só tem LEIA-ME", async () => {
    const classif = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [r({ codigo: "0620", nome: "Comissões", valor_vencimento: 100 })],
    });
    classif.linhas[0].incluir = false;
    const blob = await buildHoleriteZip(classif);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const files = Object.keys(zip.files);
    expect(files).toEqual(["LEIA-ME.txt"]);
    const readme = await zip.file("LEIA-ME.txt")!.async("string");
    expect(readme).toContain("todas as rubricas foram excluídas");
  });

  it("LEIA-ME inclui warnings do parser", async () => {
    const classif = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: ["Parser via_varejo_v1 é provisório (sem fixture real)."],
      rubricas: [r({ codigo: "0620", nome: "Comissões", valor_vencimento: 100 })],
    });
    const blob = await buildHoleriteZip(classif);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    const readme = await zip.file("LEIA-ME.txt")!.async("string");
    expect(readme).toContain("provisório");
    expect(readme).toContain("Avisos do parser");
  });
});
