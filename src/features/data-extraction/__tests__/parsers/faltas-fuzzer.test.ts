/**
 * Fuzzer determinístico do parser Faltas.
 */
import { describe, expect, it } from "vitest";
import { Rng, ddmmyyyy } from "../_fuzzer";
import { parseFaltas } from "../../parsers/faltas";
import { buildFaltasCSVBlob } from "../../export/per-doc/faltas-csv";

const N_CASOS_POR_SEED = 100;
const SEEDS = [1, 42, 1337];
const JUSTIFICATIVAS = [
  "atestado médico",
  "consulta",
  "licença gestante",
  "doação de sangue",
  "injustificada",
  "abono",
  "",
];

function gerarLinhaFalta(rng: Rng): string {
  const data = ddmmyyyy(rng);
  const tipo = rng.pick(["falta", "ausência", "atestado", "afastamento"]);
  const just = rng.pick(JUSTIFICATIVAS);
  const reinicia = rng.bool(0.1) ? " reinicia o período aquisitivo" : "";
  return `${tipo} ${data} ${just}${reinicia}`;
}

function gerarOcrSintetico(rng: Rng): string {
  const numLinhas = rng.int(1, 30);
  const linhas: string[] = [];
  for (let i = 0; i < numLinhas; i++) linhas.push(gerarLinhaFalta(rng));
  return linhas.join("\n");
}

async function csvFromOcr(ocr: string): Promise<string> {
  const parsed = parseFaltas(ocr);
  const blob = buildFaltasCSVBlob(parsed);
  return await blob.text();
}

describe("Faltas — fuzzer determinístico", () => {
  for (const seed of SEEDS) {
    describe(`seed=${seed}`, () => {
      it("nenhum input crasha", async () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const ocr = gerarOcrSintetico(rng);
          await expect(csvFromOcr(ocr)).resolves.toBeTypeOf("string");
        }
      });

      it("CSV header + CRLF + 5 colunas", async () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const ocr = gerarOcrSintetico(rng);
          const csv = await csvFromOcr(ocr);
          expect(csv.startsWith('"INICIO";"FIM"'), `seed=${seed}, caso=${i}`).toBe(true);
          expect(csv.endsWith("\r\n"), `seed=${seed}, caso=${i}`).toBe(true);
          for (const linha of csv.split("\r\n")) {
            if (!linha) continue;
            expect(linha.split(";").length, `seed=${seed}, caso=${i}, "${linha}"`).toBe(5);
          }
        }
      });

      it("data_inicio ≤ data_fim em toda linha", async () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const ocr = gerarOcrSintetico(rng);
          const csv = await csvFromOcr(ocr);
          for (const linha of csv.split("\r\n").slice(1)) {
            if (!linha) continue;
            const cols = linha.split(";");
            const ini = cols[0].replace(/"/g, "");
            const fim = cols[1].replace(/"/g, "");
            if (!ini || !fim) continue;
            // dd/MM/yyyy → comparável como yyyy-MM-dd
            const iniIso = ini.split("/").reverse().join("-");
            const fimIso = fim.split("/").reverse().join("-");
            expect(
              iniIso <= fimIso,
              `seed=${seed}, caso=${i}: ${ini} > ${fim}`,
            ).toBe(true);
          }
        }
      });

      it("justificativa ≤ 200 chars + booleanos S/N", async () => {
        const rng = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const ocr = gerarOcrSintetico(rng);
          const csv = await csvFromOcr(ocr);
          for (const linha of csv.split("\r\n").slice(1)) {
            if (!linha) continue;
            const cols = linha.split(";");
            for (const idx of [2, 3]) {
              const v = cols[idx].replace(/"/g, "");
              expect(v === "S" || v === "N", `seed=${seed} col[${idx}]="${cols[idx]}"`).toBe(true);
            }
            const just = cols[4].replace(/^"|"$/g, "");
            expect(just.length, `seed=${seed}: justificativa ${just.length} chars`).toBeLessThanOrEqual(200);
          }
        }
      });
    });
  }
});
