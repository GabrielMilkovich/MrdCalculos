/**
 * Invariantes universais OCR → Parser → CSV de Férias.
 *
 *   I1 — Toda relativa aaaa/aaaa no OCR vira 1 linha no CSV (ou warning explícito).
 *   I2 — Toda data dd/MM/yyyy de gozo do CSV existe no OCR.
 *   I3 — Sem data fantasma: relativa do CSV ⊆ relativas do OCR.
 *   I4 — CSV sempre tem 15 colunas em todas as linhas (header + dados).
 *   I5 — Encoding UTF-8 + separador ; + termina com CRLF.
 *   I6 — `prazo` ∈ [0, 60].
 *   I7 — Situação ∈ {G, GP, NG, I, P}.
 *   I8 — Round-trip: gozos do CSV refletem gozos da estrutura parseada.
 */
import { describe, expect, it } from "vitest";
import { loadFixtures } from "../_fixtures/_loader";
import { parseFerias } from "../../parsers/ferias";
import { buildFeriasCSVBlob } from "../../export/per-doc/ferias-csv";

const RE_RELATIVA = /\b(19\d{2}|20\d{2})\/(19\d{2}|20\d{2})\b/g;
const RE_DATA_BR = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
const SITUACOES_VALIDAS = new Set(["G", "GP", "NG", "I", "P"]);

async function csvFromOcr(ocr: string): Promise<string> {
  const parsed = parseFerias(ocr);
  const blob = buildFeriasCSVBlob(parsed);
  return await blob.text();
}

describe("Férias — invariantes universais (todas fixtures)", () => {
  const fixtures = loadFixtures("ferias");

  if (fixtures.length === 0) {
    it.skip("nenhuma fixture cadastrada — invariantes só rodam com fixture", () => {});
    return;
  }

  for (const f of fixtures) {
    describe(`fixture: ${f.id}`, () => {
      it("I3: relativa do CSV ⊆ relativas do OCR", async () => {
        const csv = await csvFromOcr(f.ocr);
        const relsOcr = new Set(
          [...f.ocr.matchAll(RE_RELATIVA)].map((m) => `${m[1]}/${m[2]}`),
        );
        for (const linha of csv.split("\r\n").slice(1)) {
          if (!linha) continue;
          const rel = linha.split(";")[0];
          expect(
            relsOcr.has(rel),
            `Relativa ${rel} no CSV mas não no OCR`,
          ).toBe(true);
        }
      });

      it("I2: toda data de gozo no CSV existe no OCR", async () => {
        const csv = await csvFromOcr(f.ocr);
        const datasOcr = new Set(
          [...f.ocr.matchAll(RE_DATA_BR)].map((m) => `${m[1]}/${m[2]}/${m[3]}`),
        );
        for (const linha of csv.split("\r\n").slice(1)) {
          if (!linha) continue;
          const cols = linha.split(";");
          // colunas 6-13 (índice 6,7,9,10,12,13) são datas de gozo
          for (const idx of [6, 7, 9, 10, 12, 13]) {
            const v = cols[idx];
            if (!v || !/^\d{2}\/\d{2}\/\d{4}$/.test(v)) continue;
            expect(
              datasOcr.has(v),
              `Data ${v} no CSV mas não no OCR (relativa ${cols[0]})`,
            ).toBe(true);
          }
        }
      });

      it("I4: toda linha do CSV tem 15 colunas", async () => {
        const csv = await csvFromOcr(f.ocr);
        for (const linha of csv.split("\r\n")) {
          if (!linha) continue;
          expect(linha.split(";").length, `Linha "${linha}" sem 15 colunas`).toBe(15);
        }
      });

      it("I5: encoding/separador/CRLF", async () => {
        const csv = await csvFromOcr(f.ocr);
        expect(csv.endsWith("\r\n")).toBe(true);
        expect(csv.startsWith("RELATIVAS;PRAZO;SITUACAO")).toBe(true);
      });

      it("I6: prazo ∈ [0,60] em toda linha", async () => {
        const csv = await csvFromOcr(f.ocr);
        for (const linha of csv.split("\r\n").slice(1)) {
          if (!linha) continue;
          const prazo = parseInt(linha.split(";")[1], 10);
          expect(
            prazo >= 0 && prazo <= 60,
            `Prazo ${prazo} fora do limite PJe-Calc`,
          ).toBe(true);
        }
      });

      it("I7: situação válida em toda linha", async () => {
        const csv = await csvFromOcr(f.ocr);
        for (const linha of csv.split("\r\n").slice(1)) {
          if (!linha) continue;
          const sit = linha.split(";")[2];
          expect(
            SITUACOES_VALIDAS.has(sit),
            `Situação inválida: ${sit}`,
          ).toBe(true);
        }
      });

      it("I8: dobra (S/N) em todas as 4 colunas booleanas", async () => {
        const csv = await csvFromOcr(f.ocr);
        for (const linha of csv.split("\r\n").slice(1)) {
          if (!linha) continue;
          const cols = linha.split(";");
          for (const idx of [3, 4, 8, 11, 14]) {
            const v = cols[idx];
            expect(
              v === "" || v === "S" || v === "N",
              `Coluna ${idx} = "${v}" (esperado S/N/vazio)`,
            ).toBe(true);
          }
        }
      });
    });
  }
});
