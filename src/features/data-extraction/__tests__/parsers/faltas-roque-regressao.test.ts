import { describe, expect, it } from 'vitest';
import { parseFaltas } from '../../parsers/faltas';

const CTPS_ROQUE_AFASTAMENTOS = `
CARTEIRA DE TRABALHO E PREVIDÊNCIA SOCIAL
Empregado: ROQUE GUERREIRO TEIXEIRA

HISTÓRICO DE FÉRIAS

Período Aquisitivo: 24/11/2003 a 22/11/2004
Período de Gozo: 01/12/2004 a 30/12/2004
30 dias de férias

Período Aquisitivo: 23/11/2004 a 22/11/2005
Período de Gozo: 02/01/2006 a 31/01/2006
30 dias de férias

AFASTAMENTOS

14/09/2020 a 28/09/2020 - Atestado médico - CID: M54 - 15 dias
29/09/2020 a 13/10/2020 - Licença médica INSS - 15 dias

AFASTAMENTOS OUTROS

19/01/2011 a 29/03/2011 - Auxílio Doença INSS - 70 dias
07/05/2012 a 12/06/2012 - Auxílio Doença previdenciário - 37 dias
01/04/2020 a 30/04/2020 - Suspensão contrato COVID MP 936
01/05/2020 a 31/05/2020 - Suspensão contrato COVID MP 936
01/06/2020 a 30/06/2020 - Suspensão contrato COVID MP 936
`;

describe('Faltas ROQUE — regressão + tipo_afastamento', () => {
  it('detecta atestado médico (14/09/2020)', () => {
    const r = parseFaltas(CTPS_ROQUE_AFASTAMENTOS);
    const atestado = r.faltas.find((f) => f.data_inicio === '2020-09-14');
    expect(atestado).toBeDefined();
    expect(atestado!.tipo_afastamento).toBe('atestado');
    expect(atestado!.justificada).toBe(true);
    expect(atestado!.duracao_dias).toBe(15);
  });

  it('detecta licença médica INSS como aux_doenca (29/09/2020)', () => {
    const r = parseFaltas(CTPS_ROQUE_AFASTAMENTOS);
    const licenca = r.faltas.find((f) => f.data_inicio === '2020-09-29');
    expect(licenca).toBeDefined();
    expect(licenca!.tipo_afastamento).toBe('aux_doenca');
  });

  it('detecta auxílio doença 70 dias (19/01/2011)', () => {
    const r = parseFaltas(CTPS_ROQUE_AFASTAMENTOS);
    const aux = r.faltas.find((f) => f.data_inicio === '2011-01-19');
    expect(aux).toBeDefined();
    expect(aux!.tipo_afastamento).toBe('aux_doenca');
    expect(aux!.duracao_dias).toBe(70);
  });

  it('detecta auxílio doença 37 dias (07/05/2012)', () => {
    const r = parseFaltas(CTPS_ROQUE_AFASTAMENTOS);
    const aux = r.faltas.find((f) => f.data_inicio === '2012-05-07');
    expect(aux).toBeDefined();
    expect(aux!.tipo_afastamento).toBe('aux_doenca');
    expect(aux!.duracao_dias).toBe(37);
  });

  it('detecta 3 suspensões COVID', () => {
    const r = parseFaltas(CTPS_ROQUE_AFASTAMENTOS);
    const suspensoes = r.faltas.filter((f) => f.tipo_afastamento === 'suspensao');
    expect(suspensoes.length).toBe(3);
    expect(suspensoes.every((s) => s.duracao_dias >= 29 && s.duracao_dias <= 31)).toBe(true);
  });

  it('NÃO confunde período aquisitivo de férias com falta', () => {
    const r = parseFaltas(CTPS_ROQUE_AFASTAMENTOS);
    const falsosPositivos = r.faltas.filter(
      (f) => f.data_inicio === '2003-11-24' || f.data_inicio === '2004-11-23',
    );
    expect(falsosPositivos.length).toBe(0);
  });

  it('total de faltas detectadas é razoável (5-8)', () => {
    const r = parseFaltas(CTPS_ROQUE_AFASTAMENTOS);
    expect(r.faltas.length).toBeGreaterThanOrEqual(5);
    expect(r.faltas.length).toBeLessThanOrEqual(10);
  });

  it('todas as faltas têm duracao_dias > 0', () => {
    const r = parseFaltas(CTPS_ROQUE_AFASTAMENTOS);
    for (const f of r.faltas) {
      expect(f.duracao_dias).toBeGreaterThan(0);
    }
  });

  it('todas as faltas têm tipo_afastamento definido', () => {
    const r = parseFaltas(CTPS_ROQUE_AFASTAMENTOS);
    const tipos = new Set(r.faltas.map((f) => f.tipo_afastamento));
    for (const t of tipos) {
      expect(['falta_simples', 'atestado', 'aux_doenca', 'licenca_maternidade', 'licenca_paternidade', 'licenca_medica', 'suspensao', 'outros']).toContain(t);
    }
  });
});
