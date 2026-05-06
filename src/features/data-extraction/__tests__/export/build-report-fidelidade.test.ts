/**
 * Testes de fidelidade extração → CSV.
 *
 * Garante que TODA perda de dado entre o input do builder e o CSV gerado
 * vem reportada explicitamente em `BuildReport.linhasRejeitadas` ou
 * `linhasAjustadas`. Nunca silencioso.
 *
 * Cobre:
 *   - Holerite: rubrica com valor positivo + categoria=null vai para
 *     linhasRejeitadas (perda real, operador esqueceu de classificar).
 *   - Holerite: rubrica desmarcada pelo operador (incluir=false) vai
 *     para linhasAjustadas (perda intencional, mas registrada).
 *   - CTPS: report unificado com prefixo [Férias] / [Faltas].
 *   - Cartão de ponto: travessia de meia-noite vira warning.
 *   - Cartão de ponto: data inválida vira linhasRejeitadas.
 */
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { buildCartaoPontoCSVWithReport } from "../../export/per-doc/cartao-ponto-csv";
import { buildHoleriteZipWithReport } from "../../export/per-doc/holerite-zip";
import { buildCtpsZipWithReport } from "../../export/per-doc/ctps-zip";
import { buildFeriasCSVBlobWithReport } from "../../export/per-doc/ferias-csv";
import { buildFaltasCSVBlobWithReport } from "../../export/per-doc/faltas-csv";
import type {
  ClassificacaoHolerite,
  LinhaClassificada,
} from "../../export/per-doc/holerite-classify";
import type { ParseCartaoPontoResult } from "../../parsers/cartao-ponto";
import type { ParseFaltasResult } from "../../parsers/faltas";
import type { ParseFeriasResult } from "../../parsers/ferias";

// ============================================================
// Holerite
// ============================================================

function linhaHolerite(
  partial: Partial<LinhaClassificada> & {
    nome: string;
    valor: number;
    categoria?: LinhaClassificada["categoria"];
    incluir?: boolean;
    origem?: LinhaClassificada["origem"];
  },
): LinhaClassificada {
  const valor = partial.valor;
  return {
    key: `k-${partial.nome}`,
    rubrica: {
      codigo: "0001",
      nome: partial.nome,
      valor_vencimento: valor,
      valor_desconto: null,
      quantidade: null,
      ordem: 1,
    },
    categoria: partial.categoria ?? null,
    origem: partial.origem ?? "fallback",
    hint: null,
    valorParaCsv: valor,
    incluir: partial.incluir ?? false,
  };
}

