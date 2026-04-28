/**
 * Sprint 4.2-B1 — CS devida/paga correção+juros (Súm.TST 200, Lei 11.941/09 + RFB 1.117/10, Lei 8.212/91 art.35)
 *
 * Testes das 10 flags TIER 2 P1 do ModuloCorrecao:
 *   Devida (5):   cs_dev_correcao_trab, cs_dev_juros_trab, cs_dev_correcao_prev,
 *                 cs_dev_juros_prev, cs_dev_multa_prev_aplicar
 *   Pagos  (5):   cs_pagos_correcao_trab, cs_pagos_juros_trab, cs_pagos_correcao_prev,
 *                 cs_pagos_juros_prev, cs_pagos_multa_prev_aplicar
 *
 * Estratégia: roda baseline com `apurar_segurado=true, apurar_empresa=true`
 * sobre verba mensal. Compara contra rodada com flag desligada/ligada
 * — DEVE diferir o `total_segurado` ou `total_empregador` (prova efeito).
 *
 * Defaults preservam comportamento atual (96% calibrate):
 *   cs_dev_correcao_prev  default true  → SELIC INSS (Lei 11.941/09)
 *   cs_dev_juros_prev     default true  → SELIC = juros+correção combinada
 *   cs_dev_correcao_trab  default false → IPCA-E não aplicado hoje
 *   cs_dev_juros_trab     default false → 1%/m trab não aplicado hoje
 *   cs_dev_multa_prev_*   default false → 20% multa Lei 8.212 não aplicada
 *   cs_pagos_*            default false → engine não computa pagos hoje
 */
import { describe, it, expect } from 'vitest';
import { PjeCalcEngineV3 } from '../engine-v3';
import type {
  PjeParametros, PjeVerba,
  PjeFGTSConfig, PjeCSConfig, PjeIRConfig,
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjeIndiceRow, PjeINSSFaixaRow,
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
  { competencia_inicio: '2020-01-01', competencia_fim: null, faixa: 1, valor_ate: 1320, aliquota: 0.075 },
  { competencia_inicio: '2020-01-01', competencia_fim: null, faixa: 2, valor_ate: 2571.29, aliquota: 0.09 },
  { competencia_inicio: '2020-01-01', competencia_fim: null, faixa: 3, valor_ate: 3856.94, aliquota: 0.12 },
  { competencia_inicio: '2020-01-01', competencia_fim: null, faixa: 4, valor_ate: 7507.49, aliquota: 0.14 },
];

const baselineParams = (): PjeParametros => ({
  case_id: 'cs-flag-test',
  data_admissao: '2020-01-01',
  data_demissao: '2022-12-31',
  data_ajuizamento: '2023-01-15',
  data_citacao: '2023-02-15',
  estado: 'SP', municipio: 'SAO PAULO',
  regime_trabalho: 'tempo_integral', carga_horaria_padrao: 220,
  prescricao_quinquenal: false, prescricao_fgts: false, projetar_aviso_indenizado: false,
  modo_calculo: 'independent',
  limitar_avos_periodo: false, zerar_valor_negativo: false,
  sabado_dia_util: false, considerar_feriado_estadual: false,
  considerar_feriado_municipal: false, prazo_aviso_previo: 'nao_apurar',
});

const baselineVerba = (): PjeVerba => ({
  id: 'v1', nome: 'HORAS EXTRAS 50%', tipo: 'principal', valor: 'informado',
  caracteristica: 'comum', ocorrencia_pagamento: 'mensal', compor_principal: true,
  zerar_valor_negativo: false, dobrar_valor_devido: false,
  periodo_inicio: '2022-01-01', periodo_fim: '2022-12-31',
  base_calculo: { historicos: [], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
  tipo_divisor: 'informado', divisor_informado: 1, multiplicador: 1,
  tipo_quantidade: 'informada', quantidade_informada: 1, quantidade_proporcionalizar: false,
  exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
  incidencias: {
    fgts: false, irpf: false, contribuicao_social: true,
    previdencia_privada: false, pensao_alimenticia: false,
  },
  juros_ajuizamento: 'ocorrencias_vencidas',
  gerar_verba_reflexa: 'diferenca', gerar_verba_principal: 'diferenca', ordem: 1,
  // 12 ocorrências jan-dez/2022 com pago > 0 para alimentar cs_pagos.
  ocorrencias_precomputadas: Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      competencia: `2022-${String(month).padStart(2, '0')}`,
      base: 3000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: false,
      devido: 3000, pago: 1000, // pago<devido → diferenca=2000 (CS sobre devido nominal)
    };
  }),
});

const baselineFGTS = (): PjeFGTSConfig => ({
  apurar: false, destino: 'pagar_reclamante', compor_principal: false,
  multa_apurar: false, multa_tipo: 'calculada', multa_percentual: 40, multa_base: 'devido',
  saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false,
});

