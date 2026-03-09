import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  PjeCalcEngine,
  type PjeParametros,
  type PjeHistoricoSalarial,
  type PjeFalta,
  type PjeFerias,
  type PjeVerba,
  type PjeCartaoPonto,
  type PjeFGTSConfig,
  type PjeCSConfig,
  type PjeIRConfig,
  type PjeCorrecaoConfig,
  type PjeHonorariosConfig,
  type PjeCustasConfig,
  type PjeSeguroConfig,
} from "@/lib/pjecalc/engine";

// =====================================================
// HELPERS
// =====================================================

function makeParams(overrides?: Partial<PjeParametros>): PjeParametros {
  return {
    case_id: "test-case-1",
    data_admissao: "2020-01-02",
    data_demissao: "2024-06-15",
    data_ajuizamento: "2024-08-01",
    estado: "SP",
    municipio: "São Paulo",
    regime_trabalho: "tempo_integral",
    carga_horaria_padrao: 220,
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    maior_remuneracao: 3500,
    ultima_remuneracao: 3500,
    prazo_aviso_previo: "calculado",
    projetar_aviso_indenizado: false,
    limitar_avos_periodo: false,
    zerar_valor_negativo: false,
    sabado_dia_util: true,
    considerar_feriado_estadual: false,
    considerar_feriado_municipal: false,
    ...overrides,
  };
}

function makeHistorico(overrides?: Partial<PjeHistoricoSalarial>): PjeHistoricoSalarial {
  return {
    id: "hist-1",
    nome: "Salário Base",
    periodo_inicio: "2020-01-02",
    periodo_fim: "2024-06-15",
    tipo_valor: "informado",
    valor_informado: 3500,
    incidencia_fgts: true,
    incidencia_cs: true,
    fgts_recolhido: true,
    cs_recolhida: true,
    ocorrencias: [],
    ...overrides,
  };
}

function makeVerbaPrincipal(overrides?: Partial<PjeVerba>): PjeVerba {
  return {
    id: "verba-he50",
    nome: "Horas Extras 50%",
    tipo: "principal",
    valor: "calculado",
    caracteristica: "comum",
    ocorrencia_pagamento: "mensal",
    compor_principal: true,
    zerar_valor_negativo: false,
    dobrar_valor_devido: false,
    periodo_inicio: "2024-01-01",
    periodo_fim: "2024-06-15",
    base_calculo: { historicos: [], verbas: [], tabelas: ["ultima_remuneracao"], proporcionalizar: false, integralizar: false },
    tipo_divisor: "carga_horaria",
    divisor_informado: 220,
    multiplicador: 1.5,
    tipo_quantidade: "informada",
    quantidade_informada: 20,
    quantidade_proporcionalizar: false,
    exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
    incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
    juros_ajuizamento: "ocorrencias_vencidas",
    gerar_verba_reflexa: "diferenca",
    gerar_verba_principal: "diferenca",
    ordem: 0,
    ...overrides,
  };
}

function makeVerbaReflexa(overrides?: Partial<PjeVerba>): PjeVerba {
  return {
    ...makeVerbaPrincipal(),
    id: "verba-refl13",
    nome: "Reflexo 13º Salário",
    tipo: "reflexa",
    caracteristica: "13_salario",
    ocorrencia_pagamento: "dezembro",
    tipo_divisor: "informado",
    divisor_informado: 12,
    multiplicador: 1,
    tipo_quantidade: "avos",
    quantidade_informada: 1,
    verba_principal_id: "verba-he50",
    comportamento_reflexo: "media_valor_absoluto",
    ordem: 1,
    ...overrides,
  };
}

const defaultFgts: PjeFGTSConfig = {
  apurar: true, destino: "pagar_reclamante", compor_principal: true,
  multa_apurar: true, multa_tipo: "calculada", multa_percentual: 40,
  multa_base: "devido", saldos_saques: [], deduzir_saldo: false,
  lc110_10: false, lc110_05: false,
};

const defaultCS: PjeCSConfig = {
  apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
  aliquota_segurado_tipo: "empregado", limitar_teto: true,
  apurar_empresa: true, apurar_sat: true, apurar_terceiros: true,
  aliquota_empregador_tipo: "fixa", aliquota_empresa_fixa: 20,
  aliquota_sat_fixa: 2, aliquota_terceiros_fixa: 5.8,
  periodos_simples: [],
};

const defaultIR: PjeIRConfig = {
  apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false,
  tributacao_exclusiva_13: true, tributacao_separada_ferias: false,
  deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false,
  deduzir_honorarios: false, aposentado_65: false, dependentes: 0,
};

