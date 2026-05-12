/**
 * @vitest-environment jsdom
 *
 * Autonomia from-scratch — provar que verba "Horas Extras 50%" cadastrada
 * manualmente, SEM XML PJC importado, gera valor != 0 após
 * `preencherOcorrenciasFromScratch` ser cabeado no engine V3.
 *
 * Esse é o teste que valida a virada arquitetural: o produto deixa de
 * depender de XML PJC e vira calculadora trabalhista autônoma para as
 * verbas que o gerador cobre.
 *
 * Cobertura desta sessão (mais comuns):
 *   - Horas Extras 50% mensal (tipo_quantidade=informada)
 *   - Horas Extras 50% mensal (tipo_quantidade=cartao_ponto)
 *   - 13º salário proporcional (dezembro)
 *   - Aviso prévio indenizado (desligamento)
 *
 * Casos NÃO cobertos ainda (vão para `verbas_sem_ocorrencias`):
 *   - Férias proporcionais (período_aquisitivo) com gozo parcial + abono
 *   - Quantidade derivada de medias móveis (reflexos com 'media_*')
 */
import { describe, expect, it } from "vitest";
import {
  createEngine,
  makeVerba,
  makeHistorico,
  makeParams,
  makeIndices,
  makeINSSFaixas,
} from "./helpers";
import { gerarOcorrenciasFromScratch } from "../gerar-ocorrencias-from-scratch";
import type { PjeCartaoPonto } from "../engine-types";

const INDICES_2024 = makeIndices([
  { indice: "SELIC", competencia: "2024-01-01", valor: 0.0098, acumulado: 100 },
  { indice: "IPCA-E", competencia: "2024-01-01", valor: 0, acumulado: 100 },
  { indice: "TR", competencia: "2024-01-01", valor: 0, acumulado: 100 },
]);
const FAIXAS_INSS_2024 = makeINSSFaixas([
  { ate: 1412.0, aliquota: 0.075 },
  { ate: 2666.68, aliquota: 0.09 },
  { ate: 4000.03, aliquota: 0.12 },
  { ate: 7786.02, aliquota: 0.14 },
]);

describe("Autonomia from-scratch — Engine V3 sem XML PJC", () => {
  it("Horas Extras 50% (informada) sem PJC importado gera 12 ocorrências != zero", () => {
    const verba = makeVerba({
      nome: "Horas Extras 50%",
      valor: "calculado",
      ocorrencia_pagamento: "mensal",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      divisor_informado: 220,
      multiplicador: 1.5,
      tipo_quantidade: "informada",
      quantidade_informada: 10, // 10 horas/mês
      // NÃO seta ocorrencias_precomputadas → simula caso novo sem XML
    });
    const hist = makeHistorico({
      valor_informado: 3000,
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
    });

    const engine = createEngine({
      params: makeParams({
        data_admissao: "2024-01-01",
        data_demissao: "2024-12-31",
        data_ajuizamento: "2025-03-01",
      }),
      historicos: [hist],
      verbas: [verba],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    });
    const r = engine.liquidar();

    // Esperado por mês: 3000 / 220 × 1.5 × 10 = 204.55
    // Esperado anual: ~12 × 204.55 = 2454.55
    const verbaResult = r.verbas.find((v) => v.nome === "Horas Extras 50%");
    expect(verbaResult, "Verba HE 50% deve aparecer no resultado").toBeDefined();
    expect(
      verbaResult!.ocorrencias.length,
      "12 competências = 12 ocorrências",
    ).toBe(12);
    expect(
      verbaResult!.total_devido,
      "Total devido anual deve ficar próximo de R$ 2.454,55",
    ).toBeGreaterThan(2400);
    expect(verbaResult!.total_devido).toBeLessThan(2510);

    // Principal bruto agregado != 0 — esta é a vitória principal
    expect(r.resumo.principal_bruto).toBeGreaterThan(0);
    // E o resumo NÃO deve marcar a verba como sem ocorrências
    expect(r.resumo.verbas_sem_ocorrencias ?? []).not.toContain(
      "Horas Extras 50%",
    );
  });

  it("Horas Extras 50% via cartão de ponto (tipo_quantidade=cartao_ponto)", () => {
    const cartao: PjeCartaoPonto[] = Array.from({ length: 12 }, (_, i) => ({
      competencia: `2024-${String(i + 1).padStart(2, "0")}`,
      dias_uteis: 22,
      dias_trabalhados: 22,
      horas_extras_50: 10,
      horas_extras_100: 0,
      horas_noturnas: 0,
      intervalo_suprimido: 0,
      dsr_horas: 0,
      sobreaviso: 0,
    }));

    const verba = makeVerba({
      nome: "Horas Extras 50%",
      tipo_quantidade: "cartao_ponto",
      quantidade_informada: 0, // ignora — vai pegar do cartão
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
    });
    const hist = makeHistorico({
      valor_informado: 3000,
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
    });

    const engine = createEngine({
      params: makeParams({
        data_admissao: "2024-01-01",
        data_demissao: "2024-12-31",
      }),
      historicos: [hist],
      verbas: [verba],
      cartaoPonto: cartao,
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    });
    const r = engine.liquidar();

    expect(r.verbas[0].ocorrencias.length).toBe(12);
    expect(r.verbas[0].total_devido).toBeGreaterThan(2400);
    expect(r.resumo.principal_bruto).toBeGreaterThan(0);
  });

  it("13º salário proporcional (dezembro) com 12 avos = 1 salário", () => {
    const verba = makeVerba({
      nome: "13º Salário Proporcional",
      caracteristica: "13_salario",
      ocorrencia_pagamento: "dezembro",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      tipo_quantidade: "avos",
      quantidade_informada: 12,
    });
    const hist = makeHistorico({
      valor_informado: 3000,
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
    });

    const engine = createEngine({
      params: makeParams({
        data_admissao: "2024-01-01",
        data_demissao: "2024-12-31",
      }),
      historicos: [hist],
      verbas: [verba],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    });
    const r = engine.liquidar();

    // 12 avos × 3000/12 = 3000 (1 salário completo)
    expect(r.verbas[0].ocorrencias.length).toBe(1); // só dezembro
    expect(r.verbas[0].total_devido).toBeGreaterThan(2900);
    expect(r.verbas[0].total_devido).toBeLessThan(3100);
  });

  it("Verba não-coberta (período_aquisitivo) entra em verbas_sem_ocorrencias", () => {
    const verba = makeVerba({
      nome: "Férias Vencidas Indenizadas",
      caracteristica: "ferias",
      ocorrencia_pagamento: "periodo_aquisitivo",
      tipo_quantidade: "avos",
      quantidade_informada: 12,
    });
    const hist = makeHistorico({ valor_informado: 3000 });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    });
    const r = engine.liquidar();

    // Caso intencionalmente não coberto — gerador retorna [] e a verba
    // é marcada para banner. NÃO deve passar despercebido.
    expect(r.resumo.verbas_sem_ocorrencias ?? []).toContain(
      "Férias Vencidas Indenizadas",
    );
  });

  it("Verba 'informado' (valor direto, sem cálculo) não é tocada pelo gerador", () => {
    const verba = makeVerba({
      nome: "Indenização Adicional",
      valor: "informado",
      valor_informado_devido: 5000,
    });
    const hist = makeHistorico({ valor_informado: 3000 });
    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    });
    const r = engine.liquidar();
    // Não deve marcar como sem ocorrências (não é calculada)
    expect(r.resumo.verbas_sem_ocorrencias ?? []).not.toContain(
      "Indenização Adicional",
    );
  });
});

