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
import { buildCartaoPontoZip, buildCartaoPontoZipWithReport } from './cartao-ponto-zip';
import { buildFeriasCSVBlob, buildFeriasCSVBlobWithReport } from './ferias-csv';
import { buildFaltasCSVBlob, buildFaltasCSVBlobWithReport } from './faltas-csv';
import { classifyHolerite, type ClassificacaoHolerite } from './holerite-classify';
import { buildHoleriteZip, buildHoleriteZipWithReport } from './holerite-zip';
import { buildCtpsZip, buildCtpsZipWithReport } from './ctps-zip';

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
  | {
      ok: true;
      kind: 'ctps-review';
      /** Resultado do parser de férias sobre o OCR da CTPS. */
      feriasParsed: ParseFeriasResult;
      /** Resultado do parser de faltas sobre o MESMO OCR. */
      faltasParsed: ParseFaltasResult;
      document_id: string;
      ocr_text: string;
      /** Nome base SEM extensão — o ZIP final será baseFilename + ".zip". */
      baseFilename: string;
      filename: string;
    }
  | { ok: false; error: string };

export async function generateExportForDocument(
  documentId: string,
): Promise<ExportResult> {
  const { data: doc, error } = await supabase
    .from('documents')
    .select(
      'id, file_name, tipo_extracao, ocr_text, ocr_validated, competencia_referencia, parsed, parsed_by',
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
  // V6: quando o extrator geométrico produziu resultado, usa direto e
  // pula o parser regex sobre OCR Mistral. Resolve o "Nenhuma apuração
  // extraída" pra documentos cujo OCR Mistral entrega Layout B colapsado
  // (parser v5 falha na deferência dia↔batidas).
  const v6Parsed = (doc as { parsed?: unknown }).parsed;

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
      // Caminho V6 — usa resultado do extrator geométrico se presente.
      if (v6Parsed && typeof v6Parsed === 'object') {
        const adapted = adaptarV6CartaoPonto(v6Parsed);
        if (adapted) {
          return {
            ok: true,
            kind: 'cartao-ponto-review',
            parsed: adapted,
            document_id: documentId,
            ocr_text: ocrText,
            filename: `${baseName}_jornada.zip`,
          };
        }
      }
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
        filename: `${baseName}_jornada.zip`,
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
    case 'ctps': {
      // CTPS — Carteira de Trabalho. O MESMO OCR alimenta os 2 parsers.
      // Se um deles não achar nada (ex: CTPS sem férias registradas),
      // o resultado fica vazio e só o outro CSV vai pro ZIP — o builder
      // omite arquivos com 0 linhas e o LEIA-ME explica.
      const feriasParsed = parseFerias(ocrText);
      const faltasParsed = parseFaltas(ocrText);
      return {
        ok: true,
        kind: 'ctps-review',
        feriasParsed,
        faltasParsed,
        document_id: documentId,
        ocr_text: ocrText,
        baseFilename: baseName,
        filename: `${baseName}_ctps.zip`,
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

/**
 * Adapta o jsonb V6 (extrator geométrico, gravado por process-document-start)
 * para o tipo `ParseCartaoPontoResult` que os dialogs/CSV consomem.
 *
 * O resultado V6 já é estruturalmente equivalente — só precisamos:
 *   - Converter `competencias` de objeto plano (jsonb) → `Map<string, number>`.
 *   - Validar campos mínimos (apuracoes array, datas presentes).
 *
 * Quando inválido, retorna null e o caller cai no parser regex V5 normal.
 */
function adaptarV6CartaoPonto(raw: unknown): ParseCartaoPontoResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.apuracoes)) return null;

  const competencias = new Map<string, number>();
  if (obj.competencias && typeof obj.competencias === 'object') {
    for (const [k, v] of Object.entries(obj.competencias as Record<string, unknown>)) {
      if (typeof v === 'number') competencias.set(k, v);
    }
  }

  return {
    apuracoes: obj.apuracoes as ParseCartaoPontoResult['apuracoes'],
    competencias,
    competencia_predominante:
      typeof obj.competencia_predominante === 'string' ? obj.competencia_predominante : '',
    data_inicial: typeof obj.data_inicial === 'string' ? obj.data_inicial : '',
    data_final: typeof obj.data_final === 'string' ? obj.data_final : '',
    warnings: Array.isArray(obj.warnings) ? (obj.warnings as string[]) : [],
    unparsed_lines: Array.isArray(obj.unparsed_lines)
      ? (obj.unparsed_lines as ParseCartaoPontoResult['unparsed_lines'])
      : [],
    parser_version:
      typeof obj.parser_version === 'string' ? obj.parser_version : 'v6_geometric',
  };
}

export {
  classifyHolerite,
  buildHoleriteZip,
  buildHoleriteZipWithReport,
  buildCartaoPontoCSV,
  buildCartaoPontoZip,
  buildCartaoPontoZipWithReport,
  buildFeriasCSVBlob,
  buildFeriasCSVBlobWithReport,
  buildFaltasCSVBlob,
  buildFaltasCSVBlobWithReport,
  buildCtpsZip,
  buildCtpsZipWithReport,
};
export type { ClassificacaoHolerite, LinhaClassificada } from './holerite-classify';
