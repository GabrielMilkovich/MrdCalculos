import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extrairTextoLayout } from '../../../../../src/features/data-extraction/parsers/ctps-v2/extrair-texto.ts';
import { mapperCtpsV2 } from '../ctps-v2.ts';

const FIXTURES = resolve(__dirname, '../../../../../fixtures/ctps');

async function makeDocTab(name: string): Promise<{ textoCompleto: string }> {
  const pdfBytes = new Uint8Array(readFileSync(resolve(FIXTURES, name, 'ctps.pdf')));
  const texto = await extrairTextoLayout(pdfBytes);
  return { textoCompleto: texto };
}

describe('mapperCtpsV2', () => {
  it('detectar reconhece Ficha de Anotações ADP-Web (Roque)', async () => {
    const doc = await makeDocTab('roque_guerreiro');
    const det = mapperCtpsV2.detectar(doc as any);
    expect(det.aplica).toBe(true);
    expect(det.score).toBe(1.0);
  });

  it('detectar reconhece Ficha de Anotações ADP-Web (Izabela ate_2021)', async () => {
    const doc = await makeDocTab('izabela_ate_2021');
    const det = mapperCtpsV2.detectar(doc as any);
    expect(det.aplica).toBe(true);
  });

  it('detectar NÃO reconhece doc não-CTPS', () => {
    const det = mapperCtpsV2.detectar({ textoCompleto: 'Holerite Mensal Janeiro 2024' } as any);
    expect(det.aplica).toBe(false);
    expect(det.score).toBe(0);
  });

  it('mapear devolve combinado: legacy top-level + ctps_v2 aninhado (Roque)', async () => {
    const doc = await makeDocTab('roque_guerreiro');
    const r = mapperCtpsV2.mapear(doc as any);
    expect(r).not.toBeNull();
    // Legacy shape
    expect(r!.matricula).toBe('278823');
    expect(r!.admissao).toBe('24/11/2003');
    expect(r!.demissao).toBe('09/03/2021');
    expect(r!.cargo).toBe('VENDEDOR INTERNO');
    expect(r!.empregador).toBe('VIA VAREJO SA');
    expect(r!.cnpj).toBe('33.041.260/0778-92');
    expect(r!.ferias).toHaveLength(18);
    expect(r!.faltas).toHaveLength(15); // 12 atestados/auxilio + 3 suspensões
    // V2 aninhado
    expect(r!.ctps_v2.dados_pessoais.nome).toBe('ROQUE GUERREIRO TEIXEIRA');
    expect(r!.ctps_v2.historico_ferias).toHaveLength(18);
    expect(r!.ctps_v2.afastamentos).toHaveLength(4);
    expect(r!.ctps_v2.afastamentos_outros).toHaveLength(12);
  });

  it('mapear devolve null quando degradado (texto vazio)', () => {
    const r = mapperCtpsV2.mapear({ textoCompleto: '' } as any);
    expect(r).toBeNull();
  });

  it('mapear devolve null quando não é Ficha de Anotações', () => {
    const r = mapperCtpsV2.mapear({
      textoCompleto: 'Algum texto qualquer sem ser CTPS',
    } as any);
    expect(r).toBeNull();
  });
});
