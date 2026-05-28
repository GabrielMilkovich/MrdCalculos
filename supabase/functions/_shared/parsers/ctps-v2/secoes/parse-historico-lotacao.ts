import type { CtpsLotacao } from '../../../tipos-dominio.ts';
import {
  detectarColunasTabela,
  extrairCelulas,
  indiceLinhaSeparadorTabela,
} from '../helpers.ts';

/**
 * HISTÓRICO DE LOTAÇÃO: tabular com 4 colunas.
 *   Ingresso | Estabelecimento | CNPJ do Estabelecimento | Centro de Resultado
 *
 * Estabelecimento vem como "código - nome" (ex. "363 - CASA BAHIA...").
 */
export function parseHistoricoLotacao(linhas: string[]): CtpsLotacao[] {
  if (linhas.length === 0) return [];

  const sepIdx = indiceLinhaSeparadorTabela(linhas);
  if (sepIdx === -1) return [];

  const colunas = detectarColunasTabela(linhas[sepIdx]);
  if (colunas.length < 4) return [];

  const resultado: CtpsLotacao[] = [];
  for (let i = sepIdx + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha.trim()) continue;
    if (/^\s*¯/.test(linha)) continue;
    const celulas = extrairCelulas(linha, colunas);
    const ingresso = celulas[0];
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(ingresso)) continue;

    const estabRaw = celulas[1] ?? '';
    const m = estabRaw.match(/^(\d+)\s*-\s*(.+)$/);
    const codigo = m ? m[1] : '';
    const nome = m ? m[2].trim() : estabRaw.trim();

    resultado.push({
      ingresso,
      codigo_estabelecimento: codigo,
      estabelecimento: nome,
      cnpj_estabelecimento: (celulas[2] ?? '').trim(),
      centro_resultado: (celulas[3] ?? '').trim(),
    });
  }
  return resultado;
}
