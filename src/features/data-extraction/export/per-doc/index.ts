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
import { logger } from '@/lib/logger';
import { parseHolerite } from '../../parsers/holerite';
import type { HoleriteParseResult } from '../../parsers/holerite/types';
import { parseCartaoPonto, type ParseCartaoPontoResult } from '../../parsers/cartao-ponto';
import { parseFerias, type ParseFeriasResult } from '../../parsers/ferias';
import { parseFaltas, type ParseFaltasResult } from '../../parsers/faltas';
import { parseFichaAnotacoes } from '../../../../../supabase/functions/_shared/parsers/ctps-v2/parser';
import { pareceDegradado } from '../../../../../supabase/functions/_shared/parsers/ctps-v2/parece-degradado';
import { adaptarFerias } from '../../parsers/ctps-v2/adapters/to-ferias-parseada';
import { adaptarFaltas } from '../../parsers/ctps-v2/adapters/to-falta-parseada';
import { buildCartaoPontoCSV } from './cartao-ponto-csv';
import { buildCartaoPontoZip, buildCartaoPontoZipWithReport } from './cartao-ponto-zip';
import { buildFeriasCSVBlob, buildFeriasCSVBlobWithReport } from './ferias-csv';
import { buildFaltasCSVBlob, buildFaltasCSVBlobWithReport } from './faltas-csv';
import { classifyHolerite, type ClassificacaoHolerite } from './holerite-classify';
import {
  extrairRubricasClassificadasDoV6,
  extrairResumoClassificacaoDoV6,
} from './extrair-rubricas-classificadas';
import { buildHoleriteZip, buildHoleriteZipWithReport } from './holerite-zip';
import { buildCtpsZip, buildCtpsZipWithReport } from './ctps-zip';
import {
  callExtractRubricasAI,
  type ExtractedPayload,
  type DiscardedHallucination,
} from '../../api/extract-rubricas-ai';
import {
  compararRubricas,
  type ComparacaoResultado,
} from '../../quality/comparador-llm-parser';

export type LlmStatus =
  | 'ok'
  | 'unavailable'
  | 'timeout'
  | 'rate_limit'
  | 'error'
  | 'not_attempted';

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
      /** FASE 3 — status da chamada LLM extractor (shadow check). */
      llm_status: LlmStatus;
      /** FASE 3 — payload extraído pela IA (apenas quando llm_status='ok'). */
      llmExtracted?: ExtractedPayload;
      /** FASE 3 — comparação parser × LLM (apenas quando llm_status='ok'). */
      comparacao?: ComparacaoResultado;
      /** FASE 3 — alucinações detectadas pelo pipeline anti-alucinação. */
      llm_discarded?: DiscardedHallucination[];
      /** FASE 3 — confiança autoreportada pela IA (0..100). */
      llm_ai_confidence?: number;
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
      /**
       * Resultado V2 da Ficha de Anotações ADP-Web/SAP — quando presente,
       * o ZIP é gerado pelo exporter V2 (4 CSVs). Quando ausente, usa o
       * builder legacy (2 CSVs: ferias + faltas).
       *
       * Populado quando `ocr_provider === 'pdfjs_geometric'` E
       * `parseFichaAnotacoes` produz resultado não-degradado.
       */
      ctpsV2?: import('@/domain/tipos-dominio').CtpsDominioV2;
      document_id: string;
      ocr_text: string;
      /** Nome base SEM extensão — o ZIP final será baseFilename + ".zip". */
      baseFilename: string;
      filename: string;
    }
  | {
      ok: true;
      kind: 'ficha-financeira-review';
      parsed: unknown;
      document_id: string;
      filename: string;
    }
  | { ok: false; error: string };

