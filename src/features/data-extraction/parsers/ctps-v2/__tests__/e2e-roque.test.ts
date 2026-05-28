import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';

import { extrairTextoLayout } from '../extrair-texto';
import { parseFichaAnotacoes } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/parser';
import { exportarCtpsZip } from '../../../export/ctps-v2/exporter';
import { gerarHistoricoFerias } from '../../../export/ctps-v2/ferias-pjecalc-format';
import type { CtpsDominioV2 } from '@/domain/tipos-dominio';

const FIXTURES = resolve(__dirname, '../../../../../../fixtures/ctps');

function loadPdf(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, name, 'ctps.pdf')));
}
function loadExpectedCsv(name: string, csv: string): string {
  return readFileSync(resolve(FIXTURES, name, 'expected', `${csv}.csv`), 'utf8');
}
function loadExpectedJson(name: string): any {
  return JSON.parse(readFileSync(resolve(FIXTURES, name, 'expected/parsed.json'), 'utf8'));
}

function normalizar(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '\n');
}

describe('CTPS v2 — Fase 4 E2E (Roque)', () => {
  let ctps: CtpsDominioV2;
  let zip: JSZip;
  let esperado: any;

  beforeAll(async () => {
    const texto = await extrairTextoLayout(loadPdf('roque_guerreiro'));
    const r = parseFichaAnotacoes(texto);
    if (!r) throw new Error('parseFichaAnotacoes retornou null no PDF do Roque');
    ctps = r;
    const blob = await exportarCtpsZip(ctps, 'CTPS');
    zip = await JSZip.loadAsync(await blob.arrayBuffer());
    esperado = loadExpectedJson('roque_guerreiro');
  });

  it('parseFichaAnotacoes retorna CtpsDominioV2 completo com metadata', () => {
    expect(ctps._meta.source_emitter).toBe('ADP-Web');
    expect(ctps._meta.extraction_method).toBe('pdfjs_geometric');
    expect(ctps._meta.confidence).toBeGreaterThan(0);
    expect(ctps._meta.parser).toMatch(/^ctps-ficha-anotacoes-v2/);
  });

  it('parseFichaAnotacoes preserva todas as seções do ground truth (exceto _meta)', () => {
    const { _meta: _, ...semMeta } = ctps;
    const { _meta: __, ...esperadoSemMeta } = esperado;
    expect(semMeta).toEqual(esperadoSemMeta);
  });

  it('ZIP contém os 4 CSVs', async () => {
    expect(zip.file('CTPS_dados_contratuais.csv')).not.toBeNull();
    expect(zip.file('CTPS_historico_ferias.csv')).not.toBeNull();
    expect(zip.file('CTPS_historico_salarial.csv')).not.toBeNull();
    expect(zip.file('CTPS_registro_faltas.csv')).not.toBeNull();
  });

  it('dados_contratuais.csv bate ground truth byte-a-byte', async () => {
    const gerado = await zip.file('CTPS_dados_contratuais.csv')!.async('string');
    const esperadoCsv = loadExpectedCsv('roque_guerreiro', 'dados_contratuais');
    expect(normalizar(gerado)).toBe(normalizar(esperadoCsv));
  });

  it('historico_salarial.csv bate ground truth byte-a-byte (3 entries COVID)', async () => {
    const gerado = await zip.file('CTPS_historico_salarial.csv')!.async('string');
    const esperadoCsv = loadExpectedCsv('roque_guerreiro', 'historico_salarial');
    expect(normalizar(gerado)).toBe(normalizar(esperadoCsv));
  });

  it('registro_faltas.csv bate ground truth byte-a-byte (15 entries)', async () => {
    const gerado = await zip.file('CTPS_registro_faltas.csv')!.async('string');
    const esperadoCsv = loadExpectedCsv('roque_guerreiro', 'registro_faltas');
    expect(normalizar(gerado)).toBe(normalizar(esperadoCsv));
  });

  it('historico_ferias.csv bate o formato INFERIDO (não validado contra PJe-Calc) — Roque', async () => {
    const gerado = await zip.file('CTPS_historico_ferias.csv')!.async('string');
    const esperadoCsv = loadExpectedCsv('roque_guerreiro', 'historico_ferias');
    expect(normalizar(gerado)).toBe(normalizar(esperadoCsv));
  });

  it('agrupa gozo fracionado do mesmo aquisitivo em G1+G2 (Roque 2005-2006)', () => {
    const csv = gerarHistoricoFerias(ctps);
    const linhas = csv.split('\r\n').filter((l) => l.startsWith('"23/11/2005'));
    // O aquisitivo 23/11/2005 a 22/11/2006 deve aparecer em UMA linha apenas
    expect(linhas).toHaveLength(1);
    const linha = linhas[0];
    expect(linha).toContain('"15/05/2006"'); // G1 início
    expect(linha).toContain('"24/05/2006"'); // G1 fim
    expect(linha).toContain('"11/09/2006"'); // G2 início
    expect(linha).toContain('"20/09/2006"'); // G2 fim
  });

  it('demissão é excluída do registro_faltas.csv (sem retorno)', async () => {
    const gerado = await zip.file('CTPS_registro_faltas.csv')!.async('string');
    expect(gerado).not.toMatch(/09\/03\/2021.*Demiss/);
  });

  it('produz 17 linhas de férias no CSV (18 entries com 1 aquisitivo fracionado)', async () => {
    const gerado = await zip.file('CTPS_historico_ferias.csv')!.async('string');
    const linhasDados = gerado
      .split('\r\n')
      .filter((l) => l.trim().length > 0 && !l.startsWith('RELATIVAS'));
    expect(linhasDados).toHaveLength(17);
  });
});
