/**
 * Orquestrador de export por documento.
 *
 * Lê OCR + tipo do banco e dispara o parser correto. **Não persiste nada.**
 * Sempre devolve dados em formato "review-ready" — a UI obrigatoriamente
 * abre o Review Dialog correspondente para o usuário revisar, editar e
 * confirmar antes de baixar o CSV.
 *
 * Não há mais "download direto" — todos os 4 tipos passam por revisão visual.
 */

import { supabase } from '@/integrations/supabase/client';
import { parseHolerite } from '../../parsers/holerite';
import type { HoleriteParseResult } from '../../parsers/holerite/types';
import { parseCartaoPonto, type ParseCartaoPontoResult } from '../../parsers/cartao-ponto';
import { parseFerias, type ParseFeriasResult } from '../../parsers/ferias';
import { parseFaltas, type ParseFaltasResult } from '../../parsers/faltas';
import { buildCartaoPontoCSV } from './cartao-ponto-csv';
import { buildFeriasCSVBlob } from './ferias-csv';
import { buildFaltasCSVBlob } from './faltas-csv';
import { classifyHolerite, type ClassificacaoHolerite } from './holerite-classify';
import { buildHoleriteZip } from './holerite-zip';

export type ExportResult =
  | {
      ok: true;
      kind: 'holerite-preview';
      preview: ClassificacaoHolerite;
      /** HoleriteParseResult cru — necessário pro co-piloto IA. */
      parsed: HoleriteParseResult;
      document_id: string;
      ocr_text: string;
      filename: string;
    }
  | {
      ok: true;
      kind: 'cartao-ponto-review';
      parsed: ParseCartaoPontoResult;
      document_id: string;
      ocr_text: string;
      filename: string;
    }
  | {
      ok: true;
      kind: 'ferias-review';
      parsed: ParseFeriasResult;
      document_id: string;
      ocr_text: string;
      filename: string;
    }
  | {
      ok: true;
      kind: 'faltas-review';
      parsed: ParseFaltasResult;
      document_id: string;
      ocr_text: string;
      filename: string;
    }
  | { ok: false; error: string };

export async function generateExportForDocument(
  documentId: string,
): Promise<ExportResult> {
  const { data: doc, error } = await supabase
    .from('documents')
    .select(
      'id, file_name, tipo_extracao, ocr_text, ocr_validated, competencia_referencia',
    )
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
  const ocrText = doc.ocr_text;

  switch (doc.tipo_extracao) {
    case 'holerite': {
      const parsed = parseHolerite(ocrText);
      const preview = classifyHolerite(parsed);
      return {
        ok: true,
        kind: 'holerite-preview',
        preview,
        parsed,
        document_id: documentId,
        ocr_text: ocrText,
        filename: `${baseName}_pjecalc.zip`,
      };
    }
    case 'cartao_ponto': {
      const parsed = parseCartaoPonto(
        ocrText,
        doc.competencia_referencia ?? undefined,
      );
      return {
        ok: true,
        kind: 'cartao-ponto-review',
        parsed,
        document_id: documentId,
        ocr_text: ocrText,
        filename: `${baseName}_jornada.csv`,
      };
    }
    case 'recibo_ferias': {
      const parsed = parseFerias(ocrText);
      return {
        ok: true,
        kind: 'ferias-review',
        parsed,
        document_id: documentId,
        ocr_text: ocrText,
        filename: `${baseName}_ferias.csv`,
      };
    }
    case 'registro_faltas': {
      const parsed = parseFaltas(ocrText);
      return {
        ok: true,
        kind: 'faltas-review',
        parsed,
        document_id: documentId,
        ocr_text: ocrText,
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

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100) || 'documento'
  );
}

export {
  classifyHolerite,
  buildHoleriteZip,
  buildCartaoPontoCSV,
  buildFeriasCSVBlob,
  buildFaltasCSVBlob,
};
export type { ClassificacaoHolerite, LinhaClassificada } from './holerite-classify';
