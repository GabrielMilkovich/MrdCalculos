/**
 * Sprint 3c Fase 2 — testes de integração da camada ontologia
 * em `classifyHolerite`. Exercita o novo caminho condicional
 * (camada 2) que consume `rubricas_classificadas` populado pelos
 * mappers Deno da Sprint 2.
 *
 * Testes em 5 grupos:
 *  (a) regressão: sem ontologia, comportamento idêntico ao antes
 *  (b) ontologia → CategoriaSlug (1 por categoria mapeada)
 *  (c) camadas anteriores não são afetadas (defesa vence)
 *  (d) classificacao_ontologia metadados pra UI
 *  (e) match por referência (Object.is) vs match por (codigo, nome)
 */

import { describe, expect, it } from "vitest";
import { classifyHolerite } from "../../export/per-doc/holerite-classify";
import type {
  RubricaParseada,
  RubricaClassificada,
  CategoriaOntologiaRubrica,
} from "../../parsers/holerite/types";

const baseRubrica = (over: Partial<RubricaParseada>): RubricaParseada => ({
  codigo: null,
  nome: "",
  valor_vencimento: null,
  valor_desconto: null,
  quantidade: null,
  ordem: 0,
  ...over,
});

const baseClassificada = (
  rub: RubricaParseada,
  categoria: CategoriaOntologiaRubrica,
  over: Partial<RubricaClassificada> = {},
): RubricaClassificada => ({
  rubrica: rub,
  categoria,
  metodo_match: "exato",
  score_match: 1.0,
  texto_canonico: rub.nome,
  divergencia_juridica: false,
  ...over,
});

// ---------- (a) regressão: sem ontologia, comportamento idêntico ----------

describe("classifyHolerite — Sprint 3c regressão (sem ontologia)", () => {
  it("parsed SEM rubricas_classificadas → cai 100% no hints.ts (legado)", () => {
    const rub = baseRubrica({
      codigo: "0620",
      nome: "Comissões",
      valor_vencimento: 100,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      // rubricas_classificadas omitido (undefined)
    });
    expect(r.linhas[0].categoria).toBe("comissao");
    expect(r.linhas[0].origem).toBe("hint");
    expect(r.linhas[0].classificacao_ontologia).toBeUndefined();
  });

  it("parsed.rubricas_classificadas=[] → idem (caminho rápido return null)", () => {
    const rub = baseRubrica({
      codigo: "9999",
      nome: "Bonus Anual XPTO",
      valor_vencimento: 500,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [],
    });
    expect(r.linhas[0].categoria).toBe("salario_fixo");
    expect(r.linhas[0].origem).toBe("fallback");
    expect(r.linhas[0].classificacao_ontologia).toBeUndefined();
  });
});

// ---------- (b) ontologia → CategoriaSlug ----------

describe("classifyHolerite — Sprint 3c ontologia → CategoriaSlug", () => {
  it("MINIMO_GARANTIDO → minimo_garantido, origem=ontologia", () => {
    const rub = baseRubrica({
      codigo: "0100",
      nome: "Mínimo Garantido",
      valor_vencimento: 1500,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "MINIMO_GARANTIDO")],
    });
    expect(r.linhas[0].categoria).toBe("minimo_garantido");
    expect(r.linhas[0].origem).toBe("ontologia");
    expect(r.linhas[0].incluir).toBe(true);
  });

  it("COMISSAO_PRODUTOS → comissao, origem=ontologia", () => {
    const rub = baseRubrica({
      codigo: "0620",
      nome: "Comissões Produtos",
      valor_vencimento: 800,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "COMISSAO_PRODUTOS")],
    });
    expect(r.linhas[0].categoria).toBe("comissao");
    expect(r.linhas[0].origem).toBe("ontologia");
  });

  it("COMISSAO_SERVICOS → comissao (mesma slug colapsada), origem=ontologia", () => {
    const rub = baseRubrica({
      codigo: "0621",
      nome: "Comissões Serviços",
      valor_vencimento: 200,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "COMISSAO_SERVICOS")],
    });
    expect(r.linhas[0].categoria).toBe("comissao");
    expect(r.linhas[0].origem).toBe("ontologia");
  });

  it("PREMIO → premiacao, origem=ontologia", () => {
    const rub = baseRubrica({
      codigo: "0800",
      nome: "Prêmio Produtividade",
      valor_vencimento: 300,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "PREMIO")],
    });
    expect(r.linhas[0].categoria).toBe("premiacao");
    expect(r.linhas[0].origem).toBe("ontologia");
  });

  it("DSR_PAGO → dsr, origem=ontologia", () => {
    const rub = baseRubrica({
      codigo: "0900",
      nome: "DSR sobre Comissões",
      valor_vencimento: 120,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "DSR_PAGO")],
    });
    expect(r.linhas[0].categoria).toBe("dsr");
    expect(r.linhas[0].origem).toBe("ontologia");
  });

  it("DESCONSIDERAR → categoria=null, incluir=false, origem=ontologia_desconsiderar", () => {
    const rub = baseRubrica({
      codigo: "3500",
      nome: "Contribuição Sindical",
      valor_vencimento: 50,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "DESCONSIDERAR")],
    });
    expect(r.linhas[0].categoria).toBeNull();
    expect(r.linhas[0].incluir).toBe(false);
    expect(r.linhas[0].origem).toBe("ontologia_desconsiderar");
    expect(r.linhas[0].valorParaCsv).toBe(0);
  });

  it("NAO_CLASSIFICADO → cai pro hints (NÃO força fallback final)", () => {
    // Rubrica é "Comissões" — tem hint legado. Ontologia diz
    // NAO_CLASSIFICADO. Esperado: cai pra camada 3 e o hint resolve
    // como `comissao` com origem='hint' (não 'fallback').
    const rub = baseRubrica({
      codigo: "0620",
      nome: "Comissões",
      valor_vencimento: 100,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "NAO_CLASSIFICADO")],
    });
    expect(r.linhas[0].categoria).toBe("comissao");
    expect(r.linhas[0].origem).toBe("hint");
    expect(r.linhas[0].classificacao_ontologia).toBeUndefined();
  });
});

