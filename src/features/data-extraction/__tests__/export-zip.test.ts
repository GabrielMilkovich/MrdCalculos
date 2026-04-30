import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';

import { buildExportZip } from '../export-zip';

describe('buildExportZip', () => {
  it('gera ZIP com 3 CSVs + LEIA-ME', async () => {
    const blob = await buildExportZip({
      historicoSalarial: [
        { competencia: '03/2024', valor: 3500, incideFgts: true, fgtsRecolhido: true, incideInss: true, inssRecolhido: true },
      ],
      ferias: [
        { relativa: '2023/2024', prazo: 30, situacao: 'G', dobraGeral: false, abono: false, diasAbono: 0 },
      ],
      faltas: [
        { dataInicio: '15/03/2024', dataFim: '15/03/2024', justificada: true, reiniciarPeriodoAquisitivo: false },
      ],
      caseLabel: 'João da Silva',
    });

    const buf = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual([
      'LEIA-ME.txt',
      'faltas.csv',
      'ferias.csv',
      'historico_salarial.csv',
    ]);

    const historico = await zip.files['historico_salarial.csv'].async('string');
    expect(historico).toContain('03/2024;3500,00;S;S;S;S');

    const ferias = await zip.files['ferias.csv'].async('string');
    expect(ferias).toContain('2023/2024;30;G;');

    const faltas = await zip.files['faltas.csv'].async('string');
    expect(faltas).toContain('15/03/2024;15/03/2024;S;N;');

    const readme = await zip.files['LEIA-ME.txt'].async('string');
    expect(readme).toContain('PJe-Calc Cidadão');
    expect(readme).toContain('João da Silva');
    expect(readme).toContain('UTF-8');
    expect(readme).toContain('ponto-e-vírgula');
  });

  it('lista vazia → CSVs com só header', async () => {
    const blob = await buildExportZip({
      historicoSalarial: [],
      ferias: [],
      faltas: [],
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const historico = await zip.files['historico_salarial.csv'].async('string');
    expect(historico).toBe('Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido\n');
  });

  it('LEIA-ME sem caseLabel não quebra', async () => {
    const blob = await buildExportZip({
      historicoSalarial: [],
      ferias: [],
      faltas: [],
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const readme = await zip.files['LEIA-ME.txt'].async('string');
    expect(readme).not.toContain('Caso:');
    expect(readme).toContain('Gerado em:');
  });
});
