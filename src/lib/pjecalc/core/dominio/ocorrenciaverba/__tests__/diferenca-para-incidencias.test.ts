/**
 * Testes do método getDiferencaParaCalculoDasIncidencias.
 *
 * Porte 1:1 de OcorrenciaDeVerba.java linhas 663-684 (PJe-Calc v2.15.1).
 *
 * Cobertura mínima exigida (D1 do INSS-FIXER):
 *   - Verba normal (sem férias)         → retorna getDiferenca()
 *   - Férias indenizadas                → retorna null
 *   - Férias com dobra                  → 50% da diferença
 *   - Férias com abono CALCULADO        → diferença / fatorAbono (default 1.5)
 *   - Caso devido/pago null/zero        → retorna 0 (não null)
 *
 * Casos extras (regressão):
 *   - Variante corrigido=true usa getDiferencaCorrigida
 *   - Abono com tipoValor=INFORMADO     → NÃO aplica retirarAbono (Java linha 678)
 *   - Férias com dobra + abono          → primeiro ×0.5, depois /1.5
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  OcorrenciaDeVerba,
  ValorDaVerbaEnum,
  CaracteristicaDaVerbaEnum,
  type IVerbaDeCalculoRef,
} from '../../../index';

function mockVerba(opts: {
  zera?: boolean;
  caracteristica?: CaracteristicaDaVerbaEnum;
  tipoValor?: ValorDaVerbaEnum;
} = {}): IVerbaDeCalculoRef {
  return {
    getTipoValor: () => opts.tipoValor ?? ValorDaVerbaEnum.CALCULADO,
    getZeraValorNegativo: () => opts.zera ?? false,
    getCaracteristica: () => opts.caracteristica ?? CaracteristicaDaVerbaEnum.COMUM,
  };
}

describe('OcorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias (D1 — Java 663-684)', () => {
  it('verba normal (sem férias) → retorna getDiferenca() arredondado a 2 casas', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba({ caracteristica: CaracteristicaDaVerbaEnum.COMUM }));
    oc.setDevido(new Decimal('1000.555')); // 3 casas
    oc.setPago(new Decimal('500.111'));    // diferença 500.444 → arred. HALF_EVEN 500.44

    const r = oc.getDiferencaParaCalculoDasIncidencias();
    expect(r).not.toBeNull();
    // 500.444 com HALF_EVEN a 2 casas = 500.44
    expect(r!.toString()).toBe('500.44');
  });

  it('férias INDENIZADAS → retorna null (Java linha 683)', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba({ caracteristica: CaracteristicaDaVerbaEnum.FERIAS }));
    oc.setDevido(new Decimal('900'));
    oc.setPago(new Decimal('0'));
    oc.setFeriasIndenizadas(true);

    expect(oc.getDiferencaParaCalculoDasIncidencias()).toBeNull();
    expect(oc.getDiferencaCorrigidaParaCalculoDasIncidencias()).toBeNull();
  });

  it('férias com DOBRA → 50% da diferença (Java linha 676)', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba({ caracteristica: CaracteristicaDaVerbaEnum.FERIAS }));
    oc.setDevido(new Decimal('1200'));
    oc.setPago(new Decimal('0'));
    oc.setDobra(true);

    // diferença = 1200 → ×0.5 = 600.00
    const r = oc.getDiferencaParaCalculoDasIncidencias();
    expect(r!.toString()).toBe('600');
  });

  it('férias com ABONO + tipoValor=CALCULADO → divide pelo fator 1.5 (Java linha 679)', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(
      mockVerba({
        caracteristica: CaracteristicaDaVerbaEnum.FERIAS,
        tipoValor: ValorDaVerbaEnum.CALCULADO,
      })
    );
    oc.setDevido(new Decimal('900'));
    oc.setPago(new Decimal('0'));
    oc.setFeriasComAbono(true);
    // sem dataInicialPeriodoAquisitivo/Final → calcularFatorAbono retorna 1.5

    // 900 / 1.5 = 600.00
    const r = oc.getDiferencaParaCalculoDasIncidencias();
    expect(r!.toString()).toBe('600');
  });

  it('devido/pago null → diferença é 0 → retorna 0 (não null)', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba({ caracteristica: CaracteristicaDaVerbaEnum.COMUM }));
    // devido e pago não setados → getDiferenca = 0

    const r = oc.getDiferencaParaCalculoDasIncidencias();
    expect(r).not.toBeNull();
    expect(r!.toString()).toBe('0');
  });

  // ────────────── Casos extras (regressão / branches) ──────────────

  it('variante corrigido=true usa diferenca × indiceAcumulado', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba({ caracteristica: CaracteristicaDaVerbaEnum.COMUM }));
    oc.setDevido(new Decimal('1000'));
    oc.setPago(new Decimal('0'));
    oc.setIndiceAcumulado(new Decimal('1.25'));

    // 1000 × 1.25 = 1250.00
    const r = oc.getDiferencaParaCalculoDasIncidencias(true);
    expect(r!.toString()).toBe('1250');
  });

  it('corrigido=true sem indiceAcumulado → fallback para 0 (não propaga null)', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(mockVerba({ caracteristica: CaracteristicaDaVerbaEnum.COMUM }));
    oc.setDevido(new Decimal('1000'));
    oc.setPago(new Decimal('0'));
    // indiceAcumulado nunca setado → getDiferencaCorrigida() = null

    const r = oc.getDiferencaParaCalculoDasIncidencias(true);
    expect(r).not.toBeNull();
    expect(r!.toString()).toBe('0');
  });

  it('abono com tipoValor=INFORMADO → NÃO aplica retirarAbono (Java linha 678)', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(
      mockVerba({
        caracteristica: CaracteristicaDaVerbaEnum.FERIAS,
        tipoValor: ValorDaVerbaEnum.INFORMADO,
      })
    );
    oc.setDevido(new Decimal('900'));
    oc.setPago(new Decimal('0'));
    oc.setFeriasComAbono(true);

    // tipoValor=INFORMADO → guarda abono integral
    const r = oc.getDiferencaParaCalculoDasIncidencias();
    expect(r!.toString()).toBe('900');
  });

  it('férias com DOBRA + ABONO (CALCULADO) → primeiro ×0.5, depois /1.5', () => {
    const oc = new OcorrenciaDeVerba();
    oc.setVerbaDeCalculo(
      mockVerba({
        caracteristica: CaracteristicaDaVerbaEnum.FERIAS,
        tipoValor: ValorDaVerbaEnum.CALCULADO,
      })
    );
    oc.setDevido(new Decimal('1800'));
    oc.setPago(new Decimal('0'));
    oc.setDobra(true);
    oc.setFeriasComAbono(true);

    // 1800 → ×0.5 = 900 → /1.5 = 600.00
    const r = oc.getDiferencaParaCalculoDasIncidencias();
    expect(r!.toString()).toBe('600');
  });

  it('isCaracteristicaFeriasComDobra: precisa de FERIAS + dobra=true', () => {
    const oc = new OcorrenciaDeVerba();
    // dobra=false → false
    oc.setVerbaDeCalculo(mockVerba({ caracteristica: CaracteristicaDaVerbaEnum.FERIAS }));
    expect(oc.isCaracteristicaFeriasComDobra()).toBe(false);

    // dobra=true mas característica COMUM → false
    oc.setVerbaDeCalculo(mockVerba({ caracteristica: CaracteristicaDaVerbaEnum.COMUM }));
    oc.setDobra(true);
    expect(oc.isCaracteristicaFeriasComDobra()).toBe(false);

    // FERIAS + dobra=true → true
    oc.setVerbaDeCalculo(mockVerba({ caracteristica: CaracteristicaDaVerbaEnum.FERIAS }));
    expect(oc.isCaracteristicaFeriasComDobra()).toBe(true);
  });

  it('mock sem getCaracteristica (interface mínima legada) → trata como COMUM', () => {
    const oc = new OcorrenciaDeVerba();
    // mock minimo SEM getCaracteristica
    const mockMinimo: IVerbaDeCalculoRef = {
      getTipoValor: () => ValorDaVerbaEnum.CALCULADO,
      getZeraValorNegativo: () => false,
    };
    oc.setVerbaDeCalculo(mockMinimo);
    oc.setDevido(new Decimal('500'));
    oc.setPago(new Decimal('100'));
    oc.setDobra(true);
    // sem getCaracteristica → COMUM → não é "férias com dobra" → não multiplica por 0.5

    expect(oc.isCaracteristicaFeriasComDobra()).toBe(false);
    expect(oc.getDiferencaParaCalculoDasIncidencias()!.toString()).toBe('400');
  });
});
