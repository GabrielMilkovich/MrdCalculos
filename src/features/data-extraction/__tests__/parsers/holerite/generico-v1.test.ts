import { describe, expect, it } from "vitest";
import { parseHolerite } from "../../../parsers/holerite";
import {
  classificarColunas,
  dedupRubricasRepetidas,
  detectarTotalBruto,
  eLinhaBase,
} from "../../../parsers/holerite/layouts/generico-v1";
import type { RubricaParseada } from "../../../parsers/holerite/types";

describe("layoutGenericoV1 — competência", () => {
  it("REFERÊNCIA com formato MM/AAAA", () => {
    const text = `
      RECIBO DE PAGAMENTO
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.competencia).toBe("03/2024");
  });

  it("REFERÊNCIA com formato MMM/AAAA (JAN, FEV...)", () => {
    const text = `
      RECIBO DE PAGAMENTO
      REFERÊNCIA: AGO/2016
      0001 SALARIO BASE  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.competencia).toBe("08/2016");
  });

  it("Sem REFERÊNCIA, pega MM/AAAA do cabeçalho", () => {
    const text = `
      Folha 03/2024 — Empregado X
      0001 SALARIO BASE  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.competencia).toBe("03/2024");
  });

  it("Sem competência detectável → 00/0000 + warning", () => {
    const text = "0001 SALARIO BASE  3.500,00";
    const r = parseHolerite(text);
    expect(r.competencia).toBe("00/0000");
    expect(r.warnings.some((w) => /compet/i.test(w))).toBe(true);
  });
});

describe("layoutGenericoV1 — rubricas com código", () => {
  it("Linha 'CCCC NOME VALOR' captura corretamente", () => {
    const text = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE        3.500,00
      0620 COMISSOES           1.158,82
      0501 DSR SOBRE COMISSOES   272,64
    `;
    const r = parseHolerite(text);
    expect(r.rubricas).toHaveLength(3);
    expect(r.rubricas[0].codigo).toBe("0001");
    expect(r.rubricas[0].nome).toBe("SALARIO BASE");
    expect(r.rubricas[0].valor_vencimento).toBeCloseTo(3500, 2);
    expect(r.rubricas[1].codigo).toBe("0620");
    expect(r.rubricas[1].valor_vencimento).toBeCloseTo(1158.82, 2);
  });

  it("Linha com 2 valores (vencimento + desconto)", () => {
    const text = `
      REFERÊNCIA: 03/2024
      5560 INSS                188,77    188,77
    `;
    const r = parseHolerite(text);
    expect(r.rubricas).toHaveLength(1);
    expect(r.rubricas[0].codigo).toBe("5560");
    expect(r.rubricas[0].valor_vencimento).toBeCloseTo(188.77, 2);
    expect(r.rubricas[0].valor_desconto).toBeCloseTo(188.77, 2);
  });
});

describe("layoutGenericoV1 — formato BR de valores", () => {
  it("Valor com separador de milhar BR", () => {
    const text = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  12.345,67
    `;
    const r = parseHolerite(text);
    expect(r.rubricas[0].valor_vencimento).toBeCloseTo(12345.67, 2);
  });

  it("Valor sem milhar (3 dígitos)", () => {
    const text = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE  500,00
    `;
    const r = parseHolerite(text);
    expect(r.rubricas[0].valor_vencimento).toBeCloseTo(500, 2);
  });
});

describe("layoutGenericoV1 — sem rubricas", () => {
  it("Texto sem valores → rubricas=[] + warning", () => {
    const text = `
      REFERÊNCIA: 03/2024
      Texto bobagem sem valores.
    `;
    const r = parseHolerite(text);
    expect(r.rubricas).toHaveLength(0);
    expect(r.warnings.some((w) => /rubrica/i.test(w))).toBe(true);
  });
});

describe("layoutGenericoV1 — layout_usado", () => {
  it("Sempre retorna 'generico_v1'", () => {
    const r = parseHolerite("REFERÊNCIA: 03/2024\n0001 X 100,00");
    expect(r.layout_usado).toBe("generico_v1");
  });
});

// ===================================================================
// F0.2 — Regras estruturais (bases, quantidade, dedup, cross-validation)
// ===================================================================

