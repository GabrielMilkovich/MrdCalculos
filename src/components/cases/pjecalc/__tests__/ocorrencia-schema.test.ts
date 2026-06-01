/**
 * Testes de paridade — Ocorrência de Verba (Seção 12).
 * Regras: OcorrenciaDeVerba (Java) — único bound é divisor @Min("0.01");
 * devido/pago NÃO têm ≥0 (negativos OK). Recompute via Decimal.
 */
import { describe, it, expect } from "vitest";
import { ocorrenciaSchema, recomputeOcorrencia } from "../ocorrencia-schema";

const base = (over: Record<string, unknown> = {}) => ({
  competencia: "2023-05",
  base_valor: 1000,
  divisor_valor: 30,
  multiplicador_valor: 1,
  quantidade_valor: 1,
  dobra: 1,
  pago: 0,
  ...over,
});
const r = (o: Record<string, unknown> = {}) => ocorrenciaSchema.safeParse(base(o));
const has = (res: ReturnType<typeof r>, p: string) => !res.success && res.error.issues.some((i) => i.path[0] === p);

describe("ocorrenciaSchema — paridade", () => {
  it("aceita ocorrência válida", () => expect(r().success).toBe(true));
  it("competência obrigatória + formato", () => {
    expect(has(r({ competencia: "" }), "competencia")).toBe(true);
    expect(has(r({ competencia: "maio/23" }), "competencia")).toBe(true);
    expect(r({ competencia: "2023-05-01" }).success).toBe(true);
  });
  it("divisor ≥ 0,01 (@Min 0.01)", () => {
    expect(has(r({ divisor_valor: 0 }), "divisor_valor")).toBe(true);
    expect(has(r({ divisor_valor: 0.005 }), "divisor_valor")).toBe(true);
    expect(r({ divisor_valor: 0.01 }).success).toBe(true);
    expect(r({ divisor_valor: 220 }).success).toBe(true);
  });
  it("devido/pago aceitam negativo (paridade: Java não valida ≥0)", () => {
    expect(r({ pago: -100 }).success).toBe(true);
  });
});

describe("recomputeOcorrencia — Decimal (nunca number/parseFloat)", () => {
  it("calcula devido = base*mult/divisor*qtd*dobra", () => {
    // 3000 * 1 / 30 * 10 * 1 = 1000
    const c = recomputeOcorrencia({ base_valor: 3000, divisor_valor: 30, multiplicador_valor: 1, quantidade_valor: 10, dobra: 1, pago: 0 });
    expect(c.devido).toBe(1000);
    expect(c.diferenca).toBe(1000);
  });
  it("diferença = devido - pago; total inclui correção+juros", () => {
    const c = recomputeOcorrencia({ base_valor: 1000, divisor_valor: 1, multiplicador_valor: 1, quantidade_valor: 1, dobra: 1, pago: 300, correcao: 50, juros: 20 });
    expect(c.devido).toBe(1000);
    expect(c.diferenca).toBe(700);
    expect(c.total).toBe(770);
  });
  it("divisor 0 cai em 30 (proteção)", () => {
    const c = recomputeOcorrencia({ base_valor: 300, divisor_valor: 0, multiplicador_valor: 1, quantidade_valor: 30, dobra: 1, pago: 0 });
    expect(c.devido).toBe(300); // 300/30*30 = 300
  });
  it("arredonda 2 casas sem erro de float", () => {
    // base 0.1 + ... clássico do float: garante 2 casas exatas
    const c = recomputeOcorrencia({ base_valor: 1000.555, divisor_valor: 1, multiplicador_valor: 1, quantidade_valor: 1, dobra: 1, pago: 0 });
    expect(c.devido).toBe(1000.56); // arredonda half-up p/ 2 casas
  });
});
