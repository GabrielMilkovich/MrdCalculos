/**
 * Honorario.validar + validarDocumentoFiscal — golden (Fase 6)
 *
 * Fidelidade 1-a-1 com Honorario.java:524-560.
 */
import { describe, it, expect } from 'vitest';

import { Honorario } from '../honorario';
import {
  TipoOrigemRegistroEnum,
  TipoDeImpostoDeRendaEnum,
  BaseParaApuracaoDeHonorarioEnum,
} from '../../../../constantes/enums';
import { Calculo } from '../../calculo';
import { NegocioException } from '../../../../comum/exceptions/negocio-exception';
import { Mensagens } from '../../../../comum/mensagens';

function makeCalculo(dataLiquidacao: Date): Calculo {
  const c = new Calculo();
  c.setDataAdmissao(new Date('2018-01-01'));
  c.setDataDemissao(new Date('2022-12-31'));
  // setDataDeLiquidacao não existe diretamente; use o campo via reflection-like
  (c as unknown as { dataDeLiquidacao: Date }).dataDeLiquidacao = dataLiquidacao;
  return c;
}

describe('Honorario.validar — origemRegistro=ATUALIZACAO', () => {
  it('sem dataEvento: MSG0003 em "dataEvento"', () => {
    const h = new Honorario();
    h.setOrigemRegistro(TipoOrigemRegistroEnum.ATUALIZACAO);
    h.setApurarIRRF(false); // evita tipo IRRF
    try {
      h.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso().find(m => m.getAtributo() === 'dataEvento');
      expect(msg?.getChave()).toBe(Mensagens.MSG0003);
    }
  });

  it('dataEvento anterior à dataDeLiquidacao: MSG0127', () => {
    const calc = makeCalculo(new Date('2024-06-01'));
    const h = new Honorario();
    h.setCalculo(calc);
    h.setOrigemRegistro(TipoOrigemRegistroEnum.ATUALIZACAO);
    h.setDataEvento(new Date('2024-01-01')); // anterior
    h.setApurarIRRF(false);
    try {
      h.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msgs = (e as NegocioException).getMensagensDeRecurso();
      expect(msgs.some(m => m.getChave() === Mensagens.MSG0127)).toBe(true);
    }
  });

  it('dataEvento no futuro: MSG0128', () => {
    const calc = makeCalculo(new Date('2024-06-01'));
    const h = new Honorario();
    h.setCalculo(calc);
    h.setOrigemRegistro(TipoOrigemRegistroEnum.ATUALIZACAO);
    h.setDataEvento(new Date(Date.now() + 86400000 * 30)); // 30 dias no futuro
    h.setApurarIRRF(false);
    try {
      h.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msgs = (e as NegocioException).getMensagensDeRecurso();
      expect(msgs.some(m => m.getChave() === Mensagens.MSG0128)).toBe(true);
    }
  });

  it('dataEvento válido (entre liquidação e hoje): passa', () => {
    const calc = makeCalculo(new Date('2024-01-01'));
    const h = new Honorario();
    h.setCalculo(calc);
    h.setOrigemRegistro(TipoOrigemRegistroEnum.ATUALIZACAO);
    h.setDataEvento(new Date('2024-06-15'));
    h.setApurarIRRF(false);
    expect(() => h.validar()).not.toThrow();
  });
});

describe('Honorario.validar — apurarIRRF', () => {
  it('apurarIRRF=true sem tipoImpostoRenda: MSG0003', () => {
    const h = new Honorario();
    h.setOrigemRegistro(TipoOrigemRegistroEnum.CALCULO); // não exige dataEvento
    h.setApurarIRRF(true);
    h.setTipoImpostoRenda(null);
    try {
      h.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso().find(m => m.getAtributo() === 'tipoDeImpostoDeRenda');
      expect(msg?.getChave()).toBe(Mensagens.MSG0003);
    }
  });

  it('apurarIRRF=true com tipoImpostoRenda: passa', () => {
    const h = new Honorario();
    h.setOrigemRegistro(TipoOrigemRegistroEnum.CALCULO);
    h.setApurarIRRF(true);
    h.setTipoImpostoRenda(TipoDeImpostoDeRendaEnum.PESSOA_FISICA);
    expect(() => h.validar()).not.toThrow();
  });
});

describe('Honorario.validar — base VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL', () => {
  it('sem verbas selecionadas: MSG0167', () => {
    const h = new Honorario();
    h.setOrigemRegistro(TipoOrigemRegistroEnum.CALCULO);
    h.setApurarIRRF(false);
    h.setBaseParaApuracao(BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL);
    // verbasSelecionadas vazio por default
    try {
      h.validar();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msgs = (e as NegocioException).getMensagensDeRecurso();
      expect(msgs.some(m => m.getChave() === Mensagens.MSG0167)).toBe(true);
    }
  });
});

describe('Honorario.validarDocumentoFiscal', () => {
  it('apurarIRRF=false: passa mesmo sem documento', () => {
    const h = new Honorario();
    h.setApurarIRRF(false);
    expect(() => h.validarDocumentoFiscal()).not.toThrow();
  });

  it('apurarIRRF=true sem documento: lança MSG0003', () => {
    const h = new Honorario();
    h.setApurarIRRF(true);
    h.setNumeroDocumentoFiscalCredor(null);
    try {
      h.validarDocumentoFiscal();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso().find(m => m.getAtributo() === 'numeroDocumentoFiscalCredor');
      expect(msg?.getChave()).toBe(Mensagens.MSG0003);
    }
  });

  it('apurarIRRF=true com documento "  " (whitespace): lança', () => {
    const h = new Honorario();
    h.setApurarIRRF(true);
    h.setNumeroDocumentoFiscalCredor('   ');
    expect(() => h.validarDocumentoFiscal()).toThrow(NegocioException);
  });

  it('apurarIRRF=true com documento "12345": passa', () => {
    const h = new Honorario();
    h.setApurarIRRF(true);
    h.setNumeroDocumentoFiscalCredor('12345');
    expect(() => h.validarDocumentoFiscal()).not.toThrow();
  });
});
