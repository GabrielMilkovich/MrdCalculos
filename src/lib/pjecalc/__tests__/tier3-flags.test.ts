/**
 * Sprint 4.2-C1 — TIER 3 P2: 9 flags
 *
 * Pensao (4):
 *   1) incidir_sobre_juros            — pensão também sobre juros (com base 'principal')
 *   2) incidencia_sobre_fgts          — pensão sobre depósitos FGTS
 *   3) incidencia_sobre_multa_fgts    — pensão sobre multa 40% FGTS
 *   4) descontar_antes_ir             — pensão deduzida ANTES do cálculo IR (Lei 9.250/95)
 *
 * Atualizacao (4):
 *   5) aplicar_pensao                  — soma pensao_total ao total_atualizado
 *   6) aplicar_multas_indenizacoes     — soma multas/indenizações
 *   7) aplicar_honorarios              — soma honorários
 *   8) aplicar_custas                  — soma custas
 *
 * Honorarios (1):
 *   9) aplicar_juros (item)            — juros mora sobre honorário (OJ-348 SDI-1)
 *
 * Defaults (preservar 96% calibrate):
 *   - incidir_sobre_juros / incidencia_sobre_*: false (UI default — sem regressão)
 *   - descontar_antes_ir: true no UI (mas só ativa via pensao.apurar=true; default
 *     do engine para pensaoConfig é apurar=false → no-op)
 *   - atualizacaoConfig.aplicar_*: TODOS false (total_atualizado = total_reclamada)
 *   - honorario item.aplicar_juros: false (sem juros sobre honorário)
 */
