/**
 * Testes de paridade — Histórico Salarial (Seção 4).
 * Regras: OcorrenciaDoHistoricoSalarial (Java) — competência + valor @NotNull.
 * Money via Decimal (CLAUDE.md — nunca parseFloat).
 */
import { describe, it, expect } from "vitest";
import { ocorrenciaHistoricoSchema } from "../historico-salarial-schema";
import { parseDecimalInput, toMoneyNumber, isValidMoney } from "@/lib/pjecalc/money";

const base = (over: Record<string, unknown> = {}) => ({
  competencia: "2023-05",
  valor: "1500,00",
  nome: "Salário Base",
  tipo_variacao: "FIXA" as const,
  ...over,
});

describe("ocorrenciaHistoricoSchema — paridade", () => {
  it("aceita ocorrência válida", () => {
    expect(ocorrenciaHistoricoSchema.safeParse(base()).success).toBe(true);
  });
  it("competência obrigatória (@NotNull dataOcorrencia)", () => {
    const r = ocorrenciaHistoricoSchema.safeParse(base({ competencia: "" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "competencia")).toBe(true);
  });
  it("rejeita competência mal-formada", () => {
    expect(ocorrenciaHistoricoSchema.safeParse(base({ competencia: "maio/2023" })).success).toBe(false);
  });
  it("aceita competência yyyy-MM-dd", () => {
    expect(ocorrenciaHistoricoSchema.safeParse(base({ competencia: "2023-05-01" })).success).toBe(true);
  });
  it("valor obrigatório (@NotNull) e ≥ 0", () => {
    expect(ocorrenciaHistoricoSchema.safeParse(base({ valor: "" })).success).toBe(false);
    expect(ocorrenciaHistoricoSchema.safeParse(base({ valor: "-1" })).success).toBe(false);
    expect(ocorrenciaHistoricoSchema.safeParse(base({ valor: "abc" })).success).toBe(false);
    expect(ocorrenciaHistoricoSchema.safeParse(base({ valor: "0" })).success).toBe(true);
  });
});

describe("money — Decimal (nunca parseFloat)", () => {
  it("parseDecimalInput aceita pt-BR e en", () => {
    expect(parseDecimalInput("1.234,56").toFixed(2)).toBe("1234.56");
    expect(parseDecimalInput("1234.56").toFixed(2)).toBe("1234.56");
    expect(parseDecimalInput("1234,5").toFixed(2)).toBe("1234.50");
    expect(parseDecimalInput(1500).toFixed(2)).toBe("1500.00");
  });
  it("toMoneyNumber é seguro e arredonda 2 casas", () => {
    expect(toMoneyNumber("1.234,567")).toBe(1234.57);
    expect(toMoneyNumber("")).toBe(0);
    expect(toMoneyNumber("lixo", -1)).toBe(-1);
    // não cai na armadilha do parseFloat ("12abc" → 12)
    expect(toMoneyNumber("12abc", 99)).toBe(99);
  });
  it("isValidMoney rejeita negativo/lixo/vazio", () => {
    expect(isValidMoney("100")).toBe(true);
    expect(isValidMoney("-1")).toBe(false);
    expect(isValidMoney("")).toBe(false);
    expect(isValidMoney("abc")).toBe(false);
  });
});
