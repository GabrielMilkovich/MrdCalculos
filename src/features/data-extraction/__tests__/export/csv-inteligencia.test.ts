/**
 * Testes da camada de inteligência aplicada aos 4 builders de CSV:
 *   - Formula injection (=, +, -, @ na primeira posição)
 *   - Validação de datas, horas, competências e relativa
 *   - Deduplicação e ordenação determinística
 *   - Consolidação de competências duplicadas (histórico salarial)
 *   - Cross-check com checkFerias / checkFaltas
 *   - Travessia de meia-noite no cartão-ponto
 */
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import {
  csvSafeCell,
  dataBRtoIso,
  dataIsoToBr,
  dedupBy,
  hhmmToMin,
  isCompetenciaValida,
  isDataBRValida,
  isDataIsoValida,
  isRelativaValida,
  normalizarHora,
  stripControlChars,
} from "../../export/validation";
import { sanitizeText } from "../../export/sanitize";
import { formatDataBR, formatNumeroBR } from "../../export/format-br";
import { buildCartaoPontoCSVWithReport } from "../../export/per-doc/cartao-ponto-csv";
import { buildFeriasCSVWithReport } from "../../export/csv-ferias";
import { buildFaltasCSVWithReport } from "../../export/csv-faltas";
import { buildHistoricoSalarialCSVWithReport } from "../../export/csv-historico";
import type { ParseCartaoPontoResult } from "../../parsers/cartao-ponto";

describe("validation — formula injection", () => {
  it("prefixa com aspas simples quando célula começa com =, +, -, @", () => {
    expect(csvSafeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvSafeCell("+1234")).toBe("'+1234");
    expect(csvSafeCell("-CMD|/c")).toBe("'-CMD|/c");
    expect(csvSafeCell("@LOOKUP")).toBe("'@LOOKUP");
  });

  it("preserva texto que tem - no meio (nome de rubrica legítimo)", () => {
    expect(csvSafeCell("HE 70% - intervalo")).toBe("HE 70% - intervalo");
    expect(csvSafeCell("01/03/2024")).toBe("01/03/2024");
  });

  it("strips caracteres de controle invisíveis", () => {
    expect(stripControlChars("abc\x00def")).toBe("abcdef");
    expect(stripControlChars("foo\x07bar")).toBe("foobar");
  });

  it("sanitizeText aplica formula safe + strip controle + truncate", () => {
    expect(sanitizeText("=DANGEROUS\x00", 50)).toBe("'=DANGEROUS");
    expect(sanitizeText("texto;com;ponto-e-virgula", 50)).toBe(
      "texto com ponto-e-virgula",
    );
  });
});

describe("validation — datas", () => {
  it("isDataIsoValida detecta data inexistente (29/02 não-bissexto)", () => {
    expect(isDataIsoValida("2024-02-29")).toBe(true); // bissexto
    expect(isDataIsoValida("2023-02-29")).toBe(false);
    expect(isDataIsoValida("2024-13-01")).toBe(false);
    expect(isDataIsoValida("2024-04-31")).toBe(false);
  });

  it("isDataBRValida com mesmas regras", () => {
    expect(isDataBRValida("31/04/2024")).toBe(false);
    expect(isDataBRValida("01/03/2024")).toBe(true);
  });

  it("dataBRtoIso e dataIsoToBr são reverses, retornam null para inválida", () => {
    expect(dataBRtoIso("01/03/2024")).toBe("2024-03-01");
    expect(dataIsoToBr("2024-03-01")).toBe("01/03/2024");
    expect(dataBRtoIso("32/03/2024")).toBeNull();
    expect(dataIsoToBr("2024-13-01")).toBeNull();
  });

  it("formatDataBR rejeita data inválida (string vazia)", () => {
    expect(formatDataBR("2024-13-45")).toBe("");
    expect(formatDataBR("2024-03-01")).toBe("01/03/2024");
  });
});

