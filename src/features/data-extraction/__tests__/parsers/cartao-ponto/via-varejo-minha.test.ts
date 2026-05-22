/**
 * Sprint 3 Fase 2 (2026-05-22) — Testes do mapperCartaoViaVarejoMinha
 * (layout NOVO "Espelho de Ponto Minha").
 *
 * COBERTURA (14 testes)
 * ---------------------
 * Detector:
 *  1. ESPELHO + Via Varejo (CGC + razão) + tabela → aplica=true, score alto
 *  2. Sem ESPELHO → aplica=false
 *  3. ESPELHO sem tabela espelho → aplica baixo
 *  4. isTabelaEspelho aceita headers em ordem variável (BATIDAS antes de DATA)
 *
 * Mapeamento:
 *  5. Linha simples 4 batidas → 2 pares
 *  6. Batidas com asterisco "*" → remove * e mantém HH:MM
 *  7. "--" + RESULTADO com FERIADO → marcacoes=[], ocorrencia FERIADO,
 *     APURAÇÃO ENTRA (crítico p/ dispatcher merge)
 *  8. "--" + Licença médica → marcacoes=[], ocorrencia LICENCA_MEDICA
 *  9. Desconsiderado em AJUSTES → remove batida correspondente (string-match)
 * 10. 6 batidas (3 ciclos) → 3 pares
 * 11. RESULTADO com totalizadores ("Horas Trabalhadas: 07:25") NÃO vira batida
 * 12. Dedup por data dentro do mapper (mesma data em 2 tabelas)
 * 13. Mapeamento Opção b ajustada — Abono Autorizado → AFASTAMENTO + obs
 * 14. PROBLEMAS_RELOGIO condicional (com batidas → NORMAL, sem → AFASTAMENTO)
 */

import { describe, expect, it } from "vitest";
import { mapperCartaoViaVarejoMinha } from "../../../../../../supabase/functions/_shared/mappers/cartao-ponto-via-varejo-minha";
import type {
  CelulaTabular,
  DocumentoTabular,
  TabelaDetectada,
} from "../../../../../../supabase/functions/_shared/documento-tabular";

function celula(texto: string, coluna: number): CelulaTabular {
  return { texto, coluna, fragmentos: [] };
}

function tab(
  headers: string[],
  linhas: string[][],
): TabelaDetectada {
  return {
    bbox: { x0: 0, y0: 0, x1: 100, y1: 100 },
    headers,
    linhas: linhas.map((l) => l.map((t, i) => celula(t, i))),
  };
}

function docMinha(opts: {
  texto?: string;
  tabelas?: TabelaDetectada[];
}): DocumentoTabular {
  const texto =
    opts.texto ??
    `ESPELHO DE PONTO
VIA S/A
CGC 33.041.260/0501-88`;
  const tabelas = opts.tabelas ?? [];
  return {
    textoCompleto: texto,
    numeroPaginas: 1,
    paginas: [
      {
        numero: 1,
        textos: [],
        tabelas,
        textoPlano: texto,
      },
    ],
    extractor: "pdfjs_geometric",
    qualidade: { score: 0.95, razao: "sintético minha" },
  };
}

// ============================================================================
// Detector
// ============================================================================

describe("mapperCartaoViaVarejoMinha — detector", () => {
  it("ESPELHO + Via Varejo (CGC + razão) + tabela → aplica=true, score alto", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["16/06/2021 - Qua", "11:35 14:11 15:11 20:00", "", "Horas Trabalhadas : 07:25"]],
    );
    const det = mapperCartaoViaVarejoMinha.detectar(docMinha({ tabelas: [t] }));
    expect(det.aplica).toBe(true);
    expect(det.score).toBeGreaterThan(0.5);
    expect(det.motivos.join(" ")).toMatch(/ESPELHO/i);
    expect(det.motivos.join(" ")).toMatch(/VIA\s+S\/A/i);
    expect(det.motivos.join(" ")).toMatch(/tabela/i);
  });

  it("sem ESPELHO → aplica=false", () => {
    const det = mapperCartaoViaVarejoMinha.detectar(
      docMinha({
        texto: "CARTÃO DE PONTO\nVIA S/A\nCGC 33.041.260/0501-88",
      }),
    );
    expect(det.aplica).toBe(false);
  });

  it("ESPELHO sem tabela espelho → score reduzido (ainda pode aplicar por sinais textuais)", () => {
    const det = mapperCartaoViaVarejoMinha.detectar(
      docMinha({
        texto: `ESPELHO DE PONTO\nVIA S/A\nCGC 33.041.260/0501-88`,
        tabelas: [],
      }),
    );
    // ESPELHO(2) + CGC(2) + VIA S/A(2) = 6 — sem bônus de tabela (2).
    expect(det.aplica).toBe(true);
    expect(det.score).toBeLessThan(1);
  });

  it("isTabelaEspelho aceita headers em ordem variável (BATIDAS antes de DATA)", () => {
    const t = tab(
      ["BATIDAS", "DATA", "RESULTADO"],
      [["11:35 14:11 15:11 20:00", "16/06/2021 - Qua", "Horas Trabalhadas : 07:25"]],
    );
    const det = mapperCartaoViaVarejoMinha.detectar(docMinha({ tabelas: [t] }));
    expect(det.aplica).toBe(true);
    // Mapear também deve funcionar — indices localizados por nome.
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes).toHaveLength(1);
    expect(res!.apuracoes[0].marcacoes).toEqual([
      { e: "11:35", s: "14:11" },
      { e: "15:11", s: "20:00" },
    ]);
  });
});

