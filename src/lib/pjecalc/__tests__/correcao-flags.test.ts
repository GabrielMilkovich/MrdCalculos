/**
 * Sprint 4.2-A2 — ADC 58 STF + Súm.TST 381 + CC art.406
 *
 * Testes das 3 flags TIER 1 P0 do ModuloCorrecao:
 *   1) combinar_indice  — gate p/ combinacoes_indice
 *   2) combinar_juros   — gate p/ combinacoes_juros
 *   3) juros_pre_judicial — quando false, juros começam só pós-citação
 *
 * Estratégia: roda baseline com combinações ADC 58 (IPCA-E → SELIC após
 * citação + TRD_SIMPLES → SELIC). Compara contra rodada com flag desligada
 * — DEVE diferir o valor corrigido / juros (prova que a flag tem efeito).
 *
 * Default das flags = `undefined` ≈ true (preserva 96% calibrate).
 */
import { describe, it, expect } from 'vitest';
import { PjeCalcEngineV3 } from '../engine-v3';
import type {
  PjeParametros, PjeVerba, PjeCombinacaoIndice, PjeCombinacaoJuros,
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
  { competencia_inicio: '2023-01-01', competencia_fim: null, faixa: 1, valor_ate: 1320, aliquota: 0.075 },
  { competencia_inicio: '2023-01-01', competencia_fim: null, faixa: 2, valor_ate: 2571.29, aliquota: 0.09 },
  { competencia_inicio: '2023-01-01', competencia_fim: null, faixa: 3, valor_ate: 3856.94, aliquota: 0.12 },
  { competencia_inicio: '2023-01-01', competencia_fim: null, faixa: 4, valor_ate: 7507.49, aliquota: 0.14 },
];

const baselineParams = (): PjeParametros => ({
  case_id: 'flag-test',
  data_admissao: '2020-01-01',
  data_demissao: '2023-06-30',
  data_ajuizamento: '2023-07-10',
  // citacao bem depois das competências da verba para que o gate
  // juros_pre_judicial=false REALMENTE corte juros pré-judiciais.
  data_citacao: '2023-07-10',
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
  periodo_inicio: '2022-01-01', periodo_fim: '2023-06-30',
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
  ocorrencias_precomputadas: Array.from({ length: 18 }, (_, i) => {
    const year = 2022 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    return {
      competencia: `${year}-${String(month).padStart(2, '0')}`,
      base: 5000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: false,
      devido: 5000, pago: 0,
    };
  }),
});

const baselineFGTS = (): PjeFGTSConfig => ({
  apurar: false, destino: 'pagar_reclamante', compor_principal: false,
  multa_apurar: false, multa_tipo: 'calculada', multa_percentual: 40, multa_base: 'devido',
  saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false,
});

