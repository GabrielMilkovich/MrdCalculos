import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFerias } from '../../parsers/ferias';
import { parseFaltas } from '../../parsers/faltas';

const FIXTURE_PATH = join(__dirname, '../_fixtures/ctps/ctps-roque-sintetico.txt');
const readFixture = () => readFileSync(FIXTURE_PATH, 'utf-8');

describe('CTPS parser — Bug 1: HISTÓRICO DE FÉRIAS tabular', () => {
  it('extrai 18 linhas de férias do formato tabular CTPS', () => {
    const texto = readFixture();
    const result = parseFerias(texto);
    expect(result.ferias.length).toBe(18);
  });

  it('primeiro período tem aquisitivo 2003/2004 e gozo correto', () => {
    const texto = readFixture();
    const result = parseFerias(texto);
    const first = result.ferias[0];
    expect(first.relativa).toBe('2003/2004');
    expect(first.gozo1).toBeTruthy();
    expect(first.gozo1!.inicio).toBe('11/10/2004');
    expect(first.gozo1!.fim).toBe('30/10/2004');
    expect(first.prazo).toBe(30);
    expect(first.dias_abono).toBe(10);
    expect(first.abono).toBe(true);
  });

  it('férias parceladas (2005/2006) geram 2 entradas com mesmo aquisitivo', () => {
    const texto = readFixture();
    const result = parseFerias(texto);
    const aq200506 = result.ferias.filter(f => f.relativa === '2005/2006');
    expect(aq200506.length).toBe(2);
    expect(aq200506[0].gozo1!.inicio).toBe('15/05/2006');
    expect(aq200506[1].gozo1!.inicio).toBe('11/09/2006');
  });

  it('último período (pós-COVID) tem 10 dias e 0 abono', () => {
    const texto = readFixture();
    const result = parseFerias(texto);
    const ultimo = result.ferias[result.ferias.length - 1];
    expect(ultimo.prazo).toBe(10);
    expect(ultimo.dias_abono).toBe(0);
    expect(ultimo.abono).toBe(false);
  });

  it('aceita dias de gozo variados (10, 20, 30)', () => {
    const texto = readFixture();
    const result = parseFerias(texto);
    const dias = new Set(result.ferias.map(f => f.prazo - f.dias_abono));
    expect(dias).toContain(10);
    expect(dias).toContain(20);
    expect(dias).toContain(30);
  });

  it('retorna array vazio se seção HISTÓRICO DE FÉRIAS não existe', () => {
    const result = parseFerias('CTPS sem seção de férias\nAlgum texto qualquer');
    expect(result.ferias).toEqual([]);
  });
});

describe('CTPS parser — Bug 2: Auxílio Doença e outros tipos', () => {
  it('captura Auxilio Doença (2 ocorrências)', () => {
    const texto = readFixture();
    const result = parseFaltas(texto);
    const auxDoenca = result.faltas.filter(f => f.tipo_afastamento === 'aux_doenca');
    expect(auxDoenca.length).toBe(2);
  });

  it('captura Auxilio Doença com datas corretas', () => {
    const texto = readFixture();
    const result = parseFaltas(texto);
    const auxDoenca = result.faltas.filter(f => f.tipo_afastamento === 'aux_doenca');
    const first = auxDoenca.find(f => f.data_inicio === '2011-01-19');
    expect(first).toBeTruthy();
    expect(first!.data_fim).toBe('2011-03-29');
  });

  it('captura Suspensão Contrato de Trabalho (3 ocorrências)', () => {
    const texto = readFixture();
    const result = parseFaltas(texto);
    const susp = result.faltas.filter(f => f.tipo_afastamento === 'suspensao');
    expect(susp.length).toBe(3);
  });

  it('captura Atestado Médico', () => {
    const texto = readFixture();
    const result = parseFaltas(texto);
    const atestados = result.faltas.filter(f => f.tipo_afastamento === 'atestado');
    expect(atestados.length).toBeGreaterThanOrEqual(5);
  });
});

describe('CTPS parser — Bug 3: data fim = coluna Retorno', () => {
  it('captura data Retorno correta — caso 14 dias', () => {
    const texto = readFixture();
    const result = parseFaltas(texto);
    const f1 = result.faltas.find(f => f.data_inicio === '2009-03-13');
    expect(f1).toBeTruthy();
    expect(f1!.data_fim).toBe('2009-03-27');
  });

  it('captura data Retorno correta — caso 3 dias', () => {
    const texto = readFixture();
    const result = parseFaltas(texto);
    const f = result.faltas.find(f => f.data_inicio === '2014-07-31');
    expect(f).toBeTruthy();
    expect(f!.data_fim).toBe('2014-08-03');
  });

  it('nenhuma falta tem data_fim == data_inicio quando PDF tem 2 datas distintas', () => {
    const texto = readFixture();
    const result = parseFaltas(texto);
    const faltasComDuasDatas = result.faltas.filter(f => {
      // Only check faltas from the AFASTAMENTOS section (year >= 2009)
      const ano = parseInt(f.data_inicio.substring(0, 4), 10);
      return ano >= 2009 && ano <= 2020;
    });
    const faltasComFimIgualInicio = faltasComDuasDatas.filter(
      f => f.data_fim === f.data_inicio,
    );
    expect(faltasComFimIgualInicio.length).toBe(0);
  });

  it('warning se data fim < inicio (caso sintético)', () => {
    const result = parseFaltas('20/01/2020  Atestado Médico  15/01/2020');
    const warnInvertido = result.warnings.find(w =>
      w.includes('data fim anterior ao início') || w.includes('invertido'),
    );
    expect(warnInvertido).toBeTruthy();
  });

  it('total de faltas é 13 (10 atestados + 2 aux doença + 3 suspensão - dedup)', () => {
    const texto = readFixture();
    const result = parseFaltas(texto);
    // 8 atestados + 2 aux doença + 3 suspensões = 13
    expect(result.faltas.length).toBe(13);
  });
});
