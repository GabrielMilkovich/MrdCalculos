/**
 * Orquestrador de export por documento (v4).
 *
 * Recebe o ID do documento, busca OCR + tipo no banco e roteia para o
 * parser/builder correto. **Não persiste nada.** Estado vive só no
 * navegador.
 *
 * Retorno:
 *   - Cartão/Férias/Faltas → `{ ok: true, blob, filename }` (download direto).
 *   - Holerite → `{ ok: true, preview, filename }` (UI deve abrir
 *     HoleritePreviewDialog antes de gerar o ZIP).
 *   - Erro → `{ ok: false, error }`.
 */

import { supabase } from '@/integrations/supabase/client';
import { parseHolerite } from '../../parsers/holerite';
import { parseCartaoPonto } from '../../parsers/cartao-ponto';
import { parseFerias } from '../../parsers/ferias';
import { parseFaltas } from '../../parsers/faltas';
import { buildCartaoPontoCSV } from './cartao-ponto-csv';
import { buildFeriasCSVBlob } from './ferias-csv';
import { buildFaltasCSVBlob } from './faltas-csv';
import { classifyHolerite, type ClassificacaoHolerite } from './holerite-classify';
import { buildHoleriteZip } from './holerite-zip';

export type ExportResult =
  | { ok: true; kind: 'blob'; blob: Blob; filename: string }
  | { ok: true; kind: 'preview'; preview: ClassificacaoHolerite; filename: string }
  | { ok: false; error: string };

export async function generateExportForDocument(
  documentId: string,
): Promise<ExportResult> {
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, file_name, tipo_extracao, ocr_text, ocr_validated, competencia_referencia')
    .eq('id', documentId)
    .single();
  if (error || !doc) return { ok: false, error: 'Documento não encontrado.' };
  if (doc.ocr_validated !== true) {
    return { ok: false, error: 'Confirme o OCR antes de baixar.' };
  }
  if (!doc.ocr_text) {
    return { ok: false, error: 'OCR vazio. Re-rode o OCR primeiro.' };
  }

  const baseName = sanitizeFilename(doc.file_name ?? 'documento');

  switch (doc.tipo_extracao) {
    case 'holerite': {
      const parsed = parseHolerite(doc.ocr_text);
      if (parsed.rubricas.length === 0) {
        return {
          ok: false,
          error:
            parsed.warnings.join(' · ') ||
            'Nenhuma rubrica extraída. Edite o OCR e tente novamente.',
        };
      }
      const preview = classifyHolerite(parsed);
      return {
        ok: true,
        kind: 'preview',
        preview,
        filename: `${baseName}_pjecalc.zip`,
      };
    }
    case 'cartao_ponto': {
      const parsed = parseCartaoPonto(
        doc.ocr_text,
        doc.competencia_referencia ?? undefined,
      );
      if (parsed.apuracoes.length === 0) {
        return {
          ok: false,
          error:
            parsed.warnings.join(' · ') ||
            'Nenhuma apuração diária extraída. Edite o OCR e tente novamente.',
        };
      }
      const blob = buildCartaoPontoCSV(parsed);
      return {
        ok: true,
        kind: 'blob',
        blob,
        filename: `${baseName}_jornada.csv`,
      };
    }
    case 'recibo_ferias': {
      const parsed = parseFerias(doc.ocr_text);
      if (parsed.ferias.length === 0) {
        return {
          ok: false,
          error:
            parsed.warnings.join(' · ') ||
            'Nenhum período de férias extraído. Edite o OCR e tente novamente.',
        };
      }
      const blob = buildFeriasCSVBlob(parsed);
      return {
        ok: true,
        kind: 'blob',
        blob,
        filename: `${baseName}_ferias.csv`,
      };
    }
    case 'registro_faltas': {
      const parsed = parseFaltas(doc.ocr_text);
      if (parsed.faltas.length === 0) {
        return {
          ok: false,
          error:
            parsed.warnings.join(' · ') ||
            'Nenhuma falta extraída. Edite o OCR e tente novamente.',
        };
      }
      const blob = buildFaltasCSVBlob(parsed);
      return {
        ok: true,
        kind: 'blob',
        blob,
        filename: `${baseName}_faltas.csv`,
      };
    }
    case 'nao_extrair':
    case null:
    case undefined:
      return { ok: false, error: 'Selecione um tipo de extração antes.' };
    default:
      return {
        ok: false,
        error: `Tipo de extração inválido: ${doc.tipo_extracao}`,
      };
  }
}

/** Dispara download de um Blob no browser. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Saneia nome de arquivo: tira extensão e troca chars problemáticos por `_`. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 100) || 'documento';
}

export { classifyHolerite, buildHoleriteZip };
export type { ClassificacaoHolerite, LinhaClassificada } from './holerite-classify';
