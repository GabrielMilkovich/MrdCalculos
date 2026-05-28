import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFichaFinanceiraDeterministico } from '../ficha-financeira-deterministic';

const fixture = readFileSync(
  join(__dirname, '../_fixtures/ficha-roque-2016-REAL.txt'),
  'utf-8',
);

const result = parseFichaFinanceiraDeterministico(fixture)!;

describe('Ficha Financeira — regra do escritório (corte no 1º DESC, ROQUE 2016)', () => {
  it('parser retorna não-null', () => {
    expect(result).not.toBeNull();
  });

  it('extrai exatamente 32 rubricas (todas PGTO, corte no 1º DESC de cada seção)', () => {
    // Nova regra: a captura para no primeiro código com classificação DESC.
    // Roque tem 2 seções (Jan-Jul / Ago-Dez+13o). PGTO únicos pré-DESC = 32.
    expect(result.rubricas.length).toBe(32);
  });

  it('nenhum DESC no output (regra do escritório)', () => {
    const naoPgto = result.rubricas.filter(r => r.classificacao !== 'PGTO');
    expect(naoPgto).toHaveLength(0);
  });

  it('0833 Desc. Insuf Saldo NÃO entra (é DESC, encerra captura)', () => {
    expect(result.rubricas.find(x => x.codigo === '0833')).toBeUndefined();
  });

  it('0514 Desc. 13º Salário NÃO entra (DESC)', () => {
    expect(result.rubricas.find(x => x.codigo === '0514')).toBeUndefined();
  });

  it('nenhuma rubrica de desconto/base/encar/prov (2824, 3640, 5501, 9920, 6400)', () => {
    const codigos = result.rubricas.map(x => x.codigo);
    expect(codigos).not.toContain('2824');
    expect(codigos).not.toContain('3640');
    expect(codigos).not.toContain('3669');
    expect(codigos).not.toContain('5501');
    expect(codigos).not.toContain('9920');
    expect(codigos).not.toContain('6400');
  });

  it('8441 e 8489 entram (estavam no blocklist V2)', () => {
    const codigos = result.rubricas.map(x => x.codigo);
    expect(codigos).toContain('8441');
    expect(codigos).toContain('8489');
  });

  it('parser V3 identificado na meta', () => {
    expect(result._meta.parser).toContain('v4');
  });

  it('valores monetários: 0620 Jan = 1308.70', () => {
    const com = result.rubricas.find(x => x.codigo === '0620')!;
    const jan = com.valores_mensais.find(v => v.competencia === '2016-01')!;
    expect(jan.valor).toBeCloseTo(1308.70, 2);
  });

  it('valores monetários: 0501 Abr = 398.43 (Mistral lia 298.63)', () => {
    const dsr = result.rubricas.find(x => x.codigo === '0501')!;
    const abr = dsr.valores_mensais.find(v => v.competencia === '2016-04')!;
    expect(abr.valor).toBeCloseTo(398.43, 2);
  });

  describe('classificação V2 — cada rubrica casa com planilha MRD', () => {
    const esperado: Array<[string, string, string]> = [
      ['0040', 'Participação Lucros', 'DESCONSIDERADAS'],
      ['0501', 'DSR(Comissão)', 'DSR_S_COMISSOES'],
      ['0502', 'DSR (H.Extra)', 'DESCONSIDERADAS'],
      ['0510', 'Adiant. 13Sal', 'DESCONSIDERADAS'],
      ['0511', '13Salário 1a Parcela', 'DESCONSIDERADAS'],
      ['0590', '1/3 Adic Const Fer', 'DESCONSIDERADAS'],
      ['0591', '1/3 Adic Const Fer', 'DESCONSIDERADAS'],
      ['0620', 'Comissões', 'COMISSOES_PRODUTOS'],
      ['0712', 'Mínimo Garantido - C', 'MINIMO_GARANTIDO'],
      ['0832', 'Insuf Saldo no Mês', 'DESCONSIDERADAS'],
      ['2750', 'Media de Férias', 'DESCONSIDERADAS'],
      ['2751', 'Media Férias', 'DESCONSIDERADAS'],
      ['2752', 'Diferença Média Féri', 'DESCONSIDERADAS'],
      ['2823', 'Adiant Quinzenal', 'COMISSOES_PRODUTOS'],
      ['3290', 'PREMIO ANTECIPADO', 'PREMIOS'],
      ['3317', 'AD.SABADO COM.25%', 'COMISSOES_PRODUTOS'],
      ['3368', 'HORAS JUST. / TRN', 'MINIMO_GARANTIDO'],
      ['3391', 'COM. GARANTIA', 'COMISSOES_SERVICOS'],
      ['3393', 'COM.SEGUROS', 'COMISSOES_SERVICOS'],
      ['3415', '1/3 FERIAS PAGAS', 'DESCONSIDERADAS'],
      ['3453', 'COMISSAO FRETE', 'COMISSOES_SERVICOS'],
      ['4013', 'HORAS EXTRAS Com 75%', 'DESCONSIDERADAS'],
      ['4016', 'Horas Extras Com - 7', 'DESCONSIDERADAS'],
      ['4096', 'COMISSAO MONTAGEM', 'COMISSOES_SERVICOS'],
      ['4101', 'PREMIO META', 'PREMIOS'],
      ['4325', 'ADIANTAMENTO', 'DESCONSIDERADAS'],
      ['7035', 'Ajuste de Liquido', 'COMISSOES_PRODUTOS'],
      ['7076', 'PLR Variavel', 'DESCONSIDERADAS'],
      ['8441', 'ANTECIP.PREMIO ESTIM', 'PREMIOS'],
      ['8489', 'CAMPANHA SERVICOS', 'COMISSOES_SERVICOS'],
      // Pág 2 extras PGTO (só têm valores Ago-Dez/13o)
      ['0517', '13º Salário - Média', 'DESCONSIDERADAS'],
      ['0525', 'Dif. de Médias 13º S', 'DESCONSIDERADAS'],
    ];

    for (const [codigo, denom, catEsperada] of esperado) {
      it(`${codigo} ${denom} → ${catEsperada}`, () => {
        const r = result.rubricas.find(x => x.codigo === codigo);
        expect(r, `rubrica ${codigo} ausente`).toBeDefined();
        expect(r!.categoria).toBe(catEsperada);
      });
    }
  });

  it('distribuição: 4 COMISSOES_PROD, 5 SERVICOS, 3 PREMIOS, 2 MINIMO, 1 DSR, 17 DESCONSIDERADAS', () => {
    const dist: Record<string, number> = {};
    for (const r of result.rubricas) {
      dist[r.categoria] = (dist[r.categoria] ?? 0) + 1;
    }
    expect(dist['COMISSOES_PRODUTOS']).toBe(4);
    expect(dist['COMISSOES_SERVICOS']).toBe(5);
    expect(dist['PREMIOS']).toBe(3);
    expect(dist['MINIMO_GARANTIDO']).toBe(2);
    expect(dist['DSR_S_COMISSOES']).toBe(1);
    // 32 total - 4 prod - 5 serv - 3 prem - 2 min - 1 dsr = 17 desconsideradas
    expect(dist['DESCONSIDERADAS']).toBe(17);
  });

  it('nenhuma rubrica NAO_CLASSIFICADO', () => {
    const naoClass = result.rubricas.filter(r => r.categoria === 'NAO_CLASSIFICADO');
    if (naoClass.length > 0) {
      const nomes = naoClass.map(r => `${r.codigo} ${r.denominacao}`);
      expect.fail(`${naoClass.length} rubrica(s) NAO_CLASSIFICADO: ${nomes.join(', ')}`);
    }
  });

  it('todas rubricas têm tipo_pjecalc definido', () => {
    for (const r of result.rubricas) {
      expect(r.tipo_pjecalc).toBeDefined();
      expect(r.tipo_pjecalc).not.toBe('');
    }
  });

  it('rubricas com base_dsr=true são apenas COMISSOES_PRODUTOS, COMISSOES_SERVICOS, PREMIOS', () => {
    const comBaseDsr = result.rubricas.filter(r => r.base_dsr);
    for (const r of comBaseDsr) {
      expect(['COMISSOES_PRODUTOS', 'COMISSOES_SERVICOS', 'PREMIOS']).toContain(r.categoria);
    }
  });
});
