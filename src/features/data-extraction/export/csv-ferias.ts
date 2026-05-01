/**
 * CSV de Férias — formato aceito por PJe-Calc 2.15.1.
 *
 * Spec confirmada via decompilação do JAR oficial:
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeFerias.java
 *   pjecalc-fonte/negocio/.../constantes/SituacaoDaFeriasEnum.java
 *
 * Características obrigatórias:
 *   - 15 colunas FIXAS na ordem abaixo.
 *   - Encoding UTF-8 (sem BOM).
 *   - Delimitador `;` (parser tem fallback `,`).
 *   - Boolean `S` / `N`.
 *   - Datas `dd/MM/yyyy`.
 *   - Línea 0 é header (parser descarta).
 *   - **IMPORTANTE**: parser BUSCA férias existentes pela `relativa`. Se não
 *     houver período aquisitivo cadastrado no cálculo com aquela `relativa`,
 *     a importação falha. Usuário deve criar os períodos aquisitivos antes.
 *
 * Campos:
 *   1. relativa             (texto, ex "2020/2021")
 *   2. prazo                (Integer, ex "30")
 *   3. situacao             (G | GP | NG | I | P — códigos curtos)
 *   4. dobra                (S/N)
 *   5. abono                (S/N)
 *   6. quantidadeDiasAbono  (Integer)
 *   7. dataInicialGozo1     (dd/MM/yyyy ou vazio)
 *   8. dataFinalGozo1       (dd/MM/yyyy ou vazio)
 *   9. dobraGozo1           (S/N)
 *   10-12. Gozo 2 (mesmo padrão)
 *   13-15. Gozo 3 (mesmo padrão)
 */
import type { GozoPeriodo, SituacaoFerias } from '../types';
import { formatBoolBR } from './format-br';
import { sanitizeText } from './sanitize';

const HEADER =
  'Relativa;Prazo;Situacao;Dobra;Abono;DiasAbono;DtIniGozo1;DtFimGozo1;DobraGozo1;DtIniGozo2;DtFimGozo2;DobraGozo2;DtIniGozo3;DtFimGozo3;DobraGozo3';
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

export function buildFeriasCSV(linhas: FeriasCsvLinha[]): string {
  const rows = linhas.map((f) => {
    const g1 = f.gozo1;
    const g2 = f.gozo2;
    const g3 = f.gozo3;
    return [
      sanitizeText(f.relativa, 50),
      String(f.prazo),
      f.situacao,
      formatBoolBR(f.dobra_geral),
      formatBoolBR(f.abono),
      String(f.dias_abono),
      g1?.inicio ?? '',
      g1?.fim ?? '',
      g1 ? formatBoolBR(g1.dobra) : 'N',
      g2?.inicio ?? '',
      g2?.fim ?? '',
      g2 ? formatBoolBR(g2.dobra) : 'N',
      g3?.inicio ?? '',
      g3?.fim ?? '',
      g3 ? formatBoolBR(g3.dobra) : 'N',
    ].join(';');
  });
  return [HEADER, ...rows].join(CRLF) + CRLF;
}
