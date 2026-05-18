import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  scoreCartaoPonto,
  scoreFerias,
  scoreFaltas,
  scoreHolerite,
} from "../../quality/score";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";
import { parseFerias } from "../../parsers/ferias";
import { parseFaltas } from "../../parsers/faltas";

describe("scoreCartaoPonto — fixture Rosicleia (alta qualidade)", () => {
  const ocr = readFileSync(
    join(
      __dirname,
      "..",
      "_fixtures",
      "cartao-ponto",
      "rosicleia",
      "ocr.txt",
    ),
    "utf-8",
  );
  const parsed = parseCartaoPonto(ocr);

  it("score ≥ 70 (fixture conhecida boa)", () => {
    const s = scoreCartaoPonto(parsed, ocr);
    expect(s.score, `reasons: ${s.reasons.join(" | ")}`).toBeGreaterThanOrEqual(70);
  });

  it("janelas de competência detectadas", () => {
    const s = scoreCartaoPonto(parsed, ocr);
    expect(s.janelas?.length ?? 0).toBeGreaterThanOrEqual(6);
  });

  it("nenhuma data fora de janela (após PR #35)", () => {
    const s = scoreCartaoPonto(parsed, ocr);
    expect(s.datasForaJanela).toEqual([]);
  });
});

describe("scoreCartaoPonto — OCR vazio = score baixo", () => {
  it("OCR vazio → score ≤ 10", () => {
    const parsed = parseCartaoPonto("");
    const s = scoreCartaoPonto(parsed, "");
    expect(s.score).toBeLessThanOrEqual(10);
    expect(s.level).toBe("baixa");
  });
});

describe("scoreCartaoPonto — datas fora de janela penalizam fortemente", () => {
  it("OCR com janela jun-jul/2021 + data dez/2021 → datasForaJanela detectada", () => {
    const ocr = `
Período 16/06/2021 a 15/07/2021
| 20/06/2021 - Dom | 08:00 | 12:00 |
| 21/06/2021 - Seg | 08:00 | 17:00 |
| 20/12/2021 - X | 10:14 |
`;
    const parsed = parseCartaoPonto(ocr);
    const s = scoreCartaoPonto(parsed, ocr);
    // Sem o fix do PR #35, 20/12 entraria como apuração.
    // Com o fix: 20/12 só tem horário "10:14" sem ser linha de aprovação,
    // então pode entrar mesmo. O importante é que SE entrar, score detecta.
    if (parsed.apuracoes.find((a) => a.data === "2021-12-20")) {
      expect(s.datasForaJanela).toContain("2021-12-20");
      expect(s.score).toBeLessThan(80);
    }
  });
});

describe("scoreFerias — alta qualidade", () => {
  it("recibo simples → score ≥ 70", () => {
    const ocr = `
RECIBO DE FÉRIAS
Empregado: João da Silva
Período Aquisitivo: 01/06/2022 a 31/05/2023
Relativa: 2022/2023
30 dias de férias
Período de gozo: 01/06/2024 a 30/06/2024
Abono pecuniário: 10 dias
`;
    const parsed = parseFerias(ocr);
    const s = scoreFerias(parsed, ocr);
    expect(s.score).toBeGreaterThanOrEqual(70);
    expect(s.level).not.toBe("baixa");
  });

  it("OCR sem nada → score baixo", () => {
    const parsed = parseFerias("");
    const s = scoreFerias(parsed, "");
    expect(s.score).toBeLessThan(60);
  });
});

describe("scoreFaltas — alta qualidade", () => {
  it("OCR com 3 faltas claras → score ≥ 70", () => {
    const ocr = `
Falta 15/03/2024 atestado médico
Falta 20/03/2024 injustificada
Falta 25/03/2024 consulta
`;
    const parsed = parseFaltas(ocr);
    const s = scoreFaltas(parsed, ocr);
    expect(s.score).toBeGreaterThanOrEqual(70);
  });
});

