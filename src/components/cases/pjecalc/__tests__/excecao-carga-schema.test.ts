/**
 * Testes de paridade — Exceção de Carga Horária (Seção 9).
 * Regras: ExcecaoDaCargaHorariaDoCalculo.validar() + Calculo.adicionar (MSG0024).
 */
import { describe, it, expect } from "vitest";
import {
  excecaoCargaSchema,
  detectarOverlapExcecaoCarga,
  type PeriodoExcecao,
} from "../excecao-carga-schema";

const base = (over: Record<string, unknown> = {}) => ({
  periodo_inicio: "2023-01-01",
  periodo_fim: "2023-06-30",
  carga_horaria_mensal: 180,
  ...over,
});
const r = (o: Record<string, unknown> = {}) => excecaoCargaSchema.safeParse(base(o));
const has = (res: ReturnType<typeof r>, p: string) => !res.success && res.error.issues.some((i) => i.path[0] === p);

describe("excecaoCargaSchema — paridade", () => {
  it("aceita exceção válida", () => expect(r().success).toBe(true));
  it("início/fim obrigatórios", () => {
    expect(has(r({ periodo_inicio: "" }), "periodo_inicio")).toBe(true);
    expect(has(r({ periodo_fim: "" }), "periodo_fim")).toBe(true);
  });
  it("término ≥ início (MSG0008)", () => {
    expect(has(r({ periodo_inicio: "2023-06-30", periodo_fim: "2023-01-01" }), "periodo_fim")).toBe(true);
  });
  it("aceita início == fim", () => {
    expect(r({ periodo_inicio: "2023-01-01", periodo_fim: "2023-01-01" }).success).toBe(true);
  });
  it("carga horária ≥ 0", () => {
    expect(has(r({ carga_horaria_mensal: -1 }), "carga_horaria_mensal")).toBe(true);
    expect(r({ carga_horaria_mensal: 0 }).success).toBe(true);
    expect(r({ carga_horaria_mensal: 220 }).success).toBe(true);
  });
});

describe("detectarOverlapExcecaoCarga — MSG0024", () => {
  const lista: PeriodoExcecao[] = [
    { id: "a", periodo_inicio: "2023-01-01", periodo_fim: "2023-06-30" },
    { id: "b", periodo_inicio: "2023-09-01", periodo_fim: "2023-12-31" },
  ];
  it("detecta sobreposição", () => {
    expect(detectarOverlapExcecaoCarga({ periodo_inicio: "2023-06-01", periodo_fim: "2023-07-01" }, lista)).toBe("a");
  });
  it("detecta toque nas pontas (inclusivo)", () => {
    expect(detectarOverlapExcecaoCarga({ periodo_inicio: "2023-06-30", periodo_fim: "2023-08-01" }, lista)).toBe("a");
  });
  it("ignora a própria exceção na edição", () => {
    expect(detectarOverlapExcecaoCarga({ id: "a", periodo_inicio: "2023-02-01", periodo_fim: "2023-05-01" }, lista)).toBeNull();
  });
  it("retorna null sem conflito (período disjunto)", () => {
    expect(detectarOverlapExcecaoCarga({ periodo_inicio: "2023-07-01", periodo_fim: "2023-08-31" }, lista)).toBeNull();
  });
});
