/**
 * CSV de Faltas — formato oficial PJe-Calc Cidadão.
 *
 * Validado byte-a-byte contra modelo oficial:
 *   modelo de exemplo csv/ExemploFaltas.csv
 *
 * Spec do parser:
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeFaltas.java
 *
 * Características obrigatórias:
 *   - Header LITERAL exato (5 colunas com aspas duplas):
 *       "INICIO";"FIM";"JUSTIFICADA";"REINICIAR_PER_AQ";"JUSTIFICATIVA"
 *   - Aspas duplas em cada célula.
 *   - Justificativa pode ser célula vazia (linha 4 do exemplo oficial:
 *       "23/12/2018";"23/12/2018";"N";"N";   ← último ; sem aspas porque vazio
 *   - Encoding UTF-8.
 *   - Datas `dd/MM/yyyy`.
 *   - Boolean `S` / `N`.
 *   - Justificativa max 200 chars.
 *   - Line ending CRLF.
 *
 * INTELIGÊNCIA APLICADA neste builder:
 *   - REJEITA linhas com data inválida (data_inicio ou data_fim).
 *   - REJEITA quando data_inicio > data_fim.
 *   - DEDUP por (data_inicio, data_fim, justificativa normalizada).
 *   - ORDENA cronologicamente por data_inicio.
 *   - CROSS-CHECK com `checkFaltas` → warning se há overlap entre intervalos.
 *   - PROTEGE contra formula injection na justificativa via sanitizeText.
 */
import { checkFaltas } from '../quality/cross-validation';
import { formatBoolBR, formatDataBR } from './format-br';
import { sanitizeText } from './sanitize';
import {
  dataBRtoIso,
  dedupBy,
  emptyReport,
  isDataIsoValida,
  type BuildReport,
} from './validation';

const HEADER =
  '"INICIO";"FIM";"JUSTIFICADA";"REINICIAR_PER_AQ";"JUSTIFICATIVA"';
const CRLF = '\r\n';
const MAX_JUSTIFICATIVA = 200;

export type FaltaCsvLinha = {
  data_inicio: string; // ISO yyyy-mm-dd
  data_fim: string;
  justificada: boolean;
  reiniciar_periodo_aquisitivo: boolean;
  justificativa: string | null;
};

function q(s: string): string {
  return `"${s}"`;
}

function sameFaltaLinha(
  a: FaltaCsvLinha & { justificativa_normalizada: string },
  b: FaltaCsvLinha & { justificativa_normalizada: string },
): boolean {
  return (
    a.data_inicio === b.data_inicio &&
    a.data_fim === b.data_fim &&
    a.justificada === b.justificada &&
    a.reiniciar_periodo_aquisitivo === b.reiniciar_periodo_aquisitivo &&
    a.justificativa_normalizada === b.justificativa_normalizada
  );
}

export function buildFaltasCSV(linhas: FaltaCsvLinha[]): string {
  return buildFaltasCSVWithReport(linhas).csv;
}