// ============================================================================
// Mapeamento
// ============================================================================

describe("mapperCartaoViaVarejoMinha — mapeamento básico", () => {
  it("linha simples (4 batidas) → 2 pares", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["16/06/2021 - Qua", "11:35 14:11 15:11 20:00", "", "Horas Trabalhadas : 07:25"]],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes[0].data).toBe("2021-06-16");
    expect(res!.apuracoes[0].dia_semana).toBe("QUA");
    expect(res!.apuracoes[0].ocorrencia).toBe("NORMAL");
    expect(res!.apuracoes[0].marcacoes).toEqual([
      { e: "11:35", s: "14:11" },
      { e: "15:11", s: "20:00" },
    ]);
  });

  it("batidas com asterisco (ajuste manual) → mantém HH:MM sem o *", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["24/06/2021 - Qui", "11:40* 13:00* 20:01", "11:40 - Inserido | 13:00 - Inserido", ""]],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes[0].marcacoes).toEqual([
      { e: "11:40", s: "13:00" },
      { e: "20:01", s: "" },
    ]);
  });

  it("6 batidas (3 ciclos E/S) → 3 pares", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["17/06/2021 - Qui", "11:46 14:42 15:42 20:18 20:25 20:43", "", "Horas Trabalhadas : 08:00"]],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes[0].marcacoes).toEqual([
      { e: "11:46", s: "14:42" },
      { e: "15:42", s: "20:18" },
      { e: "20:25", s: "20:43" },
    ]);
  });

  it("totalizadores na coluna RESULTADO NUNCA viram batida", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [
        [
          "16/06/2021 - Qua",
          "11:35 14:11 15:11 20:00",
          "",
          "Horas Trabalhadas : 07:25 Horas Previstas : 07:20 Banco de Horas 60% : 00:25",
        ],
      ],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    // Marcações têm exatamente as 4 batidas do BATIDAS — nenhum 07:25/07:20/00:25
    const todasHoras = res!.apuracoes[0].marcacoes.flatMap((m) => [m.e, m.s]);
    expect(todasHoras).not.toContain("07:25");
    expect(todasHoras).not.toContain("07:20");
    expect(todasHoras).not.toContain("00:25");
    expect(res!.apuracoes[0].marcacoes).toEqual([
      { e: "11:35", s: "14:11" },
      { e: "15:11", s: "20:00" },
    ]);
  });
});

describe("mapperCartaoViaVarejoMinha — Desconsiderado (string-match, não index)", () => {
  it("BATIDAS '11:48 11:57' + AJUSTES 'Desconsiderado' nas duas → marcacoes=[]", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [
        [
          "20/06/2021 - Dom",
          "11:48 11:57",
          "11:48 - Desconsiderado | 11:57 - Desconsiderado",
          "DSR Semanal (dias) : 1",
        ],
      ],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes[0].marcacoes).toEqual([]);
    expect(res!.apuracoes[0].ocorrencia).toBe("DSR");
  });

  it("BATIDAS '11:48 11:57 14:00 18:00' + AJUSTES desconsidera só '11:48' → mantém '11:57 14:00 18:00'", () => {
    // Garante que o match é por STRING (HH:MM), não por index — remove a
    // batida específica mesmo que ela não seja a primeira/última.
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [
        [
          "21/06/2021 - Seg",
          "11:48 11:57 14:00 18:00",
          "11:48 - Desconsiderado",
          "",
        ],
      ],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes[0].marcacoes).toEqual([
      { e: "11:57", s: "14:00" },
      { e: "18:00", s: "" },
    ]);
  });
});

