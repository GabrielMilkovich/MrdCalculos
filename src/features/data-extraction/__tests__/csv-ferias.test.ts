import { describe, expect, it } from 'vitest';
import { buildFeriasCSV } from '../export/csv-ferias';
import type { FeriasExtraida } from '../types';

const minima = (over: Partial<FeriasExtraida> = {}): FeriasExtraida => ({
  id: 'f1',
  document_id: 'd1',
  case_id: 'c1',
  relativa: '2023/2024',
  prazo: 30,
  situacao: 'G',
  dobra_geral: false,
  abono: false,
  dias_abono: 0,
  gozo1: null,
  gozo2: null,
  gozo3: null,
  incluir: true,
  ...over,
});

describe('buildFeriasCSV', () => {
  it('15 colunas com gozos vazios entre delimitadores + dobra=N', () => {
    const csv = buildFeriasCSV([minima()]);
    expect(csv).toContain('2023/2024;30;G;N;N;0;;;N;;;N;;;N');
  });

  it('com gozo1 preenchido', () => {
    const csv = buildFeriasCSV([
      minima({
        abono: true,
        dias_abono: 10,
        gozo1: { inicio: '01/06/2024', fim: '20/06/2024', dobra: false },
      }),
    ]);
    expect(csv).toContain('2023/2024;30;G;N;S;10;01/06/2024;20/06/2024;N;;;N;;;N');
  });

  it('com 3 gozos preenchidos + dobra mista', () => {
    const csv = buildFeriasCSV([
      minima({
        gozo1: { inicio: '01/06/2024', fim: '10/06/2024', dobra: true },
        gozo2: { inicio: '11/06/2024', fim: '20/06/2024', dobra: false },
        gozo3: { inicio: '21/06/2024', fim: '30/06/2024', dobra: false },
      }),
    ]);
    expect(csv).toContain(
      '2023/2024;30;G;N;N;0;01/06/2024;10/06/2024;S;11/06/2024;20/06/2024;N;21/06/2024;30/06/2024;N',
    );
  });

  it('lista vazia = só header', () => {
    const csv = buildFeriasCSV([]);
    expect(csv.split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('header tem 15 colunas separadas por ;', () => {
    const csv = buildFeriasCSV([]);
    const header = csv.split('\n')[0];
    expect(header.split(';')).toHaveLength(15);
  });
});
