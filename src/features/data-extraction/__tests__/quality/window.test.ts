import { describe, expect, it } from "vitest";
import {
  detectarJanelasPeriodo,
  dataDentroDeAlgumaJanela,
  datasForaDaJanela,
} from "../../quality/window";

describe("detectarJanelasPeriodo", () => {
  it("detecta janela única", () => {
    const j = detectarJanelasPeriodo("Período 16/06/2021 a 15/07/2021");
    expect(j).toHaveLength(1);
    expect(j[0]).toEqual({ inicio: "2021-06-16", fim: "2021-07-15" });
  });

  it("detecta múltiplas janelas (espelhos concatenados)", () => {
    const ocr = `
      Período 16/06/2021 a 15/07/2021
      ... batidas ...
      Período 16/07/2021 a 15/08/2021
      ... batidas ...
    `;
    const j = detectarJanelasPeriodo(ocr);
    expect(j).toHaveLength(2);
  });

  it("ignora intervalos invertidos (fim < inicio)", () => {
    const j = detectarJanelasPeriodo("Período 15/07/2021 a 16/06/2021");
    expect(j).toHaveLength(0);
  });

  it("retorna [] quando não há janela", () => {
    expect(detectarJanelasPeriodo("OCR sem cabeçalho")).toEqual([]);
  });
});

describe("dataDentroDeAlgumaJanela", () => {
  const janelas = [
    { inicio: "2021-06-16", fim: "2021-07-15" },
    { inicio: "2021-08-16", fim: "2021-09-15" },
  ];

  it("aceita data dentro da primeira janela", () => {
    expect(dataDentroDeAlgumaJanela("2021-07-01", janelas)).toBe(true);
  });

  it("aceita data dentro da segunda janela", () => {
    expect(dataDentroDeAlgumaJanela("2021-09-01", janelas)).toBe(true);
  });

  it("aceita data exatamente no limite (início)", () => {
    expect(dataDentroDeAlgumaJanela("2021-06-16", janelas)).toBe(true);
  });

  it("aceita data exatamente no limite (fim)", () => {
    expect(dataDentroDeAlgumaJanela("2021-07-15", janelas)).toBe(true);
  });

  it("rejeita data entre as janelas", () => {
    expect(dataDentroDeAlgumaJanela("2021-08-01", janelas)).toBe(false);
  });

  it("rejeita data depois de todas as janelas", () => {
    expect(dataDentroDeAlgumaJanela("2021-12-20", janelas)).toBe(false);
  });

  it("aceita qualquer data se não há janelas (fail-open)", () => {
    expect(dataDentroDeAlgumaJanela("2099-01-01", [])).toBe(true);
  });
});

describe("datasForaDaJanela", () => {
  it("retorna apenas as datas fora", () => {
    const janelas = [{ inicio: "2021-06-16", fim: "2021-07-15" }];
    const datas = ["2021-07-01", "2021-08-01", "2021-12-20", "2021-06-16"];
    const fora = datasForaDaJanela(datas, janelas);
    expect(fora).toEqual(["2021-08-01", "2021-12-20"]);
  });

  it("sem janelas → array vazio (fail-open)", () => {
    expect(datasForaDaJanela(["2099-01-01"], [])).toEqual([]);
  });
});