const baselineCS = (): PjeCSConfig => ({
  apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
  aliquota_segurado_tipo: 'empregado', limitar_teto: true,
  apurar_empresa: true, apurar_sat: false, apurar_terceiros: false,
  aliquota_empregador_tipo: 'fixa',
  aliquota_empresa_fixa: 20, aliquota_sat_fixa: 2, aliquota_terceiros_fixa: 5.8,
  periodos_simples: [],
});

const baselineIR = (): PjeIRConfig => ({
  apurar: false, incidir_sobre_juros: false, cobrar_reclamado: false,
  tributacao_exclusiva_13: false, tributacao_separada_ferias: false,
  deduzir_cs: false, deduzir_prev_privada: false,
  deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0,
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

function runEngine(correcaoOverride: Partial<PjeCorrecaoConfig> = {}, csOverride: Partial<PjeCSConfig> = {}) {
  const correcao = { ...baselineCorrecao(), ...correcaoOverride };
  const cs = { ...baselineCS(), ...csOverride };
  const engine = new PjeCalcEngineV3(
    baselineParams(), [], [], [],
    [baselineVerba()], [],
    baselineFGTS(), cs, baselineIR(), correcao,
    baselineHonorarios(), baselineCustas(), baselineSeguro(),
    INDICES, FAIXAS,
  );
  const r = engine.liquidar();
  return {
    cs_segurado: r.contribuicao_social.total_segurado,
    cs_empregador: r.contribuicao_social.total_empregador,
    cs_segurado_pagos: r.contribuicao_social.total_segurado_pagos,
    bruto: r.resumo.principal_bruto,
    liquido: r.resumo.liquido_reclamante,
  };
}

describe('Sprint 4.2-B1 — CS devida/paga: 10 flags correção/juros/multa', () => {
  describe('Defaults preservam comportamento atual (96% calibrate)', () => {
    it('Sem flags explícitas ≡ flags devida nos defaults antigos', () => {
      const semFlags = runEngine({});
      // Defaults sem flag específica devem produzir um resultado positivo
      // (pois apurar_segurado=true e SELIC INSS continua aplicada).
      expect(semFlags.cs_segurado).toBeGreaterThan(0);
      // CS pagos default = 0 (cs_pagos_aplicar=false).
      expect(semFlags.cs_segurado_pagos).toBe(0);
    });

    it('Defaults explícitos prev=true produzem mesmo resultado que sem flags', () => {
      const semFlags = runEngine({});
      const comDefaults = runEngine({
        cs_dev_correcao_prev: true,
        cs_dev_juros_prev: true,
      });
      // Defaults preservam o resultado do baseline.
      expect(comDefaults.cs_segurado).toBeCloseTo(semFlags.cs_segurado, 1);
      expect(comDefaults.cs_empregador).toBeCloseTo(semFlags.cs_empregador, 1);
    });
  });

  describe('cs_dev_correcao_trab (Súm.TST 200 — IPCA-E sobre INSS)', () => {
    it('cs_dev_correcao_trab=ON adiciona IPCA-E sobre CS devida', () => {
      const off = runEngine({ cs_dev_correcao_trab: false });
      const on = runEngine({ cs_dev_correcao_trab: true });
      // ON adiciona componente IPCA-E acumulado → CS final maior.
      expect(on.cs_segurado).toBeGreaterThan(off.cs_segurado);
    });
  });

  describe('cs_dev_juros_trab (Súm.TST 200 — 1%/m sobre INSS)', () => {
    it('cs_dev_juros_trab=ON adiciona juros 1%/m simples sobre CS devida', () => {
      const off = runEngine({ cs_dev_juros_trab: false });
      const on = runEngine({ cs_dev_juros_trab: true });
      expect(on.cs_segurado).toBeGreaterThan(off.cs_segurado);
    });
  });

  describe('cs_dev_correcao_prev / cs_dev_juros_prev (Lei 11.941/09 + RFB 1.117/10 — SELIC)', () => {
    it('cs_dev_correcao_prev=false REMOVE crescimento SELIC (CS devida cai → nominal puro)', () => {
      const on = runEngine({ cs_dev_correcao_prev: true, cs_dev_juros_prev: true });
      const off = runEngine({ cs_dev_correcao_prev: false, cs_dev_juros_prev: false });
      // Sem prev correção/juros → factor=0 (CS nominal puro = 0 quando ambos OFF
      // sem outras flags). Garante diferença mensurável.
      expect(off.cs_segurado).toBeLessThan(on.cs_segurado);
    });

    it('cs_dev_juros_prev=false sozinho mantém regime SELIC ativo mas sem crescimento (factor≈1)', () => {
      const on = runEngine({});
      const semJurosPrev = runEngine({ cs_dev_correcao_prev: true, cs_dev_juros_prev: false });
      // ON inclui SELIC excedente; sem juros_prev a CS retorna ao nominal (≈factor 1).
      expect(semJurosPrev.cs_segurado).toBeLessThan(on.cs_segurado);
    });
  });

  describe('cs_dev_multa_prev_aplicar (Lei 8.212/91 art.35 caput, II — multa 20%)', () => {
    it('cs_dev_multa_prev_aplicar=ON adiciona 20% sobre CS devida', () => {
      const off = runEngine({ cs_dev_multa_prev_aplicar: false });
      const on = runEngine({ cs_dev_multa_prev_aplicar: true });
      // ON adiciona +20% no factor → CS final ≈ off + 20% nominal.
      expect(on.cs_segurado).toBeGreaterThan(off.cs_segurado);
    });
  });

  describe('Combinação cs_dev_juros_trab + cs_dev_multa_prev_aplicar', () => {
    it('ambos ON > somente juros_trab ON > somente multa ON > nenhum', () => {
      const nenhum = runEngine({ cs_dev_juros_trab: false, cs_dev_multa_prev_aplicar: false });
      const soJuros = runEngine({ cs_dev_juros_trab: true, cs_dev_multa_prev_aplicar: false });
      const soMulta = runEngine({ cs_dev_juros_trab: false, cs_dev_multa_prev_aplicar: true });
      const ambos = runEngine({ cs_dev_juros_trab: true, cs_dev_multa_prev_aplicar: true });
      // Cada flag adiciona componente positivo independente → soma ordenada.
      expect(soJuros.cs_segurado).toBeGreaterThan(nenhum.cs_segurado);
      expect(soMulta.cs_segurado).toBeGreaterThan(nenhum.cs_segurado);
      expect(ambos.cs_segurado).toBeGreaterThan(soJuros.cs_segurado);
      expect(ambos.cs_segurado).toBeGreaterThan(soMulta.cs_segurado);
    });
  });

  describe('Edge: todas as flags devida OFF → CS nominal puro (=0 quando sem prev)', () => {
    it('todas devida OFF → CS segurado vai a 0 (sem regime ativo)', () => {
      const tudoOff = runEngine({
        cs_dev_correcao_trab: false,
        cs_dev_juros_trab: false,
        cs_dev_correcao_prev: false,
        cs_dev_juros_prev: false,
        cs_dev_multa_prev_aplicar: false,
      });
      // Sem regime ativo o factor=0 → cs_segurado=0.
      expect(tudoOff.cs_segurado).toBe(0);
    });
  });

  describe('cs_pagos_aplicar + flags pagos', () => {
    it('cs_pagos_aplicar=true sem nenhuma flag pagos → segurado_pagos=0 (preserva baseline)', () => {
      const r = runEngine({
        cs_pagos_aplicar: true,
        cs_pagos_correcao_trab: false,
        cs_pagos_juros_trab: false,
        cs_pagos_correcao_prev: false,
        cs_pagos_juros_prev: false,
        cs_pagos_multa_prev_aplicar: false,
      });
      expect(r.cs_segurado_pagos).toBe(0);
    });

    it('cs_pagos_aplicar=true + cs_pagos_correcao_prev=true → segurado_pagos > 0', () => {
      const off = runEngine({});
      const on = runEngine({
        cs_pagos_aplicar: true,
        cs_pagos_correcao_prev: true,
      });
      expect(off.cs_segurado_pagos).toBe(0);
      expect(on.cs_segurado_pagos).toBeGreaterThan(0);
    });

    it('cs_pagos_juros_prev=ON aumenta segurado_pagos vs apenas correcao_prev', () => {
      const soCorr = runEngine({
        cs_pagos_aplicar: true,
        cs_pagos_correcao_prev: true,
        cs_pagos_juros_prev: false,
      });
      const corrJuros = runEngine({
        cs_pagos_aplicar: true,
        cs_pagos_correcao_prev: true,
        cs_pagos_juros_prev: true,
      });
      expect(corrJuros.cs_segurado_pagos).toBeGreaterThan(soCorr.cs_segurado_pagos);
    });

    it('cs_pagos_multa_prev_aplicar=ON adiciona 20% sobre cs pagos', () => {
      const semMulta = runEngine({
        cs_pagos_aplicar: true,
        cs_pagos_correcao_prev: true,
        cs_pagos_juros_prev: true,
      });
      const comMulta = runEngine({
        cs_pagos_aplicar: true,
        cs_pagos_correcao_prev: true,
        cs_pagos_juros_prev: true,
        cs_pagos_multa_prev_aplicar: true,
      });
      expect(comMulta.cs_segurado_pagos).toBeGreaterThan(semMulta.cs_segurado_pagos);
    });

    it('cs_pagos_correcao_trab=ON adiciona componente IPCA-E nos pagos', () => {
      const off = runEngine({
        cs_pagos_aplicar: true,
        cs_pagos_correcao_prev: true,
      });
      const on = runEngine({
        cs_pagos_aplicar: true,
        cs_pagos_correcao_prev: true,
        cs_pagos_correcao_trab: true,
      });
      expect(on.cs_segurado_pagos).toBeGreaterThan(off.cs_segurado_pagos);
    });
  });
});
