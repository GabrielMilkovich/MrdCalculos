/**
 * Testes dos módulos portados: IndiceBase, IndiceIPCAE, OcorrenciaDeVerba.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  IndiceBase,
  IndiceIPCAE,
  TABELA_IPCAE,
  calcularIndiceAcumulado,
  OcorrenciaDeVerba,
  Periodo,
  ValorDaVerbaEnum,
  CaracteristicaDaVerbaEnum,
  type IVerbaDeCalculoRef,
} from '../index';

describe('IndiceIPCAE', () => {
  it('TABELA_IPCAE tem entradas de 2015-01 a 2026-02', () => {
    const first = TABELA_IPCAE[0];
    const last = TABELA_IPCAE[TABELA_IPCAE.length - 1];
    expect(first.ano).toBe(2015);
    expect(first.mes).toBe(1);
    expect(last.ano).toBe(2026);
    expect(last.mes).toBe(2);
    expect(TABELA_IPCAE.length).toBeGreaterThanOrEqual(130);
  });

  it('obterTabela devolve período corretamente', () => {
    // IPCA-E de 2023 inteiro
    const lista = IndiceIPCAE.obterTabela(
      new Periodo(new Date(2023, 0, 1), new Date(2023, 11, 31))
    );
    expect(lista.length).toBe(12);
    expect(lista[0].getCompetencia().getMonth()).toBe(0); // Jan
    expect(lista[11].getCompetencia().getMonth()).toBe(11); // Dez
    // taxa em %
    expect(lista[0].getTaxa()).toBeInstanceOf(Decimal);
  });

  it('getValorIndice = 1 + taxa/100', () => {
    const idx = new IndiceIPCAE(new Date(2024, 0, 1), new Decimal('0.5'));
    expect(idx.getValorIndice().toString()).toBe('1.005');
  });

  it('clonar preserva valorAcumulado', () => {
    const idx = new IndiceIPCAE(new Date(2024, 0, 1), new Decimal('0.5'));
    idx.setValorAcumulado(new Decimal('150.75'));
    const clone = idx.clonar();
    expect(clone.getValorAcumulado()!.toString()).toBe('150.75');
  });

  it('calcularIndiceAcumulado produto integra com IndiceIPCAE', () => {
    // Cria 3 índices IPCA-E fake e verifica produto
    const indices: IndiceBase[] = [
      new IndiceIPCAE(new Date(2024, 0, 1), new Decimal('1.0')), // 1.01
      new IndiceIPCAE(new Date(2024, 1, 1), new Decimal('0.5')), // 1.005
      new IndiceIPCAE(new Date(2024, 2, 1), new Decimal('0.8')), // 1.008
    ];
    const out = calcularIndiceAcumulado(indices);
    // Acumulado final = 1.01 × 1.005 × 1.008 ≈ 1.02321...
    const final = out[2].getValorAcumulado()!.toDP(5).toNumber();
    expect(final).toBeCloseTo(1.02321, 4);
  });
});

describe('OcorrenciaDeVerba — cálculo de diferença e correção', () => {
  function mockVerba(zera: boolean = true): IVerbaDeCalculoRef {
    return {
      getTipoValor: () => ValorDaVerbaEnum.CALCULADO,
      getZeraValorNegativo: () => zera,
    };
  }

  it('getDiferenca = devido - pago', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba(false));
    oc.setDevido(new Decimal('100'));
    oc.setPago(new Decimal('30'));
    expect(oc.getDiferenca().toString()).toBe('70');
  });

  it('getDiferenca zera se negativa e zeraValorNegativo=true', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba(true));
    oc.setDevido(new Decimal('30'));
    oc.setPago(new Decimal('100'));
    expect(oc.getDiferenca().toString()).toBe('0');
  });

  it('getDiferenca mantém negativa se zeraValorNegativo=false', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba(false));
    oc.setDevido(new Decimal('30'));
    oc.setPago(new Decimal('100'));
    expect(oc.getDiferenca().toString()).toBe('-70');
  });

  it('getDiferencaCorrigida = diferenca × indiceAcumulado', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba(false));
    oc.setDevido(new Decimal('100'));
    oc.setPago(new Decimal('20'));
    oc.setIndiceAcumulado(new Decimal('1.2'));
    // 80 × 1.2 = 96
    expect(oc.getDiferencaCorrigida()!.toString()).toBe('96');
  });

  it('getDiferencaCorrigida null se indiceAcumulado ausente', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba(false));
    oc.setDevido(new Decimal('100'));
    oc.setPago(new Decimal('20'));
    expect(oc.getDiferencaCorrigida()).toBeNull();
  });

  it('getDiferenca = 0 se ativo=false', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba(false));
    oc.setDevido(new Decimal('100'));
    oc.setPago(new Decimal('30'));
    oc.setAtivo(false);
    expect(oc.getDiferenca().toString()).toBe('0');
  });

  it('setQuantidade diferente zera quantidadeIntegral', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setQuantidade(new Decimal('10'));
    oc.setQuantidadeIntegral(new Decimal('15'));
    expect(oc.getQuantidadeIntegral()!.toString()).toBe('15');
    oc.setQuantidade(new Decimal('20')); // diferente de 10
    expect(oc.getQuantidadeIntegral()).toBeNull();
  });

  it('setPago diferente zera pagoIntegral', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setPago(new Decimal('50'));
    oc.setPagoIntegral(new Decimal('80'));
    expect(oc.getPagoIntegral()!.toString()).toBe('80');
    oc.setPago(new Decimal('60'));
    // getPagoIntegral vai recalcular via integraliza (que é identity aqui)
    expect(oc.getPagoIntegral()!.toString()).toBe('60');
  });

  it('calcularFatorAbono retorna 1.5 quando não há período aquisitivo', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba(false));
    expect(oc.calcularFatorAbono().toString()).toBe('1.5');
  });

  it('compareTo ordena por dataInicial', () => {
    const oc1 = new OcorrenciaDeVerba();
    oc1.setDataInicial(new Date(2024, 2, 1));
    const oc2 = new OcorrenciaDeVerba();
    oc2.setDataInicial(new Date(2024, 0, 1));
    expect(oc1.compareTo(oc2)).toBeGreaterThan(0);
    expect(oc2.compareTo(oc1)).toBeLessThan(0);
  });

  it('característica defaults para COMUM', () => {
    const oc = new OcorrenciaDeVerba();
    expect(oc.getCaracteristica()).toBe(CaracteristicaDaVerbaEnum.COMUM);
  });

  it('clone copia campos essenciais', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setDevido(new Decimal('500'));
    oc.setPago(new Decimal('100'));
    oc.setIndiceAcumulado(new Decimal('1.5'));
    oc.setCaracteristica(CaracteristicaDaVerbaEnum.FERIAS);
    const c = oc.clone();
    expect(c.getDevido()!.toString()).toBe('500');
    expect(c.getPago()!.toString()).toBe('100');
    expect(c.getIndiceAcumulado()!.toString()).toBe('1.5');
    expect(c.getCaracteristica()).toBe(CaracteristicaDaVerbaEnum.FERIAS);
  });
});
