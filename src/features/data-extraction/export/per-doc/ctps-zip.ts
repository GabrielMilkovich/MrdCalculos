/**
 * CTPS — Carteira de Trabalho. Documento que contém férias E faltas no
 * mesmo OCR. Em vez de forçar o operador a classificar como um OU outro
 * (perdendo metade), o pipeline `ctps`:
 *
 *   1. Roda `parseFerias` e `parseFaltas` SOBRE O MESMO OCR.
 *   2. Apresenta ambos no `CtpsReviewDialog` (tabs Férias / Faltas).
 *   3. Gera 1 ZIP com 2 CSVs:
 *        - `recibo_ferias.csv` (formato oficial PJe-Calc)
 *        - `registro_faltas.csv` (formato oficial PJe-Calc)
 *      + LEIA-ME explicando como importar cada um.
 */

import JSZip from 'jszip';
import { buildFeriasCSV } from '../csv-ferias';
import { buildFaltasCSV } from '../csv-faltas';
import type { ParseFeriasResult } from '../../parsers/ferias';
import type { ParseFaltasResult } from '../../parsers/faltas';

export interface CtpsExportInput {
  ferias: ParseFeriasResult;
  faltas: ParseFaltasResult;
  baseFilename: string;
}

export async function buildCtpsZip(input: CtpsExportInput): Promise<Blob> {
  const zip = new JSZip();

  if (input.ferias.ferias.length > 0) {
    const csv = buildFeriasCSV(
      input.ferias.ferias.map((f) => ({
        relativa: f.relativa,
        prazo: f.prazo,
        situacao: f.situacao,
        dobra_geral: f.dobra_geral,
        abono: f.abono,
        dias_abono: f.dias_abono,
        gozo1: f.gozo1,
        gozo2: f.gozo2,
        gozo3: f.gozo3,
      })),
    );
    zip.file(`${input.baseFilename}_ferias.csv`, csv);
  }

  if (input.faltas.faltas.length > 0) {
    const csv = buildFaltasCSV(
      input.faltas.faltas.map((f) => ({
        data_inicio: f.data_inicio,
        data_fim: f.data_fim,
        justificada: f.justificada,
        reiniciar_periodo_aquisitivo: f.reiniciar_periodo_aquisitivo,
        justificativa: f.justificativa,
      })),
    );
    zip.file(`${input.baseFilename}_faltas.csv`, csv);
  }

  zip.file('LEIA-ME.txt', buildReadme(input));

  return zip.generateAsync({ type: 'blob' });
}

function buildReadme(input: CtpsExportInput): string {
  const lines: string[] = [];
  lines.push('CTPS — Carteira de Trabalho');
  lines.push('===========================');
  lines.push('');
  lines.push(
    'Este ZIP contém os 2 CSVs extraídos da CTPS (Carteira de Trabalho):',
  );
  lines.push('');

  if (input.ferias.ferias.length > 0) {
    lines.push(
      `* ${input.baseFilename}_ferias.csv (${input.ferias.ferias.length} período(s) de férias)`,
    );
  } else {
    lines.push('* Nenhum período de férias detectado neste documento.');
  }
  if (input.faltas.faltas.length > 0) {
    lines.push(
      `* ${input.baseFilename}_faltas.csv (${input.faltas.faltas.length} registro(s) de falta)`,
    );
  } else {
    lines.push('* Nenhum registro de falta detectado neste documento.');
  }

  lines.push('');
  lines.push('COMO IMPORTAR NO PJe-CALC CIDADÃO');
  lines.push('==================================');
  lines.push('');
  lines.push(
    '1) FÉRIAS:  Cálculo → Férias → Importar CSV → selecione o arquivo *_ferias.csv.',
  );
  lines.push(
    '   ATENÇÃO: o parser do PJe-Calc busca os períodos AQUISITIVOS pelo campo',
  );
  lines.push(
    '   "RELATIVAS" (ex: 2022/2023). Cadastre-os antes da importação.',
  );
  lines.push('');
  lines.push(
    '2) FALTAS:  Cálculo → Faltas → Importar CSV → selecione o arquivo *_faltas.csv.',
  );
  lines.push('');
  lines.push('FORMATOS DOS CSVs');
  lines.push('-----------------');
  lines.push('  Encoding: UTF-8 (sem BOM)');
  lines.push('  Delimitador: ponto-e-vírgula (;)');
  lines.push('  Datas: dd/MM/yyyy');
  lines.push('  Booleanos: S / N');
  lines.push('  Line ending: CRLF');
  lines.push('');
  lines.push('Compatível com PJe-Calc Cidadão 2.5.6+ (incluindo 2.15.1).');

  const warnings = [
    ...input.ferias.warnings,
    ...input.faltas.warnings,
  ];
  if (warnings.length > 0) {
    lines.push('');
    lines.push('AVISOS DOS PARSERS');
    lines.push('------------------');
    for (const w of warnings) lines.push(`  - ${w}`);
  }

  return lines.join('\r\n');
}