describe("F0.2 — eLinhaBase()", () => {
  it("identifica Base IR / IRRF / INSS / FGTS / FGTS Rescisão", () => {
    expect(eLinhaBase("Base IR")).toBe(true);
    expect(eLinhaBase("Base IRRF")).toBe(true);
    expect(eLinhaBase("Base INSS")).toBe(true);
    expect(eLinhaBase("Base FGTS")).toBe(true);
    expect(eLinhaBase("Base FGTS Rescisão")).toBe(true);
    expect(eLinhaBase("Base de Cálculo IR")).toBe(true);
    expect(eLinhaBase("Base de Calculo INSS")).toBe(true);
    expect(eLinhaBase("BASE IR")).toBe(true);
  });

  it("NÃO confunde rubricas reais com bases", () => {
    expect(eLinhaBase("Salário Base")).toBe(false);
    expect(eLinhaBase("Salario Fixo")).toBe(false);
    expect(eLinhaBase("Comissões")).toBe(false);
    expect(eLinhaBase("INSS")).toBe(false);
    expect(eLinhaBase("IRRF")).toBe(false);
    expect(eLinhaBase("FGTS")).toBe(false);
  });
});

describe("F0.2 — classificarColunas()", () => {
  it("1 valor → vencimento", () => {
    expect(classificarColunas(["3.500,00"])).toEqual({
      quantidade: null,
      valor_vencimento: 3500,
      valor_desconto: null,
    });
  });

  it("2 valores diferentes pequenos → quantidade + vencimento (HORAS EXTRAS 0,92h R$ 12,34)", () => {
    const r = classificarColunas(["0,92", "12,34"]);
    expect(r.quantidade).toBeCloseTo(0.92, 2);
    expect(r.valor_vencimento).toBeCloseTo(12.34, 2);
    expect(r.valor_desconto).toBeNull();
  });

  it("2 valores grandes diferentes → vencimento + desconto", () => {
    const r = classificarColunas(["1.500,00", "200,00"]);
    expect(r.quantidade).toBeNull();
    expect(r.valor_vencimento).toBeCloseTo(1500, 2);
    expect(r.valor_desconto).toBeCloseTo(200, 2);
  });

  it("2 valores IGUAIS → vencimento + desconto (espelho INSS), NÃO quantidade", () => {
    const r = classificarColunas(["188,77", "188,77"]);
    expect(r.quantidade).toBeNull();
    expect(r.valor_vencimento).toBeCloseTo(188.77, 2);
    expect(r.valor_desconto).toBeCloseTo(188.77, 2);
  });

  it("Primeiro valor com separador de milhar NÃO é quantidade", () => {
    const r = classificarColunas(["1.234,00", "500,00"]);
    expect(r.quantidade).toBeNull();
    expect(r.valor_vencimento).toBeCloseTo(1234, 2);
    expect(r.valor_desconto).toBeCloseTo(500, 2);
  });

  it("3 valores → (quantidade, vencimento, desconto)", () => {
    const r = classificarColunas(["220,00", "1.500,00", "0,00"]);
    expect(r.quantidade).toBeCloseTo(220, 2);
    expect(r.valor_vencimento).toBeCloseTo(1500, 2);
    expect(r.valor_desconto).toBeCloseTo(0, 2);
  });

  it("0 valores → tudo null", () => {
    expect(classificarColunas([])).toEqual({
      quantidade: null,
      valor_vencimento: null,
      valor_desconto: null,
    });
  });
});

