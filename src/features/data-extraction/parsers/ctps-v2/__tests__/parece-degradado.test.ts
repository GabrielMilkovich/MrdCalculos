import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extrairTextoLayout } from '../extrair-texto';
import { parseFichaAnotacoes } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/parser';
import { pareceDegradado } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/parece-degradado';

const FIXTURES = resolve(__dirname, '../../../../../../fixtures/ctps');

function loadPdf(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, name, 'ctps.pdf')));
}

describe('CTPS v2 — pareceDegradado', () => {
  it('Roque (text-native, OCR limpo) → não degradado', async () => {
    const texto = await extrairTextoLayout(loadPdf('roque_guerreiro'));
    const ctps = parseFichaAnotacoes(texto)!;
    expect(pareceDegradado(texto, ctps)).toBe(false);
  });

  it('Izabela ate_2021 (text-native, sem várias seções) → não degradado', async () => {
    const texto = await extrairTextoLayout(loadPdf('izabela_ate_2021'));
    const ctps = parseFichaAnotacoes(texto)!;
    expect(pareceDegradado(texto, ctps)).toBe(false);
  });

  it('texto com header de HISTÓRICO DE FÉRIAS mas linhas corrompidas → degradado', () => {
    // Mockar texto com header detectável mas data row malformada que o
    // regex de parse-historico-ferias não casa.
    const textoMockado = `
  Ficha de Anotações e Atualizações da CTPS
  adpweb.com.br

  LOCAL DE TRABALHO
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Estabelecimento:VIA VAREJO SA                                     Matriz/Filial..:Filial
  CNPJ...........:33.041.260/0778-92                                Insc.Estadual..:9061532703
  Endereço.......:Jacob Macanhan                                    Nº.............:449
  Bairro.........:Centro                                            CEP............:83324510
  Município......:Pinhais                                           UF/PAIS........:PR Brasil

  DADOS PESSOAIS
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Nome...........:ROQUE GUERREIRO TEIXEIRA
  CPF............:35925701968

  ENDEREÇO RESIDENCIAL
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  End(Rua,Av)....:Ana Kozer                                         No.............:376
  Bairro.........:Maria Antonieta                                   CEP............:83331010
  Município......:Pinhais                                           UF/PAIS........:PR Brasil

  DADOS DE EMPREGADO
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Matrícula......:278823                                            Admissão.........:24/11/2003                  Vínculo........:Trabalhador CLT

  FUNÇÃO ATUAL
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Função.........:VENDEDOR INTERNO                                  Cargo..........:VENDEDOR INTERNO              Ingresso.......:01/01/2016

  HISTÓRICO DE FÉRIAS
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Período Aquisitivo          Período de Gozo           Dias de Gozo Abono
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯     ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯   ¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯
  CORROMPIDO_DATA_INVALIDA garbage no number
`;
    const ctps = parseFichaAnotacoes(textoMockado)!;
    expect(ctps).not.toBeNull();
    // historico_ferias tem header mas zero linhas extraídas → degradado
    expect(ctps.historico_ferias).toHaveLength(0);
    expect(pareceDegradado(textoMockado, ctps)).toBe(true);
  });

  it('texto SEM seção HISTORICO_FERIAS (Izabela-style) → não degradado por isso só', () => {
    // Sem o header, pareceDegradado não cobra a seção
    const textoMockado = `
  Ficha de Anotações e Atualizações da CTPS
  adpweb.com.br

  LOCAL DE TRABALHO
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Estabelecimento:VIA VAREJO SA                                     Matriz/Filial..:Filial
  CNPJ...........:33.041.260/0778-92                                Insc.Estadual..:9061532703
  Endereço.......:Jacob Macanhan                                    Nº.............:449
  Bairro.........:Centro                                            CEP............:83324510
  Município......:Pinhais                                           UF/PAIS........:PR Brasil

  DADOS PESSOAIS
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Nome...........:ROQUE TEIXEIRA
  CPF............:35925701968

  ENDEREÇO RESIDENCIAL
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  End(Rua,Av)....:Ana Kozer                                         No.............:376
  Bairro.........:Maria Antonieta                                   CEP............:83331010
  Município......:Pinhais                                           UF/PAIS........:PR Brasil

  DADOS DE EMPREGADO
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Matrícula......:278823                                            Admissão.........:24/11/2003                  Vínculo........:Trabalhador CLT

  FUNÇÃO ATUAL
  ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
  Função.........:VENDEDOR INTERNO                                  Cargo..........:VENDEDOR INTERNO              Ingresso.......:01/01/2016
`;
    const ctps = parseFichaAnotacoes(textoMockado)!;
    expect(ctps).not.toBeNull();
    expect(pareceDegradado(textoMockado, ctps)).toBe(false);
  });
});
