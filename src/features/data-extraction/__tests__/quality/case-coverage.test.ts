import { describe, expect, it } from "vitest";
import { analisarCobertura, type CaseDoc } from "../../quality/case-coverage";
import type { ParseCartaoPontoResult } from "../../parsers/cartao-ponto";
import type { ParseFeriasResult } from "../../parsers/ferias";
import type { ParseFaltasResult } from "../../parsers/faltas";
import type { HoleriteParseResult } from "../../parsers/holerite/types";

function cartao(partial: Partial<ParseCartaoPontoResult> = {}): CaseDoc {
  const competencias = partial.competencias ?? new Map([["06/2024", 1]]);
  return {
    id: `c-${Math.random()}`,
    filename: "cartao.pdf",
    tipo: "cartao_ponto",
    parsed: {
      apuracoes: [],
      competencias,
      competencia_predominante: [...competencias.keys()][0] ?? "",
      data_inicial: "",
      data_final: "",
      warnings: [],
      unparsed_lines: [],
      parser_version: "test",
      ...partial,
    } as ParseCartaoPontoResult,
  };
}

function holerite(competencia: string): CaseDoc {
  return {
    id: `h-${competencia}`,
    filename: `holerite-${competencia}.pdf`,
    tipo: "holerite",
    parsed: {
      competencia,
      rubricas: [],
      layout_usado: "via_varejo_v1",
      warnings: [],
    } as HoleriteParseResult,
  };
}

function feriasDoc(): CaseDoc {
  return {
    id: "f-1",
    filename: "ferias.pdf",
    tipo: "recibo_ferias",
    parsed: {
      ferias: [],
      warnings: [],
      unparsed_lines: [],
    } as ParseFeriasResult,
  };
}

function faltasDoc(faltas: Array<{ data_inicio: string; data_fim: string }>): CaseDoc {
  return {
    id: "fa-1",
    filename: "faltas.pdf",
    tipo: "registro_faltas",
    parsed: {
      faltas: faltas.map((f) => ({
        data_inicio: f.data_inicio,
        data_fim: f.data_fim,
        justificada: false,
        reiniciar_periodo_aquisitivo: false,
        justificativa: null,
      })),
      warnings: [],
      unparsed_lines: [],
    } as ParseFaltasResult,
  };
}

describe("analisarCobertura — case isolado", () => {
  it("1 documento sozinho → gap 'documento_isolado' baixa severidade", () => {
    const r = analisarCobertura([holerite("06/2024")]);
    expect(r.gaps.some((g) => g.tipo === "documento_isolado")).toBe(true);
  });

  it("case vazio → sem gaps mas com resumo zerado", () => {
    const r = analisarCobertura([]);
    expect(r.gaps.length).toBe(0);
    expect(r.rangeCompetencias).toBeNull();
  });
});

describe("analisarCobertura — falta marcada sem registro", () => {
  it("cartão-ponto com FALTA + nenhum registro_faltas → gap alta", () => {
    const c = cartao({
      apuracoes: [
        {
          data: "2024-05-12",
          dia_semana: null,
          ocorrencia: "FALTA",
          marcacoes: [],
          eventos: [],
          observacao: null,
        },
      ],
    });
    const r = analisarCobertura([c, holerite("05/2024")]);
    const gap = r.gaps.find((g) => g.tipo === "falta_sem_registro");
    expect(gap).toBeDefined();
    expect(gap?.severidade).toBe("alta");
    expect(gap?.detalhes?.datas).toContain("2024-05-12");
  });

  it("cartão-ponto com FALTA + faltas_extraidas COBRINDO a data → sem gap", () => {
    const c = cartao({
      apuracoes: [
        {
          data: "2024-05-12",
          dia_semana: null,
          ocorrencia: "FALTA",
          marcacoes: [],
          eventos: [],
          observacao: null,
        },
      ],
    });
    const f = faltasDoc([{ data_inicio: "2024-05-10", data_fim: "2024-05-15" }]);
    const r = analisarCobertura([c, f]);
    expect(r.gaps.find((g) => g.tipo === "falta_sem_registro")).toBeUndefined();
  });

  it("cartão-ponto com 2 FALTAS + faltas_extraidas cobrindo apenas 1 → gap parcial", () => {
    const c = cartao({
      apuracoes: [
        {
          data: "2024-05-12",
          dia_semana: null,
          ocorrencia: "FALTA",
          marcacoes: [],
          eventos: [],
          observacao: null,
        },
        {
          data: "2024-05-20",
          dia_semana: null,
          ocorrencia: "FALTA",
          marcacoes: [],
          eventos: [],
          observacao: null,
        },
      ],
    });
    const f = faltasDoc([{ data_inicio: "2024-05-12", data_fim: "2024-05-12" }]);
    const r = analisarCobertura([c, f]);
    const gap = r.gaps.find((g) => g.tipo === "falta_sem_registro");
    expect(gap).toBeDefined();
    expect(gap?.detalhes?.datas).toEqual(["2024-05-20"]);
  });
});

