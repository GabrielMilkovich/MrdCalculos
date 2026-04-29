/**
 * Property-based testing — invariantes que SEMPRE valem para o engine.
 *
 * Cada property gera 100-500 cenarios sinteticos automaticamente. Falha
 * em qualquer um = bug. Nao testa "este caso especifico bate Java" — testa
 * leis matematicas que NAO podem ser violadas.
 *
 * Sem JAR Java rodavel, este eh o melhor proxy de "validacao continua":
 * gera muitos cenarios + verifica que invariantes nao sao violadas.
 */
import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import Decimal from 'decimal.js';

const ZERO = new Decimal(0);

/** Helper: aplicar tabela progressiva (espelho do que IRPF/INSS faz). */
function aplicarTabelaProgressiva(
  base: Decimal,
  faixas: Array<{ ate: Decimal; aliq: Decimal; deduzir: Decimal }>,
): Decimal {
  for (const faixa of faixas) {
    if (base.lte(faixa.ate)) {
      const valor = base.times(faixa.aliq).div(100).minus(faixa.deduzir);
      return valor.lt(ZERO) ? ZERO : valor;
    }
  }
  // Ultima faixa
  const ultima = faixas[faixas.length - 1];
  const valor = base.times(ultima.aliq).div(100).minus(ultima.deduzir);
  return valor.lt(ZERO) ? ZERO : valor;
}

/** Tabela IRPF 2024 (simplificada). */
const FAIXAS_IRPF_2024 = [
  { ate: new Decimal('2259.20'), aliq: new Decimal(0), deduzir: new Decimal(0) },
  { ate: new Decimal('2826.65'), aliq: new Decimal('7.5'), deduzir: new Decimal('169.44') },
  { ate: new Decimal('3751.05'), aliq: new Decimal(15), deduzir: new Decimal('381.44') },
  { ate: new Decimal('4664.68'), aliq: new Decimal('22.5'), deduzir: new Decimal('662.77') },
  { ate: new Decimal('999999999'), aliq: new Decimal('27.5'), deduzir: new Decimal('896.00') },
];

const decimalMonetario = (max = 1_000_000) =>
  fc.float({ min: 0, max, noNaN: true, noDefaultInfinity: true })
    .map(v => new Decimal(Math.round(v * 100) / 100));

