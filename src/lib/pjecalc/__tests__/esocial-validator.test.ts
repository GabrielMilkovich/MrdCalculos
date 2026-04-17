/**
 * Testes do eSocial Validator (S-2500 e S-2501).
 *
 * Cobre: campos obrigatórios, CPF/CNPJ (DV), datas, valores monetários,
 * tamanhos máximos, blocos obrigatórios e lote de múltiplos erros.
 */

import { describe, it, expect } from 'vitest';
import {
  validateS2500,
  validateS2501,
  isValidCPF,
  isValidCNPJ,
  isValidNIS,
  isValidISODate,
  isValidPerAnoMes,
} from '../esocial-validator';
import type { S2500_Event, S2501_Event } from '../esocial-schema';

// =====================================================
// Fixtures — CPF/CNPJ com DV corretos
// =====================================================

// CPF válido: 11144477735 (DV calculado oficialmente)
const CPF_OK = '11144477735';
const CPF_BAD = '12345678900';
// CNPJ válido: 11222333000181
const CNPJ_OK = '11222333000181';
const CNPJ_BAD = '12345678901234';

function makeS2500(): S2500_Event {
  return {
    ideEvento: {
      indRetif: '1',
      tpAmb: '2',
      procEmi: '1',
      verProc: 'MRDcalc-1.0',
    },
    ideEmpregador: {
      tpInsc: '1',
      nrInsc: CNPJ_OK,
    },
    infoProcesso: {
      tpProc: '1',
      nrProcTrab: '12345678901234567890',
    },
    trabalhador: {
      cpfTrab: CPF_OK,
      nmTrab: 'Fulano de Tal',
    },
    infoContrato: {
      indReconhec: '1',
      dtAdm: '2020-01-15',
      codCateg: '101',
    },
    perApurPgto: '2024-01',
    periodos: [
      {
        perRef: '2024-01',
        rubricas: [
          { codRubr: 'HE50', ideTabRubr: 'MRD01', vrRubr: '1000.00' },
        ],
      },
    ],
  };
}

function makeS2501(): S2501_Event {
  return {
    ideEvento: {
      indRetif: '1',
      tpAmb: '2',
      procEmi: '1',
      verProc: 'MRDcalc-1.0',
    },
    ideEmpregador: {
      tpInsc: '1',
      nrInsc: CNPJ_OK,
    },
    ideProc: {
      nrProcTrab: '12345678901234567890',
      perApurPgto: '2024-01',
      tpPgto: '1',
    },
    ideTrab: {
      cpfTrab: CPF_OK,
      indCateg: '1',
    },
    calcTrib: {
      indApurIR: '1',
      vrCpSeg: '250.00',
      contribuicoes: [{ tpCR: '1708', vrCR: '500.00' }],
    },
    basesInss: [
      { perRef: '2024-01', vrBcCpMensal: '3000.00' },
    ],
  };
}

// =====================================================
// Testes primitivos
// =====================================================

describe('Helpers primitivos', () => {
  it('isValidCPF aceita CPF correto e rejeita errado', () => {
    expect(isValidCPF(CPF_OK)).toBe(true);
    expect(isValidCPF(CPF_BAD)).toBe(false);
    expect(isValidCPF('00000000000')).toBe(false);
    expect(isValidCPF('abc')).toBe(false);
  });

  it('isValidCNPJ aceita CNPJ correto e rejeita errado', () => {
    expect(isValidCNPJ(CNPJ_OK)).toBe(true);
    expect(isValidCNPJ(CNPJ_BAD)).toBe(false);
    expect(isValidCNPJ('00000000000000')).toBe(false);
  });

  it('isValidNIS aceita 11 dígitos', () => {
    expect(isValidNIS('12345678901')).toBe(true);
    expect(isValidNIS('1234')).toBe(false);
    expect(isValidNIS('abcdefghijk')).toBe(false);
  });

  it('isValidISODate rejeita datas malformadas', () => {
    expect(isValidISODate('2024-01-15')).toBe(true);
    expect(isValidISODate('2024-13-01')).toBe(false);
    expect(isValidISODate('2024-02-30')).toBe(false);
    expect(isValidISODate('15/01/2024')).toBe(false);
  });

  it('isValidPerAnoMes aceita YYYY-MM', () => {
    expect(isValidPerAnoMes('2024-01')).toBe(true);
    expect(isValidPerAnoMes('2024-13')).toBe(false);
    expect(isValidPerAnoMes('2024')).toBe(false);
  });
});

// =====================================================
// S-2500
// =====================================================

