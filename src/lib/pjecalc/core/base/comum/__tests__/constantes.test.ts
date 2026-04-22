/**
 * Testes de Constantes — Fase 1.
 */
import { describe, it, expect } from 'vitest';
import {
  STR_ESPACO,
  STR_E,
  STR_SOBRE,
  STR_VIRGULA,
  STR_TRACO,
  QUANTIDADE_PADRAO_AVISO_PREVIO,
  QUANTIDADE_MAXIMA_DE_HISTORICOS,
  DATA_LIMITE_COM_DEMISSAO_PARA_AVISO_PREVIO_CALCULADO,
  DATA_REFORMA_TRABALHISTA,
  DATA_REFORMA_PREVIDENCIA,
} from '../constantes';

describe('Constantes — strings', () => {
  it('separadores têm os valores esperados', () => {
    expect(STR_ESPACO).toBe(' ');
    expect(STR_E).toBe(' E ');
    expect(STR_SOBRE).toBe(' SOBRE ');
    expect(STR_VIRGULA).toBe(', ');
    expect(STR_TRACO).toBe(' - ');
  });
});

describe('Constantes — numéricas', () => {
  it('aviso prévio padrão = 30', () => {
    expect(QUANTIDADE_PADRAO_AVISO_PREVIO.toString()).toBe('30');
  });

  it('quantidade máxima de históricos = 15', () => {
    expect(QUANTIDADE_MAXIMA_DE_HISTORICOS).toBe(15);
  });
});

describe('Constantes — marcos legais', () => {
  it('data limite aviso prévio calculado = 13/10/2011 (Lei 12.506/2011)', () => {
    const d = DATA_LIMITE_COM_DEMISSAO_PARA_AVISO_PREVIO_CALCULADO;
    expect(d.getFullYear()).toBe(2011);
    expect(d.getMonth()).toBe(9); // outubro (zero-based)
    expect(d.getDate()).toBe(13);
  });

  it('data Reforma Trabalhista = 11/11/2017 (Lei 13.467/2017)', () => {
    const d = DATA_REFORMA_TRABALHISTA;
    expect(d.getFullYear()).toBe(2017);
    expect(d.getMonth()).toBe(10); // novembro
    expect(d.getDate()).toBe(11);
  });

  it('data Reforma Previdência = 01/03/2020 (EC 103/2019)', () => {
    const d = DATA_REFORMA_PREVIDENCIA;
    expect(d.getFullYear()).toBe(2020);
    expect(d.getMonth()).toBe(2); // março
    expect(d.getDate()).toBe(1);
  });
});
