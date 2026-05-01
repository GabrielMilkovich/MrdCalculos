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
