/**
 * Testes para HistoricoSalarial — foco: lookup de SalarioMinimoNacional
 * quando tipoValor=CALCULADO e baseDeReferencia=SALARIO_MINIMO.
 *
 * Ref Java: HistoricoSalarial.java:334-376 e linha 349
 *   `valor = isTipoValorCalculado() ? Utils.multiplicar(base, quantidade) : valor`
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { HistoricoSalarial } from '../historico-salarial';
import {
  TipoValorEnum,
  BaseDeCalculoDoPrincipalEnum,
} from '../../../constantes/enums';

describe('HistoricoSalarial — gerarOcorrencias com base SalarioMinimoNacional', () => {
  it('CALCULADO + SALARIO_MINIMO + quantidade=1 → ocorrência mensal usa salário mínimo da competência', () => {
    const hs = new HistoricoSalarial();
    hs.setTipoValor(TipoValorEnum.CALCULADO);
    hs.setBaseDeReferencia(BaseDeCalculoDoPrincipalEnum.SALARIO_MINIMO);
    hs.setQuantidade(new Decimal(1));
    hs.setCompetenciaInicial(new Date(2023, 0, 15)); // 15/jan/2023
    hs.setCompetenciaFinal(new Date(2023, 0, 31));   // 31/jan/2023

    hs.gerarOcorrencias();

    const ocorrencias = hs.getOcorrencias();
    expect(ocorrencias.length).toBe(1);
    // Em jan/2023, salário mínimo era R$ 1.302,00 (vigente desde 2023-01-01).
    expect(ocorrencias[0].getValor()?.toNumber()).toBe(1302);
  });

  it('CALCULADO + SALARIO_MINIMO + quantidade=2 → multiplica base × quantidade', () => {
    const hs = new HistoricoSalarial();
    hs.setTipoValor(TipoValorEnum.CALCULADO);
    hs.setBaseDeReferencia(BaseDeCalculoDoPrincipalEnum.SALARIO_MINIMO);
    hs.setQuantidade(new Decimal(2));
    hs.setCompetenciaInicial(new Date(2024, 0, 1));
    hs.setCompetenciaFinal(new Date(2024, 0, 31));

    hs.gerarOcorrencias();

    const ocs = hs.getOcorrencias();
    expect(ocs.length).toBe(1);
    // Em jan/2024, salário mínimo era R$ 1.412,00 → ×2 = 2824.
    expect(ocs[0].getValor()?.toNumber()).toBe(2824);
  });

  it('CALCULADO + SALARIO_MINIMO atravessa transição 2023-04 (1302) → 2023-05 (1320)', () => {
    const hs = new HistoricoSalarial();
    hs.setTipoValor(TipoValorEnum.CALCULADO);
    hs.setBaseDeReferencia(BaseDeCalculoDoPrincipalEnum.SALARIO_MINIMO);
    hs.setQuantidade(new Decimal(1));
    hs.setCompetenciaInicial(new Date(2023, 3, 1));  // abril/2023
    hs.setCompetenciaFinal(new Date(2023, 5, 30));   // junho/2023

    hs.gerarOcorrencias();

    const ocs = hs.getOcorrencias();
    expect(ocs.length).toBe(3);
    // abr/2023: ainda 1302; mai/2023: 1320 (vigente 2023-05-01); jun/2023: 1320.
    const valores = ocs.map(o => o.getValor()?.toNumber()).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(valores).toEqual([1302, 1320, 1320]);
  });

  it('INFORMADO → usa valorParaBaseDeCalculo, ignora baseDeReferencia', () => {
    const hs = new HistoricoSalarial();
    hs.setTipoValor(TipoValorEnum.INFORMADO);
    hs.setValorParaBaseDeCalculo(new Decimal('2500.00'));
    hs.setQuantidade(new Decimal(99)); // ignorado em modo INFORMADO
    hs.setCompetenciaInicial(new Date(2024, 0, 1));
    hs.setCompetenciaFinal(new Date(2024, 1, 28));

    hs.gerarOcorrencias();

    const ocs = hs.getOcorrencias();
    expect(ocs.length).toBe(2);
    expect(ocs.every(o => o.getValor()?.toNumber() === 2500)).toBe(true);
  });

  it('CALCULADO + SALARIO_MINIMO em ano histórico (2015) → R$ 788,00', () => {
    const hs = new HistoricoSalarial();
    hs.setTipoValor(TipoValorEnum.CALCULADO);
    hs.setBaseDeReferencia(BaseDeCalculoDoPrincipalEnum.SALARIO_MINIMO);
    hs.setQuantidade(new Decimal(1));
    hs.setCompetenciaInicial(new Date(2015, 5, 1));
    hs.setCompetenciaFinal(new Date(2015, 5, 30));

    hs.gerarOcorrencias();

    const ocs = hs.getOcorrencias();
    expect(ocs.length).toBe(1);
    expect(ocs[0].getValor()?.toNumber()).toBe(788);
  });
});
