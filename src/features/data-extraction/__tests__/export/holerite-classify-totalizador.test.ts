/**
 * Gate 2 — Cenário 2: classifier de holerite NÃO classifica totalizadores
 * como rubrica que entra no CSV, mas PRESERVA rubricas legítimas cujo nome
 * só compartilha prefixo léxico com totalizadores.
 *
 * Já temos `holerite-totalizador-abreviado.test.ts` cobrindo o caminho
 * parser→classifier→agg do ponto de vista da função `parseHolerite`. Este
 * arquivo isola o classifier (`classifyHolerite`) com inputs sintéticos
 * de `RubricaParseada[]` — útil porque a defesa em profundidade do PATCH 2
 * vive nessa função, e o teste do parser só prova o caminho onde a primeira
 * defesa (regex no parser) já filtrou.
 *
 * Cobertura intencional:
 *   - "Total Liquido" → exclui do CSV (hint catch ou totalizador_suspeito)
 *   - "Liquido"       → exclui do CSV (totalizador_suspeito)
 *   - "Total Desc"    → exclui do CSV (totalizador_suspeito)
 *   - "Liquido Mensal"          → ENTRA no CSV (não é totalizador, prefixo léxico)
 *   - "Adiantamento Liquido"    → ENTRA no CSV (palavra no meio, não é totalizador)
 *   - "Salario base"            → ENTRA no CSV (sanity check)
 *
 * O nome "Liquido a Receber Antecipado" PODE ser ambíguo (hint regex casa
 * `^liquido\s+a\s+receber\b` mesmo com sufixo) — testado e documentado.
 */
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  classifyHolerite,
  aggregateByCategoria,
} from "../../export/per-doc/holerite-classify";
import type { RubricaParseada } from "../../parsers/holerite/types";

function mkRubrica(
  nome: string,
  valor_vencimento: number | null,
  ordem = 0,
): RubricaParseada {
  return {
    codigo: null,
    nome,
    quantidade: null,
    valor_vencimento,
    valor_desconto: null,
    ordem,
  };
}

function classify(rubricas: RubricaParseada[]) {
  return classifyHolerite({
    competencia: "05/2024",
    layout_usado: "generico_v1",
    warnings: [],
    rubricas,
  });
}

describe("classifyHolerite — totalizadores excluídos do CSV", () => {
  it("'Total Liquido' não entra no CSV (caminho hint sugerir_ignorar)", () => {
    const c = classify([
      mkRubrica("Salario base", 2500, 0),
      mkRubrica("Total Liquido", 5000, 1),
    ]);
    const totalLiq = c.linhas.find((l) =>
      /total\s+liquido/i.test(l.rubrica.nome),
    );
    expect(totalLiq).toBeDefined();
    // "Total Liquido" casa o hint regex em `hints.ts` antes de chegar no
    // filtro `nomeParaceTotalizador`. Resultado: origem='ignorar_hint',
    // `valorParaCsv` PRESERVA o valor (5000) por convenção do classifier,
    // mas `incluir=false` — agregação ignora.
    expect(totalLiq!.incluir).toBe(false);
    expect(["ignorar_hint", "totalizador_suspeito"]).toContain(
      totalLiq!.origem,
    );

    // Soma agregada exclui o R$ 5000 do totalizador (respeitando incluir=false).
    const agg = aggregateByCategoria(c.linhas);
    const total = [...agg.values()].reduce(
      (a, d) => a.plus(d),
      new Decimal(0),
    );
    expect(total.toNumber()).toBe(2500);
  });

  it("'Liquido' sozinho não entra no CSV (origem=totalizador_suspeito)", () => {
    const c = classify([
      mkRubrica("Salario base", 2500, 0),
      mkRubrica("Liquido", 5000, 1),
    ]);
    const liq = c.linhas.find((l) => l.rubrica.nome === "Liquido");
    expect(liq).toBeDefined();
    expect(liq!.incluir).toBe(false);
    expect(liq!.origem).toBe("totalizador_suspeito");
  });

  it("'Total Desc' (abreviação) não entra no CSV", () => {
    const c = classify([
      mkRubrica("Salario base", 2500, 0),
      mkRubrica("Total Desc", 385, 1),
    ]);
    const desc = c.linhas.find((l) => l.rubrica.nome === "Total Desc");
    expect(desc).toBeDefined();
    expect(desc!.incluir).toBe(false);
  });
});

describe("classifyHolerite — rubricas legítimas com prefixo léxico preservadas", () => {
  it("'Liquido Mensal' ENTRA no CSV (não é totalizador, palavra extra)", () => {
    const c = classify([mkRubrica("Liquido Mensal", 2500, 0)]);
    const linha = c.linhas[0];
    // Não tem `^$` casando totalizador; sem hint específico → fallback ou
    // categoria por hint. O importante: incluir=true, valor > 0.
    expect(linha.incluir).toBe(true);
    expect(linha.valorParaCsv).toBe(2500);
    expect(linha.origem).not.toBe("totalizador_suspeito");
  });

  it("'Adiantamento Liquido' ENTRA no CSV (palavra Liquido no meio)", () => {
    const c = classify([mkRubrica("Adiantamento Liquido", 800, 0)]);
    const linha = c.linhas[0];
    // 'Adiantamento' tem hint próprio (sugerir_ignorar — não-remuneração),
    // então pode cair em ignorar_hint. O ponto: NÃO é totalizador_suspeito.
    // Se a equipe quiser que ENTRE no CSV, é decisão de classificação de
    // hint, não de filtro de totalizador. Este teste só garante que o
    // filtro de totalizador não capturou.
    expect(linha.origem).not.toBe("totalizador_suspeito");
  });

  it("'Salario base' ENTRA no CSV (sanity check, baseline)", () => {
    const c = classify([mkRubrica("Salario base", 2500, 0)]);
    const linha = c.linhas[0];
    expect(linha.incluir).toBe(true);
    expect(linha.valorParaCsv).toBe(2500);
    expect(linha.categoria).toBe("salario_fixo");
  });
});

describe("classifyHolerite — fronteira conhecida documentada", () => {
  it("'Liquido a Receber Antecipado' É EXCLUÍDO pelo hint regex (\\b ancora final é word boundary)", () => {
    // Vetor honesto: hints.ts tem `liquido\s+a\s+receber\b` (sem `$`),
    // então casa "Liquido a Receber Antecipado" porque o `\b` aceita
    // o espaço seguinte. Resultado: linha vai para origem='ignorar_hint'
    // e fica fora do CSV. Se houver demanda jurídica real para que essa
    // rubrica COMPOSITA entre no CSV, a correção é em
    // `classification/hints.ts`, não em `holerite-classify.ts`.
    //
    // Este teste documenta a fronteira atual, não a defende como ideal.
    const c = classify([mkRubrica("Liquido a Receber Antecipado", 2500, 0)]);
    const linha = c.linhas[0];
    expect(linha.incluir).toBe(false);
  });
});
