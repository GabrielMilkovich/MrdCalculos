import { describe, expect, it } from "vitest";
import { parseHolerite } from "../../../parsers/holerite";

describe("layoutGenericoV1 — competência", () => {
  it("REFERÊNCIA com formato MM/AAAA", () => {
    const text = `
      RECIBO DE PAGAMENTO
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.competencia).toBe("03/2024");
  });

  it("REFERÊNCIA com formato MMM/AAAA (JAN, FEV...)", () => {
    const text = `
      RECIBO DE PAGAMENTO
      REFERÊNCIA: AGO/2016
      0001 SALARIO BASE  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.competencia).toBe("08/2016");
  });

  it("Sem REFERÊNCIA, pega MM/AAAA do cabeçalho", () => {
    const text = `
      Folha 03/2024 — Empregado X
      0001 SALARIO BASE  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.competencia).toBe("03/2024");
  });

  it("Sem competência detectável → 00/0000 + warning", () => {
    const text = "0001 SALARIO BASE  3.500,00";
    const r = parseHolerite(text);
    expect(r.competencia).toBe("00/0000");
    expect(r.warnings.some((w) => /compet/i.test(w))).toBe(true);
  });
});

describe("layoutGenericoV1 — rubricas com código", () => {
  it("Linha 'CCCC NOME VALOR' captura corretamente", () => {
    const text = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE        3.500,00
      0620 COMISSOES           1.158,82
      0501 DSR SOBRE COMISSOES   272,64
    `;
    const r = parseHolerite(text);
    expect(r.rubricas).toHaveLength(3);
    expect(r.rubricas[0].codigo).toBe("0001");
    expect(r.rubricas[0].nome).toBe("SALARIO BASE");
    expect(r.rubricas[0].valor_vencimento).toBeCloseTo(3500, 2);
    expect(r.rubricas[1].codigo).toBe("0620");
    expect(r.rubricas[1].valor_vencimento).toBeCloseTo(1158.82, 2);
  });

  it("Linha com 2 valores (vencimento + desconto)", () => {
    const text = `
      REFERÊNCIA: 03/2024
      5560 INSS                188,77    188,77
    `;
    const r = parseHolerite(text);
    expect(r.rubricas).toHaveLength(1);
    expect(r.rubricas[0].codigo).toBe("5560");
    expect(r.rubricas[0].valor_vencimento).toBeCloseTo(188.77, 2);
    expect(r.rubricas[0].valor_desconto).toBeCloseTo(188.77, 2);
  });
});

describe("layoutGenericoV1 — formato BR de valores", () => {
  it("Valor com separador de milhar BR", () => {
    const text = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  12.345,67
    `;
    const r = parseHolerite(text);
    expect(r.rubricas[0].valor_vencimento).toBeCloseTo(12345.67, 2);
  });

  it("Valor sem milhar (3 dígitos)", () => {
    const text = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  500,00
    `;
    const r = parseHolerite(text);
    expect(r.rubricas[0].valor_vencimento).toBeCloseTo(500, 2);
  });
});

describe("layoutGenericoV1 — sem rubricas", () => {
  it("Texto sem valores → rubricas=[] + warning", () => {
    const text = `
      REFERÊNCIA: 03/2024
      Texto bobagem sem valores.
    `;
    const r = parseHolerite(text);
    expect(r.rubricas).toHaveLength(0);
    expect(r.warnings.some((w) => /rubrica/i.test(w))).toBe(true);
  });
});

describe("layoutGenericoV1 — layout_usado", () => {
  it("Sempre retorna 'generico_v1'", () => {
    const r = parseHolerite("REFERÊNCIA: 03/2024\n0001 X 100,00");
    expect(r.layout_usado).toBe("generico_v1");
  });
});
