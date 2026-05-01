import { describe, expect, it } from 'vitest';
import { buildHistoricoSalarialCSV } from '../export/csv-historico';
import type { IncidenciaFlags, LinhaHistoricoSalarial } from '../types';

const flags = (over: Partial<IncidenciaFlags> = {}): IncidenciaFlags => ({
  incide_fgts: true,
  fgts_recolhido: true,
  incide_inss: true,
  inss_recolhido: true,
  natureza_indenizatoria: false,
  ...over,
});

const linha = (over: Partial<LinhaHistoricoSalarial> = {}): LinhaHistoricoSalarial => ({
  competencia: '03/2024',
  valor: 1000,
  ...over,
});

const HEADER =
  '"MES_ANO";"VALOR";"FGTS";"FGTS_REC.";"CONTRIBUICAO_SOCIAL";"CONTRIBUICAO_SOCIAL_REC."';
const CRLF = '\r\n';

describe('buildHistoricoSalarialCSV', () => {
  it('header + 1 linha com aspas em cada célula (formato oficial)', () => {
    const csv = buildHistoricoSalarialCSV([linha({ valor: 3500.5 })], flags());
    expect(csv).toBe(`${HEADER}${CRLF}"03/2024";"3500,50";"S";"S";"S";"S"${CRLF}`);
  });

  it('lista vazia = só header + CRLF', () => {
    expect(buildHistoricoSalarialCSV([], flags())).toBe(`${HEADER}${CRLF}`);
  });

  it('natureza_indenizatoria=true zera todas as flags', () => {
    const csv = buildHistoricoSalarialCSV(
      [linha()],
      flags({ natureza_indenizatoria: true }),
    );
    expect(csv).toContain('"03/2024";"1000,00";"N";"N";"N";"N"');
  });

  it('flags individuais respeitadas quando indenizatória=false', () => {
    const csv = buildHistoricoSalarialCSV(
      [linha()],
      flags({ incide_fgts: true, fgts_recolhido: false, incide_inss: false, inss_recolhido: false }),
    );
    expect(csv).toContain('"03/2024";"1000,00";"S";"N";"N";"N"');
  });

  it('valor com >2 casas decimais é arredondado', () => {
    const csv = buildHistoricoSalarialCSV([linha({ valor: 3500.567 })], flags());
    expect(csv).toContain('"3500,57"');
  });

  it('múltiplas linhas concatenadas com CRLF', () => {
    const csv = buildHistoricoSalarialCSV(
      [
        linha({ competencia: '01/2024', valor: 100 }),
        linha({ competencia: '02/2024', valor: 200 }),
      ],
      flags(),
    );
    const lines = csv.split(CRLF).filter(Boolean);
    expect(lines).toHaveLength(3); // header + 2 linhas
  });
});
