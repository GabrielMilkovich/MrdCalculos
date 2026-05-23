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
 */

import JSZip from 'jszip';
import {
  buildFeriasCSV,
  buildFeriasCSVWithReport,
} from '../csv-ferias';
import {
  buildFaltasCSV,
  buildFaltasCSVWithReport,
} from '../csv-faltas';
import { emptyReport, type BuildReport } from '../validation';
import type { ParseFeriasResult } from '../../parsers/ferias';
import type { ParseFaltasResult } from '../../parsers/faltas';

export interface CtpsExportInput {
  ferias: ParseFeriasResult;
  faltas: ParseFaltasResult;
  baseFilename: string;
}

export async function buildCtpsZip(input: CtpsExportInput): Promise<Blob> {
  return (await buildCtpsZipWithReport(input)).blob;
}

/**
 * Versão que devolve o BuildReport unificado dos 2 sub-CSVs (férias +
 * faltas). Cada item do report vem prefixado com [Férias] ou [Faltas]
 * pra o operador identificar no painel de auditoria.
 */
export async function buildCtpsZipWithReport(
  input: CtpsExportInput,
): Promise<{ blob: Blob; report: BuildReport }> {
  const zip = new JSZip();
  const aggregate = emptyReport();
  const merge = (sub: BuildReport, prefixo: 'Férias' | 'Faltas'): void => {
    aggregate.linhasGeradas += sub.linhasGeradas;
    for (const r of sub.linhasRejeitadas) {
      aggregate.linhasRejeitadas.push({
        idx: r.idx,
        motivo: `[${prefixo}] ${r.motivo}`,
        conteudo: r.conteudo,
      });
    }
    for (const a of sub.linhasAjustadas) {
      aggregate.linhasAjustadas.push({
        idx: a.idx,
        ajuste: `[${prefixo}] ${a.ajuste}`,
      });
    }
    for (const w of sub.warnings) aggregate.warnings.push(`[${prefixo}] ${w}`);
  };

  // Sempre gera AMBOS os CSVs, mesmo quando o parser correspondente volta
  // vazio. Header-only deixa explícito "parser tentou e não achou nada"
  // em vez de omitir o arquivo do ZIP (silêncio que o operador interpreta
  // como bug). Paridade > silêncio.
  const { csv: feriasCsv, report: feriasReport } = buildFeriasCSVWithReport(
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
  zip.file(`${input.baseFilename}_ferias.csv`, feriasCsv);
  merge(feriasReport, 'Férias');
  if (input.ferias.ferias.length === 0) {
    aggregate.warnings.push(
      '[Férias] Nenhum período detectado no OCR — CSV gerado apenas com cabeçalho (header-only).',
    );
  }

  const { csv: faltasCsv, report: faltasReport } = buildFaltasCSVWithReport(
    input.faltas.faltas.map((f) => ({
      data_inicio: f.data_inicio,
      data_fim: f.data_fim,
      justificada: f.justificada,
      reiniciar_periodo_aquisitivo: f.reiniciar_periodo_aquisitivo,
      justificativa: f.justificativa,
    })),
  );
  zip.file(`${input.baseFilename}_faltas.csv`, faltasCsv);
  merge(faltasReport, 'Faltas');
  if (input.faltas.faltas.length === 0) {
    aggregate.warnings.push(
      '[Faltas] Nenhum registro detectado no OCR — CSV gerado apenas com cabeçalho (header-only).',
    );
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, report: aggregate };
}

