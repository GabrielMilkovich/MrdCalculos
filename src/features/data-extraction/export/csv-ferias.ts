/**
 * CSV de Férias — formato oficial PJe-Calc Cidadão.
 *
 * Validado byte-a-byte contra modelo oficial:
 *   modelo de exemplo csv/ExemploFerias.csv
 *
 * Spec do parser:
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeFerias.java
 *   pjecalc-fonte/negocio/.../constantes/SituacaoDaFeriasEnum.java
 *
 * Características obrigatórias:
 *   - Header LITERAL exato (15 colunas, sem aspas):
 *       RELATIVAS;PRAZO;SITUACAO;DOBRA;ABONO;QTD_DIAS_ABONO;
 *       G1INI;G1FIM;G1DOBRA;G2INI;G2FIM;G2DOBRA;G3INI;G3FIM;G3DOBRA
 *   - **Gozos vazios → célula vazia (não "N")**. Linha do exemplo oficial:
 *       2012/2013;30;G;N;S;10;20/01/2013;08/02/2013;N;;;;;;
 *     (gozo2 e gozo3 vazios deixam dobra vazia também, NÃO "N").
 *   - Encoding UTF-8.
 *   - Delimitador `;`.
 *   - Boolean `S` / `N`.
 *   - Datas `dd/MM/yyyy`.
 *   - Situação: G | GP | NG | I | P (códigos curtos).
 *   - Line ending CRLF.
 *   - **IMPORTANTE**: parser BUSCA férias existentes pela `relativa`. Os
 *     períodos aquisitivos precisam estar cadastrados antes da importação.
 */
import type { GozoPeriodo, SituacaoFerias } from '../types';
import { formatBoolBR } from './format-br';
import { sanitizeText } from './sanitize';

const HEADER =
  'RELATIVAS;PRAZO;SITUACAO;DOBRA;ABONO;QTD_DIAS_ABONO;G1INI;G1FIM;G1DOBRA;G2INI;G2FIM;G2DOBRA;G3INI;G3FIM;G3DOBRA';
const CRLF = '\r\n';

export type FeriasCsvLinha = {
  relativa: string; // "aaaa/aaaa"
  prazo: number;
  situacao: SituacaoFerias;
  dobra_geral: boolean;
  abono: boolean;
  dias_abono: number;
  gozo1: GozoPeriodo | null;
  gozo2: GozoPeriodo | null;
  gozo3: GozoPeriodo | null;
};

/** Gozo nulo → 3 strings vazias (formato do modelo oficial). */
function gozoCols(g: GozoPeriodo | null): [string, string, string] {
  if (!g) return ['', '', ''];
  return [g.inicio, g.fim, formatBoolBR(g.dobra)];
}

export function buildFeriasCSV(linhas: FeriasCsvLinha[]): string {
  const rows = linhas.map((f) => {
    return [
      sanitizeText(f.relativa, 50),
      String(f.prazo),
      f.situacao,
      formatBoolBR(f.dobra_geral),
      formatBoolBR(f.abono),
      String(f.dias_abono),
      ...gozoCols(f.gozo1),
      ...gozoCols(f.gozo2),
      ...gozoCols(f.gozo3),
    ].join(';');
  });
  return [HEADER, ...rows].join(CRLF) + CRLF;
}