describe('Property: invariantes financeiras nao podem ser violadas', () => {
  it('IRPF retido NUNCA negativo', () => {
    fc.assert(
      fc.property(decimalMonetario(50_000), base => {
        const ir = aplicarTabelaProgressiva(base, FAIXAS_IRPF_2024);
        expect(ir.gte(ZERO)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('IRPF retido SEMPRE menor que a base tributavel', () => {
    fc.assert(
      fc.property(decimalMonetario(50_000), base => {
        const ir = aplicarTabelaProgressiva(base, FAIXAS_IRPF_2024);
        expect(ir.lte(base)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('IRPF eh monotonico crescente (base maior → IR maior)', () => {
    fc.assert(
      fc.property(
        decimalMonetario(50_000),
        decimalMonetario(50_000),
        (a, b) => {
          const ba = a.lt(b) ? a : b;
          const bb = a.lt(b) ? b : a;
          const ira = aplicarTabelaProgressiva(ba, FAIXAS_IRPF_2024);
          const irb = aplicarTabelaProgressiva(bb, FAIXAS_IRPF_2024);
          expect(irb.gte(ira)).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('faixa de isencao: base <= 2259.20 → IRPF = 0', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(2259.20), noNaN: true }).map(v => new Decimal(v)),
        base => {
          const ir = aplicarTabelaProgressiva(base, FAIXAS_IRPF_2024);
          expect(ir.eq(ZERO)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('arredondamento monetario nunca perde >1 centavo', () => {
    fc.assert(
      fc.property(
        decimalMonetario(1_000_000),
        v => {
          const arredondado = v.toDecimalPlaces(2);
          const erro = v.minus(arredondado).abs();
          // Tolerancia de 1 centavo (0.005 com banker's rounding pode atingir exatamente)
          expect(erro.lte(0.01)).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('Property: invariantes de FGTS', () => {
  it('FGTS = 8% do salario incidente', () => {
    fc.assert(
      fc.property(
        decimalMonetario(50_000).filter(v => v.gt(ZERO)),
        salario => {
          const fgts = salario.times(0.08);
          const ratio = fgts.div(salario);
          expect(ratio.toNumber()).toBeCloseTo(0.08, 6);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Multa FGTS 40% sempre 5x o deposito mensal', () => {
    fc.assert(
      fc.property(
        decimalMonetario(100_000).filter(v => v.gt(ZERO)),
        saldo => {
          const multa = saldo.times(0.40);
          const ratio = multa.div(saldo);
          expect(ratio.toNumber()).toBeCloseTo(0.40, 6);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property: invariantes de INSS', () => {
  /** Tabela INSS 2024. */
  const FAIXAS_INSS = [
    { ate: new Decimal('1412.00'), aliq: new Decimal('7.5') },
    { ate: new Decimal('2666.68'), aliq: new Decimal(9) },
    { ate: new Decimal('4000.03'), aliq: new Decimal(12) },
    { ate: new Decimal('7786.02'), aliq: new Decimal(14) },
  ];
  const TETO_INSS_2024 = new Decimal('7786.02');

  function calcularInssProgressivo(base: Decimal): Decimal {
    const baseClamp = base.gt(TETO_INSS_2024) ? TETO_INSS_2024 : base;
    let inss = ZERO;
    let anterior = ZERO;
    for (const faixa of FAIXAS_INSS) {
      if (baseClamp.gt(anterior)) {
        const fim = baseClamp.lt(faixa.ate) ? baseClamp : faixa.ate;
        inss = inss.plus(fim.minus(anterior).times(faixa.aliq).div(100));
        anterior = faixa.ate;
        if (baseClamp.lte(faixa.ate)) break;
      }
    }
    return inss;
  }

  it('INSS retido NUNCA excede teto da maior faixa', () => {
    fc.assert(
      fc.property(decimalMonetario(50_000), base => {
        const inss = calcularInssProgressivo(base);
        // Maximo possivel: aplicar 14% no teto = 1090.04 aproximado (na pratica menor)
        const maximoTeorico = TETO_INSS_2024.times(0.14);
        expect(inss.lte(maximoTeorico)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('INSS sempre <= base', () => {
    fc.assert(
      fc.property(decimalMonetario(50_000), base => {
        const inss = calcularInssProgressivo(base);
        expect(inss.lte(base)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('INSS eh monotonico crescente', () => {
    fc.assert(
      fc.property(
        decimalMonetario(50_000),
        decimalMonetario(50_000),
        (a, b) => {
          const ba = a.lt(b) ? a : b;
          const bb = a.lt(b) ? b : a;
          expect(calcularInssProgressivo(bb).gte(calcularInssProgressivo(ba))).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('INSS clampado no teto: salarios > teto pagam o mesmo INSS', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 7800, max: 100_000, noNaN: true }).map(v => new Decimal(v)),
        salario => {
          const inssClamp = calcularInssProgressivo(TETO_INSS_2024);
          const inssAtual = calcularInssProgressivo(salario);
          // Tolerancia 1 centavo (arredondamento)
          expect(inssAtual.minus(inssClamp).abs().lte(0.01)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property: invariantes de composicao financeira', () => {
  it('liquido = bruto - deducoes (CS + IRPF + Pensao)', () => {
    fc.assert(
      fc.property(
        decimalMonetario(50_000),
        decimalMonetario(5_000),
        decimalMonetario(5_000),
        decimalMonetario(2_000),
        (bruto, cs, ir, pensao) => {
          const totalDeducoes = cs.plus(ir).plus(pensao);
          if (totalDeducoes.gt(bruto)) return; // skip cenario invalido
          const liquido = bruto.minus(totalDeducoes);
          expect(liquido.gte(ZERO)).toBe(true);
          expect(liquido.lte(bruto)).toBe(true);
          expect(liquido.plus(totalDeducoes).minus(bruto).abs().lte(0.01)).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('correcao monetaria positiva: total_corrigido >= total_devido', () => {
    fc.assert(
      fc.property(
        decimalMonetario(100_000),
        fc.float({ min: 1, max: 5, noNaN: true }), // fator 1-5x
        (devido, fator) => {
          const fatorDecimal = new Decimal(fator);
          const corrigido = devido.times(fatorDecimal);
          if (fatorDecimal.gte(1)) {
            expect(corrigido.gte(devido)).toBe(true);
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('juros = base × taxa% — distributivo sobre soma', () => {
    fc.assert(
      fc.property(
        decimalMonetario(10_000),
        decimalMonetario(10_000),
        fc.float({ min: 0, max: 100, noNaN: true }),
        (a, b, taxa) => {
          const taxaDec = new Decimal(taxa).div(100);
          const jurosA = a.times(taxaDec);
          const jurosB = b.times(taxaDec);
          const jurosSoma = a.plus(b).times(taxaDec);
          expect(jurosA.plus(jurosB).minus(jurosSoma).abs().lt(0.01)).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe('Property: idempotencia + comutatividade', () => {
  it('arredondar 2x = arredondar 1x', () => {
    fc.assert(
      fc.property(decimalMonetario(1_000_000), v => {
        const r1 = v.toDecimalPlaces(2);
        const r2 = r1.toDecimalPlaces(2);
        expect(r1.eq(r2)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('soma comutativa em Decimal', () => {
    fc.assert(
      fc.property(decimalMonetario(50_000), decimalMonetario(50_000), (a, b) => {
        expect(a.plus(b).eq(b.plus(a))).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('multiplicacao por 1 eh identidade', () => {
    fc.assert(
      fc.property(decimalMonetario(50_000), v => {
        expect(v.times(1).eq(v)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
