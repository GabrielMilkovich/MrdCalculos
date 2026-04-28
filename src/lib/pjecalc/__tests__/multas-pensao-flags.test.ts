/**
 * Sprint 4.2-B2 — TIER 2 P1: 4 flags
 *
 * Testa a integração das flags órfãs/parciais ao engine V3:
 *   1) simples_nacional   — LC 123/2006 art.13 §3 (CS empresa = 0)
 *   2) apurar_467         — CLT art.467 (multa 50% verbas incontroversas)
 *   3) apurar_477         — CLT art.477 §8 (multa 1 salário se rescisão atrasou)
 *   4) PensaoAlimenticia.apurar — CC art.1.694 (deduz IR + decrementa líquido)
 *
 * Defaults (preservar 96% calibrate):
 *   - simples_nacional:  false
 *   - apurar_467:        true (preserva FGTS multa 467 atual + estende)
 *   - apurar_477:        false (novo)
 *   - pensao apurar:     false (preservar)
 */
import { describe, it, expect } from 'vitest';
import { PjeCalcEngineV3 } from '../engine-v3';
import type {
  PjeParametros, PjeVerba,
  PjeFGTSConfig, PjeCSConfig, PjeIRConfig,
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjeIndiceRow, PjeINSSFaixaRow, PjeMultasConfig, PjePensaoConfig,
} from '../engine-types';
import {
  SELIC_MENSAL, SELIC_ACUMULADO, IPCA_E_ACUMULADO, TR_ACUMULADO,
} from '../indices-fallback';

const INDICES: PjeIndiceRow[] = (() => {
  const rows: PjeIndiceRow[] = [];
  for (const [c, v] of Object.entries(SELIC_MENSAL).sort()) {
    rows.push({ indice: 'SELIC', competencia: c + '-01', valor: v, acumulado: SELIC_ACUMULADO[c] ?? 100 });
  }
  for (const [c, a] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    rows.push({ indice: 'IPCA-E', competencia: c + '-01', valor: 0, acumulado: a });
    rows.push({ indice: 'IPCAE', competencia: c + '-01', valor: 0, acumulado: a });
    rows.push({ indice: 'IPCA', competencia: c + '-01', valor: 0, acumulado: a });
  }
  for (const [c, a] of Object.entries(TR_ACUMULADO).sort()) {
    rows.push({ indice: 'TR', competencia: c + '-01', valor: 0, acumulado: a });
  }
  return rows;
})();

const FAIXAS: PjeINSSFaixaRow[] = [
  { competencia_inicio: '2023-01-01', competencia_fim: null, faixa: 1, valor_ate: 1320, aliquota: 0.075 },
  { competencia_inicio: '2023-01-01', competencia_fim: null, faixa: 2, valor_ate: 2571.29, aliquota: 0.09 },
  { competencia_inicio: '2023-01-01', competencia_fim: null, faixa: 3, valor_ate: 3856.94, aliquota: 0.12 },
  { competencia_inicio: '2023-01-01', competencia_fim: null, faixa: 4, valor_ate: 7507.49, aliquota: 0.14 },
];

const baselineParams = (): PjeParametros => ({
  case_id: 'flag-test-b2',
  data_admissao: '2020-01-01',
  data_demissao: '2023-06-30',
  data_ajuizamento: '2023-07-10',
  data_citacao: '2023-07-10',
  estado: 'SP', municipio: 'SAO PAULO',
  regime_trabalho: 'tempo_integral', carga_horaria_padrao: 220,
  prescricao_quinquenal: false, prescricao_fgts: false, projetar_aviso_indenizado: false,
  modo_calculo: 'independent',
  limitar_avos_periodo: false, zerar_valor_negativo: false,
  sabado_dia_util: false, considerar_feriado_estadual: false,
  considerar_feriado_municipal: false, prazo_aviso_previo: 'nao_apurar',
  ultima_remuneracao: 5000,
  maior_remuneracao: 5000,
});

