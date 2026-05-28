import type { CtpsHistoricoSalarialItem } from '../../../tipos-dominio.ts';
import {
  detectarColunasTabela,
  extrairCelulas,
  indiceLinhaSeparadorTabela,
  parseNumeroBROuNull,
} from '../helpers.ts';

/**
 * HISTÓRICO SALARIAL: tabular com 7 colunas.
 *   Data Vigência | Data Histórica | Motivo | Sal.Tarefa | % Reajuste | Min. Grtd. | Comissão
 *
 * Valores numéricos usam `parseNumeroBROuNull` — vazio e "?" viram null
 * (decisão de fielidade ao documento; engine decide o que significa).
 */
export function parseHistoricoSalarial(linhas: string[]): CtpsHistoricoSalarialItem[] {
  if (linhas.length === 0) return [];

  // Encontra primeiro separador (¯ depois do cabeçalho de colunas).
  const sepIdx = indiceLinhaSeparadorTabela(linhas);
  if (sepIdx === -1) return [];

  const colunas = detectarColunasTabela(linhas[sepIdx]);
  if (colunas.length < 6) return [];

  // OBSERVAÇÃO: o separador ¯¯¯¯ desta tabela tem 6 blocos visuais, mas
  // a tabela TEM 7 colunas — o último bloco cobre `Min. Grtd.` E `Comissão`
  // juntos (renderização condensada). Pra resolver: se a última célula
  // tiver 2 números separados por whitespace, primeiro = min, segundo = com.
  // Se 1 número, é comissao (min fica null — caso comissionista típico).
  const resultado: CtpsHistoricoSalarialItem[] = [];
  for (let i = sepIdx + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha.trim()) continue;
    if (/^\s*¯/.test(linha)) continue;
    const celulas = extrairCelulas(linha, colunas);
    const dataVig = celulas[0];
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataVig)) continue;

    const ultimaCelula = (celulas[5] ?? '').trim();
    const numerosUltima = ultimaCelula.split(/\s+/).filter((t) => t.length > 0);
    let minGarantido: number | null;
    let comissao: number | null;
    if (numerosUltima.length >= 2) {
      minGarantido = parseNumeroBROuNull(numerosUltima[0]);
      comissao = parseNumeroBROuNull(numerosUltima[1]);
    } else if (numerosUltima.length === 1) {
      minGarantido = null;
      comissao = parseNumeroBROuNull(numerosUltima[0]);
    } else {
      minGarantido = null;
      comissao = null;
    }

    resultado.push({
      data_vigencia: dataVig,
      data_historica: celulas[1] ?? '',
      motivo: (celulas[2] ?? '').trim(),
      sal_tarefa: parseNumeroBROuNull(celulas[3]),
      perc_reajuste: parseNumeroBROuNull(celulas[4]),
      min_garantido: minGarantido,
      comissao,
    });
  }
  return resultado;
}
