/**
 * Testes — Vale Transporte (Seção 14). Modelo do MRD (config + linhas).
 * NB: Java é catálogo standalone sem 6%/valor≥0 — divergência documentada na spec.
 */
import { describe, it, expect } from "vitest";
import { vtConfigSchema, vtLinhaSchema, clampDescontoVT } from "../vale-transporte-schema";

describe("vtConfigSchema — desconto 0–6%", () => {
  it("aceita 0..6", () => {
    expect(vtConfigSchema.safeParse({ apurar: true, desconto_empregado_pct: 0 }).success).toBe(true);
    expect(vtConfigSchema.safeParse({ apurar: true, desconto_empregado_pct: 6 }).success).toBe(true);
    expect(vtConfigSchema.safeParse({ apurar: false, desconto_empregado_pct: 3.5 }).success).toBe(true);
  });
  it("rejeita > 6 e negativo", () => {
    expect(vtConfigSchema.safeParse({ apurar: true, desconto_empregado_pct: 6.01 }).success).toBe(false);
    expect(vtConfigSchema.safeParse({ apurar: true, desconto_empregado_pct: -1 }).success).toBe(false);
  });
});

describe("clampDescontoVT — teto 6% (paridade Math.min)", () => {
  it("limita a 6 e piso 0", () => {
    expect(clampDescontoVT(10)).toBe(6);
    expect(clampDescontoVT(6)).toBe(6);
    expect(clampDescontoVT(3)).toBe(3);
    expect(clampDescontoVT(-5)).toBe(0);
    expect(clampDescontoVT(NaN)).toBe(0);
  });
});

describe("vtLinhaSchema — linha", () => {
  const base = (over: Record<string, unknown> = {}) => ({
    descricao: "Linha 123",
    tipo: "URBANO" as const,
    valor_passagem: 4.5,
    quantidade_dia: 2,
    ...over,
  });
  const r = (o: Record<string, unknown> = {}) => vtLinhaSchema.safeParse(base(o));
  const has = (res: ReturnType<typeof r>, p: string) => !res.success && res.error.issues.some((i) => i.path[0] === p);

  it("aceita linha válida", () => expect(r().success).toBe(true));
  it("descrição obrigatória", () => {
    expect(has(r({ descricao: "" }), "descricao")).toBe(true);
  });
  it("valor_passagem ≥ 0", () => {
    expect(has(r({ valor_passagem: -1 }), "valor_passagem")).toBe(true);
    expect(r({ valor_passagem: 0 }).success).toBe(true);
  });
  it("quantidade_dia inteira ≥ 0", () => {
    expect(has(r({ quantidade_dia: -1 }), "quantidade_dia")).toBe(true);
    expect(has(r({ quantidade_dia: 2.5 }), "quantidade_dia")).toBe(true);
    expect(r({ quantidade_dia: 0 }).success).toBe(true);
  });
  it("tipo aceita os 3 valores do MRD", () => {
    expect(r({ tipo: "INTERMUNICIPAL" }).success).toBe(true);
    expect(r({ tipo: "INTERESTADUAL" }).success).toBe(true);
  });
});
