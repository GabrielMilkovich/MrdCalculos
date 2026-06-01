/**
 * Testes de paridade de validação — Parâmetros Gerais (Seção 2).
 * Regras: Calculo.java (ver docs/specs/parametros-gerais.md).
 */
import { describe, it, expect } from "vitest";
import { parametrosGeraisSchema, type ParametrosGeraisForm } from "../parametros-gerais-schema";

const base = (over: Partial<ParametrosGeraisForm> = {}): Record<string, unknown> => ({
  estado: "SP",
  municipio: "3550308",
  data_admissao: "2020-01-01",
  data_demissao: "2023-06-30",
  data_ajuizamento: "2023-08-01",
  data_ajuizamento_ok: true,
  prazo_aviso_previo: "nao_apurar",
  ...over,
});

const ok = (over: Partial<ParametrosGeraisForm> = {}) => parametrosGeraisSchema.safeParse(base(over));
const issuesOn = (r: ReturnType<typeof ok>, path: string) =>
  !r.success && r.error.issues.some((i) => i.path[0] === path);

describe("parametrosGeraisSchema — obrigatórios", () => {
  it("aceita form mínimo válido", () => {
    expect(ok().success).toBe(true);
  });
  it("exige Estado, Município, Admissão, Ajuizamento", () => {
    expect(issuesOn(ok({ estado: "" }), "estado")).toBe(true);
    expect(issuesOn(ok({ municipio: "" }), "municipio")).toBe(true);
    expect(issuesOn(ok({ data_admissao: "" }), "data_admissao")).toBe(true);
    expect(issuesOn(ok({ data_ajuizamento: "" }), "data_ajuizamento")).toBe(true);
  });
  it("MSG0020: exige Demissão OU Data Final", () => {
    expect(issuesOn(ok({ data_demissao: "", data_final: "" }), "data_demissao")).toBe(true);
    // só data_final preenchida → válido
    expect(ok({ data_demissao: "", data_final: "2023-06-30" }).success).toBe(true);
  });
});

describe("parametrosGeraisSchema — datas (Calculo.java)", () => {
  it("Admissão não pode ser hoje/futuro (MSG0009)", () => {
    const futuro = new Date(); futuro.setFullYear(futuro.getFullYear() + 1);
    const iso = futuro.toISOString().slice(0, 10);
    expect(issuesOn(ok({ data_admissao: iso, data_demissao: iso }), "data_admissao")).toBe(true);
  });
  it("Demissão ≥ Admissão (MSG0008)", () => {
    expect(issuesOn(ok({ data_admissao: "2023-01-01", data_demissao: "2020-01-01" }), "data_demissao")).toBe(true);
  });
  it("Ajuizamento ≥ Admissão (MSG0008)", () => {
    expect(issuesOn(ok({ data_admissao: "2023-01-01", data_demissao: "2024-01-01", data_ajuizamento: "2022-01-01" }), "data_ajuizamento")).toBe(true);
  });
  it("Data inicial ≥ Admissão e ≤ Demissão", () => {
    expect(issuesOn(ok({ data_inicial: "2019-01-01" }), "data_inicial")).toBe(true); // < admissão
    expect(issuesOn(ok({ data_inicial: "2024-01-01" }), "data_inicial")).toBe(true); // > demissão
    expect(ok({ data_inicial: "2021-01-01" }).success).toBe(true);
  });
  it("Data final ≥ Admissão e ≥ Início", () => {
    expect(issuesOn(ok({ data_final: "2019-01-01" }), "data_final")).toBe(true);
    expect(issuesOn(ok({ data_inicial: "2022-01-01", data_final: "2021-01-01" }), "data_final")).toBe(true);
  });
});

describe("parametrosGeraisSchema — aviso prévio informado", () => {
  it("exige Quantidade ≥ 1 quando 'informado'", () => {
    expect(issuesOn(ok({ prazo_aviso_previo: "informado", prazo_aviso_dias: "" }), "prazo_aviso_dias")).toBe(true);
    expect(issuesOn(ok({ prazo_aviso_previo: "informado", prazo_aviso_dias: "0" }), "prazo_aviso_dias")).toBe(true);
    expect(ok({ prazo_aviso_previo: "informado", prazo_aviso_dias: "30" }).success).toBe(true);
  });
  it("não exige Quantidade quando 'nao_apurar'", () => {
    expect(ok({ prazo_aviso_previo: "nao_apurar", prazo_aviso_dias: "" }).success).toBe(true);
  });
});

describe("parametrosGeraisSchema — defaults Calculo.java", () => {
  it("aplica defaults de flags", () => {
    const r = parametrosGeraisSchema.safeParse(base());
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sabado_dia_util).toBe(true);
      expect(r.data.projetar_aviso_indenizado).toBe(true);
      expect(r.data.considerar_feriado_estadual).toBe(true);
      expect(r.data.considerar_feriado_municipal).toBe(true);
      expect(r.data.limitar_avos_periodo).toBe(false);
      expect(r.data.zerar_valor_negativo).toBe(false);
      expect(r.data.tipo_mes).toBe("comercial");
      expect(r.data.regime_trabalho).toBe("tempo_integral");
    }
  });
});