const baselineCS = (): PjeCSConfig => ({
  apurar_segurado: false, cobrar_reclamante: false, cs_sobre_salarios_pagos: false,
  aliquota_segurado_tipo: 'empregado', limitar_teto: true,
  apurar_empresa: false, apurar_sat: false, apurar_terceiros: false,
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

// Combinacoes ADC 58/59: pre-citacao IPCA-E + TRD_SIMPLES; pos-citacao SELIC.
const COMB_INDICE: PjeCombinacaoIndice[] = [
  { indice: 'IPCA-E' },
  { de: '2023-07-10', indice: 'SELIC' },
];
const COMB_JUROS: PjeCombinacaoJuros[] = [
  { tipo: 'TRD_SIMPLES', percentual: 1 },
  { de: '2023-07-10', tipo: 'NENHUM', percentual: 0 },
];

const baselineCorrecao = (): PjeCorrecaoConfig => ({
  indice: 'IPCA-E', epoca: 'mensal',
  juros_tipo: 'simples_mensal', juros_percentual: 1,
  juros_inicio: 'citacao', multa_523: false, multa_523_percentual: 10,
  data_liquidacao: '2024-12-31',
  combinacoes_indice: COMB_INDICE,
  combinacoes_juros: COMB_JUROS,
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

function runEngine(correcaoOverride: Partial<PjeCorrecaoConfig> = {}) {
  const correcao = { ...baselineCorrecao(), ...correcaoOverride };
  const engine = new PjeCalcEngineV3(
    baselineParams(), [], [], [],
    [baselineVerba()], [],
    baselineFGTS(), baselineCS(), baselineIR(), correcao,
    baselineHonorarios(), baselineCustas(), baselineSeguro(),
    INDICES, FAIXAS,
  );
  const r = engine.liquidar();
  return {
    bruto: r.resumo.principal_bruto,
    corrigido: r.resumo.principal_corrigido,
    juros: r.resumo.juros_mora,
    liquido: r.resumo.liquido_reclamante,
  };
}

describe('Sprint 4.2-A2 — flags ADC 58 (combinar_indice / combinar_juros / juros_pre_judicial)', () => {
  describe('combinar_indice (ADC 58 STF + Súm.TST 381)', () => {
    it('default (undefined) processa combinacoes_indice — comportamento atual preservado', () => {
      const onDefault = runEngine({});
      const onExplicit = runEngine({ combinar_indice: true });
      // Default ≈ true: ambos devem convergir
      expect(onDefault.corrigido).toBeCloseTo(onExplicit.corrigido, 1);
      expect(onDefault.juros).toBeCloseTo(onExplicit.juros, 1);
    });

    it('combinar_indice=false IGNORA combinacoes_indice (usa só base IPCA-E)', () => {
      const on = runEngine({ combinar_indice: true });
      const off = runEngine({ combinar_indice: false });
      // Com combinar_indice OFF, engine NÃO troca p/ SELIC após citação
      // → continua aplicando IPCA-E até liquidação
      // → corrigido vai diferir do baseline (que tinha SELIC pos-cit)
      const delta = Math.abs(on.corrigido - off.corrigido);
      expect(delta).toBeGreaterThan(0.01); // efeito mensurável
    });
  });

  describe('combinar_juros (ADC 58 — SELIC engloba juros+correção pós-citação)', () => {
    it('default (undefined) processa combinacoes_juros', () => {
      const onDefault = runEngine({});
      const onExplicit = runEngine({ combinar_juros: true });
      expect(onDefault.juros).toBeCloseTo(onExplicit.juros, 1);
    });

    it('combinar_juros=false IGNORA combinacoes_juros (usa juros_tipo único)', () => {
      const on = runEngine({ combinar_juros: true });
      const off = runEngine({ combinar_juros: false });
      // Sem combinacoes_juros, engine cai no juros_tipo único do correcao
      // (simples_mensal 1%/m sem trocar p/ NENHUM após citação)
      // → juros DEVE diferir
      const delta = Math.abs(on.juros - off.juros);
      expect(delta).toBeGreaterThan(0.01);
    });
  });

  describe('juros_pre_judicial (CC art.406 + ADC 58)', () => {
    it('default (undefined) permite pré-judicial — comportamento atual', () => {
      const onDefault = runEngine({});
      const onExplicit = runEngine({ juros_pre_judicial: true });
      // Default ≈ true: ambos convergem
      expect(onDefault.juros).toBeCloseTo(onExplicit.juros, 1);
    });

    it('juros_pre_judicial=false → juros começam APENAS pós-citação', () => {
      const on = runEngine({ juros_pre_judicial: true });
      const off = runEngine({ juros_pre_judicial: false });
      // Com pre-judicial OFF, juros pre-cit (TRD_SIMPLES sobre comp <2023-07-10)
      // são suprimidos. Como juros pos-cit são NENHUM (combinacoes_juros),
      // juros_total OFF ≤ juros_total ON.
      expect(off.juros).toBeLessThanOrEqual(on.juros);
      // E DEVE diferir mensuravelmente (existem competências pré-citação)
      const delta = Math.abs(on.juros - off.juros);
      expect(delta).toBeGreaterThan(0.01);
    });
  });
});
