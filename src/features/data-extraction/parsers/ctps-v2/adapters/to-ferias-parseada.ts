import type { CtpsDominioV2 } from '@/domain/tipos-dominio';
import type { FeriasParseada, ParseFeriasResult } from '../../ferias';

/**
 * Adapta `CtpsDominioV2.historico_ferias[]` (formato V2) pra
 * `ParseFeriasResult` (formato esperado pela `CtpsReviewDialog`).
 *
 * Agrupa entries do mesmo aquisitivo em uma única FeriasParseada
 * (caso gozo fracionado: G1/G2/G3).
 */
export function adaptarFerias(ctps: CtpsDominioV2): ParseFeriasResult {
  const grupos = new Map<string, CtpsDominioV2['historico_ferias']>();
  for (const item of ctps.historico_ferias) {
    const key = `${item.periodo_aquisitivo_inicio}|${item.periodo_aquisitivo_fim}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(item);
  }

  const ferias: FeriasParseada[] = [];
  for (const itens of grupos.values()) {
    const primeiro = itens[0];
    const anoAq1 = primeiro.periodo_aquisitivo_inicio.slice(6);
    const anoAq2 = primeiro.periodo_aquisitivo_fim.slice(6);
    const abonoTotal = itens.reduce((acc, i) => acc + i.abono_dias, 0);
    const g1 = itens[0];
    const g2 = itens[1] ?? null;
    const g3 = itens[2] ?? null;

    ferias.push({
      relativa: `${anoAq1}/${anoAq2}`,
      prazo: 30,
      prazo_origem: 'default',
      situacao: 'G',
      dobra_geral: false,
      abono: abonoTotal > 0,
      dias_abono: abonoTotal,
      gozo1: { inicio: g1.periodo_gozo_inicio, fim: g1.periodo_gozo_fim, dobra: false },
      gozo2: g2 ? { inicio: g2.periodo_gozo_inicio, fim: g2.periodo_gozo_fim, dobra: false } : null,
      gozo3: g3 ? { inicio: g3.periodo_gozo_inicio, fim: g3.periodo_gozo_fim, dobra: false } : null,
    });
  }

  return {
    ferias,
    warnings: [],
    unparsed_lines: [],
  };
}
