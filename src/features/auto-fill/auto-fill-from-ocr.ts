/**
 * autoFillFromOcr — dispara os parsers determinísticos sobre o texto OCR
 * já validado e grava DIRETO nas tabelas da calculadora (pjecalc_*).
 *
 * Substitui o ramo LLM do `extract-and-fill` para cartao_ponto / ferias /
 * faltas — esses três têm parsers determinísticos confiáveis (>1500 testes)
 * e não precisam de modelo de linguagem. O LLM segue só para holerite
 * (sugestão de bucket de rubrica é tarefa cognitiva real).
 *
 * Chamado automaticamente quando o operador clica "Confirmar OCR" na aba
 * Validação. Falhar aqui NÃO impede a confirmação do OCR — o erro é
 * reportado mas o operador pode editar manualmente no módulo da calculadora.
 *
 * Garantias:
 *   - Idempotente: deleta linhas com origem='OCR' do mesmo documento
 *     antes de inserir, para reprocessar OCR re-rodar sem duplicar.
 *   - Respeita RLS (usa o cliente autenticado do operador).
 *   - Retorna report com counts por tipo para feedback toast.
 */
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { logger } from "@/lib/logger";
import {
  parseCartaoPonto,
  parseFerias,
  parseFaltas,
  parseHolerite,
  type ApuracaoDiaria,
  type FaltaParseada,
  type FeriasParseada,
  type SituacaoFerias,
} from "@/features/data-extraction";

export type AutoFillReport = {
  documentId: string;
  tipoExtracao: string | null;
  inserted: { tabela: string; count: number }[];
  warnings: string[];
  ok: boolean;
};

/** Mapeia a situação do parser de férias para a string usada na tabela. */
const SITUACAO_MAP: Record<SituacaoFerias, string> = {
  G: "gozadas",
  GP: "gozadas_parcialmente",
  NG: "vencidas_nao_gozadas",
  I: "indenizadas",
  P: "perdidas",
};

const DIAS_SEMANA_PT = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function diaSemana(dataISO: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return null;
  const d = new Date(dataISO + "T12:00:00");
  return DIAS_SEMANA_PT[d.getDay()] ?? null;
}

/** Converte uma ApuracaoDiaria do parser em uma linha de pjecalc_apuracao_diaria. */
function apuracaoToRow(
  ap: ApuracaoDiaria,
  caseId: string,
  documentId: string,
): Record<string, unknown> {
  const m = ap.marcacoes;
  return {
    case_id: caseId,
    data: ap.data,
    dia_semana: ap.dia_semana ?? diaSemana(ap.data),
    ocorrencia: ap.ocorrencia,
    entrada_1: m[0]?.e || null,
    saida_1: m[0]?.s || null,
    entrada_2: m[1]?.e || null,
    saida_2: m[1]?.s || null,
    entrada_3: m[2]?.e || null,
    saida_3: m[2]?.s || null,
    entrada_4: m[3]?.e || null,
    saida_4: m[3]?.s || null,
    entrada_5: m[4]?.e || null,
    saida_5: m[4]?.s || null,
    entrada_6: m[5]?.e || null,
    saida_6: m[5]?.s || null,
    observacao: ap.observacao,
    origem: "OCR",
    documento_id: documentId,
  };
}

function feriasToRow(
  f: FeriasParseada,
  caseId: string,
  documentId: string,
): Record<string, unknown> {
  const [aniIni, aniFim] = f.relativa.split("/").map((y) => parseInt(y, 10));
  const periodo_aquisitivo_inicio = Number.isFinite(aniIni)
    ? `${aniIni}-01-01`
    : null;
  const periodo_aquisitivo_fim = Number.isFinite(aniFim)
    ? `${aniFim}-12-31`
    : null;

  return {
    case_id: caseId,
    periodo_aquisitivo_inicio,
    periodo_aquisitivo_fim,
    periodo_concessivo_inicio: f.gozo1?.inicio ?? null,
    periodo_concessivo_fim: f.gozo1?.fim ?? null,
    situacao: SITUACAO_MAP[f.situacao] ?? "gozadas",
    prazo_dias: f.prazo,
    dobra_geral: f.dobra_geral,
    abono: f.abono,
    abono_dias: f.dias_abono,
    gozo_1_inicio: f.gozo1?.inicio ?? null,
    gozo_1_fim: f.gozo1?.fim ?? null,
    gozo_1_dobra: f.gozo1?.dobra ?? false,
    gozo_2_inicio: f.gozo2?.inicio ?? null,
    gozo_2_fim: f.gozo2?.fim ?? null,
    gozo_2_dobra: f.gozo2?.dobra ?? false,
    gozo_3_inicio: f.gozo3?.inicio ?? null,
    gozo_3_fim: f.gozo3?.fim ?? null,
    gozo_3_dobra: f.gozo3?.dobra ?? false,
    observacoes: null,
    documento_id: documentId,
  };
}

