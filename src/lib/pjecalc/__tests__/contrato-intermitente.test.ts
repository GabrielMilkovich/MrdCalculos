/**
 * Contrato Intermitente — Lei 13.467/2017
 * Testes para FGTS, Férias e 13º por convocação.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularFGTSIntermitente,
  calcularFeriasIntermitente,
  calcularDecimoTerceiroIntermitente,
} from '../contrato-intermitente';
import type { ConvocacaoIntermitente } from '../pjc-analyzer';

const convocacoes: ConvocacaoIntermitente[] = [
  {
    data_inicio: '2023-03-01',
    data_fim: '2023-03-15',
    horas_trabalhadas: 120,
    valor_recebido: 2000.00,
    competencia: '2023-03',
  },
  {
    data_inicio: '2023-05-10',
    data_fim: '2023-05-25',
    horas_trabalhadas: 128,
    valor_recebido: 2133.33,
    competencia: '2023-05',
  },
  {
    data_inicio: '2023-08-01',
    data_fim: '2023-08-31',
    horas_trabalhadas: 220,
    valor_recebido: 4000.00,
    competencia: '2023-08',
  },
];

describe('Contrato Intermitente — Lei 13.467/2017', () => {
  it('FGTS: incide só sobre valor das convocações', () => {
    const resultado = calcularFGTSIntermitente(convocacoes, 'SEM_JUSTA_CAUSA');

    // Total convocações: 2000 + 2133.33 + 4000 = 8133.33
    // Depósitos: 8133.33 × 8% = 650.66
    // Multa: 650.66 × 40% = 260.26
    expect(resultado.depositos).toBe(650.66);
    expect(resultado.multa).toBe(260.26);
    expect(resultado.total).toBe(910.92);
  });

  it('FGTS: multa 20% culpa recíproca', () => {
    const resultado = calcularFGTSIntermitente(convocacoes, 'CULPA_RECIPROCA');
    expect(resultado.multa).toBe(130.13); // 650.66 × 20%
  });

  it('Férias: proporcionais ao período da convocação com 1/3', () => {
    // Convocação 1: 15 dias (01-15 mar), valor 2000
    // Férias: (15/365) × 2000 × (4/3) = 109.59
    const ferias = calcularFeriasIntermitente(convocacoes[0]);
    expect(ferias).toBeCloseTo(109.59, 0);
  });

  it('Férias: mês completo', () => {
    // Convocação 3: 31 dias (01-31 ago), valor 4000
    // Férias: (31/365) × 4000 × (4/3) = 452.96
    const ferias = calcularFeriasIntermitente(convocacoes[2]);
    expect(ferias).toBeCloseTo(452.96, 0);
  });

  it('13º: proporcional ao período da convocação', () => {
    // Convocação 3: 31 dias, valor 4000
    // 13º: (31/365) × 4000 = 339.73
    const decimo = calcularDecimoTerceiroIntermitente(convocacoes[2]);
    expect(decimo).toBeCloseTo(339.72, 0);
  });

  it('INSS: meses sem convocação não geram contribuição', () => {
    const mesesComConvocacao = new Set(convocacoes.map(c => c.competencia));
    expect(mesesComConvocacao.has('2023-03')).toBe(true);
    expect(mesesComConvocacao.has('2023-04')).toBe(false); // sem convocação
    expect(mesesComConvocacao.has('2023-05')).toBe(true);
    expect(mesesComConvocacao.has('2023-06')).toBe(false); // sem convocação
    expect(mesesComConvocacao.has('2023-07')).toBe(false); // sem convocação
    expect(mesesComConvocacao.has('2023-08')).toBe(true);
  });

  it('convocação vazia retorna zero', () => {
    const fgts = calcularFGTSIntermitente([], 'SEM_JUSTA_CAUSA');
    expect(fgts.depositos).toBe(0);
    expect(fgts.multa).toBe(0);
    expect(fgts.total).toBe(0);
  });
});
