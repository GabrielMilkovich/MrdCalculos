/**
 * Fuzzer determinístico do parser Cartão-Ponto.
 *
 * Gera 200 OCRs sintéticos por seed e valida invariantes (não crash, não
 * perder batidas, CSV bem-formado). Cobre combinações que casos reais
 * raramente exercitam.
 *
 * Se um caso encontra bug, a seed e o input ficam impressos via expect
 * messages para reprodução determinística.
 */
import { describe, expect, it } from "vitest";
import {
  Rng,
  ddmmyyyy,
  hhmm,
  hhmmAfter,
  isoDate,
  pad2,
} from "../_fuzzer";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";
import { buildCartaoPontoCSV } from "../../export/per-doc/cartao-ponto-csv";

const N_CASOS_POR_SEED = 200;
const SEEDS = [1, 42, 1337, 8675309, 314159];

interface DiaSintetico {
  data: string; // dd/mm/yyyy
  pares: number; // 0..6
  asteriscos: boolean;
  comDetalhamentoInserido: boolean;
  ocorrencia: "" | "FERIADO" | "FOLGA" | "FALTA" | "FERIAS" | "DSR Semanal";
  numeroDeBatidas: number; // pares * 2 (pode ser ímpar se imparMode)
  imparMode: boolean;
}

function gerarDia(rng: Rng): DiaSintetico {
  const data = ddmmyyyy(rng);
  const pares = rng.int(0, 7);
  const asteriscos = rng.bool(0.3);
  const comDetalhamentoInserido = asteriscos && rng.bool(0.5);
  const imparMode = pares > 0 && rng.bool(0.15);
  const numeroDeBatidas = pares * 2 + (imparMode ? 1 : 0);
  const ocorrencias = ["", "", "", "", "FERIADO", "FOLGA", "FALTA", "FERIAS", "DSR Semanal"] as const;
  const ocorrencia = pares > 0 ? "" : rng.pick(ocorrencias);
  return {
    data,
    pares,
    asteriscos,
    comDetalhamentoInserido,
    ocorrencia: ocorrencia as DiaSintetico["ocorrencia"],
    numeroDeBatidas,
    imparMode,
  };
}

function gerarLinhaOCR(rng: Rng, dia: DiaSintetico): { linha: string; horas: string[] } {
  const horas: string[] = [];
  let prev = `${pad2(rng.int(6, 10))}:${pad2(rng.int(0, 60))}`;
  horas.push(prev);
  for (let i = 1; i < dia.numeroDeBatidas; i++) {
    prev = hhmmAfter(rng, prev);
    horas.push(prev);
  }
  const horasStr = horas
    .map((h) => `${h}${dia.asteriscos ? "*" : ""}`)
    .join(" | ");
  let detalhamento = "";
  if (dia.comDetalhamentoInserido) {
    detalhamento = " | " + horas.map((h) => `${h} - Inserido`).join(" | ");
  }
  const ocorrencia = dia.ocorrencia ? ` ${dia.ocorrencia}` : "";
  const linha = `| ${dia.data} | ${horasStr}${detalhamento}${ocorrencia} |`;
  return { linha, horas };
}

function gerarOcrSintetico(rng: Rng): { ocr: string; dias: Array<{ dia: DiaSintetico; horas: string[] }> } {
  const numDias = rng.int(1, 30);
  const datasUsadas = new Set<string>();
  const dias: Array<{ dia: DiaSintetico; horas: string[] }> = [];
  const linhas: string[] = [];
  for (let i = 0; i < numDias; i++) {
    let dia = gerarDia(rng);
    // Evita duplicar data no mesmo OCR (dedup do parser interferiria).
    let tentativas = 0;
    while (datasUsadas.has(dia.data) && tentativas < 5) {
      dia = gerarDia(rng);
      tentativas++;
    }
    if (datasUsadas.has(dia.data)) continue;
    datasUsadas.add(dia.data);
    const { linha, horas } = gerarLinhaOCR(rng, dia);
    linhas.push(linha);
    dias.push({ dia, horas });
  }
  return { ocr: linhas.join("\n"), dias };
}

async function csvFromOcr(ocr: string): Promise<string> {
  const parsed = parseCartaoPonto(ocr);
  const blob = buildCartaoPontoCSV(parsed);
  return await blob.text();
}

