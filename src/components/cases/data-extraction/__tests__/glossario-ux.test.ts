import { describe, expect, it } from "vitest";
import { traduzir, scoreToLabel } from "../glossario-ux";

describe("traduzir", () => {
  it("traduz layout generico_v1", () => {
    expect(traduzir("layout", "generico_v1")).toBe("Padrão genérico");
  });

  it("retorna chave original como failsafe quando não encontra tradução", () => {
    expect(traduzir("layout", "inexistente")).toBe("inexistente");
  });

  it("traduz categoria NAO_CLASSIFICADO", () => {
    expect(traduzir("categoria", "NAO_CLASSIFICADO")).toBe("Sem categoria");
  });

  it("traduz pipelineStatus failed", () => {
    expect(traduzir("pipelineStatus", "failed")).toBe("Não foi possível ler");
  });
});

describe("scoreToLabel", () => {
  it("score 95 → tone ok", () => {
    const result = scoreToLabel(95);
    expect(result.tone).toBe("ok");
    expect(result.label).toBe("Pronto para conferência");
  });

  it("score 86 → tone ok (limite inferior)", () => {
    expect(scoreToLabel(86).tone).toBe("ok");
  });

  it("score 70 → tone atencao", () => {
    const result = scoreToLabel(70);
    expect(result.tone).toBe("atencao");
    expect(result.label).toBe("Conferir dados destacados");
  });

  it("score 60 → tone atencao (limite inferior)", () => {
    expect(scoreToLabel(60).tone).toBe("atencao");
  });

  it("score 30 → tone revisar", () => {
    const result = scoreToLabel(30);
    expect(result.tone).toBe("revisar");
    expect(result.label).toBe("Revisão necessária");
  });

  it("score 59 → tone revisar", () => {
    expect(scoreToLabel(59).tone).toBe("revisar");
  });

  it("score 0 → tone revisar", () => {
    expect(scoreToLabel(0).tone).toBe("revisar");
  });
});