describe("mapperCartaoViaVarejoMinha — `--` em BATIDAS gera apuração (crítico p/ merge)", () => {
  it("'--' + RESULTADO FERIADO → marcacoes=[] + ocorrencia FERIADO + ENTRA em apuracoes", () => {
    // Crítico: PDF híbrido (Izabela) pode ter mesma data com '--' no Minha e
    // 4 batidas no Antigo. O Minha PRECISA pushar pra o dispatcher merge
    // poder substituir com os dados do Antigo (que tem mais batidas).
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["25/06/2021 - Sex", "--", "", "HE Com Feriado 100% : 00:00 FERIADO (dias) : 1"]],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes).toHaveLength(1); // ENTRA, não vira continue
    expect(res!.apuracoes[0].marcacoes).toEqual([]);
    expect(res!.apuracoes[0].ocorrencia).toBe("FERIADO");
  });

  it("'--' + Licença médica → marcacoes=[] + ocorrencia LICENCA_MEDICA + ENTRA", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["27/06/2021 - Dom", "--", "", "Horas Previstas : 07:20 Licença médica : 07:20"]],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes).toHaveLength(1);
    expect(res!.apuracoes[0].ocorrencia).toBe("LICENCA_MEDICA");
  });
});

describe("mapperCartaoViaVarejoMinha — mapeamento Opção b dos 6 slugs novos", () => {
  it("Abono Autorizado → AFASTAMENTO + observacao 'Abono autorizado'", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["30/06/2021 - Qua", "--", "", "Horas Previstas : 07:20 Abono Autorizado : 07:20"]],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes[0].ocorrencia).toBe("AFASTAMENTO");
    expect(res!.apuracoes[0].observacao).toBe("Abono autorizado");
  });

  it("Problemas Relogio CONDICIONAL — com batidas → NORMAL", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["28/06/2021 - Seg", "11:40* 13:00* 14:00 20:01", "11:40 - Inserido | 13:00 - Inserido", "Problemas Relogio : 06:00"]],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes[0].ocorrencia).toBe("NORMAL");
    expect(res!.apuracoes[0].observacao).toBe("Problemas relogio");
    expect(res!.apuracoes[0].marcacoes.length).toBeGreaterThan(0);
  });

  it("Problemas Relogio CONDICIONAL — sem batidas (--) → AFASTAMENTO", () => {
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["29/06/2021 - Ter", "--", "", "Problemas Relogio : 07:20"]],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    expect(res!.apuracoes[0].ocorrencia).toBe("AFASTAMENTO");
    expect(res!.apuracoes[0].observacao).toBe("Problemas relogio");
    expect(res!.apuracoes[0].marcacoes).toEqual([]);
  });
});

describe("mapperCartaoViaVarejoMinha — cap defensivo de 6 batidas", () => {
  it("8 batidas na célula (bug de parsing concatenado) → trunca pra 6 + warning", () => {
    // Cenário patológico: BATIDAS pega texto de coluna adjacente por bug
    // de clusterização. Cap defensivo evita estourar coluna PJe-Calc.
    const t = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["18/06/2021 - Sex", "08:00 12:00 13:00 17:00 18:00 19:00 20:00 21:00", "", ""]],
    );
    const res = mapperCartaoViaVarejoMinha.mapear(docMinha({ tabelas: [t] }));
    expect(res).not.toBeNull();
    // Trunca pras 6 primeiras
    expect(res!.apuracoes[0].marcacoes.length).toBe(3); // 6 horas → 3 pares
    expect(res!.apuracoes[0].marcacoes[0]).toEqual({ e: "08:00", s: "12:00" });
    expect(res!.apuracoes[0].marcacoes[2]).toEqual({ e: "18:00", s: "19:00" });
    // Warning emitido com a data e contagem original
    expect(res!.warnings.some((w) => /2021-06-18/.test(w) && /8 batidas/.test(w))).toBe(true);
  });
});

describe("mapperCartaoViaVarejoMinha — dedup por data", () => {
  it("mesma data em 2 tabelas → 1 apuração, prevalece a com mais batidas", () => {
    const t1 = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["16/06/2021 - Qua", "--", "", "DSR Semanal (dias) : 1"]],
    );
    const t2 = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["16/06/2021 - Qua", "11:35 14:11 15:11 20:00", "", "Horas Trabalhadas : 07:25"]],
    );
    const doc: DocumentoTabular = {
      textoCompleto: "ESPELHO DE PONTO\nVIA S/A\nCGC 33.041.260/0501-88",
      numeroPaginas: 2,
      paginas: [
        { numero: 1, textos: [], tabelas: [t1], textoPlano: "" },
        { numero: 2, textos: [], tabelas: [t2], textoPlano: "" },
      ],
      extractor: "pdfjs_geometric",
      qualidade: { score: 0.95, razao: "dedup test" },
    };
    const res = mapperCartaoViaVarejoMinha.mapear(doc);
    expect(res).not.toBeNull();
    expect(res!.apuracoes).toHaveLength(1);
    expect(res!.apuracoes[0].marcacoes.length).toBe(2); // 2 pares (4 batidas)
  });
});