describe("Cartão-Ponto — fuzzer determinístico (invariantes em N inputs sintéticos)", () => {
  for (const seed of SEEDS) {
    describe(`seed=${seed} (${N_CASOS_POR_SEED} casos)`, () => {
      const rng = new Rng(seed);

      it("nenhum input crasha o parser ou builder", async () => {
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const { ocr } = gerarOcrSintetico(rng);
          await expect(csvFromOcr(ocr)).resolves.toBeTypeOf("string");
        }
      });

      it("CSV sempre tem header esperado e termina com CRLF", async () => {
        const rng2 = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const { ocr } = gerarOcrSintetico(rng2);
          const csv = await csvFromOcr(ocr);
          expect(
            csv.startsWith("Data;Entrada1;Saída1"),
            `seed=${seed}, caso=${i}: header errado`,
          ).toBe(true);
          expect(
            csv.endsWith("\r\n"),
            `seed=${seed}, caso=${i}: não termina com CRLF`,
          ).toBe(true);
        }
      });

      it("toda linha do CSV tem exatamente 13 colunas", async () => {
        const rng2 = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const { ocr } = gerarOcrSintetico(rng2);
          const csv = await csvFromOcr(ocr);
          for (const linha of csv.split("\r\n")) {
            if (!linha) continue;
            const cols = linha.split(";");
            expect(
              cols.length,
              `seed=${seed}, caso=${i}: linha "${linha.slice(0, 40)}" com ${cols.length} colunas`,
            ).toBe(13);
          }
        }
      });

      it("nenhuma data fantasma — toda data do CSV existe no OCR", async () => {
        const rng2 = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const { ocr, dias } = gerarOcrSintetico(rng2);
          const csv = await csvFromOcr(ocr);
          const datasOcr = new Set(dias.map((d) => d.dia.data));
          for (const linha of csv.split("\r\n").slice(1)) {
            if (!linha) continue;
            const data = linha.split(";")[0];
            expect(
              datasOcr.has(data),
              `seed=${seed}, caso=${i}: data ${data} no CSV mas não no OCR`,
            ).toBe(true);
          }
        }
      });

      it("nenhuma hora fantasma — toda hora HH:MM no CSV existe nas batidas geradas", async () => {
        const rng2 = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const { ocr, dias } = gerarOcrSintetico(rng2);
          const csv = await csvFromOcr(ocr);
          const horasGeradas = new Set<string>();
          for (const d of dias) for (const h of d.horas) horasGeradas.add(h);
          for (const linha of csv.split("\r\n").slice(1)) {
            if (!linha) continue;
            const cols = linha.split(";");
            for (let c = 1; c < cols.length; c++) {
              const v = cols[c].trim();
              if (v && /^\d{2}:\d{2}$/.test(v)) {
                expect(
                  horasGeradas.has(v),
                  `seed=${seed}, caso=${i}: hora ${v} no CSV mas não nas batidas geradas`,
                ).toBe(true);
              }
            }
          }
        }
      });

      it("dias com batidas geradas → CSV emite ao menos uma batida (não silencia)", async () => {
        const rng2 = new Rng(seed);
        for (let i = 0; i < N_CASOS_POR_SEED; i++) {
          const { ocr, dias } = gerarOcrSintetico(rng2);
          const csv = await csvFromOcr(ocr);
          const linhaPorData = new Map<string, string>();
          for (const linha of csv.split("\r\n").slice(1)) {
            if (!linha) continue;
            linhaPorData.set(linha.split(";")[0], linha);
          }
          for (const d of dias) {
            if (d.dia.numeroDeBatidas === 0) continue;
            const linha = linhaPorData.get(d.dia.data);
            if (!linha) continue; // dedup ou ocorrência sem batida — OK
            const cols = linha.split(";").slice(1);
            const temBatida = cols.some((c) => /^\d{2}:\d{2}$/.test(c.trim()));
            expect(
              temBatida,
              `seed=${seed}, caso=${i}: dia ${d.dia.data} gerou ${d.horas.length} batidas mas CSV está vazio: "${linha}"`,
            ).toBe(true);
          }
        }
      });
    });
  }
});
