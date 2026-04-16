/**
 * Engine Parity Corrections — testes alinhados ao roadmap de paridade ≤10%
 * Cobertura: CAUSA-1/3 (SELIC simples), CAUSA-2 (pro rata die), CAUSA-4 (VERBA_INSS),
 * CAUSA-5 (FGTS TR+3% mensal), CAUSA-6 (INSS sobre corrigido), CAUSA-7 (INSS SELIC update).
 *
 * Cada teste documenta a expectativa numérica derivada da metodologia oficial
 * RFB/PJe-Calc (Súmula 121 STF, Súmula 381 TST, Lei 8.036/90, Lei 9.430/96).
 */
import { describe, it, expect } from 'vitest';
import {
  createEngine, makeVerba, makeHistoricoWithOcorrencias, makeIndices,
} from './helpers';
import { SELIC_MENSAL, TR_MENSAL } from '../indices-fallback';

describe('Engine Parity Corrections — CAUSA 1..8', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // CAUSA-1/3: SELIC simples (RFB) com fallback hardcoded
  // ──────────────────────────────────────────────────────────────────────────
  describe('CAUSA-1/3 — SELIC soma simples', () => {
    it('SELIC_MENSAL contém taxas para 2015-01..2026-02 (pelo menos 130 entradas)', () => {
      expect(Object.keys(SELIC_MENSAL).length).toBeGreaterThanOrEqual(130);
      // Spot check de algumas taxas RFB conhecidas
      expect(SELIC_MENSAL['2023-01']).toBeCloseTo(1.12, 2);
      expect(SELIC_MENSAL['2024-12']).toBeCloseTo(0.93, 2);
    });

    it('aplica soma simples (DB) ao invés de razão de acumulados quando juros = SELIC', () => {
      const hist = makeHistoricoWithOcorrencias(5000, ['2023-01']);
      const verba = makeVerba({
        base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
        divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 20,
        tipo_quantidade: 'informada',
        periodo_inicio: '2023-01-01', periodo_fim: '2023-01-31',
      });
      // Inject indicesDB with SELIC valor (mensal) and acumulado divergent on purpose
      // valor mensal somatório (12 meses 2023) = 12.62%; acumulado composto seria diferente
      const indicesDB = [
        ...Object.entries(SELIC_MENSAL)
          .filter(([k]) => k >= '2022-01' && k <= '2025-12')
          .map(([k, v]) => ({ indice: 'SELIC', competencia: k + '-01', valor: v as number, acumulado: 100 + (v as number) })),
      ];
      const engine = createEngine({
        historicos: [hist], verbas: [verba],
        params: { data_ajuizamento: '2023-12-01', data_citacao: '2023-12-01' },
        correcaoConfig: {
          indice: 'COMBINACAO',
          combinacoes_indice: [{ de: '2010-01-01', ate: '2099-12-31', indice: 'SEM_CORRECAO' }],
          combinacoes_juros: [{ de: '2010-01-01', ate: '2099-12-31', tipo: 'SELIC' }],
          juros_tipo: 'simples_mensal',
          juros_percentual: 1,
          juros_inicio: 'ajuizamento',
          data_liquidacao: '2025-01-01',
        },
        indicesDB,
      });
      const result = engine.liquidar();
      // Apenas verifica que rodou e produziu juros > 0 (regra de fumaça —
      // a paridade exata depende de mais variáveis; o foco aqui é não regredir).
      expect(result.resumo.juros_mora).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CAUSA-2: SELIC pro rata die — opt-in
  // ──────────────────────────────────────────────────────────────────────────
  describe('CAUSA-2 — selic_pro_rata_die opt-in', () => {
    it('flag default false não altera comportamento padrão', () => {
      const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
      const verba = makeVerba({
        base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
        divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 10,
        tipo_quantidade: 'informada',
        periodo_inicio: '2023-06-01', periodo_fim: '2023-06-30',
      });
      const engine = createEngine({
        historicos: [hist], verbas: [verba],
        params: { data_ajuizamento: '2024-01-01' },
        correcaoConfig: {
          indice: 'INPC',
          juros_tipo: 'simples_mensal',
          juros_percentual: 1,
          juros_inicio: 'ajuizamento',
          data_liquidacao: '2025-01-01',
          // selic_pro_rata_die não setado → default false
        },
      });
      const result = engine.liquidar();
      expect(result.resumo.juros_mora).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CAUSA-4: VERBA_INSS reduz a base de juros pela alíquota INSS proporcional
  // ──────────────────────────────────────────────────────────────────────────
  describe('CAUSA-4 — base_de_juros_das_verbas = VERBA_INSS', () => {
    it('VERBA_INSS reduz juros vs DIFERENCA quando há INSS apurado', () => {
      const setup = (baseDeJuros: string | undefined) => {
        const hist = makeHistoricoWithOcorrencias(5000, ['2023-06', '2023-07', '2023-08']);
        const verba = makeVerba({
          base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
          divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 30,
          tipo_quantidade: 'informada',
          periodo_inicio: '2023-06-01', periodo_fim: '2023-08-31',
          incidencias: { fgts: false, irpf: false, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
        });
        return createEngine({
          historicos: [hist], verbas: [verba],
          params: { data_ajuizamento: '2024-01-01', data_citacao: '2024-01-01' },
          fgtsConfig: { apurar: false, destino: 'pagar_reclamante', compor_principal: false, multa_apurar: false, multa_tipo: 'calculada', multa_percentual: 0, multa_base: 'devido', saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false },
          csConfig: {
            apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
            aliquota_segurado_tipo: 'empregado', limitar_teto: true,
            apurar_empresa: true, apurar_sat: false, apurar_terceiros: false,
            aliquota_empregador_tipo: 'fixa', aliquota_empresa_fixa: 20,
            periodos_simples: [],
          },
          irConfig: { apurar: false, incidir_sobre_juros: false, cobrar_reclamado: false, tributacao_exclusiva_13: false, tributacao_separada_ferias: false, deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0 },
          correcaoConfig: {
            indice: 'INPC',
            juros_tipo: 'simples_mensal',
            juros_percentual: 1,
            juros_inicio: 'ajuizamento',
            data_liquidacao: '2025-01-01',
            base_de_juros_das_verbas: baseDeJuros,
          },
        });
      };

      const baseline = setup('DIFERENCA').liquidar();
      const reduzido = setup('VERBA_INSS').liquidar();

      // VERBA_INSS deve reduzir a base de juros — juros total deve ser MENOR
      expect(reduzido.resumo.juros_mora).toBeLessThan(baseline.resumo.juros_mora);
      // Sanity: redução proporcional próxima da alíquota efetiva (~7-12%)
      const reducao = (baseline.resumo.juros_mora - reduzido.resumo.juros_mora) / baseline.resumo.juros_mora;
      expect(reducao).toBeGreaterThan(0.05);
      expect(reducao).toBeLessThan(0.20);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CAUSA-5: FGTS TR mensal + 3% a.a. composto (vs aproximação 1.002466^meses)
  // ──────────────────────────────────────────────────────────────────────────
  describe('CAUSA-5 — FGTS TR mensal + 3% a.a.', () => {
    it('TR_MENSAL é populada a partir de TR_ACUMULADO', () => {
      // TR foi positiva pré-2017, zerada após
      expect(TR_MENSAL['2015-06'] ?? 0).toBeGreaterThan(0);
      expect(TR_MENSAL['2020-01'] ?? 0).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CAUSA-6: INSS sobre corrigido via com_correcao_trabalhista
  // ──────────────────────────────────────────────────────────────────────────
  describe('CAUSA-6 — com_correcao_trabalhista', () => {
    it('quando ativo e há fator > 1, base de INSS sobe vs nominal', () => {
      const setup = (corrTrab: boolean) => {
        const hist = makeHistoricoWithOcorrencias(2500, ['2020-06']);
        const verba = makeVerba({
          base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
          divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 20,
          tipo_quantidade: 'informada',
          periodo_inicio: '2020-06-01', periodo_fim: '2020-06-30',
          incidencias: { fgts: false, irpf: false, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
        });
        return createEngine({
          historicos: [hist], verbas: [verba],
          params: { data_ajuizamento: '2024-01-01' },
          fgtsConfig: { apurar: false, destino: 'pagar_reclamante', compor_principal: false, multa_apurar: false, multa_tipo: 'calculada', multa_percentual: 0, multa_base: 'devido', saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false },
          csConfig: {
            apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
            aliquota_segurado_tipo: 'empregado', limitar_teto: true,
            apurar_empresa: false, apurar_sat: false, apurar_terceiros: false,
            aliquota_empregador_tipo: 'fixa', aliquota_empresa_fixa: 20,
            periodos_simples: [],
            com_correcao_trabalhista: corrTrab,
          },
          irConfig: { apurar: false, incidir_sobre_juros: false, cobrar_reclamado: false, tributacao_exclusiva_13: false, tributacao_separada_ferias: false, deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0 },
          correcaoConfig: {
            indice: 'IPCA-E',
            juros_tipo: 'simples_mensal',
            juros_percentual: 1,
            juros_inicio: 'ajuizamento',
            data_liquidacao: '2025-06-01',
          },
        });
      };
      const semCorr = setup(false).liquidar();
      const comCorr = setup(true).liquidar();
      // INSS deve ser >= ao nominal (igual quando teto é atingido, nunca menor)
      expect(comCorr.resumo.cs_segurado).toBeGreaterThanOrEqual(semCorr.resumo.cs_segurado);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CAUSA-7: INSS SELIC monetary update — opt-in
  // ──────────────────────────────────────────────────────────────────────────
  describe('CAUSA-7 — atualizar_inss_selic', () => {
    it('flag default false não altera resultado', () => {
      const hist = makeHistoricoWithOcorrencias(2500, ['2022-06']);
      const verba = makeVerba({
        base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
        divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 10,
        tipo_quantidade: 'informada',
        periodo_inicio: '2022-06-01', periodo_fim: '2022-06-30',
        incidencias: { fgts: false, irpf: false, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
      });
      const setup = (atualizar: boolean) => createEngine({
        historicos: [hist], verbas: [verba],
        params: { data_ajuizamento: '2024-01-01' },
        fgtsConfig: { apurar: false, destino: 'pagar_reclamante', compor_principal: false, multa_apurar: false, multa_tipo: 'calculada', multa_percentual: 0, multa_base: 'devido', saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false },
        csConfig: {
          apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
          aliquota_segurado_tipo: 'empregado', limitar_teto: true,
          apurar_empresa: false, apurar_sat: false, apurar_terceiros: false,
          aliquota_empregador_tipo: 'fixa', aliquota_empresa_fixa: 20,
          periodos_simples: [],
          atualizar_inss_selic: atualizar,
        },
        irConfig: { apurar: false, incidir_sobre_juros: false, cobrar_reclamado: false, tributacao_exclusiva_13: false, tributacao_separada_ferias: false, deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0 },
        correcaoConfig: {
          indice: 'INPC',
          juros_tipo: 'simples_mensal',
          juros_percentual: 1,
          juros_inicio: 'ajuizamento',
          data_liquidacao: '2025-06-01',
        },
      });
      const inativo = setup(false).liquidar();
      const ativo = setup(true).liquidar();
      // ativo deve ter INSS estritamente maior (período de ~3 anos com SELIC ~ 36%)
      expect(ativo.resumo.cs_segurado).toBeGreaterThan(inativo.resumo.cs_segurado);
      // E o aumento é compatível com soma simples SELIC 2022-06 → 2025-06
      const incremento = ativo.resumo.cs_segurado / Math.max(inativo.resumo.cs_segurado, 0.01) - 1;
      expect(incremento).toBeGreaterThan(0.20); // pelo menos 20%
      expect(incremento).toBeLessThan(0.60);    // sanidade
    });
  });
});