import { describe, it, expect } from 'vitest';
import { PjeCalcEngineV3 } from '../engine-v3';
import type {
  PjeParametros, PjeVerba,
  PjeFGTSConfig, PjeCSConfig, PjeIRConfig,
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjeIndiceRow, PjeINSSFaixaRow, PjeMultasConfig, PjePensaoConfig,
  PjeAtualizacaoConfig,
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
  case_id: 'tier3-c1',
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

// FGTS com depósitos + multa 40% para testes de pensão sobre FGTS
const fgtsComDepositos = (): PjeFGTSConfig => ({
  apurar: true, destino: 'pagar_reclamante', compor_principal: true,
  multa_apurar: true, multa_tipo: 'calculada', multa_percentual: 40, multa_base: 'devido',
  saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false,
  aliquota: 8,
});

const fgtsOff = (): PjeFGTSConfig => ({
  apurar: false, destino: 'pagar_reclamante', compor_principal: false,
  multa_apurar: false, multa_tipo: 'calculada', multa_percentual: 40, multa_base: 'devido',
  saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false,
});

const baselineCS = (overrides: Partial<PjeCSConfig> = {}): PjeCSConfig => ({
  apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
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
  deduzir_cs: true, deduzir_prev_privada: false,
  deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0,
  ...overrides,
});

const baselineCorrecao = (): PjeCorrecaoConfig => ({
  indice: 'IPCA-E', epoca: 'mensal',
  juros_tipo: 'simples_mensal', juros_percentual: 1,
  juros_inicio: 'citacao', multa_523: false, multa_523_percentual: 10,
  data_liquidacao: '2024-12-31',
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
  honorarios?: PjeHonorariosConfig;
  fgts?: PjeFGTSConfig;
  atualizacao?: PjeAtualizacaoConfig;
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
    opts.fgts ?? fgtsOff(), cs, ir, baselineCorrecao(),
    opts.honorarios ?? baselineHonorarios(), baselineCustas(), baselineSeguro(),
    INDICES, FAIXAS,
    [], [], [], undefined, pensao, undefined,
    [], [], [], [], multas, opts.atualizacao,
  );
  return engine.liquidar();
}

describe('Sprint 4.2-C1 — TIER 3 P2 (9 flags)', () => {
  // ───────── Pensao ─────────
  describe('Pensao.incidir_sobre_juros', () => {
    it('OFF (default) com base=principal — pensão NÃO incide sobre juros', () => {
      const off = runEngine({
        pensao: { apurar: true, percentual: 30, base: 'principal', incidir_sobre_juros: false },
      });
      const on = runEngine({
        pensao: { apurar: true, percentual: 30, base: 'principal', incidir_sobre_juros: true },
      });
      // Pensão ON > OFF porque juros entram na base
      expect(on.resumo.pensao_total).toBeGreaterThan(off.resumo.pensao_total);
      // E o líquido do reclamante é proporcionalmente menor
      expect(on.resumo.liquido_reclamante).toBeLessThan(off.resumo.liquido_reclamante);
    });
  });

  describe('Pensao.incidencia_sobre_fgts (Lei 5.478/68 art.4º)', () => {
    it('OFF (default) — pensão_sobre_fgts = 0', () => {
      const r = runEngine({
        fgts: fgtsComDepositos(),
        pensao: { apurar: true, percentual: 30, base: 'principal' },
      });
      expect(r.resumo.pensao_sobre_fgts).toBe(0);
    });

    it('ON — pensão_sobre_fgts > 0 e somada em pensao_total', () => {
      const off = runEngine({
        fgts: fgtsComDepositos(),
        pensao: { apurar: true, percentual: 30, base: 'principal' },
      });
      const on = runEngine({
        fgts: fgtsComDepositos(),
        pensao: { apurar: true, percentual: 30, base: 'principal', incidencia_sobre_fgts: true },
      });
      expect(on.resumo.pensao_sobre_fgts).toBeGreaterThan(0);
      expect(on.resumo.pensao_total).toBeGreaterThan(off.resumo.pensao_total);
    });
  });

  describe('Pensao.incidencia_sobre_multa_fgts', () => {
    it('OFF (default) com FGTS+multa — pensão_sobre_fgts = 0', () => {
      const r = runEngine({
        fgts: fgtsComDepositos(),
        pensao: { apurar: true, percentual: 30, base: 'principal' },
      });
      expect(r.resumo.pensao_sobre_fgts).toBe(0);
    });

    it('ON — pensão_sobre_fgts inclui parcela da multa 40%', () => {
      const soDepositos = runEngine({
        fgts: fgtsComDepositos(),
        pensao: {
          apurar: true, percentual: 30, base: 'principal', incidencia_sobre_fgts: true,
        },
      });
      const depositosMaisMulta = runEngine({
        fgts: fgtsComDepositos(),
        pensao: {
          apurar: true, percentual: 30, base: 'principal',
          incidencia_sobre_fgts: true, incidencia_sobre_multa_fgts: true,
        },
      });
      expect(depositosMaisMulta.resumo.pensao_sobre_fgts)
        .toBeGreaterThan(soDepositos.resumo.pensao_sobre_fgts);
    });
  });

  describe('Pensao.descontar_antes_ir (Lei 9.250/95 art.4º II)', () => {
    it('apurar=true + descontar_antes_ir=true → IR menor que sem dedução', () => {
      // apurar_rra=true: força NM=sets (não span+stretch), garante IR > 0
      const semDeducao = runEngine({
        ir: { apurar: true, apurar_rra: true, deduzir_pensao: false },
        pensao: { apurar: true, percentual: 30, descontar_antes_ir: false },
      });
      const comDeducao = runEngine({
        ir: { apurar: true, apurar_rra: true, deduzir_pensao: false },
        pensao: { apurar: true, percentual: 30, descontar_antes_ir: true },
      });
      expect(comDeducao.resumo.ir_retido).toBeLessThan(semDeducao.resumo.ir_retido);
    });
  });

  // ───────── Atualizacao ─────────
  describe('Atualizacao.aplicar_pensao', () => {
    it('OFF (default) — total_atualizado = total_reclamada (sem pensão)', () => {
      const r = runEngine({
        pensao: { apurar: true, percentual: 30, base: 'principal' },
      });
      expect(r.resumo.total_atualizado).toBeCloseTo(r.resumo.total_reclamada, 2);
    });

    it('ON — total_atualizado = total_reclamada + pensao_total', () => {
      const r = runEngine({
        pensao: { apurar: true, percentual: 30, base: 'principal' },
        atualizacao: { aplicar_pensao: true },
      });
      const esperado = r.resumo.total_reclamada + r.resumo.pensao_total;
      expect(r.resumo.total_atualizado).toBeCloseTo(esperado, 2);
    });
  });

  describe('Atualizacao.aplicar_multas_indenizacoes', () => {
    it('ON com multa indenizatória → total_atualizado cresce', () => {
      const multasComItem: Partial<PjeMultasConfig> = {
        multas_indenizacoes: [{
          id: 'm1', descricao: 'INDENIZAÇÃO',
          devedor: 'reclamado', credor: 'reclamante',
          valor_tipo: 'informado', valor: 1500, base: 'principal',
        }] as never,
      };
      const off = runEngine({ multas: multasComItem });
      const on = runEngine({ multas: multasComItem, atualizacao: { aplicar_multas_indenizacoes: true } });
      expect(on.resumo.total_atualizado).toBeGreaterThan(off.resumo.total_atualizado!);
    });
  });

  describe('Atualizacao.aplicar_honorarios', () => {
    it('ON com honorários sucumbenciais → total_atualizado cresce', () => {
      const honor: PjeHonorariosConfig = {
        apurar_sucumbenciais: true, percentual_sucumbenciais: 15, base_sucumbenciais: 'condenacao',
        apurar_contratuais: false, percentual_contratuais: 0,
      };
      const off = runEngine({ honorarios: honor });
      const on = runEngine({ honorarios: honor, atualizacao: { aplicar_honorarios: true } });
      const totalHon = on.resumo.honorarios_sucumbenciais + on.resumo.honorarios_contratuais;
      expect(totalHon).toBeGreaterThan(0);
      expect(on.resumo.total_atualizado!).toBeCloseTo(off.resumo.total_atualizado! + totalHon, 2);
    });
  });

  describe('Atualizacao.aplicar_custas', () => {
    it('OFF (default) — custas não somam ao total_atualizado', () => {
      const r = runEngine({});
      expect(r.resumo.total_atualizado).toBeCloseTo(r.resumo.total_reclamada, 2);
    });

    it('ON com custas=0 — total_atualizado igual a total_reclamada', () => {
      // Engine atualmente expõe custas=0 no resumo (custas em escopo Sprint Custas).
      // Aqui validamos apenas que o flag não causa crash e mantém invariante.
      const r = runEngine({ atualizacao: { aplicar_custas: true } });
      expect(r.resumo.total_atualizado).toBeCloseTo(r.resumo.total_reclamada + r.resumo.custas, 2);
    });
  });

  // ───────── Honorarios ─────────
  describe('Honorarios item.aplicar_juros (OJ-348 SDI-1)', () => {
    it('OFF (default) — sem juros sobre honorário', () => {
      const honor: PjeHonorariosConfig = {
        apurar_sucumbenciais: false, percentual_sucumbenciais: 15, base_sucumbenciais: 'condenacao',
        apurar_contratuais: false, percentual_contratuais: 0,
        items: [{
          descricao: 'SUCUMBÊNCIA', devedor: 'reclamado', credor: 'ADV',
          tipo: 'percentual', percentual: 15, base: 'condenacao',
          apurar_ir: false,
          aplicar_juros: false,
          data_apartir_de_aplicar_juros: '2023-01-01',
        }],
      };
      const off = runEngine({ honorarios: honor });
      const on = runEngine({
        honorarios: {
          ...honor,
          items: honor.items!.map(i => ({ ...i, aplicar_juros: true })),
        },
      });
      // Juros simples mensais 1% × 24 meses ≈ 24% incremento sobre honorário
      expect(on.resumo.honorarios_sucumbenciais)
        .toBeGreaterThan(off.resumo.honorarios_sucumbenciais);
    });
  });
});
