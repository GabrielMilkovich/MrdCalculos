/**
 * CSV de Cartão de Ponto — formato "Importar Jornada" do PJe-Calc 2.15.1.
 *
 * Spec confirmada via decompilação do JAR oficial:
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeCartaoDePonto.java
 *   método `importarJornadaCartaoDePonto` + `parseCartaoDePonto(dados, 13)`.
 *
 * Características obrigatórias:
 *   - **13 colunas** (LIMITE_COLUNAS_JORNADA = 13).
 *     Coluna 0 = data, colunas 1..12 = pares Entrada/Saída (até 6 turnos).
 *   - Encoding ISO-8859-1 (parser usa `new InputStreamReader(in)` sem charset
 *     explícito; JVM oficial roda com `-Dfile.encoding=ISO-8859-1`).
 *   - Delimitador `;` (parser tem fallback `,` quando linha não contém `;`).
 *   - Datas `dd/MM/yyyy`, horas `HH:MM`.
 *   - Línea 0 é header — parser descarta nomes (não valida literais).
 *   - Line ending CRLF (Windows-first; BufferedReader aceita ambos).
 *
 * NOTA: a tela do PJe-Calc mostra 14 colunas (com "Dia da Semana"), mas
 * isso é coluna VISUAL computada pela UI — NÃO faz parte do CSV.
 *
 * Em dias FALTA/FERIADO/FOLGA/FERIAS/ATESTADO/LICENÇA, as 12 marcações
 * ficam vazias — o PJe-Calc deduz pelo dia da semana / configuração.
 */

import type { ParseCartaoPontoResult } from '../../parsers/cartao-ponto';
import { utf16ToLatin1 } from './encoding';

const HEADER =
  'DATA;Entrada 1;Saida 1;Entrada 2;Saida 2;Entrada 3;Saida 3;Entrada 4;Saida 4;Entrada 5;Saida 5;Entrada 6;Saida 6';

const N_PARES = 6;
const CRLF = '\r\n';

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

  const csv = lines.join(CRLF) + CRLF;
  const bytes = utf16ToLatin1(csv);
  return new Blob([bytes], { type: 'text/csv;charset=iso-8859-1' });
}

function formatDataBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