export function buildFaltasCSVWithReport(
  linhas: FaltaCsvLinha[],
): { csv: string; report: BuildReport } {
  const report = emptyReport();

  // 1. Filtra linhas com data inválida ou data_fim < data_inicio.
  const validas: FaltaCsvLinha[] = [];
  linhas.forEach((f, i) => {
    if (!isDataIsoValida(f.data_inicio)) {
      report.linhasRejeitadas.push({
        idx: i,
        motivo: `data_inicio inválida "${f.data_inicio}"`,
      });
      return;
    }
    if (!isDataIsoValida(f.data_fim)) {
      report.linhasRejeitadas.push({
        idx: i,
        motivo: `data_fim inválida "${f.data_fim}"`,
      });
      return;
    }
    if (f.data_inicio > f.data_fim) {
      report.linhasRejeitadas.push({
        idx: i,
        motivo: `data_inicio > data_fim (${f.data_inicio} > ${f.data_fim})`,
      });
      return;
    }
    validas.push(f);
  });

  // 2. Sanitização da justificativa antes do dedup (justificativas com
  //    apenas espaços diferentes devem dedupar como iguais).
  const sanitized = validas.map((f) => ({
    ...f,
    justificativa_normalizada: sanitizeText(f.justificativa, MAX_JUSTIFICATIVA),
  }));

  // 3. Dedup só quando linhas são ESTRUTURALMENTE IDÊNTICAS (todos os
  //    campos batem, incluindo justificada e reiniciar_periodo_aquisitivo).
  //    Quando 2 linhas têm mesma data + justificativa mas bools diferentes,
  //    são fatos distintos — preserva ambas e emite warning ao operador.
  const dedupadas: typeof sanitized = [];
  let dedupSilenciosa = 0;
  for (const f of sanitized) {
    const igualAUm = dedupadas.find((g) => sameFaltaLinha(g, f));
    if (igualAUm) {
      dedupSilenciosa++;
      continue;
    }
    // Detecta linhas com mesma chave (inicio, fim, justificativa) mas bools
    // diferentes — provável conflito entre OCR de páginas diferentes.
    const conflitanteIdx = dedupadas.findIndex(
      (g) =>
        g.data_inicio === f.data_inicio &&
        g.data_fim === f.data_fim &&
        g.justificativa_normalizada === f.justificativa_normalizada,
    );
    if (conflitanteIdx >= 0) {
      const g = dedupadas[conflitanteIdx];
      report.warnings.push(
        `${f.data_inicio}…${f.data_fim}: 2 registros conflitantes — ` +
          `(justificada: ${g.justificada}/${f.justificada}, ` +
          `reiniciar_per_aq: ${g.reiniciar_periodo_aquisitivo}/${f.reiniciar_periodo_aquisitivo}). ` +
          `Ambos preservados — revise e remova manualmente o errado no PJe-Calc.`,
      );
    }
    dedupadas.push(f);
  }
  if (dedupSilenciosa > 0) {
    report.linhasAjustadas.push({
      idx: -1,
      ajuste: `Dedup: ${dedupSilenciosa} falta(s) com TODOS os campos idênticos removida(s) (sem perda).`,
    });
  }
  // Mantém compat com `dedupBy` no escopo (não usado diretamente daqui em diante).
  void dedupBy;

  // 4. Ordena cronologicamente.
  dedupadas.sort((a, b) => {
    const c = a.data_inicio.localeCompare(b.data_inicio);
    if (c !== 0) return c;
    return a.data_fim.localeCompare(b.data_fim);
  });

  // 5. Cross-check de overlap entre intervalos (não bloqueia, só warning).
  const checkOverlap = checkFaltas(dedupadas);
  if (!checkOverlap.ok) {
    for (const p of checkOverlap.problemas.slice(0, 5)) {
      report.warnings.push(`${p.tipo}: ${p.detalhe}`);
    }
    if (checkOverlap.problemas.length > 5) {
      report.warnings.push(
        `...e mais ${checkOverlap.problemas.length - 5} problema(s) de ordem/overlap.`,
      );
    }
  }

  // 6. Constrói linhas.
  const rows = dedupadas.map((f) => {
    const justRaw = f.justificativa_normalizada;
    const justCell = justRaw.length > 0 ? q(justRaw) : '';
    return [
      q(formatDataBR(f.data_inicio)),
      q(formatDataBR(f.data_fim)),
      q(formatBoolBR(f.justificada)),
      q(formatBoolBR(f.reiniciar_periodo_aquisitivo)),
      justCell,
    ].join(';');
  });

  report.linhasGeradas = rows.length;
  const csv = [HEADER, ...rows].join(CRLF) + CRLF;
  return { csv, report };
}

// dataBRtoIso é importado pra normalização interna se vier dado em BR
void dataBRtoIso;
