/**
 * Testes de paridade — Exceção de Sábado (Seção 10).
 * Regras: ExcecaoDoSabadoDoCalculo.validar() + Calculo.adicionar (MSG0024).
 */
import { describe, it, expect } from "vitest";
import {
  excecaoSabadoSchema,
  detectarOverlapExcecaoSabado,
  type PeriodoSabado,
} from "../excecao-sabado-schema";

const base = (over: Record<string, unknown> = {}) => ({
  data_inicio: "2023-01-01",
  data_fim: "2023-06-30",
  sabado_dia_util: false,
  ...over,
});
const r = (o: Record<string, unknown> = {}) => excecaoSabadoSchema.safeParse(base(o));
const has = (res: ReturnType<typeof r>, p: string) => !res.success && res.error.issues.some((i) => i.path[0] === p);

describe("excecaoSabadoSchema — paridade", () => {
  it("aceita exceção válida", () => expect(r().success).toBe(true));
  it("início/fim obrigatórios", () => {
    expect(has(r({ data_inicio: "" }), "data_inicio")).toBe(true);
    expect(has(r({ data_fim: "" }), "data_fim")).toBe(true);
  });
  it("término ≥ início (MSG0008)", () => {
    expect(has(r({ data_inicio: "2023-06-30", data_fim: "2023-01-01" }), "data_fim")).toBe(true);
  });
  it("aceita início == fim", () => {
    expect(r({ data_inicio: "2023-01-01", data_fim: "2023-01-01" }).success).toBe(true);
  });
  it("aceita flag sabado_dia_util true/false", () => {
    expect(r({ sabado_dia_util: true }).success).toBe(true);
    expect(r({ sabado_dia_util: false }).success).toBe(true);
  });
});

describe("detectarOverlapExcecaoSabado — MSG0024", () => {
  const lista: PeriodoSabado[] = [
    { id: "a", data_inicio: "2023-01-01", data_fim: "2023-06-30" },
    { id: "b", data_inicio: "2023-09-01", data_fim: "2023-12-31" },
  ];
  it("detecta sobreposição", () => {
    expect(detectarOverlapExcecaoSabado({ data_inicio: "2023-06-01", data_fim: "2023-07-01" }, lista)).toBe("a");
  });
  it("detecta toque nas pontas (inclusivo)", () => {
    expect(detectarOverlapExcecaoSabado({ data_inicio: "2023-06-30", data_fim: "2023-08-01" }, lista)).toBe("a");
  });
  it("ignora a própria exceção na edição", () => {
    expect(detectarOverlapExcecaoSabado({ id: "b", data_inicio: "2023-10-01", data_fim: "2023-11-01" }, lista)).toBeNull();
  });
  it("retorna null sem conflito", () => {
    expect(detectarOverlapExcecaoSabado({ data_inicio: "2023-07-01", data_fim: "2023-08-31" }, lista)).toBeNull();
  });
});
