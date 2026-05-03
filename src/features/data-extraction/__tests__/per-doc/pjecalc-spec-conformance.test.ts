/**
 * Conformidade com PJe-Calc 2.15.1 — testes baseados na decompilação
 * dos parsers oficiais em pjecalc-fonte/.
 *
 * Cada teste cita o arquivo Java específico que ditou a regra.
 */
import { describe, expect, it } from "vitest";
import { buildHistoricoSalarialCSV } from "../../export/csv-historico";
import { buildFeriasCSV } from "../../export/csv-ferias";
import { buildFaltasCSV } from "../../export/csv-faltas";
import { buildCartaoPontoCSV } from "../../export/per-doc/cartao-ponto-csv";
import type { ParseCartaoPontoResult } from "../../parsers/cartao-ponto";

const CRLF = "\r\n";

// ===== Histórico Salarial =====
// Spec: ServicoDeParsingDeHistoricoSalarial.construirObjeto()
// 6 colunas fixas: competencia, valor, incideFgts, incideFgtsRecolhido,
// incideContribuicaoSocial, incideContribuicaoSocialRecolhida
describe("PJe-Calc spec — Histórico Salarial", () => {
  it("Header com 6 colunas separadas por ;", () => {
    const csv = buildHistoricoSalarialCSV([], {
      incide_fgts: true,
      fgts_recolhido: false,
      incide_inss: true,
      inss_recolhido: false,
      natureza_indenizatoria: false,
    });
    const header = csv.split(CRLF)[0];
    expect(header.split(";")).toHaveLength(6);
  });

  it("Competência em MM/yyyy entre aspas (parser usa SimpleDateFormat MM/yyyy)", () => {
    const csv = buildHistoricoSalarialCSV(
      [{ competencia: "08/2019", valor: 1000 }],
      {
        incide_fgts: true,
        fgts_recolhido: false,
        incide_inss: true,
        inss_recolhido: false,
        natureza_indenizatoria: false,
      },
    );
    const dataLine = csv.split(CRLF)[1];
    expect(dataLine.startsWith('"08/2019";')).toBe(true);
  });

  it("Decimal pt-BR (vírgula) — DecimalFormat #,##0.00", () => {
    const csv = buildHistoricoSalarialCSV(
      [{ competencia: "08/2019", valor: 1467.89 }],
      {
        incide_fgts: true,
        fgts_recolhido: false,
        incide_inss: true,
        inss_recolhido: false,
        natureza_indenizatoria: false,
      },
    );
    expect(csv).toContain('"1467,89"');
  });

  it("Boolean S/N (parser AbstractServicoDeParsing.converterParaBoolean)", () => {
    const csv = buildHistoricoSalarialCSV(
      [{ competencia: "08/2019", valor: 100 }],
      {
        incide_fgts: true,
        fgts_recolhido: false,
        incide_inss: true,
        inss_recolhido: false,
        natureza_indenizatoria: false,
      },
    );
    const fields = csv.split(CRLF)[1].split(";");
    // Cada célula vem com aspas: "08/2019";"100,00";"S";"N";"S";"N"
    expect(fields[2]).toBe('"S"');
    expect(fields[3]).toBe('"N"');
    expect(fields[4]).toBe('"S"');
    expect(fields[5]).toBe('"N"');
  });

  it("Line ending CRLF + termina com CRLF", () => {
    const csv = buildHistoricoSalarialCSV([], {
      incide_fgts: true,
      fgts_recolhido: false,
      incide_inss: true,
      inss_recolhido: false,
      natureza_indenizatoria: false,
    });
    expect(csv.endsWith(CRLF)).toBe(true);
  });
});

// ===== Férias =====
// Spec: ServicoDeParsingDeFerias.construirObjeto()
// 15 colunas: relativa, prazo, situacao, dobra, abono, qtdDias, [DtIni,DtFim,Dobra]×3
// Situação: SituacaoDaFeriasEnum.obterPorValor(valor) — aceita G/GP/NG/I/P
describe("PJe-Calc spec — Férias", () => {
  it("15 colunas no header (parser lê split[0..14])", () => {
    const csv = buildFeriasCSV([]);
    const header = csv.split(CRLF)[0];
    expect(header.split(";")).toHaveLength(15);
  });

  it("Situação aceita códigos curtos G/GP/NG/I/P", () => {
    const csv = buildFeriasCSV([
      {
        relativa: "2023/2024",
        prazo: 30,
        situacao: "I",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: null,
        gozo2: null,
        gozo3: null,
      },
    ]);
    const fields = csv.split(CRLF)[1].split(";");
    expect(fields[2]).toBe("I");
  });

  it("Datas dd/MM/yyyy nos gozos (SimpleDateFormat dd/MM/yyyy)", () => {
    const csv = buildFeriasCSV([
      {
        relativa: "2023/2024",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: { inicio: "01/06/2024", fim: "20/06/2024", dobra: false },
        gozo2: null,
        gozo3: null,
      },
    ]);
    expect(csv).toContain(";01/06/2024;20/06/2024;");
  });

  it("Boolean S/N nos campos dobra/abono", () => {
    const csv = buildFeriasCSV([
      {
        relativa: "2023/2024",
        prazo: 30,
        situacao: "G",
        dobra_geral: true,
        abono: true,
        dias_abono: 10,
        gozo1: null,
        gozo2: null,
        gozo3: null,
      },
    ]);
    const fields = csv.split(CRLF)[1].split(";");
    expect(fields[3]).toBe("S"); // dobra
    expect(fields[4]).toBe("S"); // abono
  });
});

