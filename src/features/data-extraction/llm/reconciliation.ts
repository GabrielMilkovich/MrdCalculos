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
  EventoDiario,
  Marcacao,
  ParseCartaoPontoResult,
  TipoEvento,
} from "../parsers/cartao-ponto";
import { checkHorasTrabalhadas, hhmmToMin } from "../quality/cross-validation";

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

/** Mapa de eventos por tipo, com valor literal. Tipos duplicados → último vence. */
function indexarEventos(eventos: EventoDiario[]): Map<TipoEvento, string> {
  const m = new Map<TipoEvento, string>();
  for (const e of eventos) m.set(e.tipo, e.valor);
  return m;
}

/**
 * Compara dois conjuntos de eventos. Retorna lista de diferenças significativas
 * encontradas — ignora rótulos puramente cosméticos. Para valores HH:MM,
 * tolera ±1 minuto (arredondamento de OCR).
 *
 * Eventos onde ambas fontes têm o mesmo tipo mas valores diferentes são o
 * sinal mais grave: indica que regex ou IA parou na linha errada do OCR.
 */
function diffEventos(
  a: EventoDiario[],
  b: EventoDiario[],
): { diferentes: string[]; soRegex: TipoEvento[]; soIa: TipoEvento[] } {
  const idxA = indexarEventos(a);
  const idxB = indexarEventos(b);
  const diferentes: string[] = [];
  const soRegex: TipoEvento[] = [];
  const soIa: TipoEvento[] = [];
  const tiposA = new Set(idxA.keys());
  const tiposB = new Set(idxB.keys());
  for (const t of tiposA) {
    if (!tiposB.has(t)) {
      soRegex.push(t);
      continue;
    }
    const va = idxA.get(t)!;
    const vb = idxB.get(t)!;
    if (va === vb) continue;
    // Tolerância ±1 min para valores HH:MM (arredondamento OCR).
    const ma = hhmmToMin(va);
    const mb = hhmmToMin(vb);
    if (ma !== null && mb !== null && Math.abs(ma - mb) <= 1) continue;
    diferentes.push(`${t}: regex=${va} | IA=${vb}`);
  }
  for (const t of tiposB) {
    if (!tiposA.has(t)) soIa.push(t);
  }
  return { diferentes, soRegex, soIa };
}

/**
 * "Riqueza" de eventos: quanto mais tipos juridicamente relevantes (HE,
 * banco de horas, RSR, intrajornada), mais valiosa a apuração.
 */
const PESO_EVENTO_RELEVANTE: Partial<Record<TipoEvento, number>> = {
  horas_trabalhadas: 3,
  he_com_70: 5,
  he_intervalo: 5,
  he_feriado_0: 5,
  he_feriado_100: 5,
  banco_horas_debito: 4,
  banco_horas_credito: 4,
  banco_horas_70: 4,
  rsr_trabalhado_0: 4,
  intrajornada_sup_2hs: 3,
  intrajornada: 2,
  interjornada: 2,
  feriado_dias: 2,
  dsr_semanal_dias: 2,
  horas_previstas: 1,
};

function pesoEventos(eventos: EventoDiario[]): number {
  return eventos.reduce(
    (sum, e) => sum + (PESO_EVENTO_RELEVANTE[e.tipo] ?? 1),
    0,
  );
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
      // Diff de EVENTOS (HT, banco horas, HE feriado, intrajornada, etc.).
      // Antes da v3.1, dois dias com batidas iguais mas eventos diferentes
      // passavam como AGREE — bug semântico, porque eventos divergentes
      // indicam que uma das fontes leu o totalizador errado da linha.
      const eventosDiff = diffEventos(r.eventos, i.eventos);
      const eventosOk =
        eventosDiff.diferentes.length === 0 &&
        eventosDiff.soRegex.length === 0 &&
        eventosDiff.soIa.length === 0;
      if (ocOk && marcOk && eventosOk) {
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
        if (!eventosOk) {
          const partes: string[] = [];
          if (eventosDiff.diferentes.length > 0) {
            partes.push(`valores divergentes [${eventosDiff.diferentes.join("; ")}]`);
          }
          if (eventosDiff.soRegex.length > 0) {
            partes.push(`só regex: ${eventosDiff.soRegex.join(", ")}`);
          }
          if (eventosDiff.soIa.length > 0) {
            partes.push(`só IA: ${eventosDiff.soIa.join(", ")}`);
          }
          diffs.push({
            campo: "eventos",
            detalhe: partes.join(" — "),
          });
        }
        // Escolha automática em cascata:
        //   1. Cross-check HT — fonte cuja soma E/S bate vence
        //   2. Mais marcações preenchidas
        //   3. Mais "peso" de eventos juridicamente relevantes (HE, banco...)
        //   4. Empate → regex (mais previsível)
        const htR = checkHorasTrabalhadas(r);
        const htI = checkHorasTrabalhadas(i);
        if (htR.ok && !htI.ok) {
          escolhida = r;
          origemEscolhida = "regex";
        } else if (!htR.ok && htI.ok) {
          escolhida = i;
          origemEscolhida = "ia";
        } else {
          const marcR = r.marcacoes.filter((m) => m.e || m.s).length;
          const marcI = i.marcacoes.filter((m) => m.e || m.s).length;
          if (marcI > marcR) {
            escolhida = i;
            origemEscolhida = "ia";
          } else if (marcR > marcI) {
            escolhida = r;
            origemEscolhida = "regex";
          } else {
            // Empate em batidas — desempata por riqueza de eventos.
            const pesoR = pesoEventos(r.eventos);
            const pesoI = pesoEventos(i.eventos);
            if (pesoI > pesoR) {
              escolhida = i;
              origemEscolhida = "ia";
            } else {
              escolhida = r;
              origemEscolhida = "regex";
            }
          }
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
