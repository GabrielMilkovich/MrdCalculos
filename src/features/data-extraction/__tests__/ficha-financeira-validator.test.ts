import { describe, expect, it } from 'vitest';
import { validarFichaFinanceira } from '../validators/ficha-financeira-validator';
import Decimal from 'decimal.js';

describe('validarFichaFinanceira', () => {
  it('todas as competências dentro da tolerância → ok=true', () => {
    const rubricas = [
      {
        codigo: '0620',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [
          { competencia: '2016-01', valor: 1000 },
          { competencia: '2016-02', valor: 2000 },
        ],
      },
      {
        codigo: '0501',
        classificacao: 'PGTO',
        categoria: 'dsr',
        valores_mensais: [
          { competencia: '2016-01', valor: 300 },
          { competencia: '2016-02', valor: 500 },
        ],
      },
    ];

    const totais = new Map<string, number>([
      ['2016-01', 1300],
      ['2016-02', 2500],
    ]);

    const result = validarFichaFinanceira(rubricas, totais, 1.0);

    expect(result.ok).toBe(true);
    expect(result.resumo.competencias_ok).toBe(2);
    expect(result.resumo.competencias_fora).toBe(0);
    expect(result.resumo.competencias_sem_total).toBe(0);
  });

  it('competência fora da tolerância → ok=false', () => {
    const rubricas = [
      {
        codigo: '0620',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [
          { competencia: '2016-01', valor: 1000 },
          { competencia: '2016-02', valor: 2000 },
        ],
      },
    ];

    const totais = new Map<string, number>([
      ['2016-01', 1000],
      ['2016-02', 2500],
    ]);

    const result = validarFichaFinanceira(rubricas, totais, 1.0);

    expect(result.ok).toBe(false);
    expect(result.resumo.competencias_ok).toBe(1);
    expect(result.resumo.competencias_fora).toBe(1);
    const fora = result.competencias.find((c) => c.status === 'fora_tolerancia')!;
    expect(fora.competencia).toBe('2016-02');
    expect(fora.delta_pct.toNumber()).toBeGreaterThan(1.0);
  });

  it('rubricas DESC são ignoradas na soma', () => {
    const rubricas = [
      {
        codigo: '0620',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [{ competencia: '2016-01', valor: 1000 }],
      },
      {
        codigo: '5560',
        classificacao: 'DESC',
        categoria: 'desconto_inss',
        valores_mensais: [{ competencia: '2016-01', valor: 200 }],
      },
    ];

    const totais = new Map<string, number>([['2016-01', 1000]]);
    const result = validarFichaFinanceira(rubricas, totais, 1.0);

    expect(result.ok).toBe(true);
    const comp = result.competencias.find((c) => c.competencia === '2016-01')!;
    expect(comp.total_extraido.toNumber()).toBe(1000);
  });

  it('total PDF ausente → status total_pdf_ausente (não bloqueia)', () => {
    const rubricas = [
      {
        codigo: '0620',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [
          { competencia: '2016-01', valor: 1000 },
          { competencia: '2016-03', valor: 500 },
        ],
      },
    ];

    const totais = new Map<string, number>([['2016-01', 1000]]);
    const result = validarFichaFinanceira(rubricas, totais, 1.0);

    expect(result.ok).toBe(true);
    expect(result.resumo.competencias_sem_total).toBe(1);
    const ausente = result.competencias.find(
      (c) => c.status === 'total_pdf_ausente',
    )!;
    expect(ausente.competencia).toBe('2016-03');
    expect(ausente.total_pdf).toBeNull();
  });

  it('tolerância 0.5% é mais restritiva que 1%', () => {
    const rubricas = [
      {
        codigo: '0620',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [{ competencia: '2016-01', valor: 1007 }],
      },
    ];

    const totais = new Map<string, number>([['2016-01', 1000]]);

    const result05 = validarFichaFinanceira(rubricas, totais, 0.5);
    const result10 = validarFichaFinanceira(rubricas, totais, 1.0);

    expect(result05.ok).toBe(false);
    expect(result10.ok).toBe(true);
  });

  it('sem rubricas PGTO → ok=true (nada pra validar contra totais)', () => {
    const rubricas = [
      {
        codigo: '5560',
        classificacao: 'DESC',
        categoria: 'desconto_inss',
        valores_mensais: [{ competencia: '2016-01', valor: 200 }],
      },
    ];

    const totais = new Map<string, number>([['2016-01', 1000]]);
    const result = validarFichaFinanceira(rubricas, totais, 1.0);

    expect(result.resumo.competencias_sem_total).toBe(0);
    expect(result.resumo.competencias_fora).toBe(1);
  });

  it('pior_delta_pct reflete a maior divergência', () => {
    const rubricas = [
      {
        codigo: '0620',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [
          { competencia: '2016-01', valor: 1000 },
          { competencia: '2016-02', valor: 800 },
        ],
      },
    ];

    const totais = new Map<string, number>([
      ['2016-01', 1000],
      ['2016-02', 1000],
    ]);

    const result = validarFichaFinanceira(rubricas, totais, 1.0);
    expect(result.resumo.pior_delta_pct.toNumber()).toBeCloseTo(20, 0);
  });

  it('arredondamento de centavos não causa falso positivo com 1%', () => {
    const rubricas = [
      {
        codigo: '0620',
        classificacao: 'PGTO',
        categoria: 'comissao',
        valores_mensais: [{ competencia: '2016-01', valor: 5234.67 }],
      },
      {
        codigo: '0501',
        classificacao: 'PGTO',
        categoria: 'dsr',
        valores_mensais: [{ competencia: '2016-01', valor: 362.41 }],
      },
    ];

    const totais = new Map<string, number>([['2016-01', 5597.05]]);
    const result = validarFichaFinanceira(rubricas, totais, 1.0);

    expect(result.ok).toBe(true);
    const comp = result.competencias[0];
    expect(comp.delta_pct.toNumber()).toBeLessThan(0.01);
  });
});
