/**
 * Calculo — predicates + períodos (Fase 8)
 *
 * Fidelidade 1-a-1 com Calculo.java v2.15.1.
 *
 * Cobre os métodos novos portados na Fase 8:
 *   - isPrazoAvisoCalculado / isPrazoAvisoInfo (L1263-1269)
 *   - isLiquidado (L2561-2563)
 *   - existeDataDeDemissao (L2731-2733)
 *   - isRelatorioAtualizacao / setRelatorioAtualizacao (L2503-2509)
 *   - getDataPrescricaoQuinquenal (L2626-2629)
 *   - getDataPrescricaoFgts (L2631-2640) — regras STF ARE 709.212
 *   - isDataDemissaoAnteriorADataPrescricaoQuinquenal (L2855-2860)
 *   - isDataTerminoCalculoAnteriorADemissao (L2862-2866)
 *   - obterPeriodoDoCalculo (L2595-2620)
 *   - obterPeriodoSugestivoDoCalculo (L2622-2668)
 */
import { describe, it, expect } from 'vitest';

import { Calculo } from '../calculo';
import { TipoDeApuracaoPrazoDoAvisoPrevioEnum } from '../../../constantes/enums';

function makeCalculo(opts: {
  admissao?: Date;
  demissao?: Date | null;
  inicioCalculo?: Date | null;
  terminoCalculo?: Date | null;
  ajuizamento?: Date;
  prescricaoQuinquenal?: boolean;
} = {}): Calculo {
  const c = new Calculo();
  if (opts.admissao) c.setDataAdmissao(opts.admissao);
  if (opts.demissao !== undefined) c.setDataDemissao(opts.demissao);
  if (opts.inicioCalculo !== undefined) c.setDataInicioCalculo(opts.inicioCalculo);
  if (opts.terminoCalculo !== undefined) c.setDataTerminoCalculo(opts.terminoCalculo);
  if (opts.ajuizamento) c.setDataAjuizamento(opts.ajuizamento);
  if (opts.prescricaoQuinquenal !== undefined) c.setPrescricaoQuinquenal(opts.prescricaoQuinquenal);
  return c;
}

// ───────────────────────────────────────────────────────────────
//  Predicados triviais
// ───────────────────────────────────────────────────────────────

describe('Calculo.isPrazoAvisoCalculado / isPrazoAvisoInfo', () => {
  it('default CALCULADA: isCalculado=true, isInfo=false', () => {
    const c = new Calculo();
    c.setApuracaoPrazoDoAvisoPrevio(TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_CALCULADA);
    expect(c.isPrazoAvisoCalculado()).toBe(true);
    expect(c.isPrazoAvisoInfo()).toBe(false);
  });
  it('INFORMADA: inverte', () => {
    const c = new Calculo();
    c.setApuracaoPrazoDoAvisoPrevio(TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_INFORMADA);
    expect(c.isPrazoAvisoCalculado()).toBe(false);
    expect(c.isPrazoAvisoInfo()).toBe(true);
  });
});

describe('Calculo.isLiquidado', () => {
  it('sem dataDeLiquidacao: false', () => {
    const c = new Calculo();
    expect(c.isLiquidado()).toBe(false);
  });
  it('com dataDeLiquidacao: true', () => {
    const c = new Calculo();
    c.setDataDeLiquidacao(new Date('2024-06-30'));
    expect(c.isLiquidado()).toBe(true);
  });
});

describe('Calculo.existeDataDeDemissao', () => {
  it('sem demissão: false', () => {
    expect(new Calculo().existeDataDeDemissao()).toBe(false);
  });
  it('com demissão: true', () => {
    const c = makeCalculo({ demissao: new Date('2023-12-31') });
    expect(c.existeDataDeDemissao()).toBe(true);
  });
});

