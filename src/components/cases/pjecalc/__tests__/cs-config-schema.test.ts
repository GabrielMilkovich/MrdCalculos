/**
 * Testes de paridade — Config Contribuição Social / INSS (Seção 15).
 * Regras: Inss.validar() (Java) ao nível flattened do MRD.
 */
import { describe, it, expect } from "vitest";
import { csConfigSchema, parseAliquota } from "../cs-config-schema";

const base = (over: Record<string, unknown> = {}) => ({
  aliquota_segurado_tipo: "empregado" as const,
  aliquota_segurado_fixa: "",
  aliquota_empresa_fixa: "20",
  aliquota_sat_fixa: "2",
  aliquota_terceiros_fixa: "5.8",
  simples_nacional: false,
  simples_inicio: "",
  simples_fim: "",
  ...over,
});
const r = (o: Record<string, unknown> = {}) => csConfigSchema.safeParse(base(o));
const has = (res: ReturnType<typeof r>, p: string) => !res.success && res.error.issues.some((i) => i.path[0] === p);

describe("csConfigSchema — paridade", () => {
  it("aceita config padrão (empregado)", () => expect(r().success).toBe(true));

  it("segurado FIXA exige alíquota (MSG0003)", () => {
    expect(has(r({ aliquota_segurado_tipo: "fixa", aliquota_segurado_fixa: "" }), "aliquota_segurado_fixa")).toBe(true);
    expect(r({ aliquota_segurado_tipo: "fixa", aliquota_segurado_fixa: "11" }).success).toBe(true);
  });
  it("tipo empregado/domestico não exige alíquota fixa", () => {
    expect(r({ aliquota_segurado_tipo: "empregado", aliquota_segurado_fixa: "" }).success).toBe(true);
    expect(r({ aliquota_segurado_tipo: "domestico", aliquota_segurado_fixa: "" }).success).toBe(true);
  });
  it("alíquotas devem estar em 0–100", () => {
    expect(has(r({ aliquota_empresa_fixa: "101" }), "aliquota_empresa_fixa")).toBe(true);
    expect(has(r({ aliquota_sat_fixa: "-1" }), "aliquota_sat_fixa")).toBe(true);
    expect(has(r({ aliquota_terceiros_fixa: "abc" }), "aliquota_terceiros_fixa")).toBe(true);
    expect(r({ aliquota_empresa_fixa: "0" }).success).toBe(true);
    expect(r({ aliquota_empresa_fixa: "100" }).success).toBe(true);
  });
  it("aceita alíquota pt-BR (vírgula)", () => {
    expect(r({ aliquota_terceiros_fixa: "5,8" }).success).toBe(true);
  });
  it("período Simples: término ≥ início", () => {
    expect(has(r({ simples_nacional: true, simples_inicio: "2023-06-30", simples_fim: "2023-01-01" }), "simples_fim")).toBe(true);
    expect(r({ simples_nacional: true, simples_inicio: "2023-01-01", simples_fim: "2023-06-30" }).success).toBe(true);
  });
});

describe("parseAliquota — Decimal (nunca parseFloat)", () => {
  it("converte pt-BR/en; null se vazio/inválido", () => {
    expect(parseAliquota("5,8")?.toFixed(2)).toBe("5.80");
    expect(parseAliquota("20")?.toNumber()).toBe(20);
    expect(parseAliquota(2)?.toNumber()).toBe(2);
    expect(parseAliquota("")).toBeNull();
    expect(parseAliquota("xx")).toBeNull();
  });
  it("não cai na armadilha do parseFloat ('5abc')", () => {
    expect(parseAliquota("5abc")).toBeNull();
  });
});
