/**
 * FASE 2.3 — testes anti-alucinação (rodam em Vitest/Node).
 *
 * A lógica vive em `_shared/anti-hallucination.ts` (TS puro) — usada tanto
 * pelo edge function Deno quanto pelo teste aqui. Não mockamos OpenAI:
 * passamos um payload "como se fosse" a resposta da IA e validamos o
 * comportamento do pipeline anti-alucinação.
 */
import { describe, expect, it } from "vitest";
import {
  aplicarAntiAlucinacao,
  competenciaAparecemNoOcr,
  gerarVariantesBR,
  normalizarOcr,
  valorAparecemNoOcr,
  type ExtractedPayload,
} from "../../_shared/anti-hallucination";

const OCR_HOLERITE = `
RECIBO DE PAGAMENTO
Empresa Acme S/A
REFERÊNCIA: 03/2024
0001 SALARIO BASE            3.500,00
0620 COMISSOES               1.158,82
0900 INSS                                      385,75
9001 Base INSS               4.658,82
Total Bruto                  4.658,82
Total Descontos                                385,75
Liquido a Receber            4.273,07
`;

describe("FASE 2.3 — gerarVariantesBR", () => {
  it("gera variante com milhar para 1234.56", () => {
    const vs = gerarVariantesBR(1234.56);
    expect(vs).toContain("1.234,56");
    expect(vs).toContain("1234,56");
    expect(vs).toContain("r$ 1.234,56");
  });

  it("gera variante para inteiro 100", () => {
    const vs = gerarVariantesBR(100);
    expect(vs).toContain("100,00");
    expect(vs).toContain("100");
  });

  it("Infinity/NaN → array vazio (defensivo)", () => {
    expect(gerarVariantesBR(Number.POSITIVE_INFINITY)).toHaveLength(0);
    expect(gerarVariantesBR(Number.NaN)).toHaveLength(0);
  });
});

describe("FASE 2.3 — valorAparecemNoOcr", () => {
  const ocrN = normalizarOcr(OCR_HOLERITE);

  it("número 3500 → encontra '3.500,00' no OCR", () => {
    expect(valorAparecemNoOcr(3500, ocrN)).toBe(true);
  });

  it("número 1158.82 → encontra '1.158,82' no OCR", () => {
    expect(valorAparecemNoOcr(1158.82, ocrN)).toBe(true);
  });

  it("número 8888.99 (inventado) → não encontra → false", () => {
    expect(valorAparecemNoOcr(8888.99, ocrN)).toBe(false);
  });

  it("string 'SALARIO BASE' → encontra (case-insensitive)", () => {
    expect(valorAparecemNoOcr("Salario Base", ocrN)).toBe(true);
  });

  it("string 'BONUS ANUAL XPTO' (inventada) → false", () => {
    expect(valorAparecemNoOcr("Bonus Anual XPTO", ocrN)).toBe(false);
  });

  it("null/undefined → sempre true (campo ausente é OK)", () => {
    expect(valorAparecemNoOcr(null, ocrN)).toBe(true);
    expect(valorAparecemNoOcr(undefined, ocrN)).toBe(true);
  });
});

describe("FASE 2.3 — competenciaAparecemNoOcr", () => {
  const ocrN = normalizarOcr(OCR_HOLERITE);
  const ocrComMesSigla = normalizarOcr("REFERÊNCIA: ago/2024");

  it("'03/2024' literal → encontra", () => {
    expect(competenciaAparecemNoOcr("03/2024", ocrN)).toBe(true);
  });

  it("'08/2024' contra 'ago/2024' (sigla 3 letras) → encontra", () => {
    expect(competenciaAparecemNoOcr("08/2024", ocrComMesSigla)).toBe(true);
  });

  it("'12/1999' contra OCR de '03/2024' → false", () => {
    expect(competenciaAparecemNoOcr("12/1999", ocrN)).toBe(false);
  });
});

