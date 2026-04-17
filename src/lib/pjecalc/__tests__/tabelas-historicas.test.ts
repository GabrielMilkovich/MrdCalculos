/**
 * Testes das tabelas históricas INSS / IR / Salário Mínimo.
 */
import { describe, it, expect } from 'vitest';
import {
  INSS_FAIXAS_HISTORICO,
  IR_FAIXAS_HISTORICO,
  SALARIO_MINIMO_HISTORICO,
  faixaINSSNaCompetencia,
  faixaIRNaCompetencia,
  salarioMinimoNaCompetencia,
} from '../tabelas-historicas';

describe('tabelas-historicas — cobertura temporal', () => {
  it('INSS_FAIXAS_HISTORICO cobre 1996-2025 com pelo menos 8 entradas', () => {
    expect(INSS_FAIXAS_HISTORICO.length).toBeGreaterThanOrEqual(8);
    const anos = INSS_FAIXAS_HISTORICO.map((r) => r.competencia_inicio.slice(0, 4));
    expect(anos).toContain('1996');
    expect(anos).toContain('2025');
  });

  it('IR_FAIXAS_HISTORICO cobre 1996-2024+ com pelo menos 6 entradas', () => {
    expect(IR_FAIXAS_HISTORICO.length).toBeGreaterThanOrEqual(6);
    const primeiro = IR_FAIXAS_HISTORICO[0];
    expect(primeiro.competencia_inicio).toBe('1996-01-01');
    const ultimoAberto = IR_FAIXAS_HISTORICO.find((r) => r.competencia_fim === null);
    expect(ultimoAberto).toBeDefined();
  });

  it('SALARIO_MINIMO_HISTORICO tem pelo menos 40 entradas', () => {
    expect(SALARIO_MINIMO_HISTORICO.length).toBeGreaterThanOrEqual(40);
  });
});

describe('tabelas-historicas — helpers de competência', () => {
  it('faixaINSSNaCompetencia retorna faixa correta para 2020-05 (pós-EC 103)', () => {
    const reg = faixaINSSNaCompetencia('2020-05');
    expect(reg).not.toBeNull();
    expect(reg!.faixas.length).toBe(4); // 4 faixas = progressivo EC 103
    expect(reg!.faixas[0].aliquota).toBe(0.075);
  });

  it('faixaINSSNaCompetencia retorna faixa pré-EC 103 para 2019-06', () => {
    const reg = faixaINSSNaCompetencia('2019-06');
    expect(reg).not.toBeNull();
    expect(reg!.faixas.length).toBe(3);
    expect(reg!.faixas[0].aliquota).toBe(0.08);
  });

  it('faixaIRNaCompetencia retorna tabela 2015-04 congelada para 2020-01', () => {
    const reg = faixaIRNaCompetencia('2020-01');
    expect(reg).not.toBeNull();
    expect(reg!.faixas[0].ate).toBe(1903.98);
    expect(reg!.deducao_dependente).toBe(189.59);
  });

  it('faixaIRNaCompetencia retorna tabela 2024 para 2025-06', () => {
    const reg = faixaIRNaCompetencia('2025-06');
    expect(reg).not.toBeNull();
    expect(reg!.faixas[0].ate).toBe(2259.20);
  });

  it('salarioMinimoNaCompetencia retorna valor correto por vigência', () => {
    expect(salarioMinimoNaCompetencia('2024-05')).toBe(1412.00);
    expect(salarioMinimoNaCompetencia('2021-06')).toBe(1100.00);
    expect(salarioMinimoNaCompetencia('1994-07')).toBe(64.79);
    expect(salarioMinimoNaCompetencia('1985-01')).toBe(0); // pré-cobertura
  });
});

describe('tabelas-historicas — consistência monetária', () => {
  it('teto INSS é monotônico não-decrescente em BRL pós-1996', () => {
    const tetos = INSS_FAIXAS_HISTORICO.map((r) => ({
      ano: r.competencia_inicio.slice(0, 4),
      teto: r.teto,
    }));
    for (let i = 1; i < tetos.length; i++) {
      expect(tetos[i].teto).toBeGreaterThanOrEqual(tetos[i - 1].teto);
    }
  });

  it('faixas INSS dentro de cada registro são crescentes em valor_ate', () => {
    for (const reg of INSS_FAIXAS_HISTORICO) {
      for (let i = 1; i < reg.faixas.length; i++) {
        expect(reg.faixas[i].ate).toBeGreaterThan(reg.faixas[i - 1].ate);
      }
    }
  });

  it('faixas IR dentro de cada registro são crescentes (exceto infinity final)', () => {
    for (const reg of IR_FAIXAS_HISTORICO) {
      for (let i = 1; i < reg.faixas.length; i++) {
        const prev = reg.faixas[i - 1].ate;
        const cur = reg.faixas[i].ate;
        expect(cur).toBeGreaterThan(prev);
      }
      // última faixa deve ser a com maior alíquota (27.5%)
      expect(reg.faixas[reg.faixas.length - 1].aliquota).toBe(0.275);
    }
  });
});