function faltaToRow(
  f: FaltaParseada,
  caseId: string,
  documentId: string,
): Record<string, unknown> {
  return {
    case_id: caseId,
    data_inicial: f.data_inicio,
    data_final: f.data_fim,
    justificada: f.justificada,
    reiniciar_ferias: f.reiniciar_periodo_aquisitivo,
    motivo: f.justificativa,
    documento_id: documentId,
  };
}

async function fillCartaoPonto(
  caseId: string,
  documentId: string,
  ocrText: string,
): Promise<{ count: number; warnings: string[] }> {
  const parsed = parseCartaoPonto(ocrText);
  if (parsed.apuracoes.length === 0) {
    return {
      count: 0,
      warnings: parsed.warnings.length
        ? parsed.warnings
        : ["Cartão de ponto: parser não encontrou apurações."],
    };
  }

  await fromUntyped("pjecalc_apuracao_diaria")
    .delete()
    .eq("case_id", caseId)
    .eq("documento_id", documentId)
    .eq("origem", "OCR");

  const rows = parsed.apuracoes.map((a) => apuracaoToRow(a, caseId, documentId));

  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await fromUntyped("pjecalc_apuracao_diaria")
      .upsert(batch, { onConflict: "case_id,data" });
    if (error) throw error;
  }

  return { count: rows.length, warnings: parsed.warnings };
}

async function fillFerias(
  caseId: string,
  documentId: string,
  ocrText: string,
): Promise<{ count: number; warnings: string[] }> {
  const parsed = parseFerias(ocrText);
  if (parsed.ferias.length === 0) {
    return { count: 0, warnings: parsed.warnings };
  }

  await fromUntyped("pjecalc_ferias")
    .delete()
    .eq("case_id", caseId)
    .eq("documento_id", documentId);

  const rows = parsed.ferias.map((f) => feriasToRow(f, caseId, documentId));
  const { error } = await fromUntyped("pjecalc_ferias").insert(rows);
  if (error) throw error;
  return { count: rows.length, warnings: parsed.warnings };
}

async function fillFaltas(
  caseId: string,
  documentId: string,
  ocrText: string,
): Promise<{ count: number; warnings: string[] }> {
  const parsed = parseFaltas(ocrText);
  if (parsed.faltas.length === 0) {
    return { count: 0, warnings: parsed.warnings };
  }

  await fromUntyped("pjecalc_faltas")
    .delete()
    .eq("case_id", caseId)
    .eq("documento_id", documentId);

  const rows = parsed.faltas.map((f) => faltaToRow(f, caseId, documentId));
  const { error } = await fromUntyped("pjecalc_faltas").insert(rows);
  if (error) throw error;
  return { count: rows.length, warnings: parsed.warnings };
}

