import type { CtpsLotacao } from '../../../tipos-dominio.ts';

/**
 * HISTÓRICO DE LOTAÇÃO: 4 colunas tabulares
 *   Ingresso | Estabelecimento (cod - nome) | CNPJ | Centro de Resultado
 *
 * Forma observada (extrairGeometrico):
 *   01/01/2009 363 - CASA BAHIA COMERCIAL LTDA - PI 59.291.534/0511-52 3 - F.363 PINHAIS
 *
 * Âncora forte = CNPJ formatado (NN.NNN.NNN/NNNN-NN). `.+?` lazy
 * absorve o nome do estabelecimento mesmo que ele contenha " - " (ex.:
 * "CASA BAHIA COMERCIAL LTDA - PI").
 */
const RE_LINHA =
  /^\s*(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s*-\s*(.+?)\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+(.+)$/;

export function parseHistoricoLotacao(linhas: string[]): CtpsLotacao[] {
  const resultado: CtpsLotacao[] = [];
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA);
    if (!m) continue;
    resultado.push({
      ingresso: m[1],
      codigo_estabelecimento: m[2],
      estabelecimento: m[3].trim(),
      cnpj_estabelecimento: m[4],
      centro_resultado: m[5].trim(),
    });
  }
  return resultado;
}
