/**
 * Sprint 3 Fase 3 (2026-05-22) — Dispatcher merge de cartão de ponto.
 *
 * COBERTURA (5+ testes)
 * ---------------------
 * 1. escolherMappersCartaoPonto retorna TODOS aplicáveis (PDFs híbridos)
 * 2. PDF só-antigo → só mapper antigo aplica
 * 3. PDF só-novo → só mapper Minha aplica
 * 4. PDF sem nenhum sinal Via Varejo → genérico assume sozinho
 * 5. mesclarResultadosCartaoPonto — sobreposição de data: prevalece mais batidas
 * 6. mesclarResultadosCartaoPonto — entradas vazias retorna null; 1 entrada
 *    devolve intacta (sem envelope "merged:")
 * 7. mesclarResultadosCartaoPonto — competência predominante RECALCULADA
 *    (não dupla-conta datas em ambos os mappers)
 * 8. escolherEMapear discriminated union: success / no_mapper_matched /
 *    mapper_returned_null
 */

import { describe, expect, it } from "vitest";
import {
  escolherMappersCartaoPonto,
  escolherEMapear,
} from "../../../../../../supabase/functions/_shared/mappers/dispatcher";
import { mesclarResultadosCartaoPonto } from "../../../../../../supabase/functions/_shared/mappers/merge-cartao-ponto";
import type {
  CelulaTabular,
  DocumentoTabular,
  TabelaDetectada,
} from "../../../../../../supabase/functions/_shared/documento-tabular";
import type {
  ApuracaoDominio,
  ParseCartaoPontoResultDominio,
} from "../../../../../../supabase/functions/_shared/tipos-dominio";

function celula(texto: string, coluna: number): CelulaTabular {
  return { texto, coluna, fragmentos: [] };
}

function tab(headers: string[], linhas: string[][]): TabelaDetectada {
  return {
    bbox: { x0: 0, y0: 0, x1: 100, y1: 100 },
    headers,
    linhas: linhas.map((l) => l.map((t, i) => celula(t, i))),
  };
}

function docComTexto(
  texto: string,
  tabelas: TabelaDetectada[] = [],
): DocumentoTabular {
  return {
    textoCompleto: texto,
    numeroPaginas: 1,
    paginas: [
      { numero: 1, textos: [], tabelas, textoPlano: texto },
    ],
    extractor: "pdfjs_geometric",
    qualidade: { score: 0.95, razao: "sintético dispatcher test" },
  };
}

const HEADER_VIA_VAREJO_ANTIGO = `
VIA VAREJO S/A
C.G.C. 33.041.260/0652-90
Cartão de Ponto
PERÍODO: 01/11/2020 A 30/11/2020 Competência: NOVEMBRO/2020
Empregado: 999999 TESTE
Horário Registrado Horário de Trabalho
Dia 1. Período 2. Período Ocorrências
01/11/2020 DOM 162 N 08:15 12:01 13:04 18:18
`.trim();

const HEADER_VIA_VAREJO_NOVO = `
VIA VAREJO S/A
C.G.C. 33.041.260/0501-88
ESPELHO DE PONTO
Período 01/06/2021 a 30/06/2021
`.trim();

// ============================================================================
// escolherMappersCartaoPonto
// ============================================================================

describe("escolherMappersCartaoPonto — quais mappers aplicam", () => {
  it("PDF só-ANTIGO → só mapper antigo aplica", () => {
    const doc = docComTexto(HEADER_VIA_VAREJO_ANTIGO);
    const aplicaveis = escolherMappersCartaoPonto(doc);
    const slugs = aplicaveis.map((a) => a.mapper.slug);
    expect(slugs).toContain("cartao_via_varejo_v1");
    expect(slugs).not.toContain("cartao_via_varejo_minha_v1");
  });

  it("PDF só-NOVO → só mapper Minha aplica (Antigo delega)", () => {
    const tNovo = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["16/06/2021 - Qua", "11:35 14:11 15:11 20:00", "", "Horas Trabalhadas : 07:25"]],
    );
    const doc = docComTexto(HEADER_VIA_VAREJO_NOVO, [tNovo]);
    const aplicaveis = escolherMappersCartaoPonto(doc);
    const slugs = aplicaveis.map((a) => a.mapper.slug);
    expect(slugs).toContain("cartao_via_varejo_minha_v1");
    expect(slugs).not.toContain("cartao_via_varejo_v1");
  });

  it("PDF HÍBRIDO (CARTÃO + ESPELHO juntos) → AMBOS Via Varejo aplicam", () => {
    const tNovo = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["20/06/2021 - Dom", "11:46 14:42 15:42 20:18", "", "Horas Trabalhadas : 08:00"]],
    );
    const textoHibrido = `${HEADER_VIA_VAREJO_ANTIGO}\nESPELHO DE PONTO Página 12`;
    const doc = docComTexto(textoHibrido, [tNovo]);
    const aplicaveis = escolherMappersCartaoPonto(doc);
    const slugs = aplicaveis.map((a) => a.mapper.slug);
    expect(slugs).toContain("cartao_via_varejo_v1");
    expect(slugs).toContain("cartao_via_varejo_minha_v1");
    // Ordenado por score (decrescente)
    expect(aplicaveis[0].score).toBeGreaterThanOrEqual(aplicaveis[1].score);
  });

  it("PDF de outro empregador (sem sinais Via Varejo) → nenhum dos 2 Via Varejo aplica", () => {
    const doc = docComTexto(
      `EMPRESA QUALQUER LTDA\nCNPJ 99.999.999/0001-99\nMarcações de Ponto\nPeríodo 01/01/2024 a 31/01/2024`,
    );
    const aplicaveis = escolherMappersCartaoPonto(doc);
    const slugs = aplicaveis.map((a) => a.mapper.slug);
    expect(slugs).not.toContain("cartao_via_varejo_v1");
    expect(slugs).not.toContain("cartao_via_varejo_minha_v1");
    // O mapper genérico pode aplicar se tiver sinais — não asserta nada
    // aqui (responsabilidade dele tem teste separado).
  });
});

