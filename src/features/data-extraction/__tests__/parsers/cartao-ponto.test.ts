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

  it("1 dia com 3 horários → 1 marcação + warning de ímpar", () => {
    const text = "01/03/2024 08:00 12:00 13:00";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].marcacoes).toHaveLength(1);
    expect(r.warnings.some((w) => w.match(/[íi]mpar/i))).toBe(true);
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
  it("FALTA na linha → ocorrencia=FALTA + marcações vazias", () => {
    const text = "01/03/2024 FALTA 08:00 12:00";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("FALTA");
    expect(r.apuracoes[0].marcacoes).toHaveLength(0);
  });

  it("FERIADO", () => {
    const text = "07/09/2024 FERIADO";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("FERIADO");
  });

  it("ATESTADO", () => {
    const text = "15/03/2024 ATESTADO MEDICO";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("ATESTADO");
  });

  it("FÉRIAS com acento", () => {
    const text = "10/03/2024 FÉRIAS";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("FERIAS");
  });

  it("LICENÇA MÉDICA", () => {
    const text = "12/03/2024 LICENÇA MÉDICA";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].ocorrencia).toBe("LICENCA_MEDICA");
  });
});

describe("parseCartaoPonto — competência", () => {
  it("Linhas de outros meses são filtradas", () => {
    const text = `
      01/03/2024 08:00 12:00 13:00 17:00
      02/03/2024 08:00 12:00 13:00 17:00
      03/03/2024 08:00 12:00 13:00 17:00
      01/04/2024 08:00 12:00 13:00 17:00
    `;
    const r = parseCartaoPonto(text);
    // Predominante = 03/2024 (3 linhas vs 1 de 04/2024)
    expect(r.competencia_predominante).toBe("03/2024");
    expect(r.apuracoes).toHaveLength(3);
  });

  it("competenciaRef sobrepõe predominante quando passado", () => {
    const text = `
      01/04/2024 08:00 12:00 13:00 17:00
      02/04/2024 08:00 12:00 13:00 17:00
      03/04/2024 08:00 12:00 13:00 17:00
      01/03/2024 08:00 12:00 13:00 17:00
    `;
    const r = parseCartaoPonto(text, "03/2024");
    expect(r.competencia_predominante).toBe("03/2024");
    expect(r.apuracoes).toHaveLength(1);
  });

  it("data_inicial e data_final extraídos", () => {
    const text = `
      05/03/2024 08:00 17:00
      10/03/2024 08:00 17:00
      28/03/2024 08:00 17:00
    `;
    const r = parseCartaoPonto(text);
    expect(r.data_inicial).toBe("2024-03-05");
    expect(r.data_final).toBe("2024-03-28");
  });

  it("dedup por data: linhas duplicadas ficam só uma", () => {
    const text = `
      01/03/2024 08:00 12:00
      01/03/2024 13:00 17:00
    `;
    const r = parseCartaoPonto(text);
    expect(r.apuracoes).toHaveLength(1);
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
  it("Hora 25:00 é descartada", () => {
    const text = "01/03/2024 08:00 25:00 13:00 17:00";
    const r = parseCartaoPonto(text);
    expect(r.apuracoes[0].marcacoes).toEqual([
      { e: "08:00", s: "13:00" },
      // 17:00 sozinho seria ímpar; depende do número total. 3 horários válidos = 1 par + ímpar.
    ]);
  });
});
