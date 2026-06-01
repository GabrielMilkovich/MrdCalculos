/**
 * Adapter de Parâmetros Gerais (Seção 2) — canonicaliza a linha de
 * `pjecalc_calculos` (onde o form ModuloParametrosGerais grava) no shape
 * `PjecalcParametrosRow` que o engine consome via `toEngineParams`.
 *
 * Por que existe: o engine lia de `pjecalc_parametros` (tabela separada, sem
 * sync com pjecalc_calculos) → edições da tela Parâmetros Gerais nunca chegavam
 * ao cálculo. Decisão de wiring (CLAUDE.md autonomia): canonicalizar em
 * pjecalc_calculos. Ver docs/specs/parametros-gerais.md §2.
 *
 * NÃO altera o motor. Mapeia/normaliza nomes de coluna + enums.
 */
import type { PjecalcParametrosRow } from "./types";

/** Linha bruta de pjecalc_calculos (apenas as colunas que nos interessam). */
export type CalculoParamsRow = Record<string, unknown>;

function str(v: unknown): string | null {
  return v == null || v === "" ? null : String(v);
}
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function bool(v: unknown, dflt: boolean): boolean {
  return typeof v === "boolean" ? v : dflt;
}

/** regime_contrato (DB: INTEGRAL/PARCIAL/INTERMITENTE) → engine. */
export function normalizeRegime(raw: unknown): string {
  const m: Record<string, string> = {
    INTEGRAL: "tempo_integral",
    TEMPO_INTEGRAL: "tempo_integral",
    PARCIAL: "tempo_parcial",
    TEMPO_PARCIAL: "tempo_parcial",
    INTERMITENTE: "intermitente",
  };
  return m[String(raw ?? "").toUpperCase()] ?? "tempo_integral";
}

/** Mapeia uma linha de pjecalc_calculos → PjecalcParametrosRow (shape do engine). */
export function mapCalculoRowToParametros(row: CalculoParamsRow): PjecalcParametrosRow {
  const pf = row.pontos_facultativos;
  return {
    id: String(row.id ?? ""),
    case_id: String(row.case_id ?? ""),
    estado: str(row.uf),
    municipio: str(row.municipio_ibge),
    data_admissao: str(row.data_admissao),
    data_demissao: str(row.data_demissao),
    data_ajuizamento: str(row.data_ajuizamento),
    data_inicial: str(row.data_inicio_calculo),
    data_final: str(row.data_fim_calculo),
    prescricao_quinquenal: bool(row.prescricao_quinquenal, false),
    prescricao_fgts: bool(row.prescricao_fgts, false),
    regime_trabalho: normalizeRegime(row.regime_contrato),
    carga_horaria_padrao: num(row.divisor_horas) ?? 220,
    maior_remuneracao: num(row.valor_maior_remuneracao),
    ultima_remuneracao: num(row.valor_ultima_remuneracao),
    prazo_aviso_previo: str(row.prazo_aviso_previo) ?? "nao_apurar",
    prazo_aviso_dias: num(row.aviso_previo_dias),
    projetar_aviso_indenizado: bool(row.projetar_aviso_indenizado, true),
    limitar_avos_periodo: bool(row.limitar_avos_periodo_calculo, false),
    zerar_valor_negativo: bool(row.zera_valor_negativo, false),
    sabado_dia_util: bool(row.sabado_dia_util, true),
    considerar_feriado_estadual: bool(row.considera_feriado_estadual, true),
    considerar_feriado_municipal: bool(row.considera_feriado_municipal, true),
    tipo_mes: (str(row.tipo_mes) as "civil" | "comercial" | null) ?? "comercial",
    jornada_semanal: num(row.jornada_contratual_horas),
    comentarios: str(row.observacoes),
    pontos_facultativos: Array.isArray(pf) ? (pf as string[]) : [],
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}