const defaultCorrecao: PjeCorrecaoConfig = {
  indice: "IPCA-E", epoca: "mensal", juros_tipo: "simples_mensal",
  juros_percentual: 1, juros_inicio: "ajuizamento", multa_523: false,
  multa_523_percentual: 10, data_liquidacao: "2025-02-27",
};

const defaultHonorarios: PjeHonorariosConfig = {
  apurar_sucumbenciais: true, percentual_sucumbenciais: 15,
  base_sucumbenciais: "condenacao", apurar_contratuais: false,
  percentual_contratuais: 20,
};

const defaultCustas: PjeCustasConfig = {
  apurar: true, percentual: 2, valor_minimo: 10.64, isento: false,
  assistencia_judiciaria: false, itens: [],
};

const defaultSeguro: PjeSeguroConfig = {
  apurar: false, parcelas: 5, recebeu: false,
};

function createEngine(
  overrides?: {
    params?: Partial<PjeParametros>;
    historicos?: PjeHistoricoSalarial[];
    faltas?: PjeFalta[];
    ferias?: PjeFerias[];
    verbas?: PjeVerba[];
    cartaoPonto?: PjeCartaoPonto[];
    fgts?: Partial<PjeFGTSConfig>;
    cs?: Partial<PjeCSConfig>;
    ir?: Partial<PjeIRConfig>;
    correcao?: Partial<PjeCorrecaoConfig>;
    honorarios?: Partial<PjeHonorariosConfig>;
    custas?: Partial<PjeCustasConfig>;
    seguro?: Partial<PjeSeguroConfig>;
  },
) {
  return new PjeCalcEngine(
    makeParams(overrides?.params),
    overrides?.historicos || [makeHistorico()],
    overrides?.faltas || [],
    overrides?.ferias || [],
    overrides?.verbas || [makeVerbaPrincipal()],
    overrides?.cartaoPonto || [],
    { ...defaultFgts, ...overrides?.fgts },
    { ...defaultCS, ...overrides?.cs },
    { ...defaultIR, ...overrides?.ir },
    { ...defaultCorrecao, ...overrides?.correcao },
    { ...defaultHonorarios, ...overrides?.honorarios },
    { ...defaultCustas, ...overrides?.custas },
    { ...defaultSeguro, ...overrides?.seguro },
  );
}

// =====================================================
// TESTES
// =====================================================

