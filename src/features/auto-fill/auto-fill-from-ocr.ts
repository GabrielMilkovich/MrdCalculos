/**
 * autoFillFromOcr — dispara os parsers determinísticos sobre o texto OCR
 * já validado e grava DIRETO nas tabelas reais que o motor de cálculo lê.
 *
 * Substitui o ramo LLM do `extract-and-fill` para cartao_ponto / ferias /
 * faltas — esses três têm parsers determinísticos confiáveis (>1500 testes)
 * e não precisam de modelo de linguagem. O LLM segue só para holerite
 * (sugestão de bucket de rubrica é tarefa cognitiva real).
 *
 * Chamado automaticamente quando o operador clica "Confirmar OCR" na aba
 * Validação. Falhar aqui devolve `ok=false` + warnings explícitos — o
 * caller (DocumentOcrValidation) mostra toast ao usuário; nada de
 * falha silenciosa.
 *
 * INVARIANTES CRÍTICAS (já tropecei em todas, registrando):
 *   - O motor filtra por `calculo_id`. Inserts SEM `calculo_id` ficam
 *     órfãos. Sempre buscar/criar via `ensureCalculoAtivo(caseId)`.
 *   - `pjecalc_apuracao_diaria` tem UNIQUE (calculo_id, data), NÃO
 *     (case_id, data). `onConflict` precisa bater nessa combinação.
 *   - `pjecalc_historico_salarial` e `pjecalc_historico_ocorrencias`
 *     são VIEWS. Inserts vão na tabela base: `pjecalc_hist_salarial`
 *     (rubricas) + `pjecalc_hist_salarial_mes` (ocorrências mensais).
 *   - `pjecalc_hist_salarial_mes.competencia` é DATE (não TEXT yyyy-mm).
 *   - Idempotente: deleta por (calculo_id, documento_id) antes de inserir,
 *     para reprocessar OCR sem duplicar.
 */
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { logger } from "@/lib/logger";
import { parseCartaoPonto } from "@/features/data-extraction/parsers/cartao-ponto";
import { parseFerias } from "@/features/data-extraction/parsers/ferias";
import { parseFaltas } from "@/features/data-extraction/parsers/faltas";
import { parseHolerite } from "@/features/data-extraction/parsers/holerite";
import type {
  ApuracaoDiaria,
} from "@/features/data-extraction/parsers/cartao-ponto/layouts/generico-v1";
import type {
  FaltaParseada,
  FeriasParseada,
} from "@/features/data-extraction";
import type { SituacaoFerias } from "@/features/data-extraction";

export type AutoFillReport = {
  documentId: string;
  tipoExtracao: string | null;
  inserted: { tabela: string; count: number }[];
  warnings: string[];
  ok: boolean;
};

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

/**
 * Busca o cálculo ativo do caso; cria um vazio se não existir. O motor de
 * cálculo lê todas as tabelas por `calculo_id`. Sem isso, dados ficam
 * órfãos e o usuário vê parâmetros aparecendo na UI mas o cálculo dá zero.
 */
export async function ensureCalculoAtivo(caseId: string): Promise<string> {
  const { data: existente } = await supabase
    .from("pjecalc_calculos")
    .select("id, ativo")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existente?.id) return existente.id as string;

  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp.user?.id;
  if (!userId) {
    throw new Error("Usuário não autenticado — não foi possível criar cálculo.");
  }

  const { data: novo, error } = await supabase
    .from("pjecalc_calculos")
    .insert({
      case_id: caseId,
      user_id: userId,
      ativo: true,
      status: "rascunho",
      titulo: "Cálculo (preenchido via OCR)",
    })
    .select("id")
    .single();

  if (error || !novo) {
    throw new Error(
      `Não foi possível criar pjecalc_calculos: ${error?.message ?? "sem detalhes"}`,
    );
  }
  return (novo as { id: string }).id;
}