describe('validateS2500', () => {
  it('S-2500 válido retorna { valid: true }', () => {
    const r = validateS2500(makeS2500());
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('detecta bloco ideEvento ausente', () => {
    const ev = makeS2500() as unknown as Record<string, unknown>;
    delete ev.ideEvento;
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'ideEvento')).toBe(true);
  });

  it('detecta campo obrigatório faltando (trabalhador.nmTrab)', () => {
    const ev = makeS2500();
    (ev.trabalhador as { nmTrab?: string }).nmTrab = '';
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'trabalhador.nmTrab')).toBe(true);
  });

  it('detecta CPF inválido', () => {
    const ev = makeS2500();
    ev.trabalhador.cpfTrab = CPF_BAD;
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'trabalhador.cpfTrab')).toBe(true);
  });

  it('detecta CNPJ inválido no empregador', () => {
    const ev = makeS2500();
    ev.ideEmpregador.nrInsc = CNPJ_BAD;
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'ideEmpregador.nrInsc')).toBe(true);
  });

  it('detecta data mal formatada (dtAdm)', () => {
    const ev = makeS2500();
    ev.infoContrato.dtAdm = '15/01/2020';
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'infoContrato.dtAdm')).toBe(true);
  });

  it('detecta valor monetário negativo', () => {
    const ev = makeS2500();
    ev.infoContrato.remuneracao = '-100.00';
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'infoContrato.remuneracao')).toBe(true);
  });

  it('detecta string muito longa (nmTrab > 70)', () => {
    const ev = makeS2500();
    ev.trabalhador.nmTrab = 'A'.repeat(100);
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'trabalhador.nmTrab' && /máximo/.test(e.message))).toBe(true);
  });

  it('detecta NIS com menos de 11 dígitos', () => {
    const ev = makeS2500();
    ev.trabalhador.nisTrab = '1234';
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'trabalhador.nisTrab')).toBe(true);
  });

  it('detecta nrProcTrab fora do padrão CNJ (20 dígitos)', () => {
    const ev = makeS2500();
    ev.infoProcesso.nrProcTrab = '123';
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'infoProcesso.nrProcTrab')).toBe(true);
  });

  it('exige array `periodos` com pelo menos 1 item', () => {
    const ev = makeS2500();
    ev.periodos = [];
    const r = validateS2500(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'periodos')).toBe(true);
  });

  it('retorna root error quando input não é objeto', () => {
    const r = validateS2500(null);
    expect(r.valid).toBe(false);
    expect(r.errors[0].field).toBe('root');
  });
});

// =====================================================
// S-2501
// =====================================================

describe('validateS2501', () => {
  it('S-2501 válido retorna { valid: true }', () => {
    const r = validateS2501(makeS2501());
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('S-2501 sem ideEvento retorna erro', () => {
    const ev = makeS2501() as unknown as Record<string, unknown>;
    delete ev.ideEvento;
    const r = validateS2501(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'ideEvento')).toBe(true);
  });

  it('S-2501 sem ideEmpregador retorna erro', () => {
    const ev = makeS2501() as unknown as Record<string, unknown>;
    delete ev.ideEmpregador;
    const r = validateS2501(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'ideEmpregador')).toBe(true);
  });

  it('detecta contribuicoes vazio', () => {
    const ev = makeS2501();
    ev.calcTrib.contribuicoes = [];
    const r = validateS2501(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'calcTrib.contribuicoes')).toBe(true);
  });

  it('detecta valor monetário inválido em basesInss', () => {
    const ev = makeS2501();
    ev.basesInss[0].vrBcCpMensal = 'abc';
    const r = validateS2501(ev);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'basesInss[0].vrBcCpMensal')).toBe(true);
  });

  it('validação em lote retorna todos os erros (não para no primeiro)', () => {
    // Construir evento com múltiplas violações
    const ev: unknown = {
      ideEvento: { indRetif: '9', tpAmb: 'X', procEmi: '1', verProc: '' }, // 3 erros
      ideEmpregador: { tpInsc: '1', nrInsc: '00' }, // 1 erro
      ideProc: { nrProcTrab: '123', perApurPgto: 'bad', tpPgto: '9' }, // 3 erros
      ideTrab: { cpfTrab: CPF_BAD, indCateg: '9' }, // 2 erros
      calcTrib: {
        indApurIR: '9', // 1 erro
        vrCpSeg: '-10.00', // 1 erro
        contribuicoes: [{ tpCR: '9999', vrCR: '-5.00' }], // 2 erros
      },
      basesInss: [], // 1 erro
    };
    const r = validateS2501(ev);
    expect(r.valid).toBe(false);
    // Deve haver pelo menos 10 erros distintos, provando que não parou no primeiro
    expect(r.errors.length).toBeGreaterThanOrEqual(10);
    const fields = new Set(r.errors.map(e => e.field));
    expect(fields.has('ideEvento.indRetif')).toBe(true);
    expect(fields.has('ideTrab.cpfTrab')).toBe(true);
    expect(fields.has('basesInss')).toBe(true);
  });
});
