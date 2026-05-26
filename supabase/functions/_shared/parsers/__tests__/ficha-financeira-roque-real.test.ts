import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFichaFinanceiraDeterministico } from '../ficha-financeira-deterministic';

const real = readFileSync(
  join(__dirname, '../_fixtures/ficha-roque-2016-REAL.txt'),
  'utf-8',
);
const result = parseFichaFinanceiraDeterministico(real);

describe('parser contra PDF real ROQUE 2016 (anti-regressão bug offset coluna 1)', () => {
  it('parser retorna não-null', () => {
    expect(result).not.toBeNull();
  });

  it('ano=2016 e empregado correto', () => {
    expect(result!.ano).toBe(2016);
    expect(result!.empregado).toContain('ROQUE');
  });

  it('empresa detectada como Via Varejo', () => {
    expect(result!.empresa).toBe('Via Varejo S/A');
  });

  const casosJaneiroComMilhar: Array<[string, number, string]> = [
    ['0040', 1600.00, 'Participação Lucros'],
    ['0510', 1166.86, 'Adiant. 13Sal'],
    ['0511', 1166.86, '13Salário 1a Parcela'],
    ['2750', 2333.73, 'Media de Férias'],
    ['2751', 1633.62, 'Media Férias'],
    ['0620', 1308.70, 'Comissões'],
  ];

  casosJaneiroComMilhar.forEach(([codigo, esperado, nome]) => {
    it(`código ${codigo} (${nome}): Janeiro = R$ ${esperado.toFixed(2)}`, () => {
      const r = result!.rubricas.find(x => x.codigo === codigo);
      expect(r, `rubrica ${codigo} não encontrada`).toBeDefined();
      const jan = r!.valores_mensais.find(v => v.competencia === '2016-01');
      expect(jan, `${codigo} sem valor em Janeiro`).toBeDefined();
      expect(jan!.valor).toBeCloseTo(esperado, 2);
    });
  });

  it('código 0501 (DSR Comissão): Janeiro = R$ 361,79 (controle, sem milhar)', () => {
    const r = result!.rubricas.find(x => x.codigo === '0501');
    const jan = r!.valores_mensais.find(v => v.competencia === '2016-01');
    expect(jan!.valor).toBeCloseTo(361.79, 2);
  });

  it('código 0620 (Comissões): 12 meses + soma próxima de R$ 16.479,88', () => {
    const r = result!.rubricas.find(x => x.codigo === '0620');
    expect(r).toBeDefined();
    const meses = r!.valores_mensais.filter(v => !v.competencia.endsWith('-13'));
    expect(meses.length).toBe(12);
    const soma = meses.reduce((s, v) => s + v.valor, 0);
    expect(soma).toBeCloseTo(16479.88, 0);
  });

  it('extrai 30+ rubricas (cutoff em 0833)', () => {
    expect(result!.rubricas.length).toBeGreaterThanOrEqual(30);
  });

  it('V3: nenhuma rubrica BASE, ENCAR ou PROV (pós-cutoff)', () => {
    const classes = new Set(result!.rubricas.map(r => r.classificacao));
    expect(classes.has('BASE')).toBe(false);
    expect(classes.has('ENCAR')).toBe(false);
    expect(classes.has('PROV')).toBe(false);
  });

  it('detecta 12 meses + Dec.Terc (13)', () => {
    const meses = result!._meta.meses_detectados;
    expect(meses).toContain('01');
    expect(meses).toContain('06');
    expect(meses).toContain('12');
    expect(meses).toContain('13');
  });

  it('código 0832 (Insuf Saldo) Janeiro com milhar: R$ 1.525,90 em Fevereiro', () => {
    const r = result!.rubricas.find(x => x.codigo === '0832');
    expect(r).toBeDefined();
    const fev = r!.valores_mensais.find(v => v.competencia === '2016-02');
    expect(fev).toBeDefined();
    expect(fev!.valor).toBeCloseTo(1525.90, 2);
  });

  it('código 3391 (COM. GARANTIA): Janeiro = R$ 403,03', () => {
    const r = result!.rubricas.find(x => x.codigo === '3391');
    expect(r).toBeDefined();
    const jan = r!.valores_mensais.find(v => v.competencia === '2016-01');
    expect(jan!.valor).toBeCloseTo(403.03, 2);
  });

  it('página 2 (Agosto-Dez): código 0620 tem valores corretos', () => {
    const r = result!.rubricas.find(x => x.codigo === '0620');
    expect(r).toBeDefined();
    const ago = r!.valores_mensais.find(v => v.competencia === '2016-08');
    expect(ago).toBeDefined();
    expect(ago!.valor).toBeCloseTo(1492.73, 2);
    const dez = r!.valores_mensais.find(v => v.competencia === '2016-12');
    expect(dez).toBeDefined();
    expect(dez!.valor).toBeCloseTo(2405.67, 2);
  });

  it('Dec.Terc (13o): código 0517 = R$ 2.451,51', () => {
    const r = result!.rubricas.find(x => x.codigo === '0517');
    if (r) {
      const decTerc = r.valores_mensais.find(v => v.competencia === '2016-13');
      expect(decTerc).toBeDefined();
      expect(decTerc!.valor).toBeCloseTo(2451.51, 2);
    }
  });

  it('código 0590 (1/3 Adic Const Fer): Janeiro = R$ 777,91', () => {
    const r = result!.rubricas.find(x => x.codigo === '0590');
    expect(r).toBeDefined();
    const jan = r!.valores_mensais.find(v => v.competencia === '2016-01');
    expect(jan!.valor).toBeCloseTo(777.91, 2);
  });

  it('código 3415 (1/3 FERIAS PAGAS): Janeiro = R$ 544,53', () => {
    const r = result!.rubricas.find(x => x.codigo === '3415');
    expect(r).toBeDefined();
    const jan = r!.valores_mensais.find(v => v.competencia === '2016-01');
    expect(jan!.valor).toBeCloseTo(544.53, 2);
  });

  it('código 4325 (ADIANTAMENTO): Janeiro = R$ 631,93', () => {
    const r = result!.rubricas.find(x => x.codigo === '4325');
    expect(r).toBeDefined();
    const jan = r!.valores_mensais.find(v => v.competencia === '2016-01');
    expect(jan!.valor).toBeCloseTo(631.93, 2);
  });
});
