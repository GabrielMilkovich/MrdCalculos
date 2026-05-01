/**
 * Tests do layoutViaVarejoV1.
 *
 * Sem fixture OCR real do grupo — exemplos sintéticos baseados na
 * estrutura típica documentada (4-coluna code+nome+ref+valor).
 */
import { describe, expect, it } from "vitest";
import { parseHolerite } from "../../../parsers/holerite";

describe("via_varejo_v1 — identificação", () => {
  it("Casa com sinal 'VIA VAREJO'", () => {
    const text = `
      VIA VAREJO S.A.
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  30,00  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.layout_usado).toBe("via_varejo_v1");
  });

  it("Casa com sinal 'CASAS BAHIA'", () => {
    const text = `
      CASAS BAHIA COMERCIAL LTDA
      REFERÊNCIA: 12/2023
      0001 SALARIO BASE  30,00  2.800,00
    `;
    const r = parseHolerite(text);
    expect(r.layout_usado).toBe("via_varejo_v1");
  });

  it("Casa com sinal 'PONTO FRIO'", () => {
    const text = `
      PONTO FRIO MAGAZINE
      REFERÊNCIA: 01/2024
      0001 SALARIO BASE  30,00  3.000,00
    `;
    const r = parseHolerite(text);
    expect(r.layout_usado).toBe("via_varejo_v1");
  });

  it("Sem sinal Via Varejo cai no fallback genérico", () => {
    const text = `
      EMPRESA QUALQUER LTDA
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.layout_usado).toBe("generico_v1");
  });

  it("Falta cabeçalho REFERÊNCIA → não casa o layout específico", () => {
    const text = `
      VIA VAREJO S.A.
      Folha de Pagamento
      0001 SALARIO BASE  3.500,00
    `;
    const r = parseHolerite(text);
    // Como sinal "REFERÊNCIA" não está presente, falha a identificação;
    // cai no genérico.
    expect(r.layout_usado).toBe("generico_v1");
  });
});

describe("via_varejo_v1 — competência", () => {
  it("REFERÊNCIA MM/AAAA", () => {
    const text = `
      VIA VAREJO S.A.
      REFERÊNCIA: 08/2023
      0001 SALARIO BASE  30,00  2.500,00
    `;
    const r = parseHolerite(text);
    expect(r.competencia).toBe("08/2023");
  });

  it("REFERÊNCIA MMM/AAAA", () => {
    const text = `
      CASAS BAHIA
      REFERÊNCIA: SET/2023
      0001 SALARIO BASE  30,00  2.500,00
    `;
    const r = parseHolerite(text);
    expect(r.competencia).toBe("09/2023");
  });
});

describe("via_varejo_v1 — rubricas", () => {
  it("Rubrica com quantidade + vencimento", () => {
    const text = `
      VIA VAREJO S.A.
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE        30,00     3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.rubricas.length).toBeGreaterThanOrEqual(1);
    const sal = r.rubricas.find((x) => x.codigo === "0001");
    expect(sal?.nome).toContain("SALARIO");
    expect(sal?.quantidade).toBe(30);
    expect(sal?.valor_vencimento).toBe(3500);
  });

  it("Rubrica com vencimento + desconto (sem quantidade)", () => {
    const text = `
      VIA VAREJO S.A.
      REFERÊNCIA: 03/2024
      8000 INSS                  450,00
      0001 SALARIO BASE   30,00 3.500,00
    `;
    const r = parseHolerite(text);
    const inss = r.rubricas.find((x) => x.codigo === "8000");
    expect(inss?.nome).toContain("INSS");
    expect(inss?.valor_vencimento).toBe(450);
  });

  it("Múltiplas rubricas preservam ordem", () => {
    const text = `
      VIA VAREJO S.A.
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  30,00  3.500,00
      0190 COMISSAO              500,00
      8000 INSS                  450,00
    `;
    const r = parseHolerite(text);
    const codigos = r.rubricas.map((x) => x.codigo);
    expect(codigos).toEqual(["0001", "0190", "8000"]);
  });

  it("Layout sempre emite warning de provisório", () => {
    const text = `
      VIA VAREJO S.A.
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  30,00  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.warnings.some((w) => /provis[óo]rio/i.test(w))).toBe(true);
  });

  it("Linhas vazias / lixo OCR ignorados", () => {
    const text = `
      VIA VAREJO S.A.
      REFERÊNCIA: 03/2024


      ====================
      Folha gerada em xx
      0001 SALARIO BASE  30,00  3.500,00

      ====================
    `;
    const r = parseHolerite(text);
    expect(r.rubricas.length).toBe(1);
  });
});
