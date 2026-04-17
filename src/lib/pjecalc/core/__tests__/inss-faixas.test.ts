/**
 * Testes das faixas do INSS progressivo.
 * Usa valores da Portaria MPS/MF 6/2025.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  FaixaPrevidenciaria,
  PrimeiraFaixaPrevidenciaria,
  SegundaFaixaPrevidenciaria,
  TerceiraFaixaPrevidenciaria,
  QuartaFaixaPrevidenciaria,
  calcularInssProgressivo,
} from '../index';

// Tabela INSS 2025 (Portaria MPS/MF 6/2025)
function faixas2025(): FaixaPrevidenciaria[] {
  return [
    new PrimeiraFaixaPrevidenciaria(new Decimal('0.01'), new Decimal('1518.00'), new Decimal('7.5')),
    new SegundaFaixaPrevidenciaria(new Decimal('1518.01'), new Decimal('2793.88'), new Decimal('9')),
    new TerceiraFaixaPrevidenciaria(new Decimal('2793.89'), new Decimal('4190.83'), new Decimal('12')),
    new QuartaFaixaPrevidenciaria(new Decimal('4190.84'), new Decimal('8157.41'), new Decimal('14')),
  ];
}

describe('FaixaPrevidenciaria — cálculo individual', () => {
  it('calcularValorNaFaixa retorna 0 se base < valorInicial', () => {
    const f = new PrimeiraFaixaPrevidenciaria(new Decimal('1000'), new Decimal('2000'), new Decimal('10'));
    expect(f.calcularValorNaFaixa(new Decimal('500'))!.toNumber()).toBe(0);
  });

  it('1ª faixa 2025 com salário R$ 1.000 → 7,5% × 1000 = 75', () => {
    const f = new PrimeiraFaixaPrevidenciaria(
      new Decimal('0.01'), new Decimal('1518.00'), new Decimal('7.5')
    );
    // base=1000 → (1000 - 0.01 + 0.01) × 0.075 = 1000 × 0.075 = 75
    const v = f.calcularValorNaFaixa(new Decimal('1000'));
    expect(v!.toDP(2).toNumber()).toBe(75);
  });

  it('getDiscriminador retorna número da faixa', () => {
    expect(new PrimeiraFaixaPrevidenciaria().getDiscriminador()).toBe('1');
    expect(new SegundaFaixaPrevidenciaria().getDiscriminador()).toBe('2');
    expect(new TerceiraFaixaPrevidenciaria().getDiscriminador()).toBe('3');
    expect(new QuartaFaixaPrevidenciaria().getDiscriminador()).toBe('4');
  });

  it('adicionarNovoValorInicial = faixaAnterior.valorFinal + 0.01', () => {
    const f1 = new PrimeiraFaixaPrevidenciaria(new Decimal('0.01'), new Decimal('1518.00'), new Decimal('7.5'));
    const f2 = new SegundaFaixaPrevidenciaria();
    f2.adicionarNovoValorInicial(f1);
    expect(f2.getValorInicial()!.toString()).toBe('1518.01');
  });
});

describe('calcularInssProgressivo — tabela 2025', () => {
  const fx = faixas2025();

  it('salário R$ 1.000 — só 1ª faixa (7,5%)', () => {
    // (1000 - 0.01 + 0.01) × 0.075 = 75
    const inss = calcularInssProgressivo(new Decimal('1000'), fx);
    expect(inss.toDP(2).toNumber()).toBe(75);
  });

  it('salário R$ 2.000 — 1ª faixa integral + parte da 2ª', () => {
    // 1ª: 1518.00 × 0.075 = 113.85
    // 2ª: (2000 - 1518.01 + 0.01) × 0.09 = 482 × 0.09 = 43.38
    // total = 157.23
    const inss = calcularInssProgressivo(new Decimal('2000'), fx);
    expect(inss.toDP(2).toNumber()).toBeCloseTo(157.23, 2);
  });

  it('salário no teto R$ 8.157,41 — todas 4 faixas', () => {
    // 1ª: 1518.00 × 0.075 = 113.85
    // 2ª: 1275.88 × 0.09 = 114.8292
    // 3ª: 1396.95 × 0.12 = 167.634
    // 4ª: 3966.58 × 0.14 = 555.3212
    // total ≈ 951.63
    const inss = calcularInssProgressivo(new Decimal('8157.41'), fx);
    expect(inss.toDP(2).toNumber()).toBeCloseTo(951.63, 1);
  });

  it('salário acima do teto — capped no teto', () => {
    const inssTeto = calcularInssProgressivo(new Decimal('8157.41'), fx);
    const inssAcima = calcularInssProgressivo(new Decimal('15000'), fx);
    // A partir do teto, não contribui mais (última faixa tem valorFinal=8157.41)
    expect(inssAcima.toDP(2).toNumber()).toBeCloseTo(inssTeto.toDP(2).toNumber(), 2);
  });
});
