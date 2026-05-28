import type { CtpsAfastamento } from '../../../tipos-dominio.ts';
import {
  detectarColunasTabela,
  extrairCelulas,
  indiceLinhaSeparadorTabela,
} from '../helpers.ts';

/**
 * AFASTAMENTOS e AFASTAMENTOS_OUTROS compartilham o mesmo layout:
 *   Data Afastamento | Situação do Afastamento | Retorno
 *
 * `tipo` controla as regras de derivação de `categoria`:
 *   - "principal" (AFASTAMENTOS): Demissão → desligamento; Suspensão/etc → afastamento
 *   - "outros" (AFASTAMENTOS_OUTROS): Atestado → atestado_medico; Auxilio Doença → auxilio_doenca; outros → outros
 */
export function parseAfastamentos(
  linhas: string[],
  tipo: 'principal' | 'outros',
): CtpsAfastamento[] {
  if (linhas.length === 0) return [];

  const sepIdx = indiceLinhaSeparadorTabela(linhas);
  if (sepIdx === -1) return [];

  const colunas = detectarColunasTabela(linhas[sepIdx]);
  if (colunas.length < 3) return [];

  const resultado: CtpsAfastamento[] = [];
  for (let i = sepIdx + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha.trim()) continue;
    if (/^\s*¯/.test(linha)) continue;
    const celulas = extrairCelulas(linha, colunas);
    const dataInicio = celulas[0];
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataInicio)) continue;

    const situacao = (celulas[1] ?? '').trim();
    const retorno = celulas[2] && /^\d{2}\/\d{2}\/\d{4}$/.test(celulas[2]) ? celulas[2] : null;

    resultado.push({
      data_inicio: dataInicio,
      situacao,
      retorno,
      categoria: derivarCategoria(situacao, tipo),
    });
  }
  return resultado;
}

function derivarCategoria(
  situacao: string,
  tipo: 'principal' | 'outros',
): CtpsAfastamento['categoria'] {
  if (tipo === 'principal') {
    if (/demiss/i.test(situacao)) return 'desligamento';
    return 'afastamento';
  }
  // outros
  if (/atestado/i.test(situacao)) return 'atestado_medico';
  if (/aux[íi]lio\s+doen/i.test(situacao)) return 'auxilio_doenca';
  return 'outros';
}
