/**
 * Invariantes universais OCR → Parser → CSV de Faltas.
 *
 *   I1 — Toda data do CSV existe no OCR.
 *   I2 — Toda linha do CSV tem 5 colunas.
 *   I3 — Booleanos sempre "S" ou "N" (com aspas).
 *   I4 — Datas sempre dd/MM/yyyy válida.
 *   I5 — Encoding UTF-8 + ; + CRLF final.
 *   I6 — Justificativa ≤ 200 chars (após sanitização).
 */
import { describe, expect, it } from "vitest";
import { loadFixtures } from "../_fixtures/_loader";
import { parseFaltas } from "../../parsers/faltas";
import { buildFaltasCSVBlob } from "../../export/per-doc/faltas-csv";

const RE_DATA_BR = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/g;

async function csvFromOcr(ocr: string): Promise<string> {
  const parsed = parseFaltas(ocr);
  const blob = buildFaltasCSVBlob(parsed);
  return await blob.text();
}

describe("Faltas — invariantes universais (todas fixtures)", () => {
  const fixtures = loadFixtures("faltas");

  if (fixtures.length === 0) {
    it.skip("nenhuma fixture cadastrada", () => {});
    return;
  }

  for (const f of fixtures) {
    describe(`fixture: ${f.id}`, () => {
      it("I1: datas do CSV ⊆ datas do OCR", async () => {
        const csv = await csvFromOcr(f.ocr);
        const datasOcr = new Set(
          [...f.ocr.matchAll(RE_DATA_BR)].map(
            (m) => `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`,
          ),
        );
        for (const linha of csv.split("\r\n").slice(1)) {
          if (!linha) continue;
          const cols = linha.split(";");
          for (const idx of [0, 1]) {
            const raw = cols[idx].replace(/"/g, "");
            if (!raw) continue;
            expect(
              datasOcr.has(raw),
              `Data ${raw} no CSV mas não no OCR`,
            ).toBe(true);
          }
        }
      });

      it("I2: 5 colunas em toda linha", async () => {
        const csv = await csvFromOcr(f.ocr);
        for (const linha of csv.split("\r\n")) {
          if (!linha) continue;
          expect(linha.split(";").length, `Linha "${linha}"`).toBe(5);
        }
      });

      it("I5: encoding/CRLF/header", async () => {
        const csv = await csvFromOcr(f.ocr);
        expect(csv.endsWith("\r\n")).toBe(true);
        expect(csv.startsWith('"INICIO";"FIM"')).toBe(true);
      });

      it("I3+I6: booleanos S/N e justificativa ≤ 200", async () => {
        const csv = await csvFromOcr(f.ocr);
        for (const linha of csv.split("\r\n").slice(1)) {
          if (!linha) continue;
          const cols = linha.split(";");
          for (const idx of [2, 3]) {
            const v = cols[idx].replace(/"/g, "");
            expect(v === "S" || v === "N", `col[${idx}]="${cols[idx]}"`).toBe(true);
          }
          const just = cols[4].replace(/^"|"$/g, "");
          expect(just.length, `Justificativa muito longa: ${just.length}`).toBeLessThanOrEqual(200);
        }
      });
    });
  }
});
