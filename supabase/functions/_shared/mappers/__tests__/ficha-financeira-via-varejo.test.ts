import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { mapperFichaFinanceiraViaVarejo } from '../ficha-financeira-via-varejo';
import type { DocumentoTabular } from '../../documento-tabular';

const fixture = readFileSync(
  join(__dirname, '../../parsers/_fixtures/ficha-roque-2016-REAL.txt'),
  'utf-8',
);

function makeDoc(texto: string): DocumentoTabular {
  return {
    textoCompleto: texto,
    paginas: [{ indice: 0, texto: texto, linhas: [], blocos: [] }],
    numeroPaginas: 5,
    qualidade: { score: 0.9, razao: 'fixture' },
  } as unknown as DocumentoTabular;
}

describe('Ficha Financeira mapper V3 — ROQUE 2016', () => {
  const doc = makeDoc(fixture);

  it('detectar: aplica=true', () => {
    expect(mapperFichaFinanceiraViaVarejo.detectar(doc).aplica).toBe(true);
  });

  it('detectar: score >= 0.5', () => {
    expect(mapperFichaFinanceiraViaVarejo.detectar(doc).score).toBeGreaterThanOrEqual(0.5);
  });

  it('detectar: rejeita texto não-Ficha', () => {
    const d = makeDoc('Recibo de Pagamento — Empresa X');
    expect(mapperFichaFinanceiraViaVarejo.detectar(d).aplica).toBe(false);
  });

  const r = mapperFichaFinanceiraViaVarejo.mapear(doc)!;

  it('mapear retorna não-null', () => {
    expect(r).not.toBeNull();
  });

  it('ano = 2016', () => {
    expect(r.ano).toBe(2016);
  });

  it('empregado contém ROQUE', () => {
    expect(r.empregado).toContain('ROQUE');
  });

  it('30+ rubricas', () => {
    expect(r.rubricas.length).toBeGreaterThanOrEqual(30);
  });

  it('layout V3', () => {
    expect(r.layout_usado).toContain('v3');
  });

  it('resumo_classificacao presente com campos esperados', () => {
    expect(r.resumo_classificacao).toBeDefined();
    expect(r.resumo_classificacao.total_rubricas).toBeGreaterThanOrEqual(30);
    expect(r.resumo_classificacao.por_categoria).toBeDefined();
    expect(r.resumo_classificacao.base_dsr_comissoes_produtos_centavos).toBeGreaterThan(0);
    expect(r.resumo_classificacao.dsr_ja_pago_centavos).toBeGreaterThan(0);
    expect(r.resumo_classificacao.minimo_garantido_centavos).toBeGreaterThanOrEqual(0);
    expect(r.resumo_classificacao.rubricas_nao_classificadas).toHaveLength(0);
  });

  it('resumo_classificacao.por_categoria inclui COMISSOES_PRODUTOS e DSR_S_COMISSOES', () => {
    expect(r.resumo_classificacao.por_categoria['COMISSOES_PRODUTOS']).toBeGreaterThanOrEqual(4);
    expect(r.resumo_classificacao.por_categoria['DSR_S_COMISSOES']).toBeGreaterThanOrEqual(1);
  });

  it('0501 DSR Abr=398.43', () => {
    const dsr = r.rubricas.find(x => x.codigo === '0501')!;
    const abr = dsr.valores_mensais.find(v => v.competencia === '2016-04')!;
    expect(abr.valor).toBeCloseTo(398.43, 2);
  });

  it('0620 Comissões Fev=515.40', () => {
    const com = r.rubricas.find(x => x.codigo === '0620')!;
    const fev = com.valores_mensais.find(v => v.competencia === '2016-02')!;
    expect(fev.valor).toBeCloseTo(515.40, 2);
  });
});
