/**
 * Edge cases do parser de faltas.
 */
import { describe, expect, it } from "vitest";
import { parseFaltas } from "../../parsers/faltas";

describe("parseFaltas — formatos de data", () => {
  it("dd/mm/yyyy", () => {
    const r = parseFaltas("Falta em 15/03/2024");
    expect(r.faltas).toHaveLength(1);
    expect(r.faltas[0].data_inicio).toBe("2024-03-15");
  });

  it("dd-mm-yyyy", () => {
    const r = parseFaltas("Falta em 15-03-2024");
    expect(r.faltas[0].data_inicio).toBe("2024-03-15");
  });

  it("dd.mm.yyyy", () => {
    const r = parseFaltas("Falta em 15.03.2024");
    expect(r.faltas[0].data_inicio).toBe("2024-03-15");
  });
});

describe("parseFaltas — palavras-chave amplas", () => {
  it.each([
    "Falta em 15/03/2024",
    "Ausência em 15/03/2024",
    "Não compareceu em 15/03/2024",
    "Atestado 15/03/2024",
    "Licença em 15/03/2024",
    "Afastamento 15/03/2024",
    "Abono 15/03/2024",
  ])("detecta '%s' como falta", (input) => {
    const r = parseFaltas(input);
    expect(r.faltas).toHaveLength(1);
  });
});

describe("parseFaltas — justificada", () => {
  it("'atestado médico' → justificada=true", () => {
    const r = parseFaltas("Falta 15/03/2024 - atestado médico");
    expect(r.faltas[0].justificada).toBe(true);
  });

  it("'injustificada' → justificada=false", () => {
    const r = parseFaltas("Falta 15/03/2024 injustificada");
    expect(r.faltas[0].justificada).toBe(false);
  });

  it("'CID J45' → justificada=true", () => {
    const r = parseFaltas("Falta 15/03/2024 com CID J45");
    expect(r.faltas[0].justificada).toBe(true);
  });

  it("'gestante' → justificada=true", () => {
    const r = parseFaltas("Atestado 15/03/2024 motivo gestante");
    expect(r.faltas[0].justificada).toBe(true);
  });

  it("'doação de sangue' → justificada=true", () => {
    const r = parseFaltas("Falta 15/03/2024 motivo doação de sangue");
    expect(r.faltas[0].justificada).toBe(true);
  });
});

describe("parseFaltas — intervalo", () => {
  it("intervalo 'dd/mm/yyyy a dd/mm/yyyy'", () => {
    const r = parseFaltas("Falta de 10/03/2024 a 12/03/2024");
    expect(r.faltas[0].data_inicio).toBe("2024-03-10");
    expect(r.faltas[0].data_fim).toBe("2024-03-12");
  });

  it("intervalo 'dd-mm-yyyy até dd-mm-yyyy'", () => {
    const r = parseFaltas("Ausência 10-03-2024 até 12-03-2024");
    expect(r.faltas[0].data_inicio).toBe("2024-03-10");
    expect(r.faltas[0].data_fim).toBe("2024-03-12");
  });

  it("intervalo invertido é descartado com warning", () => {
    const r = parseFaltas("Falta 12/03/2024 a 10/03/2024");
    expect(r.faltas).toHaveLength(0);
    expect(r.warnings.some((w) => /invertido/.test(w))).toBe(true);
  });
});

describe("parseFaltas — unparsed_lines", () => {
  it("linha com palavra-chave mas sem data vai pra unparsed", () => {
    const r = parseFaltas("Falta sem data");
    expect(r.faltas).toHaveLength(0);
    expect(r.unparsed_lines).toHaveLength(1);
  });

  it("linha com data mas sem palavra-chave NÃO cria falta", () => {
    const r = parseFaltas("Hoje é 15/03/2024 e tudo bem");
    expect(r.faltas).toHaveLength(0);
  });
});

describe("parseFaltas — reinicia período aquisitivo", () => {
  it("detecta 'reinicia período aquisitivo'", () => {
    const r = parseFaltas(
      "Falta 15/03/2024 reinicia o período aquisitivo de férias",
    );
    expect(r.faltas[0].reiniciar_periodo_aquisitivo).toBe(true);
  });
});

describe("parseFaltas — dedup", () => {
  it("intervalo duplicado usa última, emite warning", () => {
    const text = `
      Falta 15/03/2024
      Falta 15/03/2024 atestado médico
    `;
    const r = parseFaltas(text);
    expect(r.faltas).toHaveLength(1);
    expect(r.faltas[0].justificada).toBe(true);
    expect(r.warnings.some((w) => /duplicada/.test(w))).toBe(true);
  });
});
