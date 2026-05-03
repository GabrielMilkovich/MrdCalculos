/**
 * Adapters: output do LLM (schemas Zod) → tipos completos dos parsers
 * (`ParseCartaoPontoResult`, `ParseFeriasResult`, etc.).
 *
 * Permite "drop-in replacement" — o dialog não distingue se o `parsed` veio
 * de regex determinística ou da IA.
 */
import type {
  CartaoPontoLLMOutput,
  FaltasLLMOutput,
  FeriasLLMOutput,
  HoleriteLLMOutput,
} from "./schemas";
import type {
  ApuracaoDiaria,
  EventoDiario,
  ParseCartaoPontoResult,
  TipoEvento,
} from "../parsers/cartao-ponto";
import { PARSER_VERSION as CARTAO_PARSER_VERSION } from "../parsers/cartao-ponto";
import type { ParseFeriasResult } from "../parsers/ferias";
import type { ParseFaltasResult } from "../parsers/faltas";
import type { HoleriteParseResult } from "../parsers/holerite/types";

export function llmToCartaoPontoResult(
  output: CartaoPontoLLMOutput,
): ParseCartaoPontoResult {
  const apuracoes: ApuracaoDiaria[] = output.apuracoes.map((a) => ({
    data: a.data,
    dia_semana: a.dia_semana ?? null,
    ocorrencia: a.ocorrencia,
    marcacoes: a.marcacoes.map((m) => ({
      e: m.e,
      s: m.s,
      ...(m.e_inserida ? { e_inserida: true } : {}),
      ...(m.s_inserida ? { s_inserida: true } : {}),
      ...(m.e_desconsiderada ? { e_desconsiderada: true } : {}),
      ...(m.s_desconsiderada ? { s_desconsiderada: true } : {}),
    })),
    eventos: (a.eventos ?? []).map<EventoDiario>((e) => ({
      tipo: e.tipo as TipoEvento,
      valor: e.valor,
      raw: e.raw ?? "",
    })),
    observacao: a.observacao ?? null,
  }));

  // Recalcula competências e datas inicial/final.
  const competencias = new Map<string, number>();
  for (const a of apuracoes) {
    const [yyyy, mm] = a.data.split("-");
    const k = `${mm}/${yyyy}`;
    competencias.set(k, (competencias.get(k) ?? 0) + 1);
  }
  let predominante = "";
  let max = 0;
  for (const [k, v] of competencias) {
    if (v > max) {
      predominante = k;
      max = v;
    }
  }
  const sorted = [...apuracoes].sort((a, b) => a.data.localeCompare(b.data));

  return {
    apuracoes: sorted,
    competencias,
    competencia_predominante: predominante,
    data_inicial: sorted[0]?.data ?? "",
    data_final: sorted[sorted.length - 1]?.data ?? "",
    warnings: ["Extração via IA — confira tudo antes de baixar."],
    unparsed_lines: [],
    parser_version: `${CARTAO_PARSER_VERSION}+llm`,
  };
}

export function llmToFeriasResult(output: FeriasLLMOutput): ParseFeriasResult {
  return {
    ferias: output.ferias.map((f) => ({
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
    warnings: ["Extração via IA — confira tudo antes de baixar."],
    unparsed_lines: [],
  };
}

export function llmToFaltasResult(output: FaltasLLMOutput): ParseFaltasResult {
  return {
    faltas: output.faltas.map((f) => ({
      data_inicio: f.data_inicio,
      data_fim: f.data_fim,
      justificada: f.justificada,
      reiniciar_periodo_aquisitivo: f.reiniciar_periodo_aquisitivo,
      justificativa: f.justificativa,
    })),
    warnings: ["Extração via IA — confira tudo antes de baixar."],
    unparsed_lines: [],
  };
}

export function llmToHoleriteResult(
  output: HoleriteLLMOutput,
): HoleriteParseResult {
  return {
    competencia: output.competencia,
    rubricas: output.rubricas.map((r, i) => ({
      codigo: r.codigo,
      nome: r.nome,
      valor_vencimento: r.valor_vencimento,
      valor_desconto: r.valor_desconto,
      quantidade: r.quantidade,
      ordem: r.ordem ?? i,
    })),
    layout_usado: output.layout_usado || "llm_v1",
    warnings: ["Extração via IA — confira tudo antes de baixar."],
  };
}
