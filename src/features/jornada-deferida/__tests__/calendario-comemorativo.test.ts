import { describe, expect, it } from 'vitest';
import {
  dataDoAno,
  descreverRegra,
  gerarDatasNoIntervalo,
  REGRAS_DEFAULT_VAREJO,
  type RegraRecorrente,
} from '../calendario-comemorativo';

function iso(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

describe('calendario-comemorativo — datas fixas', () => {
  it('Véspera de Natal é 24/12 todo ano', () => {
    expect(iso(dataDoAno({ tipo: 'vespera_natal' }, 2024))).toBe('2024-12-24');
    expect(iso(dataDoAno({ tipo: 'vespera_natal' }, 2011))).toBe('2011-12-24');
  });

  it('Véspera de Ano Novo é 31/12', () => {
    expect(iso(dataDoAno({ tipo: 'vespera_ano_novo' }, 2024))).toBe('2024-12-31');
  });

  it('Dia dos Namorados é 12/06', () => {
    expect(iso(dataDoAno({ tipo: 'dia_dos_namorados' }, 2024))).toBe('2024-06-12');
  });

  it('Dia das Crianças é 12/10', () => {
    expect(iso(dataDoAno({ tipo: 'dia_das_criancas' }, 2024))).toBe('2024-10-12');
  });

  it('Dia fixo arbitrário', () => {
    expect(
      iso(dataDoAno({ tipo: 'dia_fixo', mes: 7, dia: 4 }, 2024)),
    ).toBe('2024-07-04');
  });
});

describe('calendario-comemorativo — Dia das Mães (2º domingo de maio)', () => {
  // Conferência manual: 2024 = 12/05, 2023 = 14/05, 2022 = 08/05, 2011 = 08/05.
  it('2024 → 12/05', () => {
    expect(iso(dataDoAno({ tipo: 'dia_das_maes' }, 2024))).toBe('2024-05-12');
  });
  it('2023 → 14/05', () => {
    expect(iso(dataDoAno({ tipo: 'dia_das_maes' }, 2023))).toBe('2023-05-14');
  });
  it('2011 → 08/05', () => {
    expect(iso(dataDoAno({ tipo: 'dia_das_maes' }, 2011))).toBe('2011-05-08');
  });
});

describe('calendario-comemorativo — Dia dos Pais (2º domingo de agosto)', () => {
  // 2024 = 11/08, 2011 = 14/08.
  it('2024 → 11/08', () => {
    expect(iso(dataDoAno({ tipo: 'dia_dos_pais' }, 2024))).toBe('2024-08-11');
  });
  it('2011 → 14/08', () => {
    expect(iso(dataDoAno({ tipo: 'dia_dos_pais' }, 2011))).toBe('2011-08-14');
  });
});

describe('calendario-comemorativo — Black Friday (última sexta de novembro)', () => {
  // 2024 = 29/11, 2023 = 24/11, 2011 = 25/11.
  it('2024 → 29/11', () => {
    expect(iso(dataDoAno({ tipo: 'black_friday' }, 2024))).toBe('2024-11-29');
  });
  it('2023 → 24/11', () => {
    expect(iso(dataDoAno({ tipo: 'black_friday' }, 2023))).toBe('2023-11-24');
  });
  it('2011 → 25/11', () => {
    expect(iso(dataDoAno({ tipo: 'black_friday' }, 2011))).toBe('2011-11-25');
  });

  it('Cyber Monday é segunda após Black Friday', () => {
    // BF 2024 = 29/11 (sex) → CM 2024 = 02/12 (seg)
    expect(iso(dataDoAno({ tipo: 'cyber_monday' }, 2024))).toBe('2024-12-02');
  });
});

describe('calendario-comemorativo — geração no intervalo', () => {
  it('Dia das Mães entre 2011 e 2016 → 6 datas', () => {
    const inicio = new Date(Date.UTC(2011, 0, 1));
    const fim = new Date(Date.UTC(2016, 11, 31));
    const datas = gerarDatasNoIntervalo({ tipo: 'dia_das_maes' }, inicio, fim);
    expect(datas).toHaveLength(6);
    expect(iso(datas[0])).toBe('2011-05-08');
    expect(iso(datas[5])).toBe('2016-05-08');
  });

  it('Janela menor que o ciclo da regra → 0 datas', () => {
    // Black Friday entre janeiro e março de 2024 → não cai aqui.
    const inicio = new Date(Date.UTC(2024, 0, 1));
    const fim = new Date(Date.UTC(2024, 2, 31));
    const datas = gerarDatasNoIntervalo({ tipo: 'black_friday' }, inicio, fim);
    expect(datas).toHaveLength(0);
  });

  it('Janela com ano fechado fora → 0', () => {
    const inicio = new Date(Date.UTC(2024, 0, 1));
    const fim = new Date(Date.UTC(2024, 0, 31));
    const datas = gerarDatasNoIntervalo({ tipo: 'vespera_natal' }, inicio, fim);
    expect(datas).toHaveLength(0);
  });
});

describe('calendario-comemorativo — defaults e descrições', () => {
  it('Defaults do varejo são 5 (Mães, Pais, BF, Vésp Natal, Vésp Ano Novo)', () => {
    expect(REGRAS_DEFAULT_VAREJO).toHaveLength(5);
  });

  it('descreverRegra retorna texto humano', () => {
    expect(descreverRegra({ tipo: 'black_friday' })).toMatch(/Black Friday/);
    expect(
      descreverRegra({ tipo: 'dia_fixo', mes: 12, dia: 24 }),
    ).toMatch(/24\/12/);
  });

  it('Cobertura: cada tipo de regra default tem descrição', () => {
    for (const r of REGRAS_DEFAULT_VAREJO) {
      expect(descreverRegra(r as RegraRecorrente).length).toBeGreaterThan(0);
    }
  });
});
