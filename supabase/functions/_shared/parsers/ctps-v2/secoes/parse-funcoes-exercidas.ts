import type { CtpsFuncaoExercida } from '../../../tipos-dominio.ts';
import { parseBoolBR } from '../helpers.ts';

/**
 * FUNÇÕES EXERCIDAS: 7 colunas tabulares
 *   Data de Alteração | Cargo (cod-nome) | Função (cod-nome) | Motivo |
 *   Q.Caixa | Insal. | Pericul.
 *
 * Forma observada (extrairGeometrico, motivo vazio nos 3 fixtures):
 *   01/01/2009 403882 - VENDEDOR DE MOVEIS 403882 - VENDEDOR DE MOVEIS Não Não Não
 *
 * Âncora forte = 3 booleans no final (Sim/Não/Nao). `.+?` lazy nos nomes
 * cresce até as 3 booleans casarem. Motivo NÃO é capturado nesta versão —
 * nos 3 fixtures reais sempre vem vazio; quando aparecer (futuro), inserir
 * captura opcional entre função e booleans.
 */
const BOOL = '(Sim|N[ãa]o|S|N)';
const RE_LINHA = new RegExp(
  `^\\s*(\\d{2}\\/\\d{2}\\/\\d{4})\\s+(\\d+)\\s*-\\s*(.+?)\\s+(\\d+)\\s*-\\s*(.+?)\\s+${BOOL}\\s+${BOOL}\\s+${BOOL}\\s*$`,
);

export function parseFuncoesExercidas(linhas: string[]): CtpsFuncaoExercida[] {
  const resultado: CtpsFuncaoExercida[] = [];
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA);
    if (!m) continue;
    resultado.push({
      data_alteracao: m[1],
      codigo_cargo: m[2],
      cargo: m[3].trim(),
      codigo_funcao: m[4],
      funcao: m[5].trim(),
      motivo: null,
      quebra_caixa: parseBoolBR(m[6]) ?? false,
      insalubre: parseBoolBR(m[7]) ?? false,
      periculoso: parseBoolBR(m[8]) ?? false,
    });
  }
  return resultado;
}
