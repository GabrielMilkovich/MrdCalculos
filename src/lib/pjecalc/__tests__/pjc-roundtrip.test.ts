/**
 * PJC Roundtrip Golden Test
 *
 * Golden reference values extracted from the real PJe-Calc .pjc file:
 *   src/data/caso-real.pjc (PJe-Calc v2.13.2)
 *
 * Case: MARIA MADALENA ALVES FERREIRA vs GRUPO CASAS BAHIA S.A.
 * Processo: 1001211-76.2025.5.02.0461
 *
 * Parameters:
 *   Admissao: 2015-03-07
 *   Demissao: 2021-03-02
 *   Ajuizamento: 2021-04-16
 *   Inicio Calculo: 2016-04-16
 *   Termino Calculo: 2021-03-02
 *   Liquidacao: 2025-10-31
 *   Carga Horaria: 220
 *   Sabado Dia Util: true
 *   Projeta Aviso: true
 *   Zera Negativo: false
 *   Regime: INTEGRAL
 *   Indices: MES_SUBSEQUENTE_AO_VENCIMENTO
 *   Dia Fechamento: 31
 *   Versao PJe-Calc: 2.13.2
 *
 * Verbas (principal): Comissoes Estornadas, Premio Estimulo, Vendas a Prazo,
 *   Horas Extras, Domingos e Feriados, Artigo 384 CLT, Intervalo Interjornadas,
 *   Repouso Semanal Remunerado (Comissionista)
 * Reflexos: 13o Salario, Aviso Previo, Ferias + 1/3, Multa 477
 *
 * PJe-Calc resultado (from <gprec> and <dadosEstruturados>):
 *   Liquido Exequente (principal): R$ 46,426.51
 *   INSS Reclamante (gprec):       R$  2,113.35
 *   INSS Reclamante (dados):        R$  3,299.38
 *   INSS Reclamado (gprec):         R$ 10,337.54
 *   INSS Reclamado (dados):         R$  9,151.51
 *   Imposto de Renda:               R$      0.00
 *   FGTS Deposito:                  R$      0.00
 *   Custas:                         R$      0.00
 *   Honorarios: MARCOS ROBERTO DIAS R$  4,853.99
 *
 * NOTE: The analyzePJC function requires DOMParser (browser API).
 * These tests use hardcoded golden values extracted from the XML.
 * A full roundtrip test (parse -> engine -> compare) would require
 * a JSDOM environment or running in the browser.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PJC Golden Reference — caso-real.pjc', () => {
  // Golden values from PJe-Calc resultado
  const GOLDEN = {
    liquido_exequente: 46426.51,
    inss_reclamante_gprec: 2113.35,
    inss_reclamante_dados: 3299.38,
    inss_reclamado_gprec: 10337.54,
    inss_reclamado_dados: 9151.51,
    imposto_renda: 0.00,
    fgts_deposito: 0,
    custas: 0,
    honorarios_valor: 4853.99,
    honorarios_nome: 'MARCOS ROBERTO DIAS',
    valor_principal: 46426.51,
  };

  const PARAMS = {
    admissao: '2015-03-07',
    demissao: '2021-03-02',
    ajuizamento: '2021-04-16',
    inicio_calculo: '2016-04-16',
    termino_calculo: '2021-03-02',
    liquidacao: '2025-10-31',
    carga_horaria: 220,
    sabado_dia_util: true,
    projeta_aviso: true,
    zera_negativo: false,
    regime: 'INTEGRAL',
    indices_acumulados: 'MES_SUBSEQUENTE_AO_VENCIMENTO',
    dia_fechamento: 31,
    versao: '2.13.2',
    beneficiario: 'MARIA MADALENA ALVES FERREIRA',
    cpf: '342.523.118-96',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    cnpj: '33.041.260/0001-64',
  };

  it('pjc file exists and is valid XML', () => {
    const pjcPath = resolve(__dirname, '../../../data/caso-real.pjc');
    const content = readFileSync(pjcPath, 'latin1');
    expect(content).toBeTruthy();
    expect(content.startsWith('<?xml')).toBe(true);
    expect(content).toContain('<Calculo>');
    expect(content).toContain('</Calculo>');
  });

  it('pjc file contains expected beneficiario', () => {
    const pjcPath = resolve(__dirname, '../../../data/caso-real.pjc');
    const content = readFileSync(pjcPath, 'latin1');
    expect(content).toContain('MARIA MADALENA ALVES FERREIRA');
  });

  it('pjc file contains expected reclamado', () => {
    const pjcPath = resolve(__dirname, '../../../data/caso-real.pjc');
    const content = readFileSync(pjcPath, 'latin1');
    expect(content).toContain('GRUPO CASAS BAHIA S.A.');
  });

  it('golden resultado values are internally consistent', () => {
    // valorPrincipal == liquidoExequente in this case (no deductions from principal)
    expect(GOLDEN.valor_principal).toBe(GOLDEN.liquido_exequente);
    // IR is zero (low income case)
    expect(GOLDEN.imposto_renda).toBe(0);
    // FGTS deposit is zero (pagar_reclamante mode)
    expect(GOLDEN.fgts_deposito).toBe(0);
  });

  it('golden INSS values are positive (reclamante pays contribution)', () => {
    expect(GOLDEN.inss_reclamante_gprec).toBeGreaterThan(0);
    expect(GOLDEN.inss_reclamado_gprec).toBeGreaterThan(0);
    // Reclamado INSS > Reclamante (empresa pays more)
    expect(GOLDEN.inss_reclamado_gprec).toBeGreaterThan(GOLDEN.inss_reclamante_gprec);
  });

  it('pjc contains key verbas for the case', () => {
    const pjcPath = resolve(__dirname, '../../../data/caso-real.pjc');
    const content = readFileSync(pjcPath, 'latin1');

    // Principal verbas (XML-encoded)
    const expectedVerbas = [
      'HORAS EXTRAS',
      'DOMINGOS E FERIADOS',
      'INTERVALO INTERJORNADAS',
    ];
    for (const verba of expectedVerbas) {
      expect(content).toContain(verba);
    }
  });

  it('pjc contains reflexos (13o, aviso previo, ferias)', () => {
    const pjcPath = resolve(__dirname, '../../../data/caso-real.pjc');
    const content = readFileSync(pjcPath, 'latin1');

    // These appear as XML-encoded names in the file
    expect(content).toContain('HORAS EXTRAS');
    // 13o Salario reflexos
    expect(content).toContain('13');
    // Aviso Previo reflexos
    expect(content).toContain('AVISO');
    // Ferias reflexos
    expect(content).toContain('RIAS');
  });

  it('case parameters match expected employment period', () => {
    const admDate = new Date(PARAMS.admissao);
    const demDate = new Date(PARAMS.demissao);
    const diffYears = (demDate.getTime() - admDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    // ~6 years of employment
    expect(diffYears).toBeGreaterThan(5.5);
    expect(diffYears).toBeLessThan(6.5);
  });

  it('aviso previo proportional days for ~6 year employment', () => {
    const admDate = new Date(PARAMS.admissao);
    const demDate = new Date(PARAMS.demissao);
    const anosServico = Math.floor((demDate.getTime() - admDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    // 5 full years => 30 + 5*3 = 45 days (Lei 12.506/2011)
    const dias = Math.min(90, 30 + anosServico * 3);
    expect(anosServico).toBe(5);
    expect(dias).toBe(45);
  });

  it('honorarios value is consistent with principal at ~10.5%', () => {
    const pct = (GOLDEN.honorarios_valor / GOLDEN.liquido_exequente) * 100;
    // Honorarios are about 10.5% of principal
    expect(pct).toBeGreaterThan(8);
    expect(pct).toBeLessThan(15);
  });

  it('pjc file contains ApuracaoDeJuros section for correction data', () => {
    const pjcPath = resolve(__dirname, '../../../data/caso-real.pjc');
    const content = readFileSync(pjcPath, 'latin1');
    // The PJC contains juros/correction consolidation data
    expect(content).toContain('ApuracaoDeJuros');
  });

  it('calculation period matches prescricao quinquenal from ajuizamento', () => {
    // inicio_calculo = 2016-04-16, ajuizamento = 2021-04-16
    // Exactly 5 years before ajuizamento (prescricao quinquenal)
    const inicio = new Date(PARAMS.inicio_calculo);
    const ajuiz = new Date(PARAMS.ajuizamento);
    const diffYears = (ajuiz.getTime() - inicio.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    expect(Math.round(diffYears)).toBe(5);
  });
});
