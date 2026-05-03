/**
 * Reconciliação multi-fonte (regex × IA) — gera diff campo-a-campo
 * por apuração diária para que o operador revise APENAS as divergências.
 *
 * Foco em Cartão-Ponto (caso mais complexo). Para Férias / Faltas /
 * Holerite a heurística é mais simples e está embutida nos respectivos
 * dialogs.
 */

import type {
  ApuracaoDiaria,
  Marcacao,
  ParseCartaoPontoResult,
} from "../parsers/cartao-ponto";
import { checkHorasTrabalhadas } from "../quality/cross-validation";

export type StatusReconciliacao =
  /** Ambas fontes concordam — auto-aceito. */
  | "agree"
  /** Apenas a regex tem dados (IA não trouxe). */
  | "only-regex"
  /** Apenas a IA tem dados (regex falhou — provável erro do parser). */
  | "only-ia"
  /** Ambas têm dados mas divergem — operador decide. */
  | "differ"
  /** Ambas falharam — manual. */
  | "both-empty";

export interface ApuracaoReconciliada {
  data: string;
  status: StatusReconciliacao;
  /** Apuração escolhida automaticamente como a "melhor". */
  escolhida: ApuracaoDiaria | null;
  /** Origem da escolha. */
  origemEscolhida: "regex" | "ia" | "manual";
  fontes: {
    regex: ApuracaoDiaria | null;
    ia: ApuracaoDiaria | null;
  };
  /** Lista de campos que diferem (vazio quando status=agree). */
  diffs: Array<{
    campo: "ocorrencia" | "marcacoes" | "eventos";
    detalhe: string;
  }>;
  /** Se a apuração escolhida tem cross-check de Horas Trabalhadas falhando. */
  htDiscrepancia: boolean;
}

export interface ReconciliacaoCartaoPonto {
  /** Resultado por dia (ordenado cronologicamente). */
  dias: ApuracaoReconciliada[];
  /** Contadores agregados pra UI. */
  contadores: {
    total: number;
    agree: number;
    onlyRegex: number;
    onlyIa: number;
    differ: number;
    bothEmpty: number;
    htDiscrepancias: number;
  };
}

function marcacoesIguais(a: Marcacao[], b: Marcacao[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].e !== b[i].e || a[i].s !== b[i].s) return false;
  }
  return true;
}

function diffMarcacoes(a: Marcacao[], b: Marcacao[]): string {
  const sa = a.map((m) => `${m.e}-${m.s}`).join(" ");
  const sb = b.map((m) => `${m.e}-${m.s}`).join(" ");
  return `regex: [${sa}]  IA: [${sb}]`;
}

/**
 * Reconciliação por dia.
 *
 * Estratégia de escolha automática:
 *   1. Se ambas concordam → escolhe regex (mesma coisa, sem custo).
 *   2. Se só regex tem dados → escolhe regex.
 *   3. Se só IA tem dados → escolhe IA (regex falhou, IA salvou).
 *   4. Se divergem:
 *      a. Se uma tem cross-check de HT OK e outra não → escolhe a OK.
 *      b. Senão → escolhe a com mais marcações preenchidas.
 *      c. Empate → regex (mais previsível, usuário pode forçar IA).
 */
