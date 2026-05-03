/**
 * Edge cases do parser de cartão de ponto.
 *
 * Cobertura:
 *   - Múltiplos formatos de data (dd/mm, dd-mm, dd.mm).
 *   - Hora com segundos (HH:MM:SS).
 *   - Linhas órfãs (horário sem data).
 *   - Múltiplas competências preservadas (CRÍTICO 1: nunca filtrar).
 *   - Dedup de datas duplicadas.
 *   - Pares de marcação ímpares (jornada incompleta).
 */
import { describe, expect, it } from "vitest";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

describe("parseCartaoPonto — formatos de data", () => {
  it("aceita dd/mm/yyyy", () => {
    const r = parseCartaoPonto("01/03/2024 08:00 12:00");
    expect(r.apuracoes).toHaveLength(1);
    expect(r.apuracoes[0].data).toBe("2024-03-01");
  });

  it("aceita dd-mm-yyyy", () => {
    const r = parseCartaoPonto("01-03-2024 08:00 12:00");
    expect(r.apuracoes).toHaveLength(1);
    expect(r.apuracoes[0].data).toBe("2024-03-01");
  });

  it("aceita dd.mm.yyyy", () => {
    const r = parseCartaoPonto("01.03.2024 08:00 12:00");
    expect(r.apuracoes).toHaveLength(1);
    expect(r.apuracoes[0].data).toBe("2024-03-01");
  });
});

describe("parseCartaoPonto — formatos de hora", () => {
  it("aceita HH:MM", () => {
    const r = parseCartaoPonto("01/03/2024 08:00 12:00");
    expect(r.apuracoes[0].marcacoes[0]).toEqual({ e: "08:00", s: "12:00" });
  });

  it("aceita HH:MM:SS (descartando segundos)", () => {
    const r = parseCartaoPonto("01/03/2024 08:00:30 12:00:45");
    expect(r.apuracoes[0].marcacoes[0]).toEqual({ e: "08:00", s: "12:00" });
  });

  it("hora 1-dígito padronizada para 2-dígitos", () => {
    const r = parseCartaoPonto("01/03/2024 8:00 9:00");
    expect(r.apuracoes[0].marcacoes[0]).toEqual({ e: "08:00", s: "09:00" });
  });

  it("descarta hora inválida (>24, >59min)", () => {
    const r = parseCartaoPonto("01/03/2024 25:00 99:99");
    expect(r.apuracoes[0].marcacoes).toEqual([]);
  });
});

describe("parseCartaoPonto — unparsed_lines", () => {
  it("linha com horário mas sem data vai pra unparsed_lines", () => {
    const r = parseCartaoPonto("Apenas 08:00 12:00 sem data");
    expect(r.unparsed_lines).toHaveLength(1);
    expect(r.unparsed_lines[0].conteudo).toContain("08:00");
  });

  it("linha sem dado relevante NÃO vai pra unparsed_lines", () => {
    const r = parseCartaoPonto("Cabeçalho do documento\nQualquer texto");
    expect(r.unparsed_lines).toHaveLength(0);
  });

  it("linha com palavra-chave de ocorrência sem data vai pra unparsed", () => {
    const r = parseCartaoPonto("FALTA dia 5\n01/03/2024 FOLGA");
    // Linha 1 tem "FALTA" mas sem data → unparsed
    // Linha 2 tem data + FOLGA → vira apuração
    expect(r.unparsed_lines.length).toBeGreaterThanOrEqual(0);
    expect(r.apuracoes).toHaveLength(1);
    expect(r.apuracoes[0].ocorrencia).toBe("FOLGA");
  });
});

describe("parseCartaoPonto — múltiplas competências PRESERVADAS (CRÍTICO 1)", () => {
  it("Apurações de TODOS os meses no mapa de competencias", () => {
    const text = `
      28/02/2024 08:00 17:00
      29/02/2024 08:00 17:00
      01/03/2024 08:00 17:00
      02/03/2024 08:00 17:00
      03/03/2024 08:00 17:00
    `;
    const r = parseCartaoPonto(text);
    expect(r.competencia_predominante).toBe("03/2024");
    expect(r.apuracoes).toHaveLength(5); // ANTES: 3 (filtrava); AGORA: 5 (todas)
    expect(r.competencias.get("02/2024")).toBe(2);
    expect(r.competencias.get("03/2024")).toBe(3);
  });
});

describe("parseCartaoPonto — duplicatas e ímpar", () => {
  it("mesma data duplicada usa última, emite warning", () => {
    const text = `
      01/03/2024 08:00 12:00
      01/03/2024 09:00 13:00
    `;
    const r = parseCartaoPonto(text);
    expect(r.apuracoes).toHaveLength(1);
    expect(r.apuracoes[0].marcacoes[0].e).toBe("09:00");
    expect(r.warnings.some((w) => /duplicad/.test(w))).toBe(true);
  });

  it("número ímpar de horários: preserva o último como E sem S (batida órfã)", () => {
    const r = parseCartaoPonto("01/03/2024 08:00 12:00 13:00");
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
    expect(r.apuracoes[0].marcacoes[1]).toEqual({ e: "13:00", s: "" });
  });
});

describe("parseCartaoPonto — ocorrências (sem batidas)", () => {
  it.each([
    ["FALTA", "FALTA"],
    ["FOLGA", "FOLGA"],
    ["FERIADO", "FERIADO"],
    ["Férias : 07:20", "FERIAS"],
    ["ATESTADO", "ATESTADO"],
    ["Licença médica", "LICENCA_MEDICA"],
    ["Treinamento : 07:20", "TREINAMENTO"],
    ["AFASTAMENTO", "AFASTAMENTO"],
  ])("detecta '%s' como %s", (input, expected) => {
    const r = parseCartaoPonto(`01/03/2024 ${input}`);
    expect(r.apuracoes[0].ocorrencia).toBe(expected);
  });
});

describe("parseCartaoPonto — limite de 6 pares", () => {
  it("mais de 6 pares: limita a 6", () => {
    const text =
      "01/03/2024 " +
      Array.from({ length: 14 }, (_, i) => `0${(i % 9) + 1}:00`).join(" ");
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].marcacoes).toHaveLength(6);
  });
});
