import type { CtpsHistoricoSalarialItem } from '../../../tipos-dominio.ts';
import { parseNumeroBROuNull } from '../helpers.ts';

/**
 * HISTÓRICO SALARIAL: parser por regex linha-a-linha. Robusto ao formato
 * `extrairGeometrico` (1 espaço entre tokens) — o parser column-based antigo
 * dependia de posições fixas do `pdftotext -layout` e zerava no texto real.
 *
 *   Data Vigência | Data Histórica | Motivo | Sal.Tarefa | % Reajuste | Min. Grtd. | Comissão
 *
 * Forma observada (Roque/Izabela/Joseli):
 *   01/01/2009 01/01/2009 ADMISSÃO 0,00 -100,000000 0,00
 *   08/07/2020 08/07/2020 Redução Salarial COVID/19 25% 0,00 ? 0,00
 *
 * Layout numérico: 3 tokens (sal_tarefa, perc_reajuste, comissao). `min_garantido`
 * vem como null sempre nesta amostra — formato com 4 numéricos (comissionista
 * com mínimo garantido) ainda não foi observado em texto real V6; quando
 * aparecer, adicionar regex 4-num com fallback pra 3-num.
 */
const RE_LINHA =
  /^\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d.,]+|\?)\s+(-?[\d.,]+|\?)\s+(-?[\d.,]+|\?)\s*$/;

export function parseHistoricoSalarial(linhas: string[]): CtpsHistoricoSalarialItem[] {
  const resultado: CtpsHistoricoSalarialItem[] = [];
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA);
    if (!m) continue;
    resultado.push({
      data_vigencia: m[1],
      data_historica: m[2],
      motivo: m[3].trim(),
      sal_tarefa: parseNumeroBROuNull(m[4]),
      perc_reajuste: parseNumeroBROuNull(m[5]),
      min_garantido: null,
      comissao: parseNumeroBROuNull(m[6]),
    });
  }
  return resultado;
}
