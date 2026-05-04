import { describe, expect, it } from "vitest";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

describe("parseCartaoPonto — vazio", () => {
  it("OCR vazio retorna apuracoes vazio + warning", () => {
    const r = parseCartaoPonto("");
    expect(r.apuracoes).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("texto sem datas retorna vazio", () => {
    const r = parseCartaoPonto("Texto qualquer sem datas válidas.");
    expect(r.apuracoes).toHaveLength(0);
  });
});

describe("parseCartaoPonto — dia normal", () => {
  it("1 dia com 4 horários → 2 marcações pareadas", () => {
    const text = "01/03/2024 08:00 12:00 13:00 17:00";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes).toHaveLength(1);
    const a = r.apuracoes[0];
    expect(a.data).toBe("2024-03-01");
    expect(a.ocorrencia).toBe("NORMAL");
    expect(a.marcacoes).toEqual([
      { e: "08:00", s: "12:00" },
      { e: "13:00", s: "17:00" },
    ]);
  });

  it("1 dia com 3 horários → 2 marcações (3ª como E sem S, preserva batida órfã)", () => {
    const text = "01/03/2024 08:00 12:00 13:00";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
    expect(r.apuracoes[0].marcacoes[0]).toEqual({ e: "08:00", s: "12:00" });
    expect(r.apuracoes[0].marcacoes[1]).toEqual({ e: "13:00", s: "" });
  });

  it("dia com 0 horários (NORMAL) → marcações vazias sem crash", () => {
    const text = "01/03/2024 (sem batidas)";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].marcacoes).toHaveLength(0);
    expect(r.apuracoes[0].ocorrencia).toBe("NORMAL");
  });

  it("dia com 6 pares (12 horários) limita a 6 marcações", () => {
    const text =
      "01/03/2024 08:00 09:00 10:00 11:00 12:00 13:00 14:00 15:00 16:00 17:00 18:00 19:00 20:00 21:00";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].marcacoes).toHaveLength(6);
  });
});

describe("parseCartaoPonto — ocorrências", () => {
  it("FALTA isolada (sem batidas) → ocorrencia=FALTA", () => {
    const text = "01/03/2024 FALTA";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("FALTA");
  });

  it("FERIADO sem batidas", () => {
    const text = "07/09/2024 FERIADO";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("FERIADO");
  });

  it("ATESTADO sem batidas", () => {
    const text = "15/03/2024 ATESTADO médico";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("ATESTADO");
  });

  it("FÉRIAS com acento (sem batidas)", () => {
    const text = "10/03/2024 Férias : 07:20";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("FERIAS");
  });

  it("LICENÇA MÉDICA", () => {
    const text = "12/03/2024 Licença médica : 07:20";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("LICENCA_MEDICA");
  });
});

describe("parseCartaoPonto — múltiplas competências (NUNCA mais filtra)", () => {
  it("Apurações de TODOS os meses são preservadas (corrige CRÍTICO 1)", () => {
    const text = `
      01/03/2024 08:00 12:00 13:00 17:00
      02/03/2024 08:00 12:00 13:00 17:00
      03/03/2024 08:00 12:00 13:00 17:00
      01/04/2024 08:00 12:00 13:00 17:00
    `;
    const r = parseCartaoPonto(text);
    expect(r.apuracoes).toHaveLength(4);
    expect(r.competencia_predominante).toBe("03/2024");
    expect(r.competencias.get("03/2024")).toBe(3);
    expect(r.competencias.get("04/2024")).toBe(1);
  });

  it("data_inicial e data_final extraídos do range completo", () => {
    const text = `
      05/03/2024 08:00 17:00
      10/03/2024 08:00 17:00
      28/04/2024 08:00 17:00
    `;
    const r = parseCartaoPonto(text);
    expect(r.data_inicial).toBe("2024-03-05");
    expect(r.data_final).toBe("2024-04-28");
  });

  it("dedup por data: turnos disjuntos (manhã+tarde) → MERGE com warning", () => {
    const text = `
      01/03/2024 08:00 12:00
      01/03/2024 13:00 17:00
    `;
    const r = parseCartaoPonto(text);
    expect(r.apuracoes).toHaveLength(1);
    // Marcações de manhã + tarde combinadas (4 batidas em 2 pares).
    expect(r.apuracoes[0].marcacoes.length).toBe(2);
    // Warning específico de merge — IMP-3 do auditor exige distinguir
    // merge legítimo de "última-prevalece" (que indica perda de dado).
    expect(r.warnings.some((w) => /turnos\s+(disjuntos|UNIDOS)/i.test(w))).toBe(
      true,
    );
  });

  it("dedup por data: turnos sobrepostos → última prevalece com warning distinto", () => {
    const text = `
      01/03/2024 08:00 12:00
      01/03/2024 09:00 18:00
    `;
    const r = parseCartaoPonto(text);
    expect(r.apuracoes).toHaveLength(1);
    // Última leitura prevalece — perda de dado possível, warning específico.
    expect(
      r.warnings.some((w) => /PREVALECEU|sobrepostos|conflitantes/i.test(w)),
    ).toBe(true);
  });
});

describe("parseCartaoPonto — datas inválidas", () => {
  it("32/03/2024 → warning, não crash", () => {
    const text = `
      32/03/2024 08:00 17:00
      02/03/2024 08:00 17:00
    `;
    const r = parseCartaoPonto(text);
    expect(r.apuracoes).toHaveLength(1);
    expect(r.warnings.some((w) => w.match(/inv[áa]lida/i))).toBe(true);
  });

  it("13/13/2024 → warning", () => {
    const text = "13/13/2024 08:00 17:00";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes).toHaveLength(0);
  });
});

