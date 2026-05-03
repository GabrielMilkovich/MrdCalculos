import { describe, expect, it } from "vitest";
import {
  CartaoPontoLLMOutput,
  FeriasLLMOutput,
  FaltasLLMOutput,
  HoleriteLLMOutput,
  validateLLMOutput,
} from "../../llm/schemas";

describe("CartaoPontoLLMOutput", () => {
  it("aceita estrutura válida com 1 apuração e 2 marcações", () => {
    const valid = {
      apuracoes: [
        {
          data: "2024-03-15",
          ocorrencia: "NORMAL",
          marcacoes: [
            { e: "08:00", s: "12:00" },
            { e: "13:00", s: "17:00", e_inserida: true },
          ],
          eventos: [{ tipo: "horas_trabalhadas", valor: "08:00", raw: "" }],
        },
      ],
    };
    expect(() => CartaoPontoLLMOutput.parse(valid)).not.toThrow();
  });

  it("rejeita data em formato dd/MM/yyyy (deve ser ISO)", () => {
    const invalid = {
      apuracoes: [
        {
          data: "15/03/2024",
          ocorrencia: "NORMAL",
          marcacoes: [],
          eventos: [],
        },
      ],
    };
    expect(() => CartaoPontoLLMOutput.parse(invalid)).toThrow();
  });

  it("rejeita ocorrência fora do enum", () => {
    const invalid = {
      apuracoes: [
        {
          data: "2024-03-15",
          ocorrencia: "INVENTADA",
          marcacoes: [],
          eventos: [],
        },
      ],
    };
    expect(() => CartaoPontoLLMOutput.parse(invalid)).toThrow();
  });

  it("rejeita >6 marcações por dia", () => {
    const invalid = {
      apuracoes: [
        {
          data: "2024-03-15",
          ocorrencia: "NORMAL",
          marcacoes: Array(7).fill({ e: "08:00", s: "09:00" }),
          eventos: [],
        },
      ],
    };
    expect(() => CartaoPontoLLMOutput.parse(invalid)).toThrow();
  });

  it("aceita marcação órfã (s vazio)", () => {
    const valid = {
      apuracoes: [
        {
          data: "2024-03-15",
          ocorrencia: "NORMAL",
          marcacoes: [{ e: "08:00", s: "" }],
          eventos: [],
        },
      ],
    };
    expect(() => CartaoPontoLLMOutput.parse(valid)).not.toThrow();
  });
});

describe("FeriasLLMOutput", () => {
  it("aceita período válido", () => {
    const valid = {
      ferias: [
        {
          relativa: "2023/2024",
          prazo: 30,
          situacao: "G",
          dobra_geral: false,
          abono: true,
          dias_abono: 10,
          gozo1: { inicio: "01/06/2024", fim: "30/06/2024", dobra: false },
          gozo2: null,
          gozo3: null,
        },
      ],
    };
    expect(() => FeriasLLMOutput.parse(valid)).not.toThrow();
  });

  it("rejeita prazo > 60", () => {
    const invalid = {
      ferias: [
        {
          relativa: "2023/2024",
          prazo: 90,
          situacao: "G",
          dobra_geral: false,
          abono: false,
          dias_abono: 0,
          gozo1: null,
          gozo2: null,
          gozo3: null,
        },
      ],
    };
    expect(() => FeriasLLMOutput.parse(invalid)).toThrow();
  });

  it("rejeita situação inválida", () => {
    const invalid = {
      ferias: [
        {
          relativa: "2023/2024",
          prazo: 30,
          situacao: "X",
          dobra_geral: false,
          abono: false,
          dias_abono: 0,
          gozo1: null,
          gozo2: null,
          gozo3: null,
        },
      ],
    };
    expect(() => FeriasLLMOutput.parse(invalid)).toThrow();
  });
});

describe("FaltasLLMOutput", () => {
  it("aceita falta com justificativa null", () => {
    const valid = {
      faltas: [
        {
          data_inicio: "2024-03-15",
          data_fim: "2024-03-15",
          justificada: false,
          reiniciar_periodo_aquisitivo: false,
          justificativa: null,
        },
      ],
    };
    expect(() => FaltasLLMOutput.parse(valid)).not.toThrow();
  });

  it("rejeita justificativa > 200 chars", () => {
    const invalid = {
      faltas: [
        {
          data_inicio: "2024-03-15",
          data_fim: "2024-03-15",
          justificada: true,
          reiniciar_periodo_aquisitivo: false,
          justificativa: "x".repeat(201),
        },
      ],
    };
    expect(() => FaltasLLMOutput.parse(invalid)).toThrow();
  });
});

describe("HoleriteLLMOutput", () => {
  it("aceita estrutura válida", () => {
    const valid = {
      competencia: "03/2024",
      layout_usado: "llm_v1",
      rubricas: [
        {
          codigo: "1",
          nome: "Salário Base",
          valor_vencimento: 3000,
          valor_desconto: null,
          quantidade: null,
          ordem: 0,
        },
      ],
    };
    expect(() => HoleriteLLMOutput.parse(valid)).not.toThrow();
  });

  it("rejeita competência em formato errado", () => {
    const invalid = {
      competencia: "2024-03",
      layout_usado: "llm_v1",
      rubricas: [],
    };
    expect(() => HoleriteLLMOutput.parse(invalid)).toThrow();
  });
});

describe("validateLLMOutput (router)", () => {
  it("roteia para cartao_ponto", () => {
    const result = validateLLMOutput("cartao_ponto", {
      apuracoes: [
        {
          data: "2024-03-15",
          ocorrencia: "NORMAL",
          marcacoes: [],
          eventos: [],
        },
      ],
    });
    expect(result.apuracoes).toHaveLength(1);
  });

  it("levanta erro em payload incompatível", () => {
    expect(() => validateLLMOutput("cartao_ponto", { foo: "bar" })).toThrow();
  });
});
