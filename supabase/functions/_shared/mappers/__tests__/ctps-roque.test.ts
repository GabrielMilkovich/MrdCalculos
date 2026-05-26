import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { mapperCtps } from '../ctps';
import type { DocumentoTabular } from '../../documento-tabular';

const fixture = readFileSync(
  join(__dirname, '../_fixtures/ctps-roque-real.txt'),
  'utf-8',
);

function makeDoc(texto: string): DocumentoTabular {
  return {
    textoCompleto: texto,
    paginas: [{ indice: 0, texto: texto, linhas: [], blocos: [] }],
    numeroPaginas: 1,
    qualidade: { score: 0.9, razao: 'fixture' },
  } as unknown as DocumentoTabular;
}

const doc = makeDoc(fixture);

describe('CTPS mapper V6 — ROQUE real', () => {
  it('detectar: aplica=true com score alto', () => {
    const det = mapperCtps.detectar(doc);
    expect(det.aplica).toBe(true);
    expect(det.score).toBeGreaterThanOrEqual(0.5);
  });

  const result = mapperCtps.mapear(doc);

  it('mapear retorna não-null', () => {
    expect(result).not.toBeNull();
  });

  it('admissao = 2003-11-24', () => {
    expect(result!.admissao).toBe('2003-11-24');
  });

  it('demissao = 2021-03-09', () => {
    expect(result!.demissao).toBe('2021-03-09');
  });

  it('demissao_com_projecao_aviso = 2021-05-26', () => {
    expect(result!.demissao_com_projecao_aviso).toBe('2021-05-26');
  });

  it('matricula = 278823', () => {
    expect(result!.matricula).toBe('278823');
  });

  it('cargo contém VENDEDOR', () => {
    expect(result!.cargo).toContain('VENDEDOR');
  });

  it('ferias.length === 18', () => {
    expect(result!.ferias).toHaveLength(18);
  });

  it('primeiro período: aquisitivo 2003/2004, gozo 11/10/2004', () => {
    const f = result!.ferias[0];
    expect(f.relativa).toBe('2003/2004');
    expect(f.gozo1?.inicio).toBe('11/10/2004');
    expect(f.gozo1?.fim).toBe('30/10/2004');
    expect(f.dias_abono).toBe(10);
  });

  it('férias parceladas 2005/2006 geram 2 entradas', () => {
    const parceladas = result!.ferias.filter(f => f.relativa === '2005/2006');
    expect(parceladas).toHaveLength(2);
    expect(parceladas[0].prazo).toBe(10);
    expect(parceladas[1].prazo).toBe(20);
  });

  it('último período (pós-COVID): 10 dias, 0 abono', () => {
    const ultimo = result!.ferias[result!.ferias.length - 1];
    expect(ultimo.relativa).toBe('2019/2020');
    expect(ultimo.prazo).toBe(10);
    expect(ultimo.dias_abono).toBe(0);
  });

  it('faltas.length === 0 (este CTPS não tem afastamentos)', () => {
    expect(result!.faltas).toHaveLength(0);
  });

  it('historico_salarial.length >= 10', () => {
    expect(result!.historico_salarial.length).toBeGreaterThanOrEqual(10);
  });

  it('historico_salarial: dissídio 2016 = R$ 1.245,00', () => {
    const d2016 = result!.historico_salarial.find(h =>
      h.data_inicio === '2016-02-01' && h.descricao.includes('Dissídio'),
    );
    expect(d2016).toBeDefined();
    expect(d2016!.valor).toBeCloseTo(1245.00, 2);
  });

  it('_meta.parser contém v8', () => {
    expect(result!._meta.parser).toContain('v8');
  });

  it('_meta.ferias_detectadas === 18', () => {
    expect(result!._meta.ferias_detectadas).toBe(18);
  });

  it('todas as férias têm situacao G', () => {
    for (const f of result!.ferias) {
      expect(f.situacao).toBe('G');
    }
  });

  it('nenhuma férias tem gozo2 ou gozo3 (CTPS tabular = 1 gozo por linha)', () => {
    for (const f of result!.ferias) {
      expect(f.gozo2).toBeNull();
      expect(f.gozo3).toBeNull();
    }
  });

  it('CNPJ detectado', () => {
    expect(result!.cnpj).toBe('33.041.260/0652-90');
  });
});

describe('CTPS mapper — edge cases', () => {
  it('retorna null se admissão ausente', () => {
    const doc = makeDoc('Carteira de Trabalho CTPS\nEmpregado: TESTE\nCNPJ: 00.000.000/0001-00');
    expect(mapperCtps.mapear(doc)).toBeNull();
  });

  it('detectar: não aplica para texto sem sinais CTPS', () => {
    const doc = makeDoc('Recibo de pagamento mensal. Holerite do mês de janeiro.');
    const det = mapperCtps.detectar(doc);
    expect(det.aplica).toBe(false);
  });
});
