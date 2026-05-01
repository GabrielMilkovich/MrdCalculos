import { describe, expect, it } from "vitest";
import { parseFaltas } from "../../parsers/faltas";

describe("parseFaltas — vazio", () => {
  it("OCR vazio retorna faltas=[]", () => {
    const r = parseFaltas("");
    expect(r.faltas).toHaveLength(0);
  });
});

describe("parseFaltas — data única", () => {
  it("Falta em 15/03/2024 com atestado", () => {
    const text = "Falta em 15/03/2024 - atestado médico CID M54";
    const r = parseFaltas(text);
    expect(r.faltas).toHaveLength(1);
    expect(r.faltas[0].data_inicio).toBe("2024-03-15");
    expect(r.faltas[0].data_fim).toBe("2024-03-15");
    expect(r.faltas[0].justificada).toBe(true);
    expect(r.faltas[0].justificativa).toMatch(/atestado/i);
  });

  it("Falta injustificada", () => {
    const text = "Ausência injustificada em 20/03/2024";
    const r = parseFaltas(text);
    expect(r.faltas[0].justificada).toBe(false);
  });
});

describe("parseFaltas — intervalo", () => {
  it("Período 10/03/2024 a 12/03/2024", () => {
    const text = "Falta período 10/03/2024 a 12/03/2024 — atestado";
    const r = parseFaltas(text);
    expect(r.faltas).toHaveLength(1);
    expect(r.faltas[0].data_inicio).toBe("2024-03-10");
    expect(r.faltas[0].data_fim).toBe("2024-03-12");
  });

  it("Aceita 'até' como separador", () => {
    const text = "Ausência 10/03/2024 até 12/03/2024";
    const r = parseFaltas(text);
    expect(r.faltas[0].data_inicio).toBe("2024-03-10");
  });

  it("Aceita travessão como separador", () => {
    const text = "Falta 10/03/2024 - 12/03/2024";
    const r = parseFaltas(text);
    expect(r.faltas[0].data_inicio).toBe("2024-03-10");
  });
});

describe("parseFaltas — múltiplas linhas", () => {
  it("Várias linhas de falta", () => {
    const text = `
      Falta em 05/03/2024 - atestado
      Ausência injustificada em 12/03/2024
      Falta 18/03/2024 a 20/03/2024 - médico
    `;
    const r = parseFaltas(text);
    expect(r.faltas).toHaveLength(3);
    expect(r.faltas[0].data_inicio).toBe("2024-03-05");
    expect(r.faltas[1].justificada).toBe(false);
    expect(r.faltas[2].data_inicio).toBe("2024-03-18");
    expect(r.faltas[2].data_fim).toBe("2024-03-20");
  });

  it("Dedup: mesma chave fica só 1", () => {
    const text = `
      Falta em 15/03/2024
      Falta em 15/03/2024 - atestado
    `;
    const r = parseFaltas(text);
    expect(r.faltas).toHaveLength(1);
    // Última prevalece
    expect(r.faltas[0].justificada).toBe(true);
  });
});

describe("parseFaltas — datas inválidas", () => {
  it("32/03/2024 → warning, não crash", () => {
    const text = "Falta em 32/03/2024";
    const r = parseFaltas(text);
    expect(r.faltas).toHaveLength(0);
    expect(r.warnings.some((w) => /inv[áa]lida/i.test(w))).toBe(true);
  });
});

describe("parseFaltas — reinicia período aquisitivo", () => {
  it("trecho 'reinicia o período aquisitivo' → flag true", () => {
    const text = "Falta 10/03/2024 a 20/03/2024 - reinicia o período aquisitivo";
    const r = parseFaltas(text);
    expect(r.faltas[0].reiniciar_periodo_aquisitivo).toBe(true);
  });
});

describe("parseFaltas — linhas sem palavra-chave são ignoradas", () => {
  it("data solta sem 'falta' / 'ausência' não vira falta", () => {
    const text = "01/03/2024 — entrada normal de trabalho";
    const r = parseFaltas(text);
    expect(r.faltas).toHaveLength(0);
  });
});
