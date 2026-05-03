import { describe, expect, it } from "vitest";
import {
  aggregateByCategoria,
  classifyHolerite,
} from "../../export/per-doc/holerite-classify";
import type { RubricaParseada } from "../../parsers/holerite/types";

const baseRubrica = (over: Partial<RubricaParseada>): RubricaParseada => ({
  codigo: null,
  nome: "",
  valor_vencimento: null,
  valor_desconto: null,
  quantidade: null,
  ordem: 0,
  ...over,
});

describe("classifyHolerite — origens", () => {
  it("rubrica com hint de comissão → categoria=comissao, origem=hint", () => {
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({ codigo: "0620", nome: "Comissões", valor_vencimento: 100 }),
      ],
    });
    expect(r.linhas[0].categoria).toBe("comissao");
    expect(r.linhas[0].origem).toBe("hint");
    expect(r.linhas[0].incluir).toBe(true);
  });

  it("rubrica com nome desconhecido → fallback=salario_fixo, marcado revise", () => {
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({ codigo: "9999", nome: "Bonus Anual XPTO", valor_vencimento: 500 }),
      ],
    });
    expect(r.linhas[0].categoria).toBe("salario_fixo");
    expect(r.linhas[0].origem).toBe("fallback");
    expect(r.linhas[0].incluir).toBe(true);
  });

  it("hint 'sugerir_ignorar' (HE, INSS, VT...) → categoria=null, incluir=false", () => {
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({ codigo: "5560", nome: "INSS", valor_desconto: 188.77 }),
      ],
    });
    expect(r.linhas[0].categoria).toBeNull();
    // INSS é desconto, então cai em origem='desconto' ANTES de ver o hint.
    // Hoje a ordem em classifyHolerite é: desconto → ignorar_hint → hint.
    expect(r.linhas[0].origem).toBe("desconto");
    expect(r.linhas[0].incluir).toBe(false);
  });

  it("desconto puro (só valor_desconto>0) → origem=desconto", () => {
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({
          codigo: "2824",
          nome: "Adiant Quinzenal",
          valor_desconto: 559.69,
        }),
      ],
    });
    expect(r.linhas[0].categoria).toBeNull();
    expect(r.linhas[0].origem).toBe("desconto");
  });

  it("hint 'sugerir_ignorar' com vencimento (não desconto) → origem=ignorar_hint", () => {
    // Caso raro: rubrica de "horas extras" aparece com valor de vencimento
    // (e não desconto). Hint "ignorar" entra em ação.
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({
          codigo: "7166",
          nome: "HORAS EXT-COMISS- 50%",
          valor_vencimento: 0.16,
        }),
      ],
    });
    expect(r.linhas[0].categoria).toBeNull();
    expect(r.linhas[0].origem).toBe("ignorar_hint");
    expect(r.linhas[0].incluir).toBe(false);
  });

  it("preserva ordem das rubricas (key derivado do codigo+ordem)", () => {
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({ codigo: "0001", nome: "Salario", valor_vencimento: 1000, ordem: 0 }),
        baseRubrica({ codigo: "0620", nome: "Comissões", valor_vencimento: 200, ordem: 1 }),
      ],
    });
    expect(r.linhas[0].rubrica.codigo).toBe("0001");
    expect(r.linhas[1].rubrica.codigo).toBe("0620");
  });
});

describe("aggregateByCategoria", () => {
  it("Soma valores da mesma categoria, ignora desligados", () => {
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({ codigo: "0620", nome: "Comissões", valor_vencimento: 1000 }),
        baseRubrica({ codigo: "3391", nome: "COM. GARANTIA", valor_vencimento: 200 }),
        baseRubrica({ codigo: "3393", nome: "COM.SEGUROS", valor_vencimento: 50 }),
      ],
    });
    const buckets = aggregateByCategoria(r.linhas);
    expect(buckets.get("comissao")?.toNumber()).toBe(1250);
  });

  it("Categoria sem soma>0 não entra no map", () => {
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({ codigo: "5560", nome: "INSS", valor_desconto: 100 }),
      ],
    });
    const buckets = aggregateByCategoria(r.linhas);
    expect(buckets.size).toBe(0);
  });

  it("Toggle incluir=false não soma", () => {
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({ codigo: "0620", nome: "Comissões", valor_vencimento: 1000 }),
      ],
    });
    r.linhas[0].incluir = false;
    const buckets = aggregateByCategoria(r.linhas);
    expect(buckets.has("comissao")).toBe(false);
  });

  it("Reclassificação para outra categoria respeita escolha", () => {
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({ codigo: "0620", nome: "Comissões", valor_vencimento: 1000 }),
      ],
    });
    r.linhas[0].categoria = "premiacao";
    const buckets = aggregateByCategoria(r.linhas);
    expect(buckets.get("premiacao")?.toNumber()).toBe(1000);
    expect(buckets.has("comissao")).toBe(false);
  });
});
