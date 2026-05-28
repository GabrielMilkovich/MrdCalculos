import type { CtpsDominioV2 } from '@/domain/tipos-dominio';

/**
 * Gera `registro_faltas.csv` — formato CRLF, valores entre aspas duplas.
 *
 * Ordem dos registros: AFASTAMENTOS_OUTROS primeiro (atestados + auxílio
 * doença, na ordem em que aparecem no PDF), depois AFASTAMENTOS principais
 * (suspensões). Demissão (sem retorno) é EXCLUÍDA.
 *
 *   INICIO            → data_inicio
 *   FIM               → retorno
 *   JUSTIFICADA       → "S" se categoria === atestado_medico, senão "N"
 *   REINICIAR_PER_AQ  → "N"
 *   JUSTIFICATIVA     → situacao (texto literal do PDF)
 */
export function gerarRegistroFaltas(ctps: CtpsDominioV2): string {
  const linhas: string[] = [
    `"INICIO";"FIM";"JUSTIFICADA";"REINICIAR_PER_AQ";"JUSTIFICATIVA"`,
  ];
  // Ordem: AFASTAMENTOS_OUTROS primeiro, depois AFASTAMENTOS.
  const todos = [...ctps.afastamentos_outros, ...ctps.afastamentos];
  for (const af of todos) {
    if (!af.retorno) continue;
    const justificada = af.categoria === 'atestado_medico' ? 'S' : 'N';
    linhas.push(
      `"${af.data_inicio}";"${af.retorno}";"${justificada}";"N";"${af.situacao}"`,
    );
  }
  return linhas.join('\r\n') + '\r\n';
}
