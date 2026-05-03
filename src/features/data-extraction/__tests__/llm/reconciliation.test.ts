import { describe, expect, it } from "vitest";
import { reconcileCartaoPonto } from "../../llm/reconciliation";
import type { ApuracaoDiaria, ParseCartaoPontoResult } from "../../parsers/cartao-ponto";

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

function result(apuracoes: ApuracaoDiaria[]): ParseCartaoPontoResult {
  return {
    apuracoes,
    competencias: new Map(),
    competencia_predominante: "",
    data_inicial: "",
    data_final: "",
    warnings: [],
    unparsed_lines: [],
    parser_version: "test",
  };
}

describe("reconcileCartaoPonto", () => {
  it("status=agree quando ambas concordam", () => {
    const r = reconcileCartaoPonto(
      result([
        ap({
          data: "2024-01-01",
          marcacoes: [{ e: "08:00", s: "12:00" }],
        }),
      ]),
      result([
        ap({
          data: "2024-01-01",
          marcacoes: [{ e: "08:00", s: "12:00" }],
        }),
      ]),
    );
    expect(r.dias[0].status).toBe("agree");
    expect(r.contadores.agree).toBe(1);
    expect(r.dias[0].origemEscolhida).toBe("regex");
  });

  it("status=only-regex quando IA não trouxe a data", () => {
    const r = reconcileCartaoPonto(
      result([ap({ data: "2024-01-01", marcacoes: [{ e: "08:00", s: "12:00" }] })]),
      result([]),
    );
    expect(r.dias[0].status).toBe("only-regex");
    expect(r.contadores.onlyRegex).toBe(1);
    expect(r.dias[0].origemEscolhida).toBe("regex");
  });

  it("status=only-ia quando regex falhou e IA trouxe", () => {
    const r = reconcileCartaoPonto(
      result([]),
      result([ap({ data: "2024-01-01", marcacoes: [{ e: "08:00", s: "12:00" }] })]),
    );
    expect(r.dias[0].status).toBe("only-ia");
    expect(r.contadores.onlyIa).toBe(1);
    expect(r.dias[0].origemEscolhida).toBe("ia");
  });

  it("status=differ + escolhe a IA quando IA tem HT OK e regex não", () => {
    const r = reconcileCartaoPonto(
      result([
        ap({
          data: "2024-01-01",
          marcacoes: [{ e: "08:00", s: "10:00" }],
          eventos: [{ tipo: "horas_trabalhadas", valor: "08:00", raw: "" }],
        }),
      ]),
      result([
        ap({
          data: "2024-01-01",
          marcacoes: [
            { e: "08:00", s: "12:00" },
            { e: "13:00", s: "17:00" },
          ],
          eventos: [{ tipo: "horas_trabalhadas", valor: "08:00", raw: "" }],
        }),
      ]),
    );
    expect(r.dias[0].status).toBe("differ");
    expect(r.dias[0].origemEscolhida).toBe("ia");
    expect(r.dias[0].diffs.length).toBeGreaterThan(0);
  });

  it("contadores agregados corretos com mix de cenários", () => {
    const r = reconcileCartaoPonto(
      result([
        ap({ data: "2024-01-01", marcacoes: [{ e: "08:00", s: "12:00" }] }),
        ap({ data: "2024-01-02", marcacoes: [{ e: "09:00", s: "13:00" }] }),
        ap({ data: "2024-01-03", marcacoes: [] }),
      ]),
      result([
        ap({ data: "2024-01-01", marcacoes: [{ e: "08:00", s: "12:00" }] }),
        ap({ data: "2024-01-02", marcacoes: [{ e: "09:00", s: "14:00" }] }),
        ap({ data: "2024-01-04", marcacoes: [{ e: "10:00", s: "14:00" }] }),
      ]),
    );
    expect(r.contadores.total).toBe(4);
    expect(r.contadores.agree).toBe(1);
    expect(r.contadores.differ).toBe(1);
    expect(r.contadores.onlyRegex).toBe(1);
    expect(r.contadores.onlyIa).toBe(1);
  });

  it("htDiscrepancia marcada quando soma das batidas não bate com HT", () => {
    const r = reconcileCartaoPonto(
      result([
        ap({
          data: "2024-01-01",
          marcacoes: [{ e: "08:00", s: "10:00" }],
          eventos: [{ tipo: "horas_trabalhadas", valor: "08:00", raw: "" }],
        }),
      ]),
      result([
        ap({
          data: "2024-01-01",
          marcacoes: [{ e: "08:00", s: "10:00" }],
          eventos: [{ tipo: "horas_trabalhadas", valor: "08:00", raw: "" }],
        }),
      ]),
    );
    expect(r.contadores.htDiscrepancias).toBe(1);
    expect(r.dias[0].htDiscrepancia).toBe(true);
  });
});