describe("analisarCobertura — competência cartão-ponto sem holerite", () => {
  it("cartão-ponto cobre 06/2024 mas holerite só de 05/2024 → gap", () => {
    const c = cartao({ competencias: new Map([["06/2024", 20]]) });
    const r = analisarCobertura([c, holerite("05/2024")]);
    const gap = r.gaps.find((g) => g.tipo === "competencia_sem_holerite");
    expect(gap).toBeDefined();
    expect(gap?.detalhes?.competencias).toEqual(["06/2024"]);
  });
});

describe("analisarCobertura — gaps em holerites", () => {
  it("holerites de 01/2024, 02/2024, 06/2024 → detecta 03,04,05 missing", () => {
    const r = analisarCobertura([
      holerite("01/2024"),
      holerite("02/2024"),
      holerite("06/2024"),
    ]);
    const gap = r.gaps.find((g) => g.tipo === "holerite_gap_meses");
    expect(gap).toBeDefined();
    expect(gap?.detalhes?.competencias).toEqual([
      "03/2024",
      "04/2024",
      "05/2024",
    ]);
    expect(gap?.severidade).toBe("alta"); // ≥3 meses
  });

  it("holerites contíguos → sem gap", () => {
    const r = analisarCobertura([
      holerite("01/2024"),
      holerite("02/2024"),
      holerite("03/2024"),
    ]);
    expect(r.gaps.find((g) => g.tipo === "holerite_gap_meses")).toBeUndefined();
  });
});

describe("analisarCobertura — buracos de calendário no cartão-ponto", () => {
  it("cartão-ponto 01/06–30/06 com gap de 11 dias no meio → detecta", () => {
    const apuracoes: ParseCartaoPontoResult["apuracoes"] = [];
    // Dias 01–10/06
    for (let d = 1; d <= 10; d++) {
      apuracoes.push({
        data: `2024-06-${String(d).padStart(2, "0")}`,
        dia_semana: null,
        ocorrencia: "NORMAL",
        marcacoes: [],
        eventos: [],
        observacao: null,
      });
    }
    // Pula 11–22/06 (12 dias)
    // Dias 23–30/06
    for (let d = 23; d <= 30; d++) {
      apuracoes.push({
        data: `2024-06-${String(d).padStart(2, "0")}`,
        dia_semana: null,
        ocorrencia: "NORMAL",
        marcacoes: [],
        eventos: [],
        observacao: null,
      });
    }
    const c = cartao({
      apuracoes,
      data_inicial: "2024-06-01",
      data_final: "2024-06-30",
    });
    const r = analisarCobertura([c, holerite("06/2024")]);
    const gap = r.gaps.find(
      (g) => g.tipo === "buraco_calendario_cartao_ponto",
    );
    expect(gap).toBeDefined();
  });
});

describe("analisarCobertura — range de competências", () => {
  it("computa início e fim corretos", () => {
    const r = analisarCobertura([
      holerite("01/2024"),
      holerite("12/2024"),
      holerite("06/2024"),
    ]);
    expect(r.rangeCompetencias).toEqual({ inicio: "01/2024", fim: "12/2024" });
  });
});