describe("F0.2 — dedupRubricasRepetidas()", () => {
  function r(
    codigo: string | null,
    nome: string,
    venc: number | null,
    desc: number | null,
    ordem: number,
  ): RubricaParseada {
    return {
      codigo,
      nome,
      valor_vencimento: venc,
      valor_desconto: desc,
      quantidade: null,
      ordem,
    };
  }

  it("Empréstimo aparecendo 6× é deduplicado para 1", () => {
    const rubricas = Array.from({ length: 6 }, (_, i) =>
      r("8000", "Empréstimo Lei", null, 251.18, i),
    );
    const out = dedupRubricasRepetidas(rubricas);
    expect(out.unicas).toHaveLength(1);
    expect(out.removidas).toBe(5);
  });

  it("Rubricas distintas NÃO são deduplicadas", () => {
    const rubricas = [
      r("0001", "Salario Base", 3500, null, 0),
      r("0620", "Comissoes", 1158.82, null, 1),
      r("5560", "INSS", null, 188.77, 2),
    ];
    const out = dedupRubricasRepetidas(rubricas);
    expect(out.unicas).toHaveLength(3);
    expect(out.removidas).toBe(0);
  });

  it("Mesmo nome com valores diferentes NÃO dedupa (parcelas distintas)", () => {
    const rubricas = [
      r("8000", "Empréstimo", null, 100, 0),
      r("8000", "Empréstimo", null, 200, 1),
    ];
    const out = dedupRubricasRepetidas(rubricas);
    expect(out.unicas).toHaveLength(2);
    expect(out.removidas).toBe(0);
  });

  it("Normaliza espaços e case na comparação", () => {
    const rubricas = [
      r("0001", "Salario  Base", 3500, null, 0),
      r("0001", "SALARIO BASE", 3500, null, 1),
    ];
    const out = dedupRubricasRepetidas(rubricas);
    expect(out.unicas).toHaveLength(1);
    expect(out.removidas).toBe(1);
  });
});

describe("F0.2 — detectarTotalBruto()", () => {
  it("captura 'Total Bruto R$ 6.021,83'", () => {
    const t = "Total Bruto: 6.021,83";
    const out = detectarTotalBruto(t);
    expect(out?.toFixed(2)).toBe("6021.83");
  });

  it("captura 'Total Vencimentos 3.500,00'", () => {
    const t = "Total Vencimentos    3.500,00";
    const out = detectarTotalBruto(t);
    expect(out?.toFixed(2)).toBe("3500.00");
  });

  it("captura 'Proventos: 1.234,56'", () => {
    const t = "Proventos: 1.234,56";
    const out = detectarTotalBruto(t);
    expect(out?.toFixed(2)).toBe("1234.56");
  });

  it("retorna null se nenhum padrão casa", () => {
    expect(detectarTotalBruto("xyz sem total")).toBeNull();
  });
});

// ===================================================================
// Fixtures sintéticas reproduzindo bugs juridicamente graves de produção
// ===================================================================

describe("F0.2 — fixture: holerite com bases de cálculo", () => {
  // Reproduz screenshot de produção: Base IR R$ 2.125,78 sendo somada
  // como rubrica (vira "Salário Fixo"), gerando total absurdo.
  const ocrComBases = `
    DEMONSTRATIVO DE PAGAMENTO
    REFERÊNCIA: 03/2024
    0001 SALARIO BASE        3.500,00
    0620 COMISSOES           1.158,82
    0501 DSR S COMISSOES       272,64
    9001 Base IR             2.125,78
    9002 Base INSS           4.931,46
    9003 Base FGTS           4.931,46
    Total Bruto              4.931,46
  `;

  it("exclui TODAS as bases das rubricas", () => {
    const r = parseHolerite(ocrComBases);
    const nomes = r.rubricas.map((x) => x.nome.toLowerCase());
    expect(nomes.some((n) => n.startsWith("base "))).toBe(false);
  });

  it("emite warning sobre bases excluídas", () => {
    const r = parseHolerite(ocrComBases);
    expect(r.warnings.some((w) => /base/i.test(w))).toBe(true);
  });

  it("soma de vencimentos NÃO excede Total Bruto", () => {
    const r = parseHolerite(ocrComBases);
    const soma = r.rubricas.reduce(
      (acc, x) => acc + (x.valor_vencimento ?? 0),
      0,
    );
    expect(soma).toBeLessThanOrEqual(4931.46 * 1.05);
  });
});

describe("F0.2 — fixture: holerite com quantidade", () => {
  const ocrComQtde = `
    REFERÊNCIA: 03/2024
    0001 SALARIO BASE                  3.500,00
    0900 HORAS EXTRAS              0,92    12,34
  `;

  it("identifica 0,92 como quantidade e 12,34 como vencimento", () => {
    const r = parseHolerite(ocrComQtde);
    const horas = r.rubricas.find((x) => /HORAS EXTRAS/i.test(x.nome));
    expect(horas).toBeDefined();
    expect(horas!.quantidade).toBeCloseTo(0.92, 2);
    expect(horas!.valor_vencimento).toBeCloseTo(12.34, 2);
  });
});

