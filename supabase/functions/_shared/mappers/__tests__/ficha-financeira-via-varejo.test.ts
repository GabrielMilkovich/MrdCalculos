import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { mapperFichaFinanceiraViaVarejo } from '../ficha-financeira-via-varejo';
import type { DocumentoTabular } from '../../documento-tabular';

const fixture = readFileSync(
  join(__dirname, '../_fixtures/ficha-roque-2016-pdftotext.txt'),
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

const doc = makeDoc(fixture);

describe('Ficha Financeira mapper V6 — ROQUE 2016 (pdftotext)', () => {
  it('detectar: aplica=true com score alto', () => {
    const det = mapperFichaFinanceiraViaVarejo.detectar(doc);
    expect(det.aplica).toBe(true);
    expect(det.score).toBeGreaterThanOrEqual(0.5);
  });

  it('detectar: motivos incluem Via Varejo e classificações ADP', () => {
    const det = mapperFichaFinanceiraViaVarejo.detectar(doc);
    const joined = det.motivos.join(' ');
    expect(joined).toMatch(/VV\/CB|Via Varejo/);
    expect(joined).toMatch(/PGTO|ADP/);
  });

  it('detectar: rejeita texto não-Ficha', () => {
    const doc2 = makeDoc('Recibo de Pagamento — Empresa X CNPJ 11.111.111/0001-11');
    const det = mapperFichaFinanceiraViaVarejo.detectar(doc2);
    expect(det.aplica).toBe(false);
  });

  describe('mapear', () => {
    const r = mapperFichaFinanceiraViaVarejo.mapear(doc);

    it('retorna não-null', () => {
      expect(r).not.toBeNull();
    });

    it('ano = 2016', () => {
      expect(r!.ano).toBe(2016);
    });

    it('empregado = ROQUE GUERREIRO TEIXEIRA', () => {
      expect(r!.empregado).toContain('ROQUE');
      expect(r!.empregado).toContain('GUERREIRO');
      expect(r!.empregado).toContain('TEIXEIRA');
    });

    it('empresa = Via Varejo', () => {
      expect(r!.empresa).toMatch(/via\s*varejo/i);
    });

    it('extrai 30+ rubricas', () => {
      expect(r!.rubricas.length).toBeGreaterThanOrEqual(30);
    });

    it('layout_usado é o slug atual do mapper', () => {
      expect(r!.layout_usado).toBe('ficha-financeira-via-varejo-mapper-v1-2026-05-26');
    });

    it('detecta 12+ meses', () => {
      expect(r!._meta.meses_detectados.length).toBeGreaterThanOrEqual(12);
    });

    it('0501 DSR(Comissão) Abr=398.43 (Mistral lia 298.63)', () => {
      const r0501 = r!.rubricas.find((ru) => ru.codigo === '0501');
      const abr = r0501?.valores_mensais.find((v) => v.competencia.endsWith('-04'));
      expect(abr?.valor).toBeCloseTo(398.43, 2);
    });

    it('0501 DSR(Comissão) Jul=206.51 (Mistral lia 256.51)', () => {
      const r0501 = r!.rubricas.find((ru) => ru.codigo === '0501');
      const jul = r0501?.valores_mensais.find((v) => v.competencia.endsWith('-07'));
      expect(jul?.valor).toBeCloseTo(206.51, 2);
    });

    it('0620 Comissões Fev=515.40 (Mistral lia 315.40)', () => {
      const r0620 = r!.rubricas.find((ru) => ru.codigo === '0620');
      const fev = r0620?.valores_mensais.find((v) => v.competencia.endsWith('-02'));
      expect(fev?.valor).toBeCloseTo(515.40, 2);
    });

    it('códigos têm 4 dígitos (formato ADP)', () => {
      for (const ru of r!.rubricas) {
        expect(ru.codigo).toMatch(/^\d{4}$/);
      }
    });

    it('todas rubricas têm pelo menos 1 valor mensal', () => {
      for (const ru of r!.rubricas) {
        expect(ru.valores_mensais.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  it('mapear retorna null em texto sem layout reconhecível', () => {
    const doc3 = makeDoc(
      'Ficha Financeira da Empresa XPTO\nCódigo Algum Aqui\nVIA VAREJO SA\nMas sem tabela ADP.'.repeat(10),
    );
    const r = mapperFichaFinanceiraViaVarejo.mapear(doc3);
    if (r) {
      expect(r.rubricas.length).toBe(0);
    } else {
      expect(r).toBeNull();
    }
  });
});