describe("Gerador puro — gerarOcorrenciasFromScratch (sem engine)", () => {
  it("HE 50%: gera N ocorrências respeitando fórmula PJe-Calc base×mult×qty/divisor", () => {
    const ocs = gerarOcorrenciasFromScratch(
      makeVerba({
        periodo_inicio: "2024-01-01",
        periodo_fim: "2024-12-31",
        divisor_informado: 220,
        multiplicador: 1.5,
        tipo_quantidade: "informada",
        quantidade_informada: 10,
      }),
      [makeHistorico({ valor_informado: 3000 })],
      [],
      makeParams({
        data_admissao: "2024-01-01",
        data_demissao: "2024-12-31",
      }),
    );
    expect(ocs.length).toBe(12);
    // (3000 / 220) × 1.5 × 10 = 204.5454... → HALF_EVEN_2 = 204.55
    expect(ocs[0].devido).toBeCloseTo(204.55, 2);
    expect(ocs[0].base).toBe(3000);
    expect(ocs[0].divisor).toBe(220);
    expect(ocs[0].quantidade).toBe(10);
  });

  it("Dobra (Art. 467 CLT) multiplica devido por 2", () => {
    const ocs = gerarOcorrenciasFromScratch(
      makeVerba({
        periodo_inicio: "2024-01-01",
        periodo_fim: "2024-01-31",
        divisor_informado: 220,
        multiplicador: 1,
        tipo_quantidade: "informada",
        quantidade_informada: 220,
        dobrar_valor_devido: true,
      }),
      [makeHistorico({ valor_informado: 1000 })],
      [],
      makeParams({
        data_admissao: "2024-01-01",
        data_demissao: "2024-01-31",
      }),
    );
    expect(ocs.length).toBe(1);
    // 1000 / 220 × 1 × 220 × 2 = 2000
    expect(ocs[0].devido).toBeCloseTo(2000, 2);
    expect(ocs[0].dobra).toBe(true);
  });

  it("Aviso prévio indenizado (desligamento) gera 1 ocorrência no mês de demissão", () => {
    const ocs = gerarOcorrenciasFromScratch(
      makeVerba({
        nome: "Aviso Prévio Indenizado",
        caracteristica: "aviso_previo",
        ocorrencia_pagamento: "desligamento",
        periodo_inicio: "2024-01-01",
        periodo_fim: "2024-12-31",
        divisor_informado: 1,
        multiplicador: 1,
        tipo_quantidade: "informada",
        quantidade_informada: 1,
      }),
      [makeHistorico({ valor_informado: 3000 })],
      [],
      makeParams({
        data_admissao: "2020-01-01",
        data_demissao: "2024-12-15",
      }),
    );
    expect(ocs.length).toBe(1);
    expect(ocs[0].competencia).toBe("2024-12");
    expect(ocs[0].devido).toBeCloseTo(3000, 2);
  });
});