describe('Calculo.isRelatorioAtualizacao', () => {
  it('default false', () => {
    expect(new Calculo().isRelatorioAtualizacao()).toBe(false);
  });
  it('setter/getter', () => {
    const c = new Calculo();
    c.setRelatorioAtualizacao(true);
    expect(c.isRelatorioAtualizacao()).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────
//  Datas de prescrição
// ───────────────────────────────────────────────────────────────

describe('Calculo.getDataPrescricaoQuinquenal', () => {
  it('sem ajuizamento: null', () => {
    expect(new Calculo().getDataPrescricaoQuinquenal()).toBeNull();
  });
  it('ajuizamento 2024-01-15 → prescrição 2019-01-15', () => {
    const c = makeCalculo({ ajuizamento: new Date(Date.UTC(2024, 0, 15)) });
    const p = c.getDataPrescricaoQuinquenal()!;
    expect(p.getUTCFullYear()).toBe(2019);
    expect(p.getUTCMonth()).toBe(0);
    expect(p.getUTCDate()).toBe(15);
  });
});

describe('Calculo.getDataPrescricaoFgts — regras STF ARE 709.212', () => {
  it('ajuizamento antes de 13/11/2014: trintenária (30 anos)', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2010, 0, 1)),
      ajuizamento: new Date(Date.UTC(2013, 5, 1)),
    });
    const p = c.getDataPrescricaoFgts()!;
    // 2013-06 − 30 anos = 1983-06
    expect(p.getUTCFullYear()).toBe(1983);
  });

  it('regime transição: ajuiz 2016 + adm após 13/11/1989 → quinquenal', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2010, 0, 1)),
      ajuizamento: new Date(Date.UTC(2016, 5, 1)),
    });
    const p = c.getDataPrescricaoFgts()!;
    // 2016-06 − 5 anos = 2011-06
    expect(p.getUTCFullYear()).toBe(2011);
  });

  it('regime transição: ajuiz 2016 + adm antes de 13/11/1989 → trintenária', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(1985, 0, 1)),
      ajuizamento: new Date(Date.UTC(2016, 5, 1)),
    });
    const p = c.getDataPrescricaoFgts()!;
    // admissão anterior a 13/11/1989 → trintenária
    // 2016-06 − 30 anos = 1986-06
    expect(p.getUTCFullYear()).toBe(1986);
  });

  it('ajuiz a partir de 13/11/2019: quinquenal universal', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(1985, 0, 1)), // mesmo anterior a 13/11/1989
      ajuizamento: new Date(Date.UTC(2020, 5, 1)),
    });
    const p = c.getDataPrescricaoFgts()!;
    // 2020-06 − 5 anos = 2015-06
    expect(p.getUTCFullYear()).toBe(2015);
  });

  it('sem ajuizamento: null', () => {
    expect(new Calculo().getDataPrescricaoFgts()).toBeNull();
  });

  it('borda: ajuiz exatamente 13/11/2014 → regime transição (≥)', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2010, 0, 1)),
      ajuizamento: new Date(Date.UTC(2014, 10, 13)),
    });
    const p = c.getDataPrescricaoFgts()!;
    // 2014-11-13 − 5 anos = 2009-11-13
    expect(p.getUTCFullYear()).toBe(2009);
  });

  it('borda: ajuiz em 12/11/2014 (dia anterior) → trintenária', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2010, 0, 1)),
      ajuizamento: new Date(Date.UTC(2014, 10, 12)),
    });
    const p = c.getDataPrescricaoFgts()!;
    expect(p.getUTCFullYear()).toBe(1984);
  });
});

// ───────────────────────────────────────────────────────────────
//  Predicados de data (demissão vs prescrição, término vs demissão)
// ───────────────────────────────────────────────────────────────

describe('Calculo.isDataDemissaoAnteriorADataPrescricaoQuinquenal', () => {
  it('sem demissão: false', () => {
    expect(new Calculo().isDataDemissaoAnteriorADataPrescricaoQuinquenal()).toBe(false);
  });
  it('prescrição desligada: false', () => {
    const c = makeCalculo({
      demissao: new Date(Date.UTC(2015, 0, 1)),
      ajuizamento: new Date(Date.UTC(2024, 0, 1)),
      prescricaoQuinquenal: false,
    });
    expect(c.isDataDemissaoAnteriorADataPrescricaoQuinquenal()).toBe(false);
  });
  it('demissão < prescrição: true (todas verbas prescritas)', () => {
    const c = makeCalculo({
      demissao: new Date(Date.UTC(2015, 0, 1)),
      ajuizamento: new Date(Date.UTC(2024, 0, 1)),
      prescricaoQuinquenal: true,
    });
    // prescrição = 2019-01-01, demissão = 2015-01-01 → anterior → true
    expect(c.isDataDemissaoAnteriorADataPrescricaoQuinquenal()).toBe(true);
  });
  it('demissão > prescrição: false', () => {
    const c = makeCalculo({
      demissao: new Date(Date.UTC(2020, 0, 1)),
      ajuizamento: new Date(Date.UTC(2024, 0, 1)),
      prescricaoQuinquenal: true,
    });
    expect(c.isDataDemissaoAnteriorADataPrescricaoQuinquenal()).toBe(false);
  });
});

