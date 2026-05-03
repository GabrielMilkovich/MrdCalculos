/**
 * CSV de Cartão de Ponto — formato oficial "Importar Jornada" do PJe-Calc.
 *
 * Validado byte-a-byte contra modelo oficial:
 *   modelo de exemplo csv/ExemploJornadaCartaoDePonto.csv
 *
 * Spec do parser:
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeCartaoDePonto.java
 *   método `importarJornadaCartaoDePonto` + `parseCartaoDePonto(dados, 13)`.
 *
 * Características obrigatórias:
 *   - **13 colunas** (LIMITE_COLUNAS_JORNADA = 13).
 *   - Header LITERAL exato (com acento agudo em "Saída"):
 *       Data;Entrada1;Saída1;Entrada2;Saída2;Entrada3;Saída3;
 *       Entrada4;Saída4;Entrada5;Saída5;Entrada6;Saída6
 *   - Encoding UTF-8 (modelo oficial usa UTF-8 — bytes 0xC3 0xAD em "Saída").
 *     O parser usa `InputStreamReader(in)` sem charset explícito, o que daria
 *     ISO-8859-1 com a JVM oficial (-Dfile.encoding=ISO-8859-1). Como o
 *     parser DESCARTA os nomes do header (Arrays.copyOfRange a partir do
 *     índice 1), o encoding do header é IRRELEVANTE — apenas datas/horas
 *     dos dados importam, e elas são ASCII puro.
 *   - Sem aspas em torno das células (modelo oficial não usa).
 *   - Delimitador `;`.
 *   - Datas `dd/MM/yyyy`, horas `HH:MM`.
 *   - Line ending CRLF.
 *
 * NOTA: a tela do PJe-Calc mostra coluna "Dia da Semana" mas é VISUAL —
 * NÃO faz parte do CSV (limite é 13 colunas).
 */

import type { ParseCartaoPontoResult } from '../../parsers/cartao-ponto';

const HEADER =
  'Data;Entrada1;Saída1;Entrada2;Saída2;Entrada3;Saída3;Entrada4;Saída4;Entrada5;Saída5;Entrada6;Saída6';

const N_PARES = 6;
const CRLF = '\r\n';

export function buildCartaoPontoCSV(parsed: ParseCartaoPontoResult): Blob {
  const lines: string[] = [HEADER];

  for (const ap of parsed.apuracoes) {
    const cols: string[] = new Array(N_PARES * 2).fill('');
    // Sempre emitimos as batidas que existirem, independentemente da
    // ocorrência. PJe-Calc não tem coluna de "tipo de dia" — feriado
    // trabalhado, ATESTADO parcial e similares precisam das batidas reais
    // para o cálculo. Dias sem batidas (FALTA/FOLGA/FERIAS integrais) saem
    // como linha de colunas vazias, o que o PJe-Calc trata como dia sem
    // jornada.
    ap.marcacoes.slice(0, N_PARES).forEach((m, i) => {
      cols[i * 2] = m.e;
      cols[i * 2 + 1] = m.s;
    });
    lines.push([formatDataBR(ap.data), ...cols].join(';'));
  }

  const csv = lines.join(CRLF) + CRLF;
  // UTF-8 nativo (modelo oficial é UTF-8). TextEncoder default = UTF-8.
  const bytes = new TextEncoder().encode(csv);
  return new Blob([bytes], { type: 'text/csv;charset=utf-8' });
}

function formatDataBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
