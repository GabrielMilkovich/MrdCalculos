import type { CtpsHistoricoFeriasItem } from '../../../tipos-dominio.ts';

/**
 * HISTÓRICO DE FÉRIAS: formato bem regular, regex direto é mais robusto
 * que slice posicional (a coluna "Observações" pode ser vazia ou ter texto).
 *
 *   Período Aquisitivo          Período de Gozo           Dias de Gozo Abono Observações
 *   ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯     ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯   ¯¯¯¯¯¯¯¯¯¯¯¯ ¯¯¯¯¯ ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
 *   24/11/2003 a 22/11/2004     11/10/2004 a 30/10/2004          20    10
 *
 * Esse foi o parser CRITICAMENTE quebrado no V1 (0 férias extraídas).
 */
export function parseHistoricoFerias(linhas: string[]): CtpsHistoricoFeriasItem[] {
  const resultado: CtpsHistoricoFeriasItem[] = [];
  const RE_LINHA =
    /^\s*(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(\d+)(?:\s+(.+))?\s*$/;

  for (const linha of linhas) {
    const m = linha.match(RE_LINHA);
    if (!m) continue;
    resultado.push({
      periodo_aquisitivo_inicio: m[1],
      periodo_aquisitivo_fim: m[2],
      periodo_gozo_inicio: m[3],
      periodo_gozo_fim: m[4],
      dias_gozo: parseInt(m[5], 10),
      abono_dias: parseInt(m[6], 10),
      observacoes: m[7]?.trim() || null,
    });
  }
  return resultado;
}