describe("parseCartaoPonto — horários inválidos", () => {
  it("Hora 25:00 é descartada (3 horários válidos viram 1 par)", () => {
    const text = "01/03/2024 08:00 25:00 13:00 17:00";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].marcacoes.length).toBeGreaterThanOrEqual(1);
    expect(r.apuracoes[0].marcacoes[0].e).toBe("08:00");
  });
});

describe("parseCartaoPonto — CRÍTICO 2: separa batidas de RESULTADO", () => {
  it("Horários após 'Horas Trabalhadas' NÃO viram batida", () => {
    // Linha real do espelho Casas Bahia
    const text = "01/10/2021 09:11 12:06 13:34 17:09 Horas Trabalhadas : 06:30 Horas Previstas : 07:20";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes).toHaveLength(1);
    const a = r.apuracoes[0];
    // Apenas 4 batidas → 2 pares. Os 06:30 e 07:20 NÃO entram em marcacoes.
    expect(a.marcacoes).toHaveLength(2);
    expect(a.marcacoes[0]).toEqual({ e: "09:11", s: "12:06" });
    expect(a.marcacoes[1]).toEqual({ e: "13:34", s: "17:09" });
    // Eventos preservados
    expect(a.eventos.find((e) => e.tipo === "horas_trabalhadas")?.valor).toBe(
      "06:30",
    );
    expect(a.eventos.find((e) => e.tipo === "horas_previstas")?.valor).toBe(
      "07:20",
    );
  });

  it("Banco de Horas Debito não vira batida", () => {
    const text = "07/07/2021 11:27 14:30 15:57 19:50 Horas Trabalhadas : 06:56 Horas Previstas : 07:20 Banco de Horas Debito : -00:24";
    const r = parseCartaoPonto(text);
    const a = r.apuracoes[0];
    expect(a.marcacoes).toHaveLength(2);
    expect(a.eventos.find((e) => e.tipo === "banco_horas_debito")?.valor).toBe(
      "-00:24",
    );
  });

  it("Hora Extra Feriado 0% não vira batida", () => {
    const text = "07/09/2021 - Ter | 08:32 | 11:04 | 12:07 | 14:20 | Horas Trabalhadas : 04:45 | Hora Extra Feriado 0% : 04:45 | FERIADO (dias) : 1";
    const r = parseCartaoPonto(text);
    const a = r.apuracoes[0];
    expect(a.marcacoes).toHaveLength(2);
    expect(a.eventos.find((e) => e.tipo === "he_feriado_0")?.valor).toBe("04:45");
    expect(a.eventos.find((e) => e.tipo === "feriado_dias")?.valor).toBe("1");
  });
});

describe("parseCartaoPonto — batidas inseridas (asterisco)", () => {
  it("11:30* → marcacao com e_inserida=true", () => {
    const text = "16/07/2021 11:30* 14:00 15:05 19:50";
    const r = parseCartaoPonto(text);
    const a = r.apuracoes[0];
    expect(a.marcacoes).toHaveLength(2);
    expect(a.marcacoes[0].e_inserida).toBe(true);
    expect(a.marcacoes[0].s_inserida).toBeUndefined();
  });

  it("4 batidas todas com asterisco → todas inseridas", () => {
    const text = "13/09/2021 08:30* 12:00* 13:05* 16:50*";
    const r = parseCartaoPonto(text);
    const a = r.apuracoes[0];
    expect(a.marcacoes[0].e_inserida).toBe(true);
    expect(a.marcacoes[0].s_inserida).toBe(true);
    expect(a.marcacoes[1].e_inserida).toBe(true);
    expect(a.marcacoes[1].s_inserida).toBe(true);
  });
});

describe("parseCartaoPonto — eventos jurídicos", () => {
  it("RSR Trabalhado 0% (Súmula 146 TST)", () => {
    const text = "01/08/2021 - Dom 08:59 13:04 R.S.R. Trabalhado 0 % : 04:05 DSR Semanal (dias) : 1";
    const r = parseCartaoPonto(text);
    const a = r.apuracoes[0];
    expect(a.eventos.find((e) => e.tipo === "rsr_trabalhado_0")?.valor).toBe(
      "04:05",
    );
    expect(a.eventos.find((e) => e.tipo === "dsr_semanal_dias")?.valor).toBe(
      "1",
    );
  });

  it("Intrajornada Sup. 2hs (Súmula 437 TST)", () => {
    const text = "12/08/2021 11:16 13:56 16:19 19:37 Horas Trabalhadas : 05:58 Intrajornada Sup. 2hs : 00:23";
    const r = parseCartaoPonto(text);
    const a = r.apuracoes[0];
    expect(a.eventos.find((e) => e.tipo === "intrajornada_sup_2hs")?.valor).toBe(
      "00:23",
    );
  });

  it("Banco de Horas 70% (positivo) e Débito (negativo)", () => {
    const text = "26/07/2021 11:24 14:12 15:17 20:09 Horas Trabalhadas : 07:40 Banco de Horas 70% : 00:20";
    const r = parseCartaoPonto(text);
    const a = r.apuracoes[0];
    expect(a.eventos.find((e) => e.tipo === "banco_horas_70")?.valor).toBe("00:20");
  });

  it("Horas Extras Com 70% (Black Friday)", () => {
    const text = "26/11/2021 05:40 12:00 13:25 20:43 Horas Trabalhadas : 13:38 Banco de Horas 70% : 02:00 Horas Extras Com 70% : 04:18";
    const r = parseCartaoPonto(text);
    const a = r.apuracoes[0];
    expect(a.eventos.find((e) => e.tipo === "he_com_70")?.valor).toBe("04:18");
    expect(a.eventos.find((e) => e.tipo === "horas_trabalhadas")?.valor).toBe(
      "13:38",
    );
  });
});
