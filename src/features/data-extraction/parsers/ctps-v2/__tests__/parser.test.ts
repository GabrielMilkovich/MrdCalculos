import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFichaAnotacoes } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/parser';
import {
  detectarEmissor,
  isFichaAnotacoes,
} from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/detectar';
import { seccionar } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/seccionar';
import { extrairTextoLayout } from '../extrair-texto';

const FIXTURES = resolve(__dirname, '../../../../../../fixtures/ctps');

function loadPdf(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, name, 'ctps.pdf')));
}

describe('CTPS v2 — parser (Fase 1 = skeleton)', () => {
  it('deve existir o módulo parseFichaAnotacoes', () => {
    expect(typeof parseFichaAnotacoes).toBe('function');
  });
});

describe('CTPS v2 — Fase 2 detector + seccionar', () => {
  it('detecta ADP-Web no PDF do Roque', async () => {
    const pdfBytes = loadPdf('roque_guerreiro');
    const texto = await extrairTextoLayout(pdfBytes);
    expect(detectarEmissor(texto)).toBe('ADP-Web');
    expect(isFichaAnotacoes(texto)).toBe(true);
  });

  it('seccionar identifica as 13 seções do Roque', async () => {
    // NOTA: o spec original assumia que Roque NÃO tinha HISTORICO_SALARIAL,
    // mas o PDF real TEM (3 entradas: ADMISSÃO 0,00 e duas linhas COVID).
    // A fixture parsed.json zera o array — decisão de curadoria (filtro de
    // ruído) que é responsabilidade da Fase 3, não da Fase 2 (detecção).
    const pdfBytes = loadPdf('roque_guerreiro');
    const texto = await extrairTextoLayout(pdfBytes);
    const secoes = seccionar(texto);
    expect(secoes.has('LOCAL_TRABALHO')).toBe(true);
    expect(secoes.has('DADOS_PESSOAIS')).toBe(true);
    expect(secoes.has('ENDERECO_RESIDENCIAL')).toBe(true);
    expect(secoes.has('DEPENDENTES')).toBe(true);
    expect(secoes.has('DADOS_EMPREGADO')).toBe(true);
    expect(secoes.has('FUNCAO_ATUAL')).toBe(true);
    expect(secoes.has('INFORMACOES_SINDICAIS')).toBe(true);
    expect(secoes.has('HISTORICO_SALARIAL')).toBe(true);
    expect(secoes.has('FUNCOES_EXERCIDAS')).toBe(true);
    expect(secoes.has('HISTORICO_LOTACAO')).toBe(true);
    expect(secoes.has('AFASTAMENTOS')).toBe(true);
    expect(secoes.has('AFASTAMENTOS_OUTROS')).toBe(true);
    expect(secoes.has('HISTORICO_FERIAS')).toBe(true);
  });

  it('seccionar identifica HISTORICO_SALARIAL no PDF da Izabela ate_2021 com admissão 12/11/2020', async () => {
    const pdfBytes = loadPdf('izabela_ate_2021');
    const texto = await extrairTextoLayout(pdfBytes);
    const secoes = seccionar(texto);
    expect(secoes.has('HISTORICO_SALARIAL')).toBe(true);
    const linhas = secoes.get('HISTORICO_SALARIAL')!;
    expect(linhas.some((l) => /12\/11\/2020.*ADMISS[ÃA]O/i.test(l))).toBe(true);
  });
});
