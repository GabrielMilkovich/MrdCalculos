import { describe, it, expect } from 'vitest';
import { parseFaltas } from '../../parsers/faltas';

const JOSELI_CTPS_EXCERPT = `
  DADOS DE EMPREGADO
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Matrícula......:1788485                                        Admissão.........:02/06/2011                       Vínculo........:Trabalhador CLT
  Afastamento....:Demissão                                       Data Desligamento:13/03/2020                       Data Desligamento com Projeção Aviso Prévio:06/05/2020

  AFASTAMENTOS
  ¯¯¯¯¯¯¯¯¯¯¯¯¯
  Data Afastamento Situação do Afastamento              Retorno
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯
  13/03/2020        Demissão


  AFASTAMENTOS OUTROS
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Data Afastamento Situação do Afastamento              Retorno
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯
  11/05/2013        Atestado Médico                     12/05/2013
  12/05/2013        Atestado Médico                     13/05/2013
  13/05/2013        Atestado Médico                     14/05/2013
  16/06/2014        Atestado Médico                     17/06/2014
  10/07/2014        Atestado Médico                     11/07/2014
  14/01/2015        Atestado Médico                     15/01/2015
  15/01/2015        Atestado Médico                     16/01/2015
  23/01/2015        Atestado Médico                     24/01/2015
  13/08/2015        Atestado Médico                     14/08/2015
  19/08/2015        Atestado Médico                     20/08/2015
  17/09/2015        Atestado Médico                     18/09/2015
  30/09/2015        Atestado Médico                     01/10/2015
  10/02/2016        Atestado Médico                     11/02/2016
  11/02/2016        Atestado Médico                     12/02/2016
  07/11/2018        Atestado Médico                     08/11/2018
  19/12/2018        Atestado Médico                     20/12/2018
  02/03/2020        Atestado Médico                     03/03/2020

  HISTÓRICO DE FÉRIAS
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Período Aquisitivo          Período de Gozo           Dias de Gozo Abono Observações
  02/06/2011 a 01/06/2012     02/07/2012 a 31/07/2012          30    0
  02/06/2012 a 01/06/2013     01/07/2013 a 30/07/2013          30    0
`;

const IZABELA_CTPS_EXCERPT = `
  DADOS DE EMPREGADO
  Matrícula......:4805879                                        Admissão.........:12/11/2020

  HISTÓRICO DE LOTAÇÃO
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  12/11/2020 1581 - VIA VAREJO S/A - SHOP JD DAS A                  33.041.260/1106-95               0003-000 - LOJA EQ

  AFASTAMENTOS OUTROS
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Data Afastamento Situação do Afastamento              Retorno
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯
  27/05/2021        Atestado Médico                     28/05/2021
`;

const ROQUE_CTPS_EXCERPT = `
  DADOS DE EMPREGADO
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Matrícula......:278823                                         Admissão.........:24/11/2003
  Afastamento....:Demissão                                       Data Desligamento:09/03/2021                       Data Desligamento com Projeção Aviso Prévio:26/05/2021

  AFASTAMENTOS
  ¯¯¯¯¯¯¯¯¯¯¯¯¯
  Data Afastamento Situação do Afastamento              Retorno
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯
  24/04/2020        Suspensão Contrato de Trabalho       24/05/2020
  24/05/2020        Suspensão Contrato de Trabalho       23/06/2020
  06/10/2020        Suspensão Contrato de Trabalho       05/11/2020
  09/03/2021        Demissão

  AFASTAMENTOS OUTROS
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Data Afastamento Situação do Afastamento              Retorno
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯
  13/03/2009        Atestado Médico                     27/03/2009
  19/01/2011        Auxilio Doença                      29/03/2011
  15/03/2012        Atestado Médico                     16/03/2012
  07/05/2012        Auxilio Doença                      12/06/2012
  03/05/2013        Atestado Médico                     17/05/2013
  15/01/2014        Atestado Médico                     16/01/2014
  15/07/2014        Atestado Médico                     16/07/2014
  29/07/2014        Atestado Médico                     30/07/2014
  31/07/2014        Atestado Médico                     03/08/2014
  13/08/2014        Atestado Médico                     14/08/2014
  12/09/2018        Atestado Médico                     13/09/2018
  28/09/2019        Atestado Médico                     29/09/2019
`;

