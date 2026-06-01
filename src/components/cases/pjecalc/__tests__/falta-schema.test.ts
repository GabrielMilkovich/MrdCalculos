/**
 * Testes de paridade — Falta (Seção 5). Regras: Falta.validar() (Java).
 *  - datas obrigatórias (@Required); término ≥ inicial (@GreaterOrEqualThan, MSG0008);
 *  - overlap entre faltas (MSG0024, inclusivo nas pontas).
 */
import { describe, it, expect } from "vitest";
import {
  faltaSchema,
  periodosCoincidem,
  detectarOverlapFalta,
  type PeriodoFalta,
} from "../falta-schema";

const base = (over: Record<string, unknown> = {}) => ({
  data_inicial: "2023-03-01",
  data_final: "2023-03-05",
  justificada: false,
  reiniciar_ferias: false,
  motivo: "",
  ...over,
});

describe("faltaSchema — paridade", () => {
  it("aceita falta válida", () => {
    expect(faltaSchema.safeParse(base()).success).toBe(true);
  });
  it("datas obrigatórias (@Required)", () => {
    expect(faltaSchema.safeParse(base({ data_inicial: "" })).success).toBe(false);
    expect(faltaSchema.safeParse(base({ data_final: "" })).success).toBe(false);
  });
  it("término ≥ inicial (MSG0008)", () => {
    const r = faltaSchema.safeParse(base({ data_inicial: "2023-03-05", data_final: "2023-03-01" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "data_final")).toBe(true);
  });
  it("aceita início == término (um dia)", () => {
    expect(faltaSchema.safeParse(base({ data_inicial: "2023-03-01", data_final: "2023-03-01" })).success).toBe(true);
  });
  it("justificativa máx. 200 chars", () => {
    expect(faltaSchema.safeParse(base({ motivo: "x".repeat(201) })).success).toBe(false);
    expect(faltaSchema.safeParse(base({ motivo: "x".repeat(200) })).success).toBe(true);
  });
});

describe("periodosCoincidem — overlap inclusivo (MSG0024)", () => {
  const p = (di: string, df: string): PeriodoFalta => ({ data_inicial: di, data_final: df });
  it("detecta sobreposição parcial", () => {
    expect(periodosCoincidem(p("2023-03-01", "2023-03-10"), p("2023-03-05", "2023-03-15"))).toBe(true);
  });
  it("detecta contenção", () => {
    expect(periodosCoincidem(p("2023-03-01", "2023-03-31"), p("2023-03-10", "2023-03-12"))).toBe(true);
  });
  it("detecta toque nas pontas (inclusivo)", () => {
    expect(periodosCoincidem(p("2023-03-01", "2023-03-05"), p("2023-03-05", "2023-03-10"))).toBe(true);
  });
  it("não detecta períodos disjuntos", () => {
    expect(periodosCoincidem(p("2023-03-01", "2023-03-05"), p("2023-03-06", "2023-03-10"))).toBe(false);
  });
});

describe("detectarOverlapFalta", () => {
  const lista: PeriodoFalta[] = [
    { id: "a", data_inicial: "2023-03-01", data_final: "2023-03-05" },
    { id: "b", data_inicial: "2023-04-01", data_final: "2023-04-10" },
  ];
  it("retorna id conflitante quando há overlap", () => {
    expect(detectarOverlapFalta({ data_inicial: "2023-03-04", data_final: "2023-03-06" }, lista)).toBe("a");
  });
  it("ignora a própria falta (mesmo id) na edição", () => {
    expect(detectarOverlapFalta({ id: "a", data_inicial: "2023-03-02", data_final: "2023-03-04" }, lista)).toBeNull();
  });
  it("retorna null sem conflito", () => {
    expect(detectarOverlapFalta({ data_inicial: "2023-05-01", data_final: "2023-05-02" }, lista)).toBeNull();
  });
});
