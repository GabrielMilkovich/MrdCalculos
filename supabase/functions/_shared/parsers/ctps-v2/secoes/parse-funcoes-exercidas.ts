import type { CtpsFuncaoExercida } from '../../../tipos-dominio.ts';
import {
  detectarColunasTabela,
  extrairCelulas,
  indiceLinhaSeparadorTabela,
  parseBoolBR,
} from '../helpers.ts';

/**
 * FUNÇÕES EXERCIDAS: tabular com 7 colunas.
 *   Data de Alteração | Cargo | Função | Motivo | Q. Caixa | Insal. | Pericul.
 *
 * Cargo e Função vêm como "código - nome" (ex. "403888 - VENDEDOR INTERNO").
 * Splitamos em código + nome (cargo, codigo_cargo, funcao, codigo_funcao).
 */
export function parseFuncoesExercidas(linhas: string[]): CtpsFuncaoExercida[] {
  if (linhas.length === 0) return [];

  const sepIdx = indiceLinhaSeparadorTabela(linhas);
  if (sepIdx === -1) return [];

  const colunas = detectarColunasTabela(linhas[sepIdx]);
  if (colunas.length < 6) return [];

  const resultado: CtpsFuncaoExercida[] = [];
  for (let i = sepIdx + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha.trim()) continue;
    if (/^\s*¯/.test(linha)) continue;
    const celulas = extrairCelulas(linha, colunas);
    const dataAlt = celulas[0];
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataAlt)) continue;

    const cargoRaw = celulas[1] ?? '';
    const funcaoRaw = celulas[2] ?? '';
    const { codigo: codCargo, nome: nomeCargo } = splitCodigoNome(cargoRaw);
    const { codigo: codFuncao, nome: nomeFuncao } = splitCodigoNome(funcaoRaw);

    const motivo = (celulas[3] ?? '').trim();

    resultado.push({
      data_alteracao: dataAlt,
      codigo_cargo: codCargo,
      cargo: nomeCargo,
      codigo_funcao: codFuncao,
      funcao: nomeFuncao,
      motivo: motivo || null,
      quebra_caixa: parseBoolBR(celulas[4]) ?? false,
      insalubre: parseBoolBR(celulas[5]) ?? false,
      periculoso: parseBoolBR(celulas[6]) ?? false,
    });
  }
  return resultado;
}

function splitCodigoNome(s: string): { codigo: string; nome: string } {
  const m = s.match(/^(\d+)\s*-\s*(.+)$/);
  if (m) return { codigo: m[1], nome: m[2].trim() };
  return { codigo: '', nome: s.trim() };
}