describe("FASE 2.3 — aplicarAntiAlucinacao (cenários do prompt)", () => {
  it("Caso 1: resposta correta — todos valores no OCR → discarded vazio", () => {
    const payload: ExtractedPayload = {
      competencia: "03/2024",
      rubricas: [
        {
          codigo: "0001",
          nome: "SALARIO BASE",
          valor_vencimento: 3500,
          valor_desconto: null,
          quantidade: null,
        },
        {
          codigo: "0620",
          nome: "COMISSOES",
          valor_vencimento: 1158.82,
          valor_desconto: null,
          quantidade: null,
        },
        {
          codigo: "0900",
          nome: "INSS",
          valor_vencimento: null,
          valor_desconto: 385.75,
          quantidade: null,
        },
      ],
      totalizadores: { bruto: 4658.82, descontos: 385.75, liquido: 4273.07 },
    };
    const r = aplicarAntiAlucinacao(payload, OCR_HOLERITE);
    expect(r.discarded).toEqual([]);
    expect(r.extracted.rubricas).toHaveLength(3);
    expect(r.extracted.competencia).toBe("03/2024");
    expect(r.extracted.totalizadores).toEqual({
      bruto: 4658.82,
      descontos: 385.75,
      liquido: 4273.07,
    });
  });

  it("Caso 2: valor inventado (8888.99 não no OCR) → discarded + remove do extracted", () => {
    const payload: ExtractedPayload = {
      competencia: "03/2024",
      rubricas: [
        {
          codigo: "9999",
          nome: "SALARIO BASE",
          valor_vencimento: 8888.99, // inventado!
          valor_desconto: null,
          quantidade: null,
        },
      ],
      totalizadores: { bruto: null, descontos: null, liquido: null },
    };
    const r = aplicarAntiAlucinacao(payload, OCR_HOLERITE);
    // Valor inventado → vai pra discarded
    expect(r.discarded.length).toBeGreaterThanOrEqual(1);
    expect(
      r.discarded.some((d) => d.field.includes("valor_vencimento") && d.suggested === "8888.99"),
    ).toBe(true);
    // E rubrica fica sem nenhum valor → descartada inteira
    expect(r.extracted.rubricas).toHaveLength(0);
  });

  it("Caso 3: nome aproximado (substring falha) → rubrica vai pra discarded", () => {
    const payload: ExtractedPayload = {
      competencia: "03/2024",
      rubricas: [
        {
          codigo: "0001",
          nome: "Salário-Base Bruto Mensal", // nome reformulado, não está no OCR
          valor_vencimento: 3500,
          valor_desconto: null,
          quantidade: null,
        },
      ],
      totalizadores: { bruto: null, descontos: null, liquido: null },
    };
    const r = aplicarAntiAlucinacao(payload, OCR_HOLERITE);
    expect(r.extracted.rubricas).toHaveLength(0);
    expect(
      r.discarded.some((d) => d.field === "rubricas[0].nome"),
    ).toBe(true);
  });

  it("Caso 4: totalizador inventado mas rubrica válida → só o totalizador some", () => {
    const payload: ExtractedPayload = {
      competencia: "03/2024",
      rubricas: [
        {
          codigo: "0001",
          nome: "SALARIO BASE",
          valor_vencimento: 3500,
          valor_desconto: null,
          quantidade: null,
        },
      ],
      totalizadores: { bruto: 9999.99, descontos: null, liquido: null },
    };
    const r = aplicarAntiAlucinacao(payload, OCR_HOLERITE);
    expect(r.extracted.rubricas).toHaveLength(1);
    expect(r.extracted.totalizadores.bruto).toBeNull();
    expect(r.discarded.some((d) => d.field === "totalizadores.bruto")).toBe(true);
  });

  it("Caso 5: competência inventada → null + discarded", () => {
    const payload: ExtractedPayload = {
      competencia: "12/1999", // inventada
      rubricas: [],
      totalizadores: { bruto: null, descontos: null, liquido: null },
    };
    const r = aplicarAntiAlucinacao(payload, OCR_HOLERITE);
    expect(r.extracted.competencia).toBeNull();
    expect(r.discarded.some((d) => d.field === "competencia")).toBe(true);
  });
});
