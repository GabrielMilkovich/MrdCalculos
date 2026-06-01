/**
 * Testes de paridade — Verba de Cálculo (Seção 11, modelo flattened).
 * Regras: VerbaDeCalculo/Calculada.validar() (Java).
 */
import { describe, it, expect } from "vitest";
import { verbaSchema, BASES_REQUEREM_HISTORICO } from "../verba-schema";

const base = (over: Record<string, unknown> = {}) => ({
  nome: "Horas Extras 50%",
  caracteristica: "HORAS_EXTRAS",
  base_tabelada: "",
  hist_salarial_nome: "",
  periodo_inicio: "",
  periodo_fim: "",
  multiplicador: "1.5",
  divisor: "220",
  quantidade_valor: "",
  ...over,
});
const r = (o: Record<string, unknown> = {}) => verbaSchema.safeParse(base(o));
const has = (res: ReturnType<typeof r>, p: string) => !res.success && res.error.issues.some((i) => i.path[0] === p);

describe("verbaSchema — paridade", () => {
  it("aceita verba válida mínima", () => expect(r().success).toBe(true));
  it("nome obrigatório", () => {
    expect(has(r({ nome: "" }), "nome")).toBe(true);
    expect(has(r({ nome: "   " }), "nome")).toBe(true);
  });
  it("período fim ≥ início (MSG0008)", () => {
    expect(has(r({ periodo_inicio: "2023-06-30", periodo_fim: "2023-01-01" }), "periodo_fim")).toBe(true);
    expect(r({ periodo_inicio: "2023-01-01", periodo_fim: "2023-06-30" }).success).toBe(true);
    expect(r({ periodo_inicio: "2023-01-01", periodo_fim: "2023-01-01" }).success).toBe(true);
  });
  it("divisor ≠ 0 e numérico", () => {
    expect(has(r({ divisor: "0" }), "divisor")).toBe(true);
    expect(has(r({ divisor: "abc" }), "divisor")).toBe(true);
    expect(r({ divisor: "220" }).success).toBe(true);
    expect(r({ divisor: "30,5" }).success).toBe(true); // pt-BR
  });
  it("multiplicador numérico", () => {
    expect(has(r({ multiplicador: "x" }), "multiplicador")).toBe(true);
    expect(r({ multiplicador: "1,5" }).success).toBe(true);
  });
  it("quantidade ≥ 0 quando preenchida", () => {
    expect(has(r({ quantidade_valor: "-1" }), "quantidade_valor")).toBe(true);
    expect(r({ quantidade_valor: "0" }).success).toBe(true);
    expect(r({ quantidade_valor: "10" }).success).toBe(true);
  });
});

describe("verbaSchema — base histórico exige vínculo (MSG0003 Histórico Salarial)", () => {
  it("base histórico sem hist_salarial_nome bloqueia", () => {
    for (const baseHist of BASES_REQUEREM_HISTORICO) {
      expect(has(r({ base_tabelada: baseHist, hist_salarial_nome: "" }), "hist_salarial_nome")).toBe(true);
    }
  });
  it("base histórico COM hist_salarial_nome passa", () => {
    expect(r({ base_tabelada: "historico_salarial", hist_salarial_nome: "Salário Base" }).success).toBe(true);
  });
  it("base não-histórico não exige hist", () => {
    expect(r({ base_tabelada: "salario_minimo", hist_salarial_nome: "" }).success).toBe(true);
  });
});
