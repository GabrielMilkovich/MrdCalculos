import type { CtpsDependente } from '../../../tipos-dominio.ts';
import {
  detectarColunasTabela,
  extrairCelulas,
  indiceLinhaSeparadorTabela,
  parseBoolBR,
} from '../helpers.ts';

export function parseDependentes(linhas: string[]): CtpsDependente[] {
  if (linhas.length === 0) return [];

  // Procura a SEGUNDA linha de separadores ¯¯¯¯ (a primeira é decorativa,
  // a segunda separa o cabeçalho das colunas dos dados).
  const sepIdx = indiceLinhaSeparadorTabela(linhas);
  if (sepIdx === -1) return [];

  const colunas = detectarColunasTabela(linhas[sepIdx]);
  if (colunas.length < 5) return [];

  const resultado: CtpsDependente[] = [];
  for (let i = sepIdx + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha.trim()) continue;
    if (/^\s*¯/.test(linha)) continue;
    const celulas = extrairCelulas(linha, colunas);
    if (!celulas[0]) continue;
    resultado.push({
      nome: celulas[0],
      parentesco: celulas[1] ?? '',
      sexo: (celulas[2] as 'Masculino' | 'Feminino' | undefined) ?? null,
      nascimento: celulas[3] ?? '',
      irrf: parseBoolBR(celulas[4]) ?? false,
      salario_familia: parseBoolBR(celulas[5]) ?? false,
    });
  }
  return resultado;
}
