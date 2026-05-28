// Tests for the Joseli ADP ficha financeira fixtures (2016 and 2019).
//
// These fichas have 5 sections (vs. Roque's 2):
//   Section 1: Jan-Jul  PGTO/DESC
//   Section 2: Jan-Jul  OUTRO/PROV   ← filtered by BASE/ENCAR/OUTRO/PROV filter
//   Section 3: Aug-Dec  PGTO/DESC    ← cutoff at 0833
//   Section 4: Aug-Dec  BASE/ENCAR   ← filtered
//   Section 5: Aug-Dec  OUTRO/PROV   ← filtered
//
// Key invariants tested:
//  - Correct rubrica count (not 186 / not inflated by filtered sections)
//  - 0833 sentinel IS in output (per spec: "inclusive")
//  - Post-cutoff codes that appear ONLY after 0833 are excluded
//  - Codes in both section 1 and after-0833 in section 3 have only Jan-Jul values
//  - New group-mapping codes (3090 → dsr, 3405 → dsr, 3423 → premios, 0710 → comissao_produtos)
//  - 3049 "Reemb desc I Contr A" is correctly PGTO (not mis-classified as DESC due to "desc" in name)

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFichaFinanceiraDeterministico } from '../ficha-financeira-deterministic';

const FIXTURE_DIR = join(__dirname, '../_fixtures');

// ─────────────────────────────────────────────────────────────────────────────
// 2016
// ─────────────────────────────────────────────────────────────────────────────

describe('Ficha Financeira — Joseli 2016 (5 seções ADP)', () => {
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

  it('total de 69 rubricas (45 PGTO + 24 DESC) — seções BASE/ENCAR/OUTRO/PROV filtradas', () => {
    expect(result!.rubricas.length).toBe(69);
  });

  it('0833 Desc. Insuf Saldo está presente (sentinel incluído per spec)', () => {
    const r = result!.rubricas.find(r => r.codigo === '0833');
    expect(r).toBeDefined();
    expect(r!.classificacao).toBe('DESC');
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

  it('0521 presente (aparece ANTES de 0833 na seção Aug-Dec)', () => {
    expect(result!.rubricas.find(r => r.codigo === '0521')).toBeDefined();
  });

  it('códigos que aparecem APENAS após 0833 na seção Aug-Dec estão ausentes', () => {
    // These codes only exist after 0833 in section 3 — should be excluded
    const postCutoff = ['3514', '5250', '5323', '7037', '9960', '3623'];
    for (const code of postCutoff) {
      expect(result!.rubricas.find(r => r.codigo === code), `código ${code} não deve estar no output`).toBeUndefined();
    }
  });

  it('5560 INSS tem apenas valores Jan-Jul (Aug-Dec bloqueados pelo cutoff)', () => {
    const r5560 = result!.rubricas.find(r => r.codigo === '5560');
    expect(r5560).toBeDefined();
    const competencias = r5560!.valores_mensais.map(v => v.competencia);
    // Only months 01-07 should be present
    for (const comp of competencias) {
      const mes = comp.split('-')[1];
      expect(Number(mes), `mês ${comp} não deveria estar em 5560`).toBeLessThanOrEqual(7);
    }
    // At least some Jan-Jul months should be present
    expect(competencias.length).toBeGreaterThan(0);
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

describe('Ficha Financeira — Joseli 2019 (5 seções ADP)', () => {
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

  it('total de 85 rubricas — seções BASE/ENCAR/OUTRO/PROV filtradas', () => {
    expect(result!.rubricas.length).toBe(85);
  });

  it('0833 Desc. Insuf Saldo está presente', () => {
    const r = result!.rubricas.find(r => r.codigo === '0833');
    expect(r).toBeDefined();
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
