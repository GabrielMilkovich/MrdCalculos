/**
 * FASE 1.3 — Bug #3 do prompt: parser inventava batidas a partir de
 * totalizadores HT/HE inline ("08:30 - HT, 00:30 - HE") em layouts
 * Senior/ADP/Totvs onde o totalizador é colocado na MESMA linha das
 * batidas, separado só por colunas (não por palavra-chave clara).
 *
 * Aceitação:
 *   - Linha "01/03/2024 08:00 12:00 13:00 17:30 08:30 00:30":
 *       → 2 marcações: {08:00, 12:00} e {13:00, 17:30}
 *       → 08:30 e 00:30 NÃO viram batida (são HT e HE totalizadores)
 */
import { describe, expect, it } from "vitest";
import { parseCartaoPontoGenerico } from "../layouts/generico-v1";

describe("FASE 1.3 — batidas fantasma (HT/HE inline)", () => {
  it("linha com HT/HE explícitos no header → só 2 marcações", () => {
    const INPUT = `
Data        E1    S1    E2    S2    HT      HE
01/03/2024  08:00 12:00 13:00 17:30 08:30   00:30
`;
    const r = parseCartaoPontoGenerico(INPUT);
    expect(r.apuracoes).toHaveLength(1);
    const ap = r.apuracoes[0];
    // Esperado: 2 pares (manhã + tarde). NÃO 3 com par fantasma.
    expect(ap.marcacoes).toHaveLength(2);
    expect(ap.marcacoes[0]).toMatchObject({ e: "08:00", s: "12:00" });
    expect(ap.marcacoes[1]).toMatchObject({ e: "13:00", s: "17:30" });
  });

  it("linha com >12 tokens HH:MM válidos → trunca em 6 pares + warning", () => {
    // OCR ruim sem palavra-chave: 6 pares legais + 1 totalizador (13 tokens).
    // O limite estrutural de 12 tokens descarta o 13º em diante e emite
    // warning. NOTA: o prompt da auditoria pediu teto 8, mas isso quebrava
    // regressões reais de 6 pares legais. O teto absoluto é 12 (PJe-Calc
    // limit); a primeira camada de defesa real é o split por marcadores
    // HT/HE/BH/RSR ampliados (teste #1 acima).
    const INPUT = `
Data Dia Horário
01/03/2024 Seg 06:00 07:00 08:00 09:00 10:00 11:00 12:00 13:00 14:00 15:00 16:00 17:00 18:00
`;
    const r = parseCartaoPontoGenerico(INPUT);
    // Deve ter capturado no máximo 6 pares (12 tokens).
    expect(r.apuracoes[0].marcacoes.length).toBeLessThanOrEqual(6);
    expect(r.warnings.some((w) => /tokens HH:MM/.test(w) || /limite/.test(w))).toBe(true);
  });

  it("layout limpo sem totalizador inline → continua funcionando", () => {
    const INPUT = `
Data        E1    S1    E2    S2
01/03/2024  08:00 12:00 13:00 17:30
02/03/2024  08:00 12:00 13:00 17:30
`;
    const r = parseCartaoPontoGenerico(INPUT);
    expect(r.apuracoes).toHaveLength(2);
    expect(r.apuracoes[0].marcacoes).toHaveLength(2);
    expect(r.apuracoes[0].marcacoes[0]).toMatchObject({ e: "08:00", s: "12:00" });
  });

  it("par com saída < entrada → marca REVISAR_OCR (não descarta — filosofia projeto)", () => {
    // Cenário ambíguo "08:30 → 00:30": pode ser HT/HE colado (descartar) ou
    // jornada noturna cruzando meia-noite (legítima). Filosofia do projeto
    // (cartao-ponto-fase1-marcar-nao-descartar.test.ts) é MARCAR como
    // REVISAR_OCR e deixar operador decidir, NUNCA descartar silenciosamente.
    const INPUT = `
Data        Hora
01/03/2024  08:30 00:30
`;
    const r = parseCartaoPontoGenerico(INPUT);
    expect(r.apuracoes[0]?.marcacoes ?? []).toHaveLength(1);
    expect(r.apuracoes[0]?.observacao ?? "").toMatch(/REVISAR_OCR/);
    expect(r.apuracoes[0]?.observacao ?? "").toMatch(/cronologia/i);
  });
});
