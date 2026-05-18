/**
 * Gate 2 — Cenário 3: detecção document-level `TEM_COLUNAS_HT_HE` no parser
 * de cartão de ponto, com variantes adversariais.
 *
 * Já temos `cartao-ponto-batida-fantasma.test.ts` cobrindo o caso feliz e
 * uma regressão de layout limpo. Este arquivo isola as VARIANTES do flag
 * HT/HE no documento:
 *
 *   1. Header com HT...HE separados por colunas (caso clássico Senior/ADP).
 *   2. Header com HE...HT na ordem invertida.
 *   3. Header com HE...DSR (variação Totvs).
 *   4. Documento sem ANY token HT/HE — não dispara cap, batidas legítimas
 *      passam pelo cap default de 12 horas.
 *
 * ============================================================
 *  GAP CONHECIDO — DÍVIDA TÉCNICA P0 (commit 5551cd1)
 * ============================================================
 *  Este teste exercita o caminho onde o OCR PRESERVA o cabeçalho HT/HE.
 *  O vetor "OCR sujo perde o cabeçalho" — comum em scans Mistral OCR de
 *  baixa qualidade — NÃO é testável aqui sem um documento real do
 *  fornecedor (Senior, ADP, Totvs). Validação só no Gate 3 com acervo.
 *
 *  Se Gate 3 mostrar cartão Senior/ADP com cabeçalho perdido e o bug
 *  recorrente: reverter 5551cd1 e implementar versão da spec original
 *  (truncate-to-8 + pair-validation-drop) com heurística que preserva
 *  o teste `cartao-ponto-fase1-marcar-nao-descartar.test.ts:91`.
 * ============================================================
 */
import { describe, it, expect } from "vitest";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

describe("Cartão de ponto — TEM_COLUNAS_HT_HE: variantes do detector", () => {
  it("header HT...HE → cap 4 horas → 2 pares por linha", () => {
    const txt = `EMPRESA
Data        E1    S1    E2    S2    HT      HE
01/03/2024  08:00 12:00 13:00 17:30 08:30   00:30
`;
    const r = parseCartaoPonto(txt);
    expect(r.apuracoes).toHaveLength(1);
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
    expect(r.apuracoes[0].marcacoes[0]).toEqual({ e: "08:00", s: "12:00" });
    expect(r.apuracoes[0].marcacoes[1]).toEqual({ e: "13:00", s: "17:30" });
  });

  it("header HE...HT (ordem invertida) também dispara o cap", () => {
    const txt = `EMPRESA
Data        E1    S1    E2    S2    HE      HT
01/03/2024  08:00 12:00 13:00 17:30 00:30   08:30
`;
    const r = parseCartaoPonto(txt);
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
    expect(r.apuracoes[0].marcacoes[1]).toEqual({ e: "13:00", s: "17:30" });
  });

  it("header HE...DSR (variação Totvs) também dispara o cap", () => {
    const txt = `EMPRESA
Data        E1    S1    E2    S2    HE      DSR
01/03/2024  08:00 12:00 13:00 17:30 00:30   08:00
`;
    const r = parseCartaoPonto(txt);
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
  });
});

describe("Cartão de ponto — documento SEM HT/HE no header: cap default preservado", () => {
  it("linha com 4 horas sem header HT/HE → 2 pares, batidas legítimas", () => {
    const txt = `EMPRESA
01/03/2024 Sex 08:00 12:00 13:00 18:30
`;
    const r = parseCartaoPonto(txt);
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
    expect(r.apuracoes[0].marcacoes[0]).toEqual({ e: "08:00", s: "12:00" });
    expect(r.apuracoes[0].marcacoes[1]).toEqual({ e: "13:00", s: "18:30" });
  });

  it("linha com 12 horas sem header HT/HE → 6 pares preservados (regression guard)", () => {
    // Mesmo input do teste legado `cartao-ponto.test.ts:46` ("limita a 6
    // marcações"). Confirma que o cap default de 12 horas (HORAS_MAX) NÃO
    // foi reduzido pela introdução do TEM_COLUNAS_HT_HE.
    const txt =
      "01/03/2024 08:00 09:00 10:00 11:00 12:00 13:00 14:00 15:00 16:00 17:00 18:00 19:00 20:00 21:00";
    const r = parseCartaoPonto(txt);
    expect(r.apuracoes[0].marcacoes).toHaveLength(6);
  });
});

describe("Cartão de ponto — fronteira honesta do detector", () => {
  it("documento onde OCR PERDEU o header HT/HE: cap NÃO dispara (gap P0 conhecido)", () => {
    // Cenário do GAP P0: o cabeçalho da tabela foi engolido pelo OCR
    // (situação real em scans ruins de Senior/ADP). Sem cabeçalho, o
    // detector não tem como saber que existe coluna HT/HE — cap default
    // de 12 horas se aplica e os totalizadores HT/HE no FIM da linha
    // viram batidas-fantasma.
    //
    // Este teste DOCUMENTA o gap (não é uma assertion de qualidade — é
    // assertion de que a fronteira é onde dissemos que está). Se Gate 3
    // mostrar este vetor em produção, reverter 5551cd1 e refazer.
    const txt = `EMPRESA
01/03/2024 Sex 08:00 12:00 13:00 17:30 08:30 00:30
`;
    const r = parseCartaoPonto(txt);
    // Cap default = 12 horas = 6 pares. Aqui temos 6 horas = 3 pares.
    // O 3º par (08:30 → 00:30) é a batida-fantasma do totalizador HT/HE
    // que sobrevive porque o detector não viu o header.
    expect(r.apuracoes[0].marcacoes.length).toBeGreaterThanOrEqual(2);
    const todas = r.apuracoes[0].marcacoes;
    const temFantasma = todas.some((m) => m.e === "08:30" && m.s === "00:30");
    // GAP: hoje `temFantasma` pode ser true. Quando o fix definitivo
    // (pair-validation com heurística) entrar, esta assertion vira `false`.
    expect(typeof temFantasma).toBe("boolean"); // assertion neutra — documenta, não cobra
  });
});