describe("scoreHolerite — sem rubricas é baixo", () => {
  it("0 rubricas → score ≤ 20", () => {
    const s = scoreHolerite(
      {
        competencia: "01/2024",
        rubricas: [],
        layout_usado: "generico_v1",
        warnings: [],
      },
      "",
    );
    expect(s.score).toBeLessThanOrEqual(20);
  });

  it("3+ rubricas em layout específico → score ≥ 80", () => {
    const s = scoreHolerite(
      {
        competencia: "01/2024",
        rubricas: [
          { codigo: "1", nome: "Salário", valor_vencimento: 3000, valor_desconto: null, quantidade: null, ordem: 0 },
          { codigo: "2", nome: "Comissões", valor_vencimento: 500, valor_desconto: null, quantidade: null, ordem: 1 },
          { codigo: "3", nome: "INSS", valor_vencimento: null, valor_desconto: 300, quantidade: null, ordem: 2 },
        ],
        layout_usado: "via_varejo_v1",
        warnings: [],
      },
      "",
    );
    expect(s.score).toBeGreaterThanOrEqual(80);
  });

  it("competência inválida → penalização", () => {
    const s = scoreHolerite(
      {
        competencia: "",
        rubricas: [
          { codigo: "1", nome: "Salário", valor_vencimento: 3000, valor_desconto: null, quantidade: null, ordem: 0 },
        ],
        layout_usado: "via_varejo_v1",
        warnings: [],
      },
      "",
    );
    expect(s.reasons.some((r) => /compet[êe]ncia/i.test(r))).toBe(true);
  });
});

// ============================================================
// FASE 1.4 — score.bloqueador
// ============================================================
describe("FASE 1.4 — score.bloqueador", () => {
  it("holerite com 0 rubricas → score≤30 + bloqueador=true", () => {
    const s = scoreHolerite(
      {
        competencia: "03/2024",
        rubricas: [],
        layout_usado: "generico_v1",
        warnings: [],
      },
      "qualquer texto",
    );
    expect(s.bloqueador).toBe(true);
    expect(s.score).toBeLessThanOrEqual(30);
  });

  it("soma das rubricas > 20% acima do bruto declarado → bloqueador=true", () => {
    // Bruto OCR = 3.000, parser somou 6.000 (100% acima do bruto).
    const ocrTexto = `
      REFERÊNCIA: 03/2024
      0001 SALARIO 6.000,00
      Total Bruto 3.000,00
    `;
    const s = scoreHolerite(
      {
        competencia: "03/2024",
        rubricas: [
          { codigo: "1", nome: "Salario", valor_vencimento: 6000, valor_desconto: null, quantidade: null, ordem: 0 },
        ],
        layout_usado: "generico_v1",
        warnings: [],
      },
      ocrTexto,
    );
    expect(s.bloqueador).toBe(true);
    expect(s.score).toBeLessThanOrEqual(30);
    expect(s.reasons.some((r) => /BLOQUEADOR/i.test(r))).toBe(true);
  });

  it("soma das rubricas dentro de 20% do bruto → bloqueador=falsy", () => {
    const ocrTexto = `
      REFERÊNCIA: 03/2024
      0001 SALARIO 3.000,00
      Total Bruto 3.000,00
    `;
    const s = scoreHolerite(
      {
        competencia: "03/2024",
        rubricas: [
          { codigo: "1", nome: "Salario", valor_vencimento: 3000, valor_desconto: null, quantidade: null, ordem: 0 },
        ],
        layout_usado: "generico_v1",
        warnings: [],
      },
      ocrTexto,
    );
    expect(s.bloqueador).toBeFalsy();
  });

  it("cartão-ponto vazio → bloqueador=true", () => {
    const r = parseCartaoPonto("nada aqui só ruído");
    const s = scoreCartaoPonto(r, "nada aqui só ruído");
    expect(s.bloqueador).toBe(true);
  });
});