describe("validation — horas", () => {
  it("normalizarHora aceita 8:30 → 08:30, rejeita 25:00", () => {
    expect(normalizarHora("8:30")).toBe("08:30");
    expect(normalizarHora("23:59")).toBe("23:59");
    expect(normalizarHora("24:00")).toBeNull();
    expect(normalizarHora("12:60")).toBeNull();
    expect(normalizarHora("abc")).toBeNull();
    expect(normalizarHora("")).toBe("");
  });

  it("hhmmToMin retorna minutos desde 00:00", () => {
    expect(hhmmToMin("00:00")).toBe(0);
    expect(hhmmToMin("01:30")).toBe(90);
    expect(hhmmToMin("23:59")).toBe(23 * 60 + 59);
    expect(hhmmToMin("invalid")).toBeNull();
  });
});

describe("validation — relativa e competência", () => {
  it("isRelativaValida exige aaaa/aaaa com ano1 < ano2 e diff <= 5", () => {
    expect(isRelativaValida("2022/2023")).toBe(true);
    expect(isRelativaValida("2023/2022")).toBe(false);
    expect(isRelativaValida("2020/2030")).toBe(false); // diff > 5
    expect(isRelativaValida("2022")).toBe(false);
    expect(isRelativaValida("22/23")).toBe(false);
  });

  it("isCompetenciaValida exige MM/yyyy com mês 01-12", () => {
    expect(isCompetenciaValida("01/2024")).toBe(true);
    expect(isCompetenciaValida("12/2024")).toBe(true);
    expect(isCompetenciaValida("13/2024")).toBe(false);
    expect(isCompetenciaValida("00/2024")).toBe(false);
    expect(isCompetenciaValida("1/2024")).toBe(false);
    expect(isCompetenciaValida("01-2024")).toBe(false);
  });
});

describe("dedupBy", () => {
  it("dedupa por chave e reporta índices removidos", () => {
    const arr = [
      { id: 1, v: "a" },
      { id: 2, v: "b" },
      { id: 1, v: "c" }, // dup
      { id: 3, v: "d" },
      { id: 1, v: "e" }, // dup
    ];
    const r = dedupBy(arr, (x) => String(x.id));
    expect(r.resultado).toHaveLength(3);
    expect(r.removidasIdx).toEqual([2, 4]);
    expect(r.resultado[0]).toEqual({ id: 1, v: "a" }); // primeiro vence
  });

  it("aplica merge quando provido", () => {
    const arr = [
      { id: 1, qtd: 2 },
      { id: 1, qtd: 5 },
      { id: 1, qtd: 1 },
    ];
    const r = dedupBy(
      arr,
      (x) => String(x.id),
      (a, b) => ({ id: a.id, qtd: a.qtd + b.qtd }),
    );
    expect(r.resultado).toEqual([{ id: 1, qtd: 8 }]);
    expect(r.removidasIdx).toEqual([1, 2]);
  });
});

// ============================================================
// Builder cartão-ponto
// ============================================================

function parsedCartao(opts: {
  apuracoes: Array<{
    data: string;
    marcacoes?: Array<{ e: string; s: string }>;
  }>;
}): ParseCartaoPontoResult {
  return {
    apuracoes: opts.apuracoes.map((a) => ({
      data: a.data,
      dia_semana: null,
      ocorrencia: "NORMAL",
      marcacoes: (a.marcacoes ?? []).map((m) => ({ e: m.e, s: m.s })),
      eventos: [],
      observacao: null,
    })),
    competencias: new Map(),
    competencia_predominante: "",
    data_inicial: "",
    data_final: "",
    warnings: [],
    unparsed_lines: [],
    parser_version: "test",
  };
}

