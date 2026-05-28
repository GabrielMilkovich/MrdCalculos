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

  it('rubricas.length >= 20 (V3: até cutoff 0833)', () => {
    expect(result!.rubricas.length).toBeGreaterThanOrEqual(20);
  });

  it('código 0501 (DSR Comissão) presente com categoria DSR_S_COMISSOES', () => {
    const dsr = result!.rubricas.find(r => r.codigo === '0501');
    expect(dsr).toBeTruthy();
    expect(dsr!.categoria).toBe('DSR_S_COMISSOES');
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

  it('regra do escritório: output só contém PGTO (DESC encerra a seção)', () => {
    const classes = new Set(result!.rubricas.map(r => r.classificacao));
    expect(classes.has('PGTO')).toBe(true);
    expect(classes.has('DESC')).toBe(false);
  });

  it('V3: fixture sintética sem cutoff 0833 — inclui tudo', () => {
    expect(result!.rubricas.length).toBeGreaterThanOrEqual(20);
  });

  it('detecta meses de ambas as páginas (jan-dez + 13o)', () => {
    const meses = result!._meta.meses_detectados;
    expect(meses.length).toBeGreaterThanOrEqual(12);
  });

  it('parser meta identifica como v4', () => {
    expect(result!._meta.parser).toContain('v4');
  });

  it('código 4013 (Horas Extras 75%) presente com categoria DESCONSIDERADAS', () => {
    const he = result!.rubricas.find(r => r.codigo === '4013');
    if (he) {
      expect(he.categoria).toBe('DESCONSIDERADAS');
    }
  });

  it('código 3290 (Prêmio Antecipado) presente com categoria PREMIOS', () => {
    const premio = result!.rubricas.find(r => r.codigo === '3290');
    expect(premio).toBeTruthy();
    expect(premio!.categoria).toBe('PREMIOS');
  });

  it('código 8489 (Campanha Serviços) classificado via ontologia V2', () => {
    const cs = result!.rubricas.find(r => r.codigo === '8489');
    if (cs) {
      expect(cs.categoria).toBe('COMISSOES_SERVICOS');
    }
  });

  it('resumo_mensal tem pelo menos 12 competências', () => {
    expect(result!.resumo_mensal.length).toBeGreaterThanOrEqual(12);
  });

  it('V3: linhas processadas > 0', () => {
    expect(result!._meta.linhas_processadas).toBeGreaterThan(0);
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

  it('retorna resultado válido para markdown table (regra: para no 1º DESC, BASE filtrado)', () => {
    const result = parseFichaFinanceiraDeterministico(MARKDOWN_FIXTURE);
    expect(result).not.toBeNull();
    expect(result!.ano).toBe(2023);
    expect(result!.empregado).toContain('MARIA SILVA TESTE');
    // Nova regra: parser entrega apenas PGTO até o 1º DESC.
    // 5560 (DESC) encerra a seção; 5100 (BASE) filtrado.
    expect(result!.rubricas.length).toBe(3);
    expect(result!.rubricas.find(r => r.codigo === '0620')).toBeTruthy();
    expect(result!.rubricas.find(r => r.codigo === '0501')).toBeTruthy();
    expect(result!.rubricas.find(r => r.codigo === '3290')).toBeTruthy();
    expect(result!.rubricas.find(r => r.codigo === '5560')).toBeFalsy(); // DESC — encerra
    expect(result!.rubricas.find(r => r.codigo === '5100')).toBeFalsy(); // BASE — filtered
  });

  it('parser meta identifica como v4', () => {
    const result = parseFichaFinanceiraDeterministico(MARKDOWN_FIXTURE);
    expect(result!._meta.parser).toContain('v4');
  });
});
