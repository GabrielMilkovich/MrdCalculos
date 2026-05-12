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

  it("Verba periodo_aquisitivo SEM dados de férias E sem demissão entra em verbas_sem_ocorrencias", () => {
    const verba = makeVerba({
      nome: "Férias Vencidas Indenizadas",
      caracteristica: "ferias",
      ocorrencia_pagamento: "periodo_aquisitivo",
      tipo_quantidade: "avos",
      quantidade_informada: 12,
    });
    const hist = makeHistorico({ valor_informado: 3000 });

    const engine = createEngine({
      // Sem data_demissao e sem ferias[] → gerador devolve []
      params: makeParams({ data_demissao: undefined }),
      historicos: [hist],
      verbas: [verba],
      ferias: [],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    });
    const r = engine.liquidar();
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

describe("Sessão 3 — Pagamentos históricos extras deduzidos do resumo", () => {
  const verbaPadrao = () =>
    makeVerba({
      nome: "Horas Extras 50%",
      ocorrencia_pagamento: "mensal",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      tipo_quantidade: "informada",
      quantidade_informada: 10,
    });

  it("Pagamento de R$ 1000 no principal deduz de principal_corrigido e liquido_reclamante", () => {
    const opts = {
      params: { data_admissao: "2024-01-01", data_demissao: "2024-12-31" },
      historicos: [makeHistorico({ valor_informado: 3000 })],
      verbas: [verbaPadrao()],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    };
    const refSem = createEngine(opts).liquidar();
    const liquidoOriginal = refSem.resumo.liquido_reclamante;
    expect(liquidoOriginal).toBeGreaterThan(0);

    const refCom = createEngine({
      ...opts,
      pagamentos: [
        {
          id: "pag-1",
          data_pagamento: "2025-01-15",
          valor_pagamento: 1000,
          apurar_valor_principal: true,
          valor_parcela_principal: 1000,
        },
      ],
    }).liquidar();

    expect(refCom.resumo.liquido_reclamante).toBeCloseTo(liquidoOriginal - 1000, 0);
    expect(refCom.resumo.pagamentos_deduzidos?.principal).toBeCloseTo(1000, 0);
    expect(refCom.resumo.pagamentos_deduzidos?.total).toBeCloseTo(1000, 0);
  });

  it("Pagamento não cria saldo negativo (floor em 0)", () => {
    const r = createEngine({
      params: { data_admissao: "2024-01-01", data_demissao: "2024-12-31" },
      historicos: [makeHistorico({ valor_informado: 100 })],
      verbas: [
        makeVerba({
          tipo_quantidade: "informada",
          quantidade_informada: 1,
        }),
      ],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
      pagamentos: [
        {
          id: "pag-grande",
          data_pagamento: "2025-01-15",
          valor_pagamento: 999999,
          apurar_valor_principal: true,
          valor_parcela_principal: 999999,
        },
      ],
    }).liquidar();
    expect(r.resumo.principal_corrigido).toBe(0);
    expect(r.resumo.liquido_reclamante).toBe(0);
  });

  it("Pagamento de FGTS deduz só do FGTS, não afeta principal", () => {
    const opts = {
      params: { data_admissao: "2024-01-01", data_demissao: "2024-12-31" },
      historicos: [makeHistorico({ valor_informado: 3000 })],
      verbas: [verbaPadrao()],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    };
    const refSem = createEngine(opts).liquidar();
    const refCom = createEngine({
      ...opts,
      pagamentos: [
        {
          id: "pag-fgts",
          data_pagamento: "2025-01-15",
          valor_pagamento: 200,
          apurar_valor_fgts: true,
          valor_parcela_fgts: 200,
        },
      ],
    }).liquidar();

    // Principal não muda
    expect(refCom.resumo.principal_corrigido).toBeCloseTo(
      refSem.resumo.principal_corrigido,
      1,
    );
    // FGTS reduz (ou zera se < 200)
    expect(refCom.resumo.fgts_total).toBeLessThan(refSem.resumo.fgts_total + 0.01);
    expect(refCom.resumo.pagamentos_deduzidos?.fgts).toBeCloseTo(200, 0);
    expect(refCom.resumo.pagamentos_deduzidos?.principal).toBe(0);
  });
});

describe("Sessão 2 — Férias (PERIODO_AQUISITIVO) e Reflexos com médias", () => {
  it("Férias INDENIZADAS gera ocorrência no demissão (não é mais zero silencioso)", () => {
    const verba = makeVerba({
      nome: "Férias Indenizadas",
      caracteristica: "ferias",
      ocorrencia_pagamento: "periodo_aquisitivo",
      periodo_inicio: "2020-01-01",
      periodo_fim: "2024-12-31",
      divisor_informado: 30,
      multiplicador: 1,
      tipo_quantidade: "informada",
      quantidade_informada: 30,
    });
    const hist = makeHistorico({ valor_informado: 3000 });
    const engine = createEngine({
      params: makeParams({
        data_admissao: "2020-01-01",
        data_demissao: "2024-12-31",
      }),
      historicos: [hist],
      verbas: [verba],
      ferias: [
        {
          id: "fer-1",
          relativas: "2023/2024",
          periodo_aquisitivo_inicio: "2023-01-01",
          periodo_aquisitivo_fim: "2023-12-31",
          periodo_concessivo_inicio: "2024-01-01",
          periodo_concessivo_fim: "2024-12-31",
          prazo_dias: 30,
          situacao: "indenizadas",
          dobra: false,
          abono: false,
        },
      ],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    });
    const r = engine.liquidar();
    // 30 dias × R$ 3000 / 30 = R$ 3000
    expect(r.verbas[0].ocorrencias.length).toBeGreaterThanOrEqual(1);
    expect(r.verbas[0].total_devido).toBeGreaterThan(0);
    expect(r.resumo.verbas_sem_ocorrencias ?? []).not.toContain(
      "Férias Indenizadas",
    );
  });

  it("Férias GOZADAS gera 1 ocorrência por gozo", () => {
    const verba = makeVerba({
      nome: "Férias Gozadas",
      caracteristica: "ferias",
      ocorrencia_pagamento: "periodo_aquisitivo",
      periodo_inicio: "2023-01-01",
      periodo_fim: "2024-12-31",
      divisor_informado: 30,
      multiplicador: 1,
      tipo_quantidade: "informada",
      quantidade_informada: 30,
    });
    const hist = makeHistorico({ valor_informado: 3000 });
    const engine = createEngine({
      params: makeParams({
        data_admissao: "2020-01-01",
        data_demissao: "2024-12-31",
      }),
      historicos: [hist],
      verbas: [verba],
      ferias: [
        {
          id: "fer-2",
          relativas: "2023/2024",
          periodo_aquisitivo_inicio: "2023-01-01",
          periodo_aquisitivo_fim: "2023-12-31",
          periodo_concessivo_inicio: "2024-01-01",
          periodo_concessivo_fim: "2024-12-31",
          prazo_dias: 30,
          situacao: "gozadas",
          dobra: false,
          abono: false,
          periodos_gozo: [{ inicio: "2024-06-01", fim: "2024-06-30", dias: 30 }],
        },
      ],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    });
    const r = engine.liquidar();
    expect(r.verbas[0].ocorrencias.length).toBeGreaterThanOrEqual(1);
    expect(r.verbas[0].total_devido).toBeGreaterThan(0);
  });

  it("Reflexo de 13º sobre HE com media_valor_absoluto", () => {
    const principal = makeVerba({
      id: "principal-he",
      nome: "Horas Extras 50%",
      tipo: "principal",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      tipo_quantidade: "informada",
      quantidade_informada: 10,
      divisor_informado: 220,
      multiplicador: 1.5,
    });
    const reflexa = makeVerba({
      id: "ref-13",
      nome: "Reflexo HE → 13º",
      tipo: "reflexa",
      verba_principal_id: "principal-he",
      ocorrencia_pagamento: "dezembro",
      periodo_inicio: "2024-01-01",
      periodo_fim: "2024-12-31",
      comportamento_reflexo: "media_valor_absoluto",
      periodo_media_reflexo: "ano_civil",
      multiplicador: 1, // o reflexo já é a média
      divisor_informado: 1,
      tipo_quantidade: "informada",
      quantidade_informada: 1,
    });
    const hist = makeHistorico({ valor_informado: 3000 });
    const engine = createEngine({
      params: makeParams({
        data_admissao: "2024-01-01",
        data_demissao: "2024-12-31",
      }),
      historicos: [hist],
      verbas: [principal, reflexa],
      indicesDB: INDICES_2024,
      faixasINSSDB: FAIXAS_INSS_2024,
    });
    const r = engine.liquidar();
    // Principal HE: 12 × R$ 204,55 ≈ R$ 2454,55
    const principalResult = r.verbas.find((v) => v.nome === "Horas Extras 50%");
    expect(principalResult!.total_devido).toBeGreaterThan(2400);

    // Reflexo: média = R$ 204,55 em dezembro
    const reflexoResult = r.verbas.find((v) => v.nome === "Reflexo HE → 13º");
    expect(reflexoResult).toBeDefined();
    expect(reflexoResult!.ocorrencias.length).toBeGreaterThanOrEqual(1);
    expect(reflexoResult!.total_devido).toBeGreaterThan(150);
    expect(reflexoResult!.total_devido).toBeLessThan(250);
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
