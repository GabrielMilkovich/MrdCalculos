/**
 * CSV de Histórico Salarial — formato aceito por PJe-Calc 2.15.1.
 *
 * Spec confirmada via decompilação do JAR oficial:
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeHistoricoSalarial.java
 *   pjecalc-fonte/negocio/.../servicos/AbstractServicoDeParsing.java
 *
 * Características obrigatórias:
 *   - 6 colunas FIXAS na ordem abaixo.
 *   - Encoding UTF-8 (sem BOM) — `StandardCharsets.UTF_8` no parser.
 *   - Delimitador `;` (parser tem fallback `,` mas usamos `;`).
 *   - Decimal pt-BR: `1234,56` (parser também aceita `1.234,56`).
 *   - Boolean `S` / `N` (case-insensitive).
 *   - Competência `MM/yyyy`.
 *   - Linha 0 é header — parser descarta sem validar nomes.
 *   - Line ending CRLF (defensivo, parser aceita ambos).
 *
 * Campos (na ordem do parser):
 *   1. competencia             → MM/yyyy
 *   2. valor                   → BigDecimal
 *   3. incideFgts              → S/N
 *   4. incideFgtsRecolhido     → S/N (ou "RecolhidoFGTS" no nosso CSV)
 *   5. incideContribuicaoSocial → S/N (renomeamos como IncideINSS para o usuário)
 *   6. incideContribuicaoSocialRecolhida → S/N (renomeamos como RecolhidoINSS)
 */
import type { IncidenciaFlags, LinhaHistoricoSalarial } from '../types';
import { formatBoolBR, formatNumeroBR } from './format-br';

const HEADER =
  'Competencia;Valor;IncideFGTS;RecolhidoFGTS;IncideINSS;RecolhidoINSS';
const CRLF = '\r\n';

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
      l.competencia,
      formatNumeroBR(l.valor),
      formatBoolBR(eff.fgts),
      formatBoolBR(eff.fgtsRec),
      formatBoolBR(eff.inss),
      formatBoolBR(eff.inssRec),
    ].join(';'),
  );

  return [HEADER, ...rows].join(CRLF) + CRLF;
}