const baselineVerba = (): PjeVerba => ({
  id: 'v1', nome: 'HORAS EXTRAS 50%', tipo: 'principal', valor: 'informado',
  caracteristica: 'comum', ocorrencia_pagamento: 'mensal', compor_principal: true,
  zerar_valor_negativo: false, dobrar_valor_devido: false,
  periodo_inicio: '2023-01-01', periodo_fim: '2023-06-30',
  base_calculo: { historicos: [], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
  tipo_divisor: 'informado', divisor_informado: 1, multiplicador: 1,
  tipo_quantidade: 'informada', quantidade_informada: 1, quantidade_proporcionalizar: false,
  exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
  incidencias: {
    fgts: true, irpf: true, contribuicao_social: true,
    previdencia_privada: false, pensao_alimenticia: false,
  },
  juros_ajuizamento: 'ocorrencias_vencidas',
  gerar_verba_reflexa: 'diferenca', gerar_verba_principal: 'diferenca', ordem: 1,
  ocorrencias_precomputadas: Array.from({ length: 6 }, (_, i) => ({
    competencia: `2023-${String(i + 1).padStart(2, '0')}`,
    base: 5000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: false,
    devido: 5000, pago: 0,
  })),
});

const baselineFGTS = (): PjeFGTSConfig => ({
  apurar: false, destino: 'pagar_reclamante', compor_principal: false,
  multa_apurar: false, multa_tipo: 'calculada', multa_percentual: 40, multa_base: 'devido',
  saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false,
});

const baselineCS = (overrides: Partial<PjeCSConfig> = {}): PjeCSConfig => ({
  apurar_segurado: false, cobrar_reclamante: false, cs_sobre_salarios_pagos: false,
  aliquota_segurado_tipo: 'empregado', limitar_teto: true,
  apurar_empresa: true, apurar_sat: true, apurar_terceiros: true,
  aliquota_empregador_tipo: 'fixa',
  aliquota_empresa_fixa: 20, aliquota_sat_fixa: 2, aliquota_terceiros_fixa: 5.8,
  periodos_simples: [],
  ...overrides,
});

const baselineIR = (overrides: Partial<PjeIRConfig> = {}): PjeIRConfig => ({
  apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false,
  tributacao_exclusiva_13: false, tributacao_separada_ferias: false,
  deduzir_cs: false, deduzir_prev_privada: false,
  deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0,
  ...overrides,
});

const baselineCorrecao = (): PjeCorrecaoConfig => ({
  indice: 'IPCA-E', epoca: 'mensal',
  juros_tipo: 'simples_mensal', juros_percentual: 1,
  juros_inicio: 'citacao', multa_523: false, multa_523_percentual: 10,
  data_liquidacao: '2024-12-31',
  multa_467: true,
  multa_467_percentual: 50,
});

const baselineHonorarios = (): PjeHonorariosConfig => ({
  apurar_sucumbenciais: false, percentual_sucumbenciais: 15, base_sucumbenciais: 'condenacao',
  apurar_contratuais: false, percentual_contratuais: 0,
});

const baselineCustas = (): PjeCustasConfig => ({
  apurar: false, percentual: 2, valor_minimo: 10.64,
  isento: false, assistencia_judiciaria: false, itens: [],
});

const baselineSeguro = (): PjeSeguroConfig => ({
  apurar: false, parcelas: 0, recebeu: false,
});

function runEngine(opts: {
  cs?: Partial<PjeCSConfig>;
  ir?: Partial<PjeIRConfig>;
  multas?: Partial<PjeMultasConfig>;
  pensao?: Partial<PjePensaoConfig>;
  verba?: PjeVerba;
} = {}) {
  const cs = baselineCS(opts.cs);
  const ir = baselineIR(opts.ir);
  const multas: PjeMultasConfig = {
    apurar_467: false, apurar_477: false,
    ...opts.multas,
  };
  const pensao: PjePensaoConfig | undefined = opts.pensao
    ? { apurar: false, percentual: 0, base: 'liquido', ...opts.pensao }
    : undefined;
  const engine = new PjeCalcEngineV3(
    baselineParams(), [], [], [],
    [opts.verba ?? baselineVerba()], [],
    baselineFGTS(), cs, ir, baselineCorrecao(),
    baselineHonorarios(), baselineCustas(), baselineSeguro(),
    INDICES, FAIXAS,
    [], [], [], undefined, pensao, undefined,
    [], [], [], [], multas,
  );
  return engine.liquidar();
}

describe('Sprint 4.2-B2 — TIER 2 P1 multas/pensao flags', () => {
  describe('simples_nacional (LC 123/2006 art.13 §3º)', () => {
    it('default (não setado) — CS empresa apurada normalmente', () => {
      const r = runEngine({ cs: { apurar_segurado: false } });
      expect(r.resumo.cs_empregador).toBeGreaterThan(0);
    });

    it('simples_nacional=true → CS empresa+SAT+terceiros = 0', () => {
      const r = runEngine({ cs: { simples_nacional: true } });
      expect(r.resumo.cs_empregador).toBe(0);
      for (const c of r.contribuicao_social.empregador) {
        expect(c.empresa).toBe(0);
        expect(c.sat).toBe(0);
        expect(c.terceiros).toBe(0);
      }
    });
  });

  describe('apurar_467 (CLT art.467)', () => {
    it('default (não setado) — preserva comportamento legado (sem multa adicional)', () => {
      const r = runEngine({ multas: {} });
      expect(r.resumo.multa_467).toBe(0);
    });

    it('apurar_467=true → estende para verbas comum incontroversas (compor_principal+diferença>0)', () => {
      const r = runEngine({ multas: { apurar_467: true, apurar_477: false } });
      expect(r.resumo.multa_467).toBeGreaterThan(0);
    });

    it('apurar_467=false → multa 467 = 0 mesmo com legacy multa_467=true', () => {
      const r = runEngine({ multas: { apurar_467: false, apurar_477: false } });
      expect(r.resumo.multa_467).toBe(0);
    });
  });

  describe('apurar_477 (CLT art.477 §8º)', () => {
    it('default (não setado) — multa 477 = 0', () => {
      const r = runEngine({ multas: {} });
      expect(r.resumo.multa_477 ?? 0).toBe(0);
    });

    it('apurar_477=true (default tipo "salario") → multa = ultima_remuneracao', () => {
      const r = runEngine({
        multas: { apurar_467: false, apurar_477: true, valor_477_tipo: 'salario' },
      });
      expect(r.resumo.multa_477).toBeCloseTo(5000, 2);
    });

    it('apurar_477=true + valor_informado → multa = valor_informado', () => {
      const r = runEngine({
        multas: {
          apurar_467: false, apurar_477: true,
          valor_477_tipo: 'informado', valor_477_informado: 1234.56,
        },
      });
      expect(r.resumo.multa_477).toBeCloseTo(1234.56, 2);
    });

    it('apurar_477=true → líquido aumenta em 1 salário (vs OFF)', () => {
      const off = runEngine({ multas: { apurar_467: false, apurar_477: false } });
      const on  = runEngine({ multas: { apurar_467: false, apurar_477: true } });
      const delta = on.resumo.liquido_reclamante - off.resumo.liquido_reclamante;
      expect(delta).toBeCloseTo(5000, 0);
    });
  });

  describe('PensaoAlimenticia.apurar (CC art.1.694 + Lei 9.250/95)', () => {
    it('default (sem pensaoConfig) — pensão_total = 0, IR padrão', () => {
      const r = runEngine();
      expect(r.resumo.pensao_total).toBe(0);
    });

    it('pensao apurar=false → pensão_total = 0', () => {
      const r = runEngine({ pensao: { apurar: false, percentual: 30 } });
      expect(r.resumo.pensao_total).toBe(0);
    });

    it('pensao apurar=true → pensão_total > 0 e líquido reclamante DECRESCE', () => {
      const off = runEngine({ pensao: { apurar: false, percentual: 30 } });
      const on  = runEngine({ pensao: { apurar: true, percentual: 30, base: 'liquido' } });
      expect(on.resumo.pensao_total).toBeGreaterThan(0);
      expect(on.resumo.liquido_reclamante).toBeLessThan(off.resumo.liquido_reclamante);
    });

    it('pensao apurar=true + descontar_antes_ir=true → IR menor que sem dedução', () => {
      // apurar_rra=true: força NM=cardinalidade dos sets (não span+stretch),
      // garantindo IR > 0 em fixtures de período curto.
      const semDeducao = runEngine({
        ir: { apurar: true, apurar_rra: true, deduzir_pensao: false },
        pensao: { apurar: true, percentual: 30, descontar_antes_ir: false },
      });
      const comDeducao = runEngine({
        ir: { apurar: true, apurar_rra: true, deduzir_pensao: true },
        pensao: { apurar: true, percentual: 30, descontar_antes_ir: true },
      });
      expect(comDeducao.resumo.ir_retido).toBeLessThan(semDeducao.resumo.ir_retido);
    });
  });
});
