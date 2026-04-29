/**
 * Sprint 1 Bug 1 — Custas Judiciais
 *
 * Garante que `r.custas` e `r.custas_detalhadas` no PjeResumo são populados
 * a partir de `custasConfig`, espelhando o oracle Java (campo `<custasJudiciais>`
 * = decisão do juiz, persistida no PJC).
 *
 * Antes: engine retornava `custas=0` em todos os 50/50 PJCs do corpus
 * (oracle 40-4720 R$). Causa: hardcoded `custas: 0` no resumo final.
 * Fix: respeita `custasConfig.apurar` + `valor_minimo` (rota PJC) ou `itens`
 * (rota UI manual).
 */
import { describe, it, expect } from 'vitest';
import { PjeCalcEngineV3 } from '../engine-v3';
import type {
  PjeParametros, PjeVerba,
  PjeFGTSConfig, PjeCSConfig, PjeIRConfig,
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjeIndiceRow, PjeINSSFaixaRow,
} from '../engine-types';
import { SELIC_MENSAL, SELIC_ACUMULADO, IPCA_E_ACUMULADO, TR_ACUMULADO } from '../indices-fallback';

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

const params = (): PjeParametros => ({
  case_id: 'sprint1-custas',
  data_admissao: '2020-01-01', data_demissao: '2023-06-30',
  data_ajuizamento: '2023-07-10', data_citacao: '2023-07-10',
  estado: 'SP', municipio: 'SAO PAULO',
  regime_trabalho: 'tempo_integral', carga_horaria_padrao: 220,
  prescricao_quinquenal: false, prescricao_fgts: false, projetar_aviso_indenizado: false,
  modo_calculo: 'independent',
  limitar_avos_periodo: false, zerar_valor_negativo: false,
  sabado_dia_util: false, considerar_feriado_estadual: false,
  considerar_feriado_municipal: false, prazo_aviso_previo: 'nao_apurar',
  ultima_remuneracao: 5000, maior_remuneracao: 5000,
});

