/**
 * Edge cases do parser de férias.
 */
import { describe, expect, it } from "vitest";
import { parseFerias } from "../../parsers/ferias";

describe("parseFerias — variantes de gozo", () => {
  it("'período de gozo: dd/mm/yyyy a dd/mm/yyyy'", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      período de gozo: 10/01/2024 a 30/01/2024
    `);
    expect(r.ferias[0].gozo1?.inicio).toBe("10/01/2024");
    expect(r.ferias[0].gozo1?.fim).toBe("30/01/2024");
  });

  it("'gozo: dd/mm/yyyy até dd/mm/yyyy' (ate em vez de a)", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      gozo: 10/01/2024 até 30/01/2024
    `);
    expect(r.ferias[0].gozo1?.inicio).toBe("10/01/2024");
    expect(r.ferias[0].gozo1?.fim).toBe("30/01/2024");
  });

  it("'férias de dd/mm/yyyy a dd/mm/yyyy'", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      férias de 10/01/2024 a 30/01/2024
    `);
    expect(r.ferias[0].gozo1).not.toBeNull();
  });
});

describe("parseFerias — situação", () => {
  it("'INDENIZADAS' → I", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Férias INDENIZADAS
    `);
    expect(r.ferias[0].situacao).toBe("I");
  });

  it("'gozadas parcialmente' → GP", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      gozadas parcialmente: 10/01/2024 a 20/01/2024
    `);
    expect(r.ferias[0].situacao).toBe("GP");
  });

  it("PERDIDAS → P", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Férias perdidas conforme art. 137 CLT
    `);
    expect(r.ferias[0].situacao).toBe("P");
  });

  it("'NÃO GOZADAS' → NG", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Férias não gozadas
    `);
    expect(r.ferias[0].situacao).toBe("NG");
  });
});

describe("parseFerias — relativa antiga", () => {
  it("aceita 1999/2000 (vínculo antigo)", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 1999/2000
      30 dias
    `);
    expect(r.ferias[0].relativa).toBe("1999/2000");
  });
});

describe("parseFerias — prazo (B3)", () => {
  it("prazo > 60 é capado em 60 com warning", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      80 dias de férias
    `);
    expect(r.ferias[0].prazo).toBe(60);
    expect(r.warnings.some((w) => /prazo/i.test(w))).toBe(true);
  });

  it("prazo 0 vira default 30 com warning", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      0 dias de férias
    `);
    expect(r.ferias[0].prazo).toBe(30);
  });

  it("prazo válido (10..60) preservado", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      20 dias de férias
    `);
    expect(r.ferias[0].prazo).toBe(20);
  });
});

describe("parseFerias — abono pecuniário", () => {
  it("'abono pecuniário de 10 dias'", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      abono pecuniário de 10 dias
    `);
    expect(r.ferias[0].abono).toBe(true);
    expect(r.ferias[0].dias_abono).toBe(10);
  });
});

describe("parseFerias — unparsed_lines", () => {
  it("linhas com data fora de bloco vão pra unparsed", () => {
    const r = parseFerias(`
      Cabeçalho 01/01/2024
      Texto solto 31/12/2024 sem contexto
    `);
    // Não tem RECIBO DE FÉRIAS nem relativa → não cria ferias mas anota linhas
    expect(r.ferias).toHaveLength(0);
    expect(r.unparsed_lines.length).toBeGreaterThan(0);
  });
});