// ---------- (c) camadas anteriores não são afetadas (defesa vence) ----------

describe("classifyHolerite — Sprint 3c defesa vence ontologia", () => {
  it("totalizador_suspeito + ontologia=MINIMO_GARANTIDO → MANTÉM totalizador_suspeito", () => {
    // Cenário adversarial: ontologia (incorretamente, ou por OCR ruim)
    // classifica "Total Bruto" como MINIMO_GARANTIDO. Defesa-em-profundidade
    // do classifier vence — totalizador NUNCA entra no CSV.
    const rub = baseRubrica({
      codigo: "9999",
      nome: "Total Bruto",
      valor_vencimento: 5000,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "MINIMO_GARANTIDO")],
    });
    expect(r.linhas[0].origem).toBe("totalizador_suspeito");
    expect(r.linhas[0].categoria).toBeNull();
    expect(r.linhas[0].incluir).toBe(false);
    expect(r.linhas[0].classificacao_ontologia).toBeUndefined();
  });

  it("isDesconto + ontologia=PREMIO → MANTÉM desconto (defesa vence)", () => {
    const rub = baseRubrica({
      codigo: "5560",
      nome: "Desconto Adiantamento",
      valor_desconto: 200,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "PREMIO")],
    });
    expect(r.linhas[0].origem).toBe("desconto");
    expect(r.linhas[0].categoria).toBeNull();
    expect(r.linhas[0].incluir).toBe(false);
    expect(r.linhas[0].classificacao_ontologia).toBeUndefined();
  });
});

// ---------- (d) metadados classificacao_ontologia ----------

describe("classifyHolerite — Sprint 3c metadados pra UI", () => {
  it("origem=ontologia → classificacao_ontologia populado com score/metodo/divergencia", () => {
    const rub = baseRubrica({
      codigo: "0620",
      nome: "Comissões",
      valor_vencimento: 100,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [
        baseClassificada(rub, "COMISSAO_PRODUTOS", {
          metodo_match: "sinonimo",
          score_match: 0.87,
          texto_canonico: "Comissão sobre Vendas",
          divergencia_juridica: true,
        }),
      ],
    });
    expect(r.linhas[0].origem).toBe("ontologia");
    expect(r.linhas[0].classificacao_ontologia).toEqual({
      categoria_ontologia: "COMISSAO_PRODUTOS",
      metodo_match: "sinonimo",
      score_match: 0.87,
      texto_canonico: "Comissão sobre Vendas",
      divergencia_juridica: true,
    });
  });

  it("origem=hint ou fallback → classificacao_ontologia=undefined", () => {
    // Sem rubricas_classificadas (cai em hints + fallback)
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [
        baseRubrica({ codigo: "0620", nome: "Comissões", valor_vencimento: 100 }),
        baseRubrica({ codigo: "9999", nome: "Bonus XPTO", valor_vencimento: 50 }),
      ],
    });
    expect(r.linhas[0].origem).toBe("hint");
    expect(r.linhas[0].classificacao_ontologia).toBeUndefined();
    expect(r.linhas[1].origem).toBe("fallback");
    expect(r.linhas[1].classificacao_ontologia).toBeUndefined();
  });
});

// ---------- (e) match por referência vs (codigo, nome) ----------

describe("classifyHolerite — Sprint 3c match referência vs (codigo, nome)", () => {
  it("match por referência (Object.is) — mesma instância", () => {
    // Caminho rápido: mapper e classifier rodam no mesmo runtime
    // (testes, ou futura execução cliente-side da ontologia). Referência
    // preservada → Object.is bate no primeiro loop.
    const rub = baseRubrica({
      codigo: "0100",
      nome: "Mínimo Garantido",
      valor_vencimento: 1500,
    });
    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rub],
      rubricas_classificadas: [baseClassificada(rub, "MINIMO_GARANTIDO")],
    });
    expect(r.linhas[0].origem).toBe("ontologia");
    expect(r.linhas[0].categoria).toBe("minimo_garantido");
  });

  it("match por (codigo, nome) tuple — rubrica é cópia (caso prod pós-JSONB)", () => {
    // Cenário real de produção: mapper Deno persistiu em documents.parsed
    // JSONB e frontend re-hidratou. As referências entre parsed.rubricas[]
    // (parseHolerite frontend) e rubricas_classificadas[].rubrica
    // (re-hidratado) são objetos DISTINTOS, mas (codigo, nome) bate.
    const rubFrontend = baseRubrica({
      codigo: "0100",
      nome: "Mínimo Garantido",
      valor_vencimento: 1500,
    });
    const rubMapperHidratada = baseRubrica({
      codigo: "0100",
      nome: "Mínimo Garantido",
      valor_vencimento: 1500,
      ordem: 5, // diferente do default — confirma que é cópia
    });
    // Pré-condição do teste: garantir que são instâncias distintas
    expect(Object.is(rubFrontend, rubMapperHidratada)).toBe(false);

    const r = classifyHolerite({
      competencia: "08/2016",
      layout_usado: "via_varejo_v1",
      warnings: [],
      rubricas: [rubFrontend],
      rubricas_classificadas: [
        baseClassificada(rubMapperHidratada, "MINIMO_GARANTIDO"),
      ],
    });
    expect(r.linhas[0].origem).toBe("ontologia");
    expect(r.linhas[0].categoria).toBe("minimo_garantido");
  });
});
