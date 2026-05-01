/**
 * Conformidade byte-a-byte com os modelos OFICIAIS do PJe-Calc Cidadão.
 *
 * Os 4 modelos foram baixados do próprio PJe-Calc 2.5.6+ (botão "Baixar
 * arquivo de exemplo preenchido") e armazenados em
 *   `modelo de exemplo csv/` (raiz do repo).
 *
 * Cada teste reproduz UMA linha do exemplo oficial usando nosso builder e
 * compara byte-a-byte.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildHistoricoSalarialCSV } from "../../export/csv-historico";
import { buildFeriasCSV } from "../../export/csv-ferias";
import { buildFaltasCSV } from "../../export/csv-faltas";
import { buildCartaoPontoCSV } from "../../export/per-doc/cartao-ponto-csv";
import type { ParseCartaoPontoResult } from "../../parsers/cartao-ponto";

const MODELOS_DIR = path.join(__dirname, "../../../../../modelo de exemplo csv");

function readModelo(name: string): string {
  return readFileSync(path.join(MODELOS_DIR, name), "utf-8");
}

const CRLF = "\r\n";

// ===== Histórico Salarial =====
describe("Conformidade byte-a-byte — Histórico Salarial", () => {
  const oficial = readModelo("ExemploHistoricoSalarial.csv");

  it("Header literal igual ao oficial", () => {
    const csv = buildHistoricoSalarialCSV([], {
      incide_fgts: true,
      fgts_recolhido: false,
      incide_inss: true,
      inss_recolhido: false,
      natureza_indenizatoria: false,
    });
    const expectedHeader = oficial.split(CRLF)[0];
    expect(csv.split(CRLF)[0]).toBe(expectedHeader);
  });

  it("Reproduz primeira linha do oficial: 10/2012;500,00 com flags S/S/S/S", () => {
    // Linha oficial: "10/2012";"500,00";"S";"S";"S";"S"
    const csv = buildHistoricoSalarialCSV(
      [{ competencia: "10/2012", valor: 500 }],
      {
        incide_fgts: true,
        fgts_recolhido: true,
        incide_inss: true,
        inss_recolhido: true,
        natureza_indenizatoria: false,
      },
    );
    const dataLine = csv.split(CRLF)[1];
    const expectedLine = oficial.split(CRLF)[1]; // 1ª linha de dados do oficial
    expect(dataLine).toBe(expectedLine);
  });

  it("Reproduz segunda linha: 01/2013;500,00 com S/N/S/N", () => {
    // Linha oficial: "01/2013";"500,00";"S";"N";"S";"N"
    const csv = buildHistoricoSalarialCSV(
      [{ competencia: "01/2013", valor: 500 }],
      {
        incide_fgts: true,
        fgts_recolhido: false,
        incide_inss: true,
        inss_recolhido: false,
        natureza_indenizatoria: false,
      },
    );
    const dataLine = csv.split(CRLF)[1];
    const expectedLine = oficial.split(CRLF)[2];
    expect(dataLine).toBe(expectedLine);
  });
});

// ===== Férias =====
describe("Conformidade byte-a-byte — Férias", () => {
  const oficial = readModelo("ExemploFerias.csv");

  it("Header literal igual ao oficial", () => {
    const csv = buildFeriasCSV([]);
    const expectedHeader = oficial.split(CRLF)[0];
    expect(csv.split(CRLF)[0]).toBe(expectedHeader);
  });

  it("Reproduz linha 2012/2013 (gozadas + abono 10 dias + gozo1)", () => {
    // Oficial: 2012/2013;30;G;N;S;10;20/01/2013;08/02/2013;N;;;;;;
    const csv = buildFeriasCSV([
      {
        relativa: "2012/2013",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: true,
        dias_abono: 10,
        gozo1: { inicio: "20/01/2013", fim: "08/02/2013", dobra: false },
        gozo2: null,
        gozo3: null,
      },
    ]);
    const dataLine = csv.split(CRLF)[1];
    const expectedLine = oficial.split(CRLF)[1];
    expect(dataLine).toBe(expectedLine);
  });

  it("Reproduz linha 2014/2015 (3 gozos preenchidos)", () => {
    // Oficial: 2014/2015;30;G;N;N;0;10/01/2015;19/01/2015;N;01/04/2015;10/04/2015;N;01/06/2015;10/06/2015;N
    const csv = buildFeriasCSV([
      {
        relativa: "2014/2015",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: { inicio: "10/01/2015", fim: "19/01/2015", dobra: false },
        gozo2: { inicio: "01/04/2015", fim: "10/04/2015", dobra: false },
        gozo3: { inicio: "01/06/2015", fim: "10/06/2015", dobra: false },
      },
    ]);
    const dataLine = csv.split(CRLF)[1];
    const expectedLine = oficial.split(CRLF)[3];
    expect(dataLine).toBe(expectedLine);
  });

  it("Reproduz linha 2015/2016 (Indenizadas, sem gozos)", () => {
    // Oficial: 2015/2016;30;I;S;N;0;;;;;;;;;
    const csv = buildFeriasCSV([
      {
        relativa: "2015/2016",
        prazo: 30,
        situacao: "I",
        dobra_geral: true,
        abono: false,
        dias_abono: 0,
        gozo1: null,
        gozo2: null,
        gozo3: null,
      },
    ]);
    const dataLine = csv.split(CRLF)[1];
    const expectedLine = oficial.split(CRLF)[4];
    expect(dataLine).toBe(expectedLine);
  });
});

// ===== Faltas =====
describe("Conformidade byte-a-byte — Faltas", () => {
  const oficial = readModelo("ExemploFaltas.csv");

  it("Header literal igual ao oficial", () => {
    const csv = buildFaltasCSV([]);
    const expectedHeader = oficial.split(CRLF)[0];
    expect(csv.split(CRLF)[0]).toBe(expectedHeader);
  });

  it("Reproduz linha com justificativa (Atestado Médico)", () => {
    // Oficial: "01/02/2016";"03/02/2016";"S";"N";"Atestado Médico."
    const csv = buildFaltasCSV([
      {
        data_inicio: "2016-02-01",
        data_fim: "2016-02-03",
        justificada: true,
        reiniciar_periodo_aquisitivo: false,
        justificativa: "Atestado Médico.",
      },
    ]);
    const dataLine = csv.split(CRLF)[1];
    const expectedLine = oficial.split(CRLF)[1];
    expect(dataLine).toBe(expectedLine);
  });

  it("Reproduz linha sem justificativa (trailing ; vazio)", () => {
    // Oficial: "23/12/2018";"23/12/2018";"N";"N";
    const csv = buildFaltasCSV([
      {
        data_inicio: "2018-12-23",
        data_fim: "2018-12-23",
        justificada: false,
        reiniciar_periodo_aquisitivo: false,
        justificativa: null,
      },
    ]);
    const dataLine = csv.split(CRLF)[1];
    const expectedLine = oficial.split(CRLF)[3];
    expect(dataLine).toBe(expectedLine);
  });
});

// ===== Cartão de Ponto / Importar Jornada =====
describe("Conformidade byte-a-byte — Jornada Cartão de Ponto", () => {
  const oficial = readModelo("ExemploJornadaCartaoDePonto.csv");

  it("Header literal igual ao oficial (com 'Saída' em UTF-8)", async () => {
    const blob = buildCartaoPontoCSV({
      apuracoes: [],
      competencia_predominante: "10/2018",
      data_inicial: "",
      data_final: "",
      warnings: [],
    } satisfies ParseCartaoPontoResult);
    const text = await blob.text();
    const expectedHeader = oficial.split(CRLF)[0];
    expect(text.split(CRLF)[0]).toBe(expectedHeader);
  });

  it("Reproduz linha 29/10/2018 com 2 pares E/S", async () => {
    // Oficial: 29/10/2018;08:10;12:15;13:50;20:10;;;;;;;;
    const blob = buildCartaoPontoCSV({
      apuracoes: [
        {
          data: "2018-10-29",
          ocorrencia: "NORMAL",
          marcacoes: [
            { e: "08:10", s: "12:15" },
            { e: "13:50", s: "20:10" },
          ],
          observacao: null,
        },
      ],
      competencia_predominante: "10/2018",
      data_inicial: "2018-10-29",
      data_final: "2018-10-29",
      warnings: [],
    } satisfies ParseCartaoPontoResult);
    const text = await blob.text();
    const dataLine = text.split(CRLF)[1];
    const expectedLine = oficial.split(CRLF)[1];
    expect(dataLine).toBe(expectedLine);
  });

  it("MIME type UTF-8 (modelo oficial usa UTF-8)", () => {
    const blob = buildCartaoPontoCSV({
      apuracoes: [],
      competencia_predominante: "10/2018",
      data_inicial: "",
      data_final: "",
      warnings: [],
    } satisfies ParseCartaoPontoResult);
    expect(blob.type).toBe("text/csv;charset=utf-8");
  });
});
