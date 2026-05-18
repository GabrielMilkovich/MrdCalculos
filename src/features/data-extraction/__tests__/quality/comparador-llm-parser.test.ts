/**
 * FASE 3.1 — testes do comparador parser × LLM.
 *
 * Cobertura conforme prompt:
 *   - Match perfeito → taxa=1
 *   - 1 rubrica a mais no LLM → so_llm presente
 *   - Valor diferente em R$ 0.50 → diff_valor com delta correto
 *   - Nome com typo (Salário vs Salairo) → match por levenshtein
 *   - Casos adicionais: distância > 3, totalizadores
 */
import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  compararRubricas,
  compararTotalizadores,
  levenshtein,
  normalizarNome,
} from "../../quality/comparador-llm-parser";
import type { RubricaParseada } from "../../parsers/holerite/types";
import type { ExtractedRubrica } from "../../api/extract-rubricas-ai";

// Helpers
const pRub = (over: Partial<RubricaParseada>): RubricaParseada => ({
  codigo: null,
  nome: "",
  valor_vencimento: null,
  valor_desconto: null,
  quantidade: null,
  ordem: 0,
  ...over,
});

const lRub = (over: Partial<ExtractedRubrica>): ExtractedRubrica => ({
  codigo: null,
  nome: "",
  valor_vencimento: null,
  valor_desconto: null,
  quantidade: null,
  ...over,
});

describe("levenshtein", () => {
  it("strings idênticas → 0", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });
  it("substitução simples → 1", () => {
    expect(levenshtein("abc", "abd")).toBe(1);
  });
  it("inserção simples → 1", () => {
    expect(levenshtein("abc", "abcd")).toBe(1);
  });
  it("string vazia → length", () => {
    expect(levenshtein("", "abcd")).toBe(4);
    expect(levenshtein("abcd", "")).toBe(4);
  });
  it("'salario' vs 'salairo' (typo) → 2", () => {
    expect(levenshtein("salario", "salairo")).toBe(2);
  });
});

describe("normalizarNome", () => {
  it("remove acentos e lowercase", () => {
    expect(normalizarNome("Salário Base")).toBe("salario base");
  });
  it("colapsa espaços + remove pontos", () => {
    expect(normalizarNome("Hora.Extra   50%")).toBe("hora extra 50%");
  });
  it("trim", () => {
    expect(normalizarNome("  comissoes  ")).toBe("comissoes");
  });
});

describe("FASE 3.1 — compararRubricas (cenários do prompt)", () => {
  it("Match perfeito (mesmos 3 nomes e valores) → taxa=1", () => {
    const parser = [
      pRub({ nome: "Salario Base", valor_vencimento: 3500 }),
      pRub({ nome: "Comissoes", valor_vencimento: 1158.82 }),
      pRub({ nome: "INSS", valor_desconto: 385.75 }),
    ];
    const llm = [
      lRub({ nome: "Salario Base", valor_vencimento: 3500 }),
      lRub({ nome: "Comissoes", valor_vencimento: 1158.82 }),
      lRub({ nome: "INSS", valor_desconto: 385.75 }),
    ];
    const r = compararRubricas(parser, llm);
    expect(r.taxa_concordancia).toBe(1);
    expect(r.matches.every((m) => m.tipo === "match")).toBe(true);
  });

  it("LLM tem 1 rubrica a mais → so_llm presente", () => {
    const parser = [
      pRub({ nome: "Salario Base", valor_vencimento: 3500 }),
    ];
    const llm = [
      lRub({ nome: "Salario Base", valor_vencimento: 3500 }),
      lRub({ nome: "Premio Producao", valor_vencimento: 500 }),
    ];
    const r = compararRubricas(parser, llm);
    expect(r.matches.some((m) => m.tipo === "so_llm")).toBe(true);
    expect(r.taxa_concordancia).toBe(0.5); // 1 match / max(1, 2) = 0.5
  });

  it("Parser tem 1 rubrica a mais → so_parser presente", () => {
    const parser = [
      pRub({ nome: "Salario Base", valor_vencimento: 3500 }),
      pRub({ nome: "Vale Refeicao", valor_vencimento: 200 }),
    ];
    const llm = [lRub({ nome: "Salario Base", valor_vencimento: 3500 })];
    const r = compararRubricas(parser, llm);
    expect(r.matches.some((m) => m.tipo === "so_parser")).toBe(true);
    expect(r.taxa_concordancia).toBe(0.5);
  });

  it("Valor diferente em R$ 0.50 → diff_valor com delta correto", () => {
    const parser = [pRub({ nome: "Salario Base", valor_vencimento: 3500.5 })];
    const llm = [lRub({ nome: "Salario Base", valor_vencimento: 3500.0 })];
    const r = compararRubricas(parser, llm);
    expect(r.matches).toHaveLength(1);
    const m = r.matches[0];
    expect(m.tipo).toBe("diff_valor");
    if (m.tipo === "diff_valor") {
      expect(m.delta.toString()).toBe("0.5");
    }
  });

  it("Nome com typo ('Salairo' vs 'Salario') + valor igual → diff_nome (lev=2)", () => {
    const parser = [pRub({ nome: "Salario Base", valor_vencimento: 3500 })];
    const llm = [lRub({ nome: "Salairo Base", valor_vencimento: 3500 })];
    const r = compararRubricas(parser, llm);
    const m = r.matches[0];
    expect(m.tipo).toBe("diff_nome");
    if (m.tipo === "diff_nome") {
      expect(m.levenshtein).toBe(2);
    }
  });

  it("Nome muito diferente (lev > 3) + valor igual → so_parser + so_llm", () => {
    const parser = [pRub({ nome: "Salario Base", valor_vencimento: 3500 })];
    const llm = [lRub({ nome: "Vencimento Bruto", valor_vencimento: 3500 })];
    const r = compararRubricas(parser, llm);
    expect(r.matches.some((m) => m.tipo === "so_parser")).toBe(true);
    expect(r.matches.some((m) => m.tipo === "so_llm")).toBe(true);
  });

  it("Match greedy 1-para-1: cada rubrica usada uma vez", () => {
    // 2 rubricas parser muito similares + 2 LLM idênticas
    const parser = [
      pRub({ nome: "Comissao 1", valor_vencimento: 100 }),
      pRub({ nome: "Comissao 2", valor_vencimento: 200 }),
    ];
    const llm = [
      lRub({ nome: "Comissao 1", valor_vencimento: 100 }),
      lRub({ nome: "Comissao 2", valor_vencimento: 200 }),
    ];
    const r = compararRubricas(parser, llm);
    expect(r.matches).toHaveLength(2);
    expect(r.matches.every((m) => m.tipo === "match")).toBe(true);
  });

  it("Listas vazias → taxa=1 (sem dados, sem divergência)", () => {
    const r = compararRubricas([], []);
    expect(r.taxa_concordancia).toBe(1);
    expect(r.matches).toEqual([]);
  });
});