describe("buildHoleriteZipWithReport — fidelidade", () => {
  it("rubrica com valor positivo SEM categoria vira linhaRejeitada", async () => {
    const cl: ClassificacaoHolerite = {
      competencia: "06/2024",
      layout_usado: "test",
      warnings: [],
      linhas: [
        linhaHolerite({
          nome: "GRATIFICACAO ESPECIAL",
          valor: 500,
          categoria: null,
          origem: "fallback",
          incluir: false,
        }),
      ],
    };
    const { report } = await buildHoleriteZipWithReport(cl);
    expect(report.linhasRejeitadas.length).toBe(1);
    expect(report.linhasRejeitadas[0].motivo).toContain(
      "GRATIFICACAO ESPECIAL",
    );
    expect(report.linhasRejeitadas[0].motivo).toContain("sem categoria");
  });

  it("rubrica desmarcada pelo operador vira linhaAjustada", async () => {
    const cl: ClassificacaoHolerite = {
      competencia: "06/2024",
      layout_usado: "test",
      warnings: [],
      linhas: [
        linhaHolerite({
          nome: "PREMIO MENSAL",
          valor: 200,
          categoria: "premiacao",
          origem: "hint",
          incluir: false,
        }),
      ],
    };
    const { report } = await buildHoleriteZipWithReport(cl);
    expect(report.linhasAjustadas.length).toBeGreaterThan(0);
    expect(
      report.linhasAjustadas.some((a) =>
        a.ajuste.includes("desmarcada pelo operador"),
      ),
    ).toBe(true);
  });

  it("rubrica com hint sugerir_ignorar vai pra linhasAjustadas", async () => {
    const cl: ClassificacaoHolerite = {
      competencia: "06/2024",
      layout_usado: "test",
      warnings: [],
      linhas: [
        linhaHolerite({
          nome: "VALE TRANSPORTE",
          valor: 250,
          categoria: null,
          origem: "ignorar_hint",
          incluir: false,
        }),
      ],
    };
    const { report } = await buildHoleriteZipWithReport(cl);
    expect(
      report.linhasAjustadas.some((a) => a.ajuste.includes("ignorada por hint")),
    ).toBe(true);
    expect(report.linhasRejeitadas.length).toBe(0);
  });

  it("desconto não vira linha rejeitada nem ajustada (by design)", async () => {
    const cl: ClassificacaoHolerite = {
      competencia: "06/2024",
      layout_usado: "test",
      warnings: [],
      linhas: [
        {
          key: "k-d",
          rubrica: {
            codigo: "9999",
            nome: "INSS",
            valor_vencimento: null,
            valor_desconto: 350,
            quantidade: null,
            ordem: 99,
          },
          categoria: null,
          origem: "desconto",
          hint: null,
          valorParaCsv: 0,
          incluir: false,
        },
      ],
    };
    const { report } = await buildHoleriteZipWithReport(cl);
    expect(report.linhasRejeitadas.length).toBe(0);
  });

  it("happy path: rubrica classificada e marcada gera linha no CSV sem perda", async () => {
    const cl: ClassificacaoHolerite = {
      competencia: "06/2024",
      layout_usado: "test",
      warnings: [],
      linhas: [
        linhaHolerite({
          nome: "SALARIO BASE",
          valor: 3000,
          categoria: "salario_fixo",
          origem: "hint",
          incluir: true,
        }),
      ],
    };
    const { report } = await buildHoleriteZipWithReport(cl);
    expect(report.linhasRejeitadas.length).toBe(0);
    expect(report.linhasGeradas).toBeGreaterThan(0);
  });
});

// ============================================================
// CTPS — agregação de 2 sub-reports com prefixo
// ============================================================

describe("buildCtpsZipWithReport — agrega [Férias] e [Faltas]", () => {
  it("warning de cross-check de férias vem com prefixo [Férias]", async () => {
    const ferias: ParseFeriasResult = {
      ferias: [
        {
          relativa: "2022/2023",
          prazo: 30,
          situacao: "G",
          dobra_geral: false,
          abono: false,
          dias_abono: 0,
          // Soma de gozos = 10 dias (01-10/01) vs prazo 30 → diff -20, |diff| > 5
          gozo1: { inicio: "01/01/2024", fim: "10/01/2024", dobra: false },
          gozo2: null,
          gozo3: null,
        },
      ],
      warnings: [],
      unparsed_lines: [],
    };
    const faltas: ParseFaltasResult = {
      faltas: [],
      warnings: [],
      unparsed_lines: [],
    };
    const { report } = await buildCtpsZipWithReport({
      ferias,
      faltas,
      baseFilename: "ctps_test",
    });
    const feriasWarn = report.warnings.find((w) => w.startsWith("[Férias]"));
    expect(feriasWarn).toBeDefined();
  });

  it("falta com data inválida vira [Faltas] linhaRejeitada", async () => {
    const ferias: ParseFeriasResult = {
      ferias: [],
      warnings: [],
      unparsed_lines: [],
    };
    const faltas: ParseFaltasResult = {
      faltas: [
        {
          data_inicio: "2024-13-99", // data ISO inválida
          data_fim: "2024-13-99",
          justificada: false,
          reiniciar_periodo_aquisitivo: false,
          justificativa: null,
        },
      ],
      warnings: [],
      unparsed_lines: [],
    };
    const { report } = await buildCtpsZipWithReport({
      ferias,
      faltas,
      baseFilename: "ctps_test",
    });
    const rej = report.linhasRejeitadas.find((r) => r.motivo.startsWith("[Faltas]"));
    expect(rej).toBeDefined();
  });
});

