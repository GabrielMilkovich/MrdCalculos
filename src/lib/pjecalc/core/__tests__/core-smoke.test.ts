/**
 * Core smoke test — valida os módulos recém-portados.
 * Não testa paridade completa; apenas que a API funciona.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  // Utils
  nulo, naoNulo, multiplicar, dividir, somar, subtrair,
  arredondarValorMonetario, obterPercentualPara, aplicarCorrecaoMonetaria,
  CEM, OITO_PORCENTO,
  // HelperDate
  HelperDate,
  // Periodo
  Periodo,
  // Enums
  IndiceMonetarioEnum, IndicesAcumuladosEnum, TipoDeJurosEnum,
  TipoDeQuantidadeDeJurosBaseEnum, JurosEnum, BaseDeJurosDasVerbasEnum,
  // CalculadorDeIndices
  calcularIndiceAcumulado, calcularIndiceAcumuladoComSomas,
  // PeriodoDeJuros
  PeriodoDeJuros,
  // Interface
  type IndiceDeCalculo,
} from '../index';

describe('core — Utils', () => {
  it('nulo/naoNulo/naoNulos', () => {
    expect(nulo(null)).toBe(true);
    expect(nulo(undefined)).toBe(true);
    expect(nulo(0)).toBe(false);
    expect(naoNulo('')).toBe(true);
  });
  it('aritmética preserva null', () => {
    expect(multiplicar(null, new Decimal(10))).toBeNull();
    expect(dividir(new Decimal(10), null)).toBeNull();
    expect(somar(new Decimal(2), new Decimal(3))?.toNumber()).toBe(5);
    expect(subtrair(new Decimal(10), new Decimal(3))?.toNumber()).toBe(7);
  });
  it('arredondamento HALF_EVEN', () => {
    expect(arredondarValorMonetario(new Decimal('2.345')).toString()).toBe('2.34');
    expect(arredondarValorMonetario(new Decimal('2.355')).toString()).toBe('2.36');
  });
  it('obterPercentualPara', () => {
    expect(obterPercentualPara(new Decimal(10))?.toNumber()).toBe(0.1);
  });
  it('aplicarCorrecaoMonetaria', () => {
    const r = aplicarCorrecaoMonetaria(new Decimal('1.5'), new Decimal('100'));
    expect(r?.toString()).toBe('150');
  });
  it('constantes', () => {
    expect(CEM.toNumber()).toBe(100);
    expect(OITO_PORCENTO.toNumber()).toBe(0.08);
  });
});

describe('core — HelperDate', () => {
  it('construção e comparações', () => {
    const d1 = HelperDate.getInstance(2024, 0, 15)!; // Jan 15
    const d2 = HelperDate.getInstance(2024, 2, 31)!; // Mar 31
    expect(d1.getYear()).toBe(2024);
    expect(d1.getMonth()).toBe(0);
    expect(d1.getDay()).toBe(15);
    expect(d1.lessThen(d2.getDate())).toBe(true);
    expect(d2.greaterThen(d1.getDate())).toBe(true);
  });
  it('lastDayOfTheMonth', () => {
    const jan = HelperDate.getInstance(2024, 0, 15)!;
    expect(jan.lastDayOfTheMonth().getDay()).toBe(31);
    const feb = HelperDate.getInstance(2024, 1, 10)!; // 2024 leap year
    expect(feb.lastDayOfTheMonth().getDay()).toBe(29);
  });
  it('countMonths', () => {
    const d1 = new Date(2024, 0, 15);
    const d2 = new Date(2025, 0, 31);
    expect(HelperDate.countMonths(d1, d2)).toBe(13);
  });
  it('getCurrentCompetence retorna dia 1', () => {
    const c = HelperDate.getCurrentCompetence(new Date(2024, 5, 20));
    expect(c.getDay()).toBe(1);
    expect(c.getMonth()).toBe(5);
  });
});

describe('core — Periodo', () => {
  it('totalDeDias', () => {
    const p = new Periodo(new Date(2024, 0, 1), new Date(2024, 0, 31));
    expect(p.totalDeDias()).toBe(31);
  });
  it('isPeriodoContemEsta', () => {
    const p = new Periodo(new Date(2024, 0, 1), new Date(2024, 11, 31));
    expect(p.isPeriodoContemEsta(new Date(2024, 5, 15))).toBe(true);
    expect(p.isPeriodoContemEsta(new Date(2023, 5, 15))).toBe(false);
  });
});

describe('core — CalculadorDeIndices (SOMA SIMPLES SELIC)', () => {
  // Mini mock de IndiceDeCalculo para SELIC (taxa em %)
  class MockSelic implements IndiceDeCalculo {
    private acumulado: Decimal | null = null;
    constructor(private taxa: Decimal, private competencia: Date) {}
    getTaxa(): Decimal { return this.taxa; }
    getCompetencia(): Date { return this.competencia; }
    /** SELIC: valorIndice = 1 + taxa/100 */
    getValorIndice(): Decimal { return this.taxa.div(100).plus(1); }
    getValorAcumulado(): Decimal | null { return this.acumulado; }
    setValorAcumulado(v: Decimal): void { this.acumulado = v; }
    clonar(): IndiceDeCalculo { return new MockSelic(this.taxa, this.competencia); }
  }

  it('soma simples: taxas 1.0, 0.8, 1.2 → acumulado final = 1.03 (= 1 + 3%)', () => {
    const lista: IndiceDeCalculo[] = [
      new MockSelic(new Decimal('1.0'), new Date(2024, 0, 1)),
      new MockSelic(new Decimal('0.8'), new Date(2024, 1, 1)),
      new MockSelic(new Decimal('1.2'), new Date(2024, 2, 1)),
    ];
    const out = calcularIndiceAcumuladoComSomas(lista, false);
    // Acumulado final = 1 + (1.0 + 0.8 + 1.2)/100 = 1.03
    expect(out[2].getValorAcumulado()!.toDP(4).toString()).toBe('1.03');
  });

  it('soma simples diverge do produto composto', () => {
    // 12 meses de 1% cada
    const lista: IndiceDeCalculo[] = [];
    for (let m = 0; m < 12; m++) {
      lista.push(new MockSelic(new Decimal('1.0'), new Date(2024, m, 1)));
    }
    const outSoma = calcularIndiceAcumuladoComSomas(lista.map(i => i.clonar()), false);
    const outProduto = calcularIndiceAcumulado(lista);
    // Soma: 1 + 12% = 1.12
    expect(outSoma[11].getValorAcumulado()!.toDP(4).toString()).toBe('1.12');
    // Produto: 1.01^12 ≈ 1.12683
    const prodFinal = outProduto[11].getValorAcumulado()!.toDP(4).toNumber();
    expect(prodFinal).toBeGreaterThan(1.126);
    expect(prodFinal).toBeLessThan(1.128);
  });
});

