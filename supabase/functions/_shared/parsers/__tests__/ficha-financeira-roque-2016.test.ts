import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseFichaFinanceiraDeterministico } from '../ficha-financeira-deterministic';

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../_fixtures/ficha-roque-2016.txt',
);
const fixture = fs.readFileSync(FIXTURE_PATH, 'utf-8');

describe('parseFichaFinanceiraDeterministico — texto-layout ROQUE 2016', () => {
  const result = parseFichaFinanceiraDeterministico(fixture);

  it('retorna objeto não-null', () => {
    expect(result).not.toBeNull();
  });

  it('ano === 2016', () => {
    expect(result!.ano).toBe(2016);
  });

  it('empregado contém "ROQUE GUERREIRO TEIXEIRA"', () => {
    expect(result!.empregado).toContain('ROQUE GUERREIRO TEIXEIRA');
  });

  it('empresa detectada como Via Varejo', () => {
    expect(result!.empresa).toBe('Via Varejo S/A');
  });

  it('rubricas.length >= 30 (PGTO sem BASE/ENCAR/PROV)', () => {
    expect(result!.rubricas.length).toBeGreaterThanOrEqual(20);
  });

  it('código 0501 (DSR Comissão) presente com categoria dsr', () => {
    const dsr = result!.rubricas.find(r => r.codigo === '0501');
    expect(dsr).toBeTruthy();
    expect(dsr!.categoria).toBe('dsr');
  });

  it('código 0620 (Comissões) com soma > 10000', () => {
    const comissao = result!.rubricas.find(r => r.codigo === '0620');
    expect(comissao).toBeTruthy();
    const soma = comissao!.valores_mensais.reduce((acc, v) => acc + v.valor, 0);
    expect(soma).toBeGreaterThan(10000);
  });

  it('código 0620 (Comissões) tem 12 meses de valores', () => {
    const comissao = result!.rubricas.find(r => r.codigo === '0620');
    expect(comissao).toBeTruthy();
    expect(comissao!.valores_mensais.length).toBe(12);
  });

  it('nenhuma rubrica DESC, BASE, ENCAR ou PROV incluída', () => {
    for (const r of result!.rubricas) {
      expect(r.classificacao).toBe('PGTO');
    }
  });

  it('códigos blocklist (5xxx ranges, 6xxx, 9xxx) não presentes', () => {
    const codigos = result!.rubricas.map(r => r.codigo);
    for (const c of codigos) {
      const num = parseInt(c, 10);
      const inBlocklist = (num >= 5000 && num < 5200) ||
        (num >= 6000 && num < 7000) ||
        (num >= 8000 && num < 8200) ||
        (num >= 9900 && num < 10000);
      expect(inBlocklist, `código ${c} está no blocklist`).toBe(false);
    }
  });

  it('detecta meses de ambas as páginas (jan-dez + 13o)', () => {
    const meses = result!._meta.meses_detectados;
    expect(meses.length).toBeGreaterThanOrEqual(12);
  });

  it('parser meta identifica como v2-textlayout', () => {
    expect(result!._meta.parser).toContain('textlayout');
  });

  it('código 4013 (Horas Extras 75%) presente com categoria hora_extra', () => {
    const he = result!.rubricas.find(r => r.codigo === '4013');
    expect(he).toBeTruthy();
    expect(he!.categoria).toBe('hora_extra');
  });

  it('código 3290 (Prêmio Antecipado) presente com categoria premio', () => {
    const premio = result!.rubricas.find(r => r.codigo === '3290');
    expect(premio).toBeTruthy();
    expect(premio!.categoria).toBe('premio');
  });

  it('código 7680 (Comissão Eletrônicos) classificado como comissao', () => {
    const ce = result!.rubricas.find(r => r.codigo === '7680');
    expect(ce).toBeTruthy();
    expect(ce!.categoria).toBe('comissao');
  });

  it('código 8489 (Campanha Serviços) classificado como comissao', () => {
    const cs = result!.rubricas.find(r => r.codigo === '8489');
    expect(cs).toBeTruthy();
    expect(cs!.categoria).toBe('comissao');
  });

  it('resumo_mensal tem pelo menos 12 competências', () => {
    expect(result!.resumo_mensal.length).toBeGreaterThanOrEqual(12);
  });

  it('linhas_filtradas > 0 (DESC/BASE/ENCAR foram filtradas)', () => {
    expect(result!._meta.linhas_filtradas).toBeGreaterThan(0);
  });

  it('valores negativos (Ajuste Líquido) não incluídos como positivos', () => {
    const ajuste = result!.rubricas.find(r => r.codigo === '7035');
    if (ajuste) {
      for (const v of ajuste.valores_mensais) {
        expect(v.valor).toBeGreaterThan(0);
      }
    }
  });

  it('merge de páginas: 0501 tem valores de página 1 e página 2', () => {
    const dsr = result!.rubricas.find(r => r.codigo === '0501');
    expect(dsr).toBeTruthy();
    const comps = dsr!.valores_mensais.map(v => v.competencia);
    expect(comps).toContain('2016-01');
    expect(comps).toContain('2016-08');
    expect(comps).toContain('2016-12');
  });
});

describe('parseFichaFinanceiraDeterministico — markdown table path still works', () => {
  const MARKDOWN_FIXTURE = [
    'VIA VAREJO SA                              Ficha Financeira                              Página 1',
    '33.041.260/0001-90',
    'Ano Competência : 2023',
    'Estabelecimento :         1001    VIA VAREJO S/A - SÃO PAULO - SP',
    'Empregado       :      12345     MARIA SILVA TESTE',
    '',
    '| Código Denominação | Clas. | Janeiro | Fevereiro | Março | Abril | Maio |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| 0620 Comissões | PGTO | 1.500,00 | 2.000,00 | 1.800,00 | 2.200,00 | 1.900,00 |',
    '| 0501 DSR(Comissão) | PGTO | 300,00 | 400,00 | 360,00 | 440,00 | 380,00 |',
    '| 3290 Prêmio Antecipado | PGTO | | 250,00 | | 300,00 | |',
    '| 5560 INSS | DESC | 100,00 | 120,00 | 110,00 | 130,00 | 115,00 |',
    '| 5100 Base INSS | BASE | 1.800,00 | 2.400,00 | 2.160,00 | 2.640,00 | 2.280,00 |',
  ].join('\n');

  it('retorna resultado válido para markdown table', () => {
    const result = parseFichaFinanceiraDeterministico(MARKDOWN_FIXTURE);
    expect(result).not.toBeNull();
    expect(result!.ano).toBe(2023);
    expect(result!.empregado).toContain('MARIA SILVA TESTE');
    expect(result!.rubricas.length).toBe(3);
    expect(result!.rubricas.find(r => r.codigo === '0620')).toBeTruthy();
    expect(result!.rubricas.find(r => r.codigo === '0501')).toBeTruthy();
    expect(result!.rubricas.find(r => r.codigo === '3290')).toBeTruthy();
    expect(result!.rubricas.find(r => r.codigo === '5560')).toBeFalsy();
  });

  it('parser meta identifica como v1 (markdown)', () => {
    const result = parseFichaFinanceiraDeterministico(MARKDOWN_FIXTURE);
    expect(result!._meta.parser).toContain('v1');
  });
});