describe('parseFaltas — paridade contra CTPS reais', () => {
  describe('JOSELI (CTPS.pdf)', () => {
    const { faltas, warnings } = parseFaltas(JOSELI_CTPS_EXCERPT);

    it('detecta EXATAMENTE 17 faltas (não pega Demissão da seção AFASTAMENTOS principal)', () => {
      expect(faltas).toHaveLength(17);
    });

    it('NÃO extrai a data 13/03/2020 (que é Demissão e Data Desligamento)', () => {
      const tem130320 = faltas.some(f => f.data_inicio === '2020-03-13');
      expect(tem130320).toBe(false);
    });

    it('todas as 17 faltas são atestados médicos', () => {
      const naoAtestados = faltas.filter(f => f.tipo_afastamento !== 'atestado');
      expect(naoAtestados).toHaveLength(0);
    });

    it('justificativa NÃO contém data de retorno embutida', () => {
      for (const f of faltas) {
        expect(f.justificativa).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
      }
    });

    it('primeira falta: 11/05/2013 → 12/05/2013 (1 dia)', () => {
      expect(faltas[0].data_inicio).toBe('2013-05-11');
      expect(faltas[0].data_fim).toBe('2013-05-12');
    });
  });

  describe('IZABELA ADP (CTPS_ate_2021.pdf)', () => {
    const { faltas } = parseFaltas(IZABELA_CTPS_EXCERPT);

    it('detecta EXATAMENTE 1 falta', () => {
      expect(faltas).toHaveLength(1);
    });

    it('a falta é o atestado 27/05/2021 → 28/05/2021', () => {
      expect(faltas[0].data_inicio).toBe('2021-05-27');
      expect(faltas[0].data_fim).toBe('2021-05-28');
      expect(faltas[0].tipo_afastamento).toBe('atestado');
    });

    it('NÃO confunde data 12/11/2020 (admissão/lotação) com falta', () => {
      const tem121120 = faltas.some(f => f.data_inicio === '2020-11-12');
      expect(tem121120).toBe(false);
    });
  });

  describe('ROQUE GUERREIRO (CTPS com Suspensão COVID)', () => {
    const { faltas } = parseFaltas(ROQUE_CTPS_EXCERPT);

    it('detecta 3 Suspensões + 12 atestados = 15 faltas (sem incluir Demissão)', () => {
      expect(faltas).toHaveLength(15);
    });

    it('3 suspensões da pandemia entram como falta tipo "suspensao"', () => {
      const suspensoes = faltas.filter(f => f.tipo_afastamento === 'suspensao');
      expect(suspensoes).toHaveLength(3);
    });

    it('NÃO extrai 09/03/2021 (data da Demissão)', () => {
      const tem09032021 = faltas.some(f => f.data_inicio === '2021-03-09');
      expect(tem09032021).toBe(false);
    });

    it('extrai 2 entradas de Auxilio Doença com tipo "aux_doenca"', () => {
      const auxDoenca = faltas.filter(f => f.tipo_afastamento === 'aux_doenca');
      expect(auxDoenca).toHaveLength(2);
    });

    it('primeira Suspensão: 24/04/2020 → 24/05/2020', () => {
      const susp = faltas.find(f =>
        f.tipo_afastamento === 'suspensao' && f.data_inicio === '2020-04-24'
      );
      expect(susp).toBeDefined();
      expect(susp?.data_fim).toBe('2020-05-24');
    });
  });
});
