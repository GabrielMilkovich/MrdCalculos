/**
 * Testes dos enums espelhados em arquivos individuais — Fase 1.
 *
 * Valida que valores e nomes batem com Java.
 */
import { describe, it, expect } from 'vitest';
import {
  TipoDeVerbaEnum,
  TipoDeVerbaEnumNomes,
  TipoFeriadoEnum,
  TipoFeriadoEnumNomes,
  AbrangenciaDoFeriadoEnum,
  AbrangenciaDoFeriadoEnumNomes,
  TipoSalarioPagoEnum,
  TipoSalarioPagoEnumNomes,
  TipoValorCalculadoEnum,
  DestinoDoFgtsEnum,
  DestinoDoFgtsEnumNomes,
  DestinoDoFgtsEnumMensagens,
} from '../../index';

describe('TipoDeVerbaEnum', () => {
  it('valores P/R', () => {
    expect(TipoDeVerbaEnum.PRINCIPAL).toBe('P');
    expect(TipoDeVerbaEnum.REFLEXO).toBe('R');
  });
  it('nomes', () => {
    expect(TipoDeVerbaEnumNomes[TipoDeVerbaEnum.PRINCIPAL]).toBe('Principal');
    expect(TipoDeVerbaEnumNomes[TipoDeVerbaEnum.REFLEXO]).toBe('Reflexa');
  });
});

describe('TipoFeriadoEnum', () => {
  it('valores F/P/B', () => {
    expect(TipoFeriadoEnum.FERIADO).toBe('F');
    expect(TipoFeriadoEnum.PONTO_FACULTATIVO).toBe('P');
    expect(TipoFeriadoEnum.BANCARIO).toBe('B');
  });
  it('nome do bancário preserva acentuação', () => {
    expect(TipoFeriadoEnumNomes[TipoFeriadoEnum.BANCARIO]).toBe('Feriado Exclusivamente Bancário');
  });
});

describe('AbrangenciaDoFeriadoEnum', () => {
  it('valores F/E/M', () => {
    expect(AbrangenciaDoFeriadoEnum.FEDERAL).toBe('F');
    expect(AbrangenciaDoFeriadoEnum.ESTADUAL).toBe('E');
    expect(AbrangenciaDoFeriadoEnum.MUNICIPAL).toBe('M');
  });
  it('nome de FEDERAL = "Nacional" (preserva desalinhamento nome vs key do Java)', () => {
    expect(AbrangenciaDoFeriadoEnumNomes[AbrangenciaDoFeriadoEnum.FEDERAL]).toBe('Nacional');
  });
});

describe('TipoSalarioPagoEnum', () => {
  it('valores N/U/M/H', () => {
    expect(TipoSalarioPagoEnum.NENHUM).toBe('N');
    expect(TipoSalarioPagoEnum.ULTIMA_REMUNERACAO).toBe('U');
    expect(TipoSalarioPagoEnum.MAIOR_REMUNERACAO).toBe('M');
    expect(TipoSalarioPagoEnum.HISTORICO_SALARIAL).toBe('H');
  });
  it('nomes preservam acentuação', () => {
    expect(TipoSalarioPagoEnumNomes[TipoSalarioPagoEnum.ULTIMA_REMUNERACAO]).toBe('Última Remuneração');
    expect(TipoSalarioPagoEnumNomes[TipoSalarioPagoEnum.HISTORICO_SALARIAL]).toBe('Histórico Salarial');
  });
});

describe('TipoValorCalculadoEnum', () => {
  it('VALOR_DEVIDO / VALOR_PAGO — keys e valores idênticos', () => {
    expect(TipoValorCalculadoEnum.VALOR_DEVIDO).toBe('VALOR_DEVIDO');
    expect(TipoValorCalculadoEnum.VALOR_PAGO).toBe('VALOR_PAGO');
  });
});

describe('DestinoDoFgtsEnum', () => {
  it('valores P/D', () => {
    expect(DestinoDoFgtsEnum.PAGAR).toBe('P');
    expect(DestinoDoFgtsEnum.DEPOSITAR).toBe('D');
  });
  it('tripla nome + mensagem', () => {
    expect(DestinoDoFgtsEnumNomes[DestinoDoFgtsEnum.PAGAR]).toBe('Pagar');
    expect(DestinoDoFgtsEnumNomes[DestinoDoFgtsEnum.DEPOSITAR]).toBe('Recolher');
    expect(DestinoDoFgtsEnumMensagens[DestinoDoFgtsEnum.PAGAR]).toBe('Para pagamento ao reclamante');
    expect(DestinoDoFgtsEnumMensagens[DestinoDoFgtsEnum.DEPOSITAR]).toBe('Para depósito em conta vinculada');
  });
});
