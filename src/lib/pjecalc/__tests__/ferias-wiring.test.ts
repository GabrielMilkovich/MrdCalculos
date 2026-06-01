/**
 * Wiring Férias → input do engine (Seção 6, DoD). Prova a CORREÇÃO do bug:
 * o mapper lê as colunas REAIS (prazo_dias/abono_dias/dobra_geral/gozo_1|2|3_*)
 * e mapeia os 3 períodos de gozo — antes lia aliases fictícios e perdia tudo.
 */
import { describe, it, expect } from "vitest";
import { mapFeriasToEngine, normalizeSituacaoFerias } from "../ferias-engine-map";
import type { PjecalcFeriasRow } from "../types";

const row = (over: Partial<PjecalcFeriasRow> = {}): PjecalcFeriasRow =>
  ({
    id: "fe1",
    case_id: "c1",
    periodo_aquisitivo_inicio: "2020-01-01",
    periodo_aquisitivo_fim: "2020-12-31",
    periodo_concessivo_inicio: "2021-01-01",
    periodo_concessivo_fim: "2021-12-31",
    situacao: "GOZADAS",
    prazo_dias: 24,
    dobra_geral: true,
    abono: true,
    abono_dias: 8,
    gozo_1_inicio: "2021-02-01", gozo_1_fim: "2021-02-10", gozo_1_dobra: false,
    gozo_2_inicio: "2021-03-01", gozo_2_fim: "2021-03-06", gozo_2_dobra: false,
    gozo_3_inicio: null, gozo_3_fim: null, gozo_3_dobra: null,
    observacoes: null,
    created_at: "2024-01-01T00:00:00Z",
    ...over,
  }) as PjecalcFeriasRow;

describe("mapFeriasToEngine — lê colunas reais (corrige wiring)", () => {
  it("mapeia prazo_dias/dobra_geral/abono_dias das colunas reais", () => {
    const [f] = mapFeriasToEngine([row()]);
    expect(f.prazo_dias).toBe(24);   // antes caía em 30 (default)
    expect(f.dobra).toBe(true);      // antes f.dobra (fictício) → false
    expect(f.abono).toBe(true);
    expect(f.abono_dias).toBe(8);    // antes f.dias_abono (fictício) → 0
    expect(f.situacao).toBe("gozadas");
  });
  it("mapeia os 3 períodos de gozo (não só o primeiro)", () => {
    const [f] = mapFeriasToEngine([row()]);
    expect(f.periodos_gozo).toHaveLength(2); // gozo_3 vazio → omitido
    expect(f.periodos_gozo![0]).toEqual({ inicio: "2021-02-01", fim: "2021-02-10", dias: 10 });
    expect(f.periodos_gozo![1]).toEqual({ inicio: "2021-03-01", fim: "2021-03-06", dias: 6 });
  });
  it("3 gozos preenchidos → 3 períodos", () => {
    const [f] = mapFeriasToEngine([row({ gozo_3_inicio: "2021-04-01", gozo_3_fim: "2021-04-08" })]);
    expect(f.periodos_gozo).toHaveLength(3);
    expect(f.periodos_gozo![2].dias).toBe(8);
  });
  it("sem gozos → lista vazia; prazo default 30 quando nulo", () => {
    const [f] = mapFeriasToEngine([row({
      gozo_1_inicio: null, gozo_1_fim: null, gozo_2_inicio: null, gozo_2_fim: null,
      prazo_dias: null as unknown as number,
    })]);
    expect(f.periodos_gozo).toEqual([]);
    expect(f.prazo_dias).toBe(30);
  });
});

describe("normalizeSituacaoFerias", () => {
  it("normaliza variantes de DB/Java", () => {
    expect(normalizeSituacaoFerias("GOZADAS")).toBe("gozadas");
    expect(normalizeSituacaoFerias("G")).toBe("gozadas");
    expect(normalizeSituacaoFerias("indenizadas")).toBe("indenizadas");
    expect(normalizeSituacaoFerias("I")).toBe("indenizadas");
    expect(normalizeSituacaoFerias("PERDIDAS")).toBe("perdidas");
    expect(normalizeSituacaoFerias("GP")).toBe("gozadas_parcialmente");
    expect(normalizeSituacaoFerias("gozadas_parcialmente")).toBe("gozadas_parcialmente");
    expect(normalizeSituacaoFerias(null)).toBe("gozadas");
  });
});
