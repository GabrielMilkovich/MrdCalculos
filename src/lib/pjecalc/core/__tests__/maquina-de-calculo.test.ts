/**
 * Testes de MaquinaDeCalculo — núcleo do motor PJe-Calc.
 *
 * Cobre a fórmula oficial:
 *   devido = round₂ᴴᴱ( base ÷ divisor × multiplicador × quantidade × dobra )
 *
 * Arredondamento:
 *  - HALF_EVEN (banker's rounding) somente no final, via `arredondarValorMonetario`
 *  - Operações intermediárias em MathContext(38) — sem truncamento
 *
 * Referência: MaquinaDeCalculo.java linhas 320-350 (PJe-Calc v2.15.1).
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { OcorrenciaDeVerba } from '../dominio/ocorrenciaverba/ocorrencia-de-verba';
import { calcularValorDevidoDaOcorrencia } from '../dominio/verbacalculo/maquina-de-calculo';
import { ValorDaVerbaEnum, IndiceMonetarioEnum, IndicesAcumuladosEnum } from '../constantes/enums';
import { aplicarCorrecaoMonetaria, arredondarValorMonetario } from '../base/comum/utils';

// ────────────── Helper: factory de OcorrenciaDeVerba pronta para teste ──────────────

interface FixtureOpts {
  base: string | number;
  divisor: string | number;
  multiplicador: string | number;
  quantidade: string | number;
  dobra?: boolean;
  baseIntegral?: string | number;
  quantidadeIntegral?: string | number;
}

function criarOcorrencia(opts: FixtureOpts): OcorrenciaDeVerba {
  const oc = new OcorrenciaDeVerba();
  oc.setValor(ValorDaVerbaEnum.CALCULADO);
  oc.setBase(new Decimal(opts.base));
  oc.setDivisor(new Decimal(opts.divisor));
  oc.setMultiplicador(new Decimal(opts.multiplicador));
  oc.setQuantidade(new Decimal(opts.quantidade));
  oc.setDobra(opts.dobra ?? false);
  if (opts.baseIntegral !== undefined) oc.setBaseIntegral(new Decimal(opts.baseIntegral));
  if (opts.quantidadeIntegral !== undefined) oc.setQuantidadeIntegral(new Decimal(opts.quantidadeIntegral));
  return oc;
}

// =====================================================================
// Suite 1 — Fórmula oficial: casos básicos
// =====================================================================

describe('MaquinaDeCalculo — calcularValorDevidoDaOcorrencia', () => {
  it('1. fórmula básica: base=1000, div=220, mult=44, qtd=1, dobra=1 → 200,00', () => {
    // 1000 / 220 × 44 × 1 = 200 (fechado)
    const oc = criarOcorrencia({ base: 1000, divisor: 220, multiplicador: 44, quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc);
    expect(oc.getDevido()!.toFixed(2)).toBe('200.00');
  });

  it('2. com Dobra=2: mesma fórmula → 400,00', () => {
    const oc = criarOcorrencia({
      base: 1000, divisor: 220, multiplicador: 44, quantidade: 1, dobra: true,
    });
    calcularValorDevidoDaOcorrencia(oc);
    expect(oc.getDevido()!.toFixed(2)).toBe('400.00');
  });

  it('3. quantidade fracional: base=1000, div=30, mult=1, qtd=0.5', () => {
    // 1000/30 × 0.5 = 16.6666666... → 16.67 (HALF_EVEN)
    const oc = criarOcorrencia({ base: 1000, divisor: 30, multiplicador: 1, quantidade: '0.5' });
    calcularValorDevidoDaOcorrencia(oc);
    expect(oc.getDevido()!.toFixed(2)).toBe('16.67');
  });

  it('4. valor baixo: base=100, div=220, mult=1, qtd=1 → 0,45 (HALF_EVEN)', () => {
    // 100/220 = 0.454545... → 0.45 (quinto dígito é 4, arredonda pra baixo)
    const oc = criarOcorrencia({ base: 100, divisor: 220, multiplicador: 1, quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc);
    expect(oc.getDevido()!.toFixed(2)).toBe('0.45');
  });

  it('HALF_EVEN (banker\'s rounding) quando empate em .xx5', () => {
    // 1.005 → 1.00 (HALF_EVEN: segundo dígito par, mantém)
    // 1.015 → 1.02 (HALF_EVEN: 2 é par)
    const oc1 = criarOcorrencia({ base: '1.005', divisor: 1, multiplicador: 1, quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc1);
    expect(oc1.getDevido()!.toFixed(2)).toBe('1.00');

    const oc2 = criarOcorrencia({ base: '1.015', divisor: 1, multiplicador: 1, quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc2);
    expect(oc2.getDevido()!.toFixed(2)).toBe('1.02');
  });

  it('valor INFORMADO não recalcula (early-exit na linha 321 do Java)', () => {
    const oc = criarOcorrencia({ base: 1000, divisor: 220, multiplicador: 44, quantidade: 1 });
    oc.setValor(ValorDaVerbaEnum.INFORMADO);
    // Pre-setar devido para garantir que NÃO foi sobrescrito
    oc.setDevido(new Decimal('123.45'));
    calcularValorDevidoDaOcorrencia(oc);
    expect(oc.getDevido()!.toFixed(2)).toBe('123.45');
  });

  it('devidoIntegral usa baseIntegral quando diferente da base', () => {
    // Base proporcional 500 (15/30 dias), baseIntegral = 1000 (mês cheio)
    const oc = criarOcorrencia({
      base: 500, divisor: 1, multiplicador: 1, quantidade: 1, baseIntegral: 1000,
    });
    calcularValorDevidoDaOcorrencia(oc);
    expect(oc.getDevido()!.toFixed(2)).toBe('500.00');
    expect(oc.getDevidoIntegral()!.toFixed(2)).toBe('1000.00');
  });

  it('devidoIntegral usa quantidadeIntegral se definida e diferente', () => {
    // Verba calculada com qtd proporcional 0.5 avos, qtdIntegral = 1 avo
    const oc = criarOcorrencia({
      base: 1200, divisor: 12, multiplicador: 1, quantidade: '0.5', quantidadeIntegral: 1,
    });
    calcularValorDevidoDaOcorrencia(oc);
    // base/div×mult×qtd = 1200/12×1×0.5 = 50
    expect(oc.getDevido()!.toFixed(2)).toBe('50.00');
    // baseIntegral = base, qtdIntegral=1 → 1200/12 = 100
    expect(oc.getDevidoIntegral()!.toFixed(2)).toBe('100.00');
  });
});

// =====================================================================
// Suite 2 — Correção monetária + juros + pagamentos
// =====================================================================

describe('MaquinaDeCalculo — correção, juros, pago', () => {
  it('5. correção monetária: devido × índice acumulado (HALF_EVEN)', () => {
    // devido = 200,00 (resultado do teste 1)
    const oc = criarOcorrencia({ base: 1000, divisor: 220, multiplicador: 44, quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc);

    // Aplica índice acumulado 1.25 (ex: correção de 25%)
    const indice = new Decimal('1.25');
    const corrigido = aplicarCorrecaoMonetaria(indice, oc.getDevido());
    expect(corrigido!.toFixed(2)).toBe('250.00');
  });

  it('6. juros SELIC simples: devido × taxa-acumulada → 238,00 (por ex. 19% SELIC)', () => {
    const oc = criarOcorrencia({ base: 1000, divisor: 220, multiplicador: 44, quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc);

    // SELIC-acumulada simples ex: 19% → 1.19
    const devido = oc.getDevido()!;
    const taxaAcumulada = new Decimal('1.19');
    const comJuros = arredondarValorMonetario(devido.times(taxaAcumulada));
    expect(comJuros.toFixed(2)).toBe('238.00');
  });

  it('7. ocorrência de pagamento: devido - pago → diferença', () => {
    // Devido 200, pago 150 → diferença 50
    const oc = criarOcorrencia({ base: 1000, divisor: 220, multiplicador: 44, quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc);
    oc.setPago(new Decimal('150.00'));

    const diferenca = oc.getDiferenca();
    expect(diferenca.toFixed(2)).toBe('50.00');
  });

  it('pagamento maior que devido com zeraValorNegativo=true → 0', () => {
    const oc = criarOcorrencia({ base: 1000, divisor: 220, multiplicador: 44, quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc);
    oc.setPago(new Decimal('500.00'));
    // Simula verba.zeraValorNegativo=true via stub mínimo
    oc.setVerbaDeCalculo({
      getTipoValor: () => ValorDaVerbaEnum.CALCULADO,
      getZeraValorNegativo: () => true,
    });
    const diferenca = oc.getDiferenca();
    expect(diferenca.toFixed(2)).toBe('0.00');
  });
});

// =====================================================================
// Suite 3 — Cenários compostos (truncamento cumulativo, HALF_EVEN bordas)
// =====================================================================

describe('MaquinaDeCalculo — cenários compostos', () => {
  it('8. fim-de-mês (truncamento cumulativo em múltiplas operações)', () => {
    // Simula uma sequência típica PJe-Calc:
    //   1) calcula devido (fórmula)
    //   2) arredonda 2 casas  (já dentro de calcularValorDevidoDaOcorrencia)
    //   3) aplica correção monetária → arredonda 2 casas
    //   4) aplica juros → arredonda 2 casas
    // Verificamos que cada arredondamento é HALF_EVEN e NÃO acumula erros.
    const oc = criarOcorrencia({ base: '1234.56', divisor: 220, multiplicador: '33.3', quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc);
    // 1234.56/220 × 33.3 = 186.82... (precisão 38)
    // = 5.6116363636... × 33.3 = 186.8675...
    // HALF_EVEN a 2 casas → 186.87
    expect(oc.getDevido()!.toFixed(2)).toBe('186.87');

    // Correção de 12,34%
    const corrigido = aplicarCorrecaoMonetaria(new Decimal('1.1234'), oc.getDevido());
    // 186.87 × 1.1234 = 209.931958... → 209.93 (HALF_EVEN)
    expect(corrigido!.toFixed(2)).toBe('209.93');

    // Juros 8% sobre o corrigido
    const comJuros = arredondarValorMonetario(corrigido!.times(new Decimal('1.08')));
    // 209.93 × 1.08 = 226.7244 → 226.72 (HALF_EVEN)
    expect(comJuros.toFixed(2)).toBe('226.72');
  });

  it('caso de borda: base=0 → devido 0', () => {
    const oc = criarOcorrencia({ base: 0, divisor: 220, multiplicador: 44, quantidade: 1 });
    calcularValorDevidoDaOcorrencia(oc);
    expect(oc.getDevido()!.toFixed(2)).toBe('0.00');
  });

  it('caso de borda: dobra em valor fracional (aplicação após round final)', () => {
    // 100/3 = 33.33333... → 33.33 (HALF_EVEN)
    // Dobra no Java é multiplicação EM 38 dígitos antes do round final,
    // então: (100/3) × 2 = 66.66666... → 66.67
    const oc = criarOcorrencia({
      base: 100, divisor: 3, multiplicador: 1, quantidade: 1, dobra: true,
    });
    calcularValorDevidoDaOcorrencia(oc);
    expect(oc.getDevido()!.toFixed(2)).toBe('66.67');
  });

  it('consistência: dois devidos com base integral equivalente coincidem', () => {
    const ocA = criarOcorrencia({ base: 1000, divisor: 1, multiplicador: 1, quantidade: 1 });
    const ocB = criarOcorrencia({
      base: 500, baseIntegral: 1000, divisor: 1, multiplicador: 1, quantidade: 1,
    });
    calcularValorDevidoDaOcorrencia(ocA);
    calcularValorDevidoDaOcorrencia(ocB);
    // Devido de A reflete base integral; Devido integral de B também.
    expect(ocA.getDevido()!.toFixed(2)).toBe('1000.00');
    expect(ocB.getDevidoIntegral()!.toFixed(2)).toBe('1000.00');
    expect(ocB.getDevido()!.toFixed(2)).toBe('500.00');
  });
});

// =====================================================================
// Meta: garante que os enums/constantes usados existem
// =====================================================================

describe('MaquinaDeCalculo — smoke das dependências', () => {
  it('ValorDaVerbaEnum disponível', () => {
    expect(ValorDaVerbaEnum.CALCULADO).toBe('C');
    expect(ValorDaVerbaEnum.INFORMADO).toBe('I');
  });
  it('IndiceMonetarioEnum e IndicesAcumuladosEnum disponíveis', () => {
    expect(IndiceMonetarioEnum.SELIC).toBe('SELIC');
    expect(IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO).toBe('MSV');
  });
});
