import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import {
  apurarInclusaoJurosContribuicaoSocial,
  apurarInclusaoJurosPrevidenciaPrivada,
  apurarVerbaIncideInssAvisoOuComum,
  apurarVerbaIncideInssDecimoTerceiro,
  apurarVerbaIncideInssFerias,
  criarApuracaoDeJurosMut,
  encontrarDescontoInssRelativoVerbasCompoemPrincipal,
  encontrarDescontoPrevPrivRelativoVerbasCompoemPrincipal,
} from '../calculo-juros-apuracao';

describe('calculo-juros-apuracao — Java 1:1', () => {
  describe('encontrarDescontoInssRelativoVerbasCompoemPrincipal', () => {
    it('totalVerbas == valorBaseVerbas → retorna valorDevidoReclamanteCorrigido', () => {
      const result = encontrarDescontoInssRelativoVerbasCompoemPrincipal(new Decimal(1000), {
        dataOcorrenciaInss: new Date('2024-01-01'),
        ocorrenciaDecimoTerceiro: false,
        valorDevidoReclamanteCorrigido: new Decimal(110),
        valorBaseVerbas: new Decimal(1000),
      });
      expect(result.toNumber()).toBe(110);
    });

    it('totalVerbas != valorBaseVerbas → proporcional', () => {
      const result = encontrarDescontoInssRelativoVerbasCompoemPrincipal(new Decimal(800), {
        dataOcorrenciaInss: new Date('2024-01-01'),
        ocorrenciaDecimoTerceiro: false,
        valorDevidoReclamanteCorrigido: new Decimal(110),
        valorBaseVerbas: new Decimal(1000),
      });
      // 800 × 110 / 1000 = 88
      expect(result.toNumber()).toBeCloseTo(88, 4);
    });

    it('valorBaseVerbas null → retorna apenas valorDevidoReclamanteCorrigido arredondado', () => {
      const result = encontrarDescontoInssRelativoVerbasCompoemPrincipal(new Decimal(800), {
        dataOcorrenciaInss: new Date('2024-01-01'),
        ocorrenciaDecimoTerceiro: false,
        valorDevidoReclamanteCorrigido: new Decimal('110.123'),
        valorBaseVerbas: null,
      });
      expect(result.toFixed(2)).toBe('110.12');
    });
  });

  describe('encontrarDescontoPrevPrivRelativoVerbasCompoemPrincipal', () => {
    it('aplica proporção quando totalVerbas != valorBase', () => {
      const result = encontrarDescontoPrevPrivRelativoVerbasCompoemPrincipal(new Decimal(500), {
        competencia: new Date('2024-01-01'),
        valorDevidoCorrigido: new Decimal(75),
        valorBase: new Decimal(1000),
      });
      // 500 × 75 / 1000 = 37.5
      expect(result.toNumber()).toBe(37.5);
    });
  });

  describe('apurarVerbaIncideInssAvisoOuComum', () => {
    it('acumula no map e na ocorrenciaDeJuros', () => {
      const map = new Map<string, Decimal>();
      const apur = criarApuracaoDeJurosMut();
      apurarVerbaIncideInssAvisoOuComum(map, new Decimal(500), '2024-01-01', apur);
      expect(map.get('2024-01-01')?.toNumber()).toBe(500);
      expect(apur.valorVerbaParaContribuicaoSocial.toNumber()).toBe(500);
    });

    it('soma quando chamado 2x na mesma competencia', () => {
      const map = new Map<string, Decimal>();
      const apur = criarApuracaoDeJurosMut();
      apurarVerbaIncideInssAvisoOuComum(map, new Decimal(500), '2024-01-01', apur);
      apurarVerbaIncideInssAvisoOuComum(map, new Decimal(300), '2024-01-01', apur);
      expect(map.get('2024-01-01')?.toNumber()).toBe(800);
      expect(apur.valorVerbaParaContribuicaoSocial.toNumber()).toBe(800);
    });
  });

  describe('apurarVerbaIncideInssFerias', () => {
    it('skip quando diferencaParaCalculoDasIncidencias eh null', () => {
      const map = new Map<string, Decimal>();
      const apur = criarApuracaoDeJurosMut();
      apurarVerbaIncideInssFerias(map, null, '2024-01-01', apur);
      expect(map.size).toBe(0);
      expect(apur.valorVerbaParaContribuicaoSocial.toNumber()).toBe(0);
    });

    it('acumula quando diferenca informada', () => {
      const map = new Map<string, Decimal>();
      const apur = criarApuracaoDeJurosMut();
      apurarVerbaIncideInssFerias(map, new Decimal(400), '2024-02-01', apur);
      expect(apur.valorVerbaParaContribuicaoSocial.toNumber()).toBe(400);
    });
  });

  describe('apurarVerbaIncideInssDecimoTerceiro', () => {
    it('usa map separado de 13o', () => {
      const map = new Map<string, Decimal>();
      const apur = criarApuracaoDeJurosMut();
      apurarVerbaIncideInssDecimoTerceiro(map, new Decimal(600), '2024-12-01', apur);
      expect(map.get('2024-12-01')?.toNumber()).toBe(600);
      expect(apur.valorVerbaParaContribuicaoSocialDecimoTerceiro.toNumber()).toBe(600);
      expect(apur.valorVerbaParaContribuicaoSocial.toNumber()).toBe(0);
    });
  });

  describe('apurarInclusaoJurosContribuicaoSocial', () => {
    it('distribui INSS proporcional ao peso de cada apuracao (caso 13o)', () => {
      const apur1 = criarApuracaoDeJurosMut();
      apur1.valorVerbaParaContribuicaoSocialDecimoTerceiro = new Decimal(300);
      const apur2 = criarApuracaoDeJurosMut();
      apur2.valorVerbaParaContribuicaoSocialDecimoTerceiro = new Decimal(700);

      const map = new Map<string, Set<typeof apur1>>();
      map.set('2024-12-01', new Set([apur1, apur2]));

      apurarInclusaoJurosContribuicaoSocial(map, {
        dataOcorrenciaInss: new Date(Date.UTC(2024, 11, 1)),
        ocorrenciaDecimoTerceiro: true,
        valorDevidoReclamanteCorrigido: new Decimal(110),
        valorBaseVerbas: new Decimal(1000),
      });

      // Total verbas = 1000, INSS = 110
      // apur1 recebe 300 × 110 / 1000 = 33
      // apur2 recebe 700 × 110 / 1000 = 77
      expect(apur1.contribuicaoSocialDecimoTerceiro.toNumber()).toBe(33);
      expect(apur2.contribuicaoSocialDecimoTerceiro.toNumber()).toBe(77);
    });

    it('distribui em contribuicaoSocialNormal quando NAO eh 13o', () => {
      const apur = criarApuracaoDeJurosMut();
      apur.valorVerbaParaContribuicaoSocial = new Decimal(500);

      const map = new Map<string, Set<typeof apur>>();
      map.set('2024-01-01', new Set([apur]));

      apurarInclusaoJurosContribuicaoSocial(map, {
        dataOcorrenciaInss: new Date(Date.UTC(2024, 0, 1)),
        ocorrenciaDecimoTerceiro: false,
        valorDevidoReclamanteCorrigido: new Decimal(50),
        valorBaseVerbas: new Decimal(500),
      });

      expect(apur.contribuicaoSocialNormal.toNumber()).toBe(50);
      expect(apur.contribuicaoSocialDecimoTerceiro.toNumber()).toBe(0);
    });

    it('skip quando map nao tem competencia', () => {
      const apur = criarApuracaoDeJurosMut();
      apur.valorVerbaParaContribuicaoSocial = new Decimal(500);
      const map = new Map<string, Set<typeof apur>>();
      apurarInclusaoJurosContribuicaoSocial(map, {
        dataOcorrenciaInss: new Date('2024-01-01'),
        ocorrenciaDecimoTerceiro: false,
        valorDevidoReclamanteCorrigido: new Decimal(50),
        valorBaseVerbas: new Decimal(500),
      });
      expect(apur.contribuicaoSocialNormal.toNumber()).toBe(0);
    });
  });

  describe('apurarInclusaoJurosPrevidenciaPrivada', () => {
    it('distribui PrevPriv proporcional', () => {
      const apur = criarApuracaoDeJurosMut();
      apur.valorVerbaParaPrevidenciaPrivada = new Decimal(1000);
      const map = new Map<string, Set<typeof apur>>();
      map.set('2024-03-01', new Set([apur]));

      apurarInclusaoJurosPrevidenciaPrivada(map, {
        competencia: new Date(Date.UTC(2024, 2, 1)),
        valorDevidoCorrigido: new Decimal(75),
        valorBase: new Decimal(1000),
      });

      expect(apur.previdenciaPrivada.toNumber()).toBe(75);
    });

    it('skip quando valorDevidoCorrigido eh null', () => {
      const apur = criarApuracaoDeJurosMut();
      apur.valorVerbaParaPrevidenciaPrivada = new Decimal(1000);
      const map = new Map<string, Set<typeof apur>>();
      map.set('2024-03-01', new Set([apur]));

      apurarInclusaoJurosPrevidenciaPrivada(map, {
        competencia: new Date(Date.UTC(2024, 2, 1)),
        valorDevidoCorrigido: null,
        valorBase: new Decimal(1000),
      });

      expect(apur.previdenciaPrivada.toNumber()).toBe(0);
    });
  });

  describe('criarApuracaoDeJurosMut', () => {
    it('todos os campos zerados', () => {
      const apur = criarApuracaoDeJurosMut();
      expect(apur.valorVerbaParaContribuicaoSocial.toNumber()).toBe(0);
      expect(apur.valorVerbaParaPrevidenciaPrivada.toNumber()).toBe(0);
      expect(apur.contribuicaoSocialNormal.toNumber()).toBe(0);
      expect(apur.previdenciaPrivada.toNumber()).toBe(0);
    });
  });
});
