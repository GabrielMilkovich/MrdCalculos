import { describe, expect, it } from "vitest";
import {
  checkFaltas,
  checkFerias,
  checkHoleriteTotais,
  checkHorasTrabalhadas,
  checkSomaMensalHT,
  diasComDiscrepancia,
  formatDiff,
  hhmmToMin,
  somarBatidasMin,
} from "../../quality/cross-validation";
import type { ApuracaoDiaria } from "../../parsers/cartao-ponto";

function ap(opts: Partial<ApuracaoDiaria> & { data: string }): ApuracaoDiaria {
  return {
    data: opts.data,
    dia_semana: opts.dia_semana ?? null,
    ocorrencia: opts.ocorrencia ?? "NORMAL",
    marcacoes: opts.marcacoes ?? [],
    eventos: opts.eventos ?? [],
    observacao: opts.observacao ?? null,
  };
}

describe("hhmmToMin", () => {
  it("converte HH:MM válido", () => {
    expect(hhmmToMin("08:30")).toBe(8 * 60 + 30);
    expect(hhmmToMin("00:00")).toBe(0);
    expect(hhmmToMin("23:59")).toBe(23 * 60 + 59);
  });
  it("aceita até HHH:MM (acumulado mensal)", () => {
    expect(hhmmToMin("190:40")).toBe(190 * 60 + 40);
  });
  it("rejeita formato inválido", () => {
    expect(hhmmToMin("8:30")).toBe(8 * 60 + 30);
    expect(hhmmToMin("abc")).toBeNull();
    expect(hhmmToMin("12:60")).toBeNull();
  });
});

describe("somarBatidasMin", () => {
  it("soma 2 pares E/S", () => {
    const a = ap({
      data: "2024-01-01",
      marcacoes: [
        { e: "08:00", s: "12:00" },
        { e: "13:00", s: "17:00" },
      ],
    });
    expect(somarBatidasMin(a)).toBe(8 * 60); // 4h + 4h = 8h
  });
  it("ignora batida órfã (E sem S)", () => {
    const a = ap({
      data: "2024-01-01",
      marcacoes: [
        { e: "08:00", s: "12:00" },
        { e: "13:00", s: "" },
      ],
    });
    expect(somarBatidasMin(a)).toBe(4 * 60);
  });
  it("0 quando não há batidas", () => {
    expect(somarBatidasMin(ap({ data: "2024-01-01" }))).toBe(0);
  });
});

describe("checkHorasTrabalhadas", () => {
  it("OK quando soma bate exatamente com HT", () => {
    const a = ap({
      data: "2024-01-01",
      marcacoes: [
        { e: "08:00", s: "12:00" },
        { e: "13:00", s: "17:20" },
      ],
      eventos: [{ tipo: "horas_trabalhadas", valor: "08:20", raw: "" }],
    });
    const r = checkHorasTrabalhadas(a);
    expect(r.ok).toBe(true);
    expect(r.diffMin).toBe(0);
  });

  it("OK dentro da tolerância (≤5min)", () => {
    const a = ap({
      data: "2024-01-01",
      marcacoes: [
        { e: "08:00", s: "12:00" },
        { e: "13:00", s: "17:00" },
      ],
      eventos: [{ tipo: "horas_trabalhadas", valor: "07:55", raw: "" }],
    });
    const r = checkHorasTrabalhadas(a);
    expect(r.ok).toBe(true);
    expect(r.diffMin).toBe(5);
  });

  it("FALHA quando soma diverge fora da tolerância", () => {
    const a = ap({
      data: "2024-01-01",
      marcacoes: [
        { e: "08:00", s: "12:00" },
        { e: "13:00", s: "17:00" },
      ],
      eventos: [{ tipo: "horas_trabalhadas", valor: "10:00", raw: "" }],
    });
    const r = checkHorasTrabalhadas(a);
    expect(r.ok).toBe(false);
    expect(r.diffMin).toBe(-2 * 60); // computado < esperado
  });

  it("OK quando não há evento HT (não dá pra checar)", () => {
    const a = ap({
      data: "2024-01-01",
      marcacoes: [{ e: "08:00", s: "12:00" }],
      eventos: [],
    });
    expect(checkHorasTrabalhadas(a).ok).toBe(true);
  });
});

describe("diasComDiscrepancia", () => {
  it("retorna apenas dias problemáticos", () => {
    const days = [
      ap({
        data: "2024-01-01",
        marcacoes: [{ e: "08:00", s: "12:00" }],
        eventos: [{ tipo: "horas_trabalhadas", valor: "04:00", raw: "" }],
      }),
      ap({
        data: "2024-01-02",
        marcacoes: [{ e: "08:00", s: "12:00" }],
        eventos: [{ tipo: "horas_trabalhadas", valor: "08:00", raw: "" }],
      }),
    ];
    const probs = diasComDiscrepancia(days);
    expect(probs).toHaveLength(1);
    expect(probs[0].data).toBe("2024-01-02");
  });
});

describe("formatDiff", () => {
  it("formata diferenças positivas e negativas", () => {
    expect(formatDiff(0)).toBe("+00:00");
    expect(formatDiff(65)).toBe("+01:05");
    expect(formatDiff(-90)).toBe("-01:30");
  });
});

