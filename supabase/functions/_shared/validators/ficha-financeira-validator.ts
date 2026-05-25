// Semantic validator for ficha financeira extraction.
// Compares sum of extracted PGTO rubricas per month against Total
// Vencimentos from the PDF. Tolerance configurable (default 1%).
//
// Sprint 2 — Plano: docs/ARQUITETURA-FICHA-FINANCEIRA-CTPS.md

interface RubricaParaValidacao {
  classificacao: string;
  valores_mensais: Array<{ competencia: string; valor: number }>;
}

export interface CompetenciaValidacao {
  competencia: string;
  total_extraido: number;
  total_pdf: number | null;
  delta_abs: number;
  delta_pct: number;
  status: "ok" | "fora_tolerancia" | "total_pdf_ausente";
}

export interface ValidacaoResumo {
  total_competencias: number;
  competencias_ok: number;
  competencias_fora: number;
  competencias_sem_total: number;
  pior_delta_pct: number;
}

export interface ValidationResult {
  ok: boolean;
  competencias: CompetenciaValidacao[];
  resumo: ValidacaoResumo;
}

const DEFAULT_TOLERANCE_PCT = 1.0;

export function validarFichaFinanceira(
  rubricas: RubricaParaValidacao[],
  totaisPorMesPDF: Record<string, number>,
  tolerancePct?: number,
): ValidationResult {
  const tolerance = tolerancePct ??
    parseFloat(
      (typeof Deno !== "undefined"
        ? Deno.env.get("FICHA_VALIDATOR_TOLERANCE_PCT")
        : undefined) ?? String(DEFAULT_TOLERANCE_PCT),
    );

  const somaPorCompetencia = new Map<string, number>();

  for (const r of rubricas) {
    if (r.classificacao.toUpperCase() !== "PGTO") continue;
    for (const v of r.valores_mensais) {
      const atual = somaPorCompetencia.get(v.competencia) ?? 0;
      somaPorCompetencia.set(v.competencia, atual + v.valor);
    }
  }

  const todasCompetencias = new Set([
    ...somaPorCompetencia.keys(),
    ...Object.keys(totaisPorMesPDF),
  ]);

  const competencias: CompetenciaValidacao[] = [];

  for (const comp of [...todasCompetencias].sort()) {
    const totalExtraido = somaPorCompetencia.get(comp) ?? 0;
    const totalPdf = totaisPorMesPDF[comp] ?? null;

    if (totalPdf === null || totalPdf === 0) {
      competencias.push({
        competencia: comp,
        total_extraido: round2(totalExtraido),
        total_pdf: null,
        delta_abs: 0,
        delta_pct: 0,
        status: "total_pdf_ausente",
      });
      continue;
    }

    const delta_abs = Math.abs(totalExtraido - totalPdf);
    const delta_pct = (delta_abs / totalPdf) * 100;

    competencias.push({
      competencia: comp,
      total_extraido: round2(totalExtraido),
      total_pdf: round2(totalPdf),
      delta_abs: round2(delta_abs),
      delta_pct: round4(delta_pct),
      status: delta_pct <= tolerance ? "ok" : "fora_tolerancia",
    });
  }

  const competencias_ok = competencias.filter((c) => c.status === "ok").length;
  const competencias_fora = competencias.filter(
    (c) => c.status === "fora_tolerancia",
  ).length;
  const competencias_sem_total = competencias.filter(
    (c) => c.status === "total_pdf_ausente",
  ).length;

  const pior_delta_pct = competencias.reduce(
    (max, c) => Math.max(max, c.delta_pct),
    0,
  );

  return {
    ok: competencias_fora === 0,
    competencias,
    resumo: {
      total_competencias: competencias.length,
      competencias_ok,
      competencias_fora,
      competencias_sem_total,
      pior_delta_pct: round4(pior_delta_pct),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
