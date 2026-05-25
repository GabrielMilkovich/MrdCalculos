import { describe, expect, it } from 'vitest';
import { parseHolerite } from '../index';

describe('parseHolerite — roteador de layouts', () => {
  it('via_varejo_v1 é selecionado quando sinais batem', () => {
    const text = `
      RECIBO DE PAGAMENTO
      VIA VAREJO S.A.
      REFERÊNCIA: 11/2021
      0001  SALARIO BASE  30,00  1.320,00
      0620  COMISSOES  1.309,42
    `;
    const r = parseHolerite(text);
    expect(r.layout_usado).toBe('via_varejo_v1');
  });

  it('cai no generico_v1 quando sem sinais Via Varejo', () => {
    const text = `
      RECIBO DE PAGAMENTO
      EMPRESA GENÉRICA LTDA
      Referência: 03/2024
      Salário base              3.500,00
      Comissões                 1.200,00
      DSR sobre Comissões         200,00
    `;
    const r = parseHolerite(text);
    expect(r.layout_usado).toBe('generico_v1');
  });

  it('determinístico: mesmo input → mesmo layout', () => {
    const text = `
      VIA VAREJO S.A.
      REFERÊNCIA: 01/2024
      0001  SALARIO  1.000,00
    `;
    const r1 = parseHolerite(text);
    const r2 = parseHolerite(text);
    expect(r1.layout_usado).toBe(r2.layout_usado);
    expect(r1.rubricas.length).toBe(r2.rubricas.length);
  });

  it('via_varejo_v1 sem rubricas → fallback genérico', () => {
    const text = `VIA VAREJO S.A.\nREFERÊNCIA: 01/2024\nSem rubricas aqui.`;
    const r = parseHolerite(text);
    expect(r.layout_usado).toBe('generico_v1');
  });

  it('OCR curto → genérico com resultado vazio ou mínimo', () => {
    const r = parseHolerite('texto curto');
    expect(r.layout_usado).toBe('generico_v1');
  });

  it('Casas Bahia é reconhecida como Via Varejo', () => {
    const text = `
      CASAS BAHIA
      REFERÊNCIA: 06/2024
      0001 SALARIO BASE 2.500,00
    `;
    const r = parseHolerite(text);
    expect(r.layout_usado).toBe('via_varejo_v1');
  });

  it('CNPJ 33.041.260 é reconhecido como Via Varejo', () => {
    const text = `
      EMPRESA TAL
      CNPJ 33.041.260/0001-04
      REFERÊNCIA: 06/2024
      0001 SALARIO 1.500,00
    `;
    const r = parseHolerite(text);
    expect(r.layout_usado).toBe('via_varejo_v1');
  });

  it('competência é extraída corretamente no genérico', () => {
    const text = `
      RECIBO DE PAGAMENTO
      Referência: 03/2024
      Salário base  3.500,00
    `;
    const r = parseHolerite(text);
    expect(r.competencia).toBe('03/2024');
  });
});
