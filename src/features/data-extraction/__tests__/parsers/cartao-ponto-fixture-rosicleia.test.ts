/**
 * Teste bloqueante — fixture real Rosicleia (Casas Bahia, jun-dez/2021).
 *
 * Garantias mínimas:
 *   - Parser preserva TODAS as 6 competências (NUNCA filtrar).
 *   - Total de apurações > 180 (6 meses × ~30 dias).
 *   - Eventos juridicamente relevantes preservados em pelo menos os dias
 *     citados na auditoria do usuário.
 *   - Bug "Horas Trabalhadas vira Entrada 3" não pode mais ocorrer.
 *
 * Origem: documento Rosicleia Pereira Chaves, processo 0010765-52.2024.5.03.0140
 * Período: 16/06/2021 a 15/12/2021.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

const FIXTURE_PATH = join(
  __dirname,
  "__fixtures__/cartao-rosicleia-casas-bahia-jun-dez-2021.txt",
);
const ocrText = readFileSync(FIXTURE_PATH, "utf-8");

describe("Fixture Rosicleia — cobertura total", () => {
  const r = parseCartaoPonto(ocrText);

  it("preserva 6 competências (jun, jul, ago, set, out, nov, dez/2021)", () => {
    // O período fecha dia 15, então atravessa: jun, jul, ago, set, out, nov, dez.
    // Mínimo esperado: 6 competências distintas.
    expect(r.competencias.size).toBeGreaterThanOrEqual(6);
    expect(r.competencias.has("06/2021")).toBe(true);
    expect(r.competencias.has("07/2021")).toBe(true);
    expect(r.competencias.has("08/2021")).toBe(true);
    expect(r.competencias.has("09/2021")).toBe(true);
    expect(r.competencias.has("10/2021")).toBe(true);
    expect(r.competencias.has("11/2021")).toBe(true);
    expect(r.competencias.has("12/2021")).toBe(true);
  });

  it("total de apurações > 180 (6 meses)", () => {
    expect(r.apuracoes.length).toBeGreaterThan(180);
  });

  it("data inicial = 16/06/2021 e data final = 15/12/2021", () => {
    expect(r.data_inicial).toBe("2021-06-16");
    expect(r.data_final).toBe("2021-12-15");
  });
});

describe("Fixture Rosicleia — CRÍTICO 2 (separação batidas vs eventos)", () => {
  const r = parseCartaoPonto(ocrText);

  it("01/10/2021: 2 marcações, NÃO 3 (Horas Trabalhadas não vira batida)", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-10-01");
    expect(a).toBeDefined();
    expect(a!.marcacoes).toHaveLength(2);
    expect(a!.marcacoes[0]).toEqual({ e: "09:11", s: "12:06" });
    expect(a!.marcacoes[1]).toEqual({ e: "13:34", s: "17:09" });
    // Eventos preservados:
    expect(
      a!.eventos.find((e) => e.tipo === "horas_trabalhadas")?.valor,
    ).toBe("06:30");
    expect(
      a!.eventos.find((e) => e.tipo === "horas_previstas")?.valor,
    ).toBe("07:20");
  });

  it("07/07/2021: 2 marcações + banco_horas_debito", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-07-07");
    expect(a).toBeDefined();
    expect(a!.marcacoes).toHaveLength(2);
    expect(a!.marcacoes[0]).toEqual({ e: "11:27", s: "14:30" });
    expect(a!.marcacoes[1]).toEqual({ e: "15:57", s: "19:50" });
    expect(
      a!.eventos.find((e) => e.tipo === "banco_horas_debito")?.valor,
    ).toBe("-00:24");
  });

  it("26/11/2021 (Black Friday): 13:38 trabalhadas + 04:18 HE 70%", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-11-26");
    expect(a).toBeDefined();
    expect(a!.marcacoes).toHaveLength(2);
    expect(a!.eventos.find((e) => e.tipo === "horas_trabalhadas")?.valor).toBe(
      "13:38",
    );
    expect(a!.eventos.find((e) => e.tipo === "he_com_70")?.valor).toBe("04:18");
    expect(a!.eventos.find((e) => e.tipo === "banco_horas_70")?.valor).toBe(
      "02:00",
    );
  });
});

describe("Fixture Rosicleia — eventos jurídicos relevantes", () => {
  const r = parseCartaoPonto(ocrText);

  it("01/08/2021: RSR Trabalhado 0% (Súmula 146 TST)", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-08-01");
    expect(a).toBeDefined();
    expect(a!.eventos.find((e) => e.tipo === "rsr_trabalhado_0")?.valor).toBe(
      "04:05",
    );
  });

  it("12/08/2021: Intrajornada Sup. 2hs (Súmula 437 TST)", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-08-12");
    expect(a).toBeDefined();
    expect(
      a!.eventos.find((e) => e.tipo === "intrajornada_sup_2hs")?.valor,
    ).toBe("00:23");
  });

  it("07/09/2021: trabalhou em feriado (HE Feriado 0%)", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-09-07");
    expect(a).toBeDefined();
    expect(a!.eventos.find((e) => e.tipo === "he_feriado_0")?.valor).toBe(
      "04:45",
    );
    expect(a!.eventos.find((e) => e.tipo === "feriado_dias")?.valor).toBe("1");
  });

  it("25/11/2021: HE Com 70% Intervalo", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-11-25");
    expect(a).toBeDefined();
    expect(a!.eventos.find((e) => e.tipo === "he_intervalo")?.valor).toBe(
      "00:03",
    );
  });
});

describe("Fixture Rosicleia — ocorrências de ausência", () => {
  const r = parseCartaoPonto(ocrText);

  it("16/06/2021 a 06/07/2021: FÉRIAS (sem batidas)", () => {
    const ferias = r.apuracoes.filter(
      (a) =>
        a.data >= "2021-06-16" &&
        a.data <= "2021-07-06" &&
        a.ocorrencia === "FERIAS",
    );
    expect(ferias.length).toBeGreaterThanOrEqual(15);
  });

  it("14-15/07/2021: LICENÇA MÉDICA", () => {
    const lic1 = r.apuracoes.find((a) => a.data === "2021-07-14");
    const lic2 = r.apuracoes.find((a) => a.data === "2021-07-15");
    expect(lic1?.ocorrencia).toBe("LICENCA_MEDICA");
    expect(lic2?.ocorrencia).toBe("LICENCA_MEDICA");
  });

  it("16/09/2021: TREINAMENTO", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-09-16");
    expect(a?.ocorrencia).toBe("TREINAMENTO");
  });

  it("Domingos com DSR Semanal são detectados como DSR", () => {
    const dsrs = r.apuracoes.filter((a) => a.ocorrencia === "DSR");
    expect(dsrs.length).toBeGreaterThan(15);
  });
});

describe("Fixture Rosicleia — batidas inseridas (asterisco)", () => {
  const r = parseCartaoPonto(ocrText);

  it("16/07/2021: 4 batidas reais (a 4ª 19:50 não pode ser perdida)", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-07-16");
    expect(a).toBeDefined();
    expect(a!.marcacoes).toHaveLength(2);
    expect(a!.marcacoes[0]).toMatchObject({ e: "11:30", s: "14:00" });
    expect(a!.marcacoes[1]).toMatchObject({ e: "15:05", s: "19:50" });
    // Todas inseridas (asterisco no OCR + lista "Inserido")
    expect(a!.marcacoes.every((m) => m.e_inserida && m.s_inserida)).toBe(true);
  });

  it("13/09/2021: 4 batidas todas inseridas, sem duplicação", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-09-13");
    expect(a).toBeDefined();
    expect(a!.marcacoes).toHaveLength(2);
    expect(a!.marcacoes[0]).toMatchObject({ e: "08:30", s: "12:00" });
    expect(a!.marcacoes[1]).toMatchObject({ e: "13:05", s: "16:50" });
    expect(a!.marcacoes.every((m) => m.e_inserida || m.s_inserida)).toBe(true);
  });
});

describe("Fixture Rosicleia — feriado trabalhado preserva batidas (CRÍTICO)", () => {
  const r = parseCartaoPonto(ocrText);

  it("02/11/2021 (Finados): batidas 08:41/14:12 preservadas mesmo sendo feriado", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-11-02");
    expect(a).toBeDefined();
    expect(a!.marcacoes).toHaveLength(1);
    expect(a!.marcacoes[0]).toMatchObject({ e: "08:41", s: "14:12" });
    expect(a!.eventos.find((e) => e.tipo === "he_feriado_0")?.valor).toBe("05:31");
  });
});

describe("Fixture Rosicleia — batidas ímpares (3ª sem par)", () => {
  const r = parseCartaoPonto(ocrText);

  it("30/11/2021: 3 horários (08:03 12:03 13:14) preservam a 3ª como E sem S", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-11-30");
    expect(a).toBeDefined();
    expect(a!.marcacoes).toHaveLength(2);
    expect(a!.marcacoes[0]).toMatchObject({ e: "08:03", s: "12:03" });
    expect(a!.marcacoes[1]).toMatchObject({ e: "13:14", s: "" });
  });

  it("11/12/2021: 3 horários (10:02 14:15 15:52) preservam a 3ª como E sem S", () => {
    const a = r.apuracoes.find((x) => x.data === "2021-12-11");
    expect(a).toBeDefined();
    expect(a!.marcacoes).toHaveLength(2);
    expect(a!.marcacoes[0]).toMatchObject({ e: "10:02", s: "14:15" });
    expect(a!.marcacoes[1]).toMatchObject({ e: "15:52", s: "" });
  });
});