const verba = (): PjeVerba => ({
  id: 'v1', nome: 'HORAS EXTRAS 50%', tipo: 'principal', valor: 'informado',
  caracteristica: 'comum', ocorrencia_pagamento: 'mensal', compor_principal: true,
  zerar_valor_negativo: false, dobrar_valor_devido: false,
  periodo_inicio: '2023-01-01', periodo_fim: '2023-06-30',
  base_calculo: { historicos: [], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
  tipo_divisor: 'informado', divisor_informado: 1, multiplicador: 1,
  tipo_quantidade: 'informada', quantidade_informada: 1, quantidade_proporcionalizar: false,
  exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
  incidencias: { fgts: true, irpf: true, contribuicao_social: true,
    previdencia_privada: false, pensao_alimenticia: false },
  juros_ajuizamento: 'ocorrencias_vencidas',
  gerar_verba_reflexa: 'diferenca', gerar_verba_principal: 'diferenca', ordem: 1,
  ocorrencias_precomputadas: Array.from({ length: 6 }, (_, i) => ({
    competencia: `2023-${String(i + 1).padStart(2, '0')}`,
    base: 5000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: false,
    devido: 5000, pago: 0,
  })),
});

const fgtsOff = (): PjeFGTSConfig => ({
  apurar: false, destino: 'pagar_reclamante', compor_principal: false,
  multa_apurar: false, multa_tipo: 'calculada', multa_percentual: 40, multa_base: 'devido',
  saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false,
});

const cs = (): PjeCSConfig => ({
  apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
  aliquota_segurado_tipo: 'empregado', limitar_teto: true,
  apurar_empresa: true, apurar_sat: true, apurar_terceiros: true,
  aliquota_empregador_tipo: 'fixa',
  aliquota_empresa_fixa: 20, aliquota_sat_fixa: 2, aliquota_terceiros_fixa: 5.8,
  periodos_simples: [],
});

const ir = (): PjeIRConfig => ({
  apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false,
  tributacao_exclusiva_13: false, tributacao_separada_ferias: false,
  deduzir_cs: true, deduzir_prev_privada: false,
  deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0,
});

const correcao = (): PjeCorrecaoConfig => ({
  indice: 'IPCA-E', epoca: 'mensal',
  juros_tipo: 'simples_mensal', juros_percentual: 1,
  juros_inicio: 'citacao', multa_523: false, multa_523_percentual: 10,
  data_liquidacao: '2024-12-31',
});

const honor = (): PjeHonorariosConfig => ({
  apurar_sucumbenciais: false, percentual_sucumbenciais: 15, base_sucumbenciais: 'condenacao',
  apurar_contratuais: false, percentual_contratuais: 0,
});

const seguro = (): PjeSeguroConfig => ({ apurar: false, parcelas: 0, recebeu: false });

function runEngine(custasCfg: PjeCustasConfig) {
  const engine = new PjeCalcEngineV3(
    params(), [], [], [], [verba()], [],
    fgtsOff(), cs(), ir(), correcao(), honor(), custasCfg, seguro(),
    INDICES, FAIXAS,
  );
  return engine.liquidar();
}

describe('Sprint 1 Bug 1 — custas judiciais no resumo', () => {
  it('apurar=false → custas=0 (preserva default UI / calibrate baseline)', () => {
    const r = runEngine({
      apurar: false, percentual: 2, valor_minimo: 0,
      isento: false, assistencia_judiciaria: false, itens: [],
    });
    expect(r.resumo.custas).toBe(0);
    expect(r.resumo.custas_detalhadas).toEqual([]);
  });

  it('rota PJC: apurar=true + valor_minimo=400 + sem itens → custas=400', () => {
    // Cenário antonio-harley: <custasJudiciais>400</custasJudiciais>.
    // pjc-to-engine.buildCustasConfig copia 400 para valor_minimo.
    const r = runEngine({
      apurar: true, percentual: 0, valor_minimo: 400, valor_maximo: 400,
      isento: false, assistencia_judiciaria: false, itens: [],
    });
    expect(r.resumo.custas).toBe(400);
    expect(r.resumo.custas_detalhadas).toHaveLength(1);
    expect(r.resumo.custas_detalhadas[0]).toMatchObject({
      tipo: 'judiciais', valor: 400,
    });
  });

  it('rota PJC: valor_minimo=1800 (PROCESSO_00007344) → custas=1800', () => {
    const r = runEngine({
      apurar: true, percentual: 0, valor_minimo: 1800, valor_maximo: 1800,
      isento: false, assistencia_judiciaria: false, itens: [],
    });
    expect(r.resumo.custas).toBe(1800);
  });

  it('isento=true → custas=0 mesmo com valor_minimo>0', () => {
    const r = runEngine({
      apurar: true, percentual: 0, valor_minimo: 400,
      isento: true, assistencia_judiciaria: false, itens: [],
    });
    expect(r.resumo.custas).toBe(0);
  });

  it('assistencia_judiciaria=true → custas=0 (gratuidade da justiça)', () => {
    const r = runEngine({
      apurar: true, percentual: 0, valor_minimo: 400,
      isento: false, assistencia_judiciaria: true, itens: [],
    });
    expect(r.resumo.custas).toBe(0);
  });

  it('rota UI manual: itens com valor_fixo somam em custas_detalhadas', () => {
    const r = runEngine({
      apurar: true, percentual: 0, valor_minimo: 0,
      isento: false, assistencia_judiciaria: false,
      itens: [
        { tipo: 'judiciais', descricao: 'Custas iniciais', apurar: true,
          percentual: 0, valor_fixo: 250, valor_minimo: 0, isento: false },
        { tipo: 'periciais', descricao: 'Honorários peritos', apurar: true,
          percentual: 0, valor_fixo: 750, valor_minimo: 0, isento: false },
        // Item NÃO apurado — não conta
        { tipo: 'postais', descricao: 'AR', apurar: false,
          percentual: 0, valor_fixo: 100, valor_minimo: 0, isento: false },
      ],
    });
    expect(r.resumo.custas).toBe(1000);
    expect(r.resumo.custas_detalhadas).toHaveLength(2);
    expect(r.resumo.custas_detalhadas.map(c => c.tipo)).toEqual(['judiciais', 'periciais']);
  });

  it('liquido_reclamante NÃO é afetado por custas (custas é débito reclamado)', () => {
    const sem = runEngine({
      apurar: false, percentual: 0, valor_minimo: 0,
      isento: false, assistencia_judiciaria: false, itens: [],
    });
    const com = runEngine({
      apurar: true, percentual: 0, valor_minimo: 1800, valor_maximo: 1800,
      isento: false, assistencia_judiciaria: false, itens: [],
    });
    expect(com.resumo.liquido_reclamante).toBeCloseTo(sem.resumo.liquido_reclamante, 2);
    expect(com.resumo.custas).toBe(1800);
    expect(sem.resumo.custas).toBe(0);
  });

  it('atualizacao.aplicar_custas=true soma custas ao total_atualizado', () => {
    // Replica tier3-flags.test.ts mas agora com custas > 0.
    const cfgCustas: PjeCustasConfig = {
      apurar: true, percentual: 0, valor_minimo: 400, valor_maximo: 400,
      isento: false, assistencia_judiciaria: false, itens: [],
    };
    const engineOff = new PjeCalcEngineV3(
      params(), [], [], [], [verba()], [],
      fgtsOff(), cs(), ir(), correcao(), honor(), cfgCustas, seguro(),
      INDICES, FAIXAS,
    );
    const engineOn = new PjeCalcEngineV3(
      params(), [], [], [], [verba()], [],
      fgtsOff(), cs(), ir(), correcao(), honor(), cfgCustas, seguro(),
      INDICES, FAIXAS,
      [], [], [], undefined, undefined, undefined, [], [], [], [],
      { apurar_467: false, apurar_477: false }, { aplicar_custas: true },
    );
    const off = engineOff.liquidar();
    const on = engineOn.liquidar();
    expect(on.resumo.custas).toBe(400);
    expect(off.resumo.custas).toBe(400);
    expect(on.resumo.total_atualizado).toBeCloseTo(off.resumo.total_atualizado! + 400, 2);
  });
});
