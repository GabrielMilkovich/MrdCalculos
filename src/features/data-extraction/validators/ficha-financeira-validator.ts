import Decimal from 'decimal.js';

Decimal.set({ precision: 20 });

export interface RubricaParaValidacao {
  codigo: string;
  classificacao: string;
  categoria: string;
  valores_mensais: Array<{ competencia: string; valor: number }>;
}

export interface CompetenciaValidacao {
  competencia: string;
  total_extraido: Decimal;
  total_pdf: Decimal | null;
  delta_abs: Decimal;
  delta_pct: Decimal;
  status: 'ok' | 'fora_tolerancia' | 'total_pdf_ausente';
}

export interface ValidacaoResumo {
  total_competencias: number;
  competencias_ok: number;
  competencias_fora: number;
  competencias_sem_total: number;
  pior_delta_pct: Decimal;
}

export interface ValidationResult {
  ok: boolean;
  competencias: CompetenciaValidacao[];
  resumo: ValidacaoResumo;
}

export function validarFichaFinanceira(
  rubricas: RubricaParaValidacao[],
  totaisPorMesPDF: Map<string, number>,
  tolerancePct: number = 1.0,
): ValidationResult {
  const somaPorCompetencia = new Map<string, Decimal>();

  for (const r of rubricas) {
    if (r.classificacao.toUpperCase() !== 'PGTO') continue;

    for (const v of r.valores_mensais) {
      const atual = somaPorCompetencia.get(v.competencia) ?? new Decimal(0);
      somaPorCompetencia.set(v.competencia, atual.plus(new Decimal(v.valor)));
    }
  }

  const todasCompetencias = new Set([
    ...somaPorCompetencia.keys(),
    ...totaisPorMesPDF.keys(),
  ]);

  const competencias: CompetenciaValidacao[] = [];

  for (const comp of [...todasCompetencias].sort()) {
    const totalExtraido = somaPorCompetencia.get(comp) ?? new Decimal(0);
    const totalPdfRaw = totaisPorMesPDF.get(comp);
    const totalPdf = totalPdfRaw != null ? new Decimal(totalPdfRaw) : null;

    if (totalPdf === null || totalPdf.isZero()) {
      competencias.push({
        competencia: comp,
        total_extraido: totalExtraido,
        total_pdf: null,
        delta_abs: new Decimal(0),
        delta_pct: new Decimal(0),
        status: 'total_pdf_ausente',
      });
      continue;
    }

    const delta_abs = totalExtraido.minus(totalPdf).abs();
    const delta_pct = delta_abs.dividedBy(totalPdf).times(100);

    const status = delta_pct.lte(tolerancePct) ? 'ok' : 'fora_tolerancia';

    competencias.push({
      competencia: comp,
      total_extraido: totalExtraido,
      total_pdf: totalPdf,
      delta_abs,
      delta_pct,
      status,
    });
  }

  const competencias_ok = competencias.filter((c) => c.status === 'ok').length;
  const competencias_fora = competencias.filter((c) => c.status === 'fora_tolerancia').length;
  const competencias_sem_total = competencias.filter((c) => c.status === 'total_pdf_ausente').length;

  const pior_delta_pct = competencias.reduce(
    (max, c) => (c.delta_pct.gt(max) ? c.delta_pct : max),
    new Decimal(0),
  );

  return {
    ok: competencias_fora === 0,
    competencias,
    resumo: {
      total_competencias: competencias.length,
      competencias_ok,
      competencias_fora,
      competencias_sem_total,
      pior_delta_pct,
    },
  };
}