export function reconcileCartaoPonto(
  regex: ParseCartaoPontoResult,
  ia: ParseCartaoPontoResult,
): ReconciliacaoCartaoPonto {
  const datasUnicas = new Set<string>();
  for (const a of regex.apuracoes) datasUnicas.add(a.data);
  for (const a of ia.apuracoes) datasUnicas.add(a.data);
  const sortedDatas = [...datasUnicas].sort();

  const mapRegex = new Map(regex.apuracoes.map((a) => [a.data, a]));
  const mapIa = new Map(ia.apuracoes.map((a) => [a.data, a]));

  const dias: ApuracaoReconciliada[] = [];
  const contadores = {
    total: 0,
    agree: 0,
    onlyRegex: 0,
    onlyIa: 0,
    differ: 0,
    bothEmpty: 0,
    htDiscrepancias: 0,
  };

  for (const data of sortedDatas) {
    const r = mapRegex.get(data) ?? null;
    const i = mapIa.get(data) ?? null;

    let status: StatusReconciliacao;
    let escolhida: ApuracaoDiaria | null;
    let origemEscolhida: "regex" | "ia" | "manual";
    const diffs: ApuracaoReconciliada["diffs"] = [];

    if (!r && !i) {
      status = "both-empty";
      escolhida = null;
      origemEscolhida = "manual";
    } else if (r && !i) {
      status = "only-regex";
      escolhida = r;
      origemEscolhida = "regex";
    } else if (!r && i) {
      status = "only-ia";
      escolhida = i;
      origemEscolhida = "ia";
    } else if (r && i) {
      const ocOk = r.ocorrencia === i.ocorrencia;
      const marcOk = marcacoesIguais(r.marcacoes, i.marcacoes);
      if (ocOk && marcOk) {
        status = "agree";
        escolhida = r;
        origemEscolhida = "regex";
      } else {
        status = "differ";
        if (!ocOk) {
          diffs.push({
            campo: "ocorrencia",
            detalhe: `regex: ${r.ocorrencia}  IA: ${i.ocorrencia}`,
          });
        }
        if (!marcOk) {
          diffs.push({
            campo: "marcacoes",
            detalhe: diffMarcacoes(r.marcacoes, i.marcacoes),
          });
        }
        // Escolhe a melhor por cross-check HT.
        const htR = checkHorasTrabalhadas(r);
        const htI = checkHorasTrabalhadas(i);
        if (htR.ok && !htI.ok) {
          escolhida = r;
          origemEscolhida = "regex";
        } else if (!htR.ok && htI.ok) {
          escolhida = i;
          origemEscolhida = "ia";
        } else if (
          i.marcacoes.filter((m) => m.e || m.s).length >
          r.marcacoes.filter((m) => m.e || m.s).length
        ) {
          escolhida = i;
          origemEscolhida = "ia";
        } else {
          escolhida = r;
          origemEscolhida = "regex";
        }
      }
    } else {
      status = "both-empty";
      escolhida = null;
      origemEscolhida = "manual";
    }

    const htDiscrepancia =
      escolhida && escolhida.marcacoes.length > 0
        ? !checkHorasTrabalhadas(escolhida).ok
        : false;
    if (htDiscrepancia) contadores.htDiscrepancias += 1;

    dias.push({
      data,
      status,
      escolhida,
      origemEscolhida,
      fontes: { regex: r, ia: i },
      diffs,
      htDiscrepancia,
    });

    contadores.total += 1;
    if (status === "agree") contadores.agree += 1;
    else if (status === "only-regex") contadores.onlyRegex += 1;
    else if (status === "only-ia") contadores.onlyIa += 1;
    else if (status === "differ") contadores.differ += 1;
    else if (status === "both-empty") contadores.bothEmpty += 1;
  }

  return { dias, contadores };
}

/**
 * Aplica a reconciliação convertendo de volta para `ParseCartaoPontoResult`
 * — útil pra alimentar o dialog atual sem refatoração massiva.
 */
export function reconciliacaoToParseResult(
  rec: ReconciliacaoCartaoPonto,
  base: ParseCartaoPontoResult,
): ParseCartaoPontoResult {
  const apuracoes = rec.dias
    .filter((d) => d.escolhida !== null)
    .map((d) => d.escolhida!);
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
  return {
    apuracoes,
    competencias,
    competencia_predominante: predominante,
    data_inicial: apuracoes[0]?.data ?? "",
    data_final: apuracoes[apuracoes.length - 1]?.data ?? "",
    warnings: [
      ...base.warnings,
      `Reconciliado: ${rec.contadores.agree} OK, ${rec.contadores.differ + rec.contadores.onlyIa + rec.contadores.onlyRegex} ajustados pela IA.`,
    ],
    unparsed_lines: base.unparsed_lines,
    parser_version: `${base.parser_version}+reconciled`,
  };
}
