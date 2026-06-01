/**
 * Testes de paridade — Config IRPF (Seção 16). Regras: Irpf.validar() (Java).
 */
import { describe, it, expect } from "vitest";
import { irConfigSchema } from "../ir-config-schema";

const base = (over: Record<string, unknown> = {}) => ({
  apurar: true,
  possui_dependentes: false,
  dependentes: 0,
  apurar_rra: false,
  rra_meses: 0,
  rra_numero_parcelas: 0,
  ...over,
});
const r = (o: Record<string, unknown> = {}) => irConfigSchema.safeParse(base(o));
const has = (res: ReturnType<typeof r>, p: string) => !res.success && res.error.issues.some((i) => i.path[0] === p);

describe("irConfigSchema — paridade", () => {
  it("aceita config padrão (sem dependentes, sem RRA)", () => expect(r().success).toBe(true));

  it("possui dependentes ⇒ qty ≥ 1 (MSG0004)", () => {
    expect(has(r({ possui_dependentes: true, dependentes: 0 }), "dependentes")).toBe(true);
    expect(r({ possui_dependentes: true, dependentes: 2 }).success).toBe(true);
  });
  it("dependentes não pode ser negativo", () => {
    expect(has(r({ dependentes: -1 }), "dependentes")).toBe(true);
  });
  it("RRA habilitado ⇒ meses e parcelas ≥ 1", () => {
    expect(has(r({ apurar_rra: true, rra_meses: 0, rra_numero_parcelas: 3 }), "rra_meses")).toBe(true);
    expect(has(r({ apurar_rra: true, rra_meses: 12, rra_numero_parcelas: 0 }), "rra_numero_parcelas")).toBe(true);
    expect(r({ apurar_rra: true, rra_meses: 12, rra_numero_parcelas: 3 }).success).toBe(true);
  });
  it("RRA desligado não exige meses/parcelas", () => {
    expect(r({ apurar_rra: false, rra_meses: 0, rra_numero_parcelas: 0 }).success).toBe(true);
  });
  it("IR desligado (apurar=false) não valida nada", () => {
    expect(r({ apurar: false, possui_dependentes: true, dependentes: 0, apurar_rra: true, rra_meses: 0 }).success).toBe(true);
  });
});