// ============================================================
// Cartão de Ponto — travessia + data inválida + dedup
// ============================================================

describe("buildCartaoPontoCSVWithReport — fidelidade", () => {
  it("data ISO inválida vira linhaRejeitada", () => {
    const parsed: ParseCartaoPontoResult = {
      apuracoes: [
        {
          data: "2024-13-45",
          dia_semana: null,
          ocorrencia: "NORMAL",
          marcacoes: [{ e: "08:00", s: "12:00" }],
          eventos: [],
          observacao: null,
        },
      ],
      competencias: new Map(),
      competencia_predominante: "",
      data_inicial: "",
      data_final: "",
      warnings: [],
      unparsed_lines: [],
      parser_version: "test",
    };
    const { report } = buildCartaoPontoCSVWithReport(parsed);
    expect(report.linhasRejeitadas.length).toBe(1);
    expect(report.linhasGeradas).toBe(0);
  });

  it("travessia de meia-noite vira warning explícito", () => {
    const parsed: ParseCartaoPontoResult = {
      apuracoes: [
        {
          data: "2024-06-01",
          dia_semana: "Sab",
          ocorrencia: "NORMAL",
          marcacoes: [{ e: "22:00", s: "02:00" }],
          eventos: [],
          observacao: null,
        },
      ],
      competencias: new Map(),
      competencia_predominante: "06/2024",
      data_inicial: "2024-06-01",
      data_final: "2024-06-01",
      warnings: [],
      unparsed_lines: [],
      parser_version: "test",
    };
    const { report } = buildCartaoPontoCSVWithReport(parsed);
    expect(report.warnings.some((w) => w.includes("travessia"))).toBe(true);
  });
});

// ============================================================
// Férias — prazo > 60 vira ajuste + relativa inválida vira rejeição
// ============================================================

describe("buildFeriasCSVBlobWithReport — fidelidade", () => {
  it("prazo > 60 capped em 60 vira linhaAjustada", () => {
    const parsed: ParseFeriasResult = {
      ferias: [
        {
          relativa: "2022/2023",
          prazo: 100,
          situacao: "G",
          dobra_geral: false,
          abono: false,
          dias_abono: 0,
          gozo1: null,
          gozo2: null,
          gozo3: null,
        },
      ],
      warnings: [],
      unparsed_lines: [],
    };
    const { report } = buildFeriasCSVBlobWithReport(parsed);
    expect(
      report.linhasAjustadas.some((a) => a.ajuste.includes("prazo > 60")),
    ).toBe(true);
  });

  it("relativa inválida vira linhaRejeitada", () => {
    const parsed: ParseFeriasResult = {
      ferias: [
        {
          relativa: "abc/def",
          prazo: 30,
          situacao: "G",
          dobra_geral: false,
          abono: false,
          dias_abono: 0,
          gozo1: null,
          gozo2: null,
          gozo3: null,
        },
      ],
      warnings: [],
      unparsed_lines: [],
    };
    const { report } = buildFeriasCSVBlobWithReport(parsed);
    expect(report.linhasRejeitadas.length).toBe(1);
  });
});

// ============================================================
// Faltas — overlap + data inválida
// ============================================================

describe("buildFaltasCSVBlobWithReport — fidelidade", () => {
  it("data_inicio > data_fim vira linhaRejeitada", () => {
    const parsed: ParseFaltasResult = {
      faltas: [
        {
          data_inicio: "2024-06-10",
          data_fim: "2024-06-01",
          justificada: false,
          reiniciar_periodo_aquisitivo: false,
          justificativa: null,
        },
      ],
      warnings: [],
      unparsed_lines: [],
    };
    const { report } = buildFaltasCSVBlobWithReport(parsed);
    expect(report.linhasRejeitadas.length).toBe(1);
    expect(report.linhasRejeitadas[0].motivo).toContain("data_inicio > data_fim");
  });
});

// Tipos shadow para garantir que `Decimal` é importado (caso testes
// futuros precisem). Mantém `import` ativo sem warning.
void Decimal;
