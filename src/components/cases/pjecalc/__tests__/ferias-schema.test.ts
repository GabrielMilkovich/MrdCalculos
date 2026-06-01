/**
 * Testes de paridade — Férias (Seção 6). Regras: Ferias.java + regras/*ValidRule.
 */
import { describe, it, expect } from "vitest";
import { feriasSchema, type FeriasForm } from "../ferias-schema";

const base = (over: Partial<FeriasForm> = {}): Record<string, unknown> => ({
  periodo_aquisitivo_inicio: "2020-01-01",
  periodo_aquisitivo_fim: "2020-12-31",
  periodo_concessivo_inicio: "2021-01-01",
  periodo_concessivo_fim: "2021-12-31",
  situacao: "gozadas",
  prazo_dias: 30,
  dobra_geral: false,
  abono: false,
  abono_dias: 0,
  gozo_1_inicio: "", gozo_1_fim: "",
  gozo_2_inicio: "", gozo_2_fim: "",
  gozo_3_inicio: "", gozo_3_fim: "",
  ...over,
});
const ok = (o: Partial<FeriasForm> = {}) => feriasSchema.safeParse(base(o));
const has = (r: ReturnType<typeof ok>, p: string) => !r.success && r.error.issues.some((i) => i.path[0] === p);

describe("feriasSchema — obrigatórios e datas", () => {
  it("aceita férias válidas", () => expect(ok().success).toBe(true));
  it("exige as 4 datas + situação", () => {
    expect(has(ok({ periodo_aquisitivo_inicio: "" }), "periodo_aquisitivo_inicio")).toBe(true);
    expect(has(ok({ periodo_concessivo_fim: "" }), "periodo_concessivo_fim")).toBe(true);
  });
  it("aquisitivo/concessivo fim ≥ início", () => {
    expect(has(ok({ periodo_aquisitivo_inicio: "2020-12-31", periodo_aquisitivo_fim: "2020-01-01" }), "periodo_aquisitivo_fim")).toBe(true);
    expect(has(ok({ periodo_concessivo_inicio: "2021-12-31", periodo_concessivo_fim: "2021-01-01" }), "periodo_concessivo_fim")).toBe(true);
  });
});

describe("feriasSchema — prazo e abono", () => {
  it("prazo ≥ 0 e ≤ 30", () => {
    expect(has(ok({ prazo_dias: -1 }), "prazo_dias")).toBe(true);
    expect(has(ok({ prazo_dias: 31 }), "prazo_dias")).toBe(true);
    expect(ok({ prazo_dias: 0 }).success).toBe(true);
  });
  it("abono só p/ gozadas ou parcial (AbonoDeFeriasValidRule)", () => {
    expect(has(ok({ abono: true, situacao: "indenizadas", abono_dias: 5 }), "abono")).toBe(true);
    expect(has(ok({ abono: true, situacao: "perdidas", abono_dias: 5 }), "abono")).toBe(true);
    expect(ok({ abono: true, situacao: "gozadas", abono_dias: 10 }).success).toBe(true);
    expect(ok({ abono: true, situacao: "gozadas_parcialmente", abono_dias: 5 }).success).toBe(true);
  });
  it("abono ⇒ dias ≤ prazo/3 (DiasDeAbonoValidRule, MSG0175)", () => {
    expect(has(ok({ abono: true, situacao: "gozadas", prazo_dias: 30, abono_dias: 11 }), "abono_dias")).toBe(true);
    expect(ok({ abono: true, situacao: "gozadas", prazo_dias: 30, abono_dias: 10 }).success).toBe(true);
    // sem abono: dias_abono não é checado
    expect(ok({ abono: false, prazo_dias: 30, abono_dias: 30 }).success).toBe(true);
  });
});

describe("feriasSchema — períodos de gozo (PeriodoDeGozoValidRule)", () => {
  it("cada fração: fim ≥ início (MSG0008)", () => {
    expect(has(ok({ gozo_1_inicio: "2021-02-10", gozo_1_fim: "2021-02-01" }), "gozo_1_fim")).toBe(true);
  });
  it("frações não-sobrepostas: gozo2.ini > gozo1.fim (MSG0007)", () => {
    expect(has(ok({
      gozo_1_inicio: "2021-02-01", gozo_1_fim: "2021-02-10",
      gozo_2_inicio: "2021-02-10", gozo_2_fim: "2021-02-15",
    }), "gozo_2_inicio")).toBe(true);
    // ok quando início do 2 é depois do fim do 1
    expect(ok({
      gozo_1_inicio: "2021-02-01", gozo_1_fim: "2021-02-10",
      gozo_2_inicio: "2021-02-11", gozo_2_fim: "2021-02-15",
    }).success).toBe(true);
  });
  it("gozo3.ini > gozo2.fim", () => {
    expect(has(ok({
      gozo_2_inicio: "2021-03-01", gozo_2_fim: "2021-03-10",
      gozo_3_inicio: "2021-03-05", gozo_3_fim: "2021-03-12",
    }), "gozo_3_inicio")).toBe(true);
  });
});
