/**
 * Tests para parseCsvToApuracoes — usado no ImportarJornadaDialog.
 * (Função pura, exportada do dialog pra facilitar teste sem mount React.)
 */
import { describe, expect, it } from "vitest";
import { parseCsvToApuracoes } from "../parse-csv-apuracoes";

describe("parseCsvToApuracoes", () => {
  it("CSV vazio retorna []", () => {
    expect(parseCsvToApuracoes("")).toEqual([]);
    expect(parseCsvToApuracoes("\n\n")).toEqual([]);
  });

  it("Pula header se primeira coluna for 'data'", () => {
    const csv = `data;ocorrencia;e1;s1;e2;s2;e3;s3;observacao
2024-03-01;NORMAL;08:00;12:00;13:00;17:00;;;
`;
    const r = parseCsvToApuracoes(csv);
    expect(r.length).toBe(1);
    expect(r[0].data).toBe("2024-03-01");
    expect(r[0].ocorrencia).toBe("NORMAL");
    expect(r[0].marcacoes).toEqual([
      { e: "08:00", s: "12:00" },
      { e: "13:00", s: "17:00" },
    ]);
  });

  it("Sem header também funciona", () => {
    const csv = "2024-03-01;FOLGA;;;;;;\n";
    const r = parseCsvToApuracoes(csv);
    expect(r.length).toBe(1);
    expect(r[0].ocorrencia).toBe("FOLGA");
    expect(r[0].marcacoes).toEqual([]);
  });

  it("Ocorrência inválida cai pra NORMAL", () => {
    const r = parseCsvToApuracoes("2024-03-01;CABULOSO;08:00;12:00;;;;;");
    expect(r[0].ocorrencia).toBe("NORMAL");
  });

  it("Aceita até 3 pares e/s", () => {
    const r = parseCsvToApuracoes(
      "2024-03-01;NORMAL;06:00;10:00;11:00;14:00;15:00;19:00;",
    );
    expect(r[0].marcacoes.length).toBe(3);
    expect(r[0].marcacoes[2]).toEqual({ e: "15:00", s: "19:00" });
  });

  it("Observação opcional", () => {
    const r = parseCsvToApuracoes("2024-03-01;FALTA;;;;;;;injustificada");
    expect(r[0].observacao).toBe("injustificada");
  });

  it("Data inválida lança erro com número da linha", () => {
    expect(() =>
      parseCsvToApuracoes("01/03/2024;NORMAL;08:00;12:00;;;;;"),
    ).toThrow(/Linha 1.*data inválida/);
  });

  it("Múltiplas linhas, ordem preservada", () => {
    const csv = `2024-03-01;NORMAL;08:00;12:00;;;;;
2024-03-02;FOLGA;;;;;;
2024-03-03;ATESTADO;;;;;;;atestado médico`;
    const r = parseCsvToApuracoes(csv);
    expect(r.length).toBe(3);
    expect(r.map((a) => a.data)).toEqual([
      "2024-03-01",
      "2024-03-02",
      "2024-03-03",
    ]);
    expect(r[2].observacao).toBe("atestado médico");
  });

  it("Linhas vazias ignoradas", () => {
    const csv = `

2024-03-01;NORMAL;08:00;12:00;;;;;

2024-03-02;FOLGA;;;;;;
`;
    const r = parseCsvToApuracoes(csv);
    expect(r.length).toBe(2);
  });
});
