/**
 * Gera o CSV de Cartão de Ponto no formato "Importar Jornada" do PJe-Calc
 * Cidadão (encoding ISO-8859-1, CRLF, ponto-vírgula como separador, até 6
 * pares de E/S por dia).
 *
 *   Header:  DATA;Entrada 1;Saida 1;...;Entrada 6;Saida 6
 *   Linhas:  dd/MM/yyyy;HH:MM;HH:MM;...
 *
 * Em dias FALTA/FERIADO/FOLGA/FERIAS/ATESTADO/LICENCA, as colunas de
 * marcação ficam vazias — o PJe-Calc identifica automaticamente.
 */

import type { ParseCartaoPontoResult } from '../../parsers/cartao-ponto';
import { utf16ToLatin1 } from './encoding';

const HEADER =
  'DATA;Entrada 1;Saida 1;Entrada 2;Saida 2;Entrada 3;Saida 3;Entrada 4;Saida 4;Entrada 5;Saida 5;Entrada 6;Saida 6';

const N_PARES = 6;

export function buildCartaoPontoCSV(parsed: ParseCartaoPontoResult): Blob {
  const lines: string[] = [HEADER];

  for (const ap of parsed.apuracoes) {
    const cols: string[] = new Array(N_PARES * 2).fill('');
    if (ap.ocorrencia === 'NORMAL') {
      ap.marcacoes.slice(0, N_PARES).forEach((m, i) => {
        cols[i * 2] = m.e;
        cols[i * 2 + 1] = m.s;
      });
    }
    lines.push([formatDataBR(ap.data), ...cols].join(';'));
  }

  // CRLF: PJe-Calc espera o line ending de Windows.
  const csv = lines.join('\r\n') + '\r\n';
  const bytes = utf16ToLatin1(csv);
  return new Blob([bytes], { type: 'text/csv;charset=iso-8859-1' });
}

function formatDataBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
