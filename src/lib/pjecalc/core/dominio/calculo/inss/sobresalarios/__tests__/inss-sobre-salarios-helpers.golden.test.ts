/**
 * InssSobreSalarios — getDataParaRestricao{SalarioDevido,SalarioPago} (Fase 5)
 * InssSobreSalariosDevidos — sugerirDataTerminoCalculo (Fase 5)
 *
 * Fidelidade 1-a-1 com InssSobreSalarios.java:166-216 +
 * InssSobreSalariosDevidos.java:240-250.
 */
import { describe, it, expect } from 'vitest';

import { InssSobreSalariosDevidos } from '../inss-sobre-salarios-devidos';
import { Inss } from '../../inss';
import { Calculo } from '../../../calculo';

function setupCalculo(opts: {
  admissao: Date;
  demissao?: Date | null;
  terminoCalculo?: Date | null;
  inicioCalculo?: Date | null;
  prescrQuinq?: boolean;
  dataAjuizamento?: Date | null;
}): Inss {
  const c = new Calculo();
  c.setDataAdmissao(opts.admissao);
  c.setDataDemissao(opts.demissao ?? null);
  c.setDataTerminoCalculo(opts.terminoCalculo ?? null);
  c.setDataInicioCalculo(opts.inicioCalculo ?? null);
  c.setPrescricaoQuinquenal(opts.prescrQuinq ?? false);
  if (opts.dataAjuizamento) c.setDataAjuizamento(opts.dataAjuizamento);

  const inss = new Inss();
  inss.setCalculo(c);
  return inss;
}

describe('InssSobreSalariosDevidos.getDataParaRestricaoSalarioDevido (via base)', () => {
  it('caso base: só admissão e demissão', () => {
    const inss = setupCalculo({
      admissao: new Date('2020-01-01'),
      demissao: new Date('2023-12-31'),
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    const p = iss.getDataParaRestricaoSalarioDevido();
    expect(p.getInicial()).toEqual(new Date('2020-01-01'));
    expect(p.getLabelDataIncial()).toBe('Data de Admissão');
    expect(p.getFinal()).toEqual(new Date('2023-12-31'));
    expect(p.getLabelDataFinal()).toBe('Data de Demissão');
  });

  it('dataInicioCalculo > admissão: usa dataInicioCalculo', () => {
    const inss = setupCalculo({
      admissao: new Date('2015-01-01'),
      inicioCalculo: new Date('2018-06-01'),
      demissao: new Date('2023-12-31'),
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    const p = iss.getDataParaRestricaoSalarioDevido();
    expect(p.getInicial()).toEqual(new Date('2018-06-01'));
    expect(p.getLabelDataIncial()).toBe('Data Início do Cálculo');
  });

  it('prescrição quinquenal sobrepõe: prefere data de prescrição', () => {
    // Com dataAjuizamento 2024-01-01 e prescrQuinq=true, data de prescrição =
    // 2019-01-01 (ajuizamento − 5 anos), que é posterior à admissão (2012).
    const inss = setupCalculo({
      admissao: new Date('2012-01-01'),
      demissao: new Date('2024-06-01'),
      terminoCalculo: new Date('2024-06-01'),
      prescrQuinq: true,
      dataAjuizamento: new Date('2024-01-01'),
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    const p = iss.getDataParaRestricaoSalarioDevido();
    // Prescrição = 2024-01-01 − 5 anos = 2019-01-01
    expect(p.getInicial()).toEqual(new Date('2019-01-01'));
    expect(p.getLabelDataIncial()).toBe('Data Prescrição Quinquenal');
  });

  it('dataTerminoCalculo > demissão: prefere dataTerminoCalculo', () => {
    const inss = setupCalculo({
      admissao: new Date('2020-01-01'),
      demissao: new Date('2023-01-31'),
      terminoCalculo: new Date('2024-06-30'),
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    const p = iss.getDataParaRestricaoSalarioDevido();
    expect(p.getFinal()).toEqual(new Date('2024-06-30'));
    expect(p.getLabelDataFinal()).toBe('Data Fim do Cálculo');
  });

  it('sem calculo: retorna Periodo vazio', () => {
    const iss = new InssSobreSalariosDevidos();
    const p = iss.getDataParaRestricaoSalarioDevido();
    expect(p.getInicial()).toBeNull();
    expect(p.getFinal()).toBeNull();
  });
});

describe('InssSobreSalariosDevidos.getDataParaRestricaoSalarioPago (via base)', () => {
  it('com demissão: Admissão → Demissão', () => {
    const inss = setupCalculo({
      admissao: new Date('2020-01-01'),
      demissao: new Date('2023-12-31'),
      terminoCalculo: new Date('2024-06-30'),
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    const p = iss.getDataParaRestricaoSalarioPago();
    expect(p.getInicial()).toEqual(new Date('2020-01-01'));
    expect(p.getLabelDataIncial()).toBe('Data de Admissão');
    expect(p.getFinal()).toEqual(new Date('2023-12-31'));
    expect(p.getLabelDataFinal()).toBe('Data de Demissão');
  });

  it('sem demissão: Admissão → DataTérminoCalculo', () => {
    const inss = setupCalculo({
      admissao: new Date('2020-01-01'),
      demissao: null,
      terminoCalculo: new Date('2024-06-30'),
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    const p = iss.getDataParaRestricaoSalarioPago();
    expect(p.getInicial()).toEqual(new Date('2020-01-01'));
    expect(p.getFinal()).toEqual(new Date('2024-06-30'));
    expect(p.getLabelDataFinal()).toBe('Data Fim do Cálculo');
  });
});

describe('InssSobreSalariosDevidos.sugerirDataTerminoCalculo', () => {
  it('terminoCalculo ≥ demissão: usa terminoCalculo', () => {
    const inss = setupCalculo({
      admissao: new Date('2020-01-01'),
      demissao: new Date('2023-01-31'),
      terminoCalculo: new Date('2024-06-30'),
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    iss.sugerirDataTerminoCalculo();
    expect(iss.getDataTerminoPeriodo()).toEqual(new Date('2024-06-30'));
  });

  it('sem terminoCalculo: usa demissão', () => {
    const inss = setupCalculo({
      admissao: new Date('2020-01-01'),
      demissao: new Date('2023-01-31'),
      terminoCalculo: null,
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    iss.sugerirDataTerminoCalculo();
    expect(iss.getDataTerminoPeriodo()).toEqual(new Date('2023-01-31'));
  });

  it('preserva dataInicioPeriodo (diferente de sugerirDatas)', () => {
    const inss = setupCalculo({
      admissao: new Date('2020-01-01'),
      demissao: new Date('2023-01-31'),
      terminoCalculo: new Date('2024-06-30'),
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    iss.setDataInicioPeriodo(new Date('2021-05-15'));
    iss.sugerirDataTerminoCalculo();
    // Início intacto
    expect(iss.getDataInicioPeriodo()).toEqual(new Date('2021-05-15'));
    expect(iss.getDataTerminoPeriodo()).toEqual(new Date('2024-06-30'));
  });

  it('sem demissão e sem terminoCalculo: no-op', () => {
    const inss = setupCalculo({
      admissao: new Date('2020-01-01'),
      demissao: null,
      terminoCalculo: null,
    });
    const iss = new InssSobreSalariosDevidos(inss);
    iss.setInss(inss);
    iss.sugerirDataTerminoCalculo();
    expect(iss.getDataTerminoPeriodo()).toBeNull();
  });
});
