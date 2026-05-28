import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFichaAnotacoes } from '../parser.ts';
import { pareceDegradado } from '../parece-degradado.ts';

const BASE = resolve(__dirname, '../../../../../../fixtures/ctps');
const ler = (cli: string, arq: string) => readFileSync(resolve(BASE, cli, arq), 'utf8');

// ── ROQUE GUERREIRO — completo ────────────────────────────────────────────────
describe('CTPS V2 — ROQUE GUERREIRO (completo, texto REAL extrairGeometrico)', () => {
  const texto = ler('roque_guerreiro', 'ocr_text_real_v6.txt');
  const esperado = JSON.parse(ler('roque_guerreiro', 'expected/parsed.json'));
  const r = parseFichaAnotacoes(texto);

  it('parseia sem retornar null', () => {
    expect(r).not.toBeNull();
  });

  it('demissão = 09/03/2021 + projeção = 26/05/2021', () => {
    expect(r?.dados_empregado.data_desligamento).toBe('09/03/2021');
    expect(r?.dados_empregado.data_desligamento_com_projecao_aviso).toBe('26/05/2021');
  });

  it('afastamentos = 4 principais + 12 outros', () => {
    expect(r?.afastamentos.length).toBe(4);
    expect(r?.afastamentos_outros.length).toBe(12);
  });

  it('funções exercidas = 8', () => {
    expect(r?.funcoes_exercidas.length).toBe(8);
  });

  it('histórico salarial = 3', () => {
    expect(r?.historico_salarial.length).toBe(3);
  });

  it('férias = 18 (regressão guard)', () => {
    expect(r?.historico_ferias.length).toBe(18);
  });

  it('NÃO parece degradado', () => {
    expect(pareceDegradado(texto, r!)).toBe(false);
  });

  it('bate o ground truth completo (menos _meta)', () => {
    const { _meta, ...semMetaR } = r as any;
    const { _meta: _m, ...semMetaE } = esperado;
    expect(semMetaR).toEqual(semMetaE);
  });
});

// ── IZABELA RANGEL — enxuto (ground truth parcial) ───────────────────────────
describe('CTPS V2 — IZABELA RANGEL (enxuto, sem afastamentos/férias, texto REAL)', () => {
  const texto = ler('izabela_ate_2021', 'ocr_text_real_v6.txt');
  const gt = JSON.parse(ler('izabela_ate_2021', 'parsed_parcial.json'));
  const r = parseFichaAnotacoes(texto);

  it('parseia sem retornar null', () => {
    expect(r).not.toBeNull();
  });

  it('dados pessoais', () => {
    expect(r?.dados_pessoais.nome).toBe(gt.dados_pessoais.nome);
    expect(r?.dados_pessoais.cpf).toBe(gt.dados_pessoais.cpf);
    expect(r?.dados_pessoais.ctps_numero).toBe(gt.dados_pessoais.ctps_numero);
    expect(r?.dados_pessoais.ctps_uf).toBe(gt.dados_pessoais.ctps_uf);
  });

  it('dados empregado — ativo (sem demissão)', () => {
    expect(r?.dados_empregado.matricula).toBe(gt.dados_empregado.matricula);
    expect(r?.dados_empregado.admissao).toBe(gt.dados_empregado.admissao);
    expect(r?.dados_empregado.data_desligamento).toBeNull();
  });

  it('funcao_atual.situacao = Ativo', () => {
    expect(r?.funcao_atual.situacao).toBe('Ativo');
  });

  it('1 dependente (filho)', () => {
    expect(r?.dependentes.length).toBe(1);
    expect(r?.dependentes[0].parentesco).toBe('Filho(a)');
  });

  it('counts: fn=1, lot=1, afast=0, afast_outros=1, férias=0, sal=1', () => {
    expect(r?.funcoes_exercidas.length).toBe(1);
    expect(r?.historico_lotacao.length).toBe(1);
    expect(r?.afastamentos.length).toBe(0);
    expect(r?.afastamentos_outros.length).toBe(1);
    expect(r?.historico_ferias.length).toBe(0);
    expect(r?.historico_salarial.length).toBe(1);
  });

  it('NÃO parece degradado', () => {
    expect(pareceDegradado(texto, r!)).toBe(false);
  });
});

// ── JOSELI WANDERLEY — rico, 2 sindicatos (ground truth parcial) ─────────────
describe('CTPS V2 — JOSELI WANDERLEY (rico, 2 sindicatos, texto REAL)', () => {
  const texto = ler('joseli_wanderley', 'ocr_text_real_v6.txt');
  const gt = JSON.parse(ler('joseli_wanderley', 'parsed_parcial.json'));
  const r = parseFichaAnotacoes(texto);

  it('parseia sem retornar null', () => {
    expect(r).not.toBeNull();
  });

  it('dados pessoais', () => {
    expect(r?.dados_pessoais.nome).toBe(gt.dados_pessoais.nome);
    expect(r?.dados_pessoais.cpf).toBe(gt.dados_pessoais.cpf);
    expect(r?.dados_pessoais.ctps_numero).toBe(gt.dados_pessoais.ctps_numero);
    expect(r?.dados_pessoais.ctps_uf).toBe(gt.dados_pessoais.ctps_uf);
  });

  it('dados empregado — demissão 13/03/2020 + projeção 06/05/2020', () => {
    expect(r?.dados_empregado.matricula).toBe(gt.dados_empregado.matricula);
    expect(r?.dados_empregado.admissao).toBe(gt.dados_empregado.admissao);
    expect(r?.dados_empregado.data_desligamento).toBe(gt.dados_empregado.data_desligamento);
    expect(r?.dados_empregado.data_desligamento_com_projecao_aviso).toBe(
      gt.dados_empregado.data_desligamento_com_projecao_aviso,
    );
  });

  it('funcao_atual.situacao = Inativo', () => {
    expect(r?.funcao_atual.situacao).toBe('Inativo');
  });

  it('DOIS sindicatos — informacoes_sindicais é array length 2', () => {
    const sindicais = r?.informacoes_sindicais as any;
    expect(Array.isArray(sindicais)).toBe(true);
    expect(sindicais.length).toBe(2);
    expect(sindicais[0].sindicato).toBe(gt.sindicato_1_nome);
    expect(sindicais[0].cnpj).toBe(gt.sindicato_1_cnpj);
    expect(sindicais[1].sindicato).toBe(gt.sindicato_2_nome);
    expect(sindicais[1].cnpj).toBe(gt.sindicato_2_cnpj);
  });

  it('counts: fn=5, lot=3, afast=1, afast_outros=17, férias=8, sal=1', () => {
    expect(r?.funcoes_exercidas.length).toBe(5);
    expect(r?.historico_lotacao.length).toBe(3);
    expect(r?.afastamentos.length).toBe(1);
    expect(r?.afastamentos_outros.length).toBe(17);
    expect(r?.historico_ferias.length).toBe(8);
    expect(r?.historico_salarial.length).toBe(1);
  });

  it('NÃO parece degradado', () => {
    expect(pareceDegradado(texto, r!)).toBe(false);
  });
});