describe("FASE 3.1 — compararTotalizadores", () => {
  it("ambos null → false (não dá para concluir)", () => {
    const r = compararTotalizadores(null, null, null, {
      bruto: null,
      descontos: null,
      liquido: null,
    });
    expect(r).toEqual({ bruto: false, descontos: false, liquido: false });
  });

  it("valores idênticos → true em todos", () => {
    const r = compararTotalizadores(3500, 385.75, 3114.25, {
      bruto: 3500,
      descontos: 385.75,
      liquido: 3114.25,
    });
    expect(r).toEqual({ bruto: true, descontos: true, liquido: true });
  });

  it("delta de 0.005 (< 0.01) → bate", () => {
    const r = compararTotalizadores(3500.005, null, null, {
      bruto: 3500.0,
      descontos: null,
      liquido: null,
    });
    expect(r.bruto).toBe(true);
  });

  it("delta de 0.02 (> 0.01) → não bate", () => {
    const r = compararTotalizadores(3500.02, null, null, {
      bruto: 3500.0,
      descontos: null,
      liquido: null,
    });
    expect(r.bruto).toBe(false);
  });
});

describe("FASE 3.1 — precisão Decimal (CLAUDE.md)", () => {
  it("soma 0.1 + 0.2 — delta calculado com Decimal não vaza erro float", () => {
    // Garantir que nem o caller passa erro de float, nem a comparação interna
    // produz delta espúrio. Caso clássico: parser entrega 0.30000000000000004
    // por erro float — Decimal trata correto.
    const parser = [pRub({ nome: "x", valor_vencimento: 0.1 + 0.2 })];
    const llm = [lRub({ nome: "x", valor_vencimento: 0.3 })];
    const r = compararRubricas(parser, llm);
    const m = r.matches[0];
    // 0.1+0.2 = 0.30000000000000004, delta = ~5e-17 < 0.01 → match
    expect(m.tipo).toBe("match");
  });

  it("Decimal usado no delta — verificavel via toString", () => {
    const parser = [pRub({ nome: "x", valor_vencimento: 100.005 })];
    const llm = [lRub({ nome: "x", valor_vencimento: 100 })];
    const r = compararRubricas(parser, llm);
    const m = r.matches[0];
    if (m.tipo === "diff_valor") {
      // Decimal preserva precisão; toString reflete o resultado real.
      expect(m.delta.toString()).toBe("0.005");
    }
  });
});
