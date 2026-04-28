/**
 * Testes para MaquinaDeCalculoDeCartaoDePonto.somarTotais — agregação
 * dos totais do período a partir das ApuracaoDiariaCartao já calculadas.
 *
 * Ref Java: padrão `Utils.somar(acumulado, parcelaDoDia)` espalhado em
 * MaquinaDeCalculoDeCartaoDePonto.java (ex.: linhas 287-393, 921, 1012).
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { MaquinaDeCalculoDeCartaoDePonto } from '../maquina-de-calculo-de-cartao-de-ponto';
import { ApuracaoDiariaCartao } from '../apuracao-diaria-cartao';

function diaCom(opts: Partial<{
  trabalhadas: number;
  extrasBloco1: number;
  extrasDemais: number;
  extrasDescanso: number;
  extrasFeriado: number;
  extrasSabadoDomingo: number;
  noturnas: number;
  supIntraIntegral: number;
  supIntraReforma: number;
  supArt253: number;
  excessoIntra: number;
}>): ApuracaoDiariaCartao {
  const adc = new ApuracaoDiariaCartao();
  if (opts.trabalhadas !== undefined) adc.setHorasTrabalhadas(new Decimal(opts.trabalhadas));
  if (opts.extrasBloco1 !== undefined) adc.setHorasExtrasPrimeiroBloco(new Decimal(opts.extrasBloco1));
  if (opts.extrasDemais !== undefined) adc.setHorasExtrasDemais(new Decimal(opts.extrasDemais));
  if (opts.extrasDescanso !== undefined) adc.setHorasExtrasDescanso(new Decimal(opts.extrasDescanso));
  if (opts.extrasFeriado !== undefined) adc.setHorasExtrasFeriado(new Decimal(opts.extrasFeriado));
  if (opts.extrasSabadoDomingo !== undefined) adc.setHorasExtrasSabadoDomingo(new Decimal(opts.extrasSabadoDomingo));
  if (opts.noturnas !== undefined) adc.setHorasNoturnas(new Decimal(opts.noturnas));
  if (opts.supIntraIntegral !== undefined) adc.setSupressaoIntraIntegral(new Decimal(opts.supIntraIntegral));
  if (opts.supIntraReforma !== undefined) adc.setSupressaoIntraReforma(new Decimal(opts.supIntraReforma));
  if (opts.supArt253 !== undefined) adc.setSupressaoArt253(new Decimal(opts.supArt253));
  if (opts.excessoIntra !== undefined) adc.setExcessoIntervaloIntra(new Decimal(opts.excessoIntra));
  return adc;
}

describe('MaquinaDeCalculoDeCartaoDePonto — somarTotais', () => {
  it('lista vazia → todos os totais zero', () => {
    const m = new MaquinaDeCalculoDeCartaoDePonto();
    m.setApuracoesDiarias([]);
    m.somarTotais();
    expect(m.getTotalHorasTrabalhadas().toNumber()).toBe(0);
    expect(m.getTotalHorasExtras().toNumber()).toBe(0);
    expect(m.getTotalHorasNoturnas().toNumber()).toBe(0);
    expect(m.getTotalSupressaoIntrajornada().toNumber()).toBe(0);
    expect(m.getTotalSupressaoArt253().toNumber()).toBe(0);
  });

  it('soma horas trabalhadas e noturnas em 3 dias', () => {
    const m = new MaquinaDeCalculoDeCartaoDePonto();
    m.setApuracoesDiarias([
      diaCom({ trabalhadas: 8, noturnas: 2 }),
      diaCom({ trabalhadas: 7.5, noturnas: 1.5 }),
      diaCom({ trabalhadas: 9, noturnas: 0 }),
    ]);
    m.somarTotais();
    expect(m.getTotalHorasTrabalhadas().toNumber()).toBe(24.5);
    expect(m.getTotalHorasNoturnas().toNumber()).toBe(3.5);
  });

  it('soma todas as faixas de horas extras (5 categorias)', () => {
    const m = new MaquinaDeCalculoDeCartaoDePonto();
    m.setApuracoesDiarias([
      diaCom({
        extrasBloco1: 2,
        extrasDemais: 1,
        extrasDescanso: 0.5,
        extrasFeriado: 0.25,
        extrasSabadoDomingo: 0.25,
      }),
      diaCom({
        extrasBloco1: 1,
        extrasDemais: 0,
        extrasDescanso: 0,
        extrasFeriado: 0,
        extrasSabadoDomingo: 0,
      }),
    ]);
    m.somarTotais();
    // Dia 1: 2 + 1 + 0.5 + 0.25 + 0.25 = 4. Dia 2: 1. Total = 5.
    expect(m.getTotalHorasExtras().toNumber()).toBe(5);
  });

  it('soma supressão intrajornada das 3 fontes (integral + reforma + excesso)', () => {
    const m = new MaquinaDeCalculoDeCartaoDePonto();
    m.setApuracoesDiarias([
      diaCom({ supIntraIntegral: 0.5, supIntraReforma: 0.25, excessoIntra: 0.1 }),
      diaCom({ supIntraIntegral: 0.5, supIntraReforma: 0, excessoIntra: 0 }),
    ]);
    m.somarTotais();
    expect(m.getTotalSupressaoIntrajornada().toNumber()).toBeCloseTo(1.35, 10);
  });

  it('soma supressão Art. 253 separadamente', () => {
    const m = new MaquinaDeCalculoDeCartaoDePonto();
    m.setApuracoesDiarias([
      diaCom({ supArt253: 0.2 }),
      diaCom({ supArt253: 0.3 }),
      diaCom({ supArt253: 0 }),
    ]);
    m.somarTotais();
    expect(m.getTotalSupressaoArt253().toNumber()).toBeCloseTo(0.5, 10);
  });
});
