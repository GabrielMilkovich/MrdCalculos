import { describe, expect, it } from "vitest";
import { parseFerias } from "../../parsers/ferias";

describe("parseFerias — vazio", () => {
  it("OCR vazio retorna ferias=[] + warning", () => {
    const r = parseFerias("");
    expect(r.ferias).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("parseFerias — bloco único", () => {
  it("recibo simples com período aquisitivo + gozo", () => {
    const text = `
      RECIBO DE FÉRIAS
      Empregado: João da Silva
      Período Aquisitivo: 01/06/2022 a 31/05/2023
      Relativa: 2022/2023
      30 dias de férias
      Período de gozo: 01/06/2024 a 30/06/2024
      Abono pecuniário: 10 dias
    `;
    const r = parseFerias(text);
    expect(r.ferias).toHaveLength(1);
    const f = r.ferias[0];
    expect(f.relativa).toBe("2022/2023");
    expect(f.prazo).toBe(30);
    expect(f.situacao).toBe("G");
    expect(f.gozo1).toEqual({
      inicio: "01/06/2024",
      fim: "30/06/2024",
      dobra: false,
    });
    expect(f.abono).toBe(true);
    expect(f.dias_abono).toBe(10);
  });

  it("férias indenizadas → situacao=I", () => {
    const text = `
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      30 dias de férias
      Indenizadas (rescisão contratual)
    `;
    const r = parseFerias(text);
    expect(r.ferias[0].situacao).toBe("I");
  });

  it("não gozadas → situacao=NG", () => {
    const text = `
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Não gozadas
    `;
    const r = parseFerias(text);
    expect(r.ferias[0].situacao).toBe("NG");
  });

  it("perdidas → situacao=P", () => {
    const text = `
      RECIBO DE FÉRIAS
      Relativa: 2022/2023
      Perdidas (prescritas)
    `;
    const r = parseFerias(text);
    expect(r.ferias[0].situacao).toBe("P");
  });
});

describe("parseFerias — múltiplos blocos", () => {
  it("documento consolidado com 3 períodos retorna 3 férias", () => {
    const text = `
      RECIBO DE FÉRIAS — Período 1
      Relativa: 2020/2021
      30 dias de férias
      Período de gozo: 01/06/2022 a 30/06/2022

      RECIBO DE FÉRIAS — Período 2
      Relativa: 2021/2022
      30 dias de férias
      Indenizadas

      RECIBO DE FÉRIAS — Período 3
      Relativa: 2022/2023
      Não gozadas
    `;
    const r = parseFerias(text);
    expect(r.ferias).toHaveLength(3);
    expect(r.ferias[0].relativa).toBe("2020/2021");
    expect(r.ferias[0].situacao).toBe("G");
    expect(r.ferias[1].situacao).toBe("I");
    expect(r.ferias[2].situacao).toBe("NG");
  });

  it("blocos sem relativa são descartados com warning", () => {
    const text = `
      RECIBO DE FÉRIAS — bloco 1 sem relativa
      Bobagem.

      RECIBO DE FÉRIAS — bloco 2 OK
      Relativa: 2023/2024
      30 dias de férias
    `;
    const r = parseFerias(text);
    expect(r.ferias).toHaveLength(1);
    expect(r.warnings.some((w) => /ignorado/i.test(w))).toBe(true);
  });
});

describe("parseFerias — gozos múltiplos", () => {
  it("3 períodos de gozo são todos capturados", () => {
    const text = `
      RECIBO DE FÉRIAS
      Relativa: 2022/2023
      30 dias de férias
      Período de gozo: 01/06/2024 a 10/06/2024
      Período de gozo: 15/06/2024 a 24/06/2024
      Período de gozo: 01/07/2024 a 10/07/2024
    `;
    const r = parseFerias(text);
    expect(r.ferias[0].gozo1?.inicio).toBe("01/06/2024");
    expect(r.ferias[0].gozo2?.inicio).toBe("15/06/2024");
    expect(r.ferias[0].gozo3?.inicio).toBe("01/07/2024");
  });
});

describe("parseFerias — sem prazo explícito", () => {
  it("default 30 dias + warning", () => {
    const text = `
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Indenizadas
    `;
    const r = parseFerias(text);
    expect(r.ferias[0].prazo).toBe(30);
    expect(r.warnings.some((w) => /prazo/i.test(w))).toBe(true);
  });
});
