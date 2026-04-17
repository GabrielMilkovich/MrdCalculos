/**
 * Testes dos validadores e formatadores de documentos brasileiros.
 *
 * Cobertura:
 *  - CPF  (válido, inválido por DV, dígitos iguais, entrada formatada)
 *  - CNPJ (válido, inválido por DV, dígitos iguais, entrada formatada)
 *  - PIS  (válido, inválido por DV, dígitos iguais)
 *  - CNJ  (válido, inválido por MOD 97, tamanho incorreto)
 *  - Formatadores (completo e parcial)
 */
import { describe, it, expect } from 'vitest';
import {
  validarCPF,
  validarCNPJ,
  validarPIS,
  validarProcessoCNJ,
  formatarCPF,
  formatarCNPJ,
  formatarPIS,
  formatarProcessoCNJ,
} from '../validadores';

// ============ CPF ============

describe('validarCPF', () => {
  it('aceita CPF válido (somente dígitos)', () => {
    expect(validarCPF('52998224725')).toBe(true);
  });

  it('aceita CPF válido com máscara', () => {
    expect(validarCPF('529.982.247-25')).toBe(true);
  });

  it('rejeita CPF com todos dígitos iguais', () => {
    expect(validarCPF('11111111111')).toBe(false);
    expect(validarCPF('00000000000')).toBe(false);
  });

  it('rejeita CPF com DV incorreto', () => {
    expect(validarCPF('52998224726')).toBe(false);
    expect(validarCPF('12345678900')).toBe(false);
  });

  it('rejeita CPF com tamanho incorreto', () => {
    expect(validarCPF('1234567890')).toBe(false);
    expect(validarCPF('')).toBe(false);
    expect(validarCPF('529982247250')).toBe(false);
  });
});

// ============ CNPJ ============

describe('validarCNPJ', () => {
  it('aceita CNPJ válido (somente dígitos)', () => {
    // CNPJ público da Petrobras
    expect(validarCNPJ('33000167000101')).toBe(true);
  });

  it('aceita CNPJ válido com máscara', () => {
    expect(validarCNPJ('33.000.167/0001-01')).toBe(true);
  });

  it('rejeita CNPJ com todos dígitos iguais', () => {
    expect(validarCNPJ('11111111111111')).toBe(false);
  });

  it('rejeita CNPJ com DV incorreto', () => {
    expect(validarCNPJ('33000167000102')).toBe(false);
    expect(validarCNPJ('12345678000100')).toBe(false);
  });

  it('rejeita CNPJ com tamanho incorreto', () => {
    expect(validarCNPJ('3300016700010')).toBe(false);
    expect(validarCNPJ('')).toBe(false);
  });
});

// ============ PIS / PASEP / NIS ============

describe('validarPIS', () => {
  it('aceita PIS válido', () => {
    // DV calculado pelo algoritmo oficial (pesos 3,2,9..2)
    expect(validarPIS('12056412545')).toBe(true);
  });

  it('aceita PIS válido com máscara', () => {
    expect(validarPIS('120.56412.54-5')).toBe(true);
  });

  it('rejeita PIS com todos dígitos iguais', () => {
    expect(validarPIS('00000000000')).toBe(false);
    expect(validarPIS('99999999999')).toBe(false);
  });

  it('rejeita PIS com DV incorreto', () => {
    expect(validarPIS('12056412546')).toBe(false);
    expect(validarPIS('12056412547')).toBe(false);
  });

  it('rejeita PIS com tamanho incorreto', () => {
    expect(validarPIS('1205641254')).toBe(false);
    expect(validarPIS('')).toBe(false);
  });
});

// ============ Processo CNJ ============

describe('validarProcessoCNJ', () => {
  it('aceita número CNJ válido (formatado)', () => {
    // DV calculado por MOD 97 (Res. CNJ 65/2008) — ramo 8 (TJ), TR 26, órgão 0100
    expect(validarProcessoCNJ('0001327-25.2010.8.26.0100')).toBe(true);
  });

  it('aceita número CNJ válido (somente dígitos)', () => {
    expect(validarProcessoCNJ('00013272520108260100')).toBe(true);
  });

  it('rejeita número CNJ com DV incorreto', () => {
    expect(validarProcessoCNJ('00013272620108260100')).toBe(false);
    expect(validarProcessoCNJ('00013276420108260100')).toBe(false);
  });

  it('rejeita número CNJ com tamanho incorreto', () => {
    expect(validarProcessoCNJ('0001327252010826010')).toBe(false);
    expect(validarProcessoCNJ('')).toBe(false);
  });

  it('rejeita número CNJ com J (ramo) = 0', () => {
    // Mesmo com MOD 97 "numericamente" correto, ramo 0 é inválido.
    expect(validarProcessoCNJ('00000000000000000000')).toBe(false);
  });
});

// ============ Formatadores ============

describe('formatarCPF', () => {
  it('formata CPF completo', () => {
    expect(formatarCPF('52998224725')).toBe('529.982.247-25');
  });

  it('formata CPF parcial (progressivo)', () => {
    expect(formatarCPF('529')).toBe('529');
    expect(formatarCPF('529982')).toBe('529.982');
    expect(formatarCPF('529982247')).toBe('529.982.247');
  });

  it('descarta dígitos excedentes no CPF', () => {
    expect(formatarCPF('52998224725999')).toBe('529.982.247-25');
  });
});

describe('formatarCNPJ', () => {
  it('formata CNPJ completo', () => {
    expect(formatarCNPJ('33000167000101')).toBe('33.000.167/0001-01');
  });

  it('formata CNPJ parcial (progressivo)', () => {
    expect(formatarCNPJ('33')).toBe('33');
    expect(formatarCNPJ('33000167')).toBe('33.000.167');
    expect(formatarCNPJ('330001670001')).toBe('33.000.167/0001');
  });
});

describe('formatarPIS', () => {
  it('formata PIS completo', () => {
    expect(formatarPIS('12056412547')).toBe('120.56412.54-7');
  });

  it('formata PIS parcial', () => {
    expect(formatarPIS('120')).toBe('120');
    expect(formatarPIS('12056412')).toBe('120.56412');
  });
});

describe('formatarProcessoCNJ', () => {
  it('formata número CNJ completo', () => {
    expect(formatarProcessoCNJ('00013272520108260100')).toBe('0001327-25.2010.8.26.0100');
  });

  it('formata número CNJ parcial', () => {
    expect(formatarProcessoCNJ('0001327')).toBe('0001327');
    expect(formatarProcessoCNJ('000132725')).toBe('0001327-25');
    expect(formatarProcessoCNJ('0001327252010')).toBe('0001327-25.2010');
  });

  it('descarta dígitos excedentes', () => {
    expect(formatarProcessoCNJ('000132725201082601009999')).toBe('0001327-25.2010.8.26.0100');
  });
});