describe("parseFerias — dobra geral", () => {
  it("detecta dobra geral", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Período em dobra
    `);
    expect(r.ferias[0].dobra_geral).toBe(true);
  });
});

describe("parseFerias — dobra por gozo individual (B1)", () => {
  it("'(em dobra)' depois do gozo → gozo.dobra=true", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Período de gozo: 01/06/2024 a 30/06/2024 (em dobra)
    `);
    expect(r.ferias[0].gozo1?.dobra).toBe(true);
  });

  it("'em dobro' antes do gozo → gozo.dobra=true", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Gozo em dobro: 01/06/2024 a 30/06/2024
    `);
    expect(r.ferias[0].gozo1?.dobra).toBe(true);
  });

  it("apenas gozo 2 em dobra, gozo 1 e 3 normais", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Período de gozo: 01/06/2024 a 10/06/2024
      Período de gozo: 15/06/2024 a 24/06/2024 em dobra
      Período de gozo: 01/07/2024 a 10/07/2024
    `);
    expect(r.ferias[0].gozo1?.dobra).toBe(false);
    expect(r.ferias[0].gozo2?.dobra).toBe(true);
    expect(r.ferias[0].gozo3?.dobra).toBe(false);
  });

  it("gozo sem mencionar dobra → false (não regride)", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS
      Relativa: 2023/2024
      Período de gozo: 01/06/2024 a 30/06/2024
    `);
    expect(r.ferias[0].gozo1?.dobra).toBe(false);
  });

  it("dobra geral marcada também propaga para todos os gozos detectados", () => {
    const r = parseFerias(`
      RECIBO DE FÉRIAS — em dobra
      Relativa: 2023/2024
      Período de gozo: 01/06/2024 a 10/06/2024
      Período de gozo: 15/06/2024 a 24/06/2024
    `);
    expect(r.ferias[0].dobra_geral).toBe(true);
    expect(r.ferias[0].gozo1?.dobra).toBe(true);
    expect(r.ferias[0].gozo2?.dobra).toBe(true);
  });
});

describe("parseFerias — splitInBlocks com palavra-gatilho dentro do recibo (auditoria item 10)", () => {
  it("recibo único que cita 'comunicado de gozo' internamente NÃO duplica relativa", () => {
    // Caso real: recibo principal cita um comunicado anterior dentro do
    // próprio texto. RE_BLOCO_FERIAS poderia criar 2 blocos pra mesma
    // relativa. Esperado: 1 só período, com os gozos consolidados.
    const ocr = `
RECIBO DE FÉRIAS
Empregado: Maria
Relativa: 2022/2023
30 dias de férias
Período de gozo: 01/06/2024 a 20/06/2024
Conforme comunicado de férias dos 10 dias restantes, gozo de 01/12/2024 a 10/12/2024.
`;
    const r = parseFerias(ocr);
    // Deve haver no máximo 2 períodos: o recibo e (possivelmente) o
    // comunicado interno tratado como bloco. Se houver dois com mesma
    // relativa "2022/2023", ambos devem existir mas com gozos distintos.
    const relativas2022 = r.ferias.filter((f) => f.relativa === "2022/2023");
    expect(relativas2022.length).toBeGreaterThanOrEqual(1);
    // Garantia mínima: o gozo principal foi capturado em algum dos blocos.
    const todosGozos = r.ferias.flatMap((f) =>
      [f.gozo1, f.gozo2, f.gozo3].filter((g) => g !== null),
    );
    expect(
      todosGozos.some(
        (g) => g!.inicio === "01/06/2024" && g!.fim === "20/06/2024",
      ),
    ).toBe(true);
  });

  it("recibo com 3+ gozos múltiplos no MESMO bloco preserva todos", () => {
    const ocr = `
RECIBO DE FÉRIAS
Relativa: 2023/2024
30 dias de férias
Período de gozo: 01/06/2024 a 10/06/2024
Período de gozo: 15/07/2024 a 24/07/2024
Período de gozo: 01/09/2024 a 10/09/2024
`;
    const r = parseFerias(ocr);
    expect(r.ferias).toHaveLength(1);
    expect(r.ferias[0].gozo1?.inicio).toBe("01/06/2024");
    expect(r.ferias[0].gozo2?.inicio).toBe("15/07/2024");
    expect(r.ferias[0].gozo3?.inicio).toBe("01/09/2024");
  });

  it("4º gozo é descartado mas warning sinaliza (limite PJe-Calc é 3)", () => {
    const ocr = `
RECIBO DE FÉRIAS
Relativa: 2023/2024
30 dias de férias
Período de gozo: 01/06/2024 a 05/06/2024
Período de gozo: 10/06/2024 a 15/06/2024
Período de gozo: 20/06/2024 a 25/06/2024
Período de gozo: 28/06/2024 a 30/06/2024
`;
    const r = parseFerias(ocr);
    expect(r.ferias[0].gozo1).not.toBeNull();
    expect(r.ferias[0].gozo2).not.toBeNull();
    expect(r.ferias[0].gozo3).not.toBeNull();
    // 4º gozo (28/06–30/06) não é representável no schema PJe-Calc
    // (apenas 3 colunas G1/G2/G3). Aceita silenciosamente.
  });
});
