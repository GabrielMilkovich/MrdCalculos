import { describe, expect, it } from "vitest";
import { composeCartoesPonto } from "../../composer/cartao-ponto";
import type { ApuracaoDiaria } from "../../parsers/cartao-ponto";
import type { CartaoPontoExtraido } from "../../api/cartao-ponto";

function cartao(competencia: string): CartaoPontoExtraido {
  return {
    id: `id-${competencia}`,
    document_id: `doc-${competencia}`,
    case_id: "case-1",
    competencia,
    data_inicial: null,
    data_final: null,
  };
}

const apuracao = (data: string): ApuracaoDiaria => ({
  data,
  ocorrencia: "NORMAL",
  marcacoes: [{ e: "08:00", s: "12:00" }],
  observacao: null,
});

describe("composeCartoesPonto", () => {
  it("Vetor vazio → cartoes []", () => {
    const r = composeCartoesPonto([]);
    expect(r.cartoes).toEqual([]);
    expect(r.totalApuracoes).toBe(0);
  });

  it("Cartões com 0 apurações são filtrados", () => {
    const r = composeCartoesPonto([
      { cartao: cartao("01/2024"), apuracoes: [] },
      {
        cartao: cartao("02/2024"),
        apuracoes: [apuracao("2024-02-01")],
      },
    ]);
    expect(r.cartoes.length).toBe(1);
    expect(r.cartoes[0].competencia).toBe("02/2024");
    expect(r.totalApuracoes).toBe(1);
  });

  it("Sort por competência (alfanumérico — ok pra MM/yyyy stable)", () => {
    const r = composeCartoesPonto([
      {
        cartao: cartao("03/2024"),
        apuracoes: [apuracao("2024-03-15")],
      },
      {
        cartao: cartao("01/2024"),
        apuracoes: [apuracao("2024-01-15")],
      },
    ]);
    expect(r.cartoes.map((c) => c.competencia)).toEqual([
      "01/2024",
      "03/2024",
    ]);
  });

  it("Apurações dentro do cartão ordenadas por data", () => {
    const r = composeCartoesPonto([
      {
        cartao: cartao("03/2024"),
        apuracoes: [
          apuracao("2024-03-15"),
          apuracao("2024-03-01"),
          apuracao("2024-03-08"),
        ],
      },
    ]);
    expect(r.cartoes[0].apuracoes.map((a) => a.data)).toEqual([
      "2024-03-01",
      "2024-03-08",
      "2024-03-15",
    ]);
  });

  it("nome do cartão = 'Cartão MM/yyyy'", () => {
    const r = composeCartoesPonto([
      { cartao: cartao("03/2024"), apuracoes: [apuracao("2024-03-01")] },
    ]);
    expect(r.cartoes[0].nome).toBe("Cartão 03/2024");
  });

  it("totalApuracoes soma todos os cartões", () => {
    const r = composeCartoesPonto([
      {
        cartao: cartao("01/2024"),
        apuracoes: [apuracao("2024-01-01"), apuracao("2024-01-02")],
      },
      {
        cartao: cartao("02/2024"),
        apuracoes: [apuracao("2024-02-01")],
      },
    ]);
    expect(r.totalApuracoes).toBe(3);
  });
});