function apuracaoToRow(
  ap: ApuracaoDiaria,
  caseId: string,
  calculoId: string,
  documentId: string,
): Record<string, unknown> {
  const m = ap.marcacoes;
  return {
    case_id: caseId,
    calculo_id: calculoId,
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
  calculoId: string,
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
    calculo_id: calculoId,
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
  calculoId: string,
  documentId: string,
): Record<string, unknown> {
  return {
    case_id: caseId,
    calculo_id: calculoId,
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
  calculoId: string,
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

  // Idempotência: remove linhas anteriores desse documento (mesmo calculo).
  // Não toca em linhas INFORMADA/FIXADA pelo operador.
  await fromUntyped("pjecalc_apuracao_diaria")
    .delete()
    .eq("calculo_id", calculoId)
    .eq("documento_id", documentId)
    .eq("origem", "OCR");

  const rows = parsed.apuracoes.map((a) =>
    apuracaoToRow(a, caseId, calculoId, documentId),
  );

  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    // UNIQUE real do schema é (calculo_id, data).
    const { error } = await fromUntyped("pjecalc_apuracao_diaria").upsert(
      batch,
      { onConflict: "calculo_id,data" },
    );
    if (error) throw error;
  }

  return { count: rows.length, warnings: parsed.warnings };
}

async function fillFerias(
  caseId: string,
  calculoId: string,
  documentId: string,
  ocrText: string,
): Promise<{ count: number; warnings: string[] }> {
  const parsed = parseFerias(ocrText);
  if (parsed.ferias.length === 0) {
    return { count: 0, warnings: parsed.warnings };
  }

  await fromUntyped("pjecalc_ferias")
    .delete()
    .eq("calculo_id", calculoId)
    .eq("documento_id", documentId);

  const rows = parsed.ferias.map((f) =>
    feriasToRow(f, caseId, calculoId, documentId),
  );
  const { error } = await fromUntyped("pjecalc_ferias").insert(rows);
  if (error) throw error;
  return { count: rows.length, warnings: parsed.warnings };
}

async function fillFaltas(
  caseId: string,
  calculoId: string,
  documentId: string,
  ocrText: string,
): Promise<{ count: number; warnings: string[] }> {
  const parsed = parseFaltas(ocrText);
  if (parsed.faltas.length === 0) {
    return { count: 0, warnings: parsed.warnings };
  }

  await fromUntyped("pjecalc_faltas")
    .delete()
    .eq("calculo_id", calculoId)
    .eq("documento_id", documentId);

  const rows = parsed.faltas.map((f) =>
    faltaToRow(f, caseId, calculoId, documentId),
  );
  const { error } = await fromUntyped("pjecalc_faltas").insert(rows);
  if (error) throw error;
  return { count: rows.length, warnings: parsed.warnings };
}

async function fillHistoricoSalarial(
  caseId: string,
  calculoId: string,
  documentId: string,
  ocrText: string,
): Promise<{ count: number; warnings: string[] }> {
  const parsed = parseHolerite(ocrText);
  if (parsed.rubricas.length === 0) {
    return { count: 0, warnings: parsed.warnings };
  }

  // competencia "MM/yyyy" -> primeiro dia "yyyy-MM-01" (coluna DATE)
  const [mm, yyyy] = parsed.competencia.split("/");
  const competencia = `${yyyy}-${mm}-01`;

  // Rubricas-mãe: VIVE em pjecalc_hist_salarial (não na view).
  const { data: rubricas } = await fromUntyped("pjecalc_hist_salarial")
    .select("id, nome")
    .eq("calculo_id", calculoId);

  const histPorNome = new Map<string, string>();
  for (const h of (rubricas as { id: string; nome: string }[] | null) ?? []) {
    histPorNome.set(h.nome.toUpperCase().trim(), h.id);
  }

  // Remove ocorrências anteriores do mesmo documento + competência
  // (idempotente — reprocessar OCR não duplica).
  await fromUntyped("pjecalc_hist_salarial_mes")
    .delete()
    .eq("calculo_id", calculoId)
    .eq("documento_id", documentId)
    .eq("competencia", competencia);

  let inserted = 0;
  for (const r of parsed.rubricas) {
    const valor = r.valor_vencimento ?? r.valor_desconto ?? 0;
    if (!valor) continue;
    const nomeNorm = r.nome.toUpperCase().trim();
    let histId = histPorNome.get(nomeNorm);

    if (!histId) {
      const { data: novoHist, error } = await fromUntyped(
        "pjecalc_hist_salarial",
      )
        .insert({
          calculo_id: calculoId,
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

    const { error: errMes } = await fromUntyped("pjecalc_hist_salarial_mes")
      .insert({
        calculo_id: calculoId,
        case_id: caseId,
        hist_salarial_id: histId,
        competencia,
        valor,
        origem: "OCR",
        documento_id: documentId,
      });
    if (errMes) throw errMes;
    inserted += 1;
  }

  return { count: inserted, warnings: parsed.warnings };
}

/**
 * Função principal — recebe document_id, lê tipo_extracao + ocr_text,
 * garante calculo_id e dispara o adapter correspondente. Devolve
 * relatório consumível pelo caller (toast/sonner).
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
    const calculoId = await ensureCalculoAtivo(case_id);

    switch (tipo_extracao) {
      case "cartao_ponto": {
        const r = await fillCartaoPonto(case_id, calculoId, documentId, ocr_text);
        inserted.push({ tabela: "pjecalc_apuracao_diaria", count: r.count });
        warnings.push(...r.warnings);
        break;
      }
      case "ferias": {
        const r = await fillFerias(case_id, calculoId, documentId, ocr_text);
        inserted.push({ tabela: "pjecalc_ferias", count: r.count });
        warnings.push(...r.warnings);
        break;
      }
      case "faltas": {
        const r = await fillFaltas(case_id, calculoId, documentId, ocr_text);
        inserted.push({ tabela: "pjecalc_faltas", count: r.count });
        warnings.push(...r.warnings);
        break;
      }
      case "holerite": {
        const r = await fillHistoricoSalarial(
          case_id,
          calculoId,
          documentId,
          ocr_text,
        );
        inserted.push({ tabela: "pjecalc_hist_salarial_mes", count: r.count });
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
