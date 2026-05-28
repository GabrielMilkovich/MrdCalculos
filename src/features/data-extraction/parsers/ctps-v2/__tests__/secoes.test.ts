import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extrairTextoLayout } from '../extrair-texto';
import { seccionar } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/seccionar';
import { parseLocalTrabalho } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-local-trabalho';
import { parseDadosPessoais } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-dados-pessoais';
import { parseEnderecoResidencial } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-endereco-residencial';
import { parseDependentes } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-dependentes';
import { parseDadosEmpregado } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-dados-empregado';
import { parseFuncaoAtual } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-funcao-atual';
import { parseInformacoesSindicais } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-informacoes-sindicais';
import { parseHistoricoSalarial } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-historico-salarial';
import { parseFuncoesExercidas } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-funcoes-exercidas';
import { parseHistoricoLotacao } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-historico-lotacao';
import { parseAfastamentos } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-afastamentos';
import { parseHistoricoFerias } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-historico-ferias';

const FIXTURES = resolve(__dirname, '../../../../../../fixtures/ctps');

function loadPdf(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, name, 'ctps.pdf')));
}
function loadExpectedJson(name: string): any {
  return JSON.parse(readFileSync(resolve(FIXTURES, name, 'expected/parsed.json'), 'utf8'));
}

describe('CTPS v2 — Fase 3 parsers de seção (Roque)', () => {
  let secoes: Map<string, string[]>;
  let esperado: any;

  beforeAll(async () => {
    const texto = await extrairTextoLayout(loadPdf('roque_guerreiro'));
    secoes = seccionar(texto) as Map<string, string[]>;
    esperado = loadExpectedJson('roque_guerreiro');
  });

  it('parseLocalTrabalho bate ground truth', () => {
    const r = parseLocalTrabalho(secoes.get('LOCAL_TRABALHO') ?? []);
    expect(r).toEqual(esperado.local_trabalho);
  });

  it('parseDadosPessoais bate ground truth', () => {
    const r = parseDadosPessoais(secoes.get('DADOS_PESSOAIS') ?? []);
    expect(r).toEqual(esperado.dados_pessoais);
  });

  it('parseEnderecoResidencial bate ground truth', () => {
    const r = parseEnderecoResidencial(secoes.get('ENDERECO_RESIDENCIAL') ?? []);
    expect(r).toEqual(esperado.endereco_residencial);
  });

  it('parseDependentes bate ground truth (1 entry)', () => {
    const r = parseDependentes(secoes.get('DEPENDENTES') ?? []);
    expect(r).toEqual(esperado.dependentes);
  });

  it('parseDadosEmpregado bate ground truth (Demissão + 78 dias aviso)', () => {
    const r = parseDadosEmpregado(secoes.get('DADOS_EMPREGADO') ?? []);
    expect(r).toEqual(esperado.dados_empregado);
  });

  it('parseFuncaoAtual bate ground truth', () => {
    const r = parseFuncaoAtual(secoes.get('FUNCAO_ATUAL') ?? []);
    expect(r).toEqual(esperado.funcao_atual);
  });

  it('parseInformacoesSindicais bate ground truth', () => {
    const r = parseInformacoesSindicais(secoes.get('INFORMACOES_SINDICAIS') ?? []);
    expect(r).toEqual(esperado.informacoes_sindicais);
  });

  it('parseHistoricoSalarial bate ground truth (3 entries — fixture corrigida na Fase 3.0)', () => {
    const r = parseHistoricoSalarial(secoes.get('HISTORICO_SALARIAL') ?? []);
    expect(r).toEqual(esperado.historico_salarial);
  });

  it('parseFuncoesExercidas bate ground truth (5 entries cross-page)', () => {
    const r = parseFuncoesExercidas(secoes.get('FUNCOES_EXERCIDAS') ?? []);
    expect(r).toEqual(esperado.funcoes_exercidas);
  });

  it('parseHistoricoLotacao bate ground truth (6 entries)', () => {
    const r = parseHistoricoLotacao(secoes.get('HISTORICO_LOTACAO') ?? []);
    expect(r).toEqual(esperado.historico_lotacao);
  });

  it('parseAfastamentos AFASTAMENTOS bate ground truth (3 suspensões + 1 demissão)', () => {
    const r = parseAfastamentos(secoes.get('AFASTAMENTOS') ?? [], 'principal');
    expect(r).toEqual(esperado.afastamentos);
  });

  it('parseAfastamentos AFASTAMENTOS_OUTROS bate ground truth (12 atestados/auxilio)', () => {
    const r = parseAfastamentos(secoes.get('AFASTAMENTOS_OUTROS') ?? [], 'outros');
    expect(r).toEqual(esperado.afastamentos_outros);
  });

  it('parseHistoricoFerias bate ground truth (18 períodos — regressão do bug atual)', () => {
    const r = parseHistoricoFerias(secoes.get('HISTORICO_FERIAS') ?? []);
    expect(r).toHaveLength(18);
    expect(r).toEqual(esperado.historico_ferias);
  });
});
