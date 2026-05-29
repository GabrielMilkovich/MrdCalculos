/**
 * Wiring "Dados do Processo" → input do engine (Seção 1, DoD §5).
 * Prova que cada campo relevante CHEGA ao PjeParametros.
 */
import { describe, it, expect } from "vitest";
import { applyDadosProcessoToEngineParams } from "../dados-processo-adapter";
import type { PjeParametros } from "../engine-types";
import type { PjecalcDadosProcessoRow } from "../types";

function makeParams(over: Partial<PjeParametros> = {}): PjeParametros {
  return {
    case_id: "c1",
    data_admissao: "2020-01-01",
    data_ajuizamento: "2023-01-01",
    estado: "SP",
    municipio: "São Paulo",
    regime_trabalho: "tempo_integral",
    carga_horaria_padrao: 220,
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    prazo_aviso_previo: "nao_apurar",
    projetar_aviso_indenizado: false,
    limitar_avos_periodo: false,
    zerar_valor_negativo: false,
    sabado_dia_util: true,
    considerar_feriado_estadual: false,
    considerar_feriado_municipal: false,
    ...over,
  };
}

// O adapter só lê data_citacao, modo_calculo e valor_causa — cast controlado
// evita construir as ~30 colunas da view neste teste.
const dp = (over: Partial<PjecalcDadosProcessoRow>): PjecalcDadosProcessoRow =>
  ({ data_citacao: null, modo_calculo: null, valor_causa: null, ...over } as unknown as PjecalcDadosProcessoRow);

describe("applyDadosProcessoToEngineParams — wiring p/ o engine", () => {
  it("propaga data_citacao", () => {
    const p = applyDadosProcessoToEngineParams(makeParams(), dp({ data_citacao: "2023-03-01" }));
    expect(p.data_citacao).toBe("2023-03-01");
  });

  it("propaga modo_calculo (assisted_from_pjc)", () => {
    const p = applyDadosProcessoToEngineParams(makeParams(), dp({ modo_calculo: "assisted_from_pjc" }));
    expect(p.modo_calculo).toBe("assisted_from_pjc");
  });

  it("default modo_calculo = independent quando ausente ou dp nulo", () => {
    expect(applyDadosProcessoToEngineParams(makeParams(), dp({})).modo_calculo).toBe("independent");
    expect(applyDadosProcessoToEngineParams(makeParams(), null).modo_calculo).toBe("independent");
  });

  it("propaga valor_causa → valor_da_causa (number)", () => {
    const p = applyDadosProcessoToEngineParams(makeParams(), dp({ valor_causa: 1234.56 }));
    expect(p.valor_da_causa).toBe(1234.56);
  });

  it("não sobrescreve valor_da_causa já presente (ex.: import .pjc)", () => {
    const p = applyDadosProcessoToEngineParams(makeParams({ valor_da_causa: 999 }), dp({ valor_causa: 1234.56 }));
    expect(p.valor_da_causa).toBe(999);
  });

  it("dp nulo não derruba data_citacao existente", () => {
    const p = applyDadosProcessoToEngineParams(makeParams({ data_citacao: "2022-12-12" }), null);
    expect(p.data_citacao).toBe("2022-12-12");
  });
});
