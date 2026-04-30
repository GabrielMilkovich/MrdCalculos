import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  buildZip,
  buildZipFilename,
  countCsvsToExport,
  sanitizeFilename,
} from '../export/zip';
import type { CategoriaIncidenciaConfig, ZipExportPayload } from '../types';

const cfg: CategoriaIncidenciaConfig = {
  case_id: 'c1',
  categoria_id: 'cat',
  incide_fgts: true,
  fgts_recolhido: true,
  incide_inss: true,
  inss_recolhido: true,
  natureza_indenizatoria: false,
};

const payload = (over: Partial<ZipExportPayload> = {}): ZipExportPayload => ({
  caseSlug: 'caso-teste',
  numeroProcesso: '0001234-56.2024',
  historicoSalarialCSVs: [],
  feriasCsv: null,
  faltasCsv: null,
  ...over,
});

describe('sanitizeFilename', () => {
  it('remove path traversal e chars perigosos', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('....etcpasswd');
    expect(sanitizeFilename('a:b*c?d')).toBe('abcd');
  });
  it('colapsa espaços em hífen', () => {
    expect(sanitizeFilename('hello world')).toBe('hello-world');
  });
  it('limita 80 chars', () => {
    expect(sanitizeFilename('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('buildZipFilename', () => {
  it('formato pjecalc_export_{slug}_{YYYYMMDD}.zip', () => {
    expect(buildZipFilename('caso-x', '2024-03-15')).toBe(
      'pjecalc_export_caso-x_20240315.zip',
    );
  });
});

describe('countCsvsToExport', () => {
  it('conta apenas CSVs com linhas > 0', () => {
    const p = payload({
      historicoSalarialCSVs: [
        { slug: 'comissao', nomePjecalc: 'Comissões', csv: '...', config: cfg, linhas: 5 },
        { slug: 'dsr', nomePjecalc: 'DSR', csv: '...', config: cfg, linhas: 0 },
      ],
      feriasCsv: { csv: '...', linhas: 2 },
      faltasCsv: null,
    });
    expect(countCsvsToExport(p)).toBe(2); // comissao + ferias
  });
});

describe('buildZip', () => {
  it('empacota CSVs + LEIA-ME e omite categorias com 0 linhas', async () => {
    const blob = await buildZip(
      payload({
        historicoSalarialCSVs: [
          { slug: 'comissao', nomePjecalc: 'Comissões', csv: 'h;v\n1;2\n', config: cfg, linhas: 1 },
          { slug: 'dsr', nomePjecalc: 'DSR', csv: '', config: cfg, linhas: 0 },
        ],
        feriasCsv: { csv: 'h\nx\n', linhas: 1 },
        faltasCsv: null,
      }),
    );

    const buf = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    const names = Object.keys(zip.files).sort();
    expect(names).toContain('historico_salarial_comissao.csv');
    expect(names).not.toContain('historico_salarial_dsr.csv');
    expect(names).toContain('ferias.csv');
    expect(names).not.toContain('faltas.csv');
    expect(names).toContain('LEIA-ME.txt');
  });

  it('LEIA-ME contém nome PJe-Calc e flags', async () => {
    const blob = await buildZip(
      payload({
        historicoSalarialCSVs: [
          {
            slug: 'comissao',
            nomePjecalc: 'Comissões',
            csv: '...',
            config: { ...cfg, natureza_indenizatoria: true },
            linhas: 5,
          },
        ],
      }),
    );
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const leiame = await zip.file('LEIA-ME.txt')!.async('text');
    expect(leiame).toContain('Comissões');
    expect(leiame).toContain('NATUREZA INDENIZATÓRIA');
  });
});
