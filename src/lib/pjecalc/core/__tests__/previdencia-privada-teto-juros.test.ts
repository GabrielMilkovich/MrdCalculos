/**
 * Tests para sub-flags TetoMensal + Juros (modoJuros) de PrevidenciaPrivada.
 *
 * - Teto: Art. 6 LC 109/2001 + clausulas de plano. Quando definido, a base
 *   mensal e clampada. Excedente nao gera contribuicao.
 * - Juros: 'trabalhista' (default) usa taxa do principal; 'pago_atraso' usa
 *   tabela diferenciada (engine forneceria); 'nenhum' zera juros.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  PrevidenciaPrivada,
  type AliquotaDePrevidenciaPrivada,
  type CalculoPrevPrivInput,
  type VerbaPrevPrivInput,
} from '../dominio/calculo/previdenciaprivada/previdencia-privada';

function aliq(inicio: string, fim: string, pct: string): AliquotaDePrevidenciaPrivada {
  return {
    dataInicioPeriodo: new Date(`${inicio}T00:00:00Z`),
    dataTerminoPeriodo: new Date(`${fim}T00:00:00Z`),
    aliquota: new Decimal(pct),
  };
}

function verba(competencia: string, diff: string): VerbaPrevPrivInput {
  return {
    competencia,
    ativo: true,
    diferencaParaCalculoDasIncidencias: new Decimal(diff),
  };
}

function makeInput(over: Partial<CalculoPrevPrivInput>): CalculoPrevPrivInput {
  return {
    verbasIncidentes: [],
    dataDeLiquidacao: new Date('2024-01-01T00:00:00Z'),
    indicesAcumulados: {},
    opcaoIndiceCorrecao: 'UTILIZAR_INDICE_TRABALHISTA',
    ...over,
  };
}

describe('PrevidenciaPrivada — Teto Mensal (Art. 6 LC 109/2001)', () => {
  it('sem teto: valorBase = soma das diferencas (comportamento legacy)', () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas([aliq('2023-01-01', '2023-01-31', '7.5')]);

    prev.liquidarComDados(makeInput({
      verbasIncidentes: [
        verba('2023-01-15', '5000'),
        verba('2023-01-20', '3000'),
      ],
    }));

    const ocs = prev.getOcorrencias();
    expect(ocs).toHaveLength(1);
    expect(ocs[0].valorBase.toString()).toBe('8000');
  });

  it('com teto 5000: clampa base de 8000 para 5000', () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas([aliq('2023-01-01', '2023-01-31', '7.5')]);

    prev.liquidarComDados(makeInput({
      verbasIncidentes: [
        verba('2023-01-15', '5000'),
        verba('2023-01-20', '3000'),
      ],
      tetoMensal: new Decimal('5000'),
    }));

    const ocs = prev.getOcorrencias();
    expect(ocs).toHaveLength(1);
    expect(ocs[0].valorBase.toString()).toBe('5000');
    // Devido = 5000 * 7.5% = 375
    expect(prev.getValorTotalDevido().toString()).toBe('375');
  });

  it('teto null: tratado como sem teto', () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas([aliq('2023-01-01', '2023-01-31', '7.5')]);

    prev.liquidarComDados(makeInput({
      verbasIncidentes: [verba('2023-01-15', '8000')],
      tetoMensal: null,
    }));

    expect(prev.getOcorrencias()[0].valorBase.toString()).toBe('8000');
  });

  it('teto zero: ignorado (nao clampa para zero)', () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas([aliq('2023-01-01', '2023-01-31', '7.5')]);

    prev.liquidarComDados(makeInput({
      verbasIncidentes: [verba('2023-01-15', '8000')],
      tetoMensal: new Decimal(0),
    }));

    expect(prev.getOcorrencias()[0].valorBase.toString()).toBe('8000');
  });

  it('teto maior que base: nao altera (sem clamp)', () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas([aliq('2023-01-01', '2023-01-31', '7.5')]);

    prev.liquidarComDados(makeInput({
      verbasIncidentes: [verba('2023-01-15', '3000')],
      tetoMensal: new Decimal('10000'),
    }));

    expect(prev.getOcorrencias()[0].valorBase.toString()).toBe('3000');
  });

  it('teto aplica em multiplas competencias independentemente', () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas([aliq('2023-01-01', '2023-03-31', '10')]);

    prev.liquidarComDados(makeInput({
      verbasIncidentes: [
        verba('2023-01-15', '8000'), // clampa para 5000
        verba('2023-02-15', '3000'), // 3000 (sem clamp)
        verba('2023-03-15', '5500'), // clampa para 5000
      ],
      tetoMensal: new Decimal('5000'),
    }));

    const ocs = prev.getOcorrencias();
    expect(ocs).toHaveLength(3);
    expect(ocs[0].valorBase.toString()).toBe('5000');
    expect(ocs[1].valorBase.toString()).toBe('3000');
    expect(ocs[2].valorBase.toString()).toBe('5000');
  });
});

describe('PrevidenciaPrivada — modoJuros', () => {
  const aliquotas = [aliq('2023-01-01', '2023-01-31', '10')];
  const verbas = [verba('2023-01-15', '1000')];
  const taxas = { '2023-01': new Decimal('5') }; // 5% de juros

  it('default trabalhista: aplica taxaJurosPorCompetencia', () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas(aliquotas);
    prev.liquidarComDados(makeInput({
      verbasIncidentes: verbas,
      taxaJurosPorCompetencia: taxas,
    }));
    expect(prev.getOcorrencias()[0].taxaDeJuros.toString()).toBe('5');
  });

  it("modo 'trabalhista' explicito: idem default", () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas(aliquotas);
    prev.liquidarComDados(makeInput({
      verbasIncidentes: verbas,
      taxaJurosPorCompetencia: taxas,
      modoJuros: 'trabalhista',
    }));
    expect(prev.getOcorrencias()[0].taxaDeJuros.toString()).toBe('5');
  });

  it("modo 'nenhum' zera juros mesmo com taxa fornecida", () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas(aliquotas);
    prev.liquidarComDados(makeInput({
      verbasIncidentes: verbas,
      taxaJurosPorCompetencia: taxas,
      modoJuros: 'nenhum',
    }));
    expect(prev.getOcorrencias()[0].taxaDeJuros.toString()).toBe('0');
    expect(prev.getValorTotalDeJuros().toString()).toBe('0');
  });

  it("modo 'pago_atraso': usa taxaJurosPorCompetencia (engine ja forneceria taxa diferenciada)", () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas(aliquotas);
    prev.liquidarComDados(makeInput({
      verbasIncidentes: verbas,
      taxaJurosPorCompetencia: taxas,
      modoJuros: 'pago_atraso',
    }));
    expect(prev.getOcorrencias()[0].taxaDeJuros.toString()).toBe('5');
  });
});

describe('PrevidenciaPrivada — Teto + modoJuros combinados', () => {
  it('teto clampa base, modoJuros=nenhum zera juros, devido reflete clamp', () => {
    const prev = new PrevidenciaPrivada();
    prev.setApurarPrevidenciaPrivada(true);
    prev.setAliquotas([aliq('2023-01-01', '2023-01-31', '10')]);

    prev.liquidarComDados(makeInput({
      verbasIncidentes: [verba('2023-01-15', '8000')],
      tetoMensal: new Decimal('5000'),
      taxaJurosPorCompetencia: { '2023-01': new Decimal('10') },
      modoJuros: 'nenhum',
    }));

    expect(prev.getOcorrencias()[0].valorBase.toString()).toBe('5000');
    expect(prev.getOcorrencias()[0].taxaDeJuros.toString()).toBe('0');
    // Devido = 5000 * 10% = 500
    expect(prev.getValorTotalDevido().toString()).toBe('500');
    expect(prev.getValorTotalDeJuros().toString()).toBe('0');
  });
});