describe("checkSomaMensalHT", () => {
  it("OK quando soma diária ≈ total mensal no rodapé", () => {
    const ocr = `
      | 01/06/2024 - Seg | Horas Trabalhadas : 08:00 |
      | 02/06/2024 - Ter | Horas Trabalhadas : 08:00 |
      Horas Trabalhadas 16:00
    `;
    const r = checkSomaMensalHT(
      [
        ap({
          data: "2024-06-01",
          marcacoes: [{ e: "08:00", s: "16:00" }],
          eventos: [{ tipo: "horas_trabalhadas", valor: "08:00", raw: "" }],
        }),
        ap({
          data: "2024-06-02",
          marcacoes: [{ e: "08:00", s: "16:00" }],
          eventos: [{ tipo: "horas_trabalhadas", valor: "08:00", raw: "" }],
        }),
      ],
      ocr,
    );
    expect(r).not.toBeNull();
    expect(r!.ok).toBe(true);
  });

  it("FALHA quando soma diária diverge do total mensal", () => {
    const ocr = `
      | 01/06/2024 - Seg | Horas Trabalhadas : 08:00 |
      Horas Trabalhadas 50:00
    `;
    const r = checkSomaMensalHT(
      [
        ap({
          data: "2024-06-01",
          marcacoes: [{ e: "08:00", s: "16:00" }],
          eventos: [{ tipo: "horas_trabalhadas", valor: "08:00", raw: "" }],
        }),
      ],
      ocr,
    );
    expect(r).not.toBeNull();
    expect(r!.ok).toBe(false);
  });

  it("retorna null quando OCR não tem total mensal claro", () => {
    expect(checkSomaMensalHT([], "")).toBeNull();
  });
});

describe("checkHoleriteTotais", () => {
  it("OK quando soma proventos == total bruto no OCR", () => {
    const ocr = `
      Salario Base R$ 3.000,00
      Comissoes R$ 500,00
      INSS R$ 270,00
      IRRF R$ 100,00
      Total Vencimentos: 3.500,00
      Total Descontos: 370,00
      Liquido a Receber: 3.130,00
    `;
    const r = checkHoleriteTotais(
      [
        { nome: "Salario Base", valor_vencimento: 3000, valor_desconto: null },
        { nome: "Comissoes", valor_vencimento: 500, valor_desconto: null },
        { nome: "INSS", valor_vencimento: null, valor_desconto: 270 },
        { nome: "IRRF", valor_vencimento: null, valor_desconto: 100 },
      ],
      ocr,
    );
    expect(r.ok).toBe(true);
    expect(r.somaProventos).toBe(3500);
    expect(r.somaDescontos).toBe(370);
  });

  it("FALHA quando soma de proventos diverge do total bruto", () => {
    const ocr = `
      Salario R$ 1.000,00
      Total Vencimentos: 5.000,00
    `;
    const r = checkHoleriteTotais(
      [{ nome: "Salario", valor_vencimento: 1000, valor_desconto: null }],
      ocr,
    );
    expect(r.ok).toBe(false);
    expect(r.diffBruto).toBe(-4000);
  });

  it("OK quando OCR não tem totais (ignora cross-check)", () => {
    const r = checkHoleriteTotais(
      [{ nome: "Salario", valor_vencimento: 1000, valor_desconto: null }],
      "OCR sem totais explícitos",
    );
    expect(r.ok).toBe(true);
  });
});

describe("checkFerias", () => {
  it("OK quando dias de gozo + abono == prazo", () => {
    const r = checkFerias({
      prazo: 30,
      situacao: "G",
      abono: true,
      dias_abono: 10,
      gozo1: { inicio: "01/06/2024", fim: "20/06/2024" },
      gozo2: null,
      gozo3: null,
    });
    expect(r.ok).toBe(true);
    expect(r.diasGozados).toBe(20);
  });

  it("FALHA quando dias gozados não fecham", () => {
    const r = checkFerias({
      prazo: 30,
      situacao: "G",
      abono: false,
      dias_abono: 0,
      gozo1: { inicio: "01/06/2024", fim: "10/06/2024" },
      gozo2: null,
      gozo3: null,
    });
    expect(r.ok).toBe(false);
    expect(r.diff).toBe(-20);
  });

  it("OK quando situação NG (sem gozos)", () => {
    expect(
      checkFerias({
        prazo: 30,
        situacao: "NG",
        abono: false,
        dias_abono: 0,
        gozo1: null,
        gozo2: null,
        gozo3: null,
      }).ok,
    ).toBe(true);
  });

  it("3 gozos somando exatamente o prazo", () => {
    const r = checkFerias({
      prazo: 30,
      situacao: "G",
      abono: false,
      dias_abono: 0,
      gozo1: { inicio: "01/06/2024", fim: "10/06/2024" },
      gozo2: { inicio: "15/06/2024", fim: "24/06/2024" },
      gozo3: { inicio: "01/07/2024", fim: "10/07/2024" },
    });
    expect(r.ok).toBe(true);
    expect(r.diasGozados).toBe(30);
  });
});

describe("checkFaltas", () => {
  it("OK quando faltas em ordem sem overlap", () => {
    const r = checkFaltas([
      { data_inicio: "2024-06-01", data_fim: "2024-06-01" },
      { data_inicio: "2024-06-15", data_fim: "2024-06-15" },
    ]);
    expect(r.ok).toBe(true);
    expect(r.problemas).toHaveLength(0);
  });

  it("FALHA com intervalos sobrepostos", () => {
    const r = checkFaltas([
      { data_inicio: "2024-06-01", data_fim: "2024-06-15" },
      { data_inicio: "2024-06-10", data_fim: "2024-06-20" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.problemas[0].tipo).toBe("overlap");
  });

  it("FALHA com ordem quebrada", () => {
    const r = checkFaltas([
      { data_inicio: "2024-06-15", data_fim: "2024-06-15" },
      { data_inicio: "2024-06-01", data_fim: "2024-06-01" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.problemas.some((p) => p.tipo === "ordem-quebrada")).toBe(true);
  });
});
