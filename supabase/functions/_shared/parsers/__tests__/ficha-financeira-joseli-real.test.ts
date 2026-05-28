// Tests for the Joseli ADP ficha financeira fixtures (2016 and 2019).
//
// Nova regra do escritório (28/05/2026): a captura para no PRIMEIRO código
// com classificação DESC dentro de cada seção. Só PGTO entra no output —
// descontos nunca compõem histórico salarial pro PJe-Calc.
//
// Estas fichas têm 5 seções ADP:
//   Section 1: Jan-Jul  PGTO → DESC (corte)
//   Section 2: Jan-Jul  OUTRO/PROV   ← filtrado por BASE/ENCAR/OUTRO/PROV
//   Section 3: Aug-Dec  PGTO → DESC (corte)
//   Section 4: Aug-Dec  BASE/ENCAR   ← filtrado
//   Section 5: Aug-Dec  OUTRO/PROV   ← filtrado
//
// Invariantes testados:
//  - Nenhum DESC, BASE, ENCAR, OUTRO, PROV, INFO aparece no output
//  - Total de PGTO correto (não inflado por seções de aux)
//  - Códigos novos da planilha presentes (3090, 3405, 3423, etc)
//  - 3049 "Reemb desc I Contr A" é PGTO mesmo com "desc" no nome

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFichaFinanceiraDeterministico } from '../ficha-financeira-deterministic';

const FIXTURE_DIR = join(__dirname, '../_fixtures');

// ─────────────────────────────────────────────────────────────────────────────
// 2016
// ─────────────────────────────────────────────────────────────────────────────

describe('Ficha Financeira — Joseli 2016 (5 seções ADP, corte no 1º DESC)', () => {
  let result: ReturnType<typeof parseFichaFinanceiraDeterministico>;

  beforeAll(() => {
    const texto = readFileSync(join(FIXTURE_DIR, 'ficha-joseli-2016-REAL.txt'), 'utf-8');
    result = parseFichaFinanceiraDeterministico(texto);
  });

  it('parser não retorna null', () => {
    expect(result).not.toBeNull();
  });

  it('ano = 2016', () => {
    expect(result!.ano).toBe(2016);
  });

  it('empregado = JOSELI SILVA WANDERLEY', () => {
    expect(result!.empregado).toContain('JOSELI SILVA WANDERLEY');
  });

  it('total de 45 rubricas (todas PGTO) — DESC encerra cada seção', () => {
    expect(result!.rubricas.length).toBe(45);
  });

  it('nenhum DESC no output (regra do escritório)', () => {
    const naoPgto = result!.rubricas.filter(r => r.classificacao !== 'PGTO');
    expect(naoPgto).toHaveLength(0);
  });

  it('0833 Desc. Insuf Saldo NÃO aparece (DESC encerra captura)', () => {
    expect(result!.rubricas.find(r => r.codigo === '0833')).toBeUndefined();
  });

  it('3049 classificado como PGTO (não DESC) — "desc" no nome não polui a classificação', () => {
    const r = result!.rubricas.find(r => r.codigo === '3049');
    expect(r).toBeDefined();
    expect(r!.classificacao).toBe('PGTO');
  });

  it('novos códigos DSR presentes: 3090, 3405, 4132', () => {
    expect(result!.rubricas.find(r => r.codigo === '3090')).toBeDefined(); // DSR s/ Média Horas N
    expect(result!.rubricas.find(r => r.codigo === '3405')).toBeDefined(); // R.S.R.COM.200%
    expect(result!.rubricas.find(r => r.codigo === '4132')).toBeDefined(); // DSR s/ Média Horas E
  });

  it('novos códigos comissão/prêmio presentes: 0710, 3303, 3423', () => {
    expect(result!.rubricas.find(r => r.codigo === '0710')).toBeDefined(); // Dia do Comerciário
    expect(result!.rubricas.find(r => r.codigo === '3303')).toBeDefined(); // INVENTARIO
    expect(result!.rubricas.find(r => r.codigo === '3423')).toBeDefined(); // GRATIFIC.-FERIADO
  });

  it('todos os DESCs estão ausentes (1108, 2824, 3640, 5560, etc)', () => {
    const descs = ['0521', '0833', '1108', '2824', '3640', '3669', '3673', '5500', '5560', '5580'];
    for (const code of descs) {
      expect(result!.rubricas.find(r => r.codigo === code), `${code} (DESC) não pode aparecer`).toBeUndefined();
    }
  });

  it('seções BASE/ENCAR/OUTRO/PROV não poluem o output (ex: 8100, 9920, 6400, 0720)', () => {
    const filteredCodes = ['8100', '8101', '9920', '6400', '6401', '0720', '3865'];
    for (const code of filteredCodes) {
      expect(result!.rubricas.find(r => r.codigo === code), `código ${code} não deve aparecer (BASE/ENCAR/OUTRO/PROV)`).toBeUndefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2019
// ─────────────────────────────────────────────────────────────────────────────

describe('Ficha Financeira — Joseli 2019 (5 seções ADP, corte no 1º DESC)', () => {
  let result: ReturnType<typeof parseFichaFinanceiraDeterministico>;

  beforeAll(() => {
    const texto = readFileSync(join(FIXTURE_DIR, 'ficha-joseli-2019-REAL.txt'), 'utf-8');
    result = parseFichaFinanceiraDeterministico(texto);
  });

  it('parser não retorna null', () => {
    expect(result).not.toBeNull();
  });

  it('ano = 2019', () => {
    expect(result!.ano).toBe(2019);
  });

  it('empregado = JOSELI SILVA WANDERLEY', () => {
    expect(result!.empregado).toContain('JOSELI SILVA WANDERLEY');
  });

  it('total de 57 rubricas (todas PGTO)', () => {
    expect(result!.rubricas.length).toBe(57);
  });

  it('nenhum DESC no output', () => {
    const naoPgto = result!.rubricas.filter(r => r.classificacao !== 'PGTO');
    expect(naoPgto).toHaveLength(0);
  });

  it('0833 Desc. Insuf Saldo NÃO aparece (DESC encerra captura)', () => {
    expect(result!.rubricas.find(r => r.codigo === '0833')).toBeUndefined();
  });

  it('novos códigos 2019 presentes: 3155, 4583, 7753, 4533, 7663, 4591', () => {
    expect(result!.rubricas.find(r => r.codigo === '3155')).toBeDefined(); // Dif Comissão Mes Ant
    expect(result!.rubricas.find(r => r.codigo === '4583')).toBeDefined(); // Compl Comissao Vend
    expect(result!.rubricas.find(r => r.codigo === '7753')).toBeDefined(); // R.S.R. TRABALHADO CO
    expect(result!.rubricas.find(r => r.codigo === '4533')).toBeDefined(); // Campanha Categorias
    expect(result!.rubricas.find(r => r.codigo === '7663')).toBeDefined(); // Comissão Venda Incen
    expect(result!.rubricas.find(r => r.codigo === '4591')).toBeDefined(); // Antec. Prêmio Vend I
  });
});
