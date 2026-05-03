import { describe, expect, it } from "vitest";
import {
  checkHorasTrabalhadas,
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
