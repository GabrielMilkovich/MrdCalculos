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
 *   - Encoding UTF-8 (sem BOM) — `StandardCharsets.UTF_8` no parser.
 *   - Delimitador `;`.
 *   - Decimal pt-BR: `1234,56`.
 *   - Boolean `S` / `N`.
 *   - Competência `MM/yyyy`.
 *   - Line ending CRLF (Windows-first).
 */
import type { IncidenciaFlags, LinhaHistoricoSalarial } from '../types';
import { formatBoolBR, formatNumeroBR } from './format-br';

const HEADER =
  '"MES_ANO";"VALOR";"FGTS";"FGTS_REC.";"CONTRIBUICAO_SOCIAL";"CONTRIBUICAO_SOCIAL_REC."';
const CRLF = '\r\n';

/** Envelopa cada célula com aspas duplas (formato oficial). */
function q(s: string): string {
  return `"${s}"`;
}

export function buildHistoricoSalarialCSV(
  linhas: LinhaHistoricoSalarial[],
  flags: IncidenciaFlags,
): string {
  const eff = flags.natureza_indenizatoria
    ? { fgts: false, fgtsRec: false, inss: false, inssRec: false }
    : {
        fgts: flags.incide_fgts,
        fgtsRec: flags.fgts_recolhido,
        inss: flags.incide_inss,
        inssRec: flags.inss_recolhido,
      };

  const rows = linhas.map((l) =>
    [
      q(l.competencia),
      q(formatNumeroBR(l.valor)),
      q(formatBoolBR(eff.fgts)),
      q(formatBoolBR(eff.fgtsRec)),
      q(formatBoolBR(eff.inss)),
      q(formatBoolBR(eff.inssRec)),
    ].join(';'),
  );

  return [HEADER, ...rows].join(CRLF) + CRLF;
}
