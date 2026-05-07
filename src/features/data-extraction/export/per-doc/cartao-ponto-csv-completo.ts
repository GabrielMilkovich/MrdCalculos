/**
 * CSV de auditoria do Cartão de Ponto — formato "completo".
 *
 * Diferente do `cartao-ponto-csv.ts` (formato oficial PJe-Calc com 13 colunas
 * fixas), este builder exporta TODOS os campos extraídos sem perda:
 *
 *   - Pares E/S em colunas DINÂMICAS (E1/S1…EN/SN, onde N é o máximo no doc).
 *     Sem o limite de 6 pares do PJe-Calc — se um dia tem 8 pares, o CSV terá
 *     E1/S1…E8/S8.
 *   - `dia_semana` (extraído pelo parser, omitido no CSV oficial).
 *   - `ocorrencia` (NORMAL/FALTA/FERIADO/...).
 *   - `eventos` (HT, HE, banco de horas, etc.) concatenados como `tipo=valor`.
 *   - `observacao` (texto livre não classificado da linha).
 *   - Pares INVÁLIDOS (hora não bate com HH:MM) ficam como `INVALIDO:<raw>`
 *     em vez de descartados — auditor vê o que o OCR trouxe e decide.
 *
 * Não substitui o CSV oficial — é arquivo COMPLEMENTAR no ZIP. PJe-Calc não
 * importa este; serve para o operador conferir paridade total OCR → CSV.
 *
 * Spec:
 *   Header dinâmico: Data;Dia_Semana;Ocorrencia;E1;S1;...;EN;SN;Eventos;Observacao
 *   Encoding: UTF-8 (sem BOM)
 *   Delimitador: `;`
 *   Datas: dd/MM/yyyy
 *   Horas válidas: HH:MM
 *   Horas inválidas: `INVALIDO:<raw>`
 *   Line ending: CRLF
 */

import type {
  ApuracaoDiaria,
  EventoDiario,
  ParseCartaoPontoResult,
} from '../../parsers/cartao-ponto';
import {
  compararDatasIso,
  dataIsoToBr,
  emptyReport,
  isDataIsoValida,
  normalizarHora,
  type BuildReport,
} from '../validation';
import { sanitizeText } from '../sanitize';

const CRLF = '\r\n';

export function buildCartaoPontoCSVCompletoWithReport(
  parsed: ParseCartaoPontoResult,
): { blob: Blob; report: BuildReport; maxPares: number } {
  const report = emptyReport();

  // 1. Filtra apurações com data inválida (mesmo critério do oficial).
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

  // 2. Ordena cronologicamente (não dedupa — auditoria preserva tudo).
  const ordenadas = [...validas].sort((a, b) => compararDatasIso(a.data, b.data));

  // 3. Descobre o máximo de pares para dimensionar o header dinâmico.
  const maxPares = ordenadas.reduce(
    (acc, ap) => Math.max(acc, ap.marcacoes.length),
    0,
  );

  // 4. Header dinâmico.
  const colsPares: string[] = [];
  for (let i = 1; i <= maxPares; i++) {
    colsPares.push(`E${i}`, `S${i}`);
  }
  const header = ['Data', 'Dia_Semana', 'Ocorrencia', ...colsPares, 'Eventos', 'Observacao']
    .join(';');

  // 5. Constrói linhas. Sem dedup, sem truncamento, sem descarte de hora inválida.
  const lines: string[] = [header];
  for (const ap of ordenadas) {
    const cols: string[] = new Array(maxPares * 2).fill('');
    ap.marcacoes.forEach((m, i) => {
      cols[i * 2] = formatarHoraOuRaw(m.e);
      cols[i * 2 + 1] = formatarHoraOuRaw(m.s);
    });
    const linha = [
      formatarDataBR(ap.data),
      ap.dia_semana ?? '',
      ap.ocorrencia ?? '',
      ...cols,
      formatarEventos(ap.eventos),
      sanitizeText(ap.observacao ?? '', 500),
    ].join(';');
    lines.push(linha);
    report.linhasGeradas++;
  }

  if (report.linhasGeradas === 0) {
    report.warnings.push(
      'Nenhuma apuração válida — CSV completo terá apenas o cabeçalho.',
    );
  }

  const csv = lines.join(CRLF) + CRLF;
  const bytes = new TextEncoder().encode(csv);
  return {
    blob: new Blob([bytes], { type: 'text/csv;charset=utf-8' }),
    report,
    maxPares,
  };
}

/**
 * Hora válida → HH:MM normalizado.
 * Hora inválida → `INVALIDO:<raw>` (preserva o que veio do OCR).
 * Vazia → string vazia.
 */
function formatarHoraOuRaw(raw: string): string {
  if (!raw || raw.trim() === '') return '';
  const norm = normalizarHora(raw);
  if (norm === null) {
    // Sanitiza pra não quebrar o CSV: remove `;`, `\n`, `"`, `\r`.
    const safe = raw.replace(/[;\n\r"]/g, ' ').trim();
    return `INVALIDO:${safe}`;
  }
  return norm;
}

/**
 * Concatena eventos no formato `tipo=valor; tipo=valor`.
 * Eventos com `;` ou `=` no valor são sanitizados.
 */
function formatarEventos(eventos: EventoDiario[] | undefined): string {
  if (!eventos || eventos.length === 0) return '';
  return eventos
    .map((e) => {
      const v = (e.valor ?? '').replace(/[;\n\r"=]/g, ' ').trim();
      return `${e.tipo}=${v}`;
    })
    .join('; ');
}

function formatarDataBR(iso: string): string {
  const br = dataIsoToBr(iso);
  return br ?? '';
}
