/**
 * FASE 2 — testes da validação cruzada com totalizadores.
 *
 * Cada cartão corporativo declara um totalizador no rodapé de cada
 * página: "Movimentos: (Período de DD/MM/YYYY a DD/MM/YYYY) ... 9000
 * Horas Normais X:XX". Se a soma das batidas extraídas dentro do range
 * divergir >30 minutos do declarado, o parser MARCA todas as apurações
 * do range com REVISAR_OCR_TOTAL — sinal forte de OCR sujo (perdeu ou
 * duplicou batidas).
 *
 * Filosofia (mesma da Fase 1): MARCAR não DESCARTAR. Apuração entra
 * com flag, advogado decide.
 */
import { describe, expect, it } from "vitest";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

describe("Cartão Ponto — Fase 2: validação cruzada com totalizadores", () => {
  describe("totalizador declarado bate com soma das batidas → status=ok", () => {
    // 5 dias × 8h = 40h. Tolerância de 30min cobre arredondamentos.
    const ocr = `
PERÍODO: 16/06/2014 A 20/06/2014
16/06/2014 SEG 162 N 09:00 12:00 13:00 18:00
17/06/2014 TER 162 N 09:00 12:00 13:00 18:00
18/06/2014 QUA 162 N 09:00 12:00 13:00 18:00
19/06/2014 QUI 162 N 09:00 12:00 13:00 18:00
20/06/2014 SEX 162 N 09:00 12:00 13:00 18:00
Movimentos: (Período de 16/06/2014 a 20/06/2014)
9000 Horas Normais 40:00
`.trim();

    const r = parseCartaoPonto(ocr);

    it("consistencia[0] tem status=ok", () => {
      expect(r.consistencia).toHaveLength(1);
      expect(r.consistencia[0].status).toBe("ok");
    });

    it("nenhuma apuração marcada REVISAR_OCR_TOTAL", () => {
      const total = r.apuracoes.filter((a) =>
        a.observacao?.includes("REVISAR_OCR_TOTAL"),
      );
      expect(total).toHaveLength(0);
    });
  });

  describe("totalizador divergente >30min → status=divergente + flag", () => {
    // Declarado: 40:00 (5 dias). Soma real do OCR: 24:00 (3 dias).
    // Diff: 16:00 → muito acima da tolerância.
    const ocr = `
PERÍODO: 16/06/2014 A 20/06/2014
16/06/2014 SEG 162 N 09:00 12:00 13:00 18:00
17/06/2014 TER 162 N 09:00 12:00 13:00 18:00
18/06/2014 QUA 162 N 09:00 12:00 13:00 18:00
Movimentos: (Período de 16/06/2014 a 20/06/2014)
9000 Horas Normais 40:00
`.trim();

    const r = parseCartaoPonto(ocr);

    it("consistencia[0] tem status=divergente", () => {
      expect(r.consistencia[0].status).toBe("divergente");
    });

    it("diff_min reflete a divergência calculada", () => {
      // Declarado 40h × 60 = 2400min, somado 24h × 60 = 1440min, diff 960min
      expect(r.consistencia[0].diff_min).toBe(960);
    });

    it("apurações do range marcadas REVISAR_OCR_TOTAL", () => {
      const total = r.apuracoes.filter((a) =>
        a.observacao?.includes("REVISAR_OCR_TOTAL"),
      );
      expect(total.length).toBeGreaterThanOrEqual(3);
    });

    it("warnings inclui descrição da divergência", () => {
      const w = r.warnings.find(
        (x) => x.includes("Período") && x.includes("divergente"),
      );
      // Pode estar com formato "declarado X vs. somado Y"; checa termos-chave.
      expect(
        r.warnings.some(
          (x) =>
            /Per[íi]odo/.test(x) &&
            /declarado/.test(x) &&
            /somado/.test(x),
        ),
      ).toBe(true);
    });
  });

  describe("documento sem totalizador → consistencia vazio (sem flag)", () => {
    const ocr = `
PERÍODO: 16/06/2014 A 20/06/2014
16/06/2014 SEG 162 N 09:00 12:00 13:00 18:00
17/06/2014 TER 162 N 09:00 12:00 13:00 18:00
`.trim();

    const r = parseCartaoPonto(ocr);

    it("consistencia é array vazio", () => {
      expect(r.consistencia).toEqual([]);
    });

    it("nenhuma apuração marcada REVISAR_OCR_TOTAL", () => {
      const total = r.apuracoes.filter((a) =>
        a.observacao?.includes("REVISAR_OCR_TOTAL"),
      );
      expect(total).toHaveLength(0);
    });
  });

  describe("múltiplos períodos (cartão de várias páginas)", () => {
    const ocr = `
PERÍODO: 16/05/2014 A 31/05/2014
16/05/2014 SEG 162 N 09:00 12:00 13:00 18:00
17/05/2014 TER 162 N 09:00 12:00 13:00 18:00
Movimentos: (Período de 16/05/2014 a 31/05/2014)
9000 Horas Normais 16:00

PERÍODO: 16/06/2014 A 30/06/2014
16/06/2014 SEG 162 N 09:00 12:00 13:00 18:00
Movimentos: (Período de 16/06/2014 a 30/06/2014)
9000 Horas Normais 80:00
`.trim();

    const r = parseCartaoPonto(ocr);

    it("detecta 2 períodos com totalizadores", () => {
      expect(r.consistencia).toHaveLength(2);
    });

    it("período 1 (16-31 mai) bate (16:00 declarado vs 16:00 somado)", () => {
      const c = r.consistencia.find((c) => c.range.ini === "2014-05-16");
      expect(c?.status).toBe("ok");
    });

    it("período 2 (16-30 jun) diverge (80:00 declarado vs 8:00 somado)", () => {
      const c = r.consistencia.find((c) => c.range.ini === "2014-06-16");
      expect(c?.status).toBe("divergente");
    });
  });

  describe("tolerância de 30 minutos para arredondamentos legítimos", () => {
    // Declarado: 40:25, somado real: 40:00. Diff: 25min → dentro da tolerância.
    const ocr = `
PERÍODO: 16/06/2014 A 20/06/2014
16/06/2014 SEG 162 N 09:00 12:00 13:00 18:00
17/06/2014 TER 162 N 09:00 12:00 13:00 18:00
18/06/2014 QUA 162 N 09:00 12:00 13:00 18:00
19/06/2014 QUI 162 N 09:00 12:00 13:00 18:00
20/06/2014 SEX 162 N 09:00 12:00 13:00 18:00
Movimentos: (Período de 16/06/2014 a 20/06/2014)
9000 Horas Normais 40:25
`.trim();

    const r = parseCartaoPonto(ocr);

    it("status=ok mesmo com 25min de diff (dentro da tolerância)", () => {
      expect(r.consistencia[0].status).toBe("ok");
      expect(r.consistencia[0].diff_min).toBe(25);
    });
  });
});
