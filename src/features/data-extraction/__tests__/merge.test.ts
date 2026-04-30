import { describe, expect, it } from 'vitest';
import {
  applyResolutions,
  countPendingConflicts,
  mergeFaltas,
  mergeFerias,
  mergeHistoricoSalarial,
  mergeRows,
} from '../merge';
import type { FaltasRow, FeriasRow, HistoricoSalarialRow } from '../types';

const SOURCE_A = { documentId: 'doc-a', documentName: 'a.pdf' };
const SOURCE_B = { documentId: 'doc-b', documentName: 'b.pdf' };

describe('mergeRows (genérico)', () => {
  it('linhas únicas vão para merged', () => {
    const r = mergeRows(
      [{ k: 'a', v: 1 }, { k: 'b', v: 2 }],
      r => r.k,
      (a, b) => a.k === b.k && a.v === b.v,
    );
    expect(r.merged).toHaveLength(2);
    expect(r.conflicts).toHaveLength(0);
  });

  it('deduplica linhas idênticas com mesma key', () => {
    const r = mergeRows(
      [{ k: 'a', v: 1 }, { k: 'a', v: 1 }],
      r => r.k,
      (a, b) => a.k === b.k && a.v === b.v,
    );
    expect(r.merged).toHaveLength(1);
    expect(r.conflicts).toHaveLength(0);
  });

  it('detecta conflito com mesma key e dados diferentes', () => {
    const r = mergeRows(
      [{ k: 'a', v: 1 }, { k: 'a', v: 2 }],
      r => r.k,
      (a, b) => a.k === b.k && a.v === b.v,
    );
    expect(r.merged).toHaveLength(0);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].candidates).toHaveLength(2);
  });
});

describe('mergeHistoricoSalarial', () => {
  it('merge de 2 docs sem conflito (mesma comp, mesmos valores)', () => {
    const rows: HistoricoSalarialRow[] = [
      { competencia: '03/2024', valor: 3500, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true, _source: SOURCE_A },
      { competencia: '03/2024', valor: 3500, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true, _source: SOURCE_B },
    ];
    const r = mergeHistoricoSalarial(rows);
    expect(r.merged).toHaveLength(1);
    expect(r.conflicts).toHaveLength(0);
  });

  it('conflito quando valores divergem na mesma competência', () => {
    const rows: HistoricoSalarialRow[] = [
      { competencia: '03/2024', valor: 3500, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true, _source: SOURCE_A },
      { competencia: '03/2024', valor: 3600, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true, _source: SOURCE_B },
    ];
    const r = mergeHistoricoSalarial(rows);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].candidates[0]._source?.documentId).toBe('doc-a');
    expect(r.conflicts[0].candidates[1]._source?.documentId).toBe('doc-b');
  });

  it('conflito por flag divergente (incideFgts)', () => {
    const rows: HistoricoSalarialRow[] = [
      { competencia: '03/2024', valor: 3500, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: '03/2024', valor: 3500, incideFgts: false, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
    ];
    expect(mergeHistoricoSalarial(rows).conflicts).toHaveLength(1);
  });
});

describe('mergeFerias', () => {
  it('mesma relativa + dados iguais → dedup', () => {
    const rows: FeriasRow[] = [
      { relativa: '2023/2024', prazo: 30, situacao: 'G', dobraGeral: false, abono: false, diasAbono: 0, _source: SOURCE_A },
      { relativa: '2023/2024', prazo: 30, situacao: 'G', dobraGeral: false, abono: false, diasAbono: 0, _source: SOURCE_B },
    ];
    expect(mergeFerias(rows).merged).toHaveLength(1);
  });

  it('gozo1 divergente → conflito', () => {
    const rows: FeriasRow[] = [
      { relativa: '2023/2024', prazo: 30, situacao: 'G', dobraGeral: false, abono: false, diasAbono: 0, gozo1: { inicio: '01/06/2024', fim: '20/06/2024', dobra: false } },
      { relativa: '2023/2024', prazo: 30, situacao: 'G', dobraGeral: false, abono: false, diasAbono: 0, gozo1: { inicio: '01/07/2024', fim: '20/07/2024', dobra: false } },
    ];
    expect(mergeFerias(rows).conflicts).toHaveLength(1);
  });
});

describe('mergeFaltas', () => {
  it('mesmo intervalo de datas + mesmas flags → dedup', () => {
    const rows: FaltasRow[] = [
      { dataInicio: '15/03/2024', dataFim: '15/03/2024', justificada: true, reiniciarPeriodoAquisitivo: false, justificativa: 'doc A texto' },
      { dataInicio: '15/03/2024', dataFim: '15/03/2024', justificada: true, reiniciarPeriodoAquisitivo: false, justificativa: 'doc B texto' },
    ];
    // justificativa NÃO entra no equals (texto pode variar entre docs)
    expect(mergeFaltas(rows).merged).toHaveLength(1);
  });

  it('flag justificada divergente → conflito', () => {
    const rows: FaltasRow[] = [
      { dataInicio: '15/03/2024', dataFim: '15/03/2024', justificada: true, reiniciarPeriodoAquisitivo: false },
      { dataInicio: '15/03/2024', dataFim: '15/03/2024', justificada: false, reiniciarPeriodoAquisitivo: false },
    ];
    expect(mergeFaltas(rows).conflicts).toHaveLength(1);
  });

  it('intervalos diferentes → 2 merged', () => {
    const rows: FaltasRow[] = [
      { dataInicio: '15/03/2024', dataFim: '15/03/2024', justificada: true, reiniciarPeriodoAquisitivo: false },
      { dataInicio: '20/03/2024', dataFim: '20/03/2024', justificada: true, reiniciarPeriodoAquisitivo: false },
    ];
    expect(mergeFaltas(rows).merged).toHaveLength(2);
  });
});

describe('applyResolutions', () => {
  it('aplica escolha do usuário e move conflito para merged', () => {
    const rows: HistoricoSalarialRow[] = [
      { competencia: '03/2024', valor: 3500, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: '03/2024', valor: 3600, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
    ];
    const raw = mergeHistoricoSalarial(rows);
    const resolution = new Map([['03/2024', 1]]); // escolhe 3600
    const out = applyResolutions(raw, resolution);
    expect(out.merged).toHaveLength(1);
    expect(out.merged[0].valor).toBe(3600);
    expect(out.pending).toHaveLength(0);
  });

  it('conflito sem resolução fica em pending', () => {
    const rows: HistoricoSalarialRow[] = [
      { competencia: '03/2024', valor: 3500, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: '03/2024', valor: 3600, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
    ];
    const raw = mergeHistoricoSalarial(rows);
    const out = applyResolutions(raw, new Map());
    expect(out.pending).toHaveLength(1);
  });
});

describe('countPendingConflicts', () => {
  it('conta conflitos sem resolução', () => {
    const rows: HistoricoSalarialRow[] = [
      { competencia: '03/2024', valor: 3500, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: '03/2024', valor: 3600, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: '04/2024', valor: 1000, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      { competencia: '04/2024', valor: 1100, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
    ];
    const raw = mergeHistoricoSalarial(rows);
    expect(countPendingConflicts(raw, new Map())).toBe(2);
    expect(countPendingConflicts(raw, new Map([['03/2024', 0]]))).toBe(1);
    expect(countPendingConflicts(raw, new Map([['03/2024', 0], ['04/2024', 1]]))).toBe(0);
  });
});
