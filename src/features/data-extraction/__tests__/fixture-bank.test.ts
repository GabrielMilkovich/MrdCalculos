/**
 * Fixture Bank — testes byte-a-byte de fixtures reais por documento.
 *
 * Cada fixture com `expected.csv` é validada com `toBe()` (byte-a-byte).
 * Qualquer mudança não-intencional no CSV final dispara aqui — funciona
 * como rede de regressão automática para todos os bugs já reportados.
 *
 * Para adicionar fixtures novas: ver `_fixtures/_loader.ts`.
 */
import { describe, expect, it } from "vitest";
import { loadFixtures } from "./_fixtures/_loader";
import { parseCartaoPonto } from "../parsers/cartao-ponto";
import { buildCartaoPontoCSV } from "../export/per-doc/cartao-ponto-csv";
import { parseFerias } from "../parsers/ferias";
import { buildFeriasCSVBlob } from "../export/per-doc/ferias-csv";
import { parseFaltas } from "../parsers/faltas";
import { buildFaltasCSVBlob } from "../export/per-doc/faltas-csv";

async function blobToText(blob: Blob): Promise<string> {
  return await blob.text();
}

describe("Fixture Bank — Cartão-Ponto (byte-a-byte)", () => {
  const fixtures = loadFixtures("cartao-ponto");

  if (fixtures.length === 0) {
    it.skip("nenhuma fixture cadastrada", () => {});
    return;
  }

  for (const f of fixtures) {
    describe(f.id, () => {
      const parsed = parseCartaoPonto(f.ocr);

      it("parser não crasha e devolve apurações", () => {
        expect(parsed.apuracoes.length).toBeGreaterThan(0);
      });

      if (f.expectedCsv) {
        it("CSV gerado bate byte-a-byte com expected.csv", async () => {
          const blob = buildCartaoPontoCSV(parsed);
          const got = await blobToText(blob);
          expect(got).toBe(f.expectedCsv);
        });
      }
    });
  }
});

describe("Fixture Bank — Férias (byte-a-byte)", () => {
  const fixtures = loadFixtures("ferias");

  if (fixtures.length === 0) {
    it.skip("nenhuma fixture cadastrada", () => {});
    return;
  }

  for (const f of fixtures) {
    describe(f.id, () => {
      const parsed = parseFerias(f.ocr);

      it("parser não crasha", () => {
        expect(Array.isArray(parsed.ferias)).toBe(true);
      });

      if (f.expectedCsv) {
        it("CSV gerado bate byte-a-byte com expected.csv", async () => {
          const blob = buildFeriasCSVBlob(parsed);
          const got = await blobToText(blob);
          expect(got).toBe(f.expectedCsv);
        });
      }
    });
  }
});

describe("Fixture Bank — Faltas (byte-a-byte)", () => {
  const fixtures = loadFixtures("faltas");

  if (fixtures.length === 0) {
    it.skip("nenhuma fixture cadastrada", () => {});
    return;
  }

  for (const f of fixtures) {
    describe(f.id, () => {
      const parsed = parseFaltas(f.ocr);

      it("parser não crasha", () => {
        expect(Array.isArray(parsed.faltas)).toBe(true);
      });

      if (f.expectedCsv) {
        it("CSV gerado bate byte-a-byte com expected.csv", async () => {
          const blob = buildFaltasCSVBlob(parsed);
          const got = await blobToText(blob);
          expect(got).toBe(f.expectedCsv);
        });
      }
    });
  }
});
