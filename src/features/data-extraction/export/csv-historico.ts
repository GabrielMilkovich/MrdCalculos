/**
 * CSV de Histórico Salarial — formato oficial PJe-Calc Cidadão.
 *
 * Validado byte-a-byte contra modelo oficial baixado do próprio sistema:
 *   modelo de exemplo csv/ExemploHistoricoSalarial.csv
 *
 * Spec do parser (decompilada):
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeHistoricoSalarial.java
 *   pjecalc-fonte/negocio/.../servicos/AbstractServicoDeParsing.java
 *
 * Características obrigatórias:
 *   - Header LITERAL exato:
 *       "MES_ANO";"VALOR";"FGTS";"FGTS_REC.";"CONTRIBUICAO_SOCIAL";"CONTRIBUICAO_SOCIAL_REC."
 *   - 6 colunas com aspas duplas em cada célula (header + dados).
 *   - Encoding UTF-8 (sem BOM).
 *   - Delimitador `;`.
 *   - Decimal pt-BR: `1234,56`.
 *   - Boolean `S` / `N`.
 *   - Competência `MM/yyyy`.
 *   - Line ending CRLF (Windows-first).
 *
 * INTELIGÊNCIA APLICADA neste builder:
 *   - REJEITA linhas com competência inválida (regex MM/yyyy + mês 01-12).
 *   - **CONSOLIDA competências duplicadas com Decimal.sum** — antes,
 *     2 holerites do mesmo mês exportariam 2 linhas e o PJe-Calc somaria
 *     errado (ou rejeitaria). Agora a soma é feita aqui com precisão.
 *   - FILTRA valor <= 0 (com warning) — histórico salarial não aceita
 *     valor zero ou negativo como entrada legítima.
 *   - ORDENA cronologicamente por (yyyy, MM).
 */
import Decimal from 'decimal.js';
import type { IncidenciaFlags, LinhaHistoricoSalarial } from '../types';
import { formatBoolBR, formatNumeroBR } from './format-br';
import {
  emptyReport,
  isCompetenciaValida,
  type BuildReport,
} from './validation';

const HEADER =
  '"MES_ANO";"VALOR";"FGTS";"FGTS_REC.";"CONTRIBUICAO_SOCIAL";"CONTRIBUICAO_SOCIAL_REC."';
const CRLF = '\r\n';

function q(s: string): string {
  return `"${s}"`;
}

/** "MM/yyyy" → número ordenável (yyyy*12 + MM). null se inválido. */
function competenciaToOrdem(c: string): number | null {
  if (!isCompetenciaValida(c)) return null;
  const [m, y] = c.split('/');
  return parseInt(y, 10) * 12 + parseInt(m, 10);
}

export function buildHistoricoSalarialCSV(
  linhas: LinhaHistoricoSalarial[],
  flags: IncidenciaFlags,
): string {
  return buildHistoricoSalarialCSVWithReport(linhas, flags).csv;
}

export function buildHistoricoSalarialCSVWithReport(
  linhas: LinhaHistoricoSalarial[],
  flags: IncidenciaFlags,
): { csv: string; report: BuildReport } {
  const report = emptyReport();
  const eff = flags.natureza_indenizatoria
    ? { fgts: false, fgtsRec: false, inss: false, inssRec: false }
    : {
        fgts: flags.incide_fgts,
        fgtsRec: flags.fgts_recolhido,
        inss: flags.incide_inss,
        inssRec: flags.inss_recolhido,
      };

  // 1. Filtra competência inválida e valor <= 0.
  const validas: Array<{ comp: string; valor: Decimal }> = [];
  linhas.forEach((l, i) => {
    if (!isCompetenciaValida(l.competencia)) {
      report.linhasRejeitadas.push({
        idx: i,
        motivo: `Competência inválida "${l.competencia}" — esperado MM/yyyy.`,
      });
      return;
    }
    const valor =
      l.valor instanceof Decimal ? l.valor : new Decimal(l.valor as number);
    if (!valor.isFinite() || valor.lte(0)) {
      report.linhasRejeitadas.push({
        idx: i,
        motivo: `Valor não-positivo (${valor.toString()}) na competência ${l.competencia}.`,
      });
      return;
    }
    validas.push({ comp: l.competencia, valor });
  });

  // 2. CONSOLIDA competências duplicadas com Decimal.sum.
  const consolidadas = new Map<string, Decimal>();
  let consolidacoesFeitas = 0;
  for (const v of validas) {
    const cur = consolidadas.get(v.comp);
    if (cur) {
      consolidadas.set(v.comp, cur.plus(v.valor));
      consolidacoesFeitas++;
    } else {
      consolidadas.set(v.comp, v.valor);
    }
  }
  if (consolidacoesFeitas > 0) {
    report.linhasAjustadas.push({
      idx: -1,
      ajuste: `${consolidacoesFeitas} competência(s) duplicada(s) consolidada(s) por soma — total de ${consolidadas.size} competências únicas.`,
    });
  }

  // 3. Ordena cronologicamente.
  const ordenadas = [...consolidadas.entries()].sort(
    (a, b) => (competenciaToOrdem(a[0]) ?? 0) - (competenciaToOrdem(b[0]) ?? 0),
  );

  // 4. Constrói linhas.
  const rows = ordenadas.map(([comp, valor]) =>
    [
      q(comp),
      q(formatNumeroBR(valor)),
      q(formatBoolBR(eff.fgts)),
      q(formatBoolBR(eff.fgtsRec)),
      q(formatBoolBR(eff.inss)),
      q(formatBoolBR(eff.inssRec)),
    ].join(';'),
  );

  report.linhasGeradas = rows.length;
  if (rows.length === 0) {
    report.warnings.push(
      'Nenhuma linha válida — CSV vazio. Verifique se as competências e valores foram extraídos corretamente.',
    );
  }

  const csv = [HEADER, ...rows].join(CRLF) + CRLF;
  return { csv, report };
}