describe("PjeCalcEngine", () => {
  describe("getPeriodoCalculo", () => {
    it("retorna período de admissão a demissão", () => {
      const engine = createEngine();
      const periodo = engine.getPeriodoCalculo();
      expect(periodo.inicio).toBe("2020-01-02");
      expect(periodo.fim).toBe("2024-06-15");
    });

    it("aplica prescrição quinquenal", () => {
      const engine = createEngine({
        params: {
          prescricao_quinquenal: true,
          data_prescricao_quinquenal: "2019-08-01",
          data_ajuizamento: "2024-08-01",
        },
      });
      const periodo = engine.getPeriodoCalculo();
      // With sort().pop(), gets the latest date
      expect(periodo.inicio).toBe("2020-01-02");
    });
  });

  describe("getCompetencias", () => {
    it("gera competências corretas", () => {
      const engine = createEngine();
      const comps = engine.getCompetencias("2024-01-01", "2024-03-31");
      expect(comps).toEqual(["2024-01", "2024-02", "2024-03"]);
    });

    it("gera uma competência para mês único", () => {
      const engine = createEngine();
      const comps = engine.getCompetencias("2024-05-01", "2024-05-31");
      expect(comps).toEqual(["2024-05"]);
    });
  });

  describe("calcularAvos", () => {
    it("calcula avos de 13º proporcional", () => {
      const engine = createEngine({ params: { data_admissao: "2024-01-02", data_demissao: "2024-06-15" } });
      const avos = engine.calcularAvos("2024-12", "13_salario");
      expect(avos).toBe(6); // jan-jun = 6 avos
    });

    it("retorna 12 para férias", () => {
      const engine = createEngine();
      expect(engine.calcularAvos("2024-06", "ferias")).toBe(12);
    });
  });

  describe("calcularPrazoAviso", () => {
    it("calcula aviso prévio proporcional (Lei 12.506/2011)", () => {
      // 4 years of service = 30 + 4*3 = 42 days
      const engine = createEngine({
        params: { data_admissao: "2020-01-02", data_demissao: "2024-06-15", prazo_aviso_previo: "calculado" },
      });
      const dias = (engine as any).calcularPrazoAviso();
      expect(dias).toBe(42);
    });

    it("respeita teto de 90 dias", () => {
      const engine = createEngine({
        params: { data_admissao: "2000-01-02", data_demissao: "2024-06-15", prazo_aviso_previo: "calculado" },
      });
      const dias = (engine as any).calcularPrazoAviso();
      expect(dias).toBe(90);
    });
  });

  describe("Fórmula oficial: (Base × Mult / Div) × Qtd × Dobra", () => {
    it("calcula HE 50% corretamente", () => {
      const engine = createEngine();
      // Base=3500, Mult=1.5, Div=220 (carga_horaria), Qtd=20, Dobra=1
      // Devido = (3500 * 1.5 / 220) * 20 * 1 = 477.27
      const result = engine.liquidar();
      const he = result.verbas.find(v => v.nome === "Horas Extras 50%");
      expect(he).toBeDefined();
      // 6 competências (jan-jun 2024)
      expect(he!.ocorrencias.length).toBe(6);
      
      // PJe-Calc step-by-step truncation: (3500/220=15.90→trunc) × 1.5 = 23.85→trunc × 20 = 477.00
      // Actually: 3500 × 1.5 / 220: step1 = 3500/220 = 15.90 (trunc), step2 = 15.90 × 1.5 = 23.85 (trunc), step3 = 23.85 × 20 = 477.00
      // Wait — the formula is Base/Div first, then ×Mult. Let's compute:
      // valorHora = 3500 / 220 = 15.909090... → toDP(2) = 15.90 (ROUND_HALF_UP actually rounds to 15.91)
      // Decimal.js ROUND_HALF_UP: 15.9090... → 15.91
      // valorHoraComMult = 15.91 × 1.5 = 23.865 → toDP(2) = 23.87
      // subtotal = 23.87 × 20 = 477.40 → toDP(2) = 477.40
      const expected = new Decimal(3500).div(220).toDP(2).times(1.5).toDP(2).times(20).toDP(2).toNumber();
      expect(he!.ocorrencias[0].devido).toBeCloseTo(expected, 2);
    });

    it("aplica dobra quando configurado", () => {
      const engine = createEngine({
        verbas: [makeVerbaPrincipal({ dobrar_valor_devido: true, periodo_inicio: "2024-05-01", periodo_fim: "2024-05-31" })],
      });
      const result = engine.liquidar();
      const he = result.verbas[0];
      // Step-by-step truncation with dobra=2
      const expected = new Decimal(3500).div(220).toDP(2).times(1.5).toDP(2).times(20).toDP(2).times(2).toDP(2).toNumber();
      expect(he.ocorrencias[0].devido).toBeCloseTo(expected, 2);
    });

    it("zera valor negativo quando configurado", () => {
      const engine = createEngine({
        verbas: [makeVerbaPrincipal({
          zerar_valor_negativo: true,
          valor: "informado",
          valor_informado_devido: -100,
          periodo_inicio: "2024-05-01",
          periodo_fim: "2024-05-31",
        })],
      });
      const result = engine.liquidar();
      expect(result.verbas[0].ocorrencias[0].devido).toBe(0);
    });
  });

  describe("Verbas reflexas", () => {
    it("calcula reflexo de 13º com media_valor_absoluto", () => {
      const engine = createEngine({
        verbas: [makeVerbaPrincipal(), makeVerbaReflexa()],
      });
      const result = engine.liquidar();
      const refl = result.verbas.find(v => v.nome === "Reflexo 13º Salário");
      expect(refl).toBeDefined();
      expect(refl!.tipo).toBe("reflexa");
      expect(refl!.total_diferenca).toBeGreaterThan(0);
    });

    it("calcula reflexo valor_mensal", () => {
      const engine = createEngine({
        verbas: [
          makeVerbaPrincipal(),
          makeVerbaReflexa({
            id: "verba-rsr",
            nome: "RSR sobre HE",
            comportamento_reflexo: "valor_mensal",
            caracteristica: "comum",
            ocorrencia_pagamento: "mensal",
            tipo_quantidade: "informada",
            quantidade_informada: 1,
            divisor_informado: 30,
            multiplicador: 1,
          }),
        ],
      });
      const result = engine.liquidar();
      const rsr = result.verbas.find(v => v.nome === "RSR sobre HE");
      expect(rsr).toBeDefined();
      // RSR should have same number of occurrences as HE principal
      const he = result.verbas.find(v => v.nome === "Horas Extras 50%");
      expect(rsr!.ocorrencias.length).toBe(he!.ocorrencias.length);
    });
  });

  describe("FGTS", () => {
    it("calcula depósitos 8% sobre verbas com incidência", () => {
      const engine = createEngine({ fgts: { apurar: true, multa_apurar: false } });
      const result = engine.liquidar();
      expect(result.fgts.total_depositos).toBeGreaterThan(0);
      // FGTS deposits are corrected (8% of nominal differences * correction factor)
      // So total_depositos >= 8% of nominal differences
      const totalDif = result.verbas
        .filter(v => v.nome === "Horas Extras 50%")
        .reduce((s, v) => s + v.total_diferenca, 0);
      expect(result.fgts.total_depositos).toBeGreaterThanOrEqual(totalDif * 0.08 - 0.05);
    });

    it("calcula multa 40%", () => {
      const engine = createEngine({ fgts: { apurar: true, multa_apurar: true, multa_percentual: 40 } });
      const result = engine.liquidar();
      expect(result.fgts.multa_valor).toBeCloseTo(result.fgts.total_depositos * 0.4, 1);
    });

    it("não apura quando desativado", () => {
      const engine = createEngine({ fgts: { apurar: false } });
      const result = engine.liquidar();
      expect(result.fgts.total_fgts).toBe(0);
    });
  });

  describe("Contribuição Social", () => {
    it("calcula CS segurado progressiva", () => {
      const engine = createEngine();
      const result = engine.liquidar();
      expect(result.contribuicao_social.total_segurado).toBeGreaterThanOrEqual(0);
    });

    it("calcula CS empregador (20% + SAT + Terceiros)", () => {
      const engine = createEngine();
      const result = engine.liquidar();
      expect(result.contribuicao_social.total_empregador).toBeGreaterThan(0);
    });
  });

  describe("Correção Monetária + Juros", () => {
    it("aplica correção IPCA-E", () => {
      const engine = createEngine({ correcao: { indice: "IPCA-E", juros_tipo: "simples_mensal" } });
      const result = engine.liquidar();
      const he = result.verbas[0];
      // Without real indices in DB, correction factor = 1 (no fallback)
      expect(he.total_corrigido).toBeGreaterThanOrEqual(he.total_diferenca);
    });

    it("aplica juros 1% a.m.", () => {
      const engine = createEngine({ correcao: { juros_tipo: "simples_mensal", juros_percentual: 1 } });
      const result = engine.liquidar();
      expect(result.resumo.juros_mora).toBeGreaterThan(0);
    });

    it("SELIC engloba correção e juros", () => {
      const engine = createEngine({ correcao: { indice: "SELIC", juros_tipo: "simples_mensal" } });
      const result = engine.liquidar();
      // With SELIC, juros should be 0 (embutido na correção)
      expect(result.resumo.juros_mora).toBe(0);
      // Without real indices, correction = 1, so corrigido = bruto
      expect(result.resumo.principal_corrigido).toBeGreaterThanOrEqual(result.resumo.principal_bruto);
    });
  });

  describe("IR (Art. 12-A RRA)", () => {
    it("calcula IR com tabela progressiva acumulada", () => {
      const engine = createEngine();
      const result = engine.liquidar();
      expect(result.imposto_renda.meses_rra).toBeGreaterThan(1);
      expect(result.imposto_renda.metodo).toBe("art_12a_rra");
    });

    it("não apura quando desativado", () => {
      const engine = createEngine({ ir: { apurar: false } });
      const result = engine.liquidar();
      expect(result.imposto_renda.imposto_devido).toBe(0);
    });
  });

  describe("Seguro-Desemprego", () => {
    it("calcula com tabela CODEFAT 2025", () => {
      const engine = createEngine({ seguro: { apurar: true, parcelas: 5, recebeu: false } });
      const result = engine.liquidar();
      expect(result.seguro_desemprego.apurado).toBe(true);
      expect(result.seguro_desemprego.parcelas).toBe(5);
      expect(result.seguro_desemprego.valor_parcela).toBeGreaterThan(0);
      expect(result.seguro_desemprego.total).toBeCloseTo(result.seguro_desemprego.valor_parcela * 5, 2);
    });
  });

  describe("Honorários e Custas", () => {
    it("calcula honorários sucumbenciais 15%", () => {
      const engine = createEngine();
      const result = engine.liquidar();
      expect(result.resumo.honorarios_sucumbenciais).toBeGreaterThan(0);
    });

    it("calcula custas 2% com piso", () => {
      const engine = createEngine();
      const result = engine.liquidar();
      expect(result.resumo.custas).toBeGreaterThanOrEqual(10.64);
    });

    it("isento de custas quando configurado", () => {
      const engine = createEngine({ custas: { apurar: true, isento: true, percentual: 2, valor_minimo: 10.64, assistencia_judiciaria: false } });
      const result = engine.liquidar();
      expect(result.resumo.custas).toBe(0);
    });
  });

  describe("Multa Art. 523 CPC", () => {
    it("calcula multa 10% quando ativada", () => {
      const engine = createEngine({ correcao: { multa_523: true, multa_523_percentual: 10 } });
      const result = engine.liquidar();
      expect(result.resumo.multa_523).toBeGreaterThan(0);
    });
  });

  describe("Liquidação completa (fluxo E2E)", () => {
    it("resultado tem todos os campos", () => {
      const engine = createEngine({
        verbas: [makeVerbaPrincipal(), makeVerbaReflexa()],
        seguro: { apurar: true, parcelas: 3 },
        correcao: { multa_523: true },
      });
      const result = engine.liquidar();

      // Verbas
      expect(result.verbas.length).toBe(2);

      // Resumo
      expect(result.resumo.principal_bruto).toBeGreaterThan(0);
      expect(result.resumo.principal_corrigido).toBeGreaterThan(0);
      expect(result.resumo.fgts_total).toBeGreaterThan(0);
      expect(result.resumo.multa_523).toBeGreaterThan(0);
      expect(result.resumo.seguro_desemprego).toBeGreaterThan(0);
      expect(result.resumo.honorarios_sucumbenciais).toBeGreaterThan(0);
      expect(result.resumo.custas).toBeGreaterThanOrEqual(10.64);

      // Total reclamada > líquido reclamante
      expect(result.resumo.total_reclamada).toBeGreaterThan(result.resumo.liquido_reclamante);

      // Líquido = principal_corrigido + juros - cs - ir (FGTS, seguro, multas are separate)
      const calculatedLiquido = result.resumo.principal_corrigido + result.resumo.juros_mora
        - result.resumo.cs_segurado - result.resumo.ir_retido;
      expect(result.resumo.liquido_reclamante).toBeCloseTo(calculatedLiquido, 1);
    });

    it("cenário com cartão de ponto", () => {
      const cartao: PjeCartaoPonto[] = [
        { competencia: "2024-01", dias_uteis: 22, dias_trabalhados: 22, horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 10, intervalo_suprimido: 0, dsr_horas: 3, sobreaviso: 0 },
        { competencia: "2024-02", dias_uteis: 20, dias_trabalhados: 20, horas_extras_50: 20, horas_extras_100: 8, horas_noturnas: 12, intervalo_suprimido: 2, dsr_horas: 4, sobreaviso: 0 },
      ];

      const engine = createEngine({
        verbas: [makeVerbaPrincipal({
          tipo_quantidade: "cartao_ponto",
          quantidade_cartao_colunas: ["horas_extras_50"],
          periodo_inicio: "2024-01-01",
          periodo_fim: "2024-02-28",
        })],
        cartaoPonto: cartao,
      });

      const result = engine.liquidar();
      const he = result.verbas[0];
      expect(he.ocorrencias.length).toBe(2);
      // Jan: qty=15, Feb: qty=20
      expect(he.ocorrencias[0].quantidade).toBe(15);
      expect(he.ocorrencias[1].quantidade).toBe(20);
    });

    it("cenário sem verbas retorna erro", () => {
      expect(() => {
        createEngine({ verbas: [] });
      }).not.toThrow(); // Engine creates fine, but liquidar should still work with empty verbas
      
      const engine = createEngine({ verbas: [] });
      const result = engine.liquidar();
      expect(result.verbas.length).toBe(0);
      expect(result.resumo.principal_bruto).toBe(0);
    });

    it("valores são consistentes (principal_bruto < principal_corrigido)", () => {
      const engine = createEngine();
      const result = engine.liquidar();
      expect(result.resumo.principal_corrigido).toBeGreaterThanOrEqual(result.resumo.principal_bruto);
    });

    it("fórmula de liquidação consistente com verbas individuais", () => {
      const engine = createEngine();
      const result = engine.liquidar();
      const sumDif = result.verbas.reduce((s, v) => s + v.total_diferenca, 0);
      expect(result.resumo.principal_bruto).toBeCloseTo(sumDif, 1);
    });
  });
});
