import type { CtpsDominioV2 } from '@/domain/tipos-dominio';

/**
 * Gera `historico_salarial.csv` — formato CRLF, valores entre aspas duplas.
 *
 *   MES_ANO  → MM/yyyy derivado de data_vigencia (dd/MM/yyyy)
 *   VALOR    → min_garantido se houver, senão sal_tarefa, senão 0
 *              (formato BR "0,00")
 *   FGTS                       → "S"
 *   FGTS_REC.                  → "N"
 *   CONTRIBUICAO_SOCIAL        → "S"
 *   CONTRIBUICAO_SOCIAL_REC.   → "N"
 *
 * Decisão (Fase 4): exporta TODAS as entries do histórico salarial,
 * incluindo as com sal_tarefa=0/min_garantido=null (caso comissionista).
 * Omitir registros como "Redução Salarial COVID/19" do cálculo seria
 * pior do que incluir linha com valor zerado — o engine decide o que
 * fazer com 0.
 */
export function gerarHistoricoSalarial(ctps: CtpsDominioV2): string {
  const linhas: string[] = [
    `"MES_ANO";"VALOR";"FGTS";"FGTS_REC.";"CONTRIBUICAO_SOCIAL";"CONTRIBUICAO_SOCIAL_REC."`,
  ];
  for (const item of ctps.historico_salarial) {
    const [, mm, yyyy] = item.data_vigencia.split('/');
    const valor = item.min_garantido ?? item.sal_tarefa ?? 0;
    const valorBR = (valor ?? 0).toFixed(2).replace('.', ',');
    linhas.push(`"${mm}/${yyyy}";"${valorBR}";"S";"N";"S";"N"`);
  }
  return linhas.join('\r\n') + '\r\n';
}