// ===== Faltas =====
// Spec: ServicoDeParsingDeFaltas.construirObjeto()
// 4 obrigatórias + 1 opcional (justificativa max 200 chars)
describe("PJe-Calc spec — Faltas", () => {
  it("Header com 5 colunas (justificativa opcional)", () => {
    const csv = buildFaltasCSV([]);
    const header = csv.split(CRLF)[0];
    expect(header.split(";")).toHaveLength(5);
  });

  it("Datas dd/MM/yyyy entre aspas", () => {
    const csv = buildFaltasCSV([
      {
        data_inicio: "2024-03-15",
        data_fim: "2024-03-16",
        justificada: false,
        reiniciar_periodo_aquisitivo: false,
        justificativa: null,
      },
    ]);
    const fields = csv.split(CRLF)[1].split(";");
    expect(fields[0]).toBe('"15/03/2024"');
    expect(fields[1]).toBe('"16/03/2024"');
  });

  it("Justificativa truncada em 200 chars (limite do parser)", () => {
    const csv = buildFaltasCSV([
      {
        data_inicio: "2024-03-15",
        data_fim: "2024-03-15",
        justificada: true,
        reiniciar_periodo_aquisitivo: false,
        justificativa: "x".repeat(500),
      },
    ]);
    const lastField = csv.split(CRLF)[1].split(";")[4];
    // Inclui as 2 aspas; conteúdo interno limitado a 200
    const inner = lastField.replace(/^"|"$/g, "");
    expect(inner.length).toBeLessThanOrEqual(200);
  });
});

// ===== Cartão de Ponto / Importar Jornada =====
// Spec: ServicoDeParsingDeCartaoDePonto.importarJornadaCartaoDePonto()
// LIMITE_COLUNAS_JORNADA = 13 (data + 12 marcações = 6 pares E/S)
describe("PJe-Calc spec — Cartão de Ponto / Importar Jornada", () => {
  it("13 colunas no header (LIMITE_COLUNAS_JORNADA=13)", async () => {
    const blob = buildCartaoPontoCSV({
      apuracoes: [],
      competencia_predominante: "03/2024",
      data_inicial: "",
      data_final: "",
      warnings: [],
      unparsed_lines: [],
      competencias: new Map(),
      parser_version: "test",
    } satisfies ParseCartaoPontoResult);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    const header = s.split(CRLF)[0];
    expect(header.split(";")).toHaveLength(13);
  });

  it("Encoding UTF-8 (modelo oficial do PJe-Calc usa UTF-8)", async () => {
    const blob = buildCartaoPontoCSV({
      apuracoes: [],
      competencia_predominante: "03/2024",
      data_inicial: "",
      data_final: "",
      warnings: [],
      unparsed_lines: [],
      competencias: new Map(),
      parser_version: "test",
    } satisfies ParseCartaoPontoResult);
    expect(blob.type).toBe("text/csv;charset=utf-8");
  });

  it("Datas dd/MM/yyyy + horas HH:MM", async () => {
    const blob = buildCartaoPontoCSV({
      apuracoes: [
        {
          data: "2024-03-01",
          ocorrencia: "NORMAL",
          marcacoes: [{ e: "08:00", s: "12:00" }],
          observacao: null,
          dia_semana: null,
          eventos: [],
        },
      ],
      competencia_predominante: "03/2024",
      data_inicial: "2024-03-01",
      data_final: "2024-03-01",
      warnings: [],
      unparsed_lines: [],
      competencias: new Map(),
      parser_version: "test",
    } satisfies ParseCartaoPontoResult);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    const dataLine = s.split(CRLF)[1];
    expect(dataLine.startsWith("01/03/2024;08:00;12:00;")).toBe(true);
  });
});
