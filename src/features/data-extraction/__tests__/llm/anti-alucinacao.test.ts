import { describe, expect, it } from "vitest";
import { LLMExtractError, validateAntiAlucinacao } from "../../llm/anti-alucinacao";

describe("validateAntiAlucinacao — cartao_ponto", () => {
  const ocr = `
| 14/12/2021 - Ter | 08:00 | 12:00 | 13:00 | 17:00 |
| 15/12/2021 - Qua | 09:00 | 13:00 |
`;

  it("aceita output com datas e horas presentes no OCR", () => {
    expect(() =>
      validateAntiAlucinacao(
        "cartao_ponto",
        {
          apuracoes: [
            {
              data: "2021-12-14",
              ocorrencia: "NORMAL",
              marcacoes: [
                { e: "08:00", s: "12:00" },
                { e: "13:00", s: "17:00" },
              ],
              eventos: [],
            },
          ],
        },
        ocr,
      ),
    ).not.toThrow();
  });

  it("REJEITA quando LLM gera data fantasma (não está no OCR)", () => {
    expect(() =>
      validateAntiAlucinacao(
        "cartao_ponto",
        {
          apuracoes: [
            {
              data: "2099-06-15",
              ocorrencia: "NORMAL",
              marcacoes: [],
              eventos: [],
            },
          ],
        },
        ocr,
      ),
    ).toThrow(LLMExtractError);
  });

  it("REJEITA quando LLM gera hora fantasma", () => {
    try {
      validateAntiAlucinacao(
        "cartao_ponto",
        {
          apuracoes: [
            {
              data: "2021-12-14",
              ocorrencia: "NORMAL",
              marcacoes: [{ e: "08:00", s: "23:59" }],
              eventos: [],
            },
          ],
        },
        ocr,
      );
      throw new Error("deveria ter falhado");
    } catch (e) {
      expect(e).toBeInstanceOf(LLMExtractError);
      expect((e as LLMExtractError).payload.code).toBe("alucinacao");
    }
  });

  it("aceita marcação órfã (s vazio)", () => {
    expect(() =>
      validateAntiAlucinacao(
        "cartao_ponto",
        {
          apuracoes: [
            {
              data: "2021-12-15",
              ocorrencia: "NORMAL",
              marcacoes: [{ e: "09:00", s: "" }],
              eventos: [],
            },
          ],
        },
        ocr,
      ),
    ).not.toThrow();
  });
});

describe("validateAntiAlucinacao — recibo_ferias", () => {
  const ocr = `
RECIBO DE FÉRIAS
Relativa: 2023/2024
30 dias de férias
Período de gozo: 01/06/2024 a 30/06/2024
`;

  it("aceita gozo com datas presentes no OCR", () => {
    expect(() =>
      validateAntiAlucinacao(
        "recibo_ferias",
        {
          ferias: [
            {
              relativa: "2023/2024",
              prazo: 30,
              situacao: "G",
              dobra_geral: false,
              abono: false,
              dias_abono: 0,
              gozo1: { inicio: "01/06/2024", fim: "30/06/2024", dobra: false },
              gozo2: null,
              gozo3: null,
            },
          ],
        },
        ocr,
      ),
    ).not.toThrow();
  });

  it("REJEITA data de gozo fantasma", () => {
    expect(() =>
      validateAntiAlucinacao(
        "recibo_ferias",
        {
          ferias: [
            {
              relativa: "2023/2024",
              prazo: 30,
              situacao: "G",
              dobra_geral: false,
              abono: false,
              dias_abono: 0,
              gozo1: { inicio: "31/12/2099", fim: "30/06/2024", dobra: false },
              gozo2: null,
              gozo3: null,
            },
          ],
        },
        ocr,
      ),
    ).toThrow(LLMExtractError);
  });
});

describe("validateAntiAlucinacao — registro_faltas", () => {
  const ocr = `
Falta 15/03/2024 atestado médico
Falta 20/03/2024 injustificada
`;

  it("aceita datas presentes", () => {
    expect(() =>
      validateAntiAlucinacao(
        "registro_faltas",
        {
          faltas: [
            {
              data_inicio: "2024-03-15",
              data_fim: "2024-03-15",
              justificada: true,
              reiniciar_periodo_aquisitivo: false,
              justificativa: "atestado médico",
            },
          ],
        },
        ocr,
      ),
    ).not.toThrow();
  });

  it("REJEITA data fantasma", () => {
    expect(() =>
      validateAntiAlucinacao(
        "registro_faltas",
        {
          faltas: [
            {
              data_inicio: "2099-12-31",
              data_fim: "2099-12-31",
              justificada: false,
              reiniciar_periodo_aquisitivo: false,
              justificativa: null,
            },
          ],
        },
        ocr,
      ),
    ).toThrow(LLMExtractError);
  });
});

describe("validateAntiAlucinacao — holerite (substring fuzzy)", () => {
  const ocr = `
    Salário Base R$ 3.000,00
    Comissões R$ 500,00
    INSS R$ 270,00
    Vale Transporte R$ 50,00
  `;

  it("aceita rubricas cujo nome aparece no OCR (case-insensitive, sem acentos)", () => {
    expect(() =>
      validateAntiAlucinacao(
        "holerite",
        {
          competencia: "01/2024",
          layout_usado: "llm_v1",
          rubricas: [
            { codigo: "1", nome: "Salario Base", valor_vencimento: 3000, valor_desconto: null, quantidade: null, ordem: 0 },
            { codigo: "2", nome: "COMISSOES", valor_vencimento: 500, valor_desconto: null, quantidade: null, ordem: 1 },
          ],
        },
        ocr,
      ),
    ).not.toThrow();
  });

  it("REJEITA quando IA inventa rubrica que não está no OCR", () => {
    expect(() =>
      validateAntiAlucinacao(
        "holerite",
        {
          competencia: "01/2024",
          layout_usado: "llm_v1",
          rubricas: [
            { codigo: "X", nome: "Adicional Periculosidade", valor_vencimento: 999, valor_desconto: null, quantidade: null, ordem: 0 },
          ],
        },
        ocr,
      ),
    ).toThrow(LLMExtractError);
  });

  it("aceita nome com 1 palavra significativa que existe", () => {
    // "Plano Saude" → "saude" deveria estar mas não está → falha
    expect(() =>
      validateAntiAlucinacao(
        "holerite",
        {
          competencia: "01/2024",
          layout_usado: "llm_v1",
          rubricas: [
            { codigo: "1", nome: "Plano Saude", valor_vencimento: null, valor_desconto: 100, quantidade: null, ordem: 0 },
          ],
        },
        ocr,
      ),
    ).toThrow(LLMExtractError);
  });
});
