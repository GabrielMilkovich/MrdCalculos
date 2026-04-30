import { describe, expect, it } from 'vitest';
import {
  buildFaltasCSV,
  buildFeriasCSV,
  buildHistoricoSalarialCSV,
  countValidLines,
} from '../export-csv';
import type { FaltasRow, FeriasRow, HistoricoSalarialRow } from '../types';

describe('buildHistoricoSalarialCSV', () => {
  it('produz CSV com header + 1 linha formato BR', () => {
    const csv = buildHistoricoSalarialCSV([
      { competencia: '03/2024', valor: 3500.5, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
    ]);
    expect(csv).toBe(
      'Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido\n' +
      '03/2024;3500,50;S;S;S;S\n',
    );
  });

  it('decimal grande sem separador de milhar', () => {
    const csv = buildHistoricoSalarialCSV([
      { competencia: '03/2024', valor: 12345.67, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
    ]);
    expect(csv).toContain('12345,67');
    expect(csv).not.toContain('12.345,67');
    expect(csv).not.toContain('12345.67');
  });

  it('boolean false vira N', () => {
    const csv = buildHistoricoSalarialCSV([
      { competencia: '03/2024', valor: 1000, incideFgts: false, fgtsRecolhido: false, incideInss: false, inssRecolhido: false },
    ]);
    expect(csv).toContain('03/2024;1000,00;N;N;N;N');
  });

  it('descarta competência inválida', () => {
    const csv = buildHistoricoSalarialCSV([
      { competencia: '13/2024', valor: 1000, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: '03/2024', valor: 1000, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
    ]);
    expect(csv.split('\n').filter(l => l.includes('1000'))).toHaveLength(1);
  });

  it('descarta valor negativo ou NaN', () => {
    const csv = buildHistoricoSalarialCSV([
      { competencia: '03/2024', valor: -100, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: '04/2024', valor: NaN, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
    ]);
    expect(csv.split('\n').filter(l => l.startsWith('0')).length).toBe(0);
  });

  it('lista vazia = só header + newline', () => {
    expect(buildHistoricoSalarialCSV([])).toBe(
      'Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido\n',
    );
  });
});

describe('buildFeriasCSV', () => {
  it('linha sem gozos: 15 colunas com vazios entre delimitadores', () => {
    const csv = buildFeriasCSV([
      { relativa: '2023/2024', prazo: 30, situacao: 'G', dobraGeral: false, abono: false, diasAbono: 0 },
    ]);
    expect(csv).toContain('2023/2024;30;G;N;N;0;;;N;;;N;;;N');
  });

  it('linha com gozo1 preenchido', () => {
    const csv = buildFeriasCSV([{
      relativa: '2023/2024',
      prazo: 30,
      situacao: 'G',
      dobraGeral: false,
      abono: true,
      diasAbono: 10,
      gozo1: { inicio: '01/06/2024', fim: '20/06/2024', dobra: false },
    }]);
    expect(csv).toContain('2023/2024;30;G;N;S;10;01/06/2024;20/06/2024;N;;;N;;;N');
  });

  it('descarta situação inválida', () => {
    const csv = buildFeriasCSV([
      { relativa: '2023/2024', prazo: 30, situacao: 'X' as never, dobraGeral: false, abono: false, diasAbono: 0 },
    ]);
    expect(csv.split('\n').length).toBe(2); // só header + newline final
  });

  it('descarta gozo com data inválida (degrada para vazio + N)', () => {
    const csv = buildFeriasCSV([{
      relativa: '2023/2024',
      prazo: 30,
      situacao: 'G',
      dobraGeral: false,
      abono: false,
      diasAbono: 0,
      gozo1: { inicio: '32/06/2024', fim: '20/06/2024', dobra: false },
    }]);
    expect(csv).toContain('2023/2024;30;G;N;N;0;;;N;;;N;;;N');
  });

  it('descarta prazo > 90 ou negativo', () => {
    const csv = buildFeriasCSV([
      { relativa: '2023/2024', prazo: 200, situacao: 'G', dobraGeral: false, abono: false, diasAbono: 0 },
    ]);
    expect(csv.split('\n').length).toBe(2); // só header
  });
});

describe('buildFaltasCSV', () => {
  it('5 colunas, sanitiza ; \\n " na justificativa', () => {
    const csv = buildFaltasCSV([{
      dataInicio: '15/03/2024',
      dataFim: '15/03/2024',
      justificada: true,
      reiniciarPeriodoAquisitivo: false,
      justificativa: 'Atestado; "médico"\nlinha 2',
    }]);
    // 3 espaços onde tinha '; "' (cada char inválido = 1 space)
    expect(csv).toContain('15/03/2024;15/03/2024;S;N;Atestado   médico  linha 2');
    expect(csv).not.toContain(';"');
    expect(csv).not.toContain(';;');  // sem campo extra acidental
  });

  it('trunca justificativa em 200 chars', () => {
    const csv = buildFaltasCSV([{
      dataInicio: '15/03/2024',
      dataFim: '15/03/2024',
      justificada: true,
      reiniciarPeriodoAquisitivo: false,
      justificativa: 'a'.repeat(300),
    }]);
    const lastField = csv.split('\n')[1].split(';')[4];
    expect(lastField).toHaveLength(200);
  });

  it('justificativa undefined → string vazia', () => {
    const csv = buildFaltasCSV([{
      dataInicio: '15/03/2024',
      dataFim: '15/03/2024',
      justificada: false,
      reiniciarPeriodoAquisitivo: false,
    }]);
    expect(csv).toContain('15/03/2024;15/03/2024;N;N;\n');
  });

  it('descarta linha com data inválida', () => {
    const csv = buildFaltasCSV([
      { dataInicio: '32/03/2024', dataFim: '15/03/2024', justificada: true, reiniciarPeriodoAquisitivo: false },
      { dataInicio: '15/03/2024', dataFim: '15/03/2024', justificada: true, reiniciarPeriodoAquisitivo: false },
    ]);
    expect(csv.split('\n').filter(l => l.includes('15/03/2024'))).toHaveLength(1);
  });

  it('reiniciarPeriodoAquisitivo=true gera S', () => {
    const csv = buildFaltasCSV([{
      dataInicio: '15/03/2024',
      dataFim: '15/03/2024',
      justificada: false,
      reiniciarPeriodoAquisitivo: true,
    }]);
    expect(csv).toContain(';N;S;');
  });
});

describe('countValidLines', () => {
  it('histórico: 2 válidas, 1 inválida → 2', () => {
    const rows: HistoricoSalarialRow[] = [
      { competencia: '03/2024', valor: 1000, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: '04/2024', valor: 1100, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: 'XX', valor: 999, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
    ];
    expect(countValidLines('historico_salarial', rows)).toBe(2);
  });

  it('férias: 1 válida → 1', () => {
    const rows: FeriasRow[] = [
      { relativa: '2023/2024', prazo: 30, situacao: 'G', dobraGeral: false, abono: false, diasAbono: 0 },
    ];
    expect(countValidLines('ferias', rows)).toBe(1);
  });

  it('faltas: lista vazia → 0', () => {
    expect(countValidLines('faltas', [] as FaltasRow[])).toBe(0);
  });
});