export async function generateExportForDocument(
  documentId: string,
): Promise<ExportResult> {
  const { data: doc, error } = await supabase
    .from('documents')
    .select(
      'id, file_name, tipo_extracao, ocr_text, ocr_validated, competencia_referencia, parsed, parsed_by, ocr_provider',
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
  const ocrProvider = (doc as { ocr_provider?: string | null }).ocr_provider;

  // GUARD anti-race condition: docs processados pelo V6 (ocr_provider
  // começando com `pdfjs_geometric` — cobre `pdfjs_geometric` clássico e
  // variantes como `pdfjs_geometric_manual_v6`) precisam de `parsed`
  // populado para export V6. Sem ele, o fallback regex sobre o texto pdfjs
  // gera resultados ruins — cabeçalho/admissão viram falsas batidas, datas
  // históricas anteriores ao período real aparecem como apurações. Bloqueia
  // o export até o pipeline V6 escrever o JSONB, evitando ZIP/CSV
  // silenciosamente incorreto.
  if (ocrProvider?.startsWith('pdfjs_geometric') && (!v6Parsed || typeof v6Parsed !== 'object')) {
    return {
      ok: false,
      error:
        'Pipeline V6 ainda não terminou de processar este documento. ' +
        'Aguarde alguns segundos e tente novamente. Se persistir, rode "Reprocessar V6" na lista de documentos.',
    };
  }

  // F1.3 (PR-4): switch usa string crua porque a tabela `documents` pode
  // ainda retornar tipos legados ('recibo_ferias', 'registro_faltas') em
  // caches/réplicas que não refletiram a migration. Tratamos como fallback
  // pra `ctps` (1 sprint) — depois disso o constraint do banco já recusa
  // os legados e podemos remover.
  const tipoRaw = doc.tipo_extracao as string | null | undefined;
  switch (tipoRaw) {
    case 'holerite': {
      const parsed = parseHolerite(ocrText);

      // Sprint 3c — hidrata rubricas_classificadas do v6Parsed (mapper Deno
      // da Sprint 2). O parser frontend nunca popula esse campo; só os
      // mappers em `supabase/functions/_shared/mappers/holerite-*.ts`
      // populam, e o resultado vive em `documents.parsed` JSONB (já lido
      // como `v6Parsed`). `classifyHolerite` aceita o campo como opcional —
      // quando ausente (doc legado pré-Sprint 2 / mapper falhou),
      // comporta-se como antes (só hints + fallback).
      const rubricasClassificadas = extrairRubricasClassificadasDoV6(v6Parsed);
      // Sprint 3c hotfix — extrai também `resumo_classificacao` (agregação por
      // categoria + por método produzida pelo mapper Deno). Sem isso, o banner
      // `OntologiaClassificacaoBanner` em HoleritePreviewDialog:533 nunca
      // monta — condicional `parsed?.resumo_classificacao && nao_classificadas
      // > 0` fica sempre false porque parser frontend nunca popula esse campo.
      const resumoClassificacao = extrairResumoClassificacaoDoV6(v6Parsed);
      if (
        rubricasClassificadas !== undefined &&
        rubricasClassificadas.length !== parsed.rubricas.length
      ) {
        logger.warn(
          'Sprint 3c: drift entre parser frontend e mapper Deno (length mismatch)',
          {
            document_id: documentId,
            parser_frontend_count: parsed.rubricas.length,
            mapper_deno_count: rubricasClassificadas.length,
            layout_usado: parsed.layout_usado,
          },
        );
      }

      // Parsed enriquecido com ontologia do JSONB pra propagar até o Dialog,
      // que passa `resumo_classificacao` como prop pro Banner V2.
      const parsedComOntologia: HoleriteParseResult = {
        ...parsed,
        rubricas_classificadas: rubricasClassificadas,
        resumo_classificacao: resumoClassificacao,
      };

      // classifyHolerite não usa `resumo_classificacao` (não está na assinatura
      // nem no retorno) — passa só os campos que ele lê.
      const preview = classifyHolerite({
        ...parsed,
        rubricas_classificadas: rubricasClassificadas,
      });

      // FASE 3.2 — LLM extractor em paralelo (shadow check).
      // Não substitui o parser determinístico. Quando indisponível/timeout/erro,
      // retorna `llm_status='unavailable'` e o dialog mostra banner amber
      // ("usando só parser, revisão manual mais cuidadosa recomendada").
      // Timeout server-side é 60s — o caller espera o tempo necessário.
      const llmResult = await callExtractRubricasAI(
        documentId,
        'holerite',
        ocrText,
      );

      if (!llmResult.ok) {
        const llmStatus: LlmStatus =
          llmResult.error === 'timeout'
            ? 'timeout'
            : llmResult.error === 'rate_limit'
            ? 'rate_limit'
            : llmResult.error === 'unavailable'
            ? 'unavailable'
            : 'error';
        return {
          ok: true,
          kind: 'holerite-preview',
          preview,
          parsed: parsedComOntologia,
          document_id: documentId,
          ocr_text: ocrText,
          filename: `${baseName}_pjecalc.zip`,
          llm_status: llmStatus,
        };
      }

      const comparacao = compararRubricas(
        parsed.rubricas,
        llmResult.extracted.rubricas,
      );

      return {
        ok: true,
        kind: 'holerite-preview',
        preview,
        parsed: parsedComOntologia,
        document_id: documentId,
        ocr_text: ocrText,
        filename: `${baseName}_pjecalc.zip`,
        llm_status: 'ok',
        llmExtracted: llmResult.extracted,
        comparacao,
        llm_discarded: llmResult.discarded_hallucinations,
        llm_ai_confidence: llmResult.ai_confidence,
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
            filename: `${baseName}_jornada.csv`,
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
    // PR-4 F1.3: cases legados delegam pra 'ctps'. Mantidos por 1 sprint
    // pra cobrir caches/réplicas com dados antigos. Fall-through.
    case 'recibo_ferias':
    case 'registro_faltas':
    case 'ctps': {
      // CTPS — Carteira de Trabalho. Path V2 tenta primeiro pra Ficha de
      // Anotações ADP-Web/SAP (4 CSVs). Cai pro path legacy (2 CSVs) quando:
      //   - ocr_provider não começa com 'pdfjs_geometric' (OCR Mistral/degradado)
      //   - parseFichaAnotacoes retorna null (layout não reconhecido)
      //   - pareceDegradado detecta seções vazias num doc que devia tê-las
      //
      // Defesa em profundidade: ocr_provider barra Mistral de cara,
      // pareceDegradado pega o caso raro de pdfjs_geometric que mesmo
      // assim saiu mal. `startsWith` cobre variantes V6 (ex.: `pdfjs_geometric`,
      // `pdfjs_geometric_manual_v6`).
      const podeUsarV2 = ocrProvider?.startsWith('pdfjs_geometric') ?? false;
      let ctpsV2: import('@/domain/tipos-dominio').CtpsDominioV2 | undefined;
      let feriasParsed: ParseFeriasResult;
      let faltasParsed: ParseFaltasResult;

      if (podeUsarV2) {
        const v2 = parseFichaAnotacoes(ocrText);
        if (v2 && !pareceDegradado(ocrText, v2)) {
          ctpsV2 = v2;
          feriasParsed = adaptarFerias(v2);
          faltasParsed = adaptarFaltas(v2);
        } else {
          feriasParsed = parseFerias(ocrText);
          faltasParsed = parseFaltas(ocrText);
        }
      } else {
        feriasParsed = parseFerias(ocrText);
        faltasParsed = parseFaltas(ocrText);
      }

      return {
        ok: true,
        kind: 'ctps-review',
        feriasParsed,
        faltasParsed,
        ctpsV2,
        document_id: documentId,
        ocr_text: ocrText,
        baseFilename: baseName,
        filename: `${baseName}_ctps.zip`,
      };
    }
    case 'ficha_financeira': {
      if (v6Parsed && typeof v6Parsed === 'object') {
        return {
          ok: true,
          kind: 'ficha-financeira-review',
          parsed: v6Parsed,
          document_id: documentId,
          filename: `${baseName}_ficha_pjecalc.zip`,
        };
      }

      const storagePathResult = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();
      const storagePath = (storagePathResult.data as { storage_path?: string } | null)?.storage_path;

      const { data: fichaData, error: fichaErr } = await supabase.functions.invoke(
        'parse-ficha-financeira',
        {
          body: {
            texto_documento: ocrText.slice(0, 80000),
            tipo_documento: 'ficha_financeira',
            ano_referencia: new Date().getFullYear(),
            storage_path: storagePath ?? undefined,
          },
        },
      );

      if (fichaErr) {
        logger.error('[ficha_financeira] parse edge function error', fichaErr);
        return {
          ok: false,
          error: 'Não foi possível processar a Ficha Financeira. Tente novamente.',
        };
      }
      if (fichaData?.error) {
        return { ok: false, error: fichaData.error };
      }

      if (fichaData && typeof fichaData === 'object') {
        await supabase
          .from('documents')
          .update({ parsed: fichaData, parsed_by: 'parse-ficha-financeira' })
          .eq('id', documentId);
      }

      return {
        ok: true,
        kind: 'ficha-financeira-review',
        parsed: fichaData,
        document_id: documentId,
        filename: `${baseName}_ficha_pjecalc.zip`,
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

  // Fase 4 v7: propaga reconciliação do V6 jsonb. Edge mapper anexa
  // `reconciliacao[]` + `reconciliacao_geral_ok` quando capaz (mapper
  // Via Varejo). Mapper genérico não popula → ficam undefined → dialog
  // não bloqueia export (comportamento legado preservado).
  const reconciliacao = Array.isArray(obj.reconciliacao)
    ? (obj.reconciliacao as ParseCartaoPontoResult['reconciliacao'])
    : undefined;
  const reconciliacao_geral_ok =
    typeof obj.reconciliacao_geral_ok === 'boolean'
      ? obj.reconciliacao_geral_ok
      : undefined;

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
    reconciliacao,
    reconciliacao_geral_ok,
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