describe("F0.2 — fixture: holerite com histórico de empréstimo (6×)", () => {
  // Reproduz screenshot: Empréstimo Lei R$ 251,18 listado 6× (uma por
  // mês de competência), inflando o total.
  const ocrComHistorico = `
    REFERÊNCIA: 03/2024
    0001 SALARIO BASE        3.500,00
    8000 EMPRESTIMO LEI            0,00     251,18
    8000 EMPRESTIMO LEI            0,00     251,18
    8000 EMPRESTIMO LEI            0,00     251,18
    8000 EMPRESTIMO LEI            0,00     251,18
    8000 EMPRESTIMO LEI            0,00     251,18
    8000 EMPRESTIMO LEI            0,00     251,18
  `;

  it("dedupa as 6 linhas para 1 ocorrência", () => {
    const r = parseHolerite(ocrComHistorico);
    const empr = r.rubricas.filter((x) => /EMPRESTIMO/i.test(x.nome));
    expect(empr).toHaveLength(1);
  });

  it("emite warning sobre duplicatas", () => {
    const r = parseHolerite(ocrComHistorico);
    expect(r.warnings.some((w) => /duplicad/i.test(w))).toBe(true);
  });
});

describe("F0.2 — cross-validation total bruto", () => {
  it("emite warning crítico quando soma excede total bruto em >5%", () => {
    // soma rubricas: 3500 + 5000 = 8500
    // total bruto declarado: 4000 → excede em mais de 5%
    const ocr = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE        3.500,00
      0002 OUTRO ITEM          5.000,00
      Total Bruto              4.000,00
    `;
    const r = parseHolerite(ocr);
    expect(
      r.warnings.some((w) => /REVISE MANUALMENTE/i.test(w)),
    ).toBe(true);
  });

  it("NÃO emite warning quando soma bate com total bruto", () => {
    const ocr = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE        3.500,00
      Total Bruto              3.500,00
    `;
    const r = parseHolerite(ocr);
    expect(
      r.warnings.some((w) => /REVISE MANUALMENTE/i.test(w)),
    ).toBe(false);
  });
});

describe("Bug #2 — totalizadores abreviados não devem virar rubrica", () => {
  // Reproduz cenário audit-bug-2: "Total Desc" (sem "ontos") e "Liquido"
  // sozinho passavam pelo RE_LINHA_TOTALIZADOR e eram inseridos como
  // rubrica → inflavam o salário em >100%.
  const ocrAbreviado = `
    REFERÊNCIA: 03/2024
    0001 SALARIO BASE        3.250,00
    Total Bruto              3.250,00
    Total Desc                 385,75
    Liquido                  2.989,25
  `;

  it("'Total Desc' não vira rubrica", () => {
    const r = parseHolerite(ocrAbreviado);
    const nomes = r.rubricas.map((x) => x.nome.toLowerCase());
    expect(nomes.some((n) => /total\s+desc/i.test(n))).toBe(false);
  });

  it("'Liquido NNNN,NN' sozinho não vira rubrica", () => {
    const r = parseHolerite(ocrAbreviado);
    const nomes = r.rubricas.map((x) => x.nome.toLowerCase());
    expect(nomes.some((n) => /^l[ií]quido/i.test(n))).toBe(false);
  });

  it("soma de vencimentos ≈ Total Bruto (não infla 100%)", () => {
    const r = parseHolerite(ocrAbreviado);
    const soma = r.rubricas.reduce(
      (acc, x) => acc + (x.valor_vencimento ?? 0),
      0,
    );
    // Soma deve ser ~3250, não 6625 (que era o bug).
    expect(soma).toBeLessThanOrEqual(3250 * 1.05);
  });

  it("variantes adicionais — 'Total a Pagar', 'Total Liq', 'Total Empregado'", () => {
    const variantes = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE        3.250,00
      Total a Pagar            2.989,25
      Total Liq                2.989,25
      Total Empregado          2.989,25
    `;
    const r = parseHolerite(variantes);
    const nomes = r.rubricas.map((x) => x.nome.toLowerCase());
    expect(nomes.some((n) => /total\s+a\s+pagar/i.test(n))).toBe(false);
    expect(nomes.some((n) => /total\s+liq/i.test(n))).toBe(false);
    expect(nomes.some((n) => /total\s+empregad/i.test(n))).toBe(false);
  });
});
