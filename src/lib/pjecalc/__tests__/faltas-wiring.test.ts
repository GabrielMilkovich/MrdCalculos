/**
 * Wiring Faltas → input do engine (Seção 5, DoD). Prova que cada campo de
 * PjecalcFaltaRow chega ao PjeFalta consumido pelo engine (toEngineFaltas).
 */
import { describe, it, expect } from "vitest";
import { mapFaltasToEngine as toEngineFaltas } from "../faltas-engine-map";
import type { PjecalcFaltaRow } from "../types";

const row = (over: Partial<PjecalcFaltaRow> = {}): PjecalcFaltaRow =>
  ({
    id: "f1",
    case_id: "c1",
    tipo_falta: "",
    data_inicial: "2023-03-01",
    data_final: "2023-03-05",
    justificada: false,
    motivo: "Atestado",
    observacoes: null,
    created_at: "2024-01-01T00:00:00Z",
    reiniciar_ferias: false,
    ...over,
  }) as PjecalcFaltaRow;

describe("toEngineFaltas — wiring p/ o engine", () => {
  it("mapeia todos os campos da falta para PjeFalta", () => {
    const [f] = toEngineFaltas([row({ justificada: true, reiniciar_ferias: true })]);
    expect(f).toEqual({
      id: "f1",
      data_inicial: "2023-03-01",
      data_final: "2023-03-05",
      justificada: true,
      justificativa: "Atestado",
      reinicia: true,
    });
  });

  it("justificativa undefined quando motivo vazio", () => {
    const [f] = toEngineFaltas([row({ motivo: null })]);
    expect(f.justificativa).toBeUndefined();
  });

  it("defaults seguros (justificada/reinicia = false)", () => {
    const [f] = toEngineFaltas([row({ justificada: undefined as unknown as boolean, reiniciar_ferias: null })]);
    expect(f.justificada).toBe(false);
    expect(f.reinicia).toBe(false);
  });

  it("mapeia lista preservando ordem", () => {
    const out = toEngineFaltas([row({ id: "a" }), row({ id: "b", data_inicial: "2023-04-01", data_final: "2023-04-02" })]);
    expect(out.map((f) => f.id)).toEqual(["a", "b"]);
  });
});
