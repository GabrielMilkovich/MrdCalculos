/**
 * Testes de paridade — Advogado (Seção 3). Regras: Advogado.validar() (Java).
 * Fixtures de doc reutilizam validadores.test.ts.
 */
import { describe, it, expect } from "vitest";
import { advogadoSchema, docAdvogadoValido, type AdvogadoForm } from "../advogado-schema";

const base = (over: Partial<AdvogadoForm> = {}) => ({
  nome: "Dr. João Silva",
  representa: "RECLAMANTE" as const,
  tipo_documento: "CPF" as const,
  numero_documento: "",
  oab: "",
  oab_uf: "",
  ...over,
});

describe("advogadoSchema — paridade", () => {
  it("aceita só com Nome (único obrigatório)", () => {
    expect(advogadoSchema.safeParse(base()).success).toBe(true);
  });
  it("rejeita Nome vazio (MSG0003)", () => {
    const r = advogadoSchema.safeParse(base({ nome: "" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "nome")).toBe(true);
  });
  it("OAB nunca bloqueia (paridade Java — não valida OAB)", () => {
    expect(advogadoSchema.safeParse(base({ oab: "" })).success).toBe(true);
    expect(advogadoSchema.safeParse(base({ oab: "lixo-não-numérico" })).success).toBe(true);
  });
  it("valida doc fiscal por tipo SOMENTE se preenchido (MSG0004)", () => {
    // vazio → ok
    expect(advogadoSchema.safeParse(base({ numero_documento: "" })).success).toBe(true);
    // CPF inválido → bloqueia
    const r = advogadoSchema.safeParse(base({ tipo_documento: "CPF", numero_documento: "52998224726" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "numero_documento")).toBe(true);
    // CPF válido → ok
    expect(advogadoSchema.safeParse(base({ tipo_documento: "CPF", numero_documento: "529.982.247-25" })).success).toBe(true);
    // CNPJ por tipo
    expect(advogadoSchema.safeParse(base({ tipo_documento: "CNPJ", numero_documento: "33000167000101" })).success).toBe(true);
    expect(advogadoSchema.safeParse(base({ tipo_documento: "CNPJ", numero_documento: "33000167000102" })).success).toBe(false);
  });
});

describe("docAdvogadoValido", () => {
  it("vazio é válido; CEI aceito (sem validador local)", () => {
    expect(docAdvogadoValido("", "CPF")).toBe(true);
    expect(docAdvogadoValido("123", "CEI")).toBe(true);
  });
});
