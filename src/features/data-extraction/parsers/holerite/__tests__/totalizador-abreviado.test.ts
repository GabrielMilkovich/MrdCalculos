/**
 * FASE 1.1 — Teste explícito do prompt da auditoria.
 *
 * Reproduz o cenário real onde "Total Desc 385,75" e "Liquido 2.989,25"
 * (abreviações que escapavam à `RE_LINHA_TOTALIZADOR` antiga) entravam
 * como rubricas e inflavam o salário no CSV em 100%+.
 *
 * Aceitação:
 *   - apenas 2 rubricas (Salario base + Periculosidade)
 *   - "Total Desc" e "Liquido" descartados pelo regex de totalizador
 */
import { describe, expect, it } from "vitest";
import { parseHolerite } from "../../holerite";

describe("FASE 1.1 — totalizador abreviado escapa do parser", () => {
  it("input do prompt: 2 rubricas, 0 totalizadores como rubrica", () => {
    const INPUT = `
      REFERÊNCIA: 03/2024
      Salario base    2.500,00
      Periculosidade  750,00
      Total Desc      385,75
      Liquido         2.989,25
    `;
    const r = parseHolerite(INPUT);
    expect(r.rubricas).toHaveLength(2);
    const nomes = r.rubricas.map((x) => x.nome);
    expect(nomes[0]).toMatch(/Salario/i);
    expect(nomes[1]).toMatch(/Periculosidade/i);
  });

  it("totalizadores variantes — todos descartados", () => {
    const INPUT = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE   3.250,00
      Total Bruto         3.250,00
      Total Desc            385,75
      Total Liq           2.989,25
      Total a Pagar       2.989,25
      Total a Receber     2.989,25
      Total Empregado     2.989,25
      Liquido             2.989,25
      Salario Liquido     2.989,25
      Liquido a Receber   2.989,25
      Valor Liquido       2.989,25
    `;
    const r = parseHolerite(INPUT);
    // Só a rubrica de salário deve sobrar.
    expect(r.rubricas).toHaveLength(1);
    expect(r.rubricas[0].nome).toMatch(/SALARIO BASE/i);
  });

  it("totalizador inline (mesma linha de rubrica) → flag_suspeita=true", () => {
    // Cenário OCR ruim: "Total Bruto" colou na linha da rubrica.
    const INPUT = `
      REFERÊNCIA: 03/2024
      0001 SALARIO BASE 3.250,00 Total Bruto 3.250,00
    `;
    const r = parseHolerite(INPUT);
    // O parser AINDA extrai (não dropa silenciosamente), mas marca.
    expect(r.rubricas.length).toBeGreaterThanOrEqual(1);
    const suspeita = r.rubricas.find((x) => x.flag_suspeita === true);
    expect(suspeita).toBeDefined();
  });
});
