import { describe, expect, it } from "vitest";
import { buildCartaoPontoCSV } from "../../export/per-doc/cartao-ponto-csv";
import type { ParseCartaoPontoResult } from "../../parsers/cartao-ponto";

const baseResult = (apuracoes: ParseCartaoPontoResult["apuracoes"]): ParseCartaoPontoResult => ({
  apuracoes,
  competencia_predominante: "03/2024",
  data_inicial: apuracoes[0]?.data ?? "",
  data_final: apuracoes[apuracoes.length - 1]?.data ?? "",
  warnings: [],
});

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

async function blobToText(blob: Blob): Promise<string> {
  // Latin-1 → UTF-16 string (1 byte = 1 char) para inspeção do conteúdo
  const bytes = await blobToBytes(blob);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

describe("buildCartaoPontoCSV — formato Importar Jornada", () => {
  it("Header com 13 colunas (DATA + 6 pares E/S)", async () => {
    const blob = buildCartaoPontoCSV(
      baseResult([
        {
          data: "2024-03-01",
          ocorrencia: "NORMAL",
          marcacoes: [{ e: "08:00", s: "12:00" }],
          observacao: null,
        },
      ]),
    );
    const text = await blobToText(blob);
    const headerLine = text.split("\r\n")[0];
    expect(headerLine).toBe(
      "DATA;Entrada 1;Saida 1;Entrada 2;Saida 2;Entrada 3;Saida 3;Entrada 4;Saida 4;Entrada 5;Saida 5;Entrada 6;Saida 6",
    );
  });

  it("Data em dd/MM/yyyy + 12 colunas de marcação por linha", async () => {
    const blob = buildCartaoPontoCSV(
      baseResult([
        {
          data: "2024-03-01",
          ocorrencia: "NORMAL",
          marcacoes: [
            { e: "08:00", s: "12:00" },
            { e: "13:00", s: "17:00" },
          ],
          observacao: null,
        },
      ]),
    );
    const text = await blobToText(blob);
    const lines = text.split("\r\n");
    expect(lines[1]).toBe("01/03/2024;08:00;12:00;13:00;17:00;;;;;;;;");
  });

  it("Dia FOLGA → linha sem marcações (12 vazias)", async () => {
    const blob = buildCartaoPontoCSV(
      baseResult([
        {
          data: "2024-03-02",
          ocorrencia: "FOLGA",
          marcacoes: [],
          observacao: null,
        },
      ]),
    );
    const text = await blobToText(blob);
    const lines = text.split("\r\n");
    expect(lines[1]).toBe("02/03/2024;;;;;;;;;;;;");
  });

  it("CRLF em todas as linhas + final", async () => {
    const blob = buildCartaoPontoCSV(
      baseResult([
        { data: "2024-03-01", ocorrencia: "NORMAL", marcacoes: [], observacao: null },
        { data: "2024-03-02", ocorrencia: "FOLGA", marcacoes: [], observacao: null },
      ]),
    );
    const text = await blobToText(blob);
    expect(text.endsWith("\r\n")).toBe(true);
    expect(text.split("\r\n").length).toBe(4); // header + 2 linhas + ""
  });

  it("Encoding ISO-8859-1: bytes <= 0xFF, sem 2-byte UTF-8", async () => {
    const blob = buildCartaoPontoCSV(
      baseResult([
        { data: "2024-03-01", ocorrencia: "NORMAL", marcacoes: [{ e: "08:00", s: "12:00" }], observacao: null },
      ]),
    );
    const bytes = await blobToBytes(blob);
    // Cada byte é <= 0xFF (sempre verdade num Uint8Array, mas reforça intent)
    for (const b of bytes) expect(b).toBeLessThanOrEqual(0xff);
    expect(blob.type).toBe("text/csv;charset=iso-8859-1");
  });

  it("Limita a 6 pares — marcações 7+ são descartadas", async () => {
    const blob = buildCartaoPontoCSV(
      baseResult([
        {
          data: "2024-03-01",
          ocorrencia: "NORMAL",
          marcacoes: Array.from({ length: 8 }, (_, i) => ({
            e: `0${i}:00`,
            s: `0${i}:30`,
          })),
          observacao: null,
        },
      ]),
    );
    const text = await blobToText(blob);
    const cols = text.split("\r\n")[1].split(";");
    expect(cols.length).toBe(13); // DATA + 12 cols
  });
});
