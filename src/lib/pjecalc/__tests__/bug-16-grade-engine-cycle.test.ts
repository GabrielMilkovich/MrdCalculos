/**
 * Teste de regressão do Bug #16 — ciclo Grade ↔ Engine.
 *
 * Antes: pjecalc_ocorrencia_calculo era WRITE-ONLY.
 *   Operador editava ocorrência na Grade → salvava no banco → liquidação
 *   nova nunca lia → engine regerava do zero via preencherOcorrencias →
 *   edição manual era DESCARTADA silenciosamente.
 *
 * Depois: ModuloResumo carrega pjecalc_ocorrencia_calculo, popula
 *   ocorrencias_precomputadas, e o engine V3 RESPEITA (não regenera).
 *
 * Este teste valida a INVARIANTE: se passar ocorrências explícitas,
 * preencherOcorrenciasFromScratch deve NÃO sobrescrever.
 */
import { describe, expect, it } from "vitest";
import { preencherOcorrenciasFromScratch } from "../gerar-ocorrencias-from-scratch";
import { makeVerba, makeHistorico, makeParams } from "./helpers";

describe("Bug #16 — Grade ↔ Engine cycle", () => {
  it("Verba com ocorrencias_precomputadas NÃO é regerada", () => {
    const ocsGrade = [
      {
        competencia: "2024-01",
        base: 9999,
        divisor: 1,
        multiplicador: 1,
        quantidade: 1,
        dobra: false,
        devido: 9999, // valor "exótico" que NÃO bate com qualquer cálculo
        pago: 0,
      },
    ];

    const verba = makeVerba({
      nome: "Horas Extras 50%",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      tipo_quantidade: "informada",
      quantidade_informada: 10,
      divisor_informado: 220,
      multiplicador: 1.5,
      ocorrencias_precomputadas: ocsGrade,
    });
    const hist = [makeHistorico({ valor_informado: 3000 })];
    const params = makeParams({
      data_admissao: "2024-01-01",
      data_demissao: "2024-12-31",
    });

    // Snapshot pré-chamada
    const ocsAntes = JSON.parse(JSON.stringify(verba.ocorrencias_precomputadas));

    const report = preencherOcorrenciasFromScratch(
      [verba],
      hist,
      [],
      params,
      [],
      [],
    );

    // Engine respeitou: ocorrências NÃO mudaram
    expect(verba.ocorrencias_precomputadas).toEqual(ocsAntes);
    expect(verba.ocorrencias_precomputadas!.length).toBe(1);
    expect(verba.ocorrencias_precomputadas![0].devido).toBe(9999);
    expect(report.naoCobertas).toEqual([]);
  });

  it("Verba SEM ocorrencias_precomputadas é regerada normalmente", () => {
    const verba = makeVerba({
      nome: "Horas Extras 50%",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      tipo_quantidade: "informada",
      quantidade_informada: 10,
      divisor_informado: 220,
      multiplicador: 1.5,
      // SEM ocorrencias_precomputadas
    });
    const hist = [makeHistorico({ valor_informado: 3000 })];
    const params = makeParams({
      data_admissao: "2024-01-01",
      data_demissao: "2024-12-31",
    });

    preencherOcorrenciasFromScratch([verba], hist, [], params, [], []);

    // Engine GEROU: 12 ocorrências (uma por mês)
    expect(verba.ocorrencias_precomputadas).toBeDefined();
    expect(verba.ocorrencias_precomputadas!.length).toBe(12);
    // Cada uma com devido = base × mult × qty / divisor
    // 3000 × 1.5 × 10 / 220 ≈ 204.55
    expect(verba.ocorrencias_precomputadas![0].devido).toBeCloseTo(204.55, 2);
  });

  it("Verba 'informado' (valor direto) também é preservada quando há ocorrencias", () => {
    const ocsGrade = [
      {
        competencia: "2024-06",
        base: 5000,
        divisor: 1,
        multiplicador: 1,
        quantidade: 1,
        dobra: false,
        devido: 5000,
        pago: 0,
      },
    ];
    const verba = makeVerba({
      nome: "Indenização Adicional",
      valor: "informado",
      valor_informado_devido: 7777, // valor diferente das ocorrências
      ocorrencias_precomputadas: ocsGrade,
    });

    preencherOcorrenciasFromScratch(
      [verba],
      [makeHistorico()],
      [],
      makeParams(),
      [],
      [],
    );

    expect(verba.ocorrencias_precomputadas).toEqual(ocsGrade);
  });
});
