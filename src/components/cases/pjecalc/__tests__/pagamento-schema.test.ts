/**
 * Testes de paridade — Pagamento (Seção 13). Regras: Pagamento.validar() (Java).
 */
import { describe, it, expect } from "vitest";
import { pagamentoSchema, detectarPagamentoDuplicado, type PagamentoExistente } from "../pagamento-schema";

const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

const base = (over: Record<string, unknown> = {}) => ({
  valor: "1500,00",
  data_pagamento: ontem,
  competencia: "",
  tipo: "EMPREGADOR",
  ...over,
});
const r = (o: Record<string, unknown> = {}) => pagamentoSchema.safeParse(base(o));
const has = (res: ReturnType<typeof r>, p: string) => !res.success && res.error.issues.some((i) => i.path[0] === p);

describe("pagamentoSchema — paridade", () => {
  it("aceita pagamento válido", () => expect(r().success).toBe(true));
  it("valor obrigatório e > 0 (MSG0003)", () => {
    expect(has(r({ valor: "" }), "valor")).toBe(true);
    expect(has(r({ valor: "0" }), "valor")).toBe(true);
    expect(has(r({ valor: "-50" }), "valor")).toBe(true);
    expect(r({ valor: "0,01" }).success).toBe(true);
  });
  it("aceita valor pt-BR e en", () => {
    expect(r({ valor: "1.234,56" }).success).toBe(true);
    expect(r({ valor: "1234.56" }).success).toBe(true);
  });
  it("data obrigatória (MSG0003)", () => {
    expect(has(r({ data_pagamento: "" }), "data_pagamento")).toBe(true);
  });
  it("data não pode ser futura (MSG0128)", () => {
    expect(has(r({ data_pagamento: amanha }), "data_pagamento")).toBe(true);
    expect(r({ data_pagamento: ontem }).success).toBe(true);
  });
});

describe("detectarPagamentoDuplicado — MSG0138 (mesma data)", () => {
  const lista: PagamentoExistente[] = [
    { id: "a", data_pagamento: "2023-05-10" },
    { id: "b", data_pagamento: "2023-06-15" },
  ];
  it("detecta data duplicada", () => {
    expect(detectarPagamentoDuplicado({ data_pagamento: "2023-05-10" }, lista)).toBe("a");
  });
  it("ignora o próprio na edição", () => {
    expect(detectarPagamentoDuplicado({ id: "a", data_pagamento: "2023-05-10" }, lista)).toBeNull();
  });
  it("retorna null sem duplicata", () => {
    expect(detectarPagamentoDuplicado({ data_pagamento: "2023-07-01" }, lista)).toBeNull();
  });
});
