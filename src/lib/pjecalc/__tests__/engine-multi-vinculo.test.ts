import { describe, it, expect } from 'vitest';
import { liquidarMultiVinculo } from '../engine';
import {
  makeParams, makeHistoricoWithOcorrencias, makeVerba,
  makeFgtsConfig, makeCsConfig, makeIrConfig, makeCorrecaoConfig,
  makeHonorariosConfig, makeCustasConfig, makeSeguroConfig,
} from './helpers';
import type { PjeMultiVinculo } from '../engine-types';

describe('PjeCalcEngine - Multi-Vinculo', () => {
  it('consolidates two separate contracts', () => {
    const multi: PjeMultiVinculo = {
      modo_consolidacao: 'independente',
      vinculos: [
        {
          vinculo_id: 'v1',
          label: '1o Vinculo 2018-2020',
          params: makeParams({
            data_admissao: '2018-01-01',
            data_demissao: '2020-12-31',
            vinculo_id: 'v1',
          }),
          historicos: [makeHistoricoWithOcorrencias(2000, ['2020-06'], {
            id: 'hist-v1',
            periodo_inicio: '2018-01-01',
            periodo_fim: '2020-12-31',
          })],
          faltas: [],
          ferias: [],
          verbas: [makeVerba({
            id: 'verba-v1',
            nome: 'HE 50% V1',
            valor: 'informado',
            valor_informado_devido: 1000,
            valor_informado_pago: 0,
            periodo_inicio: '2020-06-01',
            periodo_fim: '2020-06-30',
          })],
          cartaoPonto: [],
        },
        {
          vinculo_id: 'v2',
          label: '2o Vinculo 2021-2023',
          params: makeParams({
            data_admissao: '2021-01-01',
            data_demissao: '2023-12-31',
            vinculo_id: 'v2',
          }),
          historicos: [makeHistoricoWithOcorrencias(3000, ['2023-06'], {
            id: 'hist-v2',
            periodo_inicio: '2021-01-01',
            periodo_fim: '2023-12-31',
          })],
          faltas: [],
          ferias: [],
          verbas: [makeVerba({
            id: 'verba-v2',
            nome: 'HE 50% V2',
            valor: 'informado',
            valor_informado_devido: 2000,
            valor_informado_pago: 0,
            periodo_inicio: '2023-06-01',
            periodo_fim: '2023-06-30',
          })],
          cartaoPonto: [],
        },
      ],
    };

    const result = liquidarMultiVinculo(
      multi,
      makeFgtsConfig({ apurar: false }),
      makeCsConfig({ apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false }),
      makeIrConfig({ apurar: false }),
      makeCorrecaoConfig({ indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' }),
      makeHonorariosConfig(),
      makeCustasConfig(),
      makeSeguroConfig(),
    );

    expect(result.vinculos).toHaveLength(2);
    expect(result.vinculos[0].vinculo_id).toBe('v1');
    expect(result.vinculos[1].vinculo_id).toBe('v2');

    // Each vinculo has its own result
    expect(result.vinculos[0].resultado.verbas.length).toBeGreaterThanOrEqual(1);
    expect(result.vinculos[1].resultado.verbas.length).toBeGreaterThanOrEqual(1);

    // Consolidado should sum the two
    const c = result.consolidado.resumo;
    const v1 = result.vinculos[0].resultado.resumo;
    const v2 = result.vinculos[1].resultado.resumo;

    // Consolidated bruto should include both vinculos
    expect(c.principal_bruto).toBeGreaterThanOrEqual(v1.principal_bruto);
    expect(result.consolidado.verbas.length).toBeGreaterThanOrEqual(2);
  });

  it('throws when no vinculos provided', () => {
    const multi: PjeMultiVinculo = {
      modo_consolidacao: 'independente',
      vinculos: [],
    };

    expect(() => liquidarMultiVinculo(
      multi,
      makeFgtsConfig(),
      makeCsConfig(),
      makeIrConfig(),
      makeCorrecaoConfig(),
      makeHonorariosConfig(),
      makeCustasConfig(),
      makeSeguroConfig(),
    )).toThrow('nenhum vínculo fornecido');
  });

  it('single vinculo consolidado equals vinculo result', () => {
    const multi: PjeMultiVinculo = {
      modo_consolidacao: 'independente',
      vinculos: [
        {
          vinculo_id: 'v-single',
          label: 'Unico Vinculo',
          params: makeParams(),
          historicos: [makeHistoricoWithOcorrencias(3000, ['2023-06'])],
          faltas: [],
          ferias: [],
          verbas: [makeVerba({
            valor: 'informado',
            valor_informado_devido: 1500,
            periodo_inicio: '2023-06-01',
            periodo_fim: '2023-06-30',
          })],
          cartaoPonto: [],
        },
      ],
    };

    const result = liquidarMultiVinculo(
      multi,
      makeFgtsConfig({ apurar: false }),
      makeCsConfig({ apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false }),
      makeIrConfig({ apurar: false }),
      makeCorrecaoConfig({ indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' }),
      makeHonorariosConfig(),
      makeCustasConfig(),
      makeSeguroConfig(),
    );

    // Single vinculo: consolidado = vinculo result
    expect(result.consolidado.resumo.principal_bruto).toBe(
      result.vinculos[0].resultado.resumo.principal_bruto,
    );
  });
});