describe('core — PeriodoDeJuros (meses fracionados)', () => {
  it('período completo 3 meses — FRACAO', () => {
    const p = new PeriodoDeJuros(
      new Date(2024, 0, 1), new Date(2024, 2, 31),
      new Decimal('1'), TipoDeQuantidadeDeJurosBaseEnum.FRACAO,
      TipoDeJurosEnum.SIMPLES, false, JurosEnum.JUROS_UM_PORCENTO
    );
    expect(p.getMeses().toNumber()).toBe(3);
    // taxa = 1% × 3 = 3%
    expect(p.getTaxa().toNumber()).toBe(3);
  });

  it('período começando no meio do mês — FRACAO aplica pro-rata', () => {
    // 2024-01-15 → 2024-03-31
    // Mês Jan: dias 15-31 inclusive = 17 dias; diasNoMes=31; 17<31 → meses -= 1 + 17/31
    // Mês Mar: dia 31 == 31 → sem ajuste
    // countMonths = 3
    // meses = 3 - 1 + 17/31 ≈ 2.5484
    const p = new PeriodoDeJuros(
      new Date(2024, 0, 15), new Date(2024, 2, 31),
      new Decimal('1'), TipoDeQuantidadeDeJurosBaseEnum.FRACAO,
      TipoDeJurosEnum.SIMPLES, false, JurosEnum.JUROS_UM_PORCENTO
    );
    const meses = p.getMeses().toDP(4).toNumber();
    expect(meses).toBeCloseTo(2.5484, 3);
    // taxa = 1% × 2.5484 ≈ 2.5484%
    expect(p.getTaxa().toDP(4).toNumber()).toBeCloseTo(2.5484, 3);
  });

  it('INTEIRO — não aplica fração', () => {
    const p = new PeriodoDeJuros(
      new Date(2024, 0, 15), new Date(2024, 2, 31),
      new Decimal('1'), TipoDeQuantidadeDeJurosBaseEnum.INTEIRO,
      TipoDeJurosEnum.SIMPLES, false, JurosEnum.JUROS_UM_PORCENTO
    );
    // diasRestantes_jan = 17 >= 15 → sem decremento
    // dia_final_mar = 31 >= 15 → sem decremento
    // meses = 3
    expect(p.getMeses().toNumber()).toBe(3);
  });
});

describe('core — Enums sanidade', () => {
  it('valores dos enums críticos', () => {
    expect(IndiceMonetarioEnum.SELIC).toBe('SELIC');
    expect(IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO).toBe('MSV');
    expect(JurosEnum.SELIC).toBe('SEL');
    expect(BaseDeJurosDasVerbasEnum.VERBA_INSS).toBe('VI');
  });
});
