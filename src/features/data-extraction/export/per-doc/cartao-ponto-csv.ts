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
 *   - Sem aspas em torno das células.
 *   - Delimitador `;`.
 *   - Datas `dd/MM/yyyy`, horas `HH:MM`.
 *   - Line ending CRLF.
 *
 * INTELIGÊNCIA APLICADA neste builder (camada de validação + auto-correção):
 *   - REJEITA apurações com data ISO inválida (ex: "2024-13-45").
 *   - DEDUP por data — última ocorrência ganha (regex já dedupa, mas defesa
 *     em profundidade contra entrada manual ruim).
 *   - ORDENA cronologicamente.
 *   - VALIDA cada hora HH:MM; pares com hora inválida são DESCARTADOS, mas
 *     a apuração da data permanece (preserva o dia mesmo com 1 par ruim).
 *   - DETECTA travessia de meia-noite (S < E) e adiciona warning — não
 *     altera o par (PJe-Calc trata corretamente).
 *   - DEDUP de pares E/S idênticos dentro do mesmo dia.
 *   - PROTEGE contra formula injection (1ª célula da linha — Data — não
 *     começa com =/+/-/@ pois sempre é dd/MM/yyyy, mas garantia em depth).
 *   - Devolve `{ blob, report }` para a UI mostrar o que foi limpo.
 *
 * NOTA: a tela do PJe-Calc mostra coluna "Dia da Semana" mas é VISUAL —
 * NÃO faz parte do CSV (limite é 13 colunas).
 */

import type {
  ApuracaoDiaria,
  Marcacao,
  ParseCartaoPontoResult,
} from '../../parsers/cartao-ponto';
import {
  compararDatasIso,
  dataIsoToBr,
  dedupBy,
  emptyReport,
  hhmmToMin,
  isDataIsoValida,
  normalizarHora,
  type BuildReport,
} from '../validation';

const HEADER =
  'Data;Entrada1;Saída1;Entrada2;Saída2;Entrada3;Saída3;Entrada4;Saída4;Entrada5;Saída5;Entrada6;Saída6';

const N_PARES = 6;
const CRLF = '\r\n';

/**
 * Compatibilidade legada: retorna apenas o Blob.
 * Use `buildCartaoPontoCSVWithReport` se quiser visibilidade do que foi limpo.
 */
export function buildCartaoPontoCSV(parsed: ParseCartaoPontoResult): Blob {
  return buildCartaoPontoCSVWithReport(parsed).blob;
}

export function buildCartaoPontoCSVWithReport(
  parsed: ParseCartaoPontoResult,
): { blob: Blob; report: BuildReport } {
  const report = emptyReport();

  // 1. Filtra apurações com data ISO inválida.
  const validas: ApuracaoDiaria[] = [];
  parsed.apuracoes.forEach((a, i) => {
    if (!isDataIsoValida(a.data)) {
      report.linhasRejeitadas.push({
        idx: i,
        motivo: `Data inválida "${a.data}"`,
      });
      return;
    }
    validas.push(a);
  });

  // 2. Dedup por data — caso entrada manual cause duplicata, mantém a
  //    com mais batidas; empate, prevalece a última (consistente com parser).
  const { resultado: dedupadas, removidasIdx } = dedupBy(
    validas,
    (a) => a.data,
    (existing, incoming) => {
      const ePref = countMarcacoesPreenchidas(existing);
      const iPref = countMarcacoesPreenchidas(incoming);
      return iPref > ePref ? incoming : existing;
    },
  );
  if (removidasIdx.length > 0) {
    report.linhasAjustadas.push({
      idx: -1,
      ajuste: `Dedup defensivo: ${removidasIdx.length} apuração(ões) com data duplicada — mantida a mais completa.`,
    });
  }

  // 3. Ordena cronologicamente.
  const ordenadas = [...dedupadas].sort((a, b) => compararDatasIso(a.data, b.data));

  // 4. Constrói as linhas com normalização das batidas.
  const lines: string[] = [HEADER];
  let travessias = 0;
  for (const ap of ordenadas) {
    const cols: string[] = new Array(N_PARES * 2).fill('');
    const marcacoesValidas = sanitizarMarcacoes(ap.marcacoes, (motivo) => {
      report.warnings.push(`${formatarDataBR(ap.data)}: ${motivo}`);
    });
    // Detecta travessia de meia-noite (S < E em par com ambos preenchidos).
    for (const m of marcacoesValidas) {
      const eMin = hhmmToMin(m.e);
      const sMin = hhmmToMin(m.s);
      if (eMin !== null && sMin !== null && sMin < eMin) {
        travessias++;
      }
    }
    marcacoesValidas.slice(0, N_PARES).forEach((m, i) => {
      cols[i * 2] = m.e;
      cols[i * 2 + 1] = m.s;
    });
    lines.push([formatarDataBR(ap.data), ...cols].join(';'));
    report.linhasGeradas++;
  }

  if (travessias > 0) {
    report.warnings.push(
      `${travessias} par(es) com saída < entrada (travessia de meia-noite). PJe-Calc trata como dia que termina no dia seguinte — verifique se é o caso real.`,
    );
  }
  if (report.linhasGeradas === 0) {
    report.warnings.push(
      'Nenhuma apuração válida — CSV terá apenas o cabeçalho.',
    );
  }

  const csv = lines.join(CRLF) + CRLF;
  const bytes = new TextEncoder().encode(csv);
  return {
    blob: new Blob([bytes], { type: 'text/csv;charset=utf-8' }),
    report,
  };
}

function countMarcacoesPreenchidas(a: ApuracaoDiaria): number {
  return a.marcacoes.filter((m) => m.e || m.s).length;
}

/**
 * Normaliza HH:MM, dedupa pares (e,s) idênticos e descarta pares com hora
 * inválida. Limite máximo: 6 pares (corte silencioso de excedente — UI já
 * avisa antes via `linhasComCorte`).
 */
function sanitizarMarcacoes(
  marcacoes: Marcacao[],
  onWarning: (msg: string) => void,
): Marcacao[] {
  const out: Marcacao[] = [];
  const seen = new Set<string>();
  for (const m of marcacoes) {
    const e = normalizarHora(m.e);
    const s = normalizarHora(m.s);
    if (e === null || s === null) {
      onWarning(`Par com hora inválida descartado (E="${m.e}" S="${m.s}").`);
      continue;
    }
    if (e === '' && s === '') continue; // par totalmente vazio
    const key = `${e}-${s}`;
    if (seen.has(key)) continue; // dedup silenciosa de pares idênticos
    seen.add(key);
    out.push({ ...m, e, s });
    if (out.length >= N_PARES) break;
  }
  return out;
}

function formatarDataBR(iso: string): string {
  const br = dataIsoToBr(iso);
  return br ?? '';
}