describe("buildCartaoPontoCSV — inteligência", () => {
  it("REJEITA apurações com data ISO inválida", () => {
    const r = buildCartaoPontoCSVWithReport(
      parsedCartao({
        apuracoes: [
          { data: "2024-13-01" },
          { data: "2024-03-01", marcacoes: [{ e: "08:00", s: "12:00" }] },
        ],
      }),
    );
    expect(r.report.linhasGeradas).toBe(1);
    expect(r.report.linhasRejeitadas[0].motivo).toMatch(/data inválida/i);
  });

  it("ORDENA cronologicamente independente da entrada", async () => {
    const r = buildCartaoPontoCSVWithReport(
      parsedCartao({
        apuracoes: [
          { data: "2024-03-15" },
          { data: "2024-03-01" },
          { data: "2024-03-10" },
        ],
      }),
    );
    const txt = await r.blob.text();
    const linhas = txt.split("\r\n").filter(Boolean);
    expect(linhas[1]).toMatch(/^01\/03\/2024/);
    expect(linhas[2]).toMatch(/^10\/03\/2024/);
    expect(linhas[3]).toMatch(/^15\/03\/2024/);
  });

  it("DEDUP par E/S idêntico no mesmo dia", async () => {
    const r = buildCartaoPontoCSVWithReport(
      parsedCartao({
        apuracoes: [
          {
            data: "2024-03-01",
            marcacoes: [
              { e: "08:00", s: "12:00" },
              { e: "08:00", s: "12:00" }, // duplicado
              { e: "13:00", s: "17:00" },
            ],
          },
        ],
      }),
    );
    const txt = await r.blob.text();
    const dataLine = txt.split("\r\n")[1];
    // 13 colunas: Data + 6 pares E/S; deve ter só 2 pares preenchidos, não 3.
    const cols = dataLine.split(";");
    expect(cols[1]).toBe("08:00");
    expect(cols[2]).toBe("12:00");
    expect(cols[3]).toBe("13:00");
    expect(cols[4]).toBe("17:00");
    expect(cols[5]).toBe(""); // par 3 vazio
  });

  it("DETECTA travessia de meia-noite e adiciona warning", () => {
    const r = buildCartaoPontoCSVWithReport(
      parsedCartao({
        apuracoes: [
          {
            data: "2024-03-01",
            marcacoes: [{ e: "22:00", s: "02:00" }],
          },
        ],
      }),
    );
    expect(r.report.warnings.some((w) => /travessia/i.test(w))).toBe(true);
  });

  it("DESCARTA par com hora inválida mas mantém apuração", () => {
    const r = buildCartaoPontoCSVWithReport(
      parsedCartao({
        apuracoes: [
          {
            data: "2024-03-01",
            marcacoes: [
              { e: "08:00", s: "12:00" },
              { e: "25:00", s: "26:00" }, // inválido
            ],
          },
        ],
      }),
    );
    expect(r.report.linhasGeradas).toBe(1);
    expect(r.report.warnings.some((w) => /hora inválida/i.test(w))).toBe(true);
  });
});

// ============================================================
// Builder férias
// ============================================================

