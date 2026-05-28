/**
 * ⚠️ FORMATO NÃO VALIDADO CONTRA PJe-Calc REAL.
 *
 * Estrutura G1/G2/G3, SITUACAO=GOZADAS, DOBRA=N/S, cálculo de período
 * concessivo e regra de QTD_DIAS_ABONO são INFERÊNCIA a partir do spec da
 * sprint + leitura de fixtures.
 *
 * Antes de usar em produção, validar import num .PJC real (Roque tem
 * 17 períodos aquisitivos, incluindo 1 com gozo fracionado em G1+G2).
 * Se o PJe-Calc rejeitar, o fix é AQUI — não nos parsers (que estão
 * corretos e independentes do formato de saída).
 *
 * Pendência rastreada em:
 *   src/features/data-extraction/export/ctps-v2/KNOWN_GAPS.md
 *
 * Quando validar contra PJe-Calc real, atualize o header deste arquivo
 * removendo o ⚠️ e linkando o teste de paridade.
 */

import type { CtpsDominioV2, CtpsHistoricoFeriasItem } from '@/domain/tipos-dominio';

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Calcula o período concessivo a partir do aquisitivo.
 * Aquisitivo termina em `fim`; concessivo começa no dia seguinte e dura 12 meses
 * (CLT art. 134 — empregador tem 12 meses pra conceder após período aquisitivo).
 *
 * Exemplo:
 *   aquisitivo "24/11/2003 a 22/11/2004" → concessivo "23/11/2004 a 22/11/2005"
 */
export function calcularConcessivo(inicio: string, fim: string): string {
  void inicio;
  const [dF, mF, yF] = fim.split('/').map(Number);
  const inicioConcessivo = new Date(Date.UTC(yF, mF - 1, dF + 1));
  const fimConcessivo = new Date(Date.UTC(yF + 1, mF - 1, dF));
  return `${pad(inicioConcessivo.getUTCDate())}/${pad(
    inicioConcessivo.getUTCMonth() + 1,
  )}/${inicioConcessivo.getUTCFullYear()} a ${pad(fimConcessivo.getUTCDate())}/${pad(
    fimConcessivo.getUTCMonth() + 1,
  )}/${fimConcessivo.getUTCFullYear()}`;
}

/**
 * Agrupa entries do histórico de férias por período aquisitivo.
 * Preserva ordem de inserção (1º gozo do aquisitivo X vira G1, 2º vira G2, etc).
 */
function agruparPorAquisitivo(
  itens: CtpsHistoricoFeriasItem[],
): CtpsHistoricoFeriasItem[][] {
  const grupos = new Map<string, CtpsHistoricoFeriasItem[]>();
  for (const item of itens) {
    const key = `${item.periodo_aquisitivo_inicio}|${item.periodo_aquisitivo_fim}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(item);
  }
  return Array.from(grupos.values());
}

/**
 * Gera `historico_ferias.csv` no formato (INFERIDO) consumido pelo PJe-Calc.
 *
 *   RELATIVAS         → "DD/MM/YYYY a DD/MM/YYYY" do aquisitivo
 *   PRAZO             → período concessivo (aquisitivo + 1 ano)
 *   SITUACAO          → "GOZADAS" (constante por enquanto — sem suporte a NAO_GOZADAS)
 *   DOBRA             → "N" (constante; spec não documenta lógica de dobra)
 *   ABONO             → "S" se algum gozo do grupo tem abono_dias > 0, senão "N"
 *   QTD_DIAS_ABONO    → soma dos abono_dias de todos os gozos do grupo
 *   G1INI/G1FIM/G1DOBRA  → 1º período de gozo do grupo
 *   G2INI/G2FIM/G2DOBRA  → 2º período (se houver — caso gozo fracionado)
 *   G3INI/G3FIM/G3DOBRA  → 3º período (raríssimo — espaço reservado)
 *
 * Linhas usam CRLF, células entre aspas duplas (formato CSV brasileiro
 * padrão de importação).
 */
export function gerarHistoricoFerias(ctps: CtpsDominioV2): string {
  const linhas: string[] = [
    'RELATIVAS;PRAZO;SITUACAO;DOBRA;ABONO;QTD_DIAS_ABONO;G1INI;G1FIM;G1DOBRA;G2INI;G2FIM;G2DOBRA;G3INI;G3FIM;G3DOBRA',
  ];

  const grupos = agruparPorAquisitivo(ctps.historico_ferias);
  for (const itens of grupos) {
    const primeiro = itens[0];
    const aquisitivo = `${primeiro.periodo_aquisitivo_inicio} a ${primeiro.periodo_aquisitivo_fim}`;
    const concessivo = calcularConcessivo(
      primeiro.periodo_aquisitivo_inicio,
      primeiro.periodo_aquisitivo_fim,
    );
    const abonoTotal = itens.reduce((acc, i) => acc + i.abono_dias, 0);
    const temAbono = abonoTotal > 0 ? 'S' : 'N';

    const g1 = itens[0];
    const g2 = itens[1] ?? null;
    const g3 = itens[2] ?? null;

    const celulas = [
      `"${aquisitivo}"`,
      `"${concessivo}"`,
      `"GOZADAS"`,
      `"N"`,
      `"${temAbono}"`,
      `"${abonoTotal}"`,
      `"${g1.periodo_gozo_inicio}"`,
      `"${g1.periodo_gozo_fim}"`,
      `"N"`,
      g2 ? `"${g2.periodo_gozo_inicio}"` : '',
      g2 ? `"${g2.periodo_gozo_fim}"` : '',
      g2 ? `"N"` : '',
      g3 ? `"${g3.periodo_gozo_inicio}"` : '',
      g3 ? `"${g3.periodo_gozo_fim}"` : '',
      g3 ? `"N"` : '',
    ];
    linhas.push(celulas.join(';'));
  }

  return linhas.join('\r\n') + '\r\n';
}
