/**
 * Mapper puro Ferias (DB) → input PjeFerias do engine (Seção 6).
 * Sem dependência do Supabase client — testável isoladamente.
 *
 * Corrige o bug: antes o orchestrator lia colunas FICTÍCIAS (`dias`/`dias_abono`/
 * `dobra`/`gozo_inicio`) que não existem em pjecalc_ferias → prazo/abono/dobra/
 * gozos caíam nos defaults e NÃO chegavam ao engine. Agora lê as colunas REAIS
 * (`prazo_dias`/`abono_dias`/`dobra_geral`/`gozo_1|2|3_*`) e mapeia os 3 períodos
 * de gozo. Ver docs/specs/ferias.md §2.
 */
import type { PjeFerias, PjeFeriasGozoPeriodo } from "./engine-types";
import type { PjecalcFeriasRow } from "./types";

type SituacaoEngine = PjeFerias["situacao"];

/** Normaliza situação (DB pt-BR longo, código curto G/GP/NG/I/P, ou Java) → engine. */
export function normalizeSituacaoFerias(s: string | null | undefined): SituacaoEngine {
  const u = (s ?? "").toUpperCase();
  if (u.includes("INDENIZ") || u === "I") return "indenizadas";
  if (u.includes("PERDID") || u === "P") return "perdidas";
  if (u.includes("PARCIAL") || u === "GP") return "gozadas_parcialmente";
  // NAO_GOZADAS/NG e VENCIDAS caem em "gozadas" (engine não tem estado próprio;
  // tratado como não-indenizada). Default GOZADAS/G.
  return "gozadas";
}

/** Dias entre duas datas ISO inclusivas (fim − início + 1); 0 se inválido. */
function diasEntre(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 0;
  const di = new Date(inicio).getTime();
  const df = new Date(fim).getTime();
  if (Number.isNaN(di) || Number.isNaN(df) || df < di) return 0;
  return Math.round((df - di) / 86_400_000) + 1;
}

function gozos(f: PjecalcFeriasRow, prazoFallback: number): PjeFeriasGozoPeriodo[] {
  const out: PjeFeriasGozoPeriodo[] = [];
  const periodos: Array<[string | null, string | null]> = [
    [f.gozo_1_inicio, f.gozo_1_fim],
    [f.gozo_2_inicio, f.gozo_2_fim],
    [f.gozo_3_inicio, f.gozo_3_fim],
  ];
  for (const [inicio, fim] of periodos) {
    if (!inicio) continue;
    const fimReal = fim || inicio;
    const dias = diasEntre(inicio, fimReal) || prazoFallback;
    out.push({ inicio, fim: fimReal, dias });
  }
  return out;
}

export function mapFeriasToEngine(ferias: PjecalcFeriasRow[]): PjeFerias[] {
  return ferias.map((f) => {
    const prazo = f.prazo_dias ?? 30;
    return {
      id: f.id,
      relativas: "",
      periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio || "",
      periodo_aquisitivo_fim: f.periodo_aquisitivo_fim || "",
      periodo_concessivo_inicio: f.periodo_concessivo_inicio || "",
      periodo_concessivo_fim: f.periodo_concessivo_fim || "",
      prazo_dias: prazo,
      situacao: normalizeSituacaoFerias(f.situacao),
      dobra: f.dobra_geral ?? false,
      abono: f.abono ?? false,
      abono_dias: f.abono_dias || 0,
      periodos_gozo: gozos(f, prazo),
    };
  });
}
