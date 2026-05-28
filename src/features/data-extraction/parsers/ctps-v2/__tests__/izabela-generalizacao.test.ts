import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extrairTextoLayout } from '../extrair-texto';
import { parseFichaAnotacoes } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/parser';
import type { CtpsDominioV2 } from '@/domain/tipos-dominio';

const FIXTURES = resolve(__dirname, '../../../../../../fixtures/ctps');

function loadPdf(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, name, 'ctps.pdf')));
}

/**
 * Teste de generalização: parsers calibrados só no Roque (Via Varejo,
 * comissionista, demitido) precisam funcionar em Izabela ate_2021 também
 * (Via Varejo, comissionista, ATIVO, layout ligeiramente diferente).
 *
 * Diferenças relevantes pra Izabela ate_2021:
 *   - SEM seção INFORMAÇÕES SINDICAIS
 *   - SEM seção AFASTAMENTOS (só AFASTAMENTOS OUTROS)
 *   - SEM seção HISTÓRICO DE FÉRIAS
 *   - SEM Cert. Res, SEM Tit. Eleitor com complemento
 *   - DEPENDENTE é filho (não cônjuge)
 *   - HISTÓRICO SALARIAL tem 1 entry com perc_reajuste="0,000000" (não "?")
 *   - Cargo é ATIVO (não Inativo)
 *
 * Ground truth construído via pdftotext direto + leitura manual.
 */
describe('CTPS v2 — Fase 5.1 generalização (Izabela ate_2021)', () => {
  let ctps: CtpsDominioV2 | null;

  beforeAll(async () => {
    const texto = await extrairTextoLayout(loadPdf('izabela_ate_2021'));
    ctps = parseFichaAnotacoes(texto);
  });

  it('parseFichaAnotacoes não retorna null', () => {
    expect(ctps).not.toBeNull();
  });

  it('dados_pessoais: nome + CPF + sexo Feminino + estado civil Solteiro', () => {
    expect(ctps!.dados_pessoais.nome).toBe('IZABELA C RANGEL DO AMARAL');
    expect(ctps!.dados_pessoais.cpf).toBe('97752827991');
    expect(ctps!.dados_pessoais.sexo).toBe('Feminino');
    expect(ctps!.dados_pessoais.estado_civil).toBe('Solteiro');
    expect(ctps!.dados_pessoais.naturalidade).toBe('Nova Iguaçu');
    expect(ctps!.dados_pessoais.naturalidade_uf).toBe('RJ');
    expect(ctps!.dados_pessoais.nascimento).toBe('27/12/1973');
  });

  it('local_trabalho: CNPJ filial específico do estabelecimento', () => {
    expect(ctps!.local_trabalho.estabelecimento).toBe('VIA VAREJO SA');
    expect(ctps!.local_trabalho.cnpj).toBe('33.041.260/1106-95');
    expect(ctps!.local_trabalho.endereco_municipio).toBe('Curitiba');
  });

  it('dados_empregado: matricula 4805879 + admissao 12/11/2020 ativa (sem desligamento)', () => {
    expect(ctps!.dados_empregado.matricula).toBe('4805879');
    expect(ctps!.dados_empregado.admissao).toBe('12/11/2020');
    expect(ctps!.dados_empregado.vinculo).toBe('Trabalhador CLT');
    expect(ctps!.dados_empregado.data_desligamento).toBeNull();
    expect(ctps!.dados_empregado.tipo_afastamento).toBeNull();
  });

  it('funcao_atual: VENDEDOR INTERNO Ativo', () => {
    expect(ctps!.funcao_atual.cargo).toBe('VENDEDOR INTERNO');
    expect(ctps!.funcao_atual.situacao).toBe('Ativo');
    expect(ctps!.funcao_atual.cbo).toBe('5211-10');
  });

  it('dependentes: 1 filho — não cônjuge (generalização do parser)', () => {
    expect(ctps!.dependentes).toHaveLength(1);
    expect(ctps!.dependentes[0].nome).toBe('GIOVANA RANGEL ANDREJESWKI');
    expect(ctps!.dependentes[0].parentesco).toBe('Filho(a)');
    expect(ctps!.dependentes[0].sexo).toBe('Feminino');
    expect(ctps!.dependentes[0].irrf).toBe(false); // "Nao" no PDF
    expect(ctps!.dependentes[0].salario_familia).toBe(false);
  });

  it('historico_salarial: 1 entry ADMISSÃO com perc_reajuste=0 (não null)', () => {
    expect(ctps!.historico_salarial).toHaveLength(1);
    const entry = ctps!.historico_salarial[0];
    expect(entry.data_vigencia).toBe('12/11/2020');
    expect(entry.motivo).toBe('ADMISSÃO');
    expect(entry.sal_tarefa).toBe(0);
    // "0,000000" no PDF → 0 (não null como o "?" do Roque)
    expect(entry.perc_reajuste).toBe(0);
    expect(entry.min_garantido).toBeNull();
    expect(entry.comissao).toBe(0);
  });

  it('historico_lotacao: 1 entry — VIA VAREJO SHOP JD DAS A', () => {
    expect(ctps!.historico_lotacao).toHaveLength(1);
    expect(ctps!.historico_lotacao[0].codigo_estabelecimento).toBe('1581');
    expect(ctps!.historico_lotacao[0].cnpj_estabelecimento).toBe('33.041.260/1106-95');
  });

  it('funcoes_exercidas: 1 entry — VENDEDOR INTERNO codigo 9900', () => {
    expect(ctps!.funcoes_exercidas).toHaveLength(1);
    expect(ctps!.funcoes_exercidas[0].codigo_cargo).toBe('9900');
    expect(ctps!.funcoes_exercidas[0].cargo).toBe('VENDEDOR INTERNO');
    expect(ctps!.funcoes_exercidas[0].data_alteracao).toBe('12/11/2020');
  });

  it('afastamentos: 0 entries (seção AFASTAMENTOS ausente no PDF)', () => {
    expect(ctps!.afastamentos).toHaveLength(0);
  });

  it('afastamentos_outros: 1 atestado médico 27/05/2021', () => {
    expect(ctps!.afastamentos_outros).toHaveLength(1);
    expect(ctps!.afastamentos_outros[0].data_inicio).toBe('27/05/2021');
    expect(ctps!.afastamentos_outros[0].retorno).toBe('28/05/2021');
    expect(ctps!.afastamentos_outros[0].categoria).toBe('atestado_medico');
  });

  it('historico_ferias: 0 entries (seção HISTÓRICO DE FÉRIAS ausente)', () => {
    expect(ctps!.historico_ferias).toHaveLength(0);
  });

  it('informacoes_sindicais: [] (seção ausente no PDF)', () => {
    expect(ctps!.informacoes_sindicais).toEqual([]);
  });
});