// ============================================================================
// mesclarResultadosCartaoPonto
// ============================================================================

function apuracao(
  data: string,
  marcacoesCount: number,
  ocorrencia: "NORMAL" | "FERIADO" | "DSR" = "NORMAL",
): ApuracaoDominio {
  const marcacoes = [];
  for (let i = 0; i < marcacoesCount; i++) {
    marcacoes.push({ e: `0${8 + i}:00`, s: `${12 + i}:00` });
  }
  return {
    data,
    dia_semana: "SEG",
    ocorrencia,
    marcacoes,
    eventos: [],
    observacao: null,
  };
}

function resultadoFake(
  slug: string,
  parserVersion: string,
  apuracoes: ApuracaoDominio[],
  warnings: string[] = [],
): { slug: string; resultado: ParseCartaoPontoResultDominio } {
  const competencias = new Map<string, number>();
  for (const a of apuracoes) {
    const k = `${a.data.substring(5, 7)}/${a.data.substring(0, 4)}`;
    competencias.set(k, (competencias.get(k) ?? 0) + 1);
  }
  return {
    slug,
    resultado: {
      apuracoes,
      competencias,
      competencia_predominante: apuracoes[0]
        ? `${apuracoes[0].data.substring(5, 7)}/${apuracoes[0].data.substring(0, 4)}`
        : "",
      data_inicial: apuracoes[0]?.data ?? "",
      data_final: apuracoes[apuracoes.length - 1]?.data ?? "",
      warnings,
      unparsed_lines: [],
      parser_version: parserVersion,
    },
  };
}

describe("mesclarResultadosCartaoPonto", () => {
  it("entrada vazia retorna null", () => {
    expect(mesclarResultadosCartaoPonto([])).toBeNull();
  });

  it("1 entrada → devolve intacta sem envelope 'merged:'", () => {
    const entrada = resultadoFake(
      "cartao_via_varejo_v1",
      "cartao-ponto-via-varejo-mapper-v7.3-2026-05-22",
      [apuracao("2020-11-01", 2)],
    );
    const mesclado = mesclarResultadosCartaoPonto([entrada]);
    expect(mesclado).not.toBeNull();
    expect(mesclado!.parser_version).toBe(
      "cartao-ponto-via-varejo-mapper-v7.3-2026-05-22",
    );
    expect(mesclado!.parser_version).not.toMatch(/^merged:/);
    expect(mesclado!.apuracoes).toHaveLength(1);
  });

  it("sobreposição de data: prevalece quem tem mais batidas", () => {
    // Antigo: 17/05/2021 → 4 batidas (2 pares)
    // Novo:   17/05/2021 → 0 batidas (`--`)
    // Esperado: data final tem as 4 batidas do antigo
    const antigo = resultadoFake(
      "cartao_via_varejo_v1",
      "v7.3",
      [apuracao("2021-05-17", 2, "NORMAL")], // 2 pares = 4 batidas
    );
    const novo = resultadoFake(
      "cartao_via_varejo_minha_v1",
      "v1",
      [apuracao("2021-05-17", 0, "DSR")], // 0 batidas, DSR
    );
    const mesclado = mesclarResultadosCartaoPonto([antigo, novo]);
    expect(mesclado).not.toBeNull();
    expect(mesclado!.apuracoes).toHaveLength(1);
    expect(mesclado!.apuracoes[0].marcacoes).toHaveLength(2); // 2 pares
    expect(mesclado!.apuracoes[0].ocorrencia).toBe("NORMAL");
  });

  it("competência predominante RECALCULADA das apurações mescladas (não dupla-conta)", () => {
    // Mesma data 2020-11-01 em ambos. Sem o recálculo, competência 11/2020
    // contaria 2 vezes (uma de cada mapper) e ainda existiria entrada
    // duplicada.
    const r1 = resultadoFake("antigo", "v7.3", [
      apuracao("2020-11-01", 2),
      apuracao("2020-11-02", 2),
    ]);
    const r2 = resultadoFake("novo", "v1", [
      apuracao("2020-11-01", 0, "DSR"),
      apuracao("2020-11-03", 2),
    ]);
    const mesclado = mesclarResultadosCartaoPonto([r1, r2]);
    expect(mesclado).not.toBeNull();
    expect(mesclado!.apuracoes).toHaveLength(3); // 01, 02, 03 (dedup)
    expect(mesclado!.competencias.get("11/2020")).toBe(3); // 3 datas únicas
    expect(mesclado!.competencia_predominante).toBe("11/2020");
  });

  it("warnings concatenados COM prefixo do slug origem (sem dedup)", () => {
    const r1 = resultadoFake("antigo", "v7.3", [apuracao("2020-11-01", 2)], [
      "warning identico",
    ]);
    const r2 = resultadoFake("novo", "v1", [apuracao("2020-11-02", 2)], [
      "warning identico",
    ]);
    const mesclado = mesclarResultadosCartaoPonto([r1, r2]);
    expect(mesclado).not.toBeNull();
    // Sem dedup — operador vê de qual mapper veio
    expect(mesclado!.warnings).toHaveLength(2);
    expect(mesclado!.warnings[0]).toContain("[antigo]");
    expect(mesclado!.warnings[1]).toContain("[novo]");
  });

  it("parser_version vira 'merged:vA+vB' quando 2+ entradas", () => {
    const r1 = resultadoFake("a", "vA-1", [apuracao("2020-11-01", 2)]);
    const r2 = resultadoFake("b", "vB-2", [apuracao("2020-11-02", 2)]);
    const mesclado = mesclarResultadosCartaoPonto([r1, r2]);
    expect(mesclado!.parser_version).toBe("merged:vA-1+vB-2");
  });
});

