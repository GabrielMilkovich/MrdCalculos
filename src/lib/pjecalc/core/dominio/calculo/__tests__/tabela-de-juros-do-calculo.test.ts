/**
 * Testes para TabelaDeJurosDoCalculo.definirPeriodosDeJuros — separação
 * dos blocos Padrão vs Fazenda Pública na cadeia de PeriodoDeJuros.
 *
 * Ref Java: TabelaDeJurosDoCalculo.java:82-104.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { TabelaDeJurosDoCalculo } from '../tabela-de-juros-do-calculo';
import { PeriodoDeJuros } from '../../../comum/periodo-de-juros';
import {
  JurosEnum,
  TipoDeJurosEnum,
  TipoDeQuantidadeDeJurosBaseEnum,
} from '../../../constantes/enums';
import type { Calculo } from '../calculo';

function periodo(
  dataInicial: Date,
  dataFinal: Date,
  fazendaPublica: boolean,
  tabelaJuros: JurosEnum = fazendaPublica ? JurosEnum.FAZENDA_PUBLICA : JurosEnum.JUROS_UM_PORCENTO,
): PeriodoDeJuros {
  return new PeriodoDeJuros(
    dataInicial,
    dataFinal,
    new Decimal('0.5'),
    TipoDeQuantidadeDeJurosBaseEnum.FRACAO,
    TipoDeJurosEnum.SIMPLES,
    fazendaPublica,
    tabelaJuros,
  );
}

const calculoStub = {} as Calculo;

describe('TabelaDeJurosDoCalculo — definirPeriodosDeJuros', () => {
  it('apenas padrão (sem fazenda) → periodoDeJurosPadrao cobre toda a cadeia, fazenda=null', () => {
    const p1 = periodo(new Date(2020, 0, 1), new Date(2020, 5, 30), false);
    const p2 = periodo(new Date(2020, 6, 1), new Date(2020, 11, 31), false);
    p1.setProximoPeriodo(p2);

    const tjc = new TabelaDeJurosDoCalculo(calculoStub);
    tjc.definirPeriodosDeJuros(p1);

    const padrao = tjc.getPeriodoDeJurosPadrao();
    expect(padrao).not.toBeNull();
    expect(padrao!.getInicial()?.getTime()).toBe(new Date(2020, 0, 1).getTime());
    expect(padrao!.getFinal()?.getTime()).toBe(new Date(2020, 11, 31).getTime());
    expect(tjc.getPeriodoDeJurosFazendaPublica()).toBeNull();
  });

  it('apenas fazenda → periodoDeJurosPadrao=null, fazenda cobre toda a cadeia', () => {
    const p1 = periodo(new Date(2021, 0, 1), new Date(2021, 5, 30), true);
    const p2 = periodo(new Date(2021, 6, 1), new Date(2021, 11, 31), true);
    p1.setProximoPeriodo(p2);

    const tjc = new TabelaDeJurosDoCalculo(calculoStub);
    tjc.definirPeriodosDeJuros(p1);

    expect(tjc.getPeriodoDeJurosPadrao()).toBeNull();
    const fp = tjc.getPeriodoDeJurosFazendaPublica();
    expect(fp).not.toBeNull();
    expect(fp!.getInicial()?.getTime()).toBe(new Date(2021, 0, 1).getTime());
    expect(fp!.getFinal()?.getTime()).toBe(new Date(2021, 11, 31).getTime());
  });

  it('padrão seguido de fazenda → ambos preenchidos com seus respectivos limites', () => {
    // 2 meses padrão + 2 meses fazenda
    const p1 = periodo(new Date(2022, 0, 1), new Date(2022, 0, 31), false);
    const p2 = periodo(new Date(2022, 1, 1), new Date(2022, 1, 28), false);
    const p3 = periodo(new Date(2022, 2, 1), new Date(2022, 2, 31), true);
    const p4 = periodo(new Date(2022, 3, 1), new Date(2022, 3, 30), true);
    p1.setProximoPeriodo(p2);
    p2.setProximoPeriodo(p3);
    p3.setProximoPeriodo(p4);

    const tjc = new TabelaDeJurosDoCalculo(calculoStub);
    tjc.definirPeriodosDeJuros(p1);

    const padrao = tjc.getPeriodoDeJurosPadrao();
    expect(padrao).not.toBeNull();
    expect(padrao!.getInicial()?.getTime()).toBe(new Date(2022, 0, 1).getTime());
    expect(padrao!.getFinal()?.getTime()).toBe(new Date(2022, 1, 28).getTime());

    const fp = tjc.getPeriodoDeJurosFazendaPublica();
    expect(fp).not.toBeNull();
    expect(fp!.getInicial()?.getTime()).toBe(new Date(2022, 2, 1).getTime());
    expect(fp!.getFinal()?.getTime()).toBe(new Date(2022, 3, 30).getTime());
  });

  it('raiz=null → ambos null', () => {
    const tjc = new TabelaDeJurosDoCalculo(calculoStub);
    tjc.definirPeriodosDeJuros(null);
    expect(tjc.getPeriodoDeJurosPadrao()).toBeNull();
    expect(tjc.getPeriodoDeJurosFazendaPublica()).toBeNull();
  });

  it('idempotente: 2 chamadas não duplicam nem alteram resultado', () => {
    const p1 = periodo(new Date(2023, 0, 1), new Date(2023, 5, 30), false);
    const p2 = periodo(new Date(2023, 6, 1), new Date(2023, 11, 31), true);
    p1.setProximoPeriodo(p2);

    const tjc = new TabelaDeJurosDoCalculo(calculoStub);
    tjc.definirPeriodosDeJuros(p1);
    const primeiroFinalPadrao = tjc.getPeriodoDeJurosPadrao()?.getFinal()?.getTime();
    const primeiroFinalFP = tjc.getPeriodoDeJurosFazendaPublica()?.getFinal()?.getTime();

    // Segunda chamada com cadeia diferente — não deve sobrescrever (idempotente).
    const pAlt = periodo(new Date(2099, 0, 1), new Date(2099, 11, 31), false);
    tjc.definirPeriodosDeJuros(pAlt);
    expect(tjc.getPeriodoDeJurosPadrao()?.getFinal()?.getTime()).toBe(primeiroFinalPadrao);
    expect(tjc.getPeriodoDeJurosFazendaPublica()?.getFinal()?.getTime()).toBe(primeiroFinalFP);
  });
});
