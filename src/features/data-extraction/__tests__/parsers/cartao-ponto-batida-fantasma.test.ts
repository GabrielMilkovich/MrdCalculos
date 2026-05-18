import { describe, it, expect } from "vitest";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

const CARTAO_INLINE = `EMPRESA LTDA
ESPELHO DE PONTO - MARCO/2024

Data        E1    S1    E2    S2    HT      HE
01/03/2024  08:00 12:00 13:00 17:30 08:30   00:30
04/03/2024  08:10 12:05 13:00 18:15 09:10   01:10
`;

describe("Cartão de ponto — HT/HE inline não vira batida", () => {
  it("exatamente 2 marcações por dia (não 3)", () => {
    const r = parseCartaoPonto(CARTAO_INLINE);
    expect(r.apuracoes).toHaveLength(2);
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
    expect(r.apuracoes[1].marcacoes).toHaveLength(2);
  });

  it("marcações são as batidas reais, não os totalizadores", () => {
    const r = parseCartaoPonto(CARTAO_INLINE);
    expect(r.apuracoes[0].marcacoes[0]).toEqual({ e: "08:00", s: "12:00" });
    expect(r.apuracoes[0].marcacoes[1]).toEqual({ e: "13:00", s: "17:30" });
  });

  it("não cria marcação impossível 08:30 → 00:30", () => {
    const r = parseCartaoPonto(CARTAO_INLINE);
    const todas = r.apuracoes.flatMap((a) => a.marcacoes);
    const impossivel = todas.find((m) => m.e === "08:30" && m.s === "00:30");
    expect(impossivel).toBeUndefined();
  });
});

const CARTAO_LIMPO_REGRESSION = `EMPRESA LTDA
01/03/2024 Sex   08:00 12:00 13:00 18:30
02/03/2024 Sab   08:00 12:00
03/03/2024 Dom   FOLGA
`;

describe("Cartão de ponto — regression layouts limpos continuam funcionando", () => {
  it("layout limpo sem totalizadores continua produzindo batidas corretas", () => {
    const r = parseCartaoPonto(CARTAO_LIMPO_REGRESSION);
    expect(r.apuracoes).toHaveLength(3);
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
    expect(r.apuracoes[1].marcacoes).toHaveLength(1);
    expect(r.apuracoes[2].marcacoes).toHaveLength(0);
    expect(r.apuracoes[2].ocorrencia).toBe("FOLGA");
  });
});
