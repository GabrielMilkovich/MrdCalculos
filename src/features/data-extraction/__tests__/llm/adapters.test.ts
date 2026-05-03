import { describe, expect, it } from "vitest";
import {
  llmToCartaoPontoResult,
  llmToFeriasResult,
  llmToFaltasResult,
  llmToHoleriteResult,
} from "../../llm/adapters";

describe("llmToCartaoPontoResult", () => {
  it("converte output e calcula competências/datas", () => {
    const r = llmToCartaoPontoResult({
      apuracoes: [
        {
          data: "2024-03-15",
          ocorrencia: "NORMAL",
          marcacoes: [{ e: "08:00", s: "12:00", e_inserida: true }],
          eventos: [],
        },
        {
          data: "2024-03-16",
          ocorrencia: "NORMAL",
          marcacoes: [{ e: "08:00", s: "12:00" }],
          eventos: [],
        },
      ],
    });
    expect(r.apuracoes).toHaveLength(2);
    expect(r.competencia_predominante).toBe("03/2024");
    expect(r.data_inicial).toBe("2024-03-15");
    expect(r.data_final).toBe("2024-03-16");
    expect(r.apuracoes[0].marcacoes[0].e_inserida).toBe(true);
    expect(r.parser_version).toMatch(/llm/);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("trata array vazio sem crash", () => {
    const r = llmToCartaoPontoResult({ apuracoes: [] });
    expect(r.apuracoes).toEqual([]);
    expect(r.competencia_predominante).toBe("");
  });
});

describe("llmToFeriasResult", () => {
  it("preserva campos", () => {
    const r = llmToFeriasResult({
      ferias: [
        {
          relativa: "2023/2024",
          prazo: 30,
          situacao: "G",
          dobra_geral: false,
          abono: true,
          dias_abono: 10,
          gozo1: { inicio: "01/06/2024", fim: "30/06/2024", dobra: true },
          gozo2: null,
          gozo3: null,
        },
      ],
    });
    expect(r.ferias[0].relativa).toBe("2023/2024");
    expect(r.ferias[0].gozo1?.dobra).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("llmToFaltasResult", () => {
  it("preserva todos os campos", () => {
    const r = llmToFaltasResult({
      faltas: [
        {
          data_inicio: "2024-03-15",
          data_fim: "2024-03-15",
          justificada: true,
          reiniciar_periodo_aquisitivo: false,
          justificativa: "atestado",
        },
      ],
    });
    expect(r.faltas[0].justificada).toBe(true);
    expect(r.faltas[0].justificativa).toBe("atestado");
  });
});

describe("llmToHoleriteResult", () => {
  it("preenche layout_usado padrão se vazio", () => {
    const r = llmToHoleriteResult({
      competencia: "03/2024",
      layout_usado: "",
      rubricas: [
        {
          codigo: "1",
          nome: "Salário",
          valor_vencimento: 1000,
          valor_desconto: null,
          quantidade: null,
          ordem: 0,
        },
      ],
    });
    expect(r.layout_usado).toBe("llm_v1");
    expect(r.rubricas).toHaveLength(1);
  });
});