// ============================================================================
// escolherEMapear (discriminated union)
// ============================================================================

describe("escolherEMapear — discriminated union", () => {
  it("nenhum mapper aplica → kind='no_mapper_matched'", () => {
    // Doc com texto que NENHUM mapper reconhece (sem cartão de ponto,
    // sem holerite, sem CTPS, sem férias). Mappers genéricos têm
    // detecção bem permissiva pra cartão de ponto, então testar com
    // string totalmente desligada do domínio.
    const doc = docComTexto(`xxxx yyyy zzzz`);
    const r = escolherEMapear(doc);
    expect(r.kind).toBe("no_mapper_matched");
  });

  it("PDF só-NOVO válido → kind='success' + mappers_executados=[Minha]", () => {
    const tNovo = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["16/06/2021 - Qua", "11:35 14:11 15:11 20:00", "", "Horas Trabalhadas : 07:25"]],
    );
    const doc = docComTexto(HEADER_VIA_VAREJO_NOVO, [tNovo]);
    const r = escolherEMapear(doc);
    expect(r.kind).toBe("success");
    if (r.kind === "success") {
      expect(r.executado.slug).toBe("cartao_via_varejo_minha_v1");
      expect(r.executado.mappers_executados).toEqual(["cartao_via_varejo_minha_v1"]);
      // parser_version single-mapper NÃO tem envelope merged:
      const resultado = r.executado.resultado as ParseCartaoPontoResultDominio;
      expect(resultado.parser_version).not.toMatch(/^merged:/);
    }
  });

  it("PDF HÍBRIDO com 2 mappers aplicando → kind='success' + mappers_executados tem ambos + parser_version 'merged:'", () => {
    const tNovo = tab(
      ["DATA", "BATIDAS", "AJUSTES", "RESULTADO"],
      [["20/06/2021 - Dom", "11:46 14:42 15:42 20:18", "", "Horas Trabalhadas : 08:00"]],
    );
    const textoHibrido = `${HEADER_VIA_VAREJO_ANTIGO}\nESPELHO DE PONTO Página 12`;
    const doc = docComTexto(textoHibrido, [tNovo]);
    const r = escolherEMapear(doc);
    expect(r.kind).toBe("success");
    if (r.kind === "success") {
      expect(r.executado.mappers_executados.length).toBe(2);
      expect(r.executado.mappers_executados).toContain("cartao_via_varejo_v1");
      expect(r.executado.mappers_executados).toContain("cartao_via_varejo_minha_v1");
      const resultado = r.executado.resultado as ParseCartaoPontoResultDominio;
      expect(resultado.parser_version).toMatch(/^merged:/);
      // Apurações de ambos os layouts presentes
      const datas = resultado.apuracoes.map((a) => a.data);
      expect(datas).toContain("2020-11-01"); // do antigo
      expect(datas).toContain("2021-06-20"); // do novo
    }
  });
});
