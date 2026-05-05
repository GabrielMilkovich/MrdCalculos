/**
 * Testes do parser Via Varejo / Casa Bahia (PR 1 da refatoração v5).
 *
 * Estratégia: TDD — fixture real (Joseli Silva Wanderley, processo
 * 0012003-73.2021.5.15.0077) com `expected.csv` byte-a-byte como baseline.
 * Quaisquer 11 testes adicionais cobrem os edge cases listados na
 * spec seção 3.1.6.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  parseCartaoPontoViaVarejo,
  detectarLayoutViaVarejo,
  reconstruirData,
} from "../../../parsers/cartao-ponto/layouts/via-varejo-v1";
import { buildCartaoPontoCSV } from "../../../export/per-doc/cartao-ponto-csv";
import * as Dispatcher from "../../../parsers/cartao-ponto/index";

const { parseCartaoPonto } = Dispatcher;

const FIXTURE_DIR = join(
  __dirname,
  "..",
  "..",
  "_fixtures",
  "cartao-ponto",
  "joseli-via-varejo-2011-2016",
);

function readFixture(file: string): string {
  return readFileSync(join(FIXTURE_DIR, file), "utf-8");
}

async function blobToText(blob: Blob): Promise<string> {
  return await blob.text();
}

// =====================================================
// Teste principal: byte-a-byte com expected.csv
// =====================================================

describe("via-varejo-v1 — fixture Joseli (regressão)", () => {
  it("OCR Joseli → CSV bate byte-a-byte com expected.csv", async () => {
    const ocr = readFixture("ocr.txt");
    const expected = readFixture("expected.csv");
    const parsed = parseCartaoPontoViaVarejo(ocr);
    const blob = buildCartaoPontoCSV(parsed);
    const generated = await blobToText(blob);
    expect(generated).toBe(expected);
  });
});

// =====================================================
// 11 testes adicionais cobrindo edge cases
// =====================================================

describe("via-varejo-v1 — cortes semânticos", () => {
  it("Resumo do Período NÃO vira batida", () => {
    const ocr = readFixture("ocr.txt");
    const parsed = parseCartaoPontoViaVarejo(ocr);
    // O resumo do cartão 1 contém ADICIONAL NOTURNO 0:19, BANCO HORAS 2:10,
    // HORAS TRABALHADAS 190:40 etc. Nenhum desses pode aparecer como batida.
    const horarios = parsed.apuracoes.flatMap((a) =>
      a.marcacoes.flatMap((m) => [m.e, m.s]).filter(Boolean),
    );
    expect(horarios).not.toContain("02:14");
    expect(horarios).not.toContain("00:19");
    expect(horarios).not.toContain("190:40");
    // ADICIONAL NOTURNO 0:19 sem zfill — também não deve aparecer
    expect(horarios).not.toContain("0:19");
  });

  it("Datas de assinatura PJe NÃO viram batida", () => {
    const ocr = readFixture("ocr.txt");
    const parsed = parseCartaoPontoViaVarejo(ocr);
    // "Assinado eletronicamente por: ... - 20/04/2022 14:31:42"
    // 14:31 NÃO pode ser batida porque está depois do corte semântico.
    // Verifica que nenhuma apuração tem data em 2022 (todos os cartões
    // são 2011).
    expect(parsed.apuracoes.every((a) => a.data.startsWith("2011-"))).toBe(true);
  });

  it("Rodapé com 'Número do processo:' ignora horários após", () => {
    const ocr = `
| Período
21.05.2011 A 20.06.2011 |
| 02 QUI | 10:03 14:02 | 15:10 18:25 |
Número do processo: 0012003-73.2021.5.15.0077 13:45 17:00
`;
    const parsed = parseCartaoPontoViaVarejo(ocr);
    expect(parsed.apuracoes).toHaveLength(1);
    expect(parsed.apuracoes[0].marcacoes[0]).toEqual({ e: "10:03", s: "14:02" });
  });
});

describe("via-varejo-v1 — reconstrução de data", () => {
  it("dia 02 com período 21.05-20.06 vira 02/06", () => {
    const periodo = {
      inicio: new Date(Date.UTC(2011, 4, 21)),
      fim: new Date(Date.UTC(2011, 5, 20)),
      textoOriginal: "21.05.2011 A 20.06.2011",
    };
    const data = reconstruirData(2, periodo);
    expect(data?.toISOString().slice(0, 10)).toBe("2011-06-02");
  });

  it("dia 21 com período 21.06-20.07 vira 21/06 (não 21/07)", () => {
    const periodo = {
      inicio: new Date(Date.UTC(2011, 5, 21)),
      fim: new Date(Date.UTC(2011, 6, 20)),
      textoOriginal: "21.06.2011 A 20.07.2011",
    };
    const data = reconstruirData(21, periodo);
    expect(data?.toISOString().slice(0, 10)).toBe("2011-06-21");
  });

  it("dia 31 num período onde nenhum mês tem 31 dias devolve null", () => {
    // Período 21.04 a 20.05 — abril tem 30, maio tem 31. Dia 31 cai em maio.
    const periodo = {
      inicio: new Date(Date.UTC(2011, 3, 21)),
      fim: new Date(Date.UTC(2011, 4, 20)),
      textoOriginal: "21.04.2011 A 20.05.2011",
    };
    // Dia 31 de maio é depois do fim (20/05). Dia 31 de abril não existe.
    expect(reconstruirData(31, periodo)).toBeNull();
  });
});

describe("via-varejo-v1 — DSR e FERIADO", () => {
  it("D.S.R. com horário é capturado como batida (Layout A)", () => {
    const ocr = `
| Período
21.05.2011 A 20.06.2011 |
| 26 D.S.R. | 11:54 15:38 | 16:37 20:09 |
`;
    const parsed = parseCartaoPontoViaVarejo(ocr);
    expect(parsed.apuracoes).toHaveLength(1);
    expect(parsed.apuracoes[0].ocorrencia).toBe("DSR");
    expect(parsed.apuracoes[0].marcacoes).toHaveLength(2);
  });

  it("D.S.R. sem horário é ignorado (Layout A)", () => {
    const ocr = `
| Período
21.05.2011 A 20.06.2011 |
| 21 SEG | 13:45 17:02 | 18:10 22:05 |
| 22 D.S.R. | | |
| 23 TER | 09:00 12:00 | 13:00 18:00 |
`;
    const parsed = parseCartaoPontoViaVarejo(ocr);
    expect(parsed.apuracoes).toHaveLength(2);
    expect(parsed.apuracoes.map((a) => a.data)).toEqual([
      "2011-05-21",
      "2011-05-23",
    ]);
  });

  it("FERIADO trabalhado (com horário) gera linha com ocorrencia=FERIADO", () => {
    const ocr = `
| Período
21.06.2011 A 20.07.2011 |
| 23 FERIADO | 11:54 15:30 | 16:31 |
`;
    const parsed = parseCartaoPontoViaVarejo(ocr);
    expect(parsed.apuracoes).toHaveLength(1);
    expect(parsed.apuracoes[0].ocorrencia).toBe("FERIADO");
    expect(parsed.apuracoes[0].marcacoes[0]).toEqual({ e: "11:54", s: "15:30" });
    expect(parsed.apuracoes[0].marcacoes[1]).toEqual({ e: "16:31", s: "" });
  });
});

describe("via-varejo-v1 — detecção de layout e dispatcher", () => {
  it("OCR Joseli é detectado como via_varejo_v1 com confiança alta", () => {
    const ocr = readFixture("ocr.txt");
    const det = detectarLayoutViaVarejo(ocr);
    expect(det.layout).toBe("via_varejo_v1");
    expect(det.confianca).toBe("alta");
    expect(det.motivos.length).toBeGreaterThan(0);
  });

  it("OCR sem marcadores Via Varejo cai em layout genérico", () => {
    const ocr = `
| 21/05/2011 - Seg | 08:00 | 12:00 |
| 22/05/2011 - Ter | 08:30 | 12:30 |
`;
    const det = Dispatcher.detectarLayout(ocr);
    expect(det.layout).toBe("generico_v1");
  });

  it("Dispatcher delega corretamente: parseCartaoPonto → via_varejo_v1", () => {
    const ocr = readFixture("ocr.txt");
    // O dispatcher detecta automaticamente e chama o parser certo.
    const parsed = parseCartaoPonto(ocr);
    expect(parsed.parser_version).toContain("via-varejo-v1");
    expect(parsed.apuracoes.length).toBeGreaterThan(50);
  });
});

describe("via-varejo-v1 — Layout A vs Layout B", () => {
  it("Layout A linha-por-linha — extração direta cartão 2", () => {
    const ocr = readFixture("ocr.txt");
    const parsed = parseCartaoPontoViaVarejo(ocr);
    // Cartão 2 (21/06 a 20/07/2011) é Layout A. Tem dia 23 FERIADO com
    // 3 batidas (11:54 15:30 16:31), dia 28 TER e 03 D.S.R. e 14 QUI e
    // 18 SEG todos vazios.
    const ap2306 = parsed.apuracoes.find((a) => a.data === "2011-06-23");
    expect(ap2306).toBeDefined();
    expect(ap2306?.ocorrencia).toBe("FERIADO");
    expect(ap2306?.marcacoes).toEqual([
      { e: "11:54", s: "15:30" },
      { e: "16:31", s: "" },
    ]);
    // 28/06 vazio não vira apuração
    expect(parsed.apuracoes.find((a) => a.data === "2011-06-28")).toBeUndefined();
  });

  it("Layout B colapsado — alinhamento posicional cartão 1", () => {
    const ocr = readFixture("ocr.txt");
    const parsed = parseCartaoPontoViaVarejo(ocr);
    // Cartão 1 (21/05 a 20/06/2011) é Layout B. Dia 05 D.S.R. recebe a 4ª
    // batida do alinhamento posicional (09:45 13:46 14:45 18:07).
    const ap0506 = parsed.apuracoes.find((a) => a.data === "2011-06-05");
    expect(ap0506).toBeDefined();
    expect(ap0506?.ocorrencia).toBe("DSR");
    expect(ap0506?.marcacoes[0]).toEqual({ e: "09:45", s: "13:46" });
    expect(ap0506?.marcacoes[1]).toEqual({ e: "14:45", s: "18:07" });
  });
});
