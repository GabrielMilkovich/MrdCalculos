import { describe, expect, it } from 'vitest';
import {
  detectarOrigemEmpregador,
  MENSAGEM_BLOQUEIO_MAGALU,
} from '../classification/origem-empregador';

describe('detectarOrigemEmpregador — Magazine Luiza', () => {
  it('OCR com "MAGAZINE LUIZA" é bloqueado', () => {
    const ocr = `
      MAGAZINE LUIZA S.A.
      Recibo de Pagamento
      Período Aquisitivo: 2022/2023
    `;
    const r = detectarOrigemEmpregador(ocr);
    expect(r.suportado).toBe(false);
    if (!r.suportado) {
      expect(r.motivo).toBe('magazine_luiza_fora_de_escopo');
      expect(r.mensagemOperador).toBe(MENSAGEM_BLOQUEIO_MAGALU);
      expect(r.detalhes.length).toBeGreaterThan(0);
    }
  });

  it('OCR com "MAGALU" é bloqueado', () => {
    const ocr = `Folha de pagamento - MAGALU 02/2024`;
    const r = detectarOrigemEmpregador(ocr);
    expect(r.suportado).toBe(false);
  });

  it('OCR com CNPJ Magalu (47.960.950/...) é bloqueado', () => {
    const ocr = `
      CNPJ: 47.960.950/0001-21
      Empresa de Tecnologia
    `;
    const r = detectarOrigemEmpregador(ocr);
    expect(r.suportado).toBe(false);
  });

  it('OCR com "LUIZALABS" é bloqueado', () => {
    const ocr = `LUIZALABS — Holerite mensal`;
    const r = detectarOrigemEmpregador(ocr);
    expect(r.suportado).toBe(false);
  });
});

describe('detectarOrigemEmpregador — Via Varejo / Casas Bahia', () => {
  it('OCR com "NOVA CASA BAHIA S/A" é suportado', () => {
    const ocr = `
      NOVA CASA BAHIA S/A
      C.G.C. 10.757.237/0556-62
      Cartão de Ponto
    `;
    const r = detectarOrigemEmpregador(ocr);
    expect(r.suportado).toBe(true);
    if (r.suportado) {
      expect(r.layout).toBe('via_varejo');
      expect(r.motivos.length).toBeGreaterThan(0);
    }
  });

  it('OCR com "VIA VAREJO S/A" é suportado', () => {
    const ocr = `VIA VAREJO S/A — Holerite`;
    const r = detectarOrigemEmpregador(ocr);
    expect(r.suportado).toBe(true);
  });

  it('Via Varejo presente vence Magalu (caso raro de menção a concorrente)', () => {
    const ocr = `
      VIA VAREJO S/A
      Comparativo de mercado: Magazine Luiza, Amazon
    `;
    const r = detectarOrigemEmpregador(ocr);
    expect(r.suportado).toBe(true);
    if (r.suportado) {
      expect(r.layout).toBe('via_varejo');
    }
  });
});

describe('detectarOrigemEmpregador — fallback genérico', () => {
  it('OCR sem marcadores específicos cai em layout genérico', () => {
    const ocr = `
      Empresa Qualquer Ltda
      Recibo de pagamento
      Salário base R$ 3.000,00
    `;
    const r = detectarOrigemEmpregador(ocr);
    expect(r.suportado).toBe(true);
    if (r.suportado) {
      expect(r.layout).toBe('generico');
    }
  });

  it('OCR vazio cai em genérico (não bloqueia)', () => {
    const r = detectarOrigemEmpregador('');
    expect(r.suportado).toBe(true);
  });
});

describe('MENSAGEM_BLOQUEIO_MAGALU', () => {
  it('mensagem é em PT-BR e oferece ação ao operador', () => {
    expect(MENSAGEM_BLOQUEIO_MAGALU).toMatch(/Magazine Luiza/i);
    expect(MENSAGEM_BLOQUEIO_MAGALU).toMatch(/manualmente/i);
    expect(MENSAGEM_BLOQUEIO_MAGALU).toMatch(/Via Varejo|Casa Bahia/);
  });
});