async function fillHistoricoSalarial(
  caseId: string,
  documentId: string,
  ocrText: string,
): Promise<{ count: number; warnings: string[] }> {
  const parsed = parseHolerite(ocrText);
  if (parsed.rubricas.length === 0) {
    return { count: 0, warnings: parsed.warnings };
  }

  // competencia "MM/yyyy" -> "yyyy-MM"
  const [mm, yyyy] = parsed.competencia.split("/");
  const competencia = `${yyyy}-${mm}`;

  // Buscar histórico existente do caso (insere se não houver rubrica com mesmo nome)
  const { data: historicos } = await fromUntyped("pjecalc_historico_salarial")
    .select("id, nome")
    .eq("case_id", caseId);

  const histPorNome = new Map<string, string>();
  for (const h of (historicos as { id: string; nome: string }[] | null) ?? []) {
    histPorNome.set(h.nome.toUpperCase().trim(), h.id);
  }

  let inserted = 0;
  for (const r of parsed.rubricas) {
    const valor = r.valor_vencimento ?? r.valor_desconto ?? 0;
    if (!valor) continue;
    const nomeNorm = r.nome.toUpperCase().trim();
    let histId = histPorNome.get(nomeNorm);
    if (!histId) {
      const { data: novoHist, error } = await fromUntyped(
        "pjecalc_historico_salarial",
      )
        .insert({
          case_id: caseId,
          nome: r.nome,
          tipo_variacao: "VARIAVEL",
          incide_inss: true,
          incide_fgts: true,
          incide_ir: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      histId = (novoHist as { id: string }).id;
      histPorNome.set(nomeNorm, histId);
    }

    // Substitui ocorrência da mesma competência+documento (idempotente)
    await fromUntyped("pjecalc_historico_ocorrencias")
      .delete()
      .eq("case_id", caseId)
      .eq("historico_id", histId)
      .eq("competencia", competencia)
      .eq("documento_id", documentId);

    const { error: errOcc } = await fromUntyped("pjecalc_historico_ocorrencias")
      .insert({
        case_id: caseId,
        historico_id: histId,
        competencia,
        valor,
        tipo: r.valor_vencimento ? "vencimento" : "desconto",
        origem: "OCR",
        documento_id: documentId,
      });
    if (errOcc) throw errOcc;
    inserted += 1;
  }

  return { count: inserted, warnings: parsed.warnings };
}

/**
 * Função principal — recebe document_id, lê tipo_extracao + ocr_text,
 * dispara o adapter correspondente. Devolve relatório consumível pelo
 * caller (toast/sonner).
 */
export async function autoFillFromOcr(
  documentId: string,
): Promise<AutoFillReport> {
  const { data: doc, error: errDoc } = await supabase
    .from("documents")
    .select("id, case_id, tipo_extracao, ocr_text")
    .eq("id", documentId)
    .single();

  if (errDoc || !doc) {
    return {
      documentId,
      tipoExtracao: null,
      inserted: [],
      warnings: [errDoc?.message ?? "Documento não encontrado."],
      ok: false,
    };
  }

  const { case_id, tipo_extracao, ocr_text } = doc as {
    case_id: string | null;
    tipo_extracao: string | null;
    ocr_text: string | null;
  };

  if (!case_id || !ocr_text || ocr_text.trim().length < 20) {
    return {
      documentId,
      tipoExtracao: tipo_extracao,
      inserted: [],
      warnings: ["Documento sem case_id ou OCR muito curto."],
      ok: false,
    };
  }

  const inserted: AutoFillReport["inserted"] = [];
  const warnings: string[] = [];

  try {
    switch (tipo_extracao) {
      case "cartao_ponto": {
        const r = await fillCartaoPonto(case_id, documentId, ocr_text);
        inserted.push({ tabela: "pjecalc_apuracao_diaria", count: r.count });
        warnings.push(...r.warnings);
        break;
      }
      case "ferias": {
        const r = await fillFerias(case_id, documentId, ocr_text);
        inserted.push({ tabela: "pjecalc_ferias", count: r.count });
        warnings.push(...r.warnings);
        break;
      }
      case "faltas": {
        const r = await fillFaltas(case_id, documentId, ocr_text);
        inserted.push({ tabela: "pjecalc_faltas", count: r.count });
        warnings.push(...r.warnings);
        break;
      }
      case "holerite": {
        const r = await fillHistoricoSalarial(case_id, documentId, ocr_text);
        inserted.push({
          tabela: "pjecalc_historico_ocorrencias",
          count: r.count,
        });
        warnings.push(...r.warnings);
        break;
      }
      default:
        // Tipos não-extraíveis (ctps, outro, sentenca, etc.) — skip silencioso.
        return {
          documentId,
          tipoExtracao: tipo_extracao,
          inserted: [],
          warnings: [],
          ok: true,
        };
    }
    return {
      documentId,
      tipoExtracao: tipo_extracao,
      inserted,
      warnings,
      ok: true,
    };
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    logger.error("autoFillFromOcr falhou", { documentId, tipo_extracao, err });
    return {
      documentId,
      tipoExtracao: tipo_extracao,
      inserted,
      warnings: [...warnings, msg],
      ok: false,
    };
  }
}