describe('Calculo.isDataTerminoCalculoAnteriorADemissao', () => {
  it('sem demissão: false', () => {
    const c = makeCalculo({ terminoCalculo: new Date('2024-06-30') });
    expect(c.isDataTerminoCalculoAnteriorADemissao()).toBe(false);
  });
  it('sem término: false', () => {
    const c = makeCalculo({ demissao: new Date('2024-06-30') });
    expect(c.isDataTerminoCalculoAnteriorADemissao()).toBe(false);
  });
  it('término < demissão: true (cálculo intermediário)', () => {
    const c = makeCalculo({
      demissao: new Date('2024-06-30'),
      terminoCalculo: new Date('2024-03-31'),
    });
    expect(c.isDataTerminoCalculoAnteriorADemissao()).toBe(true);
  });
  it('término >= demissão: false', () => {
    const c = makeCalculo({
      demissao: new Date('2024-03-31'),
      terminoCalculo: new Date('2024-06-30'),
    });
    expect(c.isDataTerminoCalculoAnteriorADemissao()).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────
//  obterPeriodoDoCalculo
// ───────────────────────────────────────────────────────────────

describe('Calculo.obterPeriodoDoCalculo', () => {
  it('caso base: admissão → demissão', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2020, 0, 1)),
      demissao: new Date(Date.UTC(2023, 11, 31)),
    });
    const p = c.obterPeriodoDoCalculo();
    expect(p.getInicial()).toEqual(new Date(Date.UTC(2020, 0, 1)));
    expect(p.getFinal()).toEqual(new Date(Date.UTC(2023, 11, 31)));
  });

  it('inicialCalculo > admissão: usa inicialCalculo', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2015, 0, 1)),
      inicioCalculo: new Date(Date.UTC(2020, 0, 1)),
      demissao: new Date(Date.UTC(2023, 11, 31)),
    });
    const p = c.obterPeriodoDoCalculo();
    expect(p.getInicial()).toEqual(new Date(Date.UTC(2020, 0, 1)));
  });

  it('inicialCalculo < admissão: usa admissão', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2020, 0, 1)),
      inicioCalculo: new Date(Date.UTC(2018, 0, 1)),
      demissao: new Date(Date.UTC(2023, 11, 31)),
    });
    const p = c.obterPeriodoDoCalculo();
    expect(p.getInicial()).toEqual(new Date(Date.UTC(2020, 0, 1)));
  });

  it('termino < demissão: usa término', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2020, 0, 1)),
      demissao: new Date(Date.UTC(2024, 5, 30)),
      terminoCalculo: new Date(Date.UTC(2024, 0, 31)),
    });
    const p = c.obterPeriodoDoCalculo();
    expect(p.getFinal()).toEqual(new Date(Date.UTC(2024, 0, 31)));
  });

  it('só admissão e término: usa ambos', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2020, 0, 1)),
      terminoCalculo: new Date(Date.UTC(2024, 5, 30)),
    });
    const p = c.obterPeriodoDoCalculo();
    expect(p.getInicial()).toEqual(new Date(Date.UTC(2020, 0, 1)));
    expect(p.getFinal()).toEqual(new Date(Date.UTC(2024, 5, 30)));
  });
});

// ───────────────────────────────────────────────────────────────
//  obterPeriodoSugestivoDoCalculo
// ───────────────────────────────────────────────────────────────

describe('Calculo.obterPeriodoSugestivoDoCalculo', () => {
  it('default flags=false: preferência por inicioCalculo com label', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2015, 0, 1)),
      inicioCalculo: new Date(Date.UTC(2020, 0, 1)),
      demissao: new Date(Date.UTC(2023, 11, 31)),
    });
    const p = c.obterPeriodoSugestivoDoCalculo();
    expect(p.getInicial()).toEqual(new Date(Date.UTC(2020, 0, 1)));
    expect(p.getLabelDataIncial()).toBe('Data Início do Cálculo');
    expect(p.getFinal()).toEqual(new Date(Date.UTC(2023, 11, 31)));
    expect(p.getLabelDataFinal()).toBe('Data de Demissão');
  });

  it('verificarPeriodoParaFgts=true: usa admissão, não inicioCalculo', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2015, 0, 1)),
      inicioCalculo: new Date(Date.UTC(2020, 0, 1)),
      demissao: new Date(Date.UTC(2023, 11, 31)),
    });
    const p = c.obterPeriodoSugestivoDoCalculo(false, true);
    expect(p.getInicial()).toEqual(new Date(Date.UTC(2015, 0, 1)));
    expect(p.getLabelDataIncial()).toBe('Data de Admissão');
  });

  it('verificarPrescricaoQuinquenal + data prescr > inicial: substitui', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2005, 0, 1)),
      ajuizamento: new Date(Date.UTC(2024, 0, 1)),
      prescricaoQuinquenal: true,
      demissao: new Date(Date.UTC(2023, 11, 31)),
    });
    const p = c.obterPeriodoSugestivoDoCalculo(true, true);
    // admissão 2005 → prescrição 2019 > admissão → troca
    expect(p.getInicial()).toEqual(new Date(Date.UTC(2019, 0, 1)));
    expect(p.getLabelDataIncial()).toBe('Data de Prescrição Quinquenal');
  });

  it('sem demissão + com término: label "Data Fim do Cálculo"', () => {
    const c = makeCalculo({
      admissao: new Date(Date.UTC(2020, 0, 1)),
      terminoCalculo: new Date(Date.UTC(2024, 5, 30)),
    });
    const p = c.obterPeriodoSugestivoDoCalculo();
    expect(p.getFinal()).toEqual(new Date(Date.UTC(2024, 5, 30)));
    expect(p.getLabelDataFinal()).toBe('Data Fim do Cálculo');
  });
});
