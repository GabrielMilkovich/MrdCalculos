import { describe, expect, it } from 'vitest';
import { buildFaltasCSV, type FaltaCsvLinha } from '../export/csv-faltas';

const minima = (over: Partial<FaltaCsvLinha> = {}): FaltaCsvLinha => ({
  data_inicio: '2024-03-15',
  data_fim: '2024-03-15',
  justificada: true,
  reiniciar_periodo_aquisitivo: false,
  justificativa: null,
  ...over,
});

const CRLF = '\r\n';

describe('buildFaltasCSV', () => {
  it('5 colunas com aspas; justificativa null vazia (sem aspas)', () => {
    const csv = buildFaltasCSV([minima()]);
    // Oficial: "23/12/2018";"23/12/2018";"N";"N";
    expect(csv).toContain('"15/03/2024";"15/03/2024";"S";"N";');
  });

  it('sanitiza ; \\n " na justificativa', () => {
    const csv = buildFaltasCSV([
      minima({ justificativa: 'Atestado; "médico"\nlinha 2' }),
    ]);
    // sanitizeText troca ; \n " por espaço
    expect(csv).toContain('"Atestado   médico  linha 2"');
  });

  it('trunca justificativa em 200 chars', () => {
    const csv = buildFaltasCSV([minima({ justificativa: 'a'.repeat(300) })]);
    const lastField = csv.split(CRLF)[1].split(';')[4];
    // remove aspas envolvendo
    const inner = lastField.replace(/^"|"$/g, '');
    expect(inner).toHaveLength(200);
  });

  it('justificativa null → célula totalmente vazia (sem aspas)', () => {
    const csv = buildFaltasCSV([minima({ justificativa: null })]);
    expect(csv).toContain(`"15/03/2024";"15/03/2024";"S";"N";${CRLF}`);
  });

  it('reiniciarPeriodoAquisitivo=true gera "S" na 4ª coluna', () => {
    const csv = buildFaltasCSV([
      minima({ justificada: false, reiniciar_periodo_aquisitivo: true }),
    ]);
    expect(csv).toContain('"N";"S";');
  });

  it('lista vazia = só header em CRLF, 5 colunas', () => {
    const csv = buildFaltasCSV([]);
    expect(csv.split(CRLF).filter(Boolean)).toHaveLength(1);
    expect(csv.split(CRLF)[0].split(';')).toHaveLength(5);
  });
});
