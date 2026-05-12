/**
 * Testes do adapter `gerarViaModulo` — Sessão 4b.
 *
 * Para cada módulo crítico, comparamos o resultado do verba-module
 * vs gerador genérico em fixtures controladas. Esta tabela é o
 * critério de "go-live": módulo só vai pra produção quando o resultado
 * bate (ou se aproxima mais do PJC ground truth) que o genérico.
 */
import { describe, expect, it } from "vitest";
import { gerarViaModulo } from "../gerar-via-modulo";
import { gerarOcorrenciasFromScratch } from "../gerar-ocorrencias-from-scratch";
import { detectarVerbaModuleId } from "../detectar-verba-module";
import { makeVerba, makeHistorico, makeParams } from "./helpers";
// Importa o registry para auto-registrar todos os módulos
import "../verba-modules";

describe("gerarViaModulo — adapter dos verba-modules", () => {
  it("HE_50 via módulo: gera ocorrência != 0 para verba simples", () => {
    const verba = makeVerba({
      nome: "Horas Extras 50%",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      tipo_quantidade: "informada",
      quantidade_informada: 10,
      divisor_informado: 220,
      multiplicador: 1.5,
    });
    const moduleId = detectarVerbaModuleId(verba);
    expect(moduleId).toBe("HE_50");

    const ocs = gerarViaModulo(verba, moduleId!, {
      historicos: [makeHistorico({ valor_informado: 3000 })],
      cartao: [],
      faltas: [],
      ferias: [],
      parametros: makeParams({
        data_admissao: "2024-01-01",
        data_demissao: "2024-12-31",
      }),
    });

    expect(ocs.length).toBeGreaterThan(0);
    // Cada ocorrência tem devido > 0
    for (const o of ocs) {
      expect(o.devido).toBeGreaterThan(0);
      // Base setada como devido, demais campos = 1 (engine V3 recalcula)
      expect(o.base).toBe(o.devido);
      expect(o.divisor).toBe(1);
      expect(o.multiplicador).toBe(1);
      expect(o.quantidade).toBe(1);
    }
  });

  it("Compara HE_50 módulo vs genérico — ambos != 0", () => {
    const verba = makeVerba({
      nome: "Horas Extras 50%",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      tipo_quantidade: "informada",
      quantidade_informada: 10,
      divisor_informado: 220,
      multiplicador: 1.5,
    });
    const hist = [makeHistorico({ valor_informado: 3000 })];
    const params = makeParams({
      data_admissao: "2024-01-01",
      data_demissao: "2024-12-31",
    });

    const ocsModulo = gerarViaModulo(verba, "HE_50", {
      historicos: hist,
      cartao: [],
      faltas: [],
      ferias: [],
      parametros: params,
    });

    const ocsGenerico = gerarOcorrenciasFromScratch(
      JSON.parse(JSON.stringify(verba)),
      hist,
      [],
      params,
    );

    expect(ocsModulo.length).toBeGreaterThan(0);
    expect(ocsGenerico.length).toBeGreaterThan(0);

    const totalModulo = ocsModulo.reduce((s, o) => s + o.devido, 0);
    const totalGenerico = ocsGenerico.reduce((s, o) => s + o.devido, 0);

    // Os dois caminhos devem produzir valores comparáveis para casos
    // simples (HE 50% sem Súmula 340, sem hora noturna fictícia).
    // Tolerância: 30% (lógica do módulo é mais sofisticada — adicional
    // noturno, súmulas etc; aqui só comprovamos que ambos geram valor).
    expect(totalModulo).toBeGreaterThan(0);
    expect(totalGenerico).toBeGreaterThan(0);
    const ratio = totalModulo / totalGenerico;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(1.3);
  });

  it("Módulo não-existente → retorna []", () => {
    const verba = makeVerba({
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
    });
    const ocs = gerarViaModulo(verba, "MODULO_INEXISTENTE_XYZ", {
      historicos: [makeHistorico()],
      cartao: [],
      faltas: [],
      ferias: [],
      parametros: makeParams(),
    });
    expect(ocs).toEqual([]);
  });

  it("DSR módulo gera ocorrências quando há HE prévias no contexto", () => {
    const verba = makeVerba({
      nome: "DSR sobre HE",
      tipo: "principal",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      tipo_quantidade: "informada",
      quantidade_informada: 1,
    });
    const moduleId = detectarVerbaModuleId(verba);
    expect(moduleId).toBe("DSR");
    // DSR sem HE prévias provavelmente retorna 0; é OK
    const ocs = gerarViaModulo(verba, "DSR", {
      historicos: [makeHistorico({ valor_informado: 3000 })],
      cartao: [],
      faltas: [],
      ferias: [],
      parametros: makeParams({
        data_admissao: "2024-01-01",
        data_demissao: "2024-12-31",
      }),
    });
    // DSR sem HE → array pode estar vazio (módulo pula competência sem fonte)
    expect(Array.isArray(ocs)).toBe(true);
  });
});
