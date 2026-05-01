import { describe, expect, it } from "vitest";
import { buildCartaoPontoCSV } from "../../export/per-doc/cartao-ponto-csv";
import type { ParseCartaoPontoResult } from "../../parsers/cartao-ponto";

const baseResult = (
  apuracoes: ParseCartaoPontoResult["apuracoes"],
): ParseCartaoPontoResult => ({
  apuracoes,
  competencia_predominante: "03/2024",
  data_inicial: apuracoes[0]?.data ?? "",
  data_final: apuracoes[apuracoes.length - 1]?.data ?? "",
  warnings: [],
});

const CRLF = "\r\n";

describe("buildCartaoPontoCSV — formato Importar Jornada", () => {
  it("Header literal com 13 colunas (Data + 6 pares E/S, 'Saída' com acento)", async () => {
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
    const text = await blob.text();
    const headerLine = text.split(CRLF)[0];
    expect(headerLine).toBe(
      "Data;Entrada1;Saída1;Entrada2;Saída2;Entrada3;Saída3;Entrada4;Saída4;Entrada5;Saída5;Entrada6;Saída6",
    );
  });

  it("Data dd/MM/yyyy + 12 colunas de marcação por linha", async () => {
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
    const text = await blob.text();
    const lines = text.split(CRLF);
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
    const text = await blob.text();
    const lines = text.split(CRLF);
    expect(lines[1]).toBe("02/03/2024;;;;;;;;;;;;");
  });

  it("CRLF em todas as linhas + final", async () => {
    const blob = buildCartaoPontoCSV(
      baseResult([
        { data: "2024-03-01", ocorrencia: "NORMAL", marcacoes: [], observacao: null },
        { data: "2024-03-02", ocorrencia: "FOLGA", marcacoes: [], observacao: null },
      ]),
    );
    const text = await blob.text();
    expect(text.endsWith(CRLF)).toBe(true);
    expect(text.split(CRLF).length).toBe(4); // header + 2 linhas + ""
  });

  it("Encoding UTF-8 (modelo oficial é UTF-8)", async () => {
    const blob = buildCartaoPontoCSV(
      baseResult([
        { data: "2024-03-01", ocorrencia: "NORMAL", marcacoes: [{ e: "08:00", s: "12:00" }], observacao: null },
      ]),
    );
    expect(blob.type).toBe("text/csv;charset=utf-8");
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
    const text = await blob.text();
    const cols = text.split(CRLF)[1].split(";");
    expect(cols.length).toBe(13); // Data + 12 cols
  });
});