describe("buildFeriasCSV — inteligência", () => {
  it("REJEITA relativa fora do padrão aaaa/aaaa", () => {
    const r = buildFeriasCSVWithReport([
      {
        relativa: "2022",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: null,
        gozo2: null,
        gozo3: null,
      },
    ]);
    expect(r.report.linhasGeradas).toBe(0);
    expect(r.report.linhasRejeitadas[0].motivo).toMatch(/relativa inválida/i);
  });

  it("ZERA dias_abono quando abono=false", () => {
    const r = buildFeriasCSVWithReport([
      {
        relativa: "2022/2023",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 10, // inconsistente
        gozo1: null,
        gozo2: null,
        gozo3: null,
      },
    ]);
    expect(r.csv).toContain(";N;0;"); // abono=N, dias_abono=0
    expect(r.report.linhasAjustadas[0].ajuste).toMatch(/dias_abono>0 → zerado/);
  });

  it("CAPA prazo > 60 (limite PJe-Calc)", () => {
    const r = buildFeriasCSVWithReport([
      {
        relativa: "2022/2023",
        prazo: 90,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: null,
        gozo2: null,
        gozo3: null,
      },
    ]);
    expect(r.csv).toMatch(/2022\/2023;60;/);
    expect(r.report.linhasAjustadas[0].ajuste).toMatch(/prazo > 60/);
  });

  it("ORDENA por relativa cronológica", () => {
    const r = buildFeriasCSVWithReport([
      {
        relativa: "2024/2025",
        prazo: 30,
        situacao: "NG",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: null,
        gozo2: null,
        gozo3: null,
      },
      {
        relativa: "2022/2023",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: null,
        gozo2: null,
        gozo3: null,
      },
    ]);
    const linhas = r.csv.split("\r\n").filter(Boolean);
    expect(linhas[1]).toMatch(/^2022\/2023/);
    expect(linhas[2]).toMatch(/^2024\/2025/);
  });

  it("DEDUP relativa duplicada — última prevalece", () => {
    const r = buildFeriasCSVWithReport([
      {
        relativa: "2022/2023",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: null,
        gozo2: null,
        gozo3: null,
      },
      {
        relativa: "2022/2023",
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
    expect(r.report.linhasGeradas).toBe(1);
    expect(r.csv).toContain("2022/2023;30;I;"); // última (situacao=I) prevaleceu
  });

  it("CROSS-CHECK warning quando soma gozos+abono diverge >5 dias do prazo", () => {
    const r = buildFeriasCSVWithReport([
      {
        relativa: "2022/2023",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: { inicio: "01/06/2024", fim: "10/06/2024", dobra: false }, // 10 dias
        gozo2: null,
        gozo3: null,
      },
    ]);
    expect(r.report.warnings.some((w) => /diverge/i.test(w))).toBe(true);
  });

  it("DESCARTA gozo com data inválida", () => {
    const r = buildFeriasCSVWithReport([
      {
        relativa: "2022/2023",
        prazo: 30,
        situacao: "G",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: { inicio: "32/13/2024", fim: "10/06/2024", dobra: false },
        gozo2: null,
        gozo3: null,
      },
    ]);
    // Linha vai gerada, mas gozo1 vira 3 strings vazias.
    expect(r.report.linhasGeradas).toBe(1);
    // Trailing 9 ; (gozos vazios) — relativa;prazo;situacao;dobra;abono;dias;3x3 colunas vazias.
    expect(r.csv).toMatch(/2022\/2023;30;G;N;N;0;;;;;;;;;/);
  });
});

// ============================================================
// Builder faltas
// ============================================================

describe("buildFaltasCSV — inteligência", () => {
  it("REJEITA data_inicio > data_fim", () => {
    const r = buildFaltasCSVWithReport([
      {
        data_inicio: "2024-03-15",
        data_fim: "2024-03-10",
        justificada: false,
        reiniciar_periodo_aquisitivo: false,
        justificativa: null,
      },
    ]);
    expect(r.report.linhasGeradas).toBe(0);
    expect(r.report.linhasRejeitadas[0].motivo).toMatch(/data_inicio > data_fim/);
  });

  it("DEDUP por data + justificativa idênticas", () => {
    const r = buildFaltasCSVWithReport([
      {
        data_inicio: "2024-03-10",
        data_fim: "2024-03-10",
        justificada: true,
        reiniciar_periodo_aquisitivo: false,
        justificativa: "atestado",
      },
      {
        data_inicio: "2024-03-10",
        data_fim: "2024-03-10",
        justificada: true,
        reiniciar_periodo_aquisitivo: false,
        justificativa: "atestado",
      },
    ]);
    expect(r.report.linhasGeradas).toBe(1);
    expect(
      r.report.linhasAjustadas.some((a) => /Dedup/i.test(a.ajuste)),
    ).toBe(true);
  });

  it("DETECTA overlap entre intervalos com warning", () => {
    const r = buildFaltasCSVWithReport([
      {
        data_inicio: "2024-03-10",
        data_fim: "2024-03-15",
        justificada: false,
        reiniciar_periodo_aquisitivo: false,
        justificativa: null,
      },
      {
        data_inicio: "2024-03-12",
        data_fim: "2024-03-18",
        justificada: false,
        reiniciar_periodo_aquisitivo: false,
        justificativa: null,
      },
    ]);
    expect(r.report.warnings.some((w) => /overlap/i.test(w))).toBe(true);
  });

  it("ORDENA cronologicamente", () => {
    const r = buildFaltasCSVWithReport([
      {
        data_inicio: "2024-05-01",
        data_fim: "2024-05-01",
        justificada: false,
        reiniciar_periodo_aquisitivo: false,
        justificativa: null,
      },
      {
        data_inicio: "2024-03-01",
        data_fim: "2024-03-01",
        justificada: false,
        reiniciar_periodo_aquisitivo: false,
        justificativa: null,
      },
    ]);
    const linhas = r.csv.split("\r\n").filter(Boolean);
    expect(linhas[1]).toMatch(/^"01\/03\/2024"/);
    expect(linhas[2]).toMatch(/^"01\/05\/2024"/);
  });
});

// ============================================================
// Builder histórico salarial
// ============================================================

describe("buildHistoricoSalarialCSV — consolidação", () => {
  const flagsOff = {
    incide_fgts: true,
    fgts_recolhido: false,
    incide_inss: true,
    inss_recolhido: false,
    natureza_indenizatoria: false,
  };

  it("CONSOLIDA competências duplicadas com Decimal.sum (precisão)", () => {
    const r = buildHistoricoSalarialCSVWithReport(
      [
        { competencia: "03/2024", valor: new Decimal("1234.56") },
        { competencia: "03/2024", valor: new Decimal("100.10") },
        { competencia: "04/2024", valor: new Decimal("500.00") },
      ],
      flagsOff,
    );
    expect(r.report.linhasGeradas).toBe(2);
    // 1234.56 + 100.10 = 1334.66 (sem float drift)
    expect(r.csv).toContain('"03/2024";"1334,66"');
  });

  it("REJEITA competência inválida", () => {
    const r = buildHistoricoSalarialCSVWithReport(
      [
        { competencia: "13/2024", valor: new Decimal(100) },
        { competencia: "03/2024", valor: new Decimal(100) },
      ],
      flagsOff,
    );
    expect(r.report.linhasGeradas).toBe(1);
    expect(r.report.linhasRejeitadas[0].motivo).toMatch(/competência inválida/i);
  });

  it("REJEITA valor zero ou negativo", () => {
    const r = buildHistoricoSalarialCSVWithReport(
      [
        { competencia: "03/2024", valor: new Decimal(0) },
        { competencia: "04/2024", valor: new Decimal(-50) },
        { competencia: "05/2024", valor: new Decimal(100) },
      ],
      flagsOff,
    );
    expect(r.report.linhasGeradas).toBe(1);
    expect(r.report.linhasRejeitadas).toHaveLength(2);
  });

  it("ORDENA cronologicamente", () => {
    const r = buildHistoricoSalarialCSVWithReport(
      [
        { competencia: "12/2024", valor: new Decimal(100) },
        { competencia: "01/2024", valor: new Decimal(100) },
        { competencia: "06/2024", valor: new Decimal(100) },
      ],
      flagsOff,
    );
    const linhas = r.csv.split("\r\n").filter(Boolean);
    expect(linhas[1]).toMatch(/^"01\/2024"/);
    expect(linhas[2]).toMatch(/^"06\/2024"/);
    expect(linhas[3]).toMatch(/^"12\/2024"/);
  });
});

describe("formatNumeroBR — Decimal preservado", () => {
  it("Decimal grande não perde precisão (vs number)", () => {
    const big = new Decimal("999999999.99");
    expect(formatNumeroBR(big)).toBe("999999999,99");
  });
});
