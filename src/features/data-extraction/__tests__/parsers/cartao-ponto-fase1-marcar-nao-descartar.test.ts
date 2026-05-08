/**
 * FASE 1 — testes da filosofia MARCAR-NÃO-DESCARTAR.
 *
 * Diferença fundamental do PR #61 (revertido): agora apurações suspeitas
 * NÃO são descartadas. Elas entram no resultado com `observacao =
 * "REVISAR_OCR: <motivo>"`. O CSV exporta com flag, UI mostra em destaque,
 * advogado decide manualmente. Zero erro silencioso.
 *
 * Testa contra patologias REAIS de cartões corporativos brasileiros:
 *   - data de admissão no header virando jornada falsa
 *   - eventos/totalizadores virando batidas
 *   - cronologia inválida (S2 < E2)
 *   - células markdown partidas em múltiplas linhas
 *
 * Cada teste verifica DUAS condições:
 *   1. A apuração foi extraída (não descartada).
 *   2. A apuração tem `observacao` começando com "REVISAR_OCR".
 */
import { describe, expect, it } from "vitest";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

describe("Cartão Ponto — Fase 1: MARCAR não DESCARTAR", () => {
  describe("admissão no header (24/11/2003) ainda extrai mas marca REVISAR", () => {
    const ocr = `
PERÍODO: 11/01/2016 A 15/02/2016 Competência: FECHABIRO/2016
Admiro: 24/11/2003 C.B.: 0003-000 - 102b AQ Rotação: 91 08:00 11:00 12:00 14:25
Data Dia Horário Registrado Horário de Trabalho
16/02/2016 TER 162 N 10:20 13:55 14:30 19:08 09:00 12:00 13:05 17:25 0:25
`.trim();

    const r = parseCartaoPonto(ocr);

    it("apuração 2003-11-24 EXISTE (não foi descartada silenciosamente)", () => {
      const a = r.apuracoes.find((a) => a.data === "2003-11-24");
      expect(a).toBeDefined();
    });

    it("apuração 2003-11-24 vem com observacao REVISAR_OCR", () => {
      const a = r.apuracoes.find((a) => a.data === "2003-11-24");
      expect(a?.observacao).toMatch(/REVISAR_OCR/);
      expect(a?.observacao).toMatch(/cabe[çc]alho|admiss|legenda/i);
    });

    it("apuração 2016-02-16 (real) NÃO tem flag REVISAR", () => {
      const a = r.apuracoes.find((a) => a.data === "2016-02-16");
      expect(a).toBeDefined();
      expect(a?.observacao).toBeNull();
    });
  });

  describe("linhas dentro de bloco 'Movimentos:' marcam REVISAR_OCR", () => {
    const ocr = `
PERÍODO: 14/05/2014 A 15/06/2014
14/05/2014 SEG 162 N 09:00 12:00 13:00 17:25
Movimentos: (Período de 14/05/2014 a 15/06/2014)
14/06/2014 TEX 162 N 11:11 13:00 14:53 19:04
9000 Horas Normais 100:40
`.trim();

    const r = parseCartaoPonto(ocr);

    it("apuração 14/05 (antes de Movimentos) NÃO tem flag de bloco_totalizadores", () => {
      const a = r.apuracoes.find((a) => a.data === "2014-05-14");
      expect(a).toBeDefined();
      // Não deve casar o motivo específico "dentro de bloco de totalizadores".
      // Pode ter flag de outro motivo (ex: REVISAR_OCR_TOTAL da Fase 2).
      expect(a?.observacao ?? "").not.toMatch(/dentro de bloco de totalizadores/i);
    });

    it("apuração 14/06 (dentro de Movimentos) tem flag REVISAR_OCR", () => {
      const a = r.apuracoes.find((a) => a.data === "2014-06-14");
      expect(a).toBeDefined();
      expect(a?.observacao).toMatch(/REVISAR_OCR.*totalizadores/i);
    });
  });

  describe("cronologia inválida (E2=22:09 > S2=05:53) marca REVISAR_OCR", () => {
    const ocr = `
PERÍODO: 14/07/2014 A 15/08/2014
14/07/2014 SEG 162 N 05:56 05:57 22:09 05:53
15/07/2014 TER 162 N 09:00 12:00 13:00 17:25
`.trim();

    const r = parseCartaoPonto(ocr);

    it("apuração com cronologia inválida ainda EXISTE", () => {
      const a = r.apuracoes.find((a) => a.data === "2014-07-14");
      expect(a).toBeDefined();
    });

    it("apuração com cronologia inválida tem flag detalhada", () => {
      const a = r.apuracoes.find((a) => a.data === "2014-07-14");
      expect(a?.observacao).toMatch(/REVISAR_OCR/);
      expect(a?.observacao).toMatch(/cronologia/i);
      expect(a?.observacao).toMatch(/05:53/);
    });

    it("apuração com cronologia válida NÃO tem flag", () => {
      const a = r.apuracoes.find((a) => a.data === "2014-07-15");
      expect(a?.observacao).toBeNull();
    });
  });

  describe("célula markdown partida (Admiro: numa linha, data na outra)", () => {
    const ocr = `
PERÍODO: 11/01/2016 A 15/02/2016
Admiro:
24/11/2003 C.B.: 0003-000 91 08:00 11:00 12:00 14:25
16/02/2016 TER 162 N 10:20 13:55 14:30 19:08
`.trim();

    const r = parseCartaoPonto(ocr);

    it("apuração 24/11/2003 (após Admiro:) tem flag REVISAR_OCR", () => {
      const a = r.apuracoes.find((a) => a.data === "2003-11-24");
      expect(a).toBeDefined();
      expect(a?.observacao).toMatch(/REVISAR_OCR/);
    });

    it("apuração legítima 16/02 (>2 linhas após header) NÃO tem flag", () => {
      const a = r.apuracoes.find((a) => a.data === "2016-02-16");
      expect(a).toBeDefined();
      expect(a?.observacao).toBeNull();
    });
  });

  describe("regression guard: nada é descartado SILENCIOSAMENTE", () => {
    // Todas as patologias juntas em um documento.
    const ocr = `
PERÍODO: 11/01/2016 A 15/02/2016 Competência: MARCO/2016
Admiro: 24/11/2003 C.B.: 0003-000 91 08:00 11:00 12:00 14:25
Horários: 91 08:00 11:00 12:00 14:25 162 09:00 12:00 13:00 17:25
16/02/2016 TER 162 N 10:20 13:55 14:30 19:08
17/02/2016 QUA 162 N 14:30 15:37 15:40 15:45
18/02/2016 QUI 162 N 09:10 12:01 13:21 18:31
Movimentos: (Período de 16/02/2016 a 15/03/2016)
3990 Adicional Sabado 25% 17:49
9000 Horas Normais 183:20
Estou de pleno acordo
`.trim();

    const r = parseCartaoPonto(ocr);

    it("apurações reais (16-18 fev) ainda existem", () => {
      const datasReais = ["2016-02-16", "2016-02-17", "2016-02-18"];
      for (const d of datasReais) {
        const a = r.apuracoes.find((a) => a.data === d);
        expect(a, `dia ${d} sumiu`).toBeDefined();
      }
    });

    it("data fantasma 24/11/2003 ainda existe (mas com flag)", () => {
      const a = r.apuracoes.find((a) => a.data.startsWith("2003"));
      expect(a).toBeDefined();
      expect(a?.observacao).toMatch(/REVISAR_OCR/);
    });

    it("conta de apurações: pelo menos 1 com flag (não descartada silenciosamente)", () => {
      const comFlag = r.apuracoes.filter((a) => a.observacao);
      // Filosofia central: NADA é descartado. Se há suspeita, é flaggada.
      expect(comFlag.length).toBeGreaterThanOrEqual(1);
      // E o total de apurações inclui reais E suspeitas.
      expect(r.apuracoes.length).toBeGreaterThanOrEqual(comFlag.length);
    });
  });
});
