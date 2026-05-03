/**
 * Fuzzer determinístico do parser Férias.
 *
 * Gera N OCRs sintéticos por seed e valida invariantes do CSV.
 */
import { describe, expect, it } from "vitest";
import { Rng, ddmmyyyy, pad2 } from "../_fuzzer";
import { parseFerias } from "../../parsers/ferias";
import { buildFeriasCSVBlob } from "../../export/per-doc/ferias-csv";

const N_CASOS_POR_SEED = 100;
const SEEDS = [1, 42, 1337, 8675309];
const SITUACOES_VALIDAS = new Set(["G", "GP", "NG", "I", "P"]);

interface BlocoSintetico {
  relativa: string;
  prazo: number;
  numGozos: number; // 0..3
  emDobra: boolean;
  abono: boolean;
  diasAbono: number;
  situacao: "G" | "GP" | "NG" | "I" | "P";
}

function gerarBloco(rng: Rng): BlocoSintetico {
  const ano = 2000 + rng.int(0, 25);
  const relativa = `${ano}/${ano + 1}`;
  return {
    relativa,
    prazo: rng.int(0, 90), // de propósito, pode passar de 60 (parser cap)
    numGozos: rng.int(0, 4),
    emDobra: rng.bool(0.2),
    abono: rng.bool(0.3),
    diasAbono: rng.int(0, 11),
    situacao: rng.pick(["G", "GP", "NG", "I", "P"] as const),
  };
}

function gerarOcrSintetico(rng: Rng): string {
  const numBlocos = rng.int(1, 5);
  const linhas: string[] = [];
  for (let i = 0; i < numBlocos; i++) {
    const b = gerarBloco(rng);
    linhas.push(`RECIBO DE FÉRIAS — Período ${i + 1}`);
    linhas.push(`Relativa: ${b.relativa}`);
    linhas.push(`${b.prazo} dias de férias`);
    if (b.emDobra) linhas.push("Período em dobra");
    if (b.abono) linhas.push(`Abono pecuniário: ${b.diasAbono} dias`);
    for (let g = 0; g < b.numGozos; g++) {
      linhas.push(`Período de gozo: ${ddmmyyyy(rng)} a ${ddmmyyyy(rng)}`);
    }
    if (b.situacao === "I") linhas.push("Indenizadas");
    else if (b.situacao === "NG") linhas.push("Não gozadas");
    else if (b.situacao === "P") linhas.push("Perdidas");
    linhas.push("");
  }
  return linhas.join("\n");
}

async function csvFromOcr(ocr: string): Promise<string> {
  const parsed = parseFerias(ocr);
  const blob = buildFeriasCSVBlob(parsed);
  return await blob.text();
}

describe("Férias — fuzzer determinístico", () => {
  for (const seed of SEEDS) {
    describe(`seed=${seed} (${N_CASOS_POR_SEED} casos)`, () => {
      it("nenhum input crasha", async () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const ocr = gerarOcrSintetico(rng);
          await expect(csvFromOcr(ocr)).resolves.toBeTypeOf("string");
        }
      });

      it("CSV sempre tem 15 colunas, encoding válido, CRLF final", async () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const ocr = gerarOcrSintetico(rng);
          const csv = await csvFromOcr(ocr);
          expect(csv.startsWith("RELATIVAS;PRAZO;SITUACAO"), `seed=${seed}, caso=${i}`).toBe(true);
          expect(csv.endsWith("\r\n"), `seed=${seed}, caso=${i}`).toBe(true);
          for (const linha of csv.split("\r\n")) {
            if (!linha) continue;
            expect(linha.split(";").length, `seed=${seed}, caso=${i}, linha "${linha}"`).toBe(15);
          }
        }
      });

      it("prazo sempre ∈ [0,60] e situação sempre válida", async () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const ocr = gerarOcrSintetico(rng);
          const csv = await csvFromOcr(ocr);
          for (const linha of csv.split("\r\n").slice(1)) {
            if (!linha) continue;
            const cols = linha.split(";");
            const prazo = parseInt(cols[1], 10);
            expect(
              prazo >= 0 && prazo <= 60,
              `seed=${seed}, caso=${i}: prazo ${prazo}`,
            ).toBe(true);
            expect(
              SITUACOES_VALIDAS.has(cols[2]),
              `seed=${seed}, caso=${i}: situacao ${cols[2]}`,
            ).toBe(true);
          }
        }
      });

      it("booleanos S/N (ou vazio) em todas as colunas booleanas", async () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const ocr = gerarOcrSintetico(rng);
          const csv = await csvFromOcr(ocr);
          for (const linha of csv.split("\r\n").slice(1)) {
            if (!linha) continue;
            const cols = linha.split(";");
            for (const idx of [3, 4, 8, 11, 14]) {
              const v = cols[idx];
              expect(
                v === "" || v === "S" || v === "N",
                `seed=${seed}, caso=${i}: col[${idx}]="${v}"`,
              ).toBe(true);
            }
          }
        }
      });
    });
  }
});
