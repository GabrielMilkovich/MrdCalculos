/**
 * Testes do dispatcher de cartão de ponto — bug ROSICLEIA (Casas Bahia
 * 2021+ era roteado erradamente para parser Via Varejo 2011-2016 e devolvia
 * silenciosamente 0 apurações).
 *
 * Após o fix v5.1:
 *   - detectarLayoutViaVarejo exige formato "Período DD.MM.YYYY A DD.MM.YYYY"
 *     (com pontos + 'A' maiúsculo) como sinal MANDATÓRIO.
 *   - dispatcher só aceita confiança 'alta' do detector específico.
 *   - sentinela em ambos parsers loga warning quando extraem 0 apurações
 *     de OCR não-trivial.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  detectarLayout,
  parseCartaoPonto,
} from "../../../parsers/cartao-ponto";
import { detectarLayoutViaVarejo } from "../../../parsers/cartao-ponto/layouts/via-varejo-v1";

const FIXTURES = join(__dirname, "..", "..", "_fixtures", "cartao-ponto");

describe("Roteamento — Bug Rosicleia (Casas Bahia 2021+ ia para Via Varejo)", () => {
  it("Rosicleia (Casas Bahia novo) é roteado para parser GENÉRICO", () => {
    const ocr = readFileSync(join(FIXTURES, "rosicleia", "ocr.txt"), "utf-8");
    const layout = detectarLayout(ocr);
    expect(layout.layout).toBe("generico_v1");
  });

  it("Rosicleia produz >=180 apurações via dispatcher (regressão)", () => {
    const ocr = readFileSync(join(FIXTURES, "rosicleia", "ocr.txt"), "utf-8");
    const result = parseCartaoPonto(ocr);
    expect(result.apuracoes.length).toBeGreaterThanOrEqual(180);
  });

  it("Joseli (Via Varejo 2011-2016) continua roteado para via_varejo_v1", () => {
    const ocr = readFileSync(
      join(FIXTURES, "joseli-via-varejo-2011-2016", "ocr.txt"),
      "utf-8",
    );
    const layout = detectarLayout(ocr);
    expect(layout.layout).toBe("via_varejo_v1");
    expect(layout.confianca).toBe("alta");
  });

  it("OCR com 'VIA VAREJO' isolado em footer NÃO é classificado como Via Varejo", () => {
    const ocr = `
      ESPELHO DE PONTO
      Período 16/06/2021 a 15/07/2021
      | 16/06/2021 - Qua | 08:00 12:00 13:00 17:00 | | OK |

      ----- rodapé fiscal -----
      Documento gerado por VIA VAREJO S.A.
    `;
    const det = detectarLayoutViaVarejo(ocr);
    expect(det.layout).toBe("generico_v1");
  });

  it("OCR com CGC 33.041.260 mas sem formato Período antigo → genérico", () => {
    const ocr = `
      GRUPO CASAS BAHIA S.A.
      CNPJ: 33.041.260/0501-88
      ESPELHO DE PONTO
      Período 16/06/2021 a 15/07/2021
    `;
    const det = detectarLayoutViaVarejo(ocr);
    expect(det.layout).toBe("generico_v1");
  });

  it("Sentinela: parser Via Varejo invocado em OCR sem sinais emite warning", () => {
    const ocrFalso = "a".repeat(500); // OCR não-vazio mas sem nenhum padrão
    const result = parseCartaoPonto(ocrFalso, {
      layoutForcado: "via_varejo_v1",
    });
    expect(result.apuracoes.length).toBe(0);
    expect(result.warnings.some((w) => w.includes("Parser Via Varejo"))).toBe(
      true,
    );
  });
});
