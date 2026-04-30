import type { FeriasExtraida } from '../types';
import { formatBoolBR } from './format-br';
import { sanitizeText } from './sanitize';

const HEADER =
  'Relativa;Prazo;Situacao;DobraGeral;Abono;DiasAbono;DtIniGozo1;DtFimGozo1;DobraGozo1;DtIniGozo2;DtFimGozo2;DobraGozo2;DtIniGozo3;DtFimGozo3;DobraGozo3';

/**
 * 15 colunas. Gozos vazios (null) viram delimitador vazio + dobra='N'.
 *
 * Atenção: o parser do PJe-Calc Cidadão NÃO cria períodos aquisitivos —
 * ele só atualiza por `relativa`. UI precisa avisar (vai no LEIA-ME).
 */
export function buildFeriasCSV(linhas: FeriasExtraida[]): string {
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
  return [HEADER, ...rows].join('\n') + '\n';
}
