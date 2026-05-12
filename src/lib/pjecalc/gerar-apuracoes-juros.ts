/**
 * Sessão 5 — Gerador de ApuracaoDeJuros por competência.
 *
 * Cria objetos ApuracaoDeJuros AGREGADOS por (calculo, competência),
 * somando valor_corrigido, valor_inss e valor_irpf de todas as
 * ocorrências que vencem naquela competência.
 *
 * Porte de Calculo.calcularJuros() (Java 1519-1591) — a parte que falta
 * no port atual (que está stub em calculo.ts:887). O Java itera
 * `apuracoesDeJuros` para aplicar taxa por competência; aqui geramos
 * a coleção pra alimentar esse iterador.
 *
 * Saída: ApuracaoDeJuros[] indexada por competência via
 * ApuracaoDeJurosOptimizerListSearch.
 */
import Decimal from "decimal.js";
import type {
  PjeVerbaResult,
  PjeOcorrenciaResult,
  PjeIndiceRow,
} from "./engine-types";

const ZERO = new Decimal(0);

export interface ApuracaoDeJurosResumo {
  /** "yyyy-mm" — competência da apuração. */
  competencia: string;
  /** Soma de valor_corrigido de todas as ocorrências dessa competência. */
  valor_corrigido: number;
  /** Soma de juros calculados para essa competência. */
  juros: number;
  /** Soma para incidência de INSS (verba comum + 13º). */
  valor_verba_para_cs: number;
  valor_verba_para_cs_13: number;
  /** Para previdência privada. */
  valor_verba_para_prev: number;
  /** Bases para IRPF (13º / Férias / Demais). */
  valor_corrigido_irpf_13: number;
  valor_corrigido_irpf_ferias: number;
  valor_corrigido_irpf_demais: number;
  /** Quantidade de ocorrências agregadas nesta competência. */
  ocorrencias_agregadas: number;
}

/**
 * Agrega ocorrências por competência e calcula apuração de juros.
 *
 * `taxaJurosPorComp` deve devolver a taxa acumulada de juros aplicável
 * à competência (0 se não há juros). Para SELIC, esse acumulado já vem
 * embutido na curva. Para juros simples 1% am (TR-anteced.), a taxa é
 * calculada por: 0.01 × (meses até liquidação).
 */
export function gerarApuracoesDeJuros(
  verbas: PjeVerbaResult[],
  taxaJurosPorComp: (competencia: string) => number,
): ApuracaoDeJurosResumo[] {
  const porComp = new Map<string, ApuracaoDeJurosResumo>();

  for (const v of verbas) {
    const nomeLower = (v.nome ?? "").toLowerCase();
    const e13 = /13[º\sa]?\s*sal[áa]rio|d[eé]cimo\s+terceiro/.test(nomeLower);
    const isFerias = /\bf[ée]rias\b/.test(nomeLower);

    for (const oc of v.ocorrencias ?? []) {
      const competencia = extrairCompetencia(oc);
      if (!competencia) continue;

      const acc = porComp.get(competencia) ?? {
        competencia,
        valor_corrigido: 0,
        juros: 0,
        valor_verba_para_cs: 0,
        valor_verba_para_cs_13: 0,
        valor_verba_para_prev: 0,
        valor_corrigido_irpf_13: 0,
        valor_corrigido_irpf_ferias: 0,
        valor_corrigido_irpf_demais: 0,
        ocorrencias_agregadas: 0,
      };

      const corrigido = Number(oc.valor_corrigido ?? 0);
      acc.valor_corrigido += corrigido;
      acc.ocorrencias_agregadas += 1;

      if (e13) acc.valor_verba_para_cs_13 += corrigido;
      else acc.valor_verba_para_cs += corrigido;
      acc.valor_verba_para_prev += corrigido;

      if (e13) acc.valor_corrigido_irpf_13 += corrigido;
      else if (isFerias) acc.valor_corrigido_irpf_ferias += corrigido;
      else acc.valor_corrigido_irpf_demais += corrigido;

      porComp.set(competencia, acc);
    }
  }

  // Aplica taxa de juros por competência
  for (const acc of porComp.values()) {
    const taxa = taxaJurosPorComp(acc.competencia);
    const j = new Decimal(acc.valor_corrigido).times(taxa);
    acc.juros = j.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber();
  }

  return Array.from(porComp.values()).sort((a, b) =>
    a.competencia.localeCompare(b.competencia),
  );
}

/** Extrai "yyyy-mm" da ocorrência (tolera vários formatos de campo). */
function extrairCompetencia(oc: PjeOcorrenciaResult): string | null {
  const candidatos: string[] = [];
  const r = oc as unknown as Record<string, unknown>;
  for (const k of ["competencia", "data", "data_inicial", "data_final"]) {
    const v = r[k];
    if (typeof v === "string" && /^\d{4}-\d{2}/.test(v)) {
      candidatos.push(v.slice(0, 7));
    }
  }
  return candidatos[0] ?? null;
}

/**
 * Fator SELIC acumulado entre uma competência inicial e a data de liquidação.
 * Usa `indicesDB` filtrado por nome='SELIC' (case-insensitive variants).
 * Sem dados → 0.
 */
export function fatorSelicAcumulado(
  competencia: string,
  dataLiquidacao: string,
  indicesDB: PjeIndiceRow[],
): number {
  const compL = dataLiquidacao.slice(0, 7);
  const findAcum = (comp: string): number => {
    const row = indicesDB.find(
      (r) =>
        /selic/i.test(r.indice) && (r.competencia ?? "").slice(0, 7) === comp,
    );
    return row?.acumulado ?? 0;
  };
  const acumPag = findAcum(competencia);
  const acumLiq = findAcum(compL);
  if (acumPag <= 0 || acumLiq <= 0) return 0;
  return Math.max(0, (acumLiq - acumPag) / 100);
}

/**
 * Total de juros agregados (soma juros de todas as competências).
 * Comparável ao `resumo.juros_mora` do engine — usado para auditoria
 * lado-a-lado entre o caminho stub e a apuração canônica.
 */
export function totalJurosApurados(apuracoes: ApuracaoDeJurosResumo[]): number {
  return +apuracoes.reduce((s, a) => s + a.juros, 0).toFixed(2);
}
