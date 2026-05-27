import { describe, it, expect } from "vitest";
import { parseFichaAnotacoes } from "../parser";

describe("CTPS v2 — parser (Fase 1 = skeleton)", () => {
  it("deve existir o módulo parseFichaAnotacoes", () => {
    expect(typeof parseFichaAnotacoes).toBe("function");
  });
});
