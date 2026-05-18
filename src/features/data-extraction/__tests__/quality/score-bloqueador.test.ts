import { describe, it, expect } from "vitest";
import { scoreHolerite, scoreCartaoPonto } from "../../quality/score";

describe("Score bloqueador — holerite", () => {
  it("bloqueia quando diff bruto > 20% do declarado", () => {
    const parsed = {
      competencia: "05/2024",
      layout_usado: "generico_v1",
      warnings: [],
      rubricas: [
        {
          codigo: "0001",
          nome: "Salario base",
          valor_vencimento: 5000,
          valor_desconto: null,
          quantidade: null,
          ordem: 0,
        },
      ],
    };
    const ocr = "Salario base 5.000,00\nTotal Bruto 2.000,00\n";
    const s = scoreHolerite(parsed, ocr);
    expect(s.bloqueador).toBe(true);
    expect(s.bloqueador_motivo).toMatch(/Total Bruto/i);
  });

  it("não bloqueia quando diff bruto < 5%", () => {
    const parsed = {
      competencia: "05/2024",
      layout_usado: "generico_v1",
      warnings: [],
      rubricas: [
        {
          codigo: "0001",
          nome: "Salario base",
          valor_vencimento: 2000,
          valor_desconto: null,
          quantidade: null,
          ordem: 0,
        },
      ],
    };
    const ocr = "Salario base 2.000,00\nTotal Bruto 2.000,00\n";
    const s = scoreHolerite(parsed, ocr);
    expect(s.bloqueador).toBe(false);
  });

  it("bloqueia quando rubricas vazias", () => {
    const parsed = {
      competencia: "05/2024",
      layout_usado: "generico_v1",
      warnings: [],
      rubricas: [],
    };
    const s = scoreHolerite(parsed, "qualquer coisa");
    expect(s.bloqueador).toBe(true);
  });
});

describe("Score bloqueador — cartão de ponto", () => {
  it("bloqueia quando há marcação impossível (saída < entrada sem virada)", () => {
    const parsed = {
      apuracoes: [
        {
          data: "2024-03-01",
          dia_semana: "Sex",
          ocorrencia: "NORMAL" as const,
          marcacoes: [{ e: "08:30", s: "00:30" }],
          eventos: [],
          observacao: null,
        },
      ],
      competencias: new Map([["03/2024", 1]]),
      consistencia: [],
      competencia_predominante: "03/2024",
      data_inicial: "2024-03-01",
      data_final: "2024-03-01",
      warnings: [],
      unparsed_lines: [],
      parser_version: "test",
    };
    const s = scoreCartaoPonto(parsed, "");
    expect(s.bloqueador).toBe(true);
    expect(s.bloqueador_motivo).toMatch(/marcação/i);
  });
});
