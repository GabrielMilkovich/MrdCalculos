import { describe, expect, it } from 'vitest';
import { buildHistoricoSalarialCSV } from '../export/csv-historico';
import type { CategoriaIncidenciaConfig, LinhaHistoricoSalarial } from '../types';

const cfg = (over: Partial<CategoriaIncidenciaConfig> = {}): CategoriaIncidenciaConfig => ({
  case_id: 'c1',
  categoria_id: 'cat',
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
  documentos_origem: [],
  ...over,
});

describe('buildHistoricoSalarialCSV', () => {
  it('header + 1 linha em formato BR', () => {
    const csv = buildHistoricoSalarialCSV([linha({ valor: 3500.5 })], cfg());
    expect(csv).toBe(
      'Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido\n' +
        '03/2024;3500,50;S;S;S;S\n',
    );
  });

  it('lista vazia = só header + newline', () => {
    expect(buildHistoricoSalarialCSV([], cfg())).toBe(
      'Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido\n',
    );
  });

  it('natureza_indenizatoria=true zera todas as flags', () => {
    const csv = buildHistoricoSalarialCSV(
      [linha()],
      cfg({ natureza_indenizatoria: true }),
    );
    expect(csv).toContain('03/2024;1000,00;N;N;N;N');
  });

  it('flags individuais respeitadas quando indenizatória=false', () => {
    const csv = buildHistoricoSalarialCSV(
      [linha()],
      cfg({ incide_fgts: true, fgts_recolhido: false, incide_inss: false, inss_recolhido: false }),
    );
    expect(csv).toContain('03/2024;1000,00;S;N;N;N');
  });

  it('valor com >2 casas decimais é truncado/arredondado', () => {
    const csv = buildHistoricoSalarialCSV([linha({ valor: 3500.567 })], cfg());
    expect(csv).toContain('3500,57');
  });

  it('múltiplas linhas concatenadas com \\n', () => {
    const csv = buildHistoricoSalarialCSV(
      [
        linha({ competencia: '01/2024', valor: 100 }),
        linha({ competencia: '02/2024', valor: 200 }),
      ],
      cfg(),
    );
    const lines = csv.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3); // header + 2 linhas
  });
});
